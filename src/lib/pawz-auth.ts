// ============================================================================
// AAPAWZ Auth System — shared backend module (single source of truth)
//
// Every auth route (/api/auth/login, /api/auth/google/start,
// /api/auth/google/callback, /api/auth/portal-session, /api/auth/logout)
// calls into this module. The frontend never branches on role inside one
// form — it only tells the server which door was used; this module decides
// who the user is and which portal they belong to.
// ============================================================================

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

// ---------------------------------------------------------------------------
// Portal (door) definitions
// ---------------------------------------------------------------------------
export type PortalId = "customer" | "groomer" | "frontdesk" | "admin" | "lms";

export interface PortalDefinition {
  id: PortalId;
  door: string; // sign-in page route
  destination: string; // default post-login destination
  google: boolean; // Google OAuth offered on this door?
}

export const PORTALS: Record<PortalId, PortalDefinition> = {
  customer: { id: "customer", door: "/access-customer", destination: "/customer/dashboard", google: true },
  groomer: { id: "groomer", door: "/access-groomer", destination: "/groomer/dashboard", google: true },
  frontdesk: { id: "frontdesk", door: "/access-frontdesk", destination: "/admin/dashboard", google: true },
  admin: { id: "admin", door: "/admin-login", destination: "/admin/dashboard", google: true },
  lms: { id: "lms", door: "/learn/sign-in", destination: "/customer/dashboard", google: true },
};

// ---------------------------------------------------------------------------
// Google OAuth redirect-URI activation (LIVE verification — no stale lists)
// ---------------------------------------------------------------------------
// Ground truth for "is this origin activated" lives in the owner's Google
// client, NOT in this codebase. The previous hardcoded origin list was a
// second gate on top of Google's own: an origin the owner had already
// registered still bounced, because the list only changes when the code does.
// That double gate is gone. /api/auth/google/start now verifies the redirect
// URI against Google's own authorize endpoint at click time: with prompt=none,
// a REGISTERED redirect URI answers 302 back to that URI
// (error=interaction_required / a code); an UNREGISTERED one answers 302 to
// accounts.google.com/signin/oauth/error (redirect_uri_mismatch). Results are
// cached in memory — positive 5 min, negative 60 s — so a URI registered in
// the Google console takes effect within a minute, with no code or env change.
// On a probe network failure the check fails OPEN (Google renders its own
// error — the app never blocks a working flow).
//
// GOOGLE_REGISTERED_ORIGINS (comma-separated) is still honored as an
// additional skip-the-probe allowlist for deployments that want zero
// outbound calls to Google on the sign-in path.

export const GOOGLE_CALLBACK_PATH = "/api/auth/google/callback";

export function googleCallbackUri(origin: string): string {
  return `${origin.replace(/\/$/, "")}${GOOGLE_CALLBACK_PATH}`;
}

/** The stable origin whose callback is registered on the Google client for
 *  every deployment of this app. Preview origins change per session and can
 *  never all be pre-registered, so their flows are routed THROUGH this
 *  registered callback and relayed back (see /api/auth/google/callback). */
export function productionRelayOrigin(): string {
  return (process.env.GOOGLE_RELAY_ORIGIN || "https://aapawz.com").replace(/\/$/, "");
}

export function productionRelayCallbackUri(): string {
  return googleCallbackUri(productionRelayOrigin());
}

/** The sandbox preview gateway pattern — https://preview-chat-<id>.space-z.ai.
 *  Relay targets are RESTRICTED to this pattern: it is the platform's own
 *  gateway (no attacker-controlled pages can exist on it), which is what
 *  makes relaying an authorization code back to it safe. */
export function isPreviewOrigin(origin: string): boolean {
  return /^https:\/\/preview-chat-[a-z0-9-]+\.space-z\.ai$/i.test((origin || "").replace(/\/$/, ""));
}

const uriCache = new Map<string, { ok: boolean; at: number }>();

