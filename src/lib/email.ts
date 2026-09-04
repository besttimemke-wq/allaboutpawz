import "server-only"
import { Resend } from "resend"
import { repo } from "./repo"

// ---------------------------------------------------------------------------
// Email via Resend npm package, called from Next.js server routes.
// RESEND_API_KEY is in the server environment. No Edge Function. No secrets panel.
// ---------------------------------------------------------------------------

const apiKey = process.env.RESEND_API_KEY || ""
const resend = apiKey ? new Resend(apiKey) : null
const FROM = "All About Pawz <notifications@confirmation.aapawz.com>"
const salonNotifyTo = "notifications@confirmation.aapawz.com"

export async function sendEmail(opts: {
  customerId?: string
  to: string
  template: string
  subject: string
  html: string
  relatedBookingId?: string
  relatedInvoiceId?: string
  relatedOrderId?: string
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

// ---- Templated emails ----

export async function sendCustomerWelcome(customer: { id: string; firstName: string; lastName: string; email: string }) {
  return sendEmail({
    customerId: customer.id,
    to: customer.email,
    template: "customer_welcome",
    subject: "Welcome to All About Pawz",
    html: welcomeHtml(customer.firstName),
  })
}

export async function sendBookingConfirmation(b: {
  customerId?: string; ownerName: string; dogName?: string | null; service: string
  size?: string | null; date?: string | null; time?: string | null; email?: string | null
  phone?: string | null; notes?: string | null; bookingId?: string
}) {
  const customerEmail = b.email
  const summary = `Service: ${b.service}${b.size ? ` (${b.size})` : ""}<br/>Date: ${b.date || "TBD"}${b.time ? ` at ${b.time}` : ""}<br/>Dog: ${b.dogName || "—"}${b.notes ? `<br/>Notes: ${b.notes}` : ""}`

  if (customerEmail) {
    await sendEmail({
      customerId: b.customerId,
      to: customerEmail,
      template: "booking_confirmation",
      subject: "Your appointment is confirmed — All About Pawz",
      html: bookingConfirmedHtml(b.ownerName, summary, b.bookingId),
      relatedBookingId: b.bookingId,
    })
  }

  await sendEmail({
    customerId: b.customerId,
    to: salonNotifyTo,
    template: "booking_notification",
    subject: `Booking confirmed — ${b.ownerName} (${b.dogName || "dog"})`,
    html: bookingSalonHtml(b.ownerName, summary, customerEmail || "", b.phone || "", b.bookingId),
    relatedBookingId: b.bookingId,
  })
}

export async function sendConsultationRequest(c: {
  customerId?: string; name: string; dogName?: string | null; breed?: string | null
  concerns?: string | null; preferredTime?: string | null
  email?: string | null; phone?: string | null; consultationId?: string
}) {
  const customerEmail = c.email
  const summary = `Name: ${c.name}${c.dogName ? `<br/>Dog: ${c.dogName}` : ""}${c.breed ? ` (${c.breed})` : ""}${c.preferredTime ? `<br/>Preferred time: ${c.preferredTime}` : ""}${c.concerns ? `<br/>Concerns: ${c.concerns}` : ""}`

  if (customerEmail) {
    await sendEmail({
      customerId: c.customerId,
      to: customerEmail,
      template: "consultation_request",
      subject: "Consultation request received — All About Pawz",
      html: consultationHtml(c.name, summary),
      relatedBookingId: c.consultationId,
    })
  }
  await sendEmail({
    customerId: c.customerId,
    to: salonNotifyTo,
    template: "consultation_notification",
    subject: `New consultation request — ${c.name}`,
    html: consultationSalonHtml(c.name, summary, customerEmail || "", c.phone || ""),
    relatedBookingId: c.consultationId,
  })
}

export async function sendPaymentReceipt(p: {
  customerId?: string; amount: string; type: string; email?: string; bookingId?: string
}) {
  if (!p.email) return
  await sendEmail({
    customerId: p.customerId,
    to: p.email,
    template: "payment_receipt",
    subject: "Payment receipt — All About Pawz",
    html: `<!doctype html><html><body style="font-family:Georgia,serif;max-width:560px;margin:auto;background:#faf7f2;padding:32px;color:#1a1a1a"><h1 style="font-size:24px">Payment Received</h1><p>Thank you — we've received your payment.</p><div style="background:#fff;border:1px solid #e0d6bf;padding:16px;margin:16px 0"><p style="font-size:18px;font-weight:bold">${p.amount}</p><p style="font-size:12px;color:#666">${p.type}</p></div></body></html>`,
    relatedBookingId: p.bookingId,
  })
}

// ---- Templates ----

function welcomeHtml(name: string) {
  return `<!doctype html><html><body style="font-family:Georgia,'Playfair Display',serif;max-width:560px;margin:auto;background:#faf7f2;padding:32px;color:#1a1a1a"><p style="font-size:10px;letter-spacing:0.18em;color:#9a7b3c;text-transform:uppercase;font-family:sans-serif;font-weight:700">Welcome</p><h1 style="font-size:32px;line-height:1.1;margin:8px 0 0">Hi ${name},</h1><p style="font-style:italic;color:#9a7b3c;font-size:22px;margin:4px 0 16px">From Pawz to PAWfection</p><p>Welcome to All About Pawz. We've created your customer account so you can manage your dogs, appointments, payments, and grooming history in one place.</p><p style="margin-top:16px">We look forward to caring for your pup.</p><a href="https://aapawz.com/account" style="display:inline-block;background:#1a1a1a;color:#faf7f2;padding:12px 28px;text-decoration:none;font-size:11px;font-weight:700;letter-spacing:0.12em;font-family:sans-serif;text-transform:uppercase">Access My Account</a></body></html>`
}

function bookingConfirmedHtml(name: string, summary: string, bookingId?: string) {
  return `<!doctype html><html><body style="font-family:Georgia,serif;max-width:560px;margin:auto;background:#faf7f2;padding:32px;color:#1a1a1a"><p style="font-size:10px;letter-spacing:0.18em;color:#9a7b3c;text-transform:uppercase;font-family:sans-serif;font-weight:700">Booking Confirmed</p><h1 style="font-size:28px;line-height:1.1;margin:8px 0 0">Your appointment is confirmed, ${name}.</h1><p style="font-style:italic;color:#9a7b3c;font-size:20px;margin:4px 0 16px">From Pawz to PAWfection</p><div style="background:#fff;border:1px solid #e0d6bf;padding:16px;margin:16px 0">${summary}</div>${bookingId ? `<p style="font-size:11px;color:#666">Booking ref: ${bookingId.slice(0, 8)}</p>` : ""}<p style="margin-top:16px">See you soon!</p></body></html>`
}

function bookingSalonHtml(name: string, summary: string, email: string, phone: string, bookingId?: string) {
  return `<!doctype html><html><body style="font-family:sans-serif;max-width:560px;margin:auto;color:#1a1a1a"><h2 style="color:#9a7b3c">Booking confirmed — ${name}</h2><p>${name}'s booking is now confirmed${bookingId ? ` (ref: ${bookingId.slice(0, 8)})` : ""}.</p><div style="background:#f6f6f6;border-left:3px solid #9a7b3c;padding:12px;margin:12px 0">${summary}</div><p style="font-size:13px">Email: ${email || "—"}<br/>Phone: ${phone || "—"}</p><a href="https://aapawz.com/admin/bookings" style="display:inline-block;background:#1a1a1a;color:#fff;padding:10px 20px;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase">Review in Operations</a></body></html>`
}

function consultationHtml(name: string, summary: string) {
  return `<!doctype html><html><body style="font-family:Georgia,serif;max-width:560px;margin:auto;background:#faf7f2;padding:32px;color:#1a1a1a"><p style="font-size:10px;letter-spacing:0.18em;color:#9a7b3c;text-transform:uppercase;font-family:sans-serif;font-weight:700">Consultation Requested</p><h1 style="font-size:28px;line-height:1.1;margin:8px 0 0">Hi ${name},</h1><p style="font-style:italic;color:#9a7b3c;font-size:20px;margin:4px 0 16px">From Pawz to PAWfection</p><p>Thank you for requesting a consultation. We'll reach out personally to schedule your visit.</p><div style="background:#fff;border:1px solid #e0d6bf;padding:16px;margin:16px 0">${summary}</div></body></html>`
}

function consultationSalonHtml(name: string, summary: string, email: string, phone: string) {
  return `<!doctype html><html><body style="font-family:sans-serif;max-width:560px;margin:auto;color:#1a1a1a"><h2 style="color:#9a7b3c">New consultation request — ${name}</h2><div style="background:#f6f6f6;border-left:3px solid #9a7b3c;padding:12px;margin:12px 0">${summary}</div><p style="font-size:13px">Email: ${email || "—"}<br/>Phone: ${phone || "—"}</p></body></html>`
}
