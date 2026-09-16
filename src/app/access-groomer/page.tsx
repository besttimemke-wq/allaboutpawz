'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { LandingLoginView } from '@/components/dawg/LandingLoginView';

// ============================================================================
// /access-groomer — the Groomer door. The owner's original two-column gate
// design, imported as-is (Staff tab + Groomer Station card pre-selected).
// ============================================================================

function AccessGroomerContent() {
  const searchParams = useSearchParams();
  const oauthError = searchParams.get('error') || undefined;
  const redirect = searchParams.get('redirect') || undefined;

  return <LandingLoginView portal="groomer" initialPortal="staff" initialStaffRole="Groomer" error={oauthError} redirect={redirect} />;
}

export default function AccessGroomerPage() {
  return (
    <Suspense>
      <AccessGroomerContent />
    </Suspense>
  );
}
