import "server-only"
import { Resend } from "resend"
import { repo } from "./repo"
import { SITE_URL } from "./site-url"
import { BRAND, detailsCard, eyebrow, frame, h1, p, pawDivider, taglineFlourish, esc } from "./email/design"
import {
  bookingConfirmedHtml,
  bookingRequestHtml,
  appointmentReminderHtml,
  appointmentCanceledHtml,
  appointmentRescheduledHtml,
  abandonedBookingHtml,
  consultationRequestHtml,
  type AppointmentData,
  type BookingRequestData,
  type CanceledData,
  type RescheduledData,
  type AbandonedData,
  type ConsultationData,
} from "./email/templates/appointments"
import {
  paymentConfirmationHtml,
  orderConfirmationHtml,
  subscriptionBillingHtml,
  membershipActiveHtml,
  type PaymentData,
  type OrderData,
  type SubscriptionBillingData,
  type MembershipData,
} from "./email/templates/commerce"
import {
  customerWelcomeHtml,
  newAccountCreatedHtml,
  teamMemberInviteHtml,
  welcomeBackHtml,
  newDeviceLoginHtml,
  type NewDeviceData,
} from "./email/templates/accounts"
import { enrollmentWelcomeHtml, classReminderHtml, completionCongratulationsHtml } from "./email/templates/learning"
import { bookingNotificationHtml, consultationNotificationHtml, enrollmentNotificationHtml } from "./email/templates/internal"
import { getTemplateDef } from "./email/templates"

// ---------------------------------------------------------------------------
// Email via Resend npm package, called from Next.js server routes.
// RESEND_API_KEY is in the server environment. No Edge Function. No secrets panel.
//
// Every template renders through src/lib/email/design.ts — the All About Pawz
// branded frame — so nothing plain-text or "single box" ever leaves the salon.
// ---------------------------------------------------------------------------

const apiKey = process.env.RESEND_API_KEY || ""
const resend = apiKey ? new Resend(apiKey) : null
const FROM = "All About Pawz <notifications@confirmation.aapawz.com>"
const salonNotifyTo = "booking@aapawz.com"

// The live single-tenant id — the same default every app write uses
// (customers, bookings, memberships). email_messages/communications have
// tenant_id NOT NULL; without this the audit row silently never lands.
const TENANT_ID = process.env.SUPABASE_TENANT_ID || "00000000-0000-0000-0000-000000000001"

