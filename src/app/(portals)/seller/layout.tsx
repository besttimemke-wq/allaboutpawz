'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { Sidebar } from '@/components/pawz/Sidebar';
import { Header } from '@/components/pawz/Header';
import { PortalShellSkeleton } from '@/components/pawz/_shared/PortalShellSkeleton';
import { useSessionQuery } from '@/lib/hooks/useSessionQuery';
import { cn } from '@/lib/utils';

// ============================================================================
// Seller portal layout — its OWN sidebar identity (SELLER).
//
// Seller employees resolve with role='admin' + membershipRole in
// SELLER_ROLES (seller | seller | reception). They are NOT real
// admins — they get their own portal at /seller/* so they never see the
// admin OS CRM/Orders/Accounting nav. Real admins (membershipRole='owner'
// | 'admin' | 'platform_admin') are redirected to /admin/dashboard.
//
// Per the owner's spec, seller is email/password only (no Google OAuth).
// ============================================================================

const SELLER_ROLES = ['seller', 'seller', 'reception'];

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [hasHydrated, setHasHydrated] = useState(false);
  const {
    currentUser,
    setUser,
    activeSection,
    setActiveSection,
    mobileOpen,
    setMobileOpen,
    isSidebarCollapsed,
    toggleSidebar,
    selectedLocation,
    setSelectedLocation,
    locations,
    activeModal,
    setActiveModal,
  } = useAppStore();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    const unsub = useAppStore.persist.onFinishHydration(() => setHasHydrated(true));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (useAppStore.persist.hasHydrated()) setHasHydrated(true);
    return unsub;
  }, []);

  // Auth gate — STALE-WHILE-REVALIDATE.
  const session = useSessionQuery((serverUser) => {
    if (serverUser) {
      useAppStore.getState().setUser(serverUser);
    } else {
      useAppStore.getState().setUser(null);
      router.replace('/access-seller');
    }
  });

  const isSeller = (u: any) =>
    !!u && SELLER_ROLES.includes(String(u.membershipRole || '').toLowerCase());

  // Scope enforcement — only after the server session has spoken.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!session.isResolved) return;
    const user = session.user as any;
    if (!user) {
      router.replace('/access-seller');
      return;
    }
    if (isSeller(user)) return; // ✓ seller employee
    if (user.role === 'admin') {
      router.replace('/admin/dashboard');
      return;
    }
    if (user.role === 'groomer') {
      router.replace('/groomer/dashboard');
      return;
    }
    router.replace('/access-customer');
  }, [session.isResolved, session.user, router]);

  if (!hasHydrated || !currentUser || !isSeller(currentUser)) {
    return <PortalShellSkeleton />;
  }

  const navigate = (section: any) => {
    setActiveSection(section);
    router.push(`/seller/${section === 'dashboard' ? 'dashboard' : section}`);
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-background text-foreground antialiased font-sans">
      <Sidebar
        activeSection={activeSection}
        onSelectSection={navigate}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        selectedLocation={selectedLocation}
        onSelectLocation={setSelectedLocation}
        locationsList={locations}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebar}
        variant="seller"
      />

      <main
        className={cn(
          'flex-1 flex flex-col h-full overflow-hidden bg-background text-foreground',
          isSidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64',
          'transition-[margin] duration-200 ease-in-out'
        )}
      >
        <Header
          onOpenMobileMenu={() => setMobileOpen(true)}
          onOpenSearch={() => setActiveModal('search')}
          currentDate="May 12, 2025"
          onNavigateSection={navigate}
          activeSection={activeSection}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebarCollapse={toggleSidebar}
          showPillars={false}
          onSignOut={() => {
            fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
            setUser(null);
            router.replace('/access-seller');
          }}
          currentUser={currentUser}
          selectedLocation={selectedLocation}
          onSelectLocation={setSelectedLocation}
          locationsList={locations.map((l) => l.name)}
        />

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-background">
          {children}
        </div>
      </main>
    </div>
  );
}
