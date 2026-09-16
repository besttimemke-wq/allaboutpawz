'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthPageShell } from '@/components/pawz/auth/AuthPageShell';
import { EmailPasswordForm } from '@/components/pawz/auth/EmailPasswordForm';

// ============================================================================
// /admin-login — the Admin door.
// Email/password only (+ optional 2FA later, out of scope now). Reuses
// /api/auth/login like every other door. Intentionally NOT renamed to
// /access-admin — this route is already linked/bookmarked.
// ============================================================================

function AdminLoginContent() {
  const searchParams = useSearchParams();
  const oauthError = searchParams.get('error');
  const redirect = searchParams.get('redirect') || undefined;

  return (
    <AuthPageShell portal="admin" error={oauthError}>
      <div className="space-y-5">
        <EmailPasswordForm portal="admin" redirect={redirect} submitLabel="Sign In to Console" />

        <p className="text-center text-[11.5px] text-muted-foreground">
          Authorized personnel only. All actions are logged.
        </p>
      </div>
    </AuthPageShell>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-secondary" />}>
      <AdminLoginContent />
    </Suspense>
  );
}
