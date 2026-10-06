// ---------------------------------------------------------------------------
// Supabase email template push — shared engine.
//
// One implementation, three callers:
//   • CLI:     scripts/push-supabase-email-templates.ts (bun run email-templates:push)
//   • Admin:   POST /api/admin/email-templates { action: "push" } (the Email
//              Template Studio's PUSH TO SUPABASE button)
//   • CI:      the email-templates GitHub Action (docs/email-templates-workflow.yml)
//
// Renders every Supabase-channel template from the design-system registry
// (the same source of truth the Studio previews) and pushes subject + HTML
// to the HOSTED project through the Supabase Management API
//   PATCH /v1/projects/{ref}/config/auth
// with security-notice key names discovered from the live GET (never
// guessed) and a post-push verification pass.
// ---------------------------------------------------------------------------

import { EMAIL_TEMPLATES } from "./templates"

const API = "https://api.supabase.com/v1"

export function supabaseAccessToken(): string {
  return (process.env.SUPABASE_ACCESS_TOKEN || "").trim()
}

export function supabaseProjectRef(): string | null {
  const explicit = (process.env.SUPABASE_PROJECT_REF || "").trim()
  if (explicit) return explicit
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim()
  const m = url.match(/^https?:\/\/([a-z0-9]+)\.supabase\.co/i)
  return m ? m[1] : null
}

// Registry id → GoTrue template key (the six core auth templates).
const CORE_KEYS: Record<string, string> = {
  supabase_confirm_signup: "confirmation",
  supabase_invite_user: "invite",
  supabase_magic_link: "magic_link",
  supabase_change_email: "email_change",
  supabase_reset_password: "recovery",
  supabase_reauthentication: "reauthentication",
}

// Live API key suffixes (normalized uppercase) for the seven security
// notices — verified against the hosted project's GET response:
//   PASSWORD_CHANGED_NOTIFICATION, EMAIL_CHANGED_NOTIFICATION,
//   PHONE_CHANGED_NOTIFICATION, IDENTITY_LINKED_NOTIFICATION,
//   IDENTITY_UNLINKED_NOTIFICATION, MFA_FACTOR_ENROLLED_NOTIFICATION,
//   MFA_FACTOR_UNENROLLED_NOTIFICATION
const SECURITY_MATCHERS: { id: string; pattern: RegExp }[] = [
  { id: "supabase_security_password_changed", pattern: /PASSWORD[_-]?CHANGED(?!.*EMAIL)(?!.*PHONE)/ },
  { id: "supabase_security_email_changed", pattern: /EMAIL[_-]?CHANGED/ },
  { id: "supabase_security_phone_changed", pattern: /PHONE[_-]?CHANGED/ },
  { id: "supabase_security_signin_linked", pattern: /(IDENTITY|SSO|SIGNIN)[_-]?(LINKED|ADDED)/ },
  { id: "supabase_security_signin_removed", pattern: /(IDENTITY|SSO|SIGNIN)[_-]?(UNLINKED|REMOVED)/ },
  { id: "supabase_security_mfa_added", pattern: /MFA[_-]?(FACTOR[_-]?)?(ENROLLED|ADDED|ENABLED)/ },
  { id: "supabase_security_mfa_removed", pattern: /MFA[_-]?(FACTOR[_-]?)?(UNENROLLED|REMOVED|DISABLED)/ },
]

export interface SupabaseTemplatePlanItem {
  templateId: string
  name: string
  subjectKey: string // lowercase, as the PATCH accepts
  contentKey: string
  subject: string
  html: string
}

export interface SupabaseTemplateStatus {
  templateId: string
  name: string
  /** true when BOTH live subject and live HTML match the registry. */
  inSync: boolean
  subjectKey: string
  contentKey: string
  liveSubject: string | null
  liveHtmlBytes: number | null
}

export type PushFailure =
  | { kind: "token" }
  | { kind: "ref" }
  | { kind: "config"; status: number; detail: string }
  | { kind: "patch"; status: number; detail: string }
  | { kind: "verify"; items: string[] }

export interface SupabasePushResult {
  ok: boolean
  failure?: PushFailure
  pushed?: number
  verified?: number
  plan: SupabaseTemplatePlanItem[]
  /** Post-push per-template status (null until a successful verify pass). */
  statuses?: SupabaseTemplateStatus[]
}

// ---- Live config -------------------------------------------------------------

async function getLiveConfig(
  token: string,
  ref: string,
): Promise<{ ok: true; config: Record<string, unknown> } | { ok: false; status: number; detail: string }> {
  const res = await fetch(`${API}/projects/${ref}/config/auth`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  })
  if (!res.ok) {
    return { ok: false, status: res.status, detail: (await res.text()).slice(0, 400) }
  }
  const raw = (await res.json()) as Record<string, unknown>
  // Normalize key casing once — the API's casing has drifted over the years.
  const config = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k.toUpperCase(), v]))
  return { ok: true, config }
}