export async function sendEmail(opts: {
  customerId?: string
  to: string
  template: string
  subject: string
  html: string
  relatedBookingId?: string
  relatedInvoiceId?: string
  relatedOrderId?: string
  /** Attachments (Resend: base64 content). The booking-confirmed email
   *  carries the .ics so Google/Apple/Outlook recognize the appointment
   *  as a calendar event. */
  attachments?: { filename: string; content: string }[]
}): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  if (!opts.to) return { ok: false, error: "No recipient" }

  // 1. Audit trail
  let emailRecord: any = null
  try {
    emailRecord = await repo.create("email_messages", {
      customerId: opts.customerId || null,
      toEmail: opts.to,
      template: opts.template,
      subject: opts.subject,
      body: opts.html,
      status: "QUEUED",
      relatedBookingId: opts.relatedBookingId || null,
      relatedInvoiceId: opts.relatedInvoiceId || null,
      relatedOrderId: opts.relatedOrderId || null,
      tenant_id: TENANT_ID,
    })
  } catch (e: any) {
    console.error("[email] outbox failed:", e.message)
  }

  // 2. Check if Resend is configured
  if (!resend) {
    const errMsg = "RESEND_API_KEY not set in environment"
    if (emailRecord?.id) {
      await repo.update("email_messages", emailRecord.id, { status: "FAILED", errorMessage: errMsg })
    }
    return { ok: false, error: errMsg }
  }

  // 3. Send via Resend SDK
  try {
    if (emailRecord?.id) {
      await repo.update("email_messages", emailRecord.id, { status: "SENDING" })
    }

    const { data, error } = await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      ...(opts.attachments && opts.attachments.length > 0 ? { attachments: opts.attachments } : {}),
    })

    if (error) {
      if (emailRecord?.id) {
        await repo.update("email_messages", emailRecord.id, {
          status: "FAILED",
          failedAt: new Date().toISOString(),
          errorMessage: error.message,
        })
      }
      return { ok: false, error: error.message }
    }

    if (emailRecord?.id) {
      await repo.update("email_messages", emailRecord.id, {
        status: "SENT",
        providerMessageId: data?.id || null,
        sentAt: new Date().toISOString(),
      })
    }

    if (opts.customerId) {
      try {
        await repo.create("communications", {
          customerId: opts.customerId,
          channel: "EMAIL",
          direction: "OUTBOUND",
          subject: opts.subject,
          body: opts.html,
          status: "SENT",
          relatedBookingId: opts.relatedBookingId || null,
          sentAt: new Date().toISOString(),
          tenant_id: TENANT_ID,
        })
      } catch { /* ignore */ }
    }

    return { ok: true, messageId: data?.id }
  } catch (e: any) {
    if (emailRecord?.id) {
      try {
        await repo.update("email_messages", emailRecord.id, {
          status: "FAILED",
          failedAt: new Date().toISOString(),
          errorMessage: e.message,
        })
      } catch { /* ignore */ }
    }
    return { ok: false, error: e.message }
  }
}

function firstNameOf(fullName?: string | null): string {
  return String(fullName || "").trim().split(/\s+/)[0] || ""
}

function refOf(id?: string): string | undefined {
  return id ? `BK-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}` : undefined
}

// ---------------------------------------------------------------------------
// Senders — one per business email. Every one renders the branded templates.
// ---------------------------------------------------------------------------

export async function sendCustomerWelcome(customer: { id: string; firstName: string; lastName: string; email: string }) {
  return sendEmail({
    customerId: customer.id,
    to: customer.email,
    template: "customer_welcome",
    subject: "Welcome to All About Pawz",
    html: customerWelcomeHtml({ firstName: customer.firstName || firstNameOf(customer.lastName) || "there" }),
  })
}

// ---- Booking request received — the "We got it" lane ----------------------------
// Fires at checkout submission (before payment): the customer gets the
// request-received design; the salon gets the internal notification.

export async function sendBookingRequest(b: {
  customerId?: string; ownerName: string; dogName?: string | null; service: string
  size?: string | null; date?: string | null; time?: string | null; email?: string | null
  phone?: string | null; notes?: string | null; bookingId?: string
  itemLines?: string[]; total?: string
}) {
  const customerEmail = b.email
  const data: BookingRequestData = {
    firstName: firstNameOf(b.ownerName) || "there",
    dogName: b.dogName || undefined,
    service: b.service,
    date: b.date || "Date to be confirmed",
    time: b.time || undefined,
    bookingRef: refOf(b.bookingId),
    itemLines: b.itemLines,
    total: b.total,
  }

  if (customerEmail) {
    await sendEmail({
      customerId: b.customerId,
      to: customerEmail,
      template: "booking_request",
      subject: b.dogName
        ? `We got it — ${b.dogName}'s appointment request is in`
        : "We got it — your appointment request is in",
      html: bookingRequestHtml(data),
      relatedBookingId: b.bookingId,
    })
  }

  await sendEmail({
    customerId: b.customerId,
    to: salonNotifyTo,
    template: "booking_notification",
    subject: `New appointment request — ${b.ownerName}${b.dogName ? ` (${b.dogName})` : ""}${b.date ? ` · ${b.date}${b.time ? ` ${b.time}` : ""}` : ""}`,
    html: bookingNotificationHtml({
      ownerName: b.ownerName,
      dogName: b.dogName || undefined,
      service: b.service,
      size: b.size || undefined,
      date: b.date || undefined,
      time: b.time || undefined,
      email: customerEmail || "",
      phone: b.phone || "",
      notes: b.notes || undefined,
      bookingRef: refOf(b.bookingId),
    }),
    relatedBookingId: b.bookingId,
  })
}

