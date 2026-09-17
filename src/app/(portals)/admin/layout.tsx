'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { Sidebar } from '@/components/pawz/Sidebar';
import { Header } from '@/components/pawz/Header';
import { QuickActionModals } from '@/components/pawz/Modals/QuickActionModals';
import { ModuleNav } from '@/components/pawz/_shared/ModuleNav';
import { PortalShellSkeleton } from '@/components/pawz/_shared/PortalShellSkeleton';
import { useSessionQuery } from '@/lib/hooks/useSessionQuery';
import { cn } from '@/lib/utils';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
// eslint-disable-next-line react-hooks/set-state-in-effect
  const [hasHydrated, setHasHydrated] = useState(false);
  const {
    currentUser,
    activeSection,
    setActiveSection,
    mobileOpen,
    setMobileOpen,
    isSidebarCollapsed,
    toggleSidebar,
    selectedLocation,
    setSelectedLocation,
    locations,
    appointments,
    customers,
    pets,
    staffSchedules,
    groomingRecords,
    activeModal,
    setActiveModal,
    addLocation,
    deleteLocation,
  } = useAppStore();

  // Navigate to a section — updates state AND routes to the URL
  const navigate = (section: DawgNavSection) => {
    setActiveSection(section);
    router.push(`/admin/${section}`);
  };

  // Wait for Zustand persist to hydrate from localStorage
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
// eslint-disable-next-line react-hooks/set-state-in-effect
    const unsub = useAppStore.persist.onFinishHydration(() => setHasHydrated(true));
// eslint-disable-next-line react-hooks/set-state-in-effect
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (useAppStore.persist.hasHydrated()) setHasHydrated(true);
    return unsub;
  }, []);

  // Auth gate — STALE-WHILE-REVALIDATE. The persisted user (localStorage)
  // paints the shell INSTANTLY; the server session (/api/auth/portal-session,
  // pawz_session cookie) is the single source of truth and reconciles in the
  // background: a stale cached user is replaced by the server's answer, and
  // no server session at all sends the visitor to the Admin door — never the
  // public site. The shell NEVER waits on the network: only a first visit
  // with no cached user shows the static skeleton frame while the one check
  // runs.
  const session = useSessionQuery((serverUser) => {
    if (serverUser) {
      useAppStore.getState().setUser(serverUser);
    } else {
      useAppStore.getState().setUser(null);
      router.replace('/admin-login');
    }
  });

  // Scope enforcement — only after the server session has spoken.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!session.isResolved) return;
    const user = session.user;
    if (!user) {
      router.replace('/admin-login');
      return;
    }
    if (user.role === 'groomer') {
      router.replace('/groomer/dashboard');
      return;
    }
    if (user.role === 'customer') {
      router.replace('/customer/dashboard');
      return;
    }
  }, [session.isResolved, session.user, router]);

  if (!hasHydrated || !currentUser || currentUser.role !== 'admin') {
    return <PortalShellSkeleton />;
  }

  const generateId = (prefix: string) => `${prefix}-${Math.random().toString(36).substring(2, 9)}`;

  const handleAddAppointment = (newAppt: Partial<AppointmentItem>) => {
    useAppStore.getState().setAppointments((prev) => [
      {
        id: generateId('appt'),
        time: newAppt.time || '2:30 PM',
        date: newAppt.date || '2026-09-18',
        petName: newAppt.petName || 'Coco',
        breed: newAppt.breed || 'Poodle',
        customerName: newAppt.customerName || 'New Client',
        phone: newAppt.phone || '(214) 555-0000',
        serviceName: newAppt.serviceName || 'Full Groom',
        staffName: newAppt.staffName || 'Sarah M.',
        status: newAppt.status || 'Scheduled',
        price: newAppt.price || 95,
        ...newAppt,
      } as AppointmentItem,
      ...prev,
    ]);
  };

  const handleAddCustomer = (newCust: Partial<Customer>) => {
    useAppStore.getState().setCustomers((prev) => [
      {
        id: generateId('cust'),
        name: newCust.name || 'New Customer',
        email: newCust.email || '',
        phone: newCust.phone || '',
        address: newCust.address || '',
        pets: newCust.pets || [],
        status: newCust.status || 'Active',
        ...newCust,
      } as Customer,
      ...prev,
    ]);
  };

  const handleAddPet = (newPet: Partial<PetRecord>) => {
    useAppStore.getState().setPets((prev) => [
      {
        id: generateId('pet'),
        name: newPet.name || 'New Pet',
        breed: newPet.breed || 'Mixed',
        age: newPet.age || '1 year',
        weight: newPet.weight || '10 lbs',
        ownerName: newPet.ownerName || 'Owner',
        vaccinationStatus: newPet.vaccinationStatus || 'Up to date',
        lastGroomDate: newPet.lastGroomDate || 'N/A',
        specialNotes: newPet.specialNotes || '',
        emoji: newPet.emoji || '🐕',
        ...newPet,
      } as PetRecord,
      ...prev,
    ]);
  };

  const handleAddLocation = () => {
    const name = prompt('Enter location name:');
    if (name) {
      addLocation({
        id: generateId('loc'),
        name: `All About Pawz – ${name}`,
        address: '',
        phone: '',
      });
    }
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
          onOpenQuickAction={(action) => setActiveModal(action)}
          onSignOut={() => {
            fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
            useAppStore.getState().setUser(null);
            router.replace('/admin-login');
          }}
          currentUser={currentUser}
          selectedLocation={selectedLocation}
          onSelectLocation={setSelectedLocation}
          locationsList={locations.map((l) => l.name)}
        />

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-background">
          {/* Module icon navigation */}
          <ModuleNav activeSection={activeSection} onNavigate={navigate} />
          {children}
        </div>
      </main>

      <QuickActionModals
        activeModal={activeModal}
        onClose={() => setActiveModal(null)}
        onSaveAppointment={handleAddAppointment}
        onSaveCustomer={handleAddCustomer}
        onSavePet={handleAddPet}
        onNavigateSection={navigate}
      />
    </div>
  );
}

// Type imports for handlers
import type { AppointmentItem, Customer, PetRecord } from '@/lib/types';