/** Live check: does the Google client have this exact redirect URI registered? */
export async function redirectUriRegistered(redirectUri: string): Promise<boolean> {
  const allowlisted = (process.env.GOOGLE_REGISTERED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean)
    .some((o) => redirectUri === googleCallbackUri(o));
  if (allowlisted) return true;

  const hit = uriCache.get(redirectUri);
  const ttl = hit?.ok ? 5 * 60 * 1000 : 60 * 1000;
  if (hit && Date.now() - hit.at < ttl) return hit.ok;

  let ok = true; // fail-open — let Google itself render any error
  try {
    const probeUrl =
      "https://accounts.google.com/o/oauth2/v2/auth?" +
      new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "openid email profile",
        state: "check",
        prompt: "none",
      }).toString();
    const res = await fetch(probeUrl, { redirect: "manual", signal: AbortSignal.timeout(5000) });
    const loc = res.headers.get("location") || "";
    if (res.status === 302 && loc) ok = loc.startsWith(redirectUri);
  } catch {
    ok = true;
  }
  uriCache.set(redirectUri, { ok, at: Date.now() });
  return ok;
}

let relayCheck: { ok: boolean; status: number | null; at: number } | null = null;

/** Live check: is the production deployment running relay-capable callback
 *  code (GET {relay}/api/auth/google/callback?probe=relay → {relay:true})?
 *  Preview-origin flows only relay when this is true, so users are never
 *  silently signed into the wrong deployment. Fails CLOSED — an unreachable
 *  probe never routes anyone into a dead end.
 *
 *  Redirects are FOLLOWED: the registered redirect URI is the apex
 *  (https://aapawz.com/...) while the deployment may sit behind an apex→www
 *  308 — a manual-redirect probe would report "not capable" forever even
 *  after the build is deployed. The JSON + content-type check on the final
 *  response keeps the probe honest (an HTML catch-all page never passes). */
