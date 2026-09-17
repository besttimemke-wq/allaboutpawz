// Inspect the LIVE Supabase project: auth users + provisioning tables.
// Goal: find why an existing email user who signs in with Google is not
// associated with a portal (bounced back to the door instead).
// Prints only structural data (emails, roles, links) — never secrets.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = readFileSync("/home/z/my-project/.env", "utf8");
const get = (k) => {
  const m = env.match(new RegExp(`^${k}=(.*)$`, "m"));
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : "";
};
const url = get("NEXT_PUBLIC_SUPABASE_URL") || get("SUPABASE_URL");
const key = get("SUPABASE_SERVICE_ROLE_KEY");
const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const mask = (e) => (e ? e.replace(/^(.{2}).*(@.*)$/, "$1***$2") : "(null)");

// 1. Auth users — provider state + metadata
console.log("=== AUTH USERS (auth.users) ===");
let page = 1;
const users = [];
for (;;) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
  if (error) { console.log("listUsers error:", error.message); break; }
  users.push(...(data?.users || []));
  if (!data?.users || data.users.length < 200 || page > 20) break;
  page++;
}
for (const u of users) {
  const idents = (u.identities || []).map((i) => i.provider).join(",");
  const meta = u.user_metadata || {};
  console.log(
    `${mask(u.email)} | id=${u.id.slice(0, 8)}… | providers=${idents || "(email only)"} | confirmed=${u.email_confirmed_at ? "yes" : "NO"} | meta.role=${meta.role || "-"} | google_linked=${Boolean(meta.google_sub)} | created=${(u.created_at || "").slice(0, 10)}`
  );
}
console.log(`total auth users: ${users.length}`);

// 2. Provisioning tables — link state
const tables = [
  ["staff", "id, name, email, \"userId\", role"],
  ["tenant_memberships", "user_id, role, status, tenant_id"],
  ["platform_admins", "user_id"],
  ["portal_customer_accounts", "auth_user_id, status"],
];
for (const [t, cols] of tables) {
  console.log(`\n=== ${t} ===`);
  const { data, error } = await admin.from(t).select(cols).limit(50);
  if (error) { console.log(`${t} error:`, error.message); continue; }
  if (!data || data.length === 0) { console.log("(empty)"); continue; }
  for (const row of data) {
    if (t === "staff") console.log(`name=${row.name} | email=${mask(row.email)} | userId=${row.userId ? row.userId.slice(0, 8) + "…" : "NULL ← UNLINKED"} | role=${row.role}`);
    else if (t === "tenant_memberships") console.log(`user_id=${row.user_id ? row.user_id.slice(0, 8) + "…" : "NULL"} | role=${row.role} | status=${row.status}`);
    else console.log(JSON.stringify(row).slice(0, 120));
  }
}

// 3. customers — userId link coverage
console.log("\n=== customers (link coverage) ===");
const { data: cust, error: custErr } = await admin.from("customers").select("id, email, \"userId\"").limit(100);
if (custErr) console.log("customers error:", custErr.message);
else {
  const linked = (cust || []).filter((c) => c.userId).length;
  console.log(`rows(sample<=100): ${(cust || []).length}, linked-by-userId: ${linked}, unlinked: ${(cust || []).length - linked}`);
  for (const c of (cust || []).slice(0, 10)) console.log(`email=${mask(c.email)} | userId=${c.userId ? "set" : "NULL"}`);
}

// 4. oauth_states — recent flow rows (did states get created/consumed?)
console.log("\n=== oauth_states (recent) ===");
const { data: states, error: stErr } = await admin.from("oauth_states").select("nonce, portal, redirect_to, return_origin, used, expires_at, created_at").order("created_at", { ascending: false }).limit(10);
if (stErr) console.log("oauth_states error:", stErr.message);
else if (!states || states.length === 0) console.log("(no rows — table empty or missing)");
else for (const s of states) console.log(`portal=${s.portal} | redirect_to=${s.redirect_to} | return_origin=${s.return_origin || "-"} | used=${s.used} | created=${(s.created_at || s.expires_at || "")}`);
