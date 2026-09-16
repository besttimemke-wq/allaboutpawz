'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { OwnerAuthView } from '@/components/pawz/auth/OwnerAuthView';

// ============================================================================
// /access-groomer — the Groomer door.
// The owner's original gate design. Google OAuth + email/password.
// ============================================================================

function AccessGroomerContent() {
  const searchParams = useSearchParams();
  const oauthError = searchParams.get('error') || undefined;
  const redirect = searchParams.get('redirect') || undefined;

  return <OwnerAuthView portal="groomer" error={oauthError} redirect={redirect} />;
}

export default function AccessGroomerPage() {
  return (
    <Suspense>
      <AccessGroomerContent />
    </Suspense>
  );
}
