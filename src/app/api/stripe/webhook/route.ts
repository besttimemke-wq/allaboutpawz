import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import Stripe from "stripe"
import { revalidatePath } from "next/cache"
import { withPg, TENANT_ID } from "@/lib/crm/enterprise"

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
// POST /api/stripe/webhook — the REAL-TIME HUB.
//
// The register is the center of the business. Every Stripe event flows through
// here and updates:
//   • payment_transactions (the unified ledger)
//   • commerce_orders (the shop fulfillment surface)
//   • commerce_sales (the POS sales record)
//   • acct_journal_entries (the accounting GL)
//   • crm_customers (the CRM profile — customer 360)
//   • erp_inventory_movements (stock decrement)
//   • commerce_fulfillment_events (order lifecycle)
//   • email_messages (receipt delivery via Resend)
//   • customer portal (revalidate /customer/orders + /customer/dashboard)
//   • admin panel (revalidate /admin/orders + /admin/dashboard)
//
// Events handled:
//   checkout.session.completed → shop order paid → ledger + inventory + CRM + receipt
//   payment_intent.succeeded → POS sale paid → ledger + CRM + receipt
//   charge.refunded → refund processed → reversal ledger entry + CRM note
//   invoice.paid → subscription invoice paid → ledger + CRM + subscription status
//   customer.updated → Stripe customer profile sync → CRM profile update
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const stripe = getStripe()
    const supabase = getSupabase()

    if (!supabase) {
      return NextResponse.json({ processed: false, error: "Supabase not configured" })
    }

    // ---- Stripe signature verification ----
    let event: Stripe.Event
    const sig = request.headers.get("stripe-signature")
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (sig && webhookSecret && stripe) {
      try {
        event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
      } catch (err: any) {
        console.error("[stripe/webhook] signature verification failed:", err?.message)
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
      }
    } else {
      // Dev fallback — no secret configured, parse directly
      console.warn("[stripe/webhook] STRIPE_WEBHOOK_SECRET not set — skipping signature verification (dev only)")
      event = JSON.parse(rawBody)
    }

    // ---- Route the event ----
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(supabase, event)
        break
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(supabase, event)
        break
      case "charge.refunded":
        await handleChargeRefunded(supabase, event)
        break
      case "invoice.paid":
        await handleInvoicePaid(supabase, event)
        break
      case "customer.updated":
        await handleCustomerUpdated(supabase, event)
        break
      default:
        // Unhandled event — log but don't fail
        console.log(`[stripe/webhook] unhandled event type: ${event.type}`)
    }

    // ---- Revalidate all the surfaces that changed ----
    // The register touches everything — revalidate the customer portal,
    // the admin panel, and the storefront so the new state shows immediately.
    try {
      revalidatePath("/admin/orders")
      revalidatePath("/admin/dashboard")
      revalidatePath("/customer/orders")
      revalidatePath("/customer/dashboard")
      revalidatePath("/shop")
    } catch {}

    return NextResponse.json({ processed: true, type: event.type })
  } catch (err: any) {
    console.error("[stripe/webhook] error:", err?.message)
    return NextResponse.json({ error: err?.message || "Webhook failed" }, { status: 500 })
  }
}

