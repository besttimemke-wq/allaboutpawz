// ---------------------------------------------------------------------------
// Payments, orders, subscriptions & memberships (sent via Resend).
// ---------------------------------------------------------------------------

import { BRAND, button, detailsCard, eyebrow, h1, lineItems, noteBox, p, taglineFlourish, frame, esc } from "../design"
import { SITE_URL } from "../../site-url"

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
            ${perk.body ? `<div style="font-family:Helvetica,Arial,sans-serif;font-size:12.5px;line-height:1.6;color:#1a1a1a;">${esc(perk.body)}</div>` : ""}
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

// ---- Membership plan changed ---------------------------------------------------------

export interface PlanChangedData {
  firstName: string
  oldPlanName: string
  newPlanName: string
  newPrice: string
  billingInterval: string
  effective: string
  renews?: string
  manageUrl?: string
}

export function subscriptionPlanChangedHtml(d: PlanChangedData): string {
  return frame({
    preheader: `Your Bath Club plan is now ${esc(d.newPlanName)} — ${esc(d.newPrice)}.`,
    body: [
      eyebrow("Membership updated"),
      h1(`Your new plan is set, ${esc(d.firstName)}`),
      taglineFlourish(),
      p(
        `You changed your PAWfection Bath Club plan. Everything else — your billing day, your pup's spot, your Perks points — stays exactly the same.`,
      ),
      detailsCard("Your membership", [
        { label: "Previous plan", value: esc(d.oldPlanName) },
        { label: "New plan", value: esc(d.newPlanName) },
        { label: "New price", value: `${esc(d.newPrice)} / ${esc(d.billingInterval)}`, big: true },
        { label: "Takes effect", value: esc(d.effective) },
        ...(d.renews ? [{ label: "Next charge", value: esc(d.renews) }] : []),
      ]),
      button(d.manageUrl || BRAND.portalUrl, "Open my membership"),
      noteBox(`Changed your mind? You can switch again or pause any time from your portal — no calls, no emails, no guilt trips.`),
    ].join(""),
    reason: `You're receiving this because you changed your All About Pawz membership plan.`,
  })
}

// ---- Subscription renewal reminder (Bath Club) -------------------------------------
//
// Sent by the daily cron (src/app/api/cron/subscription-reminders) a few days
// before each Bath Club charge — the owner's "月扣款前发提醒邮件".

export interface SubscriptionRenewalReminderData {
  firstName: string
  /** e.g. "PAWfection Bath Club — Small" */
  planName: string
  dogName?: string
  /** e.g. "$129.00" */
  amount: string
  interval: "monthly" | "annual"
  /** Pretty renewal date, e.g. "March 5, 2026" */
  renewsOn: string
  bathsUsed: number
  bathsIncluded: number
  manageUrl?: string
}

export function subscriptionRenewalReminderHtml(d: SubscriptionRenewalReminderData): string {
  const perPeriod = d.interval === "annual" ? "per year" : "per month"
  return frame({
    preheader: `Your membership renews on ${esc(d.renewsOn)} — ${esc(d.amount)} ${perPeriod}.`,
    body: [
      eyebrow("PAWFECTION BATH CLUB"),
      h1(`Your membership renews soon`),
      taglineFlourish(),
      p(
        `A quick heads-up, ${esc(d.firstName)} — your <strong style="color:#1a1a1a">${esc(d.planName)}</strong>${d.dogName ? ` for ${esc(d.dogName)}` : ""} renews soon and your card will be charged. Nothing to do if you're all set.`,
      ),
      detailsCard("Your renewal", [
        { label: "Membership", value: `${esc(d.planName)}${d.dogName ? ` · ${esc(d.dogName)}` : ""}` },
        { label: "Renews on", value: esc(d.renewsOn) },
        { label: "Amount", value: `${esc(d.amount)} ${perPeriod}`, big: true },
        { label: "Baths used", value: `${d.bathsUsed} / ${d.bathsIncluded} this period` },
      ]),
      button(d.manageUrl || `${SITE_URL}/customer/orders/subscriptions`, "Manage my membership"),
      noteBox(`Pause or cancel anytime in the portal — cancellation takes effect at the end of the billing cycle.`),
    ].join(""),
    reason: `You're receiving this because you have an active All About Pawz membership.`,
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

export const SAMPLE_RENEWAL_REMINDER: SubscriptionRenewalReminderData = {
  firstName: "Brea",
  planName: "PAWfection Bath Club — Small",
  dogName: "Bella",
  amount: "$129.00",
  interval: "monthly",
  renewsOn: "March 5, 2026",
  bathsUsed: 2,
  bathsIncluded: 4,
}
