// ---------------------------------------------------------------------------
// Migration: salon facts + tax rate (owner directive, Oct 2026)
//
//   phone ................ 901-722-1114   (was 901-800-7182 — that number is
//                                          the WhatsApp/chat line, not the
//                                          business line)
//   email ................ booking@aapawz.com
//   payment_tax_rate_percent .. 9.25      (did not exist — pricing silently
//                                          fell back to 8.25)
//
// Uses the project's own Supabase client (service role, PostgREST) with the
// same merge-duplicates semantics as repo.saveSettings(). Idempotent.
// Run: set -a; source .env; set +a; bun run .zscripts/update-salon-info.ts
// ---------------------------------------------------------------------------
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const TENANT_ID = "00000000-0000-0000-0000-000000000001";

if (!url || !key || url.includes("your-")) {
  console.error("Supabase env not configured");
  process.exit(1);
}
const admin = createClient(url, key, { auth: { persistSession: false } });

const UPDATES: Array<{ key: string; value: string; label: string; group: string }> = [
  { key: "phone", value: "901-722-1114", label: "Phone", group: "contact" },
  { key: "email", value: "booking@aapawz.com", label: "Email", group: "contact" },
  { key: "payment_tax_rate_percent", value: "9.25", label: "Tax Rate (%)", group: "general" },
];

async function main() {
  for (const u of UPDATES) {
    // Both locales exist in the table (en + en-US) — write both so every
    // reader sees the same facts.
    for (const locale of ["en-US", "en"]) {
      const { error } = await admin.from("cms_global_content").upsert(
        {
          tenant_id: TENANT_ID,
          locale,
          content_key: u.key,
          label: u.label,
          value_text: u.value,
          content_group: u.group,
        },
        { onConflict: "tenant_id,content_key,locale" },
      );
      if (error) throw new Error(`${u.key}/${locale}: ${error.message}`);
    }
    console.log(`✓ ${u.key} = ${u.value}`);
  }
  const { data } = await admin
    .from("cms_global_content")
    .select("content_key, value_text, locale")
    .in("content_key", ["phone", "email", "payment_tax_rate_percent", "addressLine1", "addressLine2"])
    .order("content_key");
  console.log("VERIFY:", JSON.stringify(data, null, 1));
}

main().catch((e) => { console.error(e); process.exit(1); });
