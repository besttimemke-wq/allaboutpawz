import { NextRequest, NextResponse } from "next/server";
import { pgQuery, pgExec } from "@/lib/pg";
import { DEFAULT_SETTINGS, type SystemSettings } from "@/lib/settings-types";
import { requireAdminApi } from "@/lib/admin/gate";
import { getCurrentUser } from "@/lib/auth/server";
import { TENANT_ID, platformAudit } from "@/lib/crm/enterprise";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/settings — Read all system settings from
// public.cms_global_content. No mock fallback — if the DB is unreachable,
// the pgQuery retry logic handles it, and the hook surfaces the error.
export async function GET(req: NextRequest) {
  const gate = await requireAdminApi();
  if (gate) return gate;

  try {
    const rows = await pgQuery<{ content_key: string; value_text: string }>(
      `SELECT content_key, value_text FROM public.cms_global_content
       WHERE tenant_id = $1 AND locale = 'en-US'`,
      [TENANT_ID()],
    );

    const settings: Record<string, unknown> = { ...DEFAULT_SETTINGS };

    for (const row of rows) {
      const key = row.content_key;
      const rawVal = row.value_text ?? "";

      if (rawVal === "true") {
        settings[key] = true;
      } else if (rawVal === "false") {
        settings[key] = false;
      } else if (!isNaN(Number(rawVal)) && rawVal.trim() !== "") {
        settings[key] = Number(rawVal);
      } else {
        try {
          if ((rawVal.startsWith("{") && rawVal.endsWith("}")) || (rawVal.startsWith("[") && rawVal.endsWith("]"))) {
            settings[key] = JSON.parse(rawVal);
          } else {
            settings[key] = rawVal;
          }
        } catch {
          settings[key] = rawVal;
        }
      }
    }

    return NextResponse.json(settings);
  } catch (err: any) {
    console.error("[GET /api/admin/settings] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to load settings" },
      { status: 500 },
    );
  }
}

// POST /api/admin/settings — Update or upsert multiple settings keys.
// Every commit is audited into lms.platform_audit_log.
export async function POST(req: NextRequest) {
  const gate = await requireAdminApi();
  if (gate) return gate;

  try {
    const body = await req.json();
    const updatedKeys: string[] = [];
    const actor = await getCurrentUser().catch(() => null);

    const groupFor = (key: string) => {
      if (["phone", "email", "addressLine1", "addressLine2", "address", "city", "state", "postalCode"].includes(key)) return "contact";
      if (["facebook", "instagram", "twitter", "youtube", "tiktok"].includes(key)) return "social";
      if (/^hours/i.test(key)) return "hours";
      if (/^footer/i.test(key)) return "footer";
      return "general";
    };
    const labelFor = (key: string) =>
      key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());

    for (const [key, val] of Object.entries(body)) {
      if (val === undefined) continue;

      const serializedVal = typeof val === "object" ? JSON.stringify(val) : String(val);
      await pgExec(
        `INSERT INTO public.cms_global_content (tenant_id, content_key, label, value_text, content_group, locale)
         VALUES ($1, $2, $3, $4, $5, 'en-US')
         ON CONFLICT (tenant_id, content_key, locale)
         DO UPDATE SET value_text = EXCLUDED.value_text, label = EXCLUDED.label, updated_at = now()`,
        [TENANT_ID(), key, labelFor(key), serializedVal, groupFor(key)],
      );
      updatedKeys.push(key);
    }

    // Audit the commit
    if (updatedKeys.length > 0) {
      // platformAudit needs a raw client — use pgQuery to insert the audit row directly
      await pgExec(
        `INSERT INTO lms.platform_audit_log (tenant_id, action, target_type, actor_user_id, actor_role, metadata)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
        [
          TENANT_ID(),
          "settings.update",
          "cms_global_content",
          actor?.id || null,
          "admin",
          JSON.stringify({ keys: updatedKeys }),
        ],
      ).catch((e: any) => console.error("[settings] audit failed:", e.message));
    }

    return NextResponse.json({ success: true, message: "System settings saved successfully." });
  } catch (err: any) {
    console.error("[POST /api/admin/settings] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to save settings" },
      { status: 500 },
    );
  }
}
