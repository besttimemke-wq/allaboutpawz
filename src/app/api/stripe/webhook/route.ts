import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function getSupabase() {
  if (!supabaseUrl || !supabaseKey) return null
  return createClient(supabaseUrl, supabaseKey, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const event = JSON.parse(rawBody)

    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ processed: false, error: "Supabase not configured" })
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data?.object
      const sourceFlow = session?.metadata?.flow_type // 'shop', 'booking', or 'invoice'
      const TENANT_ID = "00000000-0000-0000-0000-000000000001"

      // Write to unified payment_transactions ledger
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
        console.error("Ledger insert error:", ledgerError.message)
      }

      // If shop transaction, log in enterprise commerce_orders
      if (sourceFlow === "shop") {
        const { error: orderError } = await supabase.from("commerce_orders").insert({
          id: crypto.randomUUID(),
          stripe_checkout_id: session?.id,
          stripe_payment_intent_id: session?.payment_intent,
          customer_email: session?.customer_details?.email,
          total_amount: String(session?.amount_total ? session.amount_total / 100 : 0),
          status: "confirmed",
          fulfillment_status: "pending",
          metadata: { flow_type: "shop", cart_items: session?.metadata?.cart_items },
          tenant_id: TENANT_ID,
        })

        if (orderError) {
          console.error("Commerce order insert error:", orderError.message)
        }
      }

      // If booking transaction, update booking status
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
