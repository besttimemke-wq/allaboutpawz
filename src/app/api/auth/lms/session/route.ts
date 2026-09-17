import { NextResponse } from "next/server";
import { sessionForPortal } from "@/lib/portal-session-scope";

// ============================================================================
// GET /api/auth/lms/session — LMS / Learning Center-scoped session endpoint
// (owner's spec §4 backend structure). Returns the signed-in user ONLY when
// they belong to the lms portal (validatePortalAccess, server-side);
// otherwise { user: null }. Never cached — the answer is a function of the
// request cookie.
// ============================================================================

export async function GET() {
  const { user, error } = await sessionForPortal("lms");
  const res = NextResponse.json({ user, error: user ? undefined : error || "not_signed_in" }, {
    status: user ? 200 : 401,
  });
  res.headers.set("Cache-Control", "no-store, max-age=0");
  return res;
}
