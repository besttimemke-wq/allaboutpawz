import { cookies } from "next/headers";
import {
  PortalId,
  ResolvedPortalUser,
  SESSION_COOKIE_NAME,
  sessionFromPayload,
  validatePortalAccess,
  verifySessionToken,
  resolvePortalUser,
  supabaseConfigured,
} from "@/lib/pawz-auth";
import { createServerSupabase } from "@/lib/auth/server";

// ============================================================================
// sessionForPortal — the portal-scoped session resolver (owner's spec §4:
// "customer-only endpoints / groomer-only endpoints / …").
//
// Each portal exposes GET /api/auth/<portal>/session. This helper verifies
// the pawz_session cookie (falling back to the Supabase SSR session for
// site-origin sign-ins), resolves who the user is from the salon records,
// and enforces THAT portal's gate server-side via validatePortalAccess.
// The returned user is either allowed here — or there is no user at all.
// The client never decides who someone is; each door answers for itself.
// ============================================================================

export async function sessionForPortal(
  portal: PortalId,
): Promise<{ user: ReturnType<typeof sessionFromPayload> | null; error?: string }> {
  // 1. Signed portal session cookie
  const cookieStore = await cookies();
  const payload = verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);

  let resolved: ResolvedPortalUser | null = null;

  if (payload) {
    resolved = sessionFromPayload(payload);
  } else if (supabaseConfigured()) {
    // 2. Supabase SSR session fallback (site-origin sign-ins)
    const supabase = await createServerSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user?.id) {
      resolved = await resolvePortalUser(session.user.id);
    }
  }

  if (!resolved) return { user: null };

  // 3. The door decides, server-side — same gate the callback and the login
  //    route use. A user who does not belong to this portal gets no user.
  const validation = validatePortalAccess(portal, resolved);
  if (!validation.ok) return { user: null, error: validation.error };

  return { user: resolved };
}

// ---------------------------------------------------------------------------
// sessionForSiteFlow — door-free session resolution for PUBLIC SITE flows
// (the booking wizard, the shop checkout hand-off). Any authenticated
// identity may resume a public flow — customers, staff, and the owner
// testing their own salon all book through it. Data stays scoped to the
// signed-in email/userId, so this grants no cross-account access; it only
// removes the portal-door bounce that used to lose the user's context
// mid-flow.
// ---------------------------------------------------------------------------
export async function sessionForSiteFlow(): Promise<{
  user: ReturnType<typeof sessionFromPayload> | null;
}> {
  const cookieStore = await cookies();
  const payload = verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);

  if (payload) return { user: sessionFromPayload(payload) };

  if (supabaseConfigured()) {
    const supabase = await createServerSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user?.id) {
      const resolved = await resolvePortalUser(session.user.id);
      if (resolved) return { user: resolved };
    }
  }

  return { user: null };
}
