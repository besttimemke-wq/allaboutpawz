'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { LandingLoginView } from '@/components/dawg/LandingLoginView';

// ============================================================================
// /access-frontdesk — the Front Desk door. The owner's original two-column
// gate design, imported as-is (Staff tab + Front Desk card pre-selected).
// ============================================================================

function AccessFrontDeskContent() {
  const searchParams = useSearchParams();
  const oauthError = searchParams.get('error') || undefined;
  const redirect = searchParams.get('redirect') || undefined;

  return <LandingLoginView portal="frontdesk" initialPortal="staff" initialStaffRole="Front Desk" error={oauthError} redirect={redirect} />;
}

export default function AccessFrontDeskPage() {
  return (
    <Suspense>
      <AccessFrontDeskContent />
    </Suspense>
  );
}