export async function productionRelayStatus(): Promise<{ ok: boolean; status: number | null }> {
  const hit = relayCheck;
  const ttl = hit?.ok ? 5 * 60 * 1000 : 60 * 1000;
  if (hit && Date.now() - hit.at < ttl) return { ok: hit.ok, status: hit.status };

  let ok = false;
  let status: number | null = null;
  try {
    const res = await fetch(`${productionRelayCallbackUri()}?probe=relay`, {
      redirect: "follow",
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    status = res.status;
    if (res.status === 200 && (res.headers.get("content-type") || "").includes("application/json")) {
      const body = await res.json().catch(() => null);
      ok = Boolean(body && (body as any).relay === true);
    }
  } catch (e: any) {
    ok = false;
    status = null;
  }
  relayCheck = { ok, status, at: Date.now() };
  return { ok, status };
}

/** Boolean convenience wrapper around productionRelayStatus(). */
export async function productionRelayCapable(): Promise<boolean> {
  return (await productionRelayStatus()).ok;
}

// ---------------------------------------------------------------------------
// OAuth browser binding (login-CSRF guard)
// ---------------------------------------------------------------------------
// The start route sets a short-lived cookie in the user's browser and stores
// its hash in the state row; the callback refuses to complete without it, so
// nobody can paste a sign-in link into someone else's browser and get them
// logged into the attacker's account. SameSite=Lax survives the full
// Google → (relay) → callback top-level navigation chain.
export const OAUTH_BROWSER_COOKIE = "pawz_oauth_b";

export function newBrowserBinding(): { value: string; hash: string } {
  const value = randomBytes(32).toString("base64url");
  return { value, hash: createHash("sha256").update(value).digest("hex") };
}

export function hashBrowserBinding(value: string | undefined | null): string | null {
  if (!value) return null;
  return createHash("sha256").update(value).digest("hex");
}

// The shape the portal store (Zustand) persists — mirrors lib/types AuthUser.
export type PortalRole = "admin" | "groomer" | "customer";

export interface ResolvedPortalUser {
  authUserId: string;
  email: string;
  name: string;
  role: PortalRole;
  stationName?: string;
  avatarUrl?: string;
  scope: "admin" | "employee" | "customer";
  /** raw membership role, e.g. owner | admin | manager | groomer | front_desk | staff */
  membershipRole?: string;
}

// ---------------------------------------------------------------------------
// Supabase clients
// ---------------------------------------------------------------------------
const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

export function getSupabaseAdmin(): SupabaseClient | null {
  if (!SUPABASE_URL || !SERVICE_KEY) return null;
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function getSupabaseAnon(): SupabaseClient | null {
  if (!SUPABASE_URL || !ANON_KEY) return null;
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function supabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SERVICE_KEY);
}

// ---------------------------------------------------------------------------
// Role resolution (server-side only — the client is never trusted)
// ---------------------------------------------------------------------------
const ADMIN_ROLES = ["owner", "admin", "manager", "platform_admin"];
const GROOMER_ROLES = ["groomer", "stylist", "staff", "bather"];
const FRONTDESK_ROLES = ["front_desk", "frontdesk", "reception"];

function rest<T = any>(client: SupabaseClient): { from: SupabaseClient["from"] } {
  return { from: client.from.bind(client) };
}

/**
 * Resolves the portal identity of an authenticated Supabase auth user:
 * platform_admins → tenant_memberships → staff → portal_customer_accounts →
 * customers.userId → user metadata fallback.
 */
export async function resolvePortalUser(authUserId: string): Promise<ResolvedPortalUser | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data: authUserData } = await admin.auth.admin.getUserById(authUserId);
  const authUser: any = authUserData?.user;
  const email = (authUser?.email || "").toLowerCase();
  if (!email) return null;

  const nameFromMeta =
    authUser?.user_metadata?.full_name ||
    authUser?.user_metadata?.name ||
    (authUser?.user_metadata as any)?.firstName ||
    email.split("@")[0];
  const avatarUrl = authUser?.user_metadata?.avatar_url || authUser?.user_metadata?.picture;

  // 0. Owner-declared admins (ADMIN_EMAILS) — first and final word. The owner's
  //    account is an admin regardless of table state; no provisioning row can
  //    demote it, and an account created directly in Supabase by the owner
  //    still resolves as admin.
  const declaredAdmins = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (declaredAdmins.includes(email)) {
    return { authUserId, email, name: nameFromMeta, role: "admin", avatarUrl, scope: "admin", membershipRole: "owner" };
  }

  // 1. Platform admins (cross-tenant super admins)
  try {
    const { data: platformAdmins } = await admin.from("platform_admins").select("user_id").eq("user_id", authUserId).limit(1);
    if (platformAdmins && platformAdmins.length > 0) {
      return { authUserId, email, name: nameFromMeta, role: "admin", avatarUrl, scope: "admin", membershipRole: "platform_admin" };
    }
  } catch { /* table may not exist */ }

  // 2. Tenant memberships (admin / employee scopes)
  try {
    const { data: memberships } = await admin
      .from("tenant_memberships")
      .select("role, tenant_id, status")
      .eq("user_id", authUserId);
    const active = (memberships || []).find((m: any) => m.status !== "suspended") || (memberships || [])[0];
    if (active) {
      const membershipRole = String(active.role || "").toLowerCase();
      if (ADMIN_ROLES.includes(membershipRole)) {
        return { authUserId, email, name: nameFromMeta, role: "admin", avatarUrl, scope: "admin", membershipRole };
      }
      if (FRONTDESK_ROLES.includes(membershipRole)) {
        return {
          authUserId, email, name: nameFromMeta, role: "admin", avatarUrl, scope: "employee",
          stationName: "Front Desk — Intake & Concierge", membershipRole,
        };
      }
      if (GROOMER_ROLES.includes(membershipRole)) {
        return { authUserId, email, name: nameFromMeta, role: "groomer", avatarUrl, scope: "employee", membershipRole };
      }
      // Unknown staff role → employee/groomer portal by default
      return { authUserId, email, name: nameFromMeta, role: "groomer", avatarUrl, scope: "employee", membershipRole };
    }
  } catch { /* table may not exist */ }

  // 3. Staff table (fallback employee signal)
  try {
    const { data: staff } = await admin.from("staff").select("name, role").eq("userId", authUserId).limit(1);
    if (staff && staff.length > 0) {
      const staffRole = String((staff[0] as any).role || "").toLowerCase();
      const name = (staff[0] as any).name || nameFromMeta;
      if (FRONTDESK_ROLES.includes(staffRole)) {
        return { authUserId, email, name, role: "admin", avatarUrl, scope: "employee", stationName: "Front Desk — Intake & Concierge", membershipRole: staffRole };
      }
      if (ADMIN_ROLES.includes(staffRole)) {
        return { authUserId, email, name, role: "admin", avatarUrl, scope: "admin", membershipRole: staffRole };
      }
      return { authUserId, email, name, role: "groomer", avatarUrl, scope: "employee", membershipRole: staffRole };
    }
  } catch { /* table may not exist */ }

  // 4. Customer portal accounts
  try {
    const { data: accounts } = await admin
      .from("portal_customer_accounts")
      .select("auth_user_id, status")
      .eq("auth_user_id", authUserId)
      .limit(1);
    if (accounts && accounts.length > 0) {
      return { authUserId, email, name: nameFromMeta, role: "customer", avatarUrl, scope: "customer", membershipRole: "customer" };
    }
  } catch { /* table may not exist */ }

  // 5. Customers linked by userId
  try {
    const { data: customers } = await admin.from("customers").select("firstName, lastName").eq("userId", authUserId).limit(1);
    if (customers && customers.length > 0) {
      const c = customers[0] as any;
      const name = `${c.firstName || ""} ${c.lastName || ""}`.trim() || nameFromMeta;
      return { authUserId, email, name, role: "customer", avatarUrl, scope: "customer", membershipRole: "customer" };
    }
  } catch { /* table may not exist */ }

  // 6. Metadata fallback (never grants staff access — customers only)
  const metaRole = String(authUser?.user_metadata?.role || "").toLowerCase();
  if (metaRole === "customer") {
    return { authUserId, email, name: nameFromMeta, role: "customer", avatarUrl, scope: "customer", membershipRole: "customer" };
  }
  // Auth user with NO provisioning records at all → treat as customer only
  // for the customer/lms doors; staff doors reject them explicitly.
  return { authUserId, email, name: nameFromMeta, role: "customer", avatarUrl, scope: "customer", membershipRole: "unprovisioned" };
}

