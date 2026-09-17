import { AuthDoor } from '@/components/pawz/AuthDoor';

// ============================================================================
// /admin-login — the Admin door, rendering the owner's imported Serviceportals
// auth page (staff mode). One Google button; the database decides the portal.
// ============================================================================

export default function AdminLoginPage() {
  return <AuthDoor defaultMode="staff" />;
}
