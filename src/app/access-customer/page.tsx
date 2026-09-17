import { AuthDoor } from '@/components/pawz/AuthDoor';

// ============================================================================
// /access-customer — the Customer door, rendering the owner's imported
// Serviceportals auth page (member mode). One Google button; the database
// decides the portal.
// ============================================================================

export default function AccessCustomerPage() {
  return <AuthDoor defaultMode="member" />;
}
