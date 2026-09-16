import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/pawz-auth";
import { createServerSupabase } from "@/lib/auth/server";

// ============================================================================
// POST /api/auth/logout
// Clears the portal session cookie and signs out of Supabase (server-side).
// Called by the portal sign-out buttons before routing back to the door.
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });

    // Sign out of Supabase as well (clears the SSR session cookies).
    try {
      const supabase = await createServerSupabase();
      await supabase.auth.signOut();
    } catch {
      // Supabase unavailability should not block local sign-out.
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[POST /api/auth/logout]", err);
    return NextResponse.json({ error: err?.message || "Sign-out failed." }, { status: 500 });
  }
}