export async function sendBookingConfirmation(b: {
  customerId?: string; ownerName: string; dogName?: string | null; service: string
  size?: string | null; date?: string | null; time?: string | null; email?: string | null
  phone?: string | null; notes?: string | null; bookingId?: string
  /** Payment facts when the confirmation follows a payment (deposit or
   *  paid-in-full) — rendered as a “Your payment” card. */
  payment?: { items: string[]; total: string; paid: string; balance: string }
}) {
  const customerEmail = b.email
  const data: AppointmentData = {
    firstName: firstNameOf(b.ownerName) || "there",
    dogName: b.dogName || undefined,
    service: b.service,
    size: b.size || undefined,
    date: b.date || "Date to be confirmed",
    time: b.time || undefined,
    notes: b.notes || undefined,
    bookingRef: refOf(b.bookingId),
    payment: b.payment,
  }

  if (customerEmail) {
    // The .ics attachment — Google/Apple/Outlook recognize the email as a
    // calendar event and offer to save the appointment.
    const { buildBookingIcs } = await import("@/lib/booking/ics")
    const icsContent = buildBookingIcs({
      bookingId: b.bookingId || `booking-${Date.now()}`,
      dogName: b.dogName,
      serviceNames: [b.service],
      date: b.date || "",
      time: b.time || "",
      durationMinutes: 120,
      totalDisplay: b.payment?.total,
      balanceDisplay: b.payment?.balance,
    })
    await sendEmail({
      customerId: b.customerId,
      to: customerEmail,
      template: "booking_confirmed",
      subject: b.dogName ? `${b.dogName}'s appointment is confirmed` : "Your appointment is confirmed",
      html: bookingConfirmedHtml(data),
      relatedBookingId: b.bookingId,
      attachments: [
        {
          filename: "all-about-pawz-appointment.ics",
          content: Buffer.from(icsContent, "utf8").toString("base64"),
        },
      ],
    })
  }

  await sendEmail({
    customerId: b.customerId,
    to: salonNotifyTo,
    template: "booking_notification",
    subject: `New booking — ${b.ownerName}${b.dogName ? ` (${b.dogName})` : ""}${b.date ? ` · ${b.date}${b.time ? ` ${b.time}` : ""}` : ""}`,
    html: bookingNotificationHtml({
      ownerName: b.ownerName,
      dogName: b.dogName || undefined,
      service: b.service,
      size: b.size || undefined,
      date: b.date || undefined,
      time: b.time || undefined,
      email: customerEmail || "",
      phone: b.phone || "",
      notes: b.notes || undefined,
      bookingRef: refOf(b.bookingId),
    }),
    relatedBookingId: b.bookingId,
  })
}

export async function sendConsultationRequest(c: {
  customerId?: string; name: string; dogName?: string | null; breed?: string | null
  concerns?: string | null; preferredTime?: string | null
  email?: string | null; phone?: string | null; consultationId?: string
}) {
  const customerEmail = c.email
  const data: ConsultationData = {
    firstName: firstNameOf(c.name) || "there",
    dogName: c.dogName || undefined,
    breed: c.breed || undefined,
    concerns: c.concerns || undefined,
    preferredTime: c.preferredTime || undefined,
  }

  if (customerEmail) {
    await sendEmail({
      customerId: c.customerId,
      to: customerEmail,
      template: "consultation_request",
      subject: "We got your consultation request",
      html: consultationRequestHtml(data),
      relatedBookingId: c.consultationId,
    })
  }
  await sendEmail({
    customerId: c.customerId,
    to: salonNotifyTo,
    template: "consultation_notification",
    subject: `New consultation request — ${c.name}`,
    html: consultationNotificationHtml({
      name: c.name,
      dogName: c.dogName || undefined,
      breed: c.breed || undefined,
      concerns: c.concerns || undefined,
      preferredTime: c.preferredTime || undefined,
      email: customerEmail || "",
      phone: c.phone || "",
    }),
    relatedBookingId: c.consultationId,
  })
}

