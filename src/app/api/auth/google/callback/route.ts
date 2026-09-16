import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  PORTALS,
  PortalId,
  ResolvedPortalUser,
  consumeOAuthState,
  exchangeGoogleCode,
  findAuthUserByEmail,
  getSupabaseAdmin,
  GOOGLE_CALLBACK_PATH,
  googleIdentityLinked,
  hashBrowserBinding,
  isPreviewOrigin,
  OAUTH_BROWSER_COOKIE,
  peekOAuthState,
  sessionCookieOptions,
  SESSION_COOKIE_NAME,
  signSession,
  validatePortalAccess,
} from "@/lib/pawz-auth";

// ============================================================================
// GET /api/auth/google/callback
//
// The one and only Google redirect URI, shared by every door. Verifies +
// consumes the single-use server-side state, exchanges the code against the
// EXACT redirect_uri the start route registered in the state (the preview
// gateway rewrites Host headers, so the callback cannot trust its own
// req.nextUrl.origin for the exchange), resolves/links the Supabase user,
// validates the portal, sets the session cookie, and redirects.
//
// RELAY FLOWS (preview origins): the start route routed the authorize request
// through this app's REGISTERED production callback because the preview
// origin's own callback is not registered on the Google client (preview hosts
// change every session). When such a flow lands here, the state row carries
// returnOrigin — the preview origin the browser is actually on. This route
// then RELAYS: it forwards the browser to that origin's callback with the
// code + state + error params untouched (plus final=1, which guarantees the
// next hop completes instead of relaying again, even if its Host header is
// gateway-rewritten). The preview callback consumes the state, exchanges the
// code against the SAME registered redirect URI the authorize request used,
// and hosts the session. Relay targets are restricted to the platform preview
// gateway pattern (isPreviewOrigin) — no arbitrary origins, ever.
//
// Every app-side redirect is a RELATIVE Location header — the browser
// resolves it against the origin it is actually on, so gateway Host
// rewrites can never send anyone to a wrong host. The relay Location is the
// one deliberate absolute redirect, built from the server-stored,
// pattern-checked state row.
//
// Linking logic (identical rules for every door):
//   a. No matching user + customer/lms door → create the user (customer),
//      mark the Google identity linked, log in.
//   b. No matching user + groomer/frontdesk/admin door → REJECT.
//      ("No staff account found for this email. Contact your admin.")
//   c. Matching user, Google identity not linked yet → link it, log in.
//   d. Matching user, already linked → normal login.
// ============================================================================

/** Relative redirect — safe under Host-rewriting gateways. */
function redirectToPath(path: string): NextResponse {
  return new NextResponse(null, { status: 303, headers: { Location: path } });
}