// ---------------------------------------------------------------------------
// Portal validation — the door decides, server-side
// ---------------------------------------------------------------------------
export interface PortalValidationResult {
  ok: boolean;
  user?: ResolvedPortalUser;
  redirectTo?: string;
  error?: string;
}

/** The ORIGINAL repo's routing rule (Serviceportals /api/auth/google):
 *  "DB is source of truth" — the destination comes from the resolved salon
 *  identity, never from the door, a URL param, or anything the user picked. */
export function autoDestination(user: ResolvedPortalUser): string {
  if (user.scope === "admin") return "/admin/dashboard";
  if (FRONTDESK_ROLES.includes(String(user.membershipRole || ""))) return "/admin/dashboard";
  if (user.scope === "employee") return "/groomer/dashboard";
  return "/customer/dashboard";
}

export function validatePortalAccess(portal: PortalId, user: ResolvedPortalUser): PortalValidationResult {
  const def = PORTALS[portal];

  switch (portal) {
    case "admin": {
      if (user.scope === "admin" && user.role === "admin" && user.membershipRole !== "front_desk") {
        return { ok: true, user, redirectTo: def.destination };
      }
      if (FRONTDESK_ROLES.includes(String(user.membershipRole || ""))) {
        return { ok: false, error: "This account is registered for Front Desk access. Use the Front Desk sign-in page." };
      }
      if (user.scope === "employee") {
        return { ok: false, error: "No admin account found for this email. Contact your admin." };
      }
      return { ok: false, error: "This email is registered as a customer account. Use the Customer sign-in page." };
    }
    case "groomer": {
      if (user.scope === "employee" && user.role === "groomer") {
        return { ok: true, user, redirectTo: def.destination };
      }
      if (FRONTDESK_ROLES.includes(String(user.membershipRole || ""))) {
        return { ok: false, error: "This account is registered for Front Desk access. Use the Front Desk sign-in page." };
      }
      if (user.scope === "admin") {
        return { ok: false, error: "This email is an admin account. Use the Admin sign-in page." };
      }
      return { ok: false, error: "No groomer account found for this email. Contact your admin." };
    }
    case "frontdesk": {
      if (user.scope === "employee" && FRONTDESK_ROLES.includes(String(user.membershipRole || ""))) {
        return { ok: true, user, redirectTo: def.destination };
      }
      if (user.scope === "employee") {
        return { ok: false, error: "This account is registered for the Groomer portal. Use the Groomer sign-in page." };
      }
      if (user.scope === "admin") {
        return { ok: false, error: "This email is an admin account. Use the Admin sign-in page." };
      }
      return { ok: false, error: "No front desk account found for this email. Contact your admin." };
    }
    case "customer": {
      if (user.role === "customer") {
        return { ok: true, user, redirectTo: def.destination };
      }
      return { ok: false, error: "This email is a staff account. Use the staff sign-in pages." };
    }
    case "lms": {
      // LMS is self-serve within managed accounts — customers AND staff.
      if (user.role === "customer") return { ok: true, user, redirectTo: def.destination };
      if (user.scope === "employee" && user.role === "groomer") return { ok: true, user, redirectTo: "/groomer/dashboard" };
      if (user.scope === "admin") return { ok: true, user, redirectTo: "/admin/dashboard" };
      return { ok: false, error: "No account found for this email." };
    }
  }
}

