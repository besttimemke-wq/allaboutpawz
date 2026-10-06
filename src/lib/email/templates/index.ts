// ---------------------------------------------------------------------------
// The master email template catalog — every email All About Pawz sends,
// in one place, rendered with sample data for previews and exports.
//
//   channel "supabase" → HTML contains GoTrue handlebars and is pushed to the
//                        hosted Supabase project's auth config automatically:
//                        `bun run email-templates:push` (Management API PATCH
//                        with rollback snapshot + verify).
//   channel "resend"   → rendered server-side with live data and sent via
//                        the audit-trailed sendEmail() pipeline.
// ---------------------------------------------------------------------------

import {
  confirmSignupHtml,
  inviteUserHtml,
  magicLinkHtml,
  changeEmailHtml,
  resetPasswordHtml,
  reauthenticationHtml,
  passwordChangedHtml,
  emailAddressChangedHtml,
  phoneNumberChangedHtml,
  signInMethodLinkedHtml,
  signInMethodRemovedHtml,
  mfaAddedHtml,
  mfaRemovedHtml,
} from "./auth"
import {
  bookingConfirmedHtml,
  bookingRequestHtml,
  appointmentReminderHtml,
  appointmentCanceledHtml,
  appointmentRescheduledHtml,
  abandonedBookingHtml,
  consultationRequestHtml,
  SAMPLE_APPOINTMENT,
  SAMPLE_BOOKING_REQUEST,
} from "./appointments"
import {
  paymentConfirmationHtml,
  orderConfirmationHtml,
  subscriptionBillingHtml,
  membershipActiveHtml,
  SAMPLE_PAYMENT,
  SAMPLE_ORDER,
} from "./commerce"
import {
  customerWelcomeHtml,
  newAccountCreatedHtml,
  teamMemberInviteHtml,
  welcomeBackHtml,
  newDeviceLoginHtml,
} from "./accounts"
import { enrollmentWelcomeHtml, classReminderHtml, completionCongratulationsHtml } from "./learning"
import { couponMailerHtml, SAMPLE_COUPON } from "./marketing"
import { bookingNotificationHtml, consultationNotificationHtml, enrollmentNotificationHtml } from "./internal"

export type TemplateChannel = "resend" | "supabase"
export type TemplateGroupId =
  | "auth"
  | "security"
  | "appointments"
  | "commerce"
  | "accounts"
  | "learning"
  | "marketing"
  | "internal"

export interface EmailTemplateDef {
  id: string
  name: string
  group: TemplateGroupId
  channel: TemplateChannel
  description: string
  subject: string
  html: string
  /** Supabase dashboard path for this template (manual fallback reference). */
  supabasePath?: string
  notes?: string[]
  /** How this template is used in production, if it's wired already. */
  wired?: string
}

export const TEMPLATE_GROUPS: { id: TemplateGroupId; label: string; description: string }[] = [
  { id: "auth", label: "Supabase Auth — Account Emails", description: "Auto-pushed to the hosted Supabase project via `bun run email-templates:push`. Supabase sends these automatically." },
  { id: "security", label: "Supabase Security Alerts", description: "Auto-pushed with the auth templates — security notice section of the Supabase project config." },
  { id: "appointments", label: "Appointments & Booking", description: "Sent via Resend from the booking flows and automations." },
  { id: "commerce", label: "Payments, Orders & Billing", description: "Sent via Resend from checkout, Stripe webhooks, and billing." },
  { id: "accounts", label: "Accounts & Team", description: "Sent via Resend when accounts are created, invited, or signed in." },
  { id: "learning", label: "Leashed Learning Center", description: "Sent via Resend for enrollments, class nudges, and completions." },
  { id: "marketing", label: "Marketing & Offers", description: "Campaign sends — these include an unsubscribe link." },
  { id: "internal", label: "Salon Notifications (Staff)", description: "Internal alerts to booking@ and the management team." },
]

const SUPABASE_NOTES = [
  "Pushed to the hosted project in one command: bun run email-templates:push.",
  "Leave placeholders like {{ .ConfirmationURL }} and {{ .Token }} exactly as written — Supabase replaces them when the email is sent.",
  "The sample render shows the placeholders on purpose: that's the exact HTML that gets pushed.",
  "Manual fallback: copy the HTML and paste into the dashboard editor — only if you prefer doing it by hand.",
]

