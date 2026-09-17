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
// Learning Center (LMS) portal layout — its OWN sidebar identity (LEARN).
//
// Per the owner's spec, LMS is self-serve within managed accounts: customers
// AND staff (groomers, front desk, admins) all land on /learn/dashboard.
// Each signed-in role gets the same Learning Center sidebar — no CRM /
// ORDERS / ACCOUNTING business nav, just the learning surface.
// ============================================================================

export default function LearnLayout({ children }: { children: React.ReactNode }) {
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
      router.replace('/learn/sign-in');
    }
  });

  // Scope enforcement — LMS is open to every signed-in account. The only
  // failure path is no session at all → back to the LMS sign-in door.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!session.isResolved) return;
    if (!session.user) {
      router.replace('/learn/sign-in');
    }
  }, [session.isResolved, session.user, router]);

  if (!hasHydrated || !currentUser) {
    return <PortalShellSkeleton />;
  }

  const navigate = (section: any) => {
    setActiveSection(section);
    router.push(`/learn/${section === 'my-learning' ? 'dashboard' : section}`);
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
        variant="lms"
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
            router.replace('/learn/sign-in');
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
