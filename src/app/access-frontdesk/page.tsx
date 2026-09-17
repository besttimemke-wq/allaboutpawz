import { AuthShell, DoorHint } from '@/components/pawz/auth/AuthShell';
import { EmailPasswordForm } from '@/components/pawz/auth/EmailPasswordForm';

// ============================================================================
// /access-frontdesk — THE FRONT DESK DOOR. Its own identity: FRONT DESK.
//
// EMAIL/PASSWORD ONLY (owner's spec §6): front desk accounts are
// admin-provisioned and the flow ends at the temporary-password sign-in —
// no Google option is offered on this door, and Google flows claiming this
// portal are refused server-side (PORTALS.frontdesk.google = false).
// ============================================================================

export const metadata = { title: 'Front Desk — All About Pawz' };

export default async function AccessFrontDeskPage({
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
        ? `No front desk account found for ${email}. Front desk accounts are created by an administrator — please contact your admin to be provisioned.`
        : 'No front desk account found. Front desk accounts are created by an administrator.'
      : undefined;

  return (
    <AuthShell
      badge="Salon Team"
      title="Front Desk"
      subtitle="Intake, scheduling & concierge. Sign in with your provisioned work account."
    >
      <DoorHint>
        Front desk staff sign in with their provisioned email and password.
        <br />
        Google sign-in is not offered on this desk.
      </DoorHint>
      <EmailPasswordForm
        portal="frontdesk"
        submitLabel="SIGN IN"
        redirectTo={redirect}
        initialError={initialError}
        emailLabel="Staff Email"
        placeholder="you@allaboutpawz.com"
      />
    </AuthShell>
  );
}
