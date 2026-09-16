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
  googleIdentityLinked,
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
// Every app-side redirect is a RELATIVE Location header — the browser
// resolves it against the origin it is actually on, so gateway Host
// rewrites can never send anyone to a wrong host.
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

  // 1. Consume the single-use state FIRST — it tells us the portal, the
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

  const admin = getSupabaseAdmin();
  if (!admin) {
    return redirectToPath(doorUrl(portal, "Supabase is not configured."));
  }

  // 2. Exchange the code for the Google profile — against the same
  //    redirect_uri the start route sent to Google (carried in the state).
  const redirectUri =
    stateRow.redirectUri ||
    `${(req.nextUrl.origin || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "")}/api/auth/google/callback`;
  const { profile, error: exchangeError } = await exchangeGoogleCode(code, redirectUri);
  if (!profile) {
    return redirectToPath(doorUrl(portal, exchangeError || "Google sign-in failed."));
  }

  // 3. Resolve / link the Supabase user (server-side linking rules).
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

  // 4. Resolve + validate the portal (role confusion is impossible: the
  //    portal came from the server-stored state, the role from Supabase).
  const resolved: ResolvedPortalUser | null = await resolvePortalUser(authUser.id).catch(() => null);
  if (!resolved) {
    return redirectToPath(doorUrl(portal, "Your account has no profile records. Contact your admin."));
  }
  const validation = validatePortalAccess(portal, resolved);
  if (!validation.ok) {
    return redirectToPath(doorUrl(portal, validation.error || "This account cannot use this sign-in page."));
  }

  // 5. Set the session cookie and redirect (relative) to the state-specified
  //    destination — the browser stays on the origin it is on.
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, signSession(resolved), sessionCookieOptions());

  return redirectToPath(stateRow.redirectTo);
}
