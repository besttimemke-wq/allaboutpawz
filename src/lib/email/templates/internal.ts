// ---------------------------------------------------------------------------
// Internal staff notifications — sent to the salon (booking@ / management)
// rather than customers. Same brand frame, denser "ops" layout.
// ---------------------------------------------------------------------------

import { BRAND, button, detailsCard, eyebrow, h1, p, frame, esc } from "../design"

// ---- New booking (salon notify) ---------------------------------------------------

export interface BookingNotifyData {
  ownerName: string
  dogName?: string
  service: string
  size?: string
  date?: string
  time?: string
  email?: string
  phone?: string
  notes?: string
  bookingRef?: string
}

export function bookingNotificationHtml(d: BookingNotifyData): string {
  return frame({
    nav: false,
    preheader: `New confirmed booking — ${esc(d.ownerName)}${d.dogName ? ` (${esc(d.dogName)})` : ""}.`,
    body: [
      eyebrow("New booking"),
      h1(`${esc(d.ownerName)} just booked`),
      detailsCard("Booking details", [
        ...(d.dogName ? [{ label: "Dog", value: esc(d.dogName) }] : []),
        { label: "Service", value: esc(d.size ? `${d.service} (${d.size})` : d.service) },
        { label: "When", value: esc([d.date, d.time].filter(Boolean).join(" at ") || "TBD") },
        ...(d.bookingRef ? [{ label: "Ref", value: esc(d.bookingRef) }] : []),
        { label: "Email", value: esc(d.email || "—") },
        { label: "Phone", value: esc(d.phone || "—") },
        ...(d.notes ? [{ label: "Notes", value: esc(d.notes) }] : []),
      ]),
      button(`${BRAND.url}/admin/appointments`, "Open the schedule"),
    ].join(""),
    reason: `Internal notification — new booking received through aapawz.com.`,
  })
}

// ---- New consultation request (salon notify) ---------------------------------------

export interface ConsultationNotifyData {
  name: string
  dogName?: string
  breed?: string
  concerns?: string
  preferredTime?: string
  email?: string
  phone?: string
}

export function consultationNotificationHtml(d: ConsultationNotifyData): string {
  return frame({
    nav: false,
    preheader: `New consultation request — ${esc(d.name)}.`,
    body: [
      eyebrow("New consultation request"),
      h1(`${esc(d.name)} requested a consult`),
      detailsCard("Request details", [
        ...(d.dogName ? [{ label: "Dog", value: esc(d.dogName) + (d.breed ? ` · ${esc(d.breed)}` : "") }] : []),
        ...(d.preferredTime ? [{ label: "Preferred time", value: esc(d.preferredTime) }] : []),
        ...(d.concerns ? [{ label: "Notes", value: esc(d.concerns) }] : []),
        { label: "Email", value: esc(d.email || "—") },
        { label: "Phone", value: esc(d.phone || "—") },
      ]),
      button(`${BRAND.url}/contact`, "Reach out"),
    ].join(""),
    reason: `Internal notification — consultation request received through aapawz.com.`,
  })
}

// ---- New Learning Center enrollment (management notify) ------------------------------

export interface EnrollmentNotifyData {
  name: string
  email: string
  program?: string
  enrolledAt: string
}

export function enrollmentNotificationHtml(d: EnrollmentNotifyData): string {
  return frame({
    academy: true,
    nav: false,
    preheader: `New Learning Center enrollment — ${esc(d.name || d.email)}.`,
    body: [
      eyebrow("New enrollment"),
      h1(`A new learner just enrolled`),
      detailsCard("Enrollment details", [
        { label: "Learner", value: esc(d.name || "New member") },
        { label: "Email", value: esc(d.email) },
        ...(d.program ? [{ label: "Program", value: esc(d.program) }] : []),
        { label: "Enrolled at", value: esc(d.enrolledAt) },
      ]),
      button(`${BRAND.learnUrl}/classroom`, "Open LMS dashboard"),
      p(`The learner has been seeded into the database with the learner role and can sign in to the classroom immediately.`, { muted: true, small: true }),
    ].join(""),
    reason: `Internal notification — Learning Center enrollment received.`,
  })
}
