import { AuthShell, DoorDivider, DoorHint } from '@/components/pawz/auth/AuthShell';
import { GoogleButton } from '@/components/pawz/auth/GoogleButton';
import { EmailPasswordForm } from '@/components/pawz/auth/EmailPasswordForm';

// ============================================================================
// /admin-login — THE ADMIN DOOR. Its own identity: ADMIN OS.
// Internal, admin-provisioned access. Unknown emails are rejected by the
// salon gate; the owner bootstraps via ADMIN_EMAILS.
// ============================================================================

export const metadata = { title: 'Admin OS — All About Pawz' };

export default async function AdminLoginPage({
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
        ? `${email} is not an administrator. Admin access is restricted to provisioned personnel — contact the salon owner.`
        : 'Not an administrator. Admin access is restricted to provisioned personnel.'
      : undefined;

  return (
    <AuthShell
      badge="Internal — Restricted"
      title="Admin OS"
      subtitle="Management access for provisioned administrators."
    >
      {initialError ? null : <GoogleButton portal="admin" />}
      <DoorHint>
        Admin accounts are provisioned internally.
        <br />
        Sign-in resolves your role from the salon record — never from this page.
      </DoorHint>
      <DoorDivider />
      <EmailPasswordForm
        portal="admin"
        submitLabel="SIGN IN"
        redirectTo={redirect}
        initialError={initialError}
        emailLabel="Admin Email"
        placeholder="you@allaboutpawz.com"
      />
    </AuthShell>
  );
}
