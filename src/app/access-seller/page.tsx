import { AuthShell, DoorHint } from '@/components/pawz/auth/AuthShell';
import { EmailPasswordForm } from '@/components/pawz/auth/EmailPasswordForm';

// ============================================================================
// /access-seller — THE SELLER DOOR. Its own identity: SELLER.
//
// EMAIL/PASSWORD ONLY (owner's spec §6): seller accounts are
// admin-provisioned and the flow ends at the temporary-password sign-in —
// no Google option is offered on this door, and Google flows claiming this
// portal are refused server-side (PORTALS.seller.google = false).
// ============================================================================

export const metadata = { title: 'Seller — All About Pawz' };

export default async function AccessSellerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const err = typeof params.error === 'string' ? params.error : undefined;
  const email = typeof params.email === 'string' ? params.email : undefined;
  const redirect = typeof params.redirect === 'string' ? params.redirect : undefined;

  const initialError =
    err === 'not_authorized'
      ? email
        ? `No seller account found for ${email}. Seller accounts are created by an administrator — please contact your admin to be provisioned.`
        : 'No seller account found. Seller accounts are created by an administrator.'
      : undefined;

  return (
    <AuthShell
      badge="Salon Team"
      title="Seller"
      subtitle="Intake, scheduling & concierge. Sign in with your provisioned work account."
    >
      <DoorHint>
        Seller staff sign in with their provisioned email and password.
        <br />
        Google sign-in is not offered on this desk.
      </DoorHint>
      <EmailPasswordForm
        portal="seller"
        submitLabel="SIGN IN"
        redirectTo={redirect}
        initialError={initialError}
        emailLabel="Staff Email"
        placeholder="you@allaboutpawz.com"
      />
    </AuthShell>
  );
}
