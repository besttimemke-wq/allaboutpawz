import "server-only"
import { repo } from "./repo"

// ---------------------------------------------------------------------------
// Customer notifications — the in-app inbox behind the customer portal's
// notification bell (owner ruling: "system notifications" inside the
// customer portal — communication of days, a copy of their invoices, a copy
// of their orders).
//
// Every CUSTOMER-FACING email the salon sends also lands here as an in-app
// notification, hooked centrally inside sendEmail() (src/lib/email.ts): if
// the send carries a customerId and the template is customer-facing, a
// notification row is written fire-and-forget — even when the email itself
// fails, the in-app copy still exists. Salon-internal alerts
// (booking_notification, precheckin_notification, …) never carry a
// customerId, so they never appear in a customer's bell.
//
// Writes go through the service-role repo (RLS write stays closed); reads
// are session-scoped in /api/customer/notifications.
// ---------------------------------------------------------------------------

/** The notification families the bell groups and icons. */
export type NotificationType =
  | "appointment"
  | "invoice"
  | "order"
  | "subscription"
  | "account"
  | "learning"
  | "message"

export interface CustomerNotification {
  id: string
  type: NotificationType
  title: string
  body: string | null
  link: string | null
  relatedId: string | null
  readAt: string | null
  createdAt: string
}

const TENANT_ID = process.env.SUPABASE_TENANT_ID || "00000000-0000-0000-0000-000000000001"

// template id → (notification type, portal deep link, friendly one-liner).
// The TITLE is always the email subject (already customer-readable, e.g.
// "Booking confirmed — Bella's Bath & Brush on Saturday"); body adds the
// "why is this in my bell" line.
const TEMPLATE_META: Record<
  string,
  { type: NotificationType; link: string; body: string }
> = {
  // Appointments — the "communication of days"
  booking_request: {
    type: "appointment",
    link: "/customer/appointments",
    body: "We received your request — watch this space, the salon confirms every request by email.",
  },
  booking_confirmed: {
    type: "appointment",
    link: "/customer/appointments",
    body: "Your appointment is confirmed. A copy is in your email inbox.",
  },
  precheckin_received: {
    type: "appointment",
    link: "/customer/appointments",
    body: "Pre check-in complete — we'll be ready for your pup.",
  },
  appointment_reminder: {
    type: "appointment",
    link: "/customer/appointments",
    body: "Your visit is coming up. Need to cancel or reschedule? Do it from My Appointments.",
  },
  appointment_canceled: {
    type: "appointment",
    link: "/customer/appointments",
    body: "This appointment was canceled. Book again any time.",
  },
  appointment_rescheduled: {
    type: "appointment",
    link: "/customer/appointments",
    body: "Your appointment moved to a new time. A copy is in your email inbox.",
  },
  abandoned_booking: {
    type: "appointment",
    link: "/book/appointment",
    body: "You started a booking and stepped away — pick up right where you left off.",
  },

  // Invoices & payments — the "copy of their invoices"
  payment_confirmation: {
    type: "invoice",
    link: "/customer/invoices",
    body: "A copy of your receipt is in your email inbox and in My Invoices.",
  },

  // Shop orders — the "copy of their orders"
  order_confirmation: {
    type: "order",
    link: "/customer/orders",
    body: "A copy of your order confirmation is in your email inbox.",
  },
  order_alert: {
    type: "order",
    link: "/customer/orders",
    body: "An update on your order — tracking and history live in My Orders.",
  },

  // Subscriptions (PAWfection Bath Club)
  subscription_billing_notice: {
    type: "subscription",
    link: "/customer/orders/subscriptions",
    body: "Your Bath Club membership billed — a copy is in your email inbox.",
  },
  membership_active: {
    type: "subscription",
    link: "/customer/orders/subscriptions",
    body: "Your PAWfection Bath Club membership is active. Manage it any time.",
  },
  subscription_plan_changed: {
    type: "subscription",
    link: "/customer/orders/subscriptions",
    body: "Your Bath Club plan changed — a copy is in your email inbox.",
  },
  subscription_renewal_reminder: {
    type: "subscription",
    link: "/customer/orders/subscriptions",
    body: "Your membership renews soon — see the amount and date before it charges.",
  },

  // Account
  customer_welcome: {
    type: "account",
    link: "/customer/dashboard",
    body: "Welcome to All About Pawz! Your pets, appointments and orders live here.",
  },
  new_account_created: {
    type: "account",
    link: "/customer/dashboard",
    body: "Your portal account was set up by the salon. A copy is in your email inbox.",
  },
  welcome_back: {
    type: "account",
    link: "/customer/dashboard",
    body: "You're signed in to your portal.",
  },
  login_new_device: {
    type: "account",
    link: "/customer/profile/communication-preferences",
    body: "A new device signed in to your account. Not you? Call the salon.",
  },

  // Learning Center
  enrollment_welcome: {
    type: "learning",
    link: "/customer/learn",
    body: "You're enrolled — your course lives in Learn Courses.",
  },
  class_reminder: {
    type: "learning",
    link: "/customer/learn",
    body: "Pick up where you left off — your course remembers your progress.",
  },
  completion_congratulations: {
    type: "learning",
    link: "/customer/learn",
    body: "Congratulations — your certificate details are in Learn Courses.",
  },

  // Salon → customer messages
  salon_message: {
    type: "message",
    link: "/customer/messages",
    body: "The salon sent you a message — read it in Messages.",
  },
}

/** True when the template is one a CUSTOMER receives (not an internal alert). */
export function isCustomerFacingTemplate(template: string): boolean {
  return Object.prototype.hasOwnProperty.call(TEMPLATE_META, template)
}

/**
 * Records the in-app copy of a customer email. Called fire-and-forget from
 * sendEmail() — never awaited on the request path, never throws.
 */
export async function recordCustomerNotification(opts: {
  customerId: string
  template: string
  subject: string
  relatedBookingId?: string
  relatedInvoiceId?: string
  relatedOrderId?: string
}): Promise<void> {
  const meta = TEMPLATE_META[opts.template]
  if (!meta) return
  try {
    await repo.create("customer_notifications", {
      customerId: opts.customerId,
      type: meta.type,
      // Titles keep the email subject verbatim — it already says exactly
      // what happened ("Booking confirmed — Bella's Bath & Haircut on Saturday").
      title: opts.subject.slice(0, 300),
      body: meta.body,
      link: meta.link,
      relatedId:
        opts.relatedBookingId || opts.relatedInvoiceId || opts.relatedOrderId || null,
      tenant_id: TENANT_ID,
    })
  } catch (e: any) {
    // The email is the primary channel — a failed in-app copy must never
    // break or slow the send.
    console.error("[notifications] record failed:", e?.message || e)
  }
}
