'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthPageShell } from '@/components/pawz/auth/AuthPageShell';
import { EmailPasswordForm } from '@/components/pawz/auth/EmailPasswordForm';
import { GoogleButton } from '@/components/pawz/auth/GoogleButton';

// ============================================================================
// /learn/sign-in — the LMS door.
// Self-serve within managed accounts: Google OAuth + email/password.
// Customers land in the customer portal; staff are routed to their portal.
// ============================================================================

function LearnSignInContent() {
  const searchParams = useSearchParams();
  const oauthError = searchParams.get('error');
  const redirect = searchParams.get('redirect') || undefined;

  return (
    <AuthPageShell portal="lms" error={oauthError}>
      <div className="space-y-5">
        <GoogleButton portal="lms" redirect={redirect} />

        <div className="relative flex items-center justify-center">
          <div className="border-t border-border w-full" />
          <span className="bg-card px-3 text-[11px] uppercase tracking-wider text-muted-foreground">
            Or with email
          </span>
          <div className="border-t border-border w-full" />
        </div>

        <EmailPasswordForm portal="lms" redirect={redirect} submitLabel="Continue Learning" />

        <p className="text-center text-[11.5px] text-muted-foreground">
          Learning accounts are available within managed All About Pawz accounts.
        </p>
      </div>
    </AuthPageShell>
  );
}

export default function LearnSignInPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-secondary" />}>
      <LearnSignInContent />
    </Suspense>
  );
}
