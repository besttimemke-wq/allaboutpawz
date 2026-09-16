'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthPageShell } from '@/components/pawz/auth/AuthPageShell';
import { EmailPasswordForm } from '@/components/pawz/auth/EmailPasswordForm';

// ============================================================================
// /access-frontdesk — the Front Desk door.
// Email/password ONLY — no Google button. Front desk stations are shared
// physical devices; OAuth on a shared machine would admit whoever's Google
// session happens to be active (auth spec, Section 3).
// ============================================================================

function AccessFrontDeskContent() {
  const searchParams = useSearchParams();
  const oauthError = searchParams.get('error');
  const redirect = searchParams.get('redirect') || undefined;

  return (
    <AuthPageShell portal="frontdesk" error={oauthError}>
      <div className="space-y-5">
        <EmailPasswordForm portal="frontdesk" redirect={redirect} submitLabel="Open Front Desk" />

        <p className="text-center text-[11.5px] text-muted-foreground">
          Front desk accounts are provisioned by your admin. This station sign-in is email &amp; password only.
        </p>
      </div>
    </AuthPageShell>
  );
}

export default function AccessFrontDeskPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-secondary" />}>
      <AccessFrontDeskContent />
    </Suspense>
  );
}
