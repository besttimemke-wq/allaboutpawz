import { NextRequest, NextResponse } from "next/server"
import { repo, supabaseConfig, usingSupabase } from "@/lib/repo"
import { sessionForPortal } from "@/lib/portal-session-scope"

// ============================================================================
// /api/customer/notifications — the customer portal's notification bell
// backend (owner ruling: SYSTEM NOTIFICATIONS inside the customer portal —
// communication of days, copies of invoices, copies of orders).
//
//   GET  → { notifications: [...], unreadCount } — the signed-in customer's
//          own in-app inbox, newest first (limit 50), each row carrying the
//          email's subject as its title plus a portal deep link.
//   POST → { action: "mark_read", id } marks one read;
//          { action: "mark_all_read" } clears the badge.
//
// Session-scoped like every customer route: the pawz_session cookie is the
// only authority on who is asking, and rows are filtered to the customer
// record resolved from that session — never from a client-sent id.
// ============================================================================

function noStore(body: Record<string, unknown>, status = 200): NextResponse {
  const res = NextResponse.json(body, { status })
  res.headers.set("Cache-Control", "no-store, max-age=0")
  return res
}

async function resolveCustomer(user: any) {
  const email = String(user.email || "").toLowerCase()
  const customers = (await repo.list("customers").catch(() => [])) as any[]
  return customers.find(
    (c) => String(c.email || "").toLowerCase() === email || c.userId === user.authUserId,
  )
}

function publicNotification(n: any) {
  return {
    id: n.id,
    type: String(n.type || "account"),
    title: String(n.title || ""),
    body: n.body ? String(n.body) : null,
    link: n.link ? String(n.link) : null,
    relatedId: n.relatedId ? String(n.relatedId) : null,
    readAt: n.readAt ? String(n.readAt) : null,
    createdAt: n.createdAt ? String(n.createdAt) : null,
  }
}

export async function GET() {
  try {
    const { user } = await sessionForPortal("customer")
    if (!user) {
      return noStore({ error: "not_signed_in", code: "NO_SESSION" }, 401)
    }
    if (!(await usingSupabase())) {
      return noStore({ error: "Supabase not configured" }, 503)
    }

    const customer = await resolveCustomer(user)
    if (!customer) {
      return noStore({ notifications: [], unreadCount: 0 })
    }

    const rows = (await repo.list("customer_notifications").catch(() => [])) as any[]

    // The session decides whose rows these are — never a client-sent filter.
    const mine = rows
      .filter((n) => n.customerId === customer.id)
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
      .slice(0, 50)

    const notifications = mine.map(publicNotification)
    const unreadCount = notifications.filter((n) => !n.readAt).length

    return noStore({ notifications, unreadCount })
  } catch (err: any) {
    console.error("[GET /api/customer/notifications]", err)
    return noStore({ error: err.message || "Failed to load notifications" }, 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await sessionForPortal("customer")
    if (!user) {
      return noStore({ error: "not_signed_in", code: "NO_SESSION" }, 401)
    }
    if (!(await usingSupabase())) {
      return noStore({ error: "Supabase not configured" }, 503)
    }

    const customer = await resolveCustomer(user)
    if (!customer) {
      return noStore({ error: "no customer record" }, 404)
    }

    const body = await req.json().catch(() => ({}))
    const action = String(body.action || "")

    if (action === "mark_all_read") {
      // Read-own enforced: only THIS customer's unread rows flip.
      const rows = (await repo.list("customer_notifications").catch(() => [])) as any[]
      const mineUnread = rows.filter((n) => n.customerId === customer.id && !n.readAt)
      for (const n of mineUnread) {
        await repo
          .update("customer_notifications", n.id, { readAt: new Date().toISOString() })
          .catch(() => {})
      }
      return noStore({ ok: true, marked: mineUnread.length })
    }

    if (action === "mark_read") {
      const id = String(body.id || "")
      if (!id) return noStore({ error: "id required" }, 400)
      const row = (await repo.get("customer_notifications", id).catch(() => null)) as any
      if (!row || row.customerId !== customer.id) {
        return noStore({ error: "not found" }, 404)
      }
      await repo
        .update("customer_notifications", id, { readAt: new Date().toISOString() })
        .catch(() => {})
      return noStore({ ok: true })
    }

    return noStore({ error: "Unknown action" }, 400)
  } catch (err: any) {
    console.error("[POST /api/customer/notifications]", err)
    return noStore({ error: err.message || "Action failed" }, 500)
  }
}

// Keep the route honest about its live dependency for tooling that probes it.
export async function HEAD() {
  return new NextResponse(null, {
    status: (await usingSupabase()) && supabaseConfig.key ? 204 : 503,
  })
}