function doorUrl(portal: PortalId, errorMessage: string): string {
  return `${PORTALS[portal].door}?error=${encodeURIComponent(errorMessage)}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const googleError = searchParams.get("error");

  // 0. Relay capability probe — /api/auth/google/start calls this to detect
  //    (live) that the deployment answering on the registered redirect URI
  //    can relay preview flows. No state, no side effects.
  if (searchParams.get("probe") === "relay") {
    return NextResponse.json({ relay: true, path: GOOGLE_CALLBACK_PATH });
  }

  // 1. PEEK before consuming: a relay flow lands on the REGISTERED redirect
  //    URI (production), but its browser belongs to a preview origin recorded
  //    in the signed, server-stored state. Forward the browser there with the
  //    code + state untouched; the preview callback consumes and completes.
  //    final=1 on the forwarded URL guarantees completion (never a loop).
  const peeked = await peekOAuthState(state);
  if (peeked?.returnOrigin && isPreviewOrigin(peeked.returnOrigin) && !searchParams.get("final")) {
    const params = new URLSearchParams();
    if (code) params.set("code", code);
    if (state) params.set("state", state);
    if (googleError) params.set("error", googleError);
    params.set("final", "1");
    return new NextResponse(null, {
      status: 303,
      headers: {
        Location: `${peeked.returnOrigin.replace(/\/$/, "")}${GOOGLE_CALLBACK_PATH}?${params.toString()}`,
      },
    });
  }

  // 2. Consume the single-use state — it tells us the portal, the
  //    destination, and the redirect_uri the flow started with.
  const stateRow = await consumeOAuthState(state);
  if (!stateRow) {
    // No portal context — send to the customer door with a generic error.
    return redirectToPath(doorUrl("customer", "This sign-in link is invalid or has expired. Please try again."));
  }
  const portal = stateRow.portal;

  if (googleError) {
    return redirectToPath(doorUrl(portal, "Google sign-in was cancelled or failed."));
  }
  if (!code) {
    return redirectToPath(doorUrl(portal, "Google sign-in did not return an authorization code."));
  }

  // 2b. Browser binding (login-CSRF guard): the start route set the
  //     pawz_oauth_b cookie in THIS browser and stored its hash in the state
  //     row. No match → this URL was pasted into (or captured by) a different
  //     browser → refuse.
  if (stateRow.browserHash) {
    const cookieValue = (await cookies()).get(OAUTH_BROWSER_COOKIE)?.value;
    const hash = hashBrowserBinding(cookieValue);
    if (!hash || hash !== stateRow.browserHash) {
      return redirectToPath(doorUrl(portal, "Your browser did not keep the sign-in session. Please start again from the sign-in page."));
    }
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return redirectToPath(doorUrl(portal, "Supabase is not configured."));
  }

  // 3. Exchange the code for the Google profile — against the same
  //    redirect_uri the start route sent to Google (carried in the state;
  //    for relay flows this is the registered production callback the
  //    authorize request used, which is exactly what Google requires).
  const redirectUri =
    stateRow.redirectUri ||
    `${(req.nextUrl.origin || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "")}${GOOGLE_CALLBACK_PATH}`;
  const { profile, error: exchangeError } = await exchangeGoogleCode(code, redirectUri);
  if (!profile) {
    return redirectToPath(doorUrl(portal, exchangeError || "Google sign-in failed."));
  }

  // 4. Resolve / link the Supabase user (server-side linking rules).
  let authUser: any = null;
  try {
    authUser = await findAuthUserByEmail(admin, profile.email);
  } catch (e: any) {
    return redirectToPath(doorUrl(portal, "Could not look up accounts. Please try again."));
  }

  if (!authUser) {
    // Case b — staff doors REJECT unknown emails (accounts must be
    // admin-provisioned first).
    if (portal === "groomer") {
      return redirectToPath(doorUrl(portal, "No groomer account found for this email. Contact your admin."));
    }
    if (portal === "frontdesk") {
      return redirectToPath(doorUrl(portal, "No front desk account found for this email. Contact your admin."));
    }
    if (portal === "admin") {
      return redirectToPath(doorUrl(portal, "No admin account found for this email. Contact your admin."));
    }

    // Case a — customer/lms doors create the account.
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: profile.email,
      email_confirm: true,
      user_metadata: {
        full_name: profile.name || profile.email.split("@")[0],
        avatar_url: profile.picture,
        role: "customer",
        google_sub: profile.sub,
        google_linked: true,
      },
    });
    if (createError || !created?.user) {
      return redirectToPath(doorUrl(portal, createError?.message || "Could not create your account."));
    }
    // Provision the customer records so the customer scope resolves.
    const nameParts = (profile.name || profile.email.split("@")[0]).split(" ");
    try {
      const { data: existingCustomer } = await admin
        .from("customers")
        .select("id")
        .eq("email", profile.email)
        .limit(1);
      if (!existingCustomer || existingCustomer.length === 0) {
        await admin.from("customers").insert({
          firstName: nameParts[0] || "",
          lastName: nameParts.slice(1).join(" ") || "",
          email: profile.email,
          customerStatus: "ACTIVE",
          userId: created.user.id,
        });
      } else {
        await admin.from("customers").update({ userId: created.user.id }).eq("id", (existingCustomer[0] as any).id);
      }
    } catch (e: any) {
      // Customer row provisioning is best-effort; the auth user exists.
      console.warn("[google/callback] customer provisioning:", e?.message);
    }
    authUser = created.user;
  } else if (!googleIdentityLinked(authUser)) {
    // Case c — link the Google identity to the existing account. The GoTrue
    // admin API has no linkIdentity (that is a user-session method), so the
    // link is recorded in user_metadata (google_sub) — authoritative for
    // this raw-Google flow.
    const meta = { ...(authUser.user_metadata || {}) };
    meta.google_sub = profile.sub;
    meta.google_email = profile.email;
    meta.google_linked = true;
    if (profile.picture && !meta.avatar_url) meta.avatar_url = profile.picture;
    const { data: updated } = await admin.auth.admin.updateUserById(authUser.id, { user_metadata: meta });
    authUser = updated?.user || authUser;
  }
  // Case d — already linked: fall through to login.

  // 5. Resolve + validate the portal (role confusion is impossible: the
  //    portal came from the server-stored state, the role from Supabase).
  const resolved: ResolvedPortalUser | null = await resolvePortalUser(authUser.id).catch(() => null);
  if (!resolved) {
    return redirectToPath(doorUrl(portal, "Your account has no profile records. Contact your admin."));
  }
  const validation = validatePortalAccess(portal, resolved);
  if (!validation.ok) {
    return redirectToPath(doorUrl(portal, validation.error || "This account cannot use this sign-in page."));
  }

  // 6. Set the session cookie and redirect (relative) to the state-specified
  //    destination — the browser stays on the origin it is on.
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, signSession(resolved), sessionCookieOptions());

  return redirectToPath(stateRow.redirectTo);
}
