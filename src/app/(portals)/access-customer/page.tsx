'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AuthPageShell } from '@/components/pawz/auth/AuthPageShell';
import { EmailPasswordForm } from '@/components/pawz/auth/EmailPasswordForm';
import { GoogleButton } from '@/components/pawz/auth/GoogleButton';

// ============================================================================
// /access-customer — the Customer door.
// Google OAuth + email/password (post temp-password setup). Highest-traffic
// portal: the bifurcation pattern was proven here first.
// ============================================================================

function AccessCustomerContent() {
  const searchParams = useSearchParams();
  const oauthError = searchParams.get('error');
  const redirect = searchParams.get('redirect') || undefined;

  return (
    <AuthPageShell
      portal="customer"
      error={oauthError}
      footer={
        <span>
          New here?{' '}
          <Link
            href="/book"
            className="font-medium text-foreground underline underline-offset-2 hover:text-primary transition"
          >
            Book your first appointment
          </Link>
          {' · '}
          <Link href="/" className="font-medium text-foreground underline underline-offset-2 hover:text-primary transition">
            allaboutpawz.com
          </Link>
        </span>
      }
    >
      <div className="space-y-5">
        <GoogleButton portal="customer" redirect={redirect} />

        <div className="relative flex items-center justify-center">
          <div className="border-t border-border w-full" />
          <span className="bg-card px-3 text-[11px] uppercase tracking-wider text-muted-foreground">
            Or with email
          </span>
          <div className="border-t border-border w-full" />
        </div>

        <EmailPasswordForm portal="customer" redirect={redirect} submitLabel="Sign In" />

        <p className="text-center text-[11.5px] text-muted-foreground">
          Forgot your password? Contact the salon and we&apos;ll send a reset link.
        </p>
      </div>
    </AuthPageShell>
  );
}

export default function AccessCustomerPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-secondary" />}>
      <AccessCustomerContent />
    </Suspense>
  );
}
