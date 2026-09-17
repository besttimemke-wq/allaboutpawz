'use client';

import { useAppStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { DashboardView } from '@/components/pawz/DashboardView';
import type { DawgNavSection } from '@/lib/types';

export default function DashboardPage() {
  const router = useRouter();
  const {
    metrics,
    appointments,
    staffSchedules,
    bookingFunnel,
    groomingRecords,
    alerts,
    setActiveModal,
    setAppointments,
  } = useAppStore();

  const navigate = (section: DawgNavSection) => {
    router.push(`/admin/${section === 'dashboard' ? 'dashboard' : section}`);
  };

  return (
    <DashboardView
      metrics={metrics}
      appointments={appointments}
      staffSchedules={staffSchedules}
      bookingFunnel={bookingFunnel}
      groomingRecords={groomingRecords}
      alerts={alerts}
      onNavigateSection={navigate}
      onOpenQuickAction={(action) => setActiveModal(action)}
      onToggleAppointmentStatus={(id) => {
        setAppointments((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: a.status === 'Scheduled' ? 'Confirmed' : 'Scheduled' } : a))
        );
      }}
    />
  );
}
