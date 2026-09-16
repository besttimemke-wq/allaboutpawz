'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { OwnerAuthView } from '@/components/pawz/auth/OwnerAuthView';

// ============================================================================
// /access-customer — the Customer door.
// The owner's original gate design. Google OAuth + email/password.
// ============================================================================

function AccessCustomerContent() {
  const searchParams = useSearchParams();
  const oauthError = searchParams.get('error') || undefined;
  const redirect = searchParams.get('redirect') || undefined;

  return <OwnerAuthView portal="customer" error={oauthError} redirect={redirect} />;
}

export default function AccessCustomerPage() {
  return (
    <Suspense>
      <AccessCustomerContent />
    </Suspense>
  );
}
