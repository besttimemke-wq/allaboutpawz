'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { LandingLoginView } from '@/components/pawz/LandingLoginView';
import { useAppStore } from '@/lib/store';
import type { AuthUser } from '@/lib/types';

// Thin wiring wrapper around the owner's imported auth page
// (Serviceportals LandingLoginView). Mounts his page in the door's default
// mode and routes after login exactly the way his repo's page.tsx did: by the
// SERVER-resolved role — never by a role the user picked.
//
// His design shows exactly ONE message: the salon gate (not_authorized) — his
// own text from his repo. Everything else is silent — his landing page
// rendered "No auto-redirect, no banner, no surprises."

function DoorInner({ defaultMode }: { defaultMode: 'member' | 'staff' }) {
  const router = useRouter();
  const search = useSearchParams();
  const error = search.get('error');
  const email = search.get('email');
  const redirect = search.get('redirect') || '';

  // HIS salon gate message — the only error his design ever displays.
  const initialError =
    error === 'not_authorized'
      ? email
        ? `${email} is not registered at this salon. Access is gated — you must be an existing client (created at checkout, booking, or walk-in) or staff (pre-created by an administrator) before you can sign in. Please contact the salon to be set up.`
        : 'Not registered at this salon. Contact the salon to be set up.'
      : undefined;

  // Strip the transient gate params from the URL once read, so a refresh
  // never re-shows them and the door sits clean.
  useEffect(() => {
    if (!error && !email) return;
    try {
      const params = new URLSearchParams(window.location.search);
      params.delete('error');
      params.delete('email');
      const qs = params.toString();
      router.replace(window.location.pathname + (qs ? `?${qs}` : ''), { scroll: false });
    } catch {
      /* non-fatal */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = (user: AuthUser, initialSection?: string) => {
    useAppStore.getState().setUser(user);
    // Same-site redirect override (?redirect= on the door URL), else the
    // repo's role-based routing.
    if (redirect.startsWith('/') && !redirect.startsWith('//')) {
      router.push(redirect);
      return;
    }
    if (user.role === 'admin') {
      router.push(`/admin/${initialSection || 'dashboard'}`);
    } else if (user.role === 'groomer') {
      router.push('/groomer/dashboard');
    } else {
      router.push('/customer/dashboard');
    }
  };

  return (
    <LandingLoginView
      initialMode={defaultMode}
      initialError={initialError}
      onLogin={handleLogin}
    />
  );
}

export function AuthDoor({ defaultMode }: { defaultMode: 'member' | 'staff' }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-black">
          <div className="size-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
        </div>
      }
    >
      <DoorInner defaultMode={defaultMode} />
    </Suspense>
  );
}
