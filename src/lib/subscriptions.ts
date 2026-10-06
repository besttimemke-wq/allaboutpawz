import { pgQuery, pgExec } from "@/lib/pg"
import { TENANT_ID } from "@/lib/crm/enterprise"

// ---------------------------------------------------------------------------
// PAWfection Bath Club — monthly membership, up to 4 baths a month.
//
// Tiers live in the `subscription_plans` table (migration 0017): price,
// weight range, includes/excludes/terms, prepay and multi-pet rules are ALL
// tenant-catalog rows — the frontend never hardcodes a price.
// XL (monthly_price_cents NULL) = custom quote, no online signup.
// ---------------------------------------------------------------------------

export type BathClubPlan = {
  id: string
  name: string
  sizeTier: "SMALL" | "MEDIUM" | "LARGE" | "XLARGE"
  sizeLabel: string
  weightRange: string
  monthlyPriceCents: number | null
  visitsPerMonth: number
  annualPrepayMonths: number
  annualPrepayChargeMonths: number
  multiPetDiscountPercent: number
  includes: string[]
  excludes: string[]
  terms: string[]
  annualSavingsCents: number | null
}

function mapPlan(r: any): BathClubPlan {
  const monthly = r.monthly_price_cents == null ? null : Number(r.monthly_price_cents)
  return {
    id: String(r.id),
    name: r.name,
    sizeTier: r.size_tier,
    sizeLabel: String(r.size_tier)[0] + String(r.size_tier).slice(1).toLowerCase(),
    weightRange: r.weight_range,
    monthlyPriceCents: monthly,
    visitsPerMonth: Number(r.visits_per_month ?? 4),
    annualPrepayMonths: Number(r.annual_prepay_months ?? 12),
    annualPrepayChargeMonths: Number(r.annual_prepay_charge_months ?? 10),
    multiPetDiscountPercent: Number(r.multi_pet_discount_percent ?? 10),
    includes: Array.isArray(r.includes) ? r.includes : [],
    excludes: Array.isArray(r.excludes) ? r.excludes : [],
    terms: Array.isArray(r.terms) ? r.terms : [],
    annualSavingsCents: monthly == null ? null : monthly * 2,
  }
}

export async function listBathClubPlans(): Promise<BathClubPlan[]> {
  const rows = await pgQuery<any>(
    `select * from public.subscription_plans where active = true order by sort_order asc`,
  )
  return rows.map(mapPlan)
}

export async function getPlan(planId: string): Promise<BathClubPlan | null> {
  const rows = await pgQuery<any>(
    `select * from public.subscription_plans where id = $1 and active = true limit 1`,
    [String(planId)],
  )
  return rows[0] ? mapPlan(rows[0]) : null
}

// ---------------------------------------------------------------------------
// Membership state
// ---------------------------------------------------------------------------

export type Membership = {
  id: string
  planId: string
  planName: string
  sizeTier: string
  dogId: string | null
  dogName: string | null
  status: "PENDING" | "ACTIVE" | "PAUSED" | "CANCELLED" | "PAST_DUE"
  billingInterval: "monthly" | "annual"
  priceCents: number
  visitsIncluded: number
  visitsUsed: number
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  stripeCheckoutSessionId: string | null
  stripeSubscriptionId: string | null
  createdAt: string
}

function mapMembership(r: any): Membership {
  return {
    id: String(r.id),
    planId: String(r.plan_id),
    planName: r.plan_name ?? "PAWfection Bath Club",
    sizeTier: r.size_tier ?? "",
    dogId: r.dog_id ? String(r.dog_id) : null,
    dogName: r.dog_name ?? null,
    status: r.status,
    billingInterval: r.billing_interval,
    priceCents: Number(r.price_cents ?? 0),
    visitsIncluded: Number(r.visits_included ?? 4),
    visitsUsed: Number(r.visits_used ?? 0),
    currentPeriodEnd: r.current_period_end ? new Date(r.current_period_end).toISOString() : null,
    cancelAtPeriodEnd: !!r.cancel_at_period_end,
    stripeCheckoutSessionId: r.stripe_checkout_session_id ?? null,
    stripeSubscriptionId: r.stripe_subscription_id ?? null,
    createdAt: new Date(r.created_at).toISOString(),
  }
}

export async function activeMembershipFor(email: string): Promise<Membership | null> {
  if (!email) return null
  const rows = await pgQuery<any>(
    `select s.*, p.name as plan_name, p.size_tier
     from public.subscriptions s
     join public.subscription_plans p on p.id = s.plan_id
     where lower(s.email) = lower($1) and s.status in ('ACTIVE', 'PENDING', 'PAUSED', 'PAST_DUE')
     order by s.created_at desc limit 1`,
    [email],
  )
  return rows[0] ? mapMembership(rows[0]) : null
}

