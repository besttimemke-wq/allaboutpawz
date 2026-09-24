import { GET } from "../route";

// ============================================================================
// GET /api/auth/google/start
//
// The owner's spec §4 name for the OAuth initiator. This is the SAME handler
// as GET /api/auth/google (aliased, not duplicated): it builds the Google
// auth URL, stores the single-use server-side state, and redirects. One
// client, one callback, five doors — the portal rides the signed state.
// ============================================================================

export const dynamic = "force-dynamic";
export { GET };
