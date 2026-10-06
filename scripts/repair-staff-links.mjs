// Repair the live association data so the owner's real auth user resolves
// as admin: re-link staff rows (stale auth id → real id), add the owner
// tenant_memberships row, link customer rows by email.
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const env = readFileSync("/home/z/my-project/.env", "utf8");
const get = (k) => (env.match(new RegExp(`^${k}=(.*)$`, "m")) || [])[1]?.trim() || "";
const admin = createClient(get("NEXT_PUBLIC_SUPABASE_URL") || get("SUPABASE_URL"), get("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });

const OWNER_EMAIL = "allaboutpawz901@gmail.com";
const OWNER_ID = "7ea0339e-d79d-477e-adc5-66b6b417525d";
const GROOMER_EMAIL = "besttimemke@gmail.com";
const GROOMER_ID = "f556b165-8c2b-45fe-84b3-95e17522b414";
const TENANT = "00000000-0000-0000-0000-000000000001";

// Verify the real ids exist in auth.users before linking
const { data: ul } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
const liveIds = new Set((ul?.users || []).map((u) => u.id));
if (!liveIds.has(OWNER_ID)) { console.error("ABORT: owner id not in auth.users"); process.exit(1); }
if (!liveIds.has(GROOMER_ID)) { console.error("ABORT: groomer id not in auth.users"); process.exit(1); }

// 1. Staff: re-link every row whose email matches and whose userId is stale/NULL
for (const [email, id] of [[OWNER_EMAIL, OWNER_ID], [GROOMER_EMAIL, GROOMER_ID]]) {
  const { data: rows, error } = await admin.from("staff").select("id, name, email, \"userId\", role").ilike("email", email);
  if (error) { console.error("staff select error:", error.message); continue; }
  for (const r of rows || []) {
    if (r.userId === id) { console.log(`staff ok: ${r.name} already → ${id.slice(0, 8)}…`); continue; }
    const { error: upErr } = await admin.from("staff").update({ userId: id }).eq("id", r.id);
    console.log(upErr ? `staff FAIL ${r.name}: ${upErr.message}` : `staff FIXED: ${r.name} (${r.role}) userId ${r.userId ? r.userId.slice(0, 8) + "…" : "NULL"} → ${id.slice(0, 8)}…`);
  }
}

// 2. tenant_memberships: ensure owner row exists (role=owner, active)
const { data: tm } = await admin.from("tenant_memberships").select("id, role, status").eq("user_id", OWNER_ID);
if (!tm || tm.length === 0) {
  const { error: insErr } = await admin.from("tenant_memberships").insert({
    tenant_id: TENANT, user_id: OWNER_ID, role: "owner", status: "active", active: true,
  });
  console.log(insErr ? `tenant_memberships FAIL: ${insErr.message}` : "tenant_memberships CREATED: owner @ default tenant");
} else {
  console.log(`tenant_memberships ok: ${tm.length} row(s) for owner (${tm[0].role}/${tm[0].status})`);
}

// 3. customers: link by email where userId is NULL
for (const [email, id] of [[OWNER_EMAIL, OWNER_ID], [GROOMER_EMAIL, GROOMER_ID]]) {
  const { data: rows, error } = await admin.from("customers").select("id, email, \"userId\"").ilike("email", email);
  if (error) { console.error("customers select error:", error.message); continue; }
  for (const r of rows || []) {
    if (r.userId) { console.log(`customers ok: ${r.email.slice(0, 4)}*** already linked`); continue; }
    const { error: upErr } = await admin.from("customers").update({ userId: id }).eq("id", r.id);
    console.log(upErr ? `customers FAIL: ${upErr.message}` : `customers LINKED: ${r.email.slice(0, 4)}*** → ${id.slice(0, 8)}…`);
  }
}

console.log("\n--- repair complete ---");
