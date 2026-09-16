'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { OwnerAuthView } from '@/components/pawz/auth/OwnerAuthView';

// ============================================================================
// /access-frontdesk — the Front Desk door.
// The owner's original gate design. Email/password ONLY — no Google on
// shared station devices (auth spec, Sections 3 & 6).
// ============================================================================

function AccessFrontDeskContent() {
  const searchParams = useSearchParams();
  const oauthError = searchParams.get('error') || undefined;
  const redirect = searchParams.get('redirect') || undefined;

  return <OwnerAuthView portal="frontdesk" error={oauthError} redirect={redirect} />;
}

export default function AccessFrontDeskPage() {
  return (
    <Suspense>
      <AccessFrontDeskContent />
    </Suspense>
  );
}
