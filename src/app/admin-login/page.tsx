'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { OwnerAuthView } from '@/components/pawz/auth/OwnerAuthView';

// ============================================================================
// /admin-login — the Admin door.
// The owner's original gate design. Email/password ONLY. Intentionally NOT
// renamed to /access-admin — this route is already linked/bookmarked.
// ============================================================================

function AdminLoginContent() {
  const searchParams = useSearchParams();
  const oauthError = searchParams.get('error') || undefined;
  const redirect = searchParams.get('redirect') || undefined;

  return <OwnerAuthView portal="admin" error={oauthError} redirect={redirect} />;
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLoginContent />
    </Suspense>
  );
}
