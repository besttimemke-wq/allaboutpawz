'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthPageShell } from '@/components/pawz/auth/AuthPageShell';
import { EmailPasswordForm } from '@/components/pawz/auth/EmailPasswordForm';
import { GoogleButton } from '@/components/pawz/auth/GoogleButton';

// ============================================================================
// /access-groomer — the Groomer door.
// Google OAuth + email/password. Groomer accounts are admin-provisioned;
// an unknown email is rejected server-side (never silently created).
// ============================================================================

function AccessGroomerContent() {
  const searchParams = useSearchParams();
  const oauthError = searchParams.get('error');
  const redirect = searchParams.get('redirect') || undefined;

  return (
    <AuthPageShell portal="groomer" error={oauthError}>
      <div className="space-y-5">
        <GoogleButton portal="groomer" redirect={redirect} />

        <div className="relative flex items-center justify-center">
          <div className="border-t border-border w-full" />
          <span className="bg-card px-3 text-[11px] uppercase tracking-wider text-muted-foreground">
            Or with email
          </span>
          <div className="border-t border-border w-full" />
        </div>

        <EmailPasswordForm portal="groomer" redirect={redirect} submitLabel="Enter Station" />

        <p className="text-center text-[11.5px] text-muted-foreground">
          Station accounts are provisioned by your admin. Set your password from the invite email first.
        </p>
      </div>
    </AuthPageShell>
  );
}

export default function AccessGroomerPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-secondary" />}>
      <AccessGroomerContent />
    </Suspense>
  );
}
