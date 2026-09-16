'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { LandingLoginView } from '@/components/dawg/LandingLoginView';

// ============================================================================
// /access-customer — the Customer door. The owner's original two-column
// gate design, imported as-is (Pet Parent tab pre-selected).
// ============================================================================

function AccessCustomerContent() {
  const searchParams = useSearchParams();
  const oauthError = searchParams.get('error') || undefined;
  const redirect = searchParams.get('redirect') || undefined;

  return <LandingLoginView portal="customer" initialPortal="client" error={oauthError} redirect={redirect} />;
}

export default function AccessCustomerPage() {
  return (
    <Suspense>
      <AccessCustomerContent />
    </Suspense>
  );
}
