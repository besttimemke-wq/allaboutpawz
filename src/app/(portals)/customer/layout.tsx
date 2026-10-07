'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { DawgNavSection } from '@/lib/types';
import { Sidebar } from '@/components/pawz/Sidebar';
import { Header } from '@/components/pawz/Header';
import { NotificationBell } from '@/components/pawz/customer/notification-bell';
import { PortalShellSkeleton } from '@/components/pawz/_shared/PortalShellSkeleton';
import { useSessionQuery } from '@/lib/hooks/useSessionQuery';
import { cn } from '@/lib/utils';

// ============================================================================
// Customer portal layout — its OWN sidebar identity (PET PARENT).
// The variant="customer" Sidebar renders the owner's exact My Account tree
// (My Orders / My Appointments / Learn Courses / My Pet Health / My Profile /
// Need Help? / Sign Out) as route <Link>s — no CRM / ORDERS / ACCOUNTING
// business nav ever bleeds in. The sidebar navigates by route, so the shared
// chrome's section store is synced from the pathname (best-effort) below.
// ============================================================================

// Best-effort route → shared-section mapping: keeps the Header's section
// state tracking the page the customer is actually on. The sidebar itself
// derives its active row from usePathname and never reads this.
const SECTION_BY_PATH: [string, DawgNavSection][] = [
  ['/customer/dashboard', 'dashboard'],
  ['/customer/orders', 'orders'],
  ['/customer/appointments', 'appointments'],
  ['/customer/pets', 'pets'],
  ['/customer/invoices', 'invoices'],
  ['/customer/messages', 'messages'],
];

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [hasHydrated, setHasHydrated] = useState(false);
  const { currentUser, setUser, activeSection, setActiveSection, mobileOpen, setMobileOpen, isSidebarCollapsed, toggleSidebar, selectedLocation, setSelectedLocation, locations, activeModal, setActiveModal } = useAppStore();

  useEffect(() => {
    const unsub = useAppStore.persist.onFinishHydration(() => setHasHydrated(true));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (useAppStore.persist.hasHydrated()) setHasHydrated(true);
    return unsub;
  }, []);

  // Auth gate — STALE-WHILE-REVALIDATE. The persisted user paints the shell
  // INSTANTLY; the server session is the source of truth and reconciles in
  // the background. No full-screen spinner — only a first visit with no
  // cached user shows the static skeleton frame.
  const session = useSessionQuery((serverUser) => {
    if (serverUser) {
      useAppStore.getState().setUser(serverUser);
    } else {
      useAppStore.getState().setUser(null);
      router.replace('/access-customer');
    }
  });

  // Scope enforcement — only after the server session has spoken.
  // ONE PERSON, ONE PERSONAL PORTAL: the customer portal is every signed-in
  // person's own space — customers, learners, AND STAFF (an employee's own
  // dogs are booked through the same pages as everyone else's). Their work
  // console is a separate destination they open deliberately; we never
  // hijack a visit to /customer/* and reroute it to work. Only a signed-OUT
  // visitor is sent to the sign-in door.
  useEffect(() => {
    if (!session.isResolved) return;
    if (!session.user) {
      router.replace('/access-customer');
    }
  }, [session.isResolved, session.user, router]);

  // Route → section sync (best-effort, see SECTION_BY_PATH): the sidebar is
  // route-driven, and this keeps the shared chrome (Header) coherent when
  // the customer lands on a page via a link, bookmark, or back/forward.
  useEffect(() => {
    if (!hasHydrated) return;
    const hit = SECTION_BY_PATH.find(([prefix]) => pathname === prefix || pathname.startsWith(prefix + '/'));
    if (hit) useAppStore.getState().setActiveSection(hit[1]);
  }, [pathname, hasHydrated]);

  if (!hasHydrated || !currentUser) {
    return <PortalShellSkeleton />;
  }

  const navigate = (section: any) => {
    setActiveSection(section);
    router.push(`/customer/${section === 'dashboard' ? 'dashboard' : section}`);
  };

  // One sign-out behavior for the whole portal (sidebar rail + header
  // menu): POST the logout API (clears pawz_session), drop the cached user,
  // land on home — where a logged-out visitor sees SIGN IN at the top.
  const signOut = () => {
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
    router.replace('/');
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
        variant="customer"
        onSignOut={signOut}
      />

      <main className={cn(
        'flex-1 flex flex-col h-full overflow-hidden bg-background text-foreground',
        isSidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64',
        'transition-[margin] duration-200 ease-in-out'
      )}>
        <Header
          onOpenMobileMenu={() => setMobileOpen(true)}
          onOpenSearch={() => setActiveModal('search')}
          currentDate="May 12, 2025"
          onNavigateSection={navigate}
          activeSection={activeSection}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebarCollapse={toggleSidebar}
          showPillars={false}
          showSiteNav
          rightSlot={<NotificationBell />}
          onSignOut={signOut}
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
