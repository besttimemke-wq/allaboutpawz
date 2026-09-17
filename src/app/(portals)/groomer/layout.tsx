'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { Sidebar } from '@/components/pawz/Sidebar';
import { Header } from '@/components/pawz/Header';
import { PortalShellSkeleton } from '@/components/pawz/_shared/PortalShellSkeleton';
import { useSessionQuery } from '@/lib/hooks/useSessionQuery';
import { cn } from '@/lib/utils';
import type { DawgNavSection } from '@/lib/types';
import {
  LayoutGrid, Calendar, CalendarClock, FileText, PawPrint, Scissors,
} from 'lucide-react';

// Groomer-specific sidebar nav groups
const groomerNavGroups = [
  {
    category: 'GROOMER STATION',
    categoryDefaultSection: 'dashboard' as DawgNavSection,
    items: [
      { id: 'dashboard' as DawgNavSection, label: 'Station Dashboard', icon: LayoutGrid },
      { id: 'appointments' as DawgNavSection, label: 'Assigned Appointments', icon: Calendar },
      { id: 'schedule' as DawgNavSection, label: 'Shifts', icon: CalendarClock },
      { id: 'grooming-records' as DawgNavSection, label: 'Handling Notes', icon: FileText },
      { id: 'pets' as DawgNavSection, label: 'Style Records', icon: Scissors },
    ],
  },
];

export default function GroomerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [hasHydrated, setHasHydrated] = useState(false);
  const { currentUser, setUser, activeSection, setActiveSection, mobileOpen, setMobileOpen, isSidebarCollapsed, toggleSidebar, selectedLocation, setSelectedLocation, locations, activeModal, setActiveModal } = useAppStore();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      router.replace('/access-groomer');
    }
  });

  // Scope enforcement — only after the server session has spoken.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!session.isResolved) return;
    const user = session.user;
    if (!user) {
      router.replace('/access-groomer');
      return;
    }
    if (user.role === 'admin') {
      router.replace('/admin/dashboard');
      return;
    }
    if (user.role === 'customer') {
      router.replace('/customer/dashboard');
      return;
    }
  }, [session.isResolved, session.user, router]);

  if (!hasHydrated || !currentUser || currentUser.role !== 'groomer') {
    return <PortalShellSkeleton />;
  }

  const navigate = (section: DawgNavSection) => {
    setActiveSection(section);
    router.push(`/groomer/${section === 'dashboard' ? 'dashboard' : section}`);
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-background text-foreground antialiased font-sans">
      {/* Same shared Sidebar — but with groomer nav groups */}
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
          onSignOut={() => {
            fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
            setUser(null);
            router.replace('/access-groomer');
          }}
          currentUser={currentUser}
          selectedLocation={selectedLocation}
          onSelectLocation={setSelectedLocation}
          locationsList={locations.map((l) => l.name)}
        />

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-background">
          {/* Groomer sub-nav */}
          <nav className="flex items-center gap-1 px-4 py-1.5 border-b border-border bg-card overflow-x-auto custom-scrollbar">
            {groomerNavGroups[0].items.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-2.5 h-7 text-[12px] font-medium transition-colors cursor-pointer whitespace-nowrap',
                    isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="size-3.5 shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </nav>
          {children}
        </div>
      </main>
    </div>
  );
}
