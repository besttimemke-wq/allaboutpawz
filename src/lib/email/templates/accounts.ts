// ---------------------------------------------------------------------------
// Account emails: customer welcome, owner-provisioned accounts, team invites,
// returning-customer "welcome back", and new-device sign-in notices.
// ---------------------------------------------------------------------------

import { BRAND, button, detailsCard, eyebrow, h1, linkFallback, noteBox, p, steps, taglineFlourish, frame, esc } from "../design"

// ---- New customer welcome --------------------------------------------------------

export interface WelcomeData {
  firstName: string
}

export function customerWelcomeHtml(d: WelcomeData): string {
  return frame({
    preheader: `Welcome to the family — your All About Pawz account is ready.`,
    body: [
      eyebrow("Welcome"),
      h1(`Welcome to the family, ${esc(d.firstName)}`),
      taglineFlourish(),
      p(`Your All About Pawz account is ready. It's the one place where your dogs, appointments, deposits, and full grooming history live together — and it fills itself in as you book.`),
      steps([
        { title: "Sign in to your portal", body: "Use the email address this welcome arrived at." },
        { title: "Add your pup's details", body: "Breed, size, quirks, and vaccination records — groomers see all of it before every visit." },
        { title: "Book your next groom", body: "Returning takes about a minute — your preferences are remembered." },
      ]),
      button(BRAND.portalUrl, "Open my portal"),
      noteBox(`Your account was created from your booking — there's no password yet. Use <strong style="color:#1a1a1a">Forgot password</strong> on the sign-in page once and we'll email you a secure set-up link from our account system.`),
    ].join(""),
    reason: `You're receiving this because an All About Pawz account was created for you.`,
  })
}

// ---- New account created (owner-provisioned, password already set) -----------------

export interface ProvisionedAccountData {
  firstName: string
  role: string
  signinUrl: string
  hasTempPassword?: boolean
}

export function newAccountCreatedHtml(d: ProvisionedAccountData): string {
  const rolePretty = esc(d.role.charAt(0).toUpperCase() + d.role.slice(1))
  return frame({
    preheader: `Your All About Pawz ${rolePretty} account is set up and ready to use.`,
    body: [
      eyebrow("Your account is ready"),
      h1(`Hi ${esc(d.firstName)}, your account is live`),
      taglineFlourish(),
      p(`The salon team set up an All About Pawz account for you as <strong style="color:#1a1a1a">${rolePretty}</strong>. ${d.hasTempPassword ? "They gave you a temporary password to use the first time you sign in." : "It's ready to use right now."}`),
      detailsCard("Your account", [
        { label: "Role", value: rolePretty },
        { label: "Sign in", value: esc(d.signinUrl.replace(/^https?:\/\//, "")) },
        { label: "Username", value: "The email address this message was sent to" },
      ]),
      button(d.signinUrl, "Sign in to your portal"),
      p(
        d.hasTempPassword
          ? `After your first sign-in, change that temporary password from your account settings so it's truly yours. You can also set your own password right now — tap <strong style="color:#1a1a1a">Forgot password</strong> on the sign-in page and follow the email we send you (it comes straight from our account system and is safe to click).`
          : `If you ever forget your password, use <strong style="color:#1a1a1a">Forgot password</strong> on the sign-in page — the reset email comes from our account system and is safe to click.`,
        { small: true, muted: true }
      ),
      noteBox(`Didn't expect this account? Contact the salon at ${BRAND.phone} before using it.`),
    ].join(""),
    reason: `You're receiving this because an All About Pawz account was created for you by the salon.`,
  })
}

// ---- Team member invite ------------------------------------------------------------

export interface TeamInviteData {
  fullName?: string
  role: string
  actionLink: string
  invitedBy?: string
}

export function teamMemberInviteHtml(d: TeamInviteData): string {
  const greet = d.fullName ? `Hi ${esc(d.fullName)},` : `Hi there,`
  const rolePretty = esc(d.role.charAt(0).toUpperCase() + d.role.slice(1))
  return frame({
    preheader: `You've been invited to the All About Pawz team as ${rolePretty}.`,
    body: [
      eyebrow("You're invited"),
      h1(`${greet.replace(",", "")} — welcome aboard`),
      p(
        `${d.invitedBy ? `${esc(d.invitedBy)} has` : "The salon has"} invited you to join the All About Pawz team as <strong style="color:#1a1a1a">${rolePretty}</strong>. Accept below, set your password, and your dashboard will be ready — schedule, clients, and everything the role unlocks.`,
      ),
      detailsCard("Your invitation", [
        { label: "Role", value: rolePretty },
        { label: "Link expires", value: "In 24 hours (single use)" },
      ]),
      button(d.actionLink, "Accept & set password"),
      linkFallback(d.actionLink),
      noteBox(`Didn't expect this invitation? You can safely ignore this email — nothing happens until you accept.`),
    ].join(""),
    reason: `You're receiving this because you were invited to the All About Pawz team portal.`,
  })
}

// ---- Welcome back (returning customer detected) --------------------------------------

export interface WelcomeBackData {
  firstName: string
}

export function welcomeBackHtml(d: WelcomeBackData): string {
  return frame({
    preheader: `Good to see you again — your profile is ready whenever you are.`,
    body: [
      eyebrow("Welcome back"),
      h1(`Good to see you again, ${esc(d.firstName)}`),
      taglineFlourish(),
      p(`It looks like you started a new booking — but you already have a profile with us. Your dogs, preferences, and grooming history are saved and waiting, so signing in is the fastest path: no re-typing anything, and every visit lands in the same tidy history.`),
      steps([
        { title: "Sign in to your portal", body: "Use the email address this message arrived at — or the Forgot password link if you've never set one." },
        { title: "Pick up right where you left off", body: "Your saved pets and preferences make booking take about a minute." },
      ]),
      button(BRAND.portalUrl, "Sign in to my portal"),
      p(`Would rather just finish without signing in? That works too — the booking continues either way.`, { muted: true, small: true }),
    ].join(""),
    reason: `You're receiving this because you have an All About Pawz profile and recently started a booking.`,
  })
}

// ---- New device sign-in notice --------------------------------------------------------

export interface NewDeviceData {
  firstName: string
  when: string
  device: string
  location?: string
}

export function newDeviceLoginHtml(d: NewDeviceData): string {
  return frame({
    preheader: `A new device just signed in to your All About Pawz account.`,
    body: [
      eyebrow("New device sign-in", "brick"),
      h1(`A new device just signed in`),
      p(`Someone signed in to your All About Pawz account from a device we haven't seen before. If that was you — welcome back, and you can ignore the rest of this email.`),
      detailsCard("Sign-in details", [
        { label: "When", value: esc(d.when) },
        { label: "Device", value: esc(d.device) },
        ...(d.location ? [{ label: "Approximate location", value: esc(d.location) }] : []),
        { label: "Account", value: "The email address this notice was sent to" },
      ], { tone: "brick" }),
      eyebrow("If this wasn't you", "brick"),
      steps([
        { title: "Reset your password now", body: "Use Forgot password on the sign-in page — the reset email is safe to click." },
        { title: "Tell the salon", body: `Call ${BRAND.phone} so we can watch the account and lock things down.` },
      ]),
      button(`${BRAND.portalUrl}`, "Review my account"),
      noteBox(`We send this notice once per new device or browser. Clearing cookies or signing in from a new phone will trigger it again — that's normal and healthy.`, "brick"),
    ].join(""),
    reason: `You're receiving this security notice because your All About Pawz account was signed in to from a new device.`,
  })
}
