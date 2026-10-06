import { pgQuery, pgExec } from "@/lib/pg"
import { TENANT_ID } from "@/lib/crm/enterprise"
import { repo } from "@/lib/repo"

// ---------------------------------------------------------------------------
// PERKS — one ledger per user. Points post on COMPLETION, never creation.
//
//   balance  = SUM(points) over perk_ledger — there is no mutable balance
//              column anywhere
//   earn     = floor(amount_cents / 100 * points_per_dollar * multiplier)
//              from the active perk_rules row for that event — idempotent on
//              (source, source_id), so a webhook + a status verifier racing
//              can never double-post
//   redeem   = negative ledger row, capped at the order subtotal
//   refund   = compensating POSITIVE row — ledger rows are never deleted
//
// Redemption rate (points per $1 of discount) lives in tenant settings
// (cms_global_content: perks_points_per_dollar, default 100 = 100 pts / $1).
// ---------------------------------------------------------------------------

export type EarnEvent =
  | "order_completed"
  | "booking_completed"
  | "subscription_purchased"
  | "subscription_renewed"

export type LedgerSource = "order" | "booking" | "subscription" | "redemption" | "manual"

const FALLBACK_POINTS_PER_DOLLAR = 100

async function pointsPerDollarOfDiscount(): Promise<number> {
  try {
    const s = await repo.getSettings()
    const raw = parseFloat(String(s.perks_points_per_dollar || ""))
    if (Number.isFinite(raw) && raw > 0) return Math.round(raw)
  } catch {
    /* settings read is best-effort */
  }
  return FALLBACK_POINTS_PER_DOLLAR
}

type RuleRow = { points_per_dollar: string; multiplier: string; active: boolean }

async function ruleFor(event: EarnEvent): Promise<RuleRow | null> {
  const rows = await pgQuery<RuleRow>(
    `select points_per_dollar::text as points_per_dollar, multiplier::text as multiplier, active
     from public.perk_rules where tenant_id = $1 and event = $2 limit 1`,
    [TENANT_ID(), event],
  )
  return rows[0] ?? null
}

// ---------------------------------------------------------------------------
// EARN — internal only (service role / server call). Idempotent.
// ---------------------------------------------------------------------------

export async function earnPoints(input: {
  userId: string
  email?: string
  event: EarnEvent
  amountCents: number
  sourceId: string
  note?: string
}): Promise<{ posted: boolean; points: number }> {
  const rule = await ruleFor(input.event)
  if (!rule || !rule.active) return { posted: false, points: 0 }

  const ppd = parseFloat(rule.points_per_dollar)
  const mult = parseFloat(rule.multiplier)
  if (!Number.isFinite(ppd) || !Number.isFinite(mult)) return { posted: false, points: 0 }

  const points = Math.floor((Math.max(0, input.amountCents) / 100) * ppd * mult)
  if (points <= 0) return { posted: false, points: 0 }

  // Idempotency: one row per (tenant, source, source_id). The unique index
  // makes the insert itself race-proof; the count check is a fast pre-read.
  const existing = await pgQuery<{ n: number }>(
    `select count(*)::int as n from public.perk_ledger
     where tenant_id = $1 and source = $2 and source_id = $3`,
    [TENANT_ID(), eventSource(input.event), input.sourceId],
  )
  if ((existing[0]?.n ?? 0) > 0) return { posted: false, points: 0 }

  const inserted = await pgExec(
    `insert into public.perk_ledger (tenant_id, user_id, points, source, source_id, note)
     select $1, $2::uuid, $3, $4, $5, $6
     where not exists (
       select 1 from public.perk_ledger
       where tenant_id = $1 and source = $4 and source_id = $5
     )`,
    [
      TENANT_ID(),
      input.userId,
      points,
      eventSource(input.event),
      input.sourceId,
      input.note ?? null,
    ],
  )
  return { posted: inserted > 0, points }
}

function eventSource(event: EarnEvent): LedgerSource {
  switch (event) {
    case "order_completed": return "order"
    case "booking_completed": return "booking"
    case "subscription_purchased":
    case "subscription_renewed": return "subscription"
  }
}

// ---------------------------------------------------------------------------
// BALANCE
// ---------------------------------------------------------------------------

export async function perksBalance(userId: string): Promise<number> {
  const rows = await pgQuery<{ sum: string | null }>(
    `select coalesce(sum(points), 0)::text as sum from public.perk_ledger
     where tenant_id = $1 and user_id = $2::uuid`,
    [TENANT_ID(), userId],
  )
  return Math.round(parseFloat(rows[0]?.sum ?? "0") || 0)
}

export type LedgerEntry = {
  id: string
  points: number
  source: LedgerSource
  note: string | null
  createdAt: string
}