// ---------------------------------------------------------------------------
// Signed session cookie (pawz_session)
// ---------------------------------------------------------------------------
const COOKIE_NAME = "pawz_session";
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

function secret(): string {
  // HMAC key — the service role key never leaves the server.
  return SERVICE_KEY || "pawz-dev-secret";
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

export interface SessionPayload {
  sub: string;
  email: string;
  name: string;
  role: PortalRole;
  stationName?: string;
  avatarUrl?: string;
  scope: string;
  exp: number; // epoch seconds
}

export function signSession(user: ResolvedPortalUser): string {
  const payload: SessionPayload = {
    sub: user.authUserId,
    email: user.email,
    name: user.name,
    role: user.role,
    stationName: user.stationName,
    avatarUrl: user.avatarUrl,
    scope: user.scope,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const body = b64url(JSON.stringify(payload));
  const mac = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${mac}`;
}

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, mac] = parts;
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  try {
    const a = Buffer.from(mac);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf-8")) as SessionPayload;
    if (!payload?.sub || !payload?.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function sessionFromPayload(p: SessionPayload): ResolvedPortalUser {
  return {
    authUserId: p.sub,
    email: p.email,
    name: p.name,
    role: p.role,
    stationName: p.stationName,
    avatarUrl: p.avatarUrl,
    scope: (p.scope as any) || "customer",
  };
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;

// ---------------------------------------------------------------------------
// Google OAuth state (signed, server-side stored, single-use)
// ---------------------------------------------------------------------------
export interface OAuthStateRow {
  nonce: string;
  portal: PortalId;
  redirectTo: string;
  /** The redirect_uri sent to Google for THIS flow (origin carried through
   *  the signed state so the callback exchanges against the exact same URI,
   *  even when a gateway rewrites the Host header it sees). */
  redirectUri?: string | null;
  /** For relay flows: the preview origin the browser is actually on. Google
   *  sends the browser to the registered redirect_uri (production); that
   *  deployment relays it back here with the code + state untouched, and
   *  THIS origin's callback finishes the flow and hosts the session. */
  returnOrigin?: string | null;
  /** SHA-256 hex of the pawz_oauth_b cookie issued by the start route
   *  (login-CSRF binding — see OAUTH_BROWSER_COOKIE). */
  browserHash?: string | null;
  expiresAt: string; // ISO
  used: boolean;
}

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function signStateNonce(nonce: string): string {
  const mac = createHmac("sha256", secret()).update(nonce).digest("base64url");
  return `${nonce}.${mac}`;
}

export function verifyStateSignature(state: string | null | undefined): string | null {
  if (!state) return null;
  const parts = state.split(".");
  if (parts.length !== 2) return null;
  const [nonce, mac] = parts;
  const expected = createHmac("sha256", secret()).update(nonce).digest("base64url");
  try {
    const a = Buffer.from(mac);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    return nonce;
  } catch {
    return null;
  }
}

/** Creates a single-use OAuth state row in public.oauth_states (service-role). */
export async function createOAuthState(
  portal: PortalId,
  redirectTo: string,
  redirectUri?: string,
  returnOrigin?: string | null,
  browserHash?: string | null,
): Promise<string | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  // Housekeeping: states are single-use and short-lived; sweep rows that have
  // been dead for over a day so the table never grows unboundedly. Best-effort.
  try {
    await admin.from("oauth_states").delete().lt("expires_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  } catch { /* hygiene is best-effort */ }
  const nonce = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + OAUTH_STATE_TTL_MS).toISOString();
  const { error } = await admin
    .from("oauth_states")
    .insert({ nonce, portal, redirect_to: redirectTo, redirect_uri: redirectUri || null, return_origin: returnOrigin || null, browser_hash: browserHash || null, expires_at: expiresAt, used: false });
  if (error) {
    console.error("[pawz-auth] createOAuthState:", error.message);
    return null;
  }
  return signStateNonce(nonce);
}

/** Maps a raw oauth_states row to the typed shape (no consumption). */
function mapStateRow(row: any): OAuthStateRow | null {
  const portal = row.portal as PortalId;
  if (!PORTALS[portal]) return null;
  return {
    nonce: row.nonce,
    portal,
    redirectTo: row.redirect_to || PORTALS[portal].destination,
    redirectUri: row.redirect_uri || null,
    returnOrigin: row.return_origin || null,
    browserHash: row.browser_hash || null,
    expiresAt: row.expires_at,
    used: Boolean(row.used),
  };
}

const OAUTH_STATE_COLUMNS = "nonce, portal, redirect_to, redirect_uri, return_origin, browser_hash, expires_at, used";

/** Verifies the signed state and reads its row WITHOUT consuming it — used
 *  by the callback to decide whether this flow belongs to another origin
 *  (relay) before anything is marked used. */
export async function peekOAuthState(state: string | null | undefined): Promise<OAuthStateRow | null> {
  const nonce = verifyStateSignature(state);
  if (!nonce) return null;
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data: rows, error } = await admin
    .from("oauth_states")
    .select(OAUTH_STATE_COLUMNS)
    .eq("nonce", nonce)
    .limit(1);
  if (error || !rows || rows.length === 0) return null;
  const row = mapStateRow(rows[0]);
  if (!row) return null;
  if (row.used) return null;
  if (new Date(row.expiresAt).getTime() < Date.now()) return null;
  return row;
}

/** Verifies + consumes a state value. Returns the row, or null on any failure. */
export async function consumeOAuthState(state: string | null | undefined): Promise<OAuthStateRow | null> {
  const nonce = verifyStateSignature(state);
  if (!nonce) return null;
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data: rows, error } = await admin
    .from("oauth_states")
    .select(OAUTH_STATE_COLUMNS)
    .eq("nonce", nonce)
    .limit(1);
  if (error || !rows || rows.length === 0) return null;

  const row = mapStateRow(rows[0]);
  if (!row) return null;
  if (row.used) return null; // replay — reject
  if (new Date(row.expiresAt).getTime() < Date.now()) return null; // expired

  // Mark used immediately (single-use). If the update fails, reject.
  const { error: updateError } = await admin.from("oauth_states").update({ used: true }).eq("nonce", nonce).eq("used", false);
  if (updateError) {
    // Raced with another callback — treat as replay.
    return null;
  }

  return { ...row, used: true };
}

// ---------------------------------------------------------------------------
// Google OAuth helpers
// ---------------------------------------------------------------------------
export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function googleAuthUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "select_account",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export interface GoogleProfile {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  emailVerified?: boolean;
}

export async function exchangeGoogleCode(code: string, redirectUri: string): Promise<{ profile: GoogleProfile | null; error?: string }> {
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const tokenData: any = await tokenRes.json();
    if (!tokenRes.ok) {
      return { profile: null, error: tokenData?.error_description || tokenData?.error || "Google token exchange failed." };
    }
    // The id_token came directly from Google's token endpoint over TLS —
    // decoding the payload (no local signature check needed) is standard.
    const idToken = tokenData.id_token as string | undefined;
    if (!idToken) return { profile: null, error: "Google response did not include an identity token." };
    const payload = JSON.parse(Buffer.from(idToken.split(".")[1], "base64url").toString("utf-8")) as any;
    if (!payload?.sub || !payload?.email) {
      return { profile: null, error: "Google identity token is missing an email." };
    }
    return {
      profile: {
        sub: String(payload.sub),
        email: String(payload.email).toLowerCase(),
        name: payload.name,
        picture: payload.picture,
        emailVerified: payload.email_verified !== false,
      },
    };
  } catch (e: any) {
    return { profile: null, error: e?.message || "Google token exchange failed." };
  }
}

export async function findAuthUserByEmail(admin: SupabaseClient, email: string) {
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const users = data?.users || [];
    const found = users.find((u: any) => (u.email || "").toLowerCase() === email.toLowerCase());
    if (found) return found as any;
    if (users.length < 200 || page > 20) return null;
    page += 1;
  }
}

export function googleIdentityLinked(user: any): boolean {
  const identities = user?.identities || [];
  if (identities.some((i: any) => i.provider === "google")) return true;
  const meta = user?.user_metadata || {};
  return Boolean(meta.google_sub);
}
