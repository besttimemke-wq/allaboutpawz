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
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    // 1. Signed portal session cookie
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const payload = verifySessionToken(token);
    if (payload) {
      const user = sessionFromPayload(payload);
      return NextResponse.json({
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
          return NextResponse.json({
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

    return NextResponse.json({ user: null });
  } catch (err: any) {
    console.error("[GET /api/auth/portal-session]", err);
    return NextResponse.json({ user: null });
  }
}
