// ---------------------------------------------------------------------------
// Payments, orders, subscriptions & memberships (sent via Resend).
// ---------------------------------------------------------------------------

import { BRAND, button, detailsCard, eyebrow, h1, lineItems, noteBox, p, taglineFlourish, frame, esc } from "../design"

// ---- Payment confirmation ------------------------------------------------------

export interface PaymentData {
  firstName: string
  amount: string
  whatFor: string
  method?: string
  date?: string
  ref?: string
  /** Deposit-style payments credit toward a future groom. */
  depositCredit?: boolean
  portalUrl?: string
}

export function paymentConfirmationHtml(d: PaymentData): string {
  return frame({
    preheader: `Payment received — thank you, ${esc(d.firstName)}.`,
    body: [
      eyebrow("Payment received"),
      h1(`Thank you, ${esc(d.firstName)}!`),
      taglineFlourish(),
      p(`We've received your payment. Here's your receipt for your records — keep it, forward it, or never think about it again. It's also saved in your portal.`),
      detailsCard("Your receipt", [
        { label: "Amount", value: esc(d.amount), big: true },
        { label: "For", value: esc(d.whatFor) },
        ...(d.method ? [{ label: "Method", value: esc(d.method) }] : []),
        { label: "Date", value: esc(d.date || new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })) },
        ...(d.ref ? [{ label: "Reference", value: esc(d.ref) }] : []),
      ]),
      ...(d.depositCredit
        ? [noteBox(`This payment is a <strong style="color:#1a1a1a">deposit</strong> — it comes right off your groom's total on the day of your appointment. Only the balance will be due in the salon.`)]
        : []),
      button(d.portalUrl || BRAND.portalUrl, "View in my portal"),
    ].join(""),
    reason: `You're receiving this receipt because a payment was made on your All About Pawz account.`,
  })
}

// ---- Order confirmation (shop) --------------------------------------------------

export interface OrderData {
  firstName: string
  orderNumber: string
  items: { name: string; qty: string | number; price: string }[]
  subtotal: string
  shipping: string
  tax: string
  total: string
  shipTo?: string
  trackingNote?: string
  portalUrl?: string
}

export function orderConfirmationHtml(d: OrderData): string {
  return frame({
    preheader: `Order ${esc(d.orderNumber)} is confirmed — we're getting it packed.`,
    body: [
      eyebrow("Order confirmed"),
      h1(`Your order is in, ${esc(d.firstName)}`),
      taglineFlourish(),
      p(`Thank you for shopping small. Your order is confirmed and being packed with care — here's the summary:`),
      lineItems(
        d.items,
        [
          { label: "Subtotal", value: esc(d.subtotal) },
          { label: "Shipping", value: esc(d.shipping) },
          { label: "Tax", value: esc(d.tax) },
          { label: "Total", value: esc(d.total), strong: true },
        ]
      ),
      detailsCard("Order details", [
        { label: "Order number", value: esc(d.orderNumber) },
        ...(d.shipTo ? [{ label: "Ships to", value: esc(d.shipTo) }] : []),
        { label: "Questions", value: `Reply to this email or ${BRAND.email}` },
      ]),
      button(d.portalUrl || BRAND.portalUrl, "Track my order"),
      noteBox(d.trackingNote || `You'll get another email with tracking the moment your order leaves the salon. Orders placed after noon ship the next business day.`),
    ].join(""),
    reason: `You're receiving this because you placed an order at aapawz.com.`,
  })
}

// ---- Subscription billing notice -------------------------------------------------

export interface SubscriptionBillingData {
  firstName: string
  planName: string
  amount: string
  billingDate: string
  cardBrand?: string
  cardLast4?: string
  manageUrl?: string
}

export function subscriptionBillingHtml(d: SubscriptionBillingData): string {
  return frame({
    preheader: `Heads up: ${esc(d.amount)} will be charged on ${esc(d.billingDate)}.`,
    body: [
      eyebrow("Upcoming billing"),
      h1(`A quick heads-up before we bill you`),
      p(`No action needed — this is just a friendly notice that your <strong style="color:#1a1a1a">${esc(d.planName)}</strong> membership renews soon and your card will be charged.`),
      detailsCard("Your renewal", [
        { label: "Amount", value: esc(d.amount), big: true },
        { label: "Billing date", value: esc(d.billingDate) },
        { label: "Plan", value: esc(d.planName) },
        ...(d.cardBrand
          ? [{ label: "Card", value: `${esc(d.cardBrand)}${d.cardLast4 ? ` ending in ${esc(d.cardLast4)}` : ""}` }]
          : []),
      ]),
      button(d.manageUrl || BRAND.portalUrl, "Review my membership"),
      noteBox(`Want to change or pause your membership? Do it any time before the billing date from your portal — no emails, no phone calls, no guilt trips.`),
    ].join(""),
    reason: `You're receiving this because you have an active All About Pawz membership.`,
  })
}

// ---- Membership active -----------------------------------------------------------

export interface MembershipData {
  firstName: string
  planName: string
  perks: { title: string; body?: string }[]
  renewal?: string
  manageUrl?: string
}

export function membershipActiveHtml(d: MembershipData): string {
  return frame({
    preheader: `Your ${esc(d.planName)} membership is active — here's what you unlocked.`,
    body: [
      eyebrow("Membership active"),
      h1(`Welcome to ${esc(d.planName)}`),
      taglineFlourish(),
      p(`Your membership is live starting today. Here's what being part of the family gets you:`),
      `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#ffffff;border:1px solid #e5dcc9;">
        ${d.perks
          .map(
            (perk) => `<tr>
          <td width="44" align="center" valign="top" style="padding:16px 0 4px 16px;"><img src="${BRAND.pawImg}" width="13" height="13" alt="" style="display:block;"/></td>
          <td valign="top" style="padding:14px 20px 14px 8px;">
            <div style="font-family:Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;color:#1a1a1a;">${esc(perk.title)}</div>
            ${perk.body ? `<div style="font-family:Helvetica,Arial,sans-serif;font-size:12.5px;line-height:1.6;color:#4a443c;">${esc(perk.body)}</div>` : ""}
          </td>
        </tr>`
          )
          .join("")}
      </table>`,
      ...(d.renewal ? [detailsCard("Your plan", [{ label: "Renews", value: esc(d.renewal) }])] : []),
      button(d.manageUrl || BRAND.portalUrl, "Open my membership"),
      p(`Your member pricing applies automatically every time you book — nothing to remember, nothing to mention.`, { muted: true, small: true }),
    ].join(""),
    reason: `You're receiving this because you joined an All About Pawz membership.`,
  })
}

// ---- Sample data ------------------------------------------------------------------

export const SAMPLE_PAYMENT: PaymentData = {
  firstName: "Brea",
  amount: "$25.00",
  whatFor: "Booking deposit — Bath & Brush + Deshedding for Bella",
  method: "Visa ···· 4242",
  ref: "PAY-8C31D7",
  depositCredit: true,
}

export const SAMPLE_ORDER: OrderData = {
  firstName: "Brea",
  orderNumber: "ORD-10248",
  items: [
    { name: "Oatmeal & Honey Shampoo — 16oz", qty: 1, price: "$18.00" },
    { name: "Slicker Brush — Medium", qty: 1, price: "$24.00" },
    { name: "Blushing Pawz Bandana", qty: 2, price: "$12.00" },
  ],
  subtotal: "$66.00",
  shipping: "$6.50",
  tax: "$5.94",
  total: "$78.44",
  shipTo: "Memphis, TN",
}
