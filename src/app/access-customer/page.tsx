import { AuthShell, DoorDivider, DoorHint } from '@/components/pawz/auth/AuthShell';
import { GoogleButton } from '@/components/pawz/auth/GoogleButton';
import { EmailPasswordForm } from '@/components/pawz/auth/EmailPasswordForm';

// ============================================================================
// /access-customer — THE CUSTOMER DOOR. Its own identity: CUSTOMER PORTAL.
// Clients are created at checkout, booking, or walk-in — there is no public
// registration. Google sign-in links to the existing customer record by
// exact email; unknown emails are rejected by the salon gate.
// ============================================================================

export const metadata = { title: 'Customer Portal — All About Pawz' };

export default async function AccessCustomerPage({
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
        ? `${email} is not registered as a client. Customer accounts are created at checkout, booking, or walk-in — please contact the salon to be set up.`
        : 'Not registered as a client. Customer accounts are created at checkout, booking, or walk-in.'
      : undefined;

  return (
    <AuthShell
      title="Customer Portal"
      subtitle="Sign in to manage your pets, appointments, orders & billing."
    >
      {initialError ? null : <GoogleButton portal="customer" />}
      <DoorHint>
        Sign in with Google — your portal is determined by your salon record.
        <br />
        <span className="font-medium">No public registration</span> — clients are created at checkout, booking, or walk-in.
      </DoorHint>
      <DoorDivider />
      <EmailPasswordForm
        portal="customer"
        submitLabel="LOG IN"
        redirectTo={redirect}
        initialError={initialError}
      />
    </AuthShell>
  );
}
