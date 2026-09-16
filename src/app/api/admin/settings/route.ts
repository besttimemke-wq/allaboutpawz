import { NextRequest, NextResponse } from "next/server";
import pg from "pg";
import { DEFAULT_SETTINGS, SystemSettings } from "@/lib/settings-types";
import { requireAdminApi } from "@/lib/admin/gate";
import { getCurrentUser } from "@/lib/auth/server";
import { TENANT_ID, platformAudit } from "@/lib/crm/enterprise";

async function getPgClient() {
  const connectionString = process.env.SUPABASE_SESSION_POOLER || process.env.SUPABASE_DIRECT_CONNECTION;
  if (!connectionString) return null;
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  return client;
}

// GET /api/admin/settings - Read all system settings.
// Storage: the owner's cms_global_content table (content_group general/
// contact/social/hours/footer) — no parallel key-value table.
export async function GET(req: NextRequest) {
  const gate = await requireAdminApi();
  if (gate) return gate;

  try {
    const pgClient = await getPgClient();
    if (!pgClient) {
      // Graceful fallback if database connection string is not set
      return NextResponse.json(DEFAULT_SETTINGS);
    }

    const result = await pgClient.query(
      `SELECT content_key, value_text FROM public.cms_global_content
       WHERE tenant_id = $1 AND locale = 'en-US'`,
      [TENANT_ID()],
    );

    const settings: Record<string, any> = { ...DEFAULT_SETTINGS };

    for (const row of result.rows) {
      const key = row.content_key;
      const rawVal = row.value_text ?? "";

      // Try parsing boolean, numbers or objects if applicable
      if (rawVal === "true") {
        settings[key] = true;
      } else if (rawVal === "false") {
        settings[key] = false;
      } else if (!isNaN(Number(rawVal)) && rawVal.trim() !== "") {
        settings[key] = Number(rawVal);
      } else {
        try {
          // Check if it's JSON array or object
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

    await pgClient.end();
    return NextResponse.json(settings);
  } catch (err: any) {
    console.error("[GET /api/admin/settings] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to load settings" }, { status: 500 });
  }
}

// POST /api/admin/settings - Update or upsert multiple settings keys.
// Every commit is audited into the owner's platform_audit_log.
export async function POST(req: NextRequest) {
  const gate = await requireAdminApi();
  if (gate) return gate;

  try {
    const body = await req.json();
    const pgClient = await getPgClient();

    if (!pgClient) {
      // If no database is available, return the updated request payload to mock saving
      return NextResponse.json({ success: true, message: "Settings simulated saved.", data: body });
    }

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

    // Dynamic upsert for each provided field in the body
    for (const [key, val] of Object.entries(body)) {
      if (val === undefined) continue;

      const serializedVal = typeof val === "object" ? JSON.stringify(val) : String(val);
      await pgClient.query(
        `INSERT INTO public.cms_global_content (tenant_id, content_key, label, value_text, content_group, locale)
         VALUES ($1, $2, $3, $4, $5, 'en-US')
         ON CONFLICT (tenant_id, content_key, locale)
         DO UPDATE SET value_text = EXCLUDED.value_text, label = EXCLUDED.label, updated_at = now()`,
        [TENANT_ID(), key, labelFor(key), serializedVal, groupFor(key)],
      );
      updatedKeys.push(key);
    }

    // Audit the commit into the owner's platform_audit_log (his table —
    // no parallel audit_logs, no seeded fake telemetry).
    if (updatedKeys.length > 0) {
      await platformAudit(pgClient, {
        action: "settings.update",
        targetType: "cms_global_content",
        actorUserId: actor?.id || null,
        actorRole: "admin",
        metadata: { keys: updatedKeys },
      }).catch((e: any) => console.error("[settings] audit failed:", e.message));
    }

    await pgClient.end();
    return NextResponse.json({ success: true, message: "System settings saved successfully." });
  } catch (err: any) {
    console.error("[POST /api/admin/settings] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to save settings" }, { status: 500 });
  }
}
