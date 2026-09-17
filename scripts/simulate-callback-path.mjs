// Reproduce the EXACT callback decision path for the owner's real auth user
// using the production code (src/lib/pawz-auth.ts) against the live Supabase.
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const env = readFileSync("/home/z/my-project/.env", "utf8");
const get = (k) => (env.match(new RegExp(`^${k}=(.*)$`, "m")) || [])[1]?.trim().replace(/^["']|["']$/g, "") || "";
process.env.NEXT_PUBLIC_SUPABASE_URL = get("NEXT_PUBLIC_SUPABASE_URL") || get("SUPABASE_URL");
process.env.SUPABASE_SERVICE_ROLE_KEY = get("SUPABASE_SERVICE_ROLE_KEY");
process.env.ADMIN_EMAILS = process.env.ADMIN_EMAILS || get("ADMIN_EMAILS");

const mod = await import("../src/lib/pawz-auth.ts");
const admin = mod.getSupabaseAdmin();

// Locate both auth users
const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
for (const u of data.users) {
  const email = u.email;
  console.log(`\n########## ${email} (id=${u.id}) ##########`);
  console.log("[1] findAuthUserByEmail:", (await mod.findAuthUserByEmail(admin, email))?.id || "NOT FOUND");
  const resolved = await mod.resolvePortalUser(u.id);
  console.log("[2] resolvePortalUser:", JSON.stringify(resolved, null, 2));
  if (resolved) {
    console.log("[3] autoDestination:", mod.autoDestination(resolved));
    for (const p of ["admin", "groomer", "frontdesk", "customer"]) {
      const v = mod.validatePortalAccess(p, resolved);
      console.log(`[4] validatePortalAccess(${p}): ok=${v.ok} → ${v.redirectTo || v.error}`);
    }
  }
}
