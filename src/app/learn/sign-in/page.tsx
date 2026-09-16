'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { OwnerAuthView } from '@/components/pawz/auth/OwnerAuthView';

// ============================================================================
// /learn/sign-in — the LMS door.
// The owner's original gate design. Google OAuth + email/password.
// ============================================================================

function LearnSignInContent() {
  const searchParams = useSearchParams();
  const oauthError = searchParams.get('error') || undefined;
  const redirect = searchParams.get('redirect') || undefined;

  return <OwnerAuthView portal="lms" error={oauthError} redirect={redirect} />;
}

export default function LearnSignInPage() {
  return (
    <Suspense>
      <LearnSignInContent />
    </Suspense>
  );
}
