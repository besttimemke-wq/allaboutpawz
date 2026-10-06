import { NextRequest, NextResponse } from "next/server"
import { requireAdminApi } from "@/lib/admin/gate"
import { EMAIL_TEMPLATES, TEMPLATE_GROUPS } from "@/lib/email/templates"
import { sendTemplateTest } from "@/lib/email"
import { getSupabaseTemplateStatuses, executeSupabaseTemplatePush } from "@/lib/email/supabase-push"
import { SITE_URL } from "@/lib/site-url"

// ---------------------------------------------------------------------------
// GET  /api/admin/email-templates
//   The full email template catalog — every template All About Pawz sends,
//   sample-rendered, for the Email Template Studio.
//
// GET  /api/admin/email-templates?live=1
//   Live sync status of every Supabase-channel template on the HOSTED
//   project (Management API GET + compare) — the Studio's sync indicator.
//
// POST /api/admin/email-templates  { templateId, to }
//   Sends a test email (sample data) to a chosen address via the same
//   audit-trailed Resend pipeline production uses.
//
// POST /api/admin/email-templates  { action: "push" }
//   Pushes every Supabase-channel template to the HOSTED project (Management
//   API PATCH + verify) — the Studio's PUSH TO SUPABASE button. No token
//   ever crosses the wire: the server reads SUPABASE_ACCESS_TOKEN from env.
//
// previewHtml: the studio iframe renders srcDoc content that INHERITS the
// parent origin, so rewriting the site's absolute URLs (https://aapawz.com/…)
// to same-origin paths (/…) makes brand assets like the paw logo load in the
// preview wherever the admin app runs. The `html` field (what Copy HTML gives
// you, and what test sends + the Supabase push use) keeps the absolute
// production URLs, which email clients require.
// ---------------------------------------------------------------------------

function toPreviewHtml(html: string): string {
  return SITE_URL ? html.split(`${SITE_URL}/`).join("/") : html
}

function liveFailureMessage(kind: string): string {
  if (kind === "token") {
    return "SUPABASE_ACCESS_TOKEN is missing or revoked — generate a fresh token at supabase.com/dashboard/account/tokens and set it in the environment."
  }
  if (kind === "ref") {
    return "Could not derive the Supabase project ref — set SUPABASE_URL."
  }
  return "Could not read the live Supabase auth config."
}

export async function GET(req: NextRequest) {
  const gate = await requireAdminApi()
  if (gate) return gate

  // Live sync status for the Supabase-channel templates.
  if (req.nextUrl.searchParams.get("live") === "1") {
    const status = await getSupabaseTemplateStatuses()
    if (!status.ok) {
      return NextResponse.json(
        { live: { ok: false, error: liveFailureMessage(status.failure.kind) } },
        { status: status.failure.kind === "token" ? 503 : 502 },
      )
    }
    return NextResponse.json({
      live: {
        ok: true,
        project: status.ref,
        templates: status.statuses,
      },
    })
  }

  return NextResponse.json({
    groups: TEMPLATE_GROUPS,
    templates: EMAIL_TEMPLATES.map((t) => ({
      id: t.id,
      name: t.name,
      group: t.group,
      channel: t.channel,
      description: t.description,
      subject: t.subject,
      html: t.html,
      previewHtml: toPreviewHtml(t.html),
      supabasePath: t.supabasePath,
      notes: t.notes,
      wired: t.wired,
    })),
  })
}

export async function POST(req: NextRequest) {
  const gate = await requireAdminApi()
  if (gate) return gate

  try {
    const body = await req.json().catch(() => ({}))

    // ---- Push all Supabase templates to the hosted project -----------------
    if (body?.action === "push") {
      const result = await executeSupabaseTemplatePush()
      if (!result.ok) {
        const f = result.failure!
        const message =
          f.kind === "token"
            ? liveFailureMessage("token")
            : f.kind === "ref"
              ? liveFailureMessage("ref")
              : f.kind === "patch"
                ? `Supabase rejected the push (HTTP ${f.status}).`
                : f.kind === "verify"
                  ? `Pushed, but ${f.items.length} template(s) could not be verified.`
                  : "Push failed."
        return NextResponse.json(
          { error: message, detail: f.kind === "patch" || f.kind === "config" ? f.detail : undefined },
          { status: f.kind === "token" ? 503 : 502 },
        )
      }
      return NextResponse.json({
        ok: true,
        pushed: result.pushed,
        verified: result.verified,
        statuses: result.statuses,
      })
    }

    // ---- Test send (existing contract) ---------------------------------------
    const templateId = String(body?.templateId || "")
    const to = String(body?.to || "").trim()

    if (!templateId) return NextResponse.json({ error: "templateId is required" }, { status: 400 })
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return NextResponse.json({ error: "A valid recipient email is required" }, { status: 400 })
    }

    const result = await sendTemplateTest(templateId, to)
    if (!result.ok) {
      return NextResponse.json({ error: result.error || "Send failed" }, { status: 400 })
    }
    return NextResponse.json({ ok: true, messageId: result.messageId })
  } catch (e) {
    console.error("[admin/email-templates] request failed:", e)
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 })
  }
}