// ---- Plan + statuses -----------------------------------------------------------

export function buildPlan(live: Record<string, unknown> | null): SupabaseTemplatePlanItem[] {
  const supabaseChannel = EMAIL_TEMPLATES.filter((t) => t.channel === "supabase")
  const byId = new Map(supabaseChannel.map((t) => [t.id, t]))
  const plan: SupabaseTemplatePlanItem[] = []

  for (const [id, suffix] of Object.entries(CORE_KEYS)) {
    const t = byId.get(id)
    if (!t) continue
    plan.push({
      templateId: id,
      name: t.name,
      subjectKey: `mailer_subjects_${suffix}`,
      contentKey: `mailer_templates_${suffix}_content`,
      subject: t.subject,
      html: t.html,
    })
  }
  if (!live) return plan

  // Discover the security-notice keys this project's API actually exposes.
  const contentKeys = Object.keys(live).filter((k) => /^MAILER_TEMPLATES_(.+)_CONTENT$/.test(k))
  for (const ck of contentKeys) {
    const suffix = ck.match(/^MAILER_TEMPLATES_(.+)_CONTENT$/)![1]
    if (/^(CONFIRMATION|INVITE|MAGIC_LINK|EMAIL_CHANGE|RECOVERY|REAUTHENTICATION)$/.test(suffix)) continue
    const matcher = SECURITY_MATCHERS.find((m) => m.pattern.test(suffix))
    const t = matcher ? byId.get(matcher.id) : undefined
    if (!t) continue
    plan.push({
      templateId: t.id,
      name: t.name,
      subjectKey: `mailer_subjects_${suffix.toLowerCase()}`,
      contentKey: `mailer_templates_${suffix.toLowerCase()}_content`,
      subject: t.subject,
      html: t.html,
    })
  }
  return plan
}

function statusesFor(
  plan: SupabaseTemplatePlanItem[],
  config: Record<string, unknown>,
): SupabaseTemplateStatus[] {
  return plan.map((item) => {
    const liveSubject = config[item.subjectKey.toUpperCase()]
    const liveHtml = config[item.contentKey.toUpperCase()]
    return {
      templateId: item.templateId,
      name: item.name,
      subjectKey: item.subjectKey,
      contentKey: item.contentKey,
      liveSubject: typeof liveSubject === "string" ? liveSubject : null,
      liveHtmlBytes: typeof liveHtml === "string" ? liveHtml.length : null,
      inSync: liveSubject === item.subject && liveHtml === item.html,
    }
  })
}

// ---- Live status (read-only — the Studio's sync indicator) ---------------------

export async function getSupabaseTemplateStatuses(): Promise<
  { ok: true; ref: string; statuses: SupabaseTemplateStatus[] } | { ok: false; failure: PushFailure }
> {
  const token = supabaseAccessToken()
  if (!token) return { ok: false, failure: { kind: "token" } }
  const ref = supabaseProjectRef()
  if (!ref) return { ok: false, failure: { kind: "ref" } }

  const live = await getLiveConfig(token, ref)
  if (!live.ok) {
    return {
      ok: false,
      failure: live.status === 401 ? { kind: "token" } : { kind: "config", status: live.status, detail: live.detail },
    }
  }
  const plan = buildPlan(live.config)
  return { ok: true, ref, statuses: statusesFor(plan, live.config) }
}

// ---- Execute the push ------------------------------------------------------------

export async function executeSupabaseTemplatePush(): Promise<SupabasePushResult> {
  const token = supabaseAccessToken()
  if (!token) return { ok: false, failure: { kind: "token" }, plan: [] }
  const ref = supabaseProjectRef()
  if (!ref) return { ok: false, failure: { kind: "ref" }, plan: [] }

  const live = await getLiveConfig(token, ref)
  if (!live.ok) {
    return {
      ok: false,
      failure: live.status === 401 ? { kind: "token" } : { kind: "config", status: live.status, detail: live.detail },
      plan: [],
    }
  }

  const plan = buildPlan(live.config)
  const body: Record<string, string> = {}
  for (const item of plan) {
    body[item.subjectKey] = item.subject
    body[item.contentKey] = item.html
  }

  const res = await fetch(`${API}/projects/${ref}/config/auth`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  })
  if (!res.ok) {
    return {
      ok: false,
      failure: { kind: "patch", status: res.status, detail: (await res.text()).slice(0, 400) },
      plan,
    }
  }

  // Verify — re-read and compare every key.
  const after = await getLiveConfig(token, ref)
  if (!after.ok) {
    return { ok: false, failure: { kind: "config", status: after.status, detail: after.detail }, plan, pushed: plan.length }
  }
  const statuses = statusesFor(plan, after.config)
  const failed = statuses.filter((s) => !s.inSync).map((s) => s.name)
  return {
    ok: failed.length === 0,
    failure: failed.length ? { kind: "verify", items: failed } : undefined,
    pushed: plan.length,
    verified: statuses.length - failed.length,
    plan,
    statuses,
  }
}
