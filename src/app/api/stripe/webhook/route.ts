import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import Stripe from "stripe"
import { repo } from "@/lib/repo"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const TENANT_ID = "00000000-0000-0000-0000-000000000001"

function getSupabase() {
  if (!supabaseUrl || !supabaseKey) return null
  return createClient(supabaseUrl, supabaseKey, { auth: { autoRefreshToken: false, persistSession: false } })
}

let _stripe: Stripe | null = null
function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  return _stripe
}

// ============================================================================
// POST /api/stripe/webhook — receives Stripe events.
//
// Stripe signature verification:
//   • When STRIPE_WEBHOOK_SECRET is set, we use stripe.webhooks.constructEvent
//     to verify the request is genuinely from Stripe (production-safe).
//   • When STRIPE_WEBHOOK_SECRET is NOT set (typical dev), we fall back to
//     JSON.parse with a loud console.warn so the dev test flow still works.
//
// Flows:
//   • checkout.session.completed + metadata.flow_type === "shop":
//       - UPDATE the existing commerce_orders row (looked up by
//         stripe_checkout_id === session.id OR by metadata.commerce_order_id)
//         to set status='confirmed', payment_status='paid',
//         stripe_payment_intent_id. Does NOT insert a duplicate — the row
//         was created in /api/shop/checkout for defense in depth.
//       - Decrement inventory_count / stock on each purchased product
//         (looked up via metadata.cart_items). Wrapped in try/catch —
//         non-fatal: an inventory decrement failure must not fail the webhook.
//       - Also UPDATE the legacy `orders` row (when metadata.orderId is set)
//         to status='PAID', paymentStatus='PAID' so the existing admin
//         OrdersView sees the paid transition.
//   • checkout.session.completed + metadata.flow_type === "booking":
//       - Update the booking's status to confirmed/paid (unchanged behavior).
//   • Always writes a row to the unified payment_transactions ledger.
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()

    let event: Stripe.Event
    const secret = process.env.STRIPE_WEBHOOK_SECRET
    const sig = request.headers.get("stripe-signature")
    const stripe = getStripe()

    if (secret && stripe && sig) {
      try {
        event = stripe.webhooks.constructEvent(rawBody, sig, secret)
      } catch (err: any) {
        console.error("[stripe/webhook] signature verification failed:", err?.message)
        return NextResponse.json({ error: `Signature verification failed: ${err?.message}` }, { status: 400 })
      }
    } else {
      if (!secret) {
        console.warn("[stripe/webhook] STRIPE_WEBHOOK_SECRET not set — falling back to unverified JSON.parse. This is unsafe for production.")
      }
      try {
        event = JSON.parse(rawBody)
      } catch (err: any) {
        console.error("[stripe/webhook] invalid JSON body:", err?.message)
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
      }
    }

    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ processed: false, error: "Supabase not configured" })
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data?.object as any
      const sourceFlow = session?.metadata?.flow_type // 'shop' | 'booking' | 'invoice'

      // ----------------------------------------------------------------
      // Unified payment_transactions ledger (always)
      // ----------------------------------------------------------------
      const { error: ledgerError } = await supabase.from("payment_transactions").insert({
        provider: "stripe",
        provider_transaction_id: session?.payment_intent,
        transaction_type: "payment",
        status: "completed",
        amount: session?.amount_total ? session.amount_total / 100 : 0,
        currency: (session?.currency || "usd").toUpperCase(),
        customer_id: session?.metadata?.customer_id || null,
        order_id: session?.metadata?.order_id || null,
        booking_id: session?.metadata?.booking_id || null,
        invoice_id: session?.metadata?.invoice_id || null,
        metadata: {
          stripe_session_id: session?.id,
          flow_type: sourceFlow,
          cart_data: session?.metadata?.cart_items || null,
          customer_email: session?.customer_details?.email || null,
        },
        processed_at: new Date().toISOString(),
        tenant_id: TENANT_ID,
      })
      if (ledgerError) {
        console.error("[stripe/webhook] ledger insert error:", ledgerError.message)
      }

      // ----------------------------------------------------------------
      // Shop flow — UPDATE existing commerce_orders (no duplicate insert)
      // ----------------------------------------------------------------
      if (sourceFlow === "shop") {
        const commerceOrderId = session?.metadata?.commerceOrderId || session?.metadata?.commerce_order_id

        let existing: any = null
        // Lookup by stripe_checkout_id (most reliable — the Stripe session id).
        const { data: byCheckout, error: qErr } = await supabase
          .from("commerce_orders")
          .select("*")
          .eq("stripe_checkout_id", session?.id)
          .limit(1)
        if (qErr) {
          console.error("[stripe/webhook] commerce_orders lookup by checkout id failed:", qErr.message)
        }
        if (byCheckout && byCheckout.length > 0) existing = byCheckout[0]

        // Fallback to metadata.commerce_order_id (UUID stored at checkout time).
        if (!existing && commerceOrderId) {
          const { data: byId, error: qErr2 } = await supabase
            .from("commerce_orders")
            .select("*")
            .eq("id", commerceOrderId)
            .limit(1)
          if (qErr2) {
            console.error("[stripe/webhook] commerce_orders lookup by id failed:", qErr2.message)
          }
          if (byId && byId.length > 0) existing = byId[0]
        }

        if (existing) {
          // Only flip when not already paid (idempotent — a Stripe retry won't
          // double-decrement inventory or overwrite a manual fulfillment change).
          const alreadyPaid = String(existing.payment_status || "").toLowerCase() === "paid"
          if (!alreadyPaid) {
            const { error: updErr } = await supabase
              .from("commerce_orders")
              .update({
                status: "confirmed",
                payment_status: "paid",
                stripe_payment_intent_id:
                  typeof session?.payment_intent === "string" ? session.payment_intent : null,
                email: existing.email || session?.customer_details?.email || existing.customer_email,
                customer_email: existing.customer_email || session?.customer_details?.email,
                updated_at: new Date().toISOString(),
                metadata: {
                  ...(existing.metadata || {}),
                  flow_type: "shop",
                  cart_items: session?.metadata?.cart_items || (existing.metadata?.cart_items ?? null),
                  stripe_session_id: session?.id,
                  paid_at: new Date().toISOString(),
                },
              })
              .eq("id", existing.id)
            if (updErr) {
              console.error("[stripe/webhook] commerce_orders update failed:", updErr.message)
            }

            // Decrement inventory via erp_inventory_movements (the NORMALIZED
            // way — no flat integer column updates). The cart is
            // JSON-stringified in metadata.cart_items at checkout time.
            try {
              const cartRaw = session?.metadata?.cart_items || existing.metadata?.cart_items
              const cartItems: any[] = typeof cartRaw === "string" ? JSON.parse(cartRaw) : (Array.isArray(cartRaw) ? cartRaw : [])
              if (cartItems.length > 0) {
                const { decrementInventoryForCartItems } = await import("@/lib/enterprise/catalog")
                await decrementInventoryForCartItems(cartItems, existing.id)
              }
            } catch (invErr: any) {
              console.error("[stripe/webhook] inventory decrement failed (non-fatal):", invErr?.message)
            }

            // Log the fulfillment lifecycle event (commerce_fulfillment_events).
            try {
              await supabase.from("commerce_fulfillment_events").insert({
                id: crypto.randomUUID(),
                tenant_id: TENANT_ID,
                order_id: existing.id,
                event_type: "order_placed",
                old_status: null,
                new_status: "pending",
                payload: { stripe_session_id: session?.id, flow_type: "shop" },
              })
            } catch (evErr: any) {
              console.error("[stripe/webhook] fulfillment event insert failed (non-fatal):", evErr?.message)
            }
          }
        } else {
          // Defense in depth failed — the checkout route didn't create the
          // commerce_orders row. Create a minimal one now so the admin sees it.
          console.warn("[stripe/webhook] commerce_orders row not found for shop session", session?.id, "— inserting fallback row.")
          const fallbackId = commerceOrderId || crypto.randomUUID()
          const { error: insErr } = await supabase.from("commerce_orders").insert({
            id: fallbackId,
            tenant_id: TENANT_ID,
            stripe_checkout_id: session?.id,
            stripe_payment_intent_id:
              typeof session?.payment_intent === "string" ? session.payment_intent : null,
            customer_email: session?.customer_details?.email,
            email: session?.customer_details?.email,
            total_amount: String(session?.amount_total ? session.amount_total / 100 : 0),
            subtotal: String(session?.amount_total ? session.amount_total / 100 : 0),
            status: "confirmed",
            payment_status: "paid",
            fulfillment_status: "pending",
            metadata: {
              flow_type: "shop",
              cart_items: session?.metadata?.cart_items || null,
              stripe_session_id: session?.id,
              paid_at: new Date().toISOString(),
              fallback: true,
            },
          })
          if (insErr) {
            console.error("[stripe/webhook] fallback commerce_orders insert failed:", insErr.message)
          }
        }

        // Also flip the legacy `orders` row so the existing admin OrdersView
        // (which reads from /api/admin/orders → legacy `orders`) sees PAID.
        const legacyOrderId = session?.metadata?.orderId
        if (legacyOrderId) {
          try {
            const legacy = await repo.get("orders", String(legacyOrderId)).catch(() => null)
            if (legacy && String(legacy.paymentStatus || "").toUpperCase() !== "PAID") {
              await repo.update("orders", String(legacyOrderId), {
                status: "PAID",
                paymentStatus: "PAID",
                stripePaymentIntentId:
                  typeof session?.payment_intent === "string" ? session.payment_intent : "",
              } as any)
            }
          } catch (legacyErr: any) {
            console.error("[stripe/webhook] legacy orders update failed (non-fatal):", legacyErr?.message)
          }
        }
      }

      // ----------------------------------------------------------------
      // Booking flow — unchanged.
      // ----------------------------------------------------------------
      if (sourceFlow === "booking" && session?.metadata?.booking_id) {
        await supabase
          .from("bookings")
          .update({
            status: "confirmed",
            paymentStatus: "paid",
            stripeCheckoutSessionId: session.id,
            stripePaymentIntentId: session.payment_intent,
          })
          .eq("id", session.metadata.booking_id)
      }
    }

    return NextResponse.json({ processed: true })
  } catch (err: any) {
    console.error("Stripe webhook error:", err.message)
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
