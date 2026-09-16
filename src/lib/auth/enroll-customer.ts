import { createClient } from "@supabase/supabase-js"
import pg from "pg"

// ---------------------------------------------------------------------------
// enrollCustomer() — the single customer-identity entry point.
//
// Physical mapping (owner's join spec, on the live tables only — no new
// tables, no enterprise mirror rows):
//   admin_users      = auth.users (the single login)
//   salon_customers  = public.customers (bookings/walk-ins; nullable FK =
//                      customers."userId" -> auth.users.id)
//   order_customers  = public.orders rows themselves (email on the row;
//                      "customerId" linked only when a salon record exists)
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
  invited: boolean
  linkedSalonRecord: boolean
  error?: string
}

const SB_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").replace(/\/$/, "")
const SB_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ""

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
    return { ok: false, customerId: null, authUserId: null, invited: false, linkedSalonRecord: false, error: "invalid email" }
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
    return { ok: false, customerId: null, authUserId: null, invited: false, linkedSalonRecord: false, error: "no auth user and invite failed" }
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

  // ---------------------------------------------------------------- 3. domain side effects
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
    invited,
    linkedSalonRecord,
  }
}