const PASTE_PATH = "Supabase Dashboard → your project → Authentication → Email Templates"

export const EMAIL_TEMPLATES: EmailTemplateDef[] = [
  // ---- Supabase Auth ------------------------------------------------------------
  {
    id: "supabase_confirm_signup",
    name: "Confirm sign up",
    group: "auth",
    channel: "supabase",
    description: "Ask users to confirm their email address after signing up.",
    subject: "Confirm your email — All About Pawz",
    html: confirmSignupHtml(),
    supabasePath: `${PASTE_PATH} → Confirm signup`,
    notes: SUPABASE_NOTES,
  },
  {
    id: "supabase_invite_user",
    name: "Invite user",
    group: "auth",
    channel: "supabase",
    description: "Invite someone to create an account.",
    subject: "Your All About Pawz portal invitation",
    html: inviteUserHtml(),
    supabasePath: `${PASTE_PATH} → Invite user`,
    notes: SUPABASE_NOTES,
  },
  {
    id: "supabase_magic_link",
    name: "Magic link or OTP",
    group: "auth",
    channel: "supabase",
    description: "Send a one-time sign-in link or one-time password.",
    subject: "Your All About Pawz sign-in code",
    html: magicLinkHtml(),
    supabasePath: `${PASTE_PATH} → Magic Link`,
    notes: SUPABASE_NOTES,
  },
  {
    id: "supabase_change_email",
    name: "Change email address",
    group: "auth",
    channel: "supabase",
    description: "Ask users to verify their new email address after changing it.",
    subject: "Confirm your new email address — All About Pawz",
    html: changeEmailHtml(),
    supabasePath: `${PASTE_PATH} → Change Email Address`,
    notes: SUPABASE_NOTES,
  },
  {
    id: "supabase_reset_password",
    name: "Reset password",
    group: "auth",
    channel: "supabase",
    description: "Send a password reset link or code.",
    subject: "Reset your All About Pawz password",
    html: resetPasswordHtml(),
    supabasePath: `${PASTE_PATH} → Reset Password`,
    notes: SUPABASE_NOTES,
  },
  {
    id: "supabase_reauthentication",
    name: "Reauthentication",
    group: "auth",
    channel: "supabase",
    description: "Ask users to verify their identity before a sensitive operation.",
    subject: "Verify it's you — All About Pawz security check",
    html: reauthenticationHtml(),
    supabasePath: `${PASTE_PATH} → Reauthentication`,
    notes: SUPABASE_NOTES,
  },

  // ---- Supabase Security ---------------------------------------------------------
  {
    id: "supabase_security_password_changed",
    name: "Password changed",
    group: "security",
    channel: "supabase",
    description: "Notify users when their password has changed.",
    subject: "Your All About Pawz password was changed",
    html: passwordChangedHtml(),
    supabasePath: `${PASTE_PATH} → Security → Password changed`,
    notes: SUPABASE_NOTES,
  },
  {
    id: "supabase_security_email_changed",
    name: "Email address changed",
    group: "security",
    channel: "supabase",
    description: "Notify users when their email address has changed.",
    subject: "Your All About Pawz email address was changed",
    html: emailAddressChangedHtml(),
    supabasePath: `${PASTE_PATH} → Security → Email address changed`,
    notes: SUPABASE_NOTES,
  },
  {
    id: "supabase_security_phone_changed",
    name: "Phone number changed",
    group: "security",
    channel: "supabase",
    description: "Notify users when their phone number has changed.",
    subject: "Your All About Pawz phone number was changed",
    html: phoneNumberChangedHtml(),
    supabasePath: `${PASTE_PATH} → Security → Phone number changed`,
    notes: SUPABASE_NOTES,
  },
  {
    id: "supabase_security_signin_linked",
    name: "Sign-in method linked",
    group: "security",
    channel: "supabase",
    description: "Notify users when a sign-in method has been linked to their account.",
    subject: "A sign-in method was linked to your account",
    html: signInMethodLinkedHtml(),
    supabasePath: `${PASTE_PATH} → Security → Sign-in method linked`,
    notes: SUPABASE_NOTES,
  },
  {
    id: "supabase_security_signin_removed",
    name: "Sign-in method removed",
    group: "security",
    channel: "supabase",
    description: "Notify users when a sign-in method has been removed from their account.",
    subject: "A sign-in method was removed from your account",
    html: signInMethodRemovedHtml(),
    supabasePath: `${PASTE_PATH} → Security → Sign-in method removed`,
    notes: SUPABASE_NOTES,
  },
  {
    id: "supabase_security_mfa_added",
    name: "MFA method added",
    group: "security",
    channel: "supabase",
    description: "Notify users when an MFA method has been added to their account.",
    subject: "Two-factor authentication was added to your account",
    html: mfaAddedHtml(),
    supabasePath: `${PASTE_PATH} → Security → MFA method added`,
    notes: SUPABASE_NOTES,
  },
  {
    id: "supabase_security_mfa_removed",
    name: "MFA method removed",
    group: "security",
    channel: "supabase",
    description: "Notify users when an MFA method has been removed from their account.",
    subject: "Two-factor authentication was removed from your account",
    html: mfaRemovedHtml(),
    supabasePath: `${PASTE_PATH} → Security → MFA method removed`,
    notes: SUPABASE_NOTES,
  },

  // ---- Appointments ---------------------------------------------------------------
  {
    id: "booking_request",
    name: "Booking request received",
    group: "appointments",
    channel: "resend",
    description: "The ‘We got it’ email — sent the moment a booking request is submitted.",
    subject: "We got it, Mark — Benji's request is in",
    html: bookingRequestHtml(SAMPLE_BOOKING_REQUEST),
    wired: "Sent automatically when the 5-step booking flow submits its request.",
  },
  {
    id: "booking_confirmed",
    name: "Booking confirmed",
    group: "appointments",
    channel: "resend",
    description: "Sent the moment a booking is confirmed with its deposit.",
    subject: "You're booked in — see you soon, Brea",
    html: bookingConfirmedHtml(SAMPLE_APPOINTMENT),
    wired: "Sent automatically when a booking is confirmed (wizard checkout + deposit).",
  },
  {
    id: "appointment_reminder",
    name: "Appointment reminder",
    group: "appointments",
    channel: "resend",
    description: "Day-before reminder with everything the client needs.",
    subject: "Tomorrow at 10:00 AM — Bella's groom",
    html: appointmentReminderHtml(SAMPLE_APPOINTMENT),
    wired: "Ready — fires from the daily automation sweep for next-day appointments.",
  },
  {
    id: "appointment_canceled",
    name: "Canceled appointment",
    group: "appointments",
    channel: "resend",
    description: "Confirmation when an appointment is canceled by the salon or client.",
    subject: "Your Saturday appointment was canceled",
    html: appointmentCanceledHtml({ ...SAMPLE_APPOINTMENT, canceledBy: "salon" }),
    wired: "Sent when an appointment is canceled from the admin schedule.",
  },
  {
    id: "appointment_rescheduled",
    name: "Rescheduled appointment",
    group: "appointments",
    channel: "resend",
    description: "New-time confirmation showing old and new slots.",
    subject: "New time confirmed — Saturday at 2:00 PM",
    html: appointmentRescheduledHtml({ ...SAMPLE_APPOINTMENT, oldDate: "Saturday", oldTime: "10:00 AM", time: "2:00 PM" }),
    wired: "Sent when an appointment is rescheduled from the admin schedule.",
  },
  {
    id: "abandoned_booking",
    name: "Shop cart / booking reminder",
    group: "appointments",
    channel: "resend",
    description: "One-time \"finish your booking\" nudge with a resume link.",
    subject: "Finish your booking — Bella's appointment is saved",
    html: abandonedBookingHtml({
      firstName: "Brea",
      dogName: "Bella",
      service: "Bath & Brush + Deshedding",
      date: "Saturday",
      time: "10:00 AM",
      resumeUrl: "https://aapawz.com/book/appointment?resume=sample",
    }),
    wired: "Sent by the daily abandoned-booking sweep (deposit never completed).",
  },
  {
    id: "consultation_request",
    name: "Consultation request received",
    group: "appointments",
    channel: "resend",
    description: "Confirmation to the client after submitting a consult request.",
    subject: "We got your consultation request",
    html: consultationRequestHtml({
      firstName: "Brea",
      dogName: "Bella",
      breed: "Goldendoodle",
      preferredTime: "Weekday mornings",
      concerns: "First groom — a little nervous around blow dryers.",
    }),
    wired: "Sent automatically when a consultation form is submitted.",
  },

  // ---- Commerce --------------------------------------------------------------------
  {
    id: "payment_confirmation",
    name: "Payment confirmation",
    group: "commerce",
    channel: "resend",
    description: "Receipt-style confirmation for any payment received.",
    subject: "Receipt — your $25.00 deposit",
    html: paymentConfirmationHtml(SAMPLE_PAYMENT),
    wired: "Sent automatically for deposits and payments (checkout + webhook).",
  },
  {
    id: "order_confirmation",
    name: "Order confirmation",
    group: "commerce",
    channel: "resend",
    description: "Shop order confirmation with items and totals.",
    subject: "Order ORD-10248 confirmed — thank you!",
    html: orderConfirmationHtml(SAMPLE_ORDER),
    wired: "Sent automatically when a shop order is paid (Stripe webhook).",
  },
  {
    id: "subscription_billing_notice",
    name: "Subscription billing notice",
    group: "commerce",
    channel: "resend",
    description: "\"Your card will be billed\" advance notice for subscriptions.",
    subject: "Heads up: $34.00 renews on February 1",
    html: subscriptionBillingHtml({
      firstName: "Brea",
      planName: "Top Dog Club — Monthly",
      amount: "$34.00",
      billingDate: "February 1",
      cardBrand: "Visa",
      cardLast4: "4242",
    }),
    wired: "Ready — send ahead of each renewal cycle.",
  },
  {
    id: "membership_active",
    name: "Your membership is active",
    group: "commerce",
    channel: "resend",
    description: "Welcome to the membership with perks and renewal info.",
    subject: "Your Top Dog membership is active",
    html: membershipActiveHtml({
      firstName: "Brea",
      planName: "Top Dog Club",
      perks: [
        { title: "10% off every groom, every time", body: "Member pricing applies automatically when you book." },
        { title: "Priority booking windows", body: "First pick of Saturday slots, 48 hours before everyone else." },
        { title: "A free birthday bath", body: "Within your pup's birthday month — we'll remind you." },
      ],
      renewal: "Renews monthly · cancel any time",
    }),
    wired: "Sent when a membership is activated or renewed.",
  },

  // ---- Accounts ---------------------------------------------------------------------
  {
    id: "customer_welcome",
    name: "Welcome email",
    group: "accounts",
    channel: "resend",
    description: "Welcome to All About Pawz — new customer account created.",
    subject: "Welcome to All About Pawz",
    html: customerWelcomeHtml({ firstName: "Brea" }),
    wired: "Sent automatically when a new customer account is created.",
  },
  {
    id: "new_account_created",
    name: "New account created",
    group: "accounts",
    channel: "resend",
    description: "Owner-provisioned account with sign-in door for the role.",
    subject: "Your All About Pawz Customer account is ready",
    html: newAccountCreatedHtml({
      firstName: "Brea",
      role: "customer",
      signinUrl: "https://aapawz.com/access-customer",
      hasTempPassword: true,
    }),
    wired: "Sent when the salon creates an account from the CRM.",
  },
  {
    id: "team_member_invite",
    name: "You've been invited as a team member",
    group: "accounts",
    channel: "resend",
    description: "Staff invite with role and one-time accept link.",
    subject: "You're invited — Groomer at All About Pawz",
    html: teamMemberInviteHtml({
      fullName: "Maya Johnson",
      role: "groomer",
      actionLink: "https://aapawz.com/auth/set-password",
      invitedBy: "Brea",
    }),
    wired: "Sent when a team member is invited (Users & Access).",
  },
  {
    id: "welcome_back",
    name: "Welcome back",
    group: "accounts",
    channel: "resend",
    description: "Returning customer detected — profile exists, sign in to continue.",
    subject: "Welcome back — your profile's ready when you are",
    html: welcomeBackHtml({ firstName: "Brea" }),
    wired: "Sent when a booking is started with an email that already has a profile.",
  },
  {
    id: "login_new_device",
    name: "Signed in from a new device",
    group: "accounts",
    channel: "resend",
    description: "Security notice when the account is signed in from an unrecognized device.",
    subject: "New device signed in to your account",
    html: newDeviceLoginHtml({
      firstName: "Brea",
      when: "Today at 8:42 PM (CST)",
      device: "Chrome on Windows · Memphis, TN area",
    }),
    wired: "Sent on first sign-in from an unrecognized device or browser.",
  },

  // ---- Learning ----------------------------------------------------------------------
  {
    id: "enrollment_welcome",
    name: "Learning Center enrollment welcome",
    group: "learning",
    channel: "resend",
    description: "Enrollment confirmation with classroom next-steps.",
    subject: "You're enrolled in the Pet Groomer Certification",
    html: enrollmentWelcomeHtml({
      firstName: "Brea",
      programName: "Pet Groomer Certification",
      instructor: "Your Leashed Academy instructor team",
    }),
    wired: "Sent when a learner enrolls in a Learning Center program.",
  },
  {
    id: "class_reminder",
    name: "Complete your class reminder",
    group: "learning",
    channel: "resend",
    description: "Nudge to finish a module, with progress bar.",
    subject: "Brea, 'Safe Handling Fundamentals' is 60% done",
    html: classReminderHtml({
      firstName: "Brea",
      moduleName: "Safe Handling Fundamentals",
      percentComplete: 60,
      programName: "Pet Groomer Certification",
      minutesLeft: 25,
    }),
    wired: "Ready — fires from the automation sweep for stalled learners.",
  },
  {
    id: "completion_congratulations",
    name: "Congratulations — module / course / certificate",
    group: "learning",
    channel: "resend",
    description: "Celebration email for completing a module, course, or certificate.",
    subject: "Congratulations — you completed Safe Handling Fundamentals!",
    html: completionCongratulationsHtml({
      firstName: "Brea",
      completedWhat: "Safe Handling Fundamentals — Module 2",
      completedOn: "January 12, 2026",
      nextStep: "Module 3 (Breed Styling Basics) unlocks now — about 40 minutes.",
    }),
    wired: "Sent when a learner completes a module, course, or certificate.",
  },

  // ---- Marketing ------------------------------------------------------------------------
  {
    id: "sales_coupon_mailer",
    name: "Sales / discount coupons mailer",
    group: "marketing",
    channel: "resend",
    description: "Promotional offer mailer with code and fine print — includes unsubscribe.",
    subject: "Spring Fluff-Up: 20% off every groom",
    html: couponMailerHtml(SAMPLE_COUPON),
    wired: "Send to the marketing list from the Studio (test) or campaigns.",
  },

  // ---- Internal --------------------------------------------------------------------------
  {
    id: "booking_notification",
    name: "New booking (salon alert)",
    group: "internal",
    channel: "resend",
    description: "Internal alert to the salon when a booking lands.",
    subject: "New booking — Brea (Bella) · Sat 10:00 AM",
    html: bookingNotificationHtml({
      ownerName: "Brea Freeman",
      dogName: "Bella",
      service: "Bath & Brush + Deshedding",
      size: "Medium",
      date: "Saturday",
      time: "10:00 AM",
      email: "brea@example.com",
      phone: "901-555-0142",
      bookingRef: "BK-4F2A91",
    }),
    wired: "Sent to booking@aapawz.com when a booking is confirmed.",
  },
  {
    id: "consultation_notification",
    name: "New consultation request (salon alert)",
    group: "internal",
    channel: "resend",
    description: "Internal alert when a consultation form is submitted.",
    subject: "New consultation request — Brea",
    html: consultationNotificationHtml({
      name: "Brea Freeman",
      dogName: "Bella",
      breed: "Goldendoodle",
      concerns: "First groom — a little nervous around blow dryers.",
      preferredTime: "Weekday mornings",
      email: "brea@example.com",
      phone: "901-555-0142",
    }),
    wired: "Sent to booking@aapawz.com when a consult is requested.",
  },
  {
    id: "enrollment_notification",
    name: "New enrollment (management alert)",
    group: "internal",
    channel: "resend",
    description: "Internal alert when a learner enrolls in the Learning Center.",
    subject: "New enrollment — Brea Freeman",
    html: enrollmentNotificationHtml({
      name: "Brea Freeman",
      email: "brea@example.com",
      program: "Pet Groomer Certification",
      enrolledAt: "January 12, 2026 at 8:42 PM",
    }),
    wired: "Sent to management when a learner enrolls.",
  },
]

export function getTemplateDef(id: string): EmailTemplateDef | undefined {
  return EMAIL_TEMPLATES.find((t) => t.id === id)
}