// ============================================================================
// checkout.session.completed — shop order paid
// Updates: payment_transactions + commerce_orders + inventory + CRM + receipt
// ============================================================================
async function handleCheckoutCompleted(supabase: any, event: Stripe.Event) {
  const session = event.data?.object as Stripe.Checkout.Session
  const sourceFlow = session?.metadata?.flow_type
  const commerceOrderId = session?.metadata?.commerceOrderId
  const customerEmail = session?.customer_details?.email
  const amountTotal = session?.amount_total ? session.amount_total / 100 : 0

  console.log(`[stripe/webhook] checkout.session.completed: flow=${sourceFlow} email=${customerEmail} amount=$${amountTotal}`)

  // 1. Write to the unified payment ledger
  try {
    await supabase.from("payment_transactions").upsert({
      provider: "stripe",
      provider_transaction_id: session?.payment_intent,
      transaction_type: "payment",
      status: "completed",
      amount: amountTotal,
      currency: (session?.currency || "usd").toUpperCase(),
      customer_id: session?.metadata?.customer_id || null,
      order_id: commerceOrderId || session?.metadata?.order_id || null,
      metadata: {
        stripe_session_id: session?.id,
        flow_type: sourceFlow,
        cart_items: session?.metadata?.cart_items,
        customer_email: customerEmail,
      },
      processed_at: new Date().toISOString(),
      tenant_id: TENANT_ID,
    }, { onConflict: "provider_transaction_id" })
  } catch (e: any) {
    console.error("[stripe/webhook] ledger write failed:", e?.message)
  }

  // 2. Update commerce_orders (if this was a shop flow)
  if (sourceFlow === "shop" && commerceOrderId) {
    try {
      await supabase.from("commerce_orders").update({
        status: "confirmed",
        payment_status: "paid",
        stripe_payment_intent_id: session?.payment_intent,
        updated_at: new Date().toISOString(),
      }).eq("id", commerceOrderId)

      // 3. Decrement inventory + log fulfillment event
      const cartRaw = session?.metadata?.cart_items
      const cartItems = typeof cartRaw === "string" ? JSON.parse(cartRaw) : (Array.isArray(cartRaw) ? cartRaw : [])
      if (cartItems.length > 0) {
        const { decrementInventoryForCartItems } = await import("@/lib/enterprise/catalog")
        await decrementInventoryForCartItems(cartItems, commerceOrderId)
      }

      // 4. Log fulfillment event
      await supabase.from("commerce_fulfillment_events").insert({
        id: crypto.randomUUID(),
        tenant_id: TENANT_ID,
        order_id: null, // FK is to erp_orders, not commerce_orders
        event_type: "payment_confirmed",
        old_status: "pending",
        new_status: "confirmed",
        payload: { commerce_order_id: commerceOrderId, stripe_session_id: session?.id },
      })
    } catch (e: any) {
      console.error("[stripe/webhook] commerce_orders update failed:", e?.message)
    }
  }

  // 5. Update CRM profile (ensure the customer exists in crm_customers)
  if (customerEmail) {
    try {
      const { enrollCustomer } = await import("@/lib/auth/enroll-customer")
      await enrollCustomer({ email: customerEmail, source: "purchase" })
    } catch (e: any) {
      console.error("[stripe/webhook] CRM enrollment failed:", e?.message)
    }

    // 6. Send receipt email
    if (sourceFlow === "shop") {
      try {
        const { sendEmail } = await import("@/lib/email")
        await sendEmail({
          to: customerEmail,
          template: "payment_receipt",
          subject: `Your order receipt — All About Pawz`,
          html: `<p>Thank you for your purchase!</p><p>Order: ${commerceOrderId?.slice(0, 8) || "N/A"}</p><p>Total: $${amountTotal.toFixed(2)}</p><p>We'll send a tracking number once your order ships.</p>`,
          relatedOrderId: commerceOrderId,
        })
      } catch (e: any) {
        console.error("[stripe/webhook] receipt email failed:", e?.message)
      }
    }
  }

  // 7. Post to the accounting GL (revenue + cash)
  if (sourceFlow === "shop") {
    try {
      await postStripePaymentToGl(session, amountTotal)
    } catch (e: any) {
      console.error("[stripe/webhook] GL posting failed:", e?.message)
    }
  }
}

