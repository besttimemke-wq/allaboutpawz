'use client';
import { useRouter } from 'next/navigation';
import { DashboardView } from '@/components/pawz/DashboardView';
import { useAppStore } from '@/lib/store';
import { useDashboardKPIs, useBookings, useStaff, useGroomingRecords } from '@/hooks/useQueries';
import type { DawgNavSection, KPIMetric, AppointmentItem, StaffScheduleItem, FunnelStage, GroomingRecord } from '@/lib/types';

export default function DashboardPage() {
  const router = useRouter();
  const { setActiveModal } = useAppStore();

  // TanStack Query — no more useState + useEffect + fetch boilerplate
  const { data: kpiData } = useDashboardKPIs();
  const { data: bookingData } = useBookings(10);
  const { data: staffData } = useStaff(10);
  const { data: groomingData } = useGroomingRecords(5);

  // Derive props from query results
  const k = kpiData?.kpis;
  const metrics: KPIMetric[] = k ? [
    { label: "Today's Appointments", value: String(k.todayAppointments ?? 0), change: '', trend: 'flat' },
    { label: "Today's Revenue", value: `$${Number(k.todayRevenue ?? 0).toFixed(0)}`, change: '', trend: 'up' },
    { label: 'New Customers (30d)', value: String(k.newCustomers30d ?? 0), change: '', trend: 'up' },
    { label: 'No-Show Rate (30d)', value: `${k.noShowRate30d ?? 0}%`, change: '', trend: 'flat' },
    { label: 'Rebook Rate (30d)', value: `${k.rebookRate30d ?? 0}%`, change: '', trend: 'up' },
    { label: 'Staff On Duty', value: String(k.staffOnDuty ?? 0), change: '', trend: 'flat' },
  ] : [];

  const bookingFunnel: FunnelStage[] = kpiData?.bookingFunnel ?? [];
  const appointments: AppointmentItem[] = bookingData?.appointments ?? [];
  const groomingRecords: GroomingRecord[] = groomingData?.records ?? [];

  const staffSchedules: StaffScheduleItem[] = (staffData?.staff ?? []).map((s: any) => ({
    id: s.id, name: s.displayName, role: s.isGroomer ? 'Groomer' : s.role || 'Staff',
    initials: ((s.firstName?.[0]||'')+(s.lastName?.[0]||'')||'?').toUpperCase(),
    slots: Array(8).fill('available'), appointmentsCount: s.todayAppointmentCount || 0,
  }));

  const a = kpiData?.alerts;
  const alerts: any[] = [];
  if (a) {
    if (a.vaccinationsExpiring > 0) alerts.push({ type: 'vaccinations', count: a.vaccinationsExpiring, label: 'Vaccinations Expiring' });
    if (a.unsignedDocuments > 0) alerts.push({ type: 'documents', count: a.unsignedDocuments, label: 'Unsigned Documents' });
    if (a.upcomingBirthdays > 0) alerts.push({ type: 'birthdays', count: a.upcomingBirthdays, label: 'Upcoming Birthdays' });
    if (a.lowInventory > 0) alerts.push({ type: 'inventory', count: a.lowInventory, label: 'Low Inventory' });
  }

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
        // TanStack Query handles this via useMutation in a real app;
        // for now we let the query refetch on next render
      }}
    />
  );
}