export async function membershipsFor(email: string): Promise<Membership[]> {
  if (!email) return []
  const rows = await pgQuery<any>(
    `select s.*, p.name as plan_name, p.size_tier
     from public.subscriptions s
     join public.subscription_plans p on p.id = s.plan_id
     where lower(s.email) = lower($1)
     order by s.created_at desc`,
    [email],
  )
  return rows.map(mapMembership)
}

export async function membershipById(id: string): Promise<Membership | null> {
  const rows = await pgQuery<any>(
    `select s.*, p.name as plan_name, p.size_tier
     from public.subscriptions s
     join public.subscription_plans p on p.id = s.plan_id
     where s.id = $1 limit 1`,
    [String(id)],
  )
  return rows[0] ? mapMembership(rows[0]) : null
}

/** An ACTIVE membership is what unlocks member pricing on the service menu. */
export async function isBathClubMember(email: string | null | undefined): Promise<boolean> {
  if (!email) return false
  const rows = await pgQuery<{ n: number }>(
    `select count(*)::int as n from public.subscriptions
     where lower(email) = lower($1) and status = 'ACTIVE'`,
    [email],
  )
  return (rows[0]?.n ?? 0) > 0
}

// ---------------------------------------------------------------------------
// Signup — a PENDING row that Stripe activation flips to ACTIVE
// ---------------------------------------------------------------------------

export async function createPendingMembership(input: {
  planId: string
  email: string
  userId?: string | null
  customerId?: string | null
  dogId?: string | null
  dogName?: string | null
  billingInterval: "monthly" | "annual"
  priceCents: number
  visitsIncluded: number
  stripeCheckoutSessionId?: string | null
}): Promise<string | null> {
  const rows = await pgQuery<{ id: string }>(
    `insert into public.subscriptions
       (plan_id, email, user_id, customer_id, dog_id, dog_name, status,
        billing_interval, price_cents, visits_included, stripe_checkout_session_id)
     values ($1,$2,$3::uuid,$4,$5,$6,'PENDING',$7,$8,$9,$10)
     returning id::text`,
    [
      input.planId, input.email.toLowerCase(), input.userId || null,
      input.customerId || null, input.dogId || null, input.dogName || null,
      input.billingInterval, input.priceCents, input.visitsIncluded,
      input.stripeCheckoutSessionId || null,
    ],
  )
  return rows[0]?.id ?? null
}

export async function activateMembership(
  subscriptionId: string,
  patch: { stripeSubscriptionId?: string; currentPeriodStart?: Date; currentPeriodEnd?: Date },
): Promise<boolean> {
  const start = patch.currentPeriodStart ?? new Date()
  const end = patch.currentPeriodEnd ?? new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000)
  const n = await pgExec(
    `update public.subscriptions
     set status = 'ACTIVE', stripe_subscription_id = coalesce($3, stripe_subscription_id),
         current_period_start = $4, current_period_end = $5, updated_at = now()
     where id = $1 and status <> 'ACTIVE'`,
    [String(subscriptionId), null, patch.stripeSubscriptionId ?? null, start, end],
  )
  return n > 0
}

export async function markCancelledAtPeriodEnd(subscriptionId: string): Promise<boolean> {
  const n = await pgExec(
    `update public.subscriptions
     set cancel_at_period_end = true, updated_at = now() where id = $1`,
    [String(subscriptionId)],
  )
  return n > 0
}

export async function markMembershipStatus(
  subscriptionId: string,
  status: Membership["status"],
): Promise<boolean> {
  const n = await pgExec(
    `update public.subscriptions set status = $2, updated_at = now() where id = $1`,
    [String(subscriptionId), status],
  )
  return n > 0
}

export async function membershipByStripeIds(input: {
  subscriptionId?: string | null
  sessionId?: string | null
}): Promise<Membership | null> {
  if (input.subscriptionId) {
    const rows = await pgQuery<any>(
      `select s.*, p.name as plan_name, p.size_tier from public.subscriptions s
       join public.subscription_plans p on p.id = s.plan_id
       where s.stripe_subscription_id = $1 limit 1`,
      [input.subscriptionId],
    )
    if (rows[0]) return mapMembership(rows[0])
  }
  if (input.sessionId) {
    const rows = await pgQuery<any>(
      `select s.*, p.name as plan_name, p.size_tier from public.subscriptions s
       join public.subscription_plans p on p.id = s.plan_id
       where s.stripe_checkout_session_id = $1 limit 1`,
      [input.sessionId],
    )
    if (rows[0]) return mapMembership(rows[0])
  }
  return null
}
