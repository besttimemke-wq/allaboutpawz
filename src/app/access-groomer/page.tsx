import { AuthDoor } from '@/components/pawz/AuthDoor';

// ============================================================================
// /access-groomer — the Groomer door, rendering the owner's imported
// Serviceportals auth page (staff mode). One Google button; the database
// decides the portal.
// ============================================================================

export default function AccessGroomerPage() {
  return <AuthDoor defaultMode="staff" />;
}
