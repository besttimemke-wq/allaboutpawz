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
// The one and only Google redirect URI, shared by every portal that supports
// Google. Verifies + consumes the single-use server-side state, exchanges
// the code, resolves/links the Supabase user, validates the portal, sets the
// session cookie, and redirects to the destination the state specified.
//
// Linking logic (identical rules for every portal):
//   a. No matching user + customer/lms portal → create the user (customer),
//      mark the Google identity linked, log in.
//   b. No matching user + groomer/frontdesk/admin portal → REJECT.
//      ("No staff account found for this email. Contact your admin.")
//   c. Matching user, Google identity not linked yet → link it, log in.
//   d. Matching user, already linked → normal login.
// ============================================================================

// The origin that actually served the callback (dev or prod) — preferred
// over NEXT_PUBLIC_SITE_URL so dev testing never bounces to production.
function originFor(req: NextRequest): string {
  return (req.nextUrl.origin || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

function doorUrl(portal: PortalId, errorMessage: string, origin: string): string {
  const url = new URL(PORTALS[portal].door, origin);
  url.searchParams.set("error", errorMessage);
  return url.toString();
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const googleError = searchParams.get("error");

  // 1. Consume the single-use state FIRST — it tells us the portal and the
  //    destination. Invalid / replayed / expired states never proceed.
  const stateRow = await consumeOAuthState(state);
  if (!stateRow) {
    // No portal context — send to the customer door with a generic error.
    const url = new URL(PORTALS.customer.door, originFor(req));
    url.searchParams.set("error", "This sign-in link is invalid or has expired. Please try again.");
    return NextResponse.redirect(url.toString());
  }
  const portal = stateRow.portal;

  if (googleError) {
    return NextResponse.redirect(doorUrl(portal, "Google sign-in was cancelled or failed.", originFor(req)));
  }
  if (!code) {
    return NextResponse.redirect(doorUrl(portal, "Google sign-in did not return an authorization code.", originFor(req)));
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.redirect(doorUrl(portal, "Supabase is not configured.", originFor(req)));
  }

  // 2. Exchange the code for the Google profile.
  const redirectUri = `${originFor(req)}/api/auth/google/callback`;
  const { profile, error: exchangeError } = await exchangeGoogleCode(code, redirectUri);
  if (!profile) {
    return NextResponse.redirect(doorUrl(portal, exchangeError || "Google sign-in failed.", originFor(req)));
  }

  // 3. Resolve / link the Supabase user (server-side linking rules).
  let authUser: any = null;
  try {
    authUser = await findAuthUserByEmail(admin, profile.email);
  } catch (e: any) {
    return NextResponse.redirect(doorUrl(portal, "Could not look up accounts. Please try again.", originFor(req)));
  }

  if (!authUser) {
    // Case b — staff portals REJECT unknown emails (accounts must be
    // admin-provisioned first).
    if (portal === "groomer") {
      return NextResponse.redirect(doorUrl(portal, "No groomer account found for this email. Contact your admin.", originFor(req)));
    }
    // (frontdesk/admin never reach Google — enforced in /start.)

    // Case a — customer/lms portals create the account.
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
      return NextResponse.redirect(doorUrl(portal, createError?.message || "Could not create your account.", originFor(req)));
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
    return NextResponse.redirect(doorUrl(portal, "Your account has no profile records. Contact your admin.", originFor(req)));
  }
  const validation = validatePortalAccess(portal, resolved);
  if (!validation.ok) {
    return NextResponse.redirect(doorUrl(portal, validation.error || "This account cannot use this sign-in page.", originFor(req)));
  }

  // 5. Set the session cookie and redirect to the state-specified destination.
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, signSession(resolved), sessionCookieOptions());

  return NextResponse.redirect(new URL(stateRow.redirectTo, originFor(req)).toString());
}