export async function perksHistory(userId: string, limit = 25): Promise<LedgerEntry[]> {
  const rows = await pgQuery<any>(
    `select id::text, points, source, note, created_at from public.perk_ledger
     where tenant_id = $1 and user_id = $2::uuid
     order by created_at desc limit $3`,
    [TENANT_ID(), userId, Math.max(1, Math.min(100, limit))],
  )
  return rows.map((r) => ({
    id: String(r.id),
    points: Number(r.points),
    source: r.source,
    note: r.note ?? null,
    createdAt: new Date(r.created_at).toISOString(),
  }))
}

// ---------------------------------------------------------------------------
// REDEEM — at checkout; capped at the subtotal.
// ---------------------------------------------------------------------------

export async function redeemPoints(input: {
  userId: string
  pointsToRedeem: number
  subtotalCents: number
  sourceId: string
  note?: string
}): Promise<
  | { ok: true; pointsRedeemed: number; discountCents: number; balanceAfter: number }
  | { ok: false; error: "insufficient" | "invalid" | "capped" }
> {
  const points = Math.floor(Number(input.pointsToRedeem))
  if (!Number.isFinite(points) || points <= 0) return { ok: false, error: "invalid" }

  const balance = await perksBalance(input.userId)
  if (balance < points) return { ok: false, error: "insufficient" }

  const ppd = await pointsPerDollarOfDiscount()
  let discountCents = Math.floor((points / ppd) * 100)
  if (discountCents <= 0) return { ok: false, error: "invalid" }

  // Cap the discount at the subtotal — excess points stay in the balance.
  let pointsRedeemed = points
  if (discountCents > input.subtotalCents) {
    discountCents = Math.max(0, input.subtotalCents)
    pointsRedeemed = Math.min(points, Math.ceil((discountCents / 100) * ppd))
    if (pointsRedeemed <= 0) return { ok: false, error: "capped" }
  }

  const inserted = await pgExec(
    `insert into public.perk_ledger (tenant_id, user_id, points, source, source_id, note)
     values ($1, $2::uuid, $3, 'redemption', $4, $5)`,
    [TENANT_ID(), input.userId, -pointsRedeemed, input.sourceId, input.note ?? null],
  )
  if (inserted === 0) return { ok: false, error: "invalid" }

  return {
    ok: true,
    pointsRedeemed,
    discountCents,
    balanceAfter: balance - pointsRedeemed,
  }
}

/** If a redeemed-against order/booking is later cancelled, the points come
 *  back as a compensating POSITIVE row — the ledger is append-only. */
export async function compensateRedemption(input: {
  sourceId: string
  note?: string
}): Promise<boolean> {
  const rows = await pgQuery<{ user_id: string; points: number }>(
    `select user_id::text as user_id, points from public.perk_ledger
     where tenant_id = $1 and source = 'redemption' and source_id = $2
     order by created_at desc limit 1`,
    [TENANT_ID(), input.sourceId],
  )
  const row = rows[0]
  if (!row || row.points >= 0) return false
  const inserted = await pgExec(
    `insert into public.perk_ledger (tenant_id, user_id, points, source, source_id, note)
     values ($1, $2::uuid, $3, 'redemption', $4, $5)`,
    [TENANT_ID(), row.user_id, Math.abs(row.points), input.sourceId, input.note ?? "cancelled — points returned"],
  )
  return inserted > 0
}

/** The redemption rate surfaced to the client (for the checkout UI math). */
export async function redemptionRate(): Promise<{ pointsPerDollar: number; pointsPerCent: number }> {
  const ppd = await pointsPerDollarOfDiscount()
  return { pointsPerDollar: ppd, pointsPerCent: ppd / 100 }
}

// ---------------------------------------------------------------------------
// EARN BY EMAIL — the completion hooks (webhook, CRM actions) know the
// customer's email, not their auth uuid. This resolves the uuid from the
// salon's customer records (customers.userId back-link) or auth.users, then
// posts the points. Idempotent on (source, source_id) either way.
// ---------------------------------------------------------------------------

export async function earnForEmail(input: {
  email: string
  event: EarnEvent
  amountCents: number
  sourceId: string
  note?: string
}): Promise<{ posted: boolean; points: number }> {
  const email = String(input.email || "").trim().toLowerCase()
  if (!email) return { posted: false, points: 0 }

  // 1. The salon customer record's back-link (set by booking/checkout).
  const linked = await pgQuery<{ user_id: string | null }>(
    `select user_id::text as user_id from public.customers where lower(email) = $1 limit 1`,
    [email],
  )
  let userId = linked[0]?.user_id || null

  // 2. auth.users by email (portal sign-ups that predate a booking).
  if (!userId) {
    const auth = await pgQuery<{ id: string }>(
      `select id::text from auth.users where lower(email) = $1 limit 1`,
      [email],
    )
    userId = auth[0]?.id || null
  }
  if (!userId) return { posted: false, points: 0 }

  return earnPoints({
    userId,
    email,
    event: input.event,
    amountCents: input.amountCents,
    sourceId: input.sourceId,
    note: input.note,
  })
}
