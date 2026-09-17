import { AuthShell, DoorDivider, DoorHint } from '@/components/pawz/auth/AuthShell';
import { GoogleButton } from '@/components/pawz/auth/GoogleButton';
import { EmailPasswordForm } from '@/components/pawz/auth/EmailPasswordForm';

// ============================================================================
// /access-groomer — THE GROOMER DOOR. Its own identity: GROOMER PORTAL.
// Groomer accounts exist ONLY by admin provision. Google sign-in links to
// the existing invited account by exact email; unknown emails are rejected
// ("No groomer account found — contact your admin").
// ============================================================================

export const metadata = { title: 'Groomer Portal — All About Pawz' };

export default async function AccessGroomerPage({
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
        ? `No groomer account found for ${email}. Groomer accounts are created by an administrator — please contact your admin to be provisioned.`
        : 'No groomer account found. Groomer accounts are created by an administrator.'
      : undefined;

  return (
    <AuthShell
      badge="Salon Team"
      title="Groomer Portal"
      subtitle="Station access — assigned appointments, shifts & style records."
    >
      {initialError ? null : <GoogleButton portal="groomer" />}
      <DoorHint>
        Groomer accounts are provisioned by an administrator.
        <br />
        Google sign-in links to your existing invited account.
      </DoorHint>
      <DoorDivider />
      <EmailPasswordForm
        portal="groomer"
        submitLabel="SIGN IN"
        redirectTo={redirect}
        initialError={initialError}
        emailLabel="Staff Email"
        placeholder="you@allaboutpawz.com"
      />
    </AuthShell>
  );
}