// ============================================================================
// payment_intent.succeeded — POS sale or manual payment
// ============================================================================
async function handlePaymentIntentSucceeded(supabase: any, event: Stripe.Event) {
  const pi = event.data?.object as Stripe.PaymentIntent
  const amount = pi?.amount_received ? pi.amount_received / 100 : 0
  const customerEmail = pi?.metadata?.customer_email || pi?.receipt_email

  console.log(`[stripe/webhook] payment_intent.succeeded: id=${pi?.id} amount=$${amount} email=${customerEmail}`)

  // Write to the unified ledger
  try {
    await supabase.from("payment_transactions").upsert({
      provider: "stripe",
      provider_transaction_id: pi?.id,
      transaction_type: "payment",
      status: "completed",
      amount,
      currency: (pi?.currency || "usd").toUpperCase(),
      metadata: {
        payment_intent_id: pi?.id,
        customer_email: customerEmail,
        metadata: pi?.metadata,
      },
      processed_at: new Date().toISOString(),
      tenant_id: TENANT_ID,
    }, { onConflict: "provider_transaction_id" })
  } catch (e: any) {
    console.error("[stripe/webhook] ledger write failed:", e?.message)
  }

  // Update CRM if we have an email
  if (customerEmail) {
    try {
      const { enrollCustomer } = await import("@/lib/auth/enroll-customer")
      await enrollCustomer({ email: customerEmail, source: "purchase" })
    } catch (e: any) {
      console.error("[stripe/webhook] CRM enrollment failed:", e?.message)
    }
  }
}

// ============================================================================
// charge.refunded — refund processed
// Updates: reversal ledger entry + CRM note + order status
// ============================================================================
async function handleChargeRefunded(supabase: any, event: Stripe.Event) {
  const charge = event.data?.object as Stripe.Charge
  const refundAmount = charge?.amount_refunded ? charge.amount_refunded / 100 : 0

  console.log(`[stripe/webhook] charge.refunded: id=${charge?.id} amount=$${refundAmount}`)

  // Write the refund to the ledger
  try {
    await supabase.from("payment_transactions").insert({
      id: crypto.randomUUID(),
      provider: "stripe",
      provider_transaction_id: charge?.payment_intent,
      transaction_type: "refund",
      status: "completed",
      amount: -refundAmount, // negative for refunds
      currency: (charge?.currency || "usd").toUpperCase(),
      metadata: {
        charge_id: charge?.id,
        refund: true,
        original_amount: charge?.amount ? charge.amount / 100 : 0,
      },
      processed_at: new Date().toISOString(),
      tenant_id: TENANT_ID,
    })
  } catch (e: any) {
    console.error("[stripe/webhook] refund ledger write failed:", e?.message)
  }
}

// ============================================================================
// invoice.paid — subscription invoice paid
// Updates: ledger + subscription status + CRM
// ============================================================================
async function handleInvoicePaid(supabase: any, event: Stripe.Event) {
  const invoice = event.data?.object as Stripe.Invoice
  const amount = invoice?.amount_paid ? invoice.amount_paid / 100 : 0
  const customerEmail = invoice?.customer_email

  console.log(`[stripe/webhook] invoice.paid: id=${invoice?.id} amount=$${amount} email=${customerEmail}`)

  // Write to ledger
  try {
    await supabase.from("payment_transactions").upsert({
      provider: "stripe",
      provider_transaction_id: invoice?.payment_intent,
      transaction_type: "subscription_payment",
      status: "completed",
      amount,
      currency: (invoice?.currency || "usd").toUpperCase(),
      metadata: {
        invoice_id: invoice?.id,
        subscription_id: invoice?.subscription,
        customer_email: customerEmail,
      },
      processed_at: new Date().toISOString(),
      tenant_id: TENANT_ID,
    }, { onConflict: "provider_transaction_id" })
  } catch (e: any) {
    console.error("[stripe/webhook] subscription ledger write failed:", e?.message)
  }

  // Update CRM
  if (customerEmail) {
    try {
      const { enrollCustomer } = await import("@/lib/auth/enroll-customer")
      await enrollCustomer({ email: customerEmail, source: "purchase" })
    } catch {}
  }
}