export async function sendPaymentReceipt(p: {
  customerId?: string; amount: string; type: string; email?: string; bookingId?: string
  firstName?: string
}) {
  if (!p.email) return
  const data: PaymentData = {
    firstName: p.firstName || "there",
    amount: p.amount,
    whatFor: p.type,
    ref: p.bookingId ? `PAY-${p.bookingId.replace(/-/g, "").slice(0, 6).toUpperCase()}` : undefined,
    depositCredit: /deposit/i.test(p.type || ""),
  }
  await sendEmail({
    customerId: p.customerId,
    to: p.email,
    template: "payment_confirmation",
    subject: `Receipt — your ${p.amount} payment`,
    html: paymentConfirmationHtml(data),
    relatedBookingId: p.bookingId,
  })
}

// ---- Shop order confirmation (Stripe webhook) -------------------------------

export async function sendOrderReceipt(o: {
  customerId?: string; email: string; firstName?: string; orderNumber: string
  items: { name: string; qty: string | number; price: string }[]
  subtotal: string; shipping: string; tax: string; total: string
  shipTo?: string; orderId?: string
}) {
  const data: OrderData = {
    firstName: o.firstName || "there",
    orderNumber: o.orderNumber,
    items: o.items,
    subtotal: o.subtotal,
    shipping: o.shipping,
    tax: o.tax,
    total: o.total,
    shipTo: o.shipTo,
  }
  return sendEmail({
    customerId: o.customerId,
    to: o.email,
    template: "order_confirmation",
    subject: `Order ${o.orderNumber} confirmed — thank you!`,
    html: orderConfirmationHtml(data),
    relatedOrderId: o.orderId,
  })
}

// ---- Abandoned booking recovery (daily sweep) ---------------------------------

export async function sendAbandonedBooking(b: {
  customerId?: string; email: string; ownerName?: string; dogName?: string | null
  service?: string | null; date?: string | null; time?: string | null
  resumeUrl: string; bookingId?: string
}) {
  const data: AbandonedData = {
    firstName: firstNameOf(b.ownerName) || "there",
    dogName: b.dogName || undefined,
    service: b.service || "grooming appointment",
    date: b.date || "",
    time: b.time || undefined,
    resumeUrl: b.resumeUrl,
  }
  return sendEmail({
    customerId: b.customerId,
    to: b.email,
    template: "abandoned_booking",
    subject: `Finish your booking${b.dogName ? ` — ${b.dogName}'s appointment is saved` : " — your appointment is saved"}`,
    html: abandonedBookingHtml(data),
    relatedBookingId: b.bookingId,
  })
}

// ---- Appointment lifecycle ------------------------------------------------------

export async function sendAppointmentReminder(b: {
  customerId?: string; email: string; ownerName?: string; dogName?: string | null
  service: string; size?: string | null; date: string; time?: string | null
  bookingId?: string
}) {
  return sendEmail({
    customerId: b.customerId,
    to: b.email,
    template: "appointment_reminder",
    subject: `${b.time ? `${b.time} — ` : ""}${b.dogName ? `${b.dogName}'s groom` : "Your groom"} is almost here`,
    html: appointmentReminderHtml({
      firstName: firstNameOf(b.ownerName) || "there",
      dogName: b.dogName || undefined,
      service: b.service,
      size: b.size || undefined,
      date: b.date,
      time: b.time || undefined,
      bookingRef: refOf(b.bookingId),
    }),
    relatedBookingId: b.bookingId,
  })
}

