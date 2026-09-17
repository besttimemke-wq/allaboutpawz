import { AuthDoor } from '@/components/pawz/AuthDoor';

// ============================================================================
// /access-frontdesk — the Front Desk door, rendering the owner's imported
// Serviceportals auth page (staff mode). One Google button; the database
// decides the portal.
// ============================================================================

export default function AccessFrontDeskPage() {
  return <AuthDoor defaultMode="staff" />;
}