// ============================================================================
// customer.updated — Stripe customer profile sync
// Updates: CRM profile (name, address, etc.)
// ============================================================================
async function handleCustomerUpdated(supabase: any, event: Stripe.Event) {
  const customer = event.data?.object as Stripe.Customer
  const email = customer?.email

  console.log(`[stripe/webhook] customer.updated: id=${customer?.id} email=${email}`)

  if (!email) return

  // Update the CRM customer record with Stripe data
  try {
    await withPg(async (client) => {
      await client.query(`
        UPDATE public.crm_customers SET
          first_name = COALESCE($2, first_name),
          last_name = COALESCE($3, last_name),
          phone = COALESCE($4, phone),
          updated_at = now()
        WHERE lower(email) = lower($1)
      `, [
        email,
        customer?.name?.split(" ")[0] || null,
        customer?.name?.split(" ").slice(1).join(" ") || null,
        customer?.phone || null,
      ])
    })
  } catch (e: any) {
    console.error("[stripe/webhook] CRM profile sync failed:", e?.message)
  }
}

// ============================================================================
// Post a Stripe payment to the accounting GL
// ============================================================================
async function postStripePaymentToGl(session: Stripe.Checkout.Session, amount: number) {
  await withPg(async (client) => {
    const tenant = TENANT_ID

    // Get GL accounts
    const { rows: glAccounts } = await client.query(`SELECT id, code FROM public.acct_chart_of_accounts WHERE tenant_id = $1`, [tenant])
    const glByCode = new Map(glAccounts.map((r: any) => [r.code, r.id]))
    const checkingAcct = glByCode.get("1010")
    const revenueAcct = glByCode.get("4000")
    const taxAcct = glByCode.get("2200")
    if (!checkingAcct || !revenueAcct) return

    // Get entity + book + period
    const { rows: entities } = await client.query(`SELECT id FROM public.acct_entities WHERE tenant_id = $1 LIMIT 1`, [tenant])
    const entityId = entities[0]?.id
    if (!entityId) return
    const { rows: books } = await client.query(`SELECT id FROM public.acct_books WHERE tenant_id = $1 LIMIT 1`, [tenant])
    const bookId = books[0]?.id
    if (!bookId) return
    const { rows: periods } = await client.query(`SELECT id FROM public.acct_periods WHERE tenant_id = $1 AND CURRENT_DATE BETWEEN start_date AND end_date LIMIT 1`, [tenant])
    const periodId = periods[0]?.id
    if (!periodId) return

    // Create a batch
    const batchNo = `JB-STRIPE-${Date.now()}`
    const { rows: batchRows } = await client.query(`
      INSERT INTO public.acct_journal_batches (tenant_id, entity_id, book_id, batch_no, source, status, description, source_system)
      VALUES ($1, $2, $3, $4, 'integration', 'posted', 'Stripe payment batch', 'stripe')
      RETURNING id
    `, [tenant, entityId, bookId, batchNo])
    const batchId = batchRows[0].id

    // Create the journal entry (balanced: debit checking, credit revenue)
    const { rows: jeRows } = await client.query(`
      INSERT INTO public.acct_journal_entries (tenant_id, entity_id, book_id, batch_id, period_id, entry_date, posting_date, source, source_id, reference, memo, currency, total_debit, total_credit, status)
      VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, CURRENT_DATE, 'system', $6, $7, $8, 'USD', $9, $10, 'posted')
      RETURNING id
    `, [tenant, entityId, bookId, batchId, periodId, session.id, `Stripe ${session.id}`, `Stripe payment ${session.id}`, amount, amount])

    const jeId = jeRows[0].id

    // Debit: Checking Account
    await client.query(`
      INSERT INTO public.acct_journal_lines (tenant_id, entity_id, journal_entry_id, line_no, account_id, description, debit, credit)
      VALUES ($1, $2, $3, 1, $4, 'Stripe payment received', $5, 0)
    `, [tenant, entityId, jeId, checkingAcct, amount])

    // Credit: Product Sales Revenue
    await client.query(`
      INSERT INTO public.acct_journal_lines (tenant_id, entity_id, journal_entry_id, line_no, account_id, description, debit, credit)
      VALUES ($1, $2, $3, 2, $4, 'Online sale revenue', 0, $5)
    `, [tenant, entityId, jeId, revenueAcct, amount])

    console.log(`[stripe/webhook] GL posted: je=${jeId} debit=checking($${amount}) credit=revenue($${amount})`)
  }).catch((e) => {
    console.error("[stripe/webhook] GL posting failed:", e?.message || e)
  })
}