export async function sendAppointmentCanceled(b: {
  customerId?: string; email: string; ownerName?: string; dogName?: string | null
  service: string; size?: string | null; date: string; time?: string | null
  reason?: string | null; canceledBy?: "salon" | "customer"; bookingId?: string
}) {
  const data: CanceledData = {
    firstName: firstNameOf(b.ownerName) || "there",
    dogName: b.dogName || undefined,
    service: b.service,
    size: b.size || undefined,
    date: b.date,
    time: b.time || undefined,
    reason: b.reason || undefined,
    canceledBy: b.canceledBy,
    bookingRef: refOf(b.bookingId),
  }
  return sendEmail({
    customerId: b.customerId,
    to: b.email,
    template: "appointment_canceled",
    subject: `Your ${b.date} appointment was canceled`,
    html: appointmentCanceledHtml(data),
    relatedBookingId: b.bookingId,
  })
}

export async function sendAppointmentRescheduled(b: {
  customerId?: string; email: string; ownerName?: string; dogName?: string | null
  service: string; size?: string | null; oldDate: string; oldTime?: string | null
  date: string; time?: string | null; bookingId?: string
}) {
  const data: RescheduledData = {
    firstName: firstNameOf(b.ownerName) || "there",
    dogName: b.dogName || undefined,
    service: b.service,
    size: b.size || undefined,
    oldDate: b.oldDate,
    oldTime: b.oldTime || undefined,
    date: b.date,
    time: b.time || undefined,
    bookingRef: refOf(b.bookingId),
  }
  return sendEmail({
    customerId: b.customerId,
    to: b.email,
    template: "appointment_rescheduled",
    subject: `New time confirmed — ${b.date}${b.time ? ` at ${b.time}` : ""}`,
    html: appointmentRescheduledHtml(data),
    relatedBookingId: b.bookingId,
  })
}

// ---- Accounts & security ---------------------------------------------------------

// The right door for the person's role — the same doors the portals use.
function signinDoorFor(role: string): string {
  if (["owner", "admin", "manager"].includes(role)) return `${SITE_URL}/admin-login`
  if (role === "customer") return `${SITE_URL}/access-customer`
  if (role === "groomer") return `${SITE_URL}/access-groomer`
  return `${SITE_URL}/access-frontdesk`
}

// Kept for backward compatibility with earlier call sites.
export function inviteHtml(opts: { actionLink: string; role: string; firstName?: string | null; lastName?: string | null }): string {
  return teamMemberInviteHtml({
    fullName: [opts.firstName, opts.lastName].filter(Boolean).join(" ").trim() || undefined,
    role: opts.role,
    actionLink: opts.actionLink,
  })
}

// Portal invite (Resend) — delivers the Supabase magic-link invitation via the
// audit-trailed pipeline. Falls back to Supabase's own mailer when Resend
// isn't configured (caller decides).
export async function sendPortalInvite(opts: {
  to: string
  actionLink: string
  role: string
  firstName?: string | null
  lastName?: string | null
}): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const fullName = [opts.firstName, opts.lastName].filter(Boolean).join(" ").trim()
  return sendEmail({
    to: opts.to,
    template: "team_member_invite",
    subject: `You're invited — ${opts.role ? opts.role.charAt(0).toUpperCase() + opts.role.slice(1) : "team member"} at All About Pawz`,
    html: teamMemberInviteHtml({
      fullName: fullName || undefined,
      role: opts.role,
      actionLink: opts.actionLink,
    }),
  })
}

// Kept for backward compatibility with earlier call sites.
export function provisionedWelcomeHtml(opts: { signinUrl: string; role: string; firstName?: string | null; lastName?: string | null }): string {
  return newAccountCreatedHtml({
    firstName: [opts.firstName, opts.lastName].filter(Boolean).join(" ").trim() || "there",
    role: opts.role,
    signinUrl: opts.signinUrl,
    hasTempPassword: true,
  })
}

