import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  PORTALS,
  PortalId,
  ResolvedPortalUser,
  autoDestination,
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
  requestHost,
  resolvePortalUser,
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
// EXACT registered redirect_uri the initiator recorded in the state (the
// preview gateway rewrites Host headers, so this route cannot trust its own
// req.nextUrl.origin for the exchange), resolves/links the user, sets the
// session cookie, and redirects.
//
// RELAY FLOWS (preview origins): the initiator routed the authorize request
// through this app's REGISTERED production callback because the preview
// origin's own callback is not registered on the Google client (preview hosts
// change every session). When such a flow lands on the deployment answering
// the registered callback, the state row carries returnOrigin — the preview
// origin the browser is actually on. That deployment then RELAYS: it forwards
// the browser to that origin's callback with the code + state + error params
// untouched (plus final=1, which guarantees the next hop completes instead of
// relaying again, even if its Host header is gateway-rewritten). The preview
// callback consumes the state, exchanges the code against the SAME registered
// redirect URI the authorize request used, and hosts the session. Relay
// targets are restricted to the platform preview gateway pattern
// (isPreviewOrigin) — no arbitrary origins, ever.
//
// The client NEVER decides its own role: the database does (his salon gate —
// staff/tenant/customer records resolve the role; unknown emails are rejected,
// no public self-registration; clients are created at checkout, booking, or
// walk-in; staff are admin-provisioned; ADMIN_EMAILS bootstrap the owner).
//
// This route NEVER renders a message. Bounces carry at most a short code:
//   not_authorized (+email) — the salon gate; the sign-in page shows the
//   owner's own gate text for it. Every other path returns the browser to the
//   sign-in page, clean.
//
// Every app-side redirect is a RELATIVE Location header — the browser
// resolves it against the origin it is actually on, so gateway Host rewrites
// can never send anyone to a wrong host. The relay Location is the one
// deliberate absolute redirect, built from the server-stored,
// pattern-checked state row.
// ============================================================================

/** Relative redirect — safe under Host-rewriting gateways. */
function redirectToPath(path: string): NextResponse {
  return new NextResponse(null, { status: 303, headers: { Location: path } });
}

/** Clean bounce: back to the sign-in door, no message. */
function door(portal: PortalId): NextResponse {
  return redirectToPath(PORTALS[portal].door);
}

/** The salon gate: his design's only visible outcome — the door shows his
 *  own gate text for this code. */
