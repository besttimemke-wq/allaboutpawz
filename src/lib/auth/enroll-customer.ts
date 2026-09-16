import { createClient } from "@supabase/supabase-js"
import pg from "pg"

// ---------------------------------------------------------------------------
// enrollCustomer() — the single customer-identity entry point.
//
// Writes the owner's Supabase tables (the 13k-line enterprise schema — the
// tables were empty only because nothing wrote them; these are the hooks):
//   auth.users               — the single login (invite email when missing)
//   crm_customers            — the CRM person record (one per real person)
//   portal_customer_accounts — the login registry (auth_user_id ↔ crm row)
//   customers                — the operational salon record (bookings/walk-ins;
//                              nullable FK "userId" -> auth.users.id, and
//                              crm_customers.source_customer_id -> customers.id)
//   orders                   — the shop-side record (email on the row; the
//                              webhook links customerId when a salon record
//                              exists — a product-only buyer has none)
//
// Join key: EXACT email match. No fuzzy logic, no confirmation step.
// Idempotent: a retried Stripe event can never double-create an account,
// re-send an invite, or duplicate a link — every step is find-or-noop.
//
// Callers:
//   - Stripe webhook (checkout.session.completed) — purchase + booking
//   - Admin walk-in creation (POST /api/customers with an admin session)
// ---------------------------------------------------------------------------

export type EnrollSource = "purchase" | "booking" | "walkin"

export type EnrollResult = {
  ok: boolean
  customerId: string | null
  authUserId: string | null
  crmCustomerId: string | null
  portalAccountId: string | null
  invited: boolean
  linkedSalonRecord: boolean
  error?: string
}

const SB_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").replace(/\/$/, "")
const SB_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ""
const TENANT_ID = process.env.SUPABASE_TENANT_ID || "00000000-0000-0000-0000-000000000001"

