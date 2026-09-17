// Verify the /api/admin/* gate accepts the portal (pawz_session) admin cookie:
// 1. mint a valid admin session cookie locally (same HMAC the server uses)
// 2. curl /api/admin/settings with and without it
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const env = readFileSync("/home/z/my-project/.env", "utf8");
const get = (k) => (env.match(new RegExp(`^${k}=(.*)$`, "m")) || [])[1]?.trim().replace(/^["']|["']$/g, "") || "";
process.env.NEXT_PUBLIC_SUPABASE_URL = get("NEXT_PUBLIC_SUPABASE_URL") || get("SUPABASE_URL");
process.env.SUPABASE_SERVICE_ROLE_KEY = get("SUPABASE_SERVICE_ROLE_KEY");
process.env.ADMIN_EMAILS = "";

const mod = await import("../src/lib/pawz-auth.ts");
const admin = mod.getSupabaseAdmin();
const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
const owner = data.users.find((u) => u.email === "allaboutpawz901@gmail.com");
const resolved = await mod.resolvePortalUser(owner.id);
console.log("resolved:", resolved.role, "/", resolved.membershipRole);
const token = mod.signSession(resolved);

const base = "http://localhost:3000";
const noCookie = await fetch(`${base}/api/admin/settings`);
const withCookie = await fetch(`${base}/api/admin/settings`, { headers: { cookie: `pawz_session=${token}` } });
console.log("GET /api/admin/settings  no-cookie:", noCookie.status, "| pawz_session-admin:", withCookie.status);
const body = await withCookie.json().catch(() => null);
console.log("with-cookie body keys:", body ? Object.keys(body).slice(0, 5) : "(none)");
