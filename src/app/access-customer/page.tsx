import { AuthShell, DoorDivider, DoorHint } from '@/components/pawz/auth/AuthShell';
import { GoogleButton } from '@/components/pawz/auth/GoogleButton';
import { EmailPasswordForm } from '@/components/pawz/auth/EmailPasswordForm';
import { ShopEmailSignup } from '@/components/pawz/auth/ShopEmailSignup';

// ============================================================================
// /access-customer — THE CUSTOMER DOOR. Its own identity: CUSTOMER PORTAL.
// Clients are created at checkout, booking, or walk-in — there is no public
// registration desk. Registration is FLOW-SCOPED: Google signs up new
// clients automatically, and the email path creates the client record the
// moment they start checking out (shop-signup → one-tap magic link back to
// the bag) — the same mechanic the booking flow has always had.
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
      {initialError ? null : <GoogleButton portal="customer" next={redirect} />}
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
      <div className="pt-6">
        <ShopEmailSignup redirect={redirect} />
      </div>
    </AuthShell>
  );
}