function gate(portal: PortalId, email: string): NextResponse {
  return redirectToPath(
    `${PORTALS[portal].door}?error=not_authorized&email=${encodeURIComponent(email)}`,
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const googleError = searchParams.get("error");

  // 0. Relay capability probe — other deployments of this app call this to
  //    detect (live) that the deployment answering on the registered redirect
  //    URI can relay preview flows. No state, no side effects.
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
    console.warn("[auth/google/callback] bounce: state invalid/expired/replayed");
    return door("customer");
  }
  const portal = stateRow.portal;
  // AUTO = the ORIGINAL repo's flow (/api/auth/google): "DB is source of
  // truth" — no door validation, destination by resolved role, unknown
  // emails rejected (the salon gate).
  const autoFlow = stateRow.redirectTo === "AUTO";

  if (googleError || !code) {
    console.warn(`[auth/google/callback] bounce: googleError=${googleError || "none"} code=${code ? "present" : "absent"} portal=${portal}`);
    // User backed out at Google, or Google returned nothing — back to the
    // sign-in page, clean.
    return door(portal);
  }

  // 2b. Browser binding (login-CSRF guard): the initiator set the
  //     pawz_oauth_b cookie in THIS browser and stored its hash in the state
  //     row. No match → this URL was pasted into (or captured by) a different
  //     browser → refuse, silently.
  if (stateRow.browserHash) {
    const cookieValue = (await cookies()).get(OAUTH_BROWSER_COOKIE)?.value;
    const hash = hashBrowserBinding(cookieValue);
    if (!hash || hash !== stateRow.browserHash) {
      console.warn(`[auth/google/callback] bounce: browser-binding mismatch (login-CSRF guard) portal=${portal}`);
      return door(portal);
    }
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    console.warn("[auth/google/callback] bounce: Supabase admin client unavailable (SUPABASE_URL/SERVICE_KEY missing)");
    return door(portal);
  }

  // 3. Exchange the code for the Google profile — against the same
  //    redirect_uri the initiator sent to Google (carried in the state; for
  //    relay flows this is the registered production callback the authorize
  //    request used, which is exactly what Google requires).
  const redirectUri =
    stateRow.redirectUri ||
    `${(req.nextUrl.origin || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "")}${GOOGLE_CALLBACK_PATH}`;
  const { profile, error: exchangeError } = await exchangeGoogleCode(code, redirectUri);
  if (!profile) {
    console.warn(`[auth/google/callback] bounce: Google code exchange failed portal=${portal} — ${exchangeError || "unknown"}`);
    return door(portal);
  }

  // 4. Resolve / link the user (server-side linking rules).
  let authUser: any = null;
  try {
    authUser = await findAuthUserByEmail(admin, profile.email);
  } catch (e: any) {
    console.warn(`[auth/google/callback] bounce: findAuthUserByEmail threw portal=${portal} email=${profile.email} — ${e?.message || e}`);
    return door(portal);
  }

  if (!authUser) {
    if (autoFlow) {
      // AUTO flow: resolve role from DB. For admin/groomer/frontdesk doors,
      // the salon gate rejects unknown emails (staff must be admin-provisioned).
      // For customer/lms doors, auto-provision the account (the user is
      // signing in for the first time — e.g. at checkout, booking, or
      // enrollment — and we want them to land in their portal, not bounce).
      const declaredAdmin = (process.env.ADMIN_EMAILS || "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
        .includes(profile.email);

      if (declaredAdmin) {
        // Bootstrap the owner's account.
        const { data: created } = await admin.auth.admin.createUser({
          email: profile.email,
          email_confirm: true,
          user_metadata: {
            full_name: profile.name || profile.email.split("@")[0],
            avatar_url: profile.picture,
            role: "admin",
            google_sub: profile.sub,
            google_linked: true,
          },
        });
        if (!created?.user) {
          console.warn(`[auth/google/callback] bounce: ADMIN_EMAILS bootstrap createUser failed for ${profile.email}`);
          return door(portal);
        }
        authUser = created.user;
      } else if (portal === "customer" || portal === "lms") {
        // Auto-provision customers + learners (they're signing in for the
        // first time via Google — not pre-provisioned by an admin).
        const { data: created } = await admin.auth.admin.createUser({
          email: profile.email,
          email_confirm: true,
          user_metadata: {
            full_name: profile.name || profile.email.split("@")[0],
            avatar_url: profile.picture,
            role: portal === "lms" ? "learner" : "customer",
            google_sub: profile.sub,
            google_linked: true,
          },
        });
        if (!created?.user) {
          console.warn(`[auth/google/callback] bounce: ${portal}-door createUser failed for ${profile.email}`);
          return door(portal);
        }
        // Provision the customer record so resolvePortalUser finds them.
        if (portal === "customer") {
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
          } catch {
            // Customer row provisioning is best-effort; the auth user exists.
          }
        }
        // For LMS learners, assign the learner role so resolvePortalUser finds them.
        if (portal === "lms") {
          try {
            await admin.rpc("assign_lms_role", {
              p_tenant_id: process.env.SUPABASE_TENANT_ID || "00000000-0000-0000-0000-000000000001",
              p_user_id: created.user.id,
              p_role: "learner",
            });
          } catch {
            // Role assignment is best-effort.
          }
        }
        authUser = created.user;
      } else {
        // admin/groomer/frontdesk doors — salon gate rejects unknown emails.
        console.warn(`[auth/google/callback] bounce: salon gate — email not in ADMIN_EMAILS and not in auth.users: ${profile.email} (portal=${portal})`);
        return gate(portal, profile.email);
      }
    } else if (portal === "groomer" || portal === "frontdesk" || portal === "admin") {
      console.warn(`[auth/google/callback] bounce: staff door rejected unknown email ${profile.email} (portal=${portal})`);
      // Staff doors REJECT unknown emails (accounts must be
      // admin-provisioned first) — the same salon gate.
      return gate(portal, profile.email);
    } else {
      // Customer/lms doors create the account.
      const { data: created } = await admin.auth.admin.createUser({
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
      if (!created?.user) {
        console.warn(`[auth/google/callback] bounce: customer-door createUser failed for ${profile.email}`);
        return door(portal);
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
      } catch {
        // Customer row provisioning is best-effort; the auth user exists.
      }
      authUser = created.user;
    }
  } else if (!googleIdentityLinked(authUser)) {
    // Link the Google identity to the existing account. The GoTrue admin API
    // has no linkIdentity (that is a user-session method), so the link is
    // recorded in user_metadata (google_sub) — authoritative for this
    // raw-Google flow.
    const meta = { ...(authUser.user_metadata || {}) };
    meta.google_sub = profile.sub;
    meta.google_email = profile.email;
    meta.google_linked = true;
    if (profile.picture && !meta.avatar_url) meta.avatar_url = profile.picture;
    const { data: updated } = await admin.auth.admin.updateUserById(authUser.id, { user_metadata: meta });
    authUser = updated?.user || authUser;
  }

  // 5. Resolve who this is (server-side only — never trusted from client).
  const resolved: ResolvedPortalUser | null = await resolvePortalUser(authUser.id).catch((e) => {
    console.warn(`[auth/google/callback] resolvePortalUser threw for ${authUser.id} — ${e?.message || e}`);
    return null;
  });
  if (!resolved) {
    console.warn(`[auth/google/callback] bounce: resolvePortalUser returned null for authUserId=${authUser.id} email=${profile.email}`);
    return door(portal);
  }

  // 6. Set the session cookie and redirect (relative) so the browser stays on
  //    the origin it is on. The cookie carries Domain=.aapawz.com on the
  //    salon's own hosts so the session is visible on BOTH apex and www —
  //    the callback itself may be serving on www after the platform's
  //    apex→www 308 (see cookieDomainForHost in pawz-auth).
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, signSession(resolved), sessionCookieOptions(requestHost(req)));

  if (autoFlow) {
    return redirectToPath(autoDestination(resolved));
  }

  const validation = validatePortalAccess(portal, resolved);
  if (!validation.ok) {
    console.warn(`[auth/google/callback] bounce: validatePortalAccess denied portal=${portal} role=${resolved.role} scope=${resolved.scope} — ${validation.error}`);
    return door(portal);
  }

  console.info(`[auth/google/callback] OK: ${profile.email} → ${stateRow.redirectTo} (role=${resolved.role} scope=${resolved.scope})`);
  return redirectToPath(stateRow.redirectTo);
}
