'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { LandingLoginView } from '@/components/pawz/LandingLoginView';
import { useAppStore } from '@/lib/store';
import type { AuthUser } from '@/lib/types';

// Thin wiring wrapper around the owner's imported auth page
// (Serviceportals LandingLoginView). Reads the door URL's ?error= /
// ?redirect= params, mounts his page in the door's default mode, and routes
// after login exactly the way his repo's page.tsx did: by the server-resolved
// role — never by a role the user picked.

function DoorInner({ defaultMode }: { defaultMode: 'member' | 'staff' }) {
  const router = useRouter();
  const search = useSearchParams();
  const error = search.get('error') || undefined;
  const redirect = search.get('redirect') || '';

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
      initialError={error}
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