function getSupabaseAdmin() {
  if (!SB_URL || !SB_SERVICE_KEY) return null
  return createClient(SB_URL, SB_SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function withPg<T>(fn: (client: pg.Client) => Promise<T>): Promise<T | null> {
  const cs = process.env.SUPABASE_SESSION_POOLER || process.env.SUPABASE_DIRECT_CONNECTION
  if (!cs) return null
  const client = new pg.Client({ connectionString: cs, ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    return await fn(client)
  } finally {
    await client.end().catch(() => {})
  }
}

// Find the auth user by exact email (case-insensitive storage, exact match).
async function findAuthUserByEmail(email: string): Promise<{ id: string; email_confirmed_at: string | null } | null> {
  return withPg(async (client) => {
    const res = await client.query(
      `SELECT id::text, email_confirmed_at::text FROM auth.users WHERE lower(email) = lower($1) LIMIT 1`,
      [email],
    )
    return res.rows[0] || null
  })
}

// Find the salon-side customer record by exact email (customers.email is UNIQUE).
async function findCustomerByEmail(email: string): Promise<{ id: string; userId: string | null } | null> {
  return withPg(async (client) => {
    const res = await client.query(
      `SELECT id, "userId" FROM public.customers WHERE lower(email) = lower($1) LIMIT 1`,
      [email],
    )
    return res.rows[0] || null
  })
}

// The owner's tables: find-or-create crm_customers (one per real person) and
// portal_customer_accounts (the login registry). Exact email match, idempotent.
async function ensureCrmIdentity(opts: {
  email: string
  authUserId: string
  appCustomerId?: string | null
  firstName?: string | null
  lastName?: string | null
  phone?: string | null
}): Promise<{ crmCustomerId: string; portalAccountId: string } | null> {
  return withPg(async (client) => {
    // 1. crm_customers — the CRM person record
    let crmId: string | null = null
    const found = await client.query(
      `SELECT id::text FROM public.crm_customers WHERE tenant_id = $1 AND lower(email) = lower($2) LIMIT 1`,
      [TENANT_ID, opts.email],
    )
    if (found.rows[0]) {
      crmId = found.rows[0].id
      // Back-fill the link to the operational salon record when one exists.
      if (opts.appCustomerId) {
        await client.query(
          `UPDATE public.crm_customers SET source_customer_id = $2, updated_at = now()
           WHERE id = $1 AND (source_customer_id IS NULL OR source_customer_id = '')`,
          [crmId, opts.appCustomerId],
        )
      }
    } else {
      const first = (opts.firstName || opts.email.split("@")[0] || "").trim()
      const last = (opts.lastName || "").trim()
      const created = await client.query(
        `INSERT INTO public.crm_customers (tenant_id, first_name, last_name, email, phone, source_customer_id)
         VALUES ($1, $2, $3, lower($4), $5, $6)
         RETURNING id::text`,
        [TENANT_ID, first, last, opts.email, opts.phone || null, opts.appCustomerId || null],
      )
      crmId = created.rows[0].id
    }

    // 2. portal_customer_accounts — the login registry (UNIQUE auth_user_id
    //    + UNIQUE customer_id; find by either, create when absent).
    let portalId: string | null = null
    const portal = await client.query(
      `SELECT id::text FROM public.portal_customer_accounts
       WHERE tenant_id = $1 AND (auth_user_id = $2::uuid OR customer_id = $3::uuid)
       LIMIT 1`,
      [TENANT_ID, opts.authUserId, crmId],
    )
    if (portal.rows[0]) {
      portalId = portal.rows[0].id
      // Attach the login when the row pre-existed without one.
      await client.query(
        `UPDATE public.portal_customer_accounts SET auth_user_id = $2, updated_at = now()
         WHERE id = $1 AND auth_user_id IS NULL`,
        [portalId, opts.authUserId],
      )
    } else {
      const created = await client.query(
        `INSERT INTO public.portal_customer_accounts (tenant_id, customer_id, auth_user_id, status, invited_at)
         VALUES ($1, $2::uuid, $3::uuid, 'invited', now())
         RETURNING id::text`,
        [TENANT_ID, crmId, opts.authUserId],
      )
      portalId = created.rows[0].id
    }

    return { crmCustomerId: crmId, portalAccountId: portalId }
  })
}

export async function enrollCustomer(opts: {
  email: string
  source: EnrollSource
  /** orderId for purchase, bookingId for booking — attached to the domain row. */
  referenceId?: string
  /** Admin auth user id when the caller is an admin (walk-in invites). */
  invitedBy?: string
}): Promise<EnrollResult> {
  const email = String(opts.email || "").trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, customerId: null, authUserId: null, crmCustomerId: null, portalAccountId: null, invited: false, linkedSalonRecord: false, error: "invalid email" }
  }

  // ---------------------------------------------------------------- 1. admin_users (auth.users)
  //    Find the single login by exact email. This IS the join — a person who
  //    bought in March and books in July resolves to the SAME account.
  let authUser = await findAuthUserByEmail(email)
  let invited = false

  if (!authUser) {
    const supabaseAdmin = getSupabaseAdmin()
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: { full_name: email.split("@")[0], portal: "customer" },
      })
      if (!error && data?.user) {
        authUser = { id: data.user.id, email_confirmed_at: null }
        invited = true
      } else if (error && /already|registered/i.test(error.message || "")) {
        authUser = await findAuthUserByEmail(email)
      } else if (error) {
        // State it, don't swallow it: the account wasn't created.
        console.error("[enrollCustomer] invite failed:", error.message)
      }
    }
  }

  if (!authUser) {
    return { ok: false, customerId: null, authUserId: null, crmCustomerId: null, portalAccountId: null, invited: false, linkedSalonRecord: false, error: "no auth user and invite failed" }
  }

  // ---------------------------------------------------------------- 2. salon_customers (customers)
  //    Find (never create here — the booking wizard / admin walk-in form
  //    creates the salon record; a product-only buyer correctly has none).
  //    When a record exists, back-link its nullable FK to the login. Exact
  //    email match; a record already pointing at this user is a no-op.
  const customer = await findCustomerByEmail(email)
  let linkedSalonRecord = false

  if (customer && customer.userId !== authUser.id) {
    await withPg(async (client) => {
      await client.query(`UPDATE public.customers SET "userId" = $1 WHERE id = $2`, [authUser!.id, customer!.id])
    })
  }
  if (customer) linkedSalonRecord = true

  // ---------------------------------------------------------------- 3. crm_customers + portal_customer_accounts
  //    The owner's enterprise tables — one CRM person record + one portal
  //    account row per login. Empty until now only because nothing wrote
  //    them; this is that TypeScript.
  const crm = await ensureCrmIdentity({
    email,
    authUserId: authUser.id,
    appCustomerId: customer?.id || null,
    firstName: null, // the callers' name data lives on the app row; enrich below
    lastName: null,
    phone: null,
  })
  if (crm && customer) {
    // Enrich the CRM row from the operational record when one exists.
    await withPg(async (client) => {
      await client.query(
        `UPDATE public.crm_customers c SET first_name = COALESCE(NULLIF(s."firstName", ''), c.first_name),
                 last_name = COALESCE(NULLIF(s."lastName", ''), c.last_name),
                 phone = COALESCE(NULLIF(s.phone, ''), c.phone), updated_at = now()
         FROM public.customers s WHERE c.id = $1 AND s.id = $2`,
        [crm.crmCustomerId, customer.id],
      )
    }).catch(() => {})
  }

  // ---------------------------------------------------------------- 4. domain side effects
  //    purchase -> attach the salon record to the order when one exists
  //    (the salon customer buying online = the "both CRMs" case). A
  //    product-only buyer keeps orders.customerId NULL — they exist solely
  //    in Orders CRM, identified by the order's own email.
  if (opts.source === "purchase" && opts.referenceId && customer) {
    await withPg(async (client) => {
      await client.query(
        `UPDATE public.orders SET "customerId" = $1 WHERE id = $2 AND ("customerId" IS NULL OR "customerId" = '')`,
        [customer!.id, opts.referenceId!],
      )
    })
  }
  //    booking / walkin -> bookings.customerId is already set by the wizard /
  //    the admin form; nothing to attach here.

  return {
    ok: true,
    customerId: customer?.id || null,
    authUserId: authUser.id,
    crmCustomerId: crm?.crmCustomerId || null,
    portalAccountId: crm?.portalAccountId || null,
    invited,
    linkedSalonRecord,
  }
}
