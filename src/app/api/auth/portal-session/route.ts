import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ResolvedPortalUser,
  SESSION_COOKIE_NAME,
  sessionFromPayload,
  verifySessionToken,
  resolvePortalUser,
  supabaseConfigured,
} from "@/lib/pawz-auth";
import { createServerSupabase } from "@/lib/auth/server";

// ============================================================================
// GET /api/auth/portal-session
// Returns the signed-in portal user for store rehydration (the Zustand store
// is a cache; this cookie-backed endpoint is the source of truth). Prefers
// the pawz_session cookie; falls back to the Supabase SSR session so users
// who signed in through the site's own flows still resolve.
//
// NEVER cached: the answer is a function of the request's cookie, so it is
// served with Cache-Control: no-store. (A heuristically-cached logged-out
// answer previously survived sign-in in the browser HTTP cache and bounced
// the user back to the door — this header is what kills that.)
// ============================================================================

function sessionJson(body: Record<string, unknown>): NextResponse {
  const res = NextResponse.json(body);
  res.headers.set("Cache-Control", "no-store, max-age=0");
  return res;
}

export async function GET(req: NextRequest) {
  try {
    // 1. Signed portal session cookie
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const payload = verifySessionToken(token);
    if (payload) {
      const user = sessionFromPayload(payload);
      return sessionJson({
        user: {
          id: user.authUserId,
          name: user.name,
          email: user.email,
          role: user.role,
          stationName: user.stationName,
          avatarUrl: user.avatarUrl,
        },
      });
    }

    // 2. Supabase SSR session fallback
    if (supabaseConfigured()) {
      const supabase = await createServerSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const resolved: ResolvedPortalUser | null = await resolvePortalUser(session.user.id);
        if (resolved) {
          return sessionJson({
            user: {
              id: resolved.authUserId,
              name: resolved.name,
              email: resolved.email,
              role: resolved.role,
              stationName: resolved.stationName,
              avatarUrl: resolved.avatarUrl,
            },
          });
        }
      }
    }

    return sessionJson({ user: null });
  } catch (err: any) {
    console.error("[GET /api/auth/portal-session]", err);
    return sessionJson({ user: null });
  }
}
