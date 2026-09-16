'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { LandingLoginView } from '@/components/dawg/LandingLoginView';

// ============================================================================
// /admin-login — the Admin door. The owner's original two-column gate
// design, imported as-is (Staff tab + Administrator card pre-selected).
// Intentionally NOT renamed to /access-admin — this route is linked/bookmarked.
// ============================================================================

function AdminLoginContent() {
  const searchParams = useSearchParams();
  const oauthError = searchParams.get('error') || undefined;
  const redirect = searchParams.get('redirect') || undefined;

  return <LandingLoginView portal="admin" initialPortal="staff" initialStaffRole="Administrator" error={oauthError} redirect={redirect} />;
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLoginContent />
    </Suspense>
  );
}
