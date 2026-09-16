'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { LandingLoginView } from '@/components/dawg/LandingLoginView';

// ============================================================================
// /learn/sign-in — the LMS door. The owner's original two-column gate
// design, imported as-is (Pet Parent tab pre-selected; staff can switch).
// ============================================================================

function LearnSignInContent() {
  const searchParams = useSearchParams();
  const oauthError = searchParams.get('error') || undefined;
  const redirect = searchParams.get('redirect') || undefined;

  return <LandingLoginView portal="lms" initialPortal="client" error={oauthError} redirect={redirect} />;
}

export default function LearnSignInPage() {
  return (
    <Suspense>
      <LearnSignInContent />
    </Suspense>
  );
}
