// 84-c verification (dev only): server-side order attribution on
// POST /api/shop/checkout — the session cookie is the only authority.
//   1. Ensures a customers row + auth user for shop-auth-e2e@aapawz.com.
//   2. Mints a pawz_session (the same shape the real sign-in sets).
//   3. POSTs a REAL product with a BOGUS body.customerId ("never trust the
//      client") and a session cookie.
//   4. Reads the created commerce_orders row back: customer_id must equal the
//      SESSION-resolved customer id, not the bogus one.
//   5. Cleans up every row it created (order, items, activity, email audit).
import { repo } from "@/lib/repo"
import { listCatalogProducts } from "@/lib/enterprise/catalog"
import { getSupabaseAdmin, signSession } from "@/lib/pawz-auth"

const EMAIL = "shop-auth-e2e@aapawz.com"

async function main() {
  // 1. Customer row (find-or-create).
  const customers = (await repo.list("customers")) as any[]
  let customer = customers.find((c: any) => String(c.email || "").toLowerCase() === EMAIL)
  if (!customer) {
    customer = (await repo.create("customers", {
      firstName: "Shop", lastName: "Auth E2E", email: EMAIL, customerStatus: "PENDING",
    })) as any
    console.log("CREATED CUSTOMER " + customer.id)
  }
  console.log("CUSTOMER_ID=" + customer.id)

  // 2. Auth user + session token.
  const admin = getSupabaseAdmin()
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  let user = (list?.users || []).find((u: any) => String(u.email || "").toLowerCase() === EMAIL)
  if (!user) {
    const { data: created, error } = await admin.auth.admin.createUser({
      email: EMAIL, email_confirm: true,
      user_metadata: { full_name: "Shop Auth E2E", role: "customer" },
    })
    if (error) { console.log("AUTH CREATE ERR: " + error.message); process.exit(1) }
    user = created.user
  }
  const token = signSession({
    authUserId: user.id, email: EMAIL, name: "Shop Auth E2E", role: "customer",
    stationName: undefined as any, avatarUrl: undefined as any,
    scope: "customer", membershipRole: "customer",
  })

  // 3. A real, visible catalog product.
  const products = await listCatalogProducts()
  const p = products.find((x) => x.visible && x.priceCents > 0)
  if (!p) { console.log("NO VISIBLE PRODUCT — aborting"); process.exit(1) }
  console.log("PRODUCT=" + p.id + " (" + p.name + ", " + p.priceCents + "c)")

  // 4. POST with the session + a BOGUS client customerId that must be ignored.
  const res = await fetch("http://localhost:3000/api/shop/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: `pawz_session=${token}` },
    body: JSON.stringify({
      customerId: "bogus-client-id-84c", // must NEVER be trusted
      items: [{ productId: p.id, quantity: 1 }],
      deliveryMethod: "pickup",
      email: EMAIL, phone: "901-722-1114",
      notes: "84-c attribution verification (rows cleaned up after)",
    }),
  })
  const data: any = await res.json().catch(() => null)
  console.log("HTTP " + res.status + " " + JSON.stringify(data))
  if (res.status !== 200 || !data?.commerceOrderId) { process.exit(1) }

  // 5. Read the order back — attribution check.
  const order: any = await repo.get("commerce_orders", data.commerceOrderId)
  console.log("ORDER customer_id=" + order?.customer_id + " customer_email=" + order?.customer_email)
  const attributed = order?.customer_id === customer.id
  const bogusRejected = order?.customer_id !== "bogus-client-id-84c"
  console.log(attributed && bogusRejected
    ? "ATTRIBUTION OK — session-resolved customer id wins, client id ignored"
    : "ATTRIBUTION FAIL")

  // 6. Cleanup (order + items + activity log + email audit row). The Stripe
  //    Checkout Session is left to expire unpaid.
  try {
    const items = (await repo.list("commerce_order_items")) as any[]
    for (const oi of items.filter((i: any) => i.order_id === data.commerceOrderId)) {
      await repo.remove("commerce_order_items", oi.id)
    }
    await repo.remove("commerce_orders", data.commerceOrderId)
    const acts = (await repo.list("activity_log")) as any[]
    for (const a of acts.filter((x: any) => x.entityId === data.commerceOrderId)) {
      await repo.remove("activity_log", a.id)
    }
    const mails = (await repo.list("email_messages")) as any[]
    for (const m of mails.filter((x: any) =>
      String(x.toEmail || x.to_email || "").toLowerCase() === "booking@aapawz.com" &&
      String(x.subject || "").includes("New order") &&
      String(x.subject || "").includes("ORD-"))) {
      await repo.remove("email_messages", m.id)
    }
    console.log("CLEANUP DONE")
  } catch (e: any) {
    console.log("CLEANUP ERR: " + (e?.message || e))
  }

  process.exit(attributed && bogusRejected ? 0 : 1)
}

main()
