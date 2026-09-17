import { AuthDoor } from '@/components/pawz/AuthDoor';

// ============================================================================
// /learn/sign-in — the LMS door, rendering the owner's imported Serviceportals
// auth page (member mode). One Google button; the database decides the portal.
// ============================================================================

export default function LearnSignInPage() {
  return <AuthDoor defaultMode="member" />;
}