export async function sendPortalWelcome(opts: {
  to: string
  role: string
  firstName?: string | null
  lastName?: string | null
}): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const firstName = firstNameOf(opts.firstName) || "there"
  const rolePretty = opts.role ? opts.role.charAt(0).toUpperCase() + opts.role.slice(1) : "Team"
  return sendEmail({
    to: opts.to,
    template: "new_account_created",
    subject: `Your All About Pawz ${rolePretty} account is ready`,
    html: newAccountCreatedHtml({
      firstName,
      role: opts.role,
      signinUrl: signinDoorFor(opts.role),
      hasTempPassword: true,
    }),
  })
}

export async function sendWelcomeBack(opts: { to: string; firstName?: string | null; customerId?: string }) {
  return sendEmail({
    customerId: opts.customerId,
    to: opts.to,
    template: "welcome_back",
    subject: "Welcome back — your profile's ready when you are",
    html: welcomeBackHtml({ firstName: firstNameOf(opts.firstName) || "there" }),
  })
}

export async function sendNewDeviceLogin(opts: { to: string; firstName?: string | null; device?: string; when?: string; location?: string }) {
  const d: NewDeviceData = {
    firstName: firstNameOf(opts.firstName) || "there",
    when: opts.when || new Date().toLocaleString("en-US", { timeZone: "America/Chicago", dateStyle: "long", timeStyle: "short" }) + " (CST)",
    device: opts.device || "A new device or browser",
    location: opts.location,
  }
  return sendEmail({
    to: opts.to,
    template: "login_new_device",
    subject: "New device signed in to your account",
    html: newDeviceLoginHtml(d),
  })
}

// ---- Learning Center ----------------------------------------------------------------

export async function sendEnrollmentWelcome(e: { to: string; firstName?: string | null; programName?: string; instructor?: string }) {
  return sendEmail({
    to: e.to,
    template: "enrollment_welcome",
    subject: `You're enrolled in ${e.programName || "the Learning Center"}`,
    html: enrollmentWelcomeHtml({
      firstName: firstNameOf(e.firstName) || "there",
      programName: e.programName,
      instructor: e.instructor,
    }),
  })
}

export async function sendClassReminder(c: { to: string; firstName?: string | null; moduleName: string; percentComplete: number; programName?: string; minutesLeft?: number }) {
  return sendEmail({
    to: c.to,
    template: "class_reminder",
    subject: `${firstNameOf(c.firstName) || "Good news"}, '${c.moduleName}' is ${c.percentComplete}% done`,
    html: classReminderHtml({
      firstName: firstNameOf(c.firstName) || "there",
      moduleName: c.moduleName,
      percentComplete: c.percentComplete,
      programName: c.programName,
      minutesLeft: c.minutesLeft,
    }),
  })
}

export async function sendCompletionCongratulations(c: { to: string; firstName?: string | null; completedWhat: string; completedOn?: string; nextStep?: string }) {
  return sendEmail({
    to: c.to,
    template: "completion_congratulations",
    subject: `Congratulations — you completed ${c.completedWhat}!`,
    html: completionCongratulationsHtml({
      firstName: firstNameOf(c.firstName) || "there",
      completedWhat: c.completedWhat,
      completedOn: c.completedOn || new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
      nextStep: c.nextStep,
    }),
  })
}

export async function sendEnrollmentNotification(e: { name?: string; email: string; program?: string; enrolledAt?: string }) {
  return sendEmail({
    to: process.env.MANAGEMENT_NOTIFY_EMAIL || "booking@aapawz.com",
    template: "enrollment_notification",
    subject: `New enrollment — ${e.name || e.email}`,
    html: enrollmentNotificationHtml({
      name: e.name || "New member",
      email: e.email,
      program: e.program,
      enrolledAt: e.enrolledAt || new Date().toLocaleString("en-US", { timeZone: "America/Chicago", dateStyle: "long", timeStyle: "short" }),
    }),
  })
}

