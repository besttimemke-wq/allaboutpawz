import { AuthShell, DoorDivider, DoorHint } from '@/components/pawz/auth/AuthShell';
import { GoogleButton } from '@/components/pawz/auth/GoogleButton';
import { EmailPasswordForm } from '@/components/pawz/auth/EmailPasswordForm';

// ============================================================================
// /learn/sign-in — THE LMS DOOR. Its own identity: LEARNING CENTER.
// Self-serve within managed accounts: customers AND staff sign in here and
// land on the Learning Center (/learn/dashboard).
// ============================================================================

export const metadata = { title: 'Learning Center — All About Pawz' };

export default async function LearnSignInPage({
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
        ? `No account found for ${email}. The Learning Center is available to existing salon accounts — book or purchase with the salon first, then sign in here.`
        : 'No account found. The Learning Center is available to existing salon accounts.'
      : undefined;

  return (
    <AuthShell
      badge="Aapawz Academy"
      title="Learning Center"
      subtitle="Training, courses & certifications for the salon team and clients."
    >
      {initialError ? null : <GoogleButton portal="lms" />}
      <DoorHint>
        Open to every salon account — customers and staff.
        <br />
        Your learning record follows your All About Pawz login.
      </DoorHint>
      <DoorDivider />
      <EmailPasswordForm
        portal="lms"
        submitLabel="LOG IN"
        redirectTo={redirect}
        initialError={initialError}
      />
    </AuthShell>
  );
}