// ---- Commerce extras -------------------------------------------------------------------

export async function sendSubscriptionBillingNotice(s: SubscriptionBillingData & { to: string; customerId?: string }) {
  return sendEmail({
    customerId: s.customerId,
    to: s.to,
    template: "subscription_billing_notice",
    subject: `Heads up: ${s.amount} renews on ${s.billingDate}`,
    html: subscriptionBillingHtml(s),
  })
}

export async function sendMembershipActive(m: MembershipData & { to: string; customerId?: string }) {
  return sendEmail({
    customerId: m.customerId,
    to: m.to,
    template: "membership_active",
    subject: `Your ${m.planName} membership is active`,
    html: membershipActiveHtml(m),
  })
}

// ---- Template Studio test sends -----------------------------------------------------------

/** Sends any catalog template (rendered with its sample data) to a recipient. */
export async function sendTemplateTest(templateId: string, to: string): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const def = getTemplateDef(templateId)
  if (!def) return { ok: false, error: `Unknown template: ${templateId}` }
  if (def.channel !== "resend") {
    return { ok: false, error: "Supabase templates are pasted into the Supabase dashboard — they can't be test-sent from here." }
  }
  return sendEmail({
    to,
    template: `studio_test_${def.id}`,
    subject: `[TEST] ${def.subject}`,
    html: def.html,
  })
}

// ---- Manual salon messages (Customer 360 → Send Email) --------------------------------------

/** Freeform admin-typed message, wrapped in the branded frame. */
export async function sendSalonMessage(opts: {
  to: string
  customerId?: string
  subject: string
  message: string
}): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const paragraphs = String(opts.message || "")
    .split(/\n{2,}/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => t.replace(/\n/g, "<br>"))
  if (paragraphs.length === 0) paragraphs.push("&nbsp;")
  const plain = String(opts.message || "").replace(/<[^>]+>/g, "").slice(0, 90)
  const html = frame({
    preheader: plain ? `${plain}…` : "A note from All About Pawz.",
    body: [
      eyebrow("A note from All About Pawz"),
      h1("Hello from the salon"),
      taglineFlourish(),
      ...paragraphs.map((t) => p(t)),
      pawDivider(),
      p(`— The All About Pawz family`, { small: true, muted: true, center: true }),
    ].join(""),
    reason: `You're receiving this message because you're an All About Pawz customer.`,
  })
  return sendEmail({
    customerId: opts.customerId,
    to: opts.to,
    template: "salon_message",
    subject: opts.subject || "A note from All About Pawz",
    html,
  })
}

// ---- Order status updates (fulfillment queue) ------------------------------------------------

export async function sendOrderStatusUpdate(opts: {
  to: string
  customerId?: string
  orderNumber: string
  statusNote: string
  firstName?: string
}): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const html = frame({
    preheader: `Update on order ${opts.orderNumber}.`,
    body: [
      eyebrow("Order update"),
      h1(`Update on your order${opts.firstName ? `, ${esc(opts.firstName)}` : ""}`),
      taglineFlourish(),
      p(esc(opts.statusNote)),
      detailsCard("Your order", [
        { label: "Order number", value: esc(opts.orderNumber) },
        { label: "Questions", value: `Reply to this email or ${BRAND.email}` },
      ]),
      p(`Thank you for shopping small — it genuinely means the world to a salon like ours.`, { muted: true, small: true }),
    ].join(""),
    reason: `You're receiving this because you placed an order at aapawz.com.`,
  })
  return sendEmail({
    customerId: opts.customerId,
    to: opts.to,
    template: "order_alert",
    subject: `Your order ${opts.orderNumber} — All About Pawz`,
    html,
  })
}

export { BRAND as EMAIL_BRAND, esc as escapeEmailHtml }
