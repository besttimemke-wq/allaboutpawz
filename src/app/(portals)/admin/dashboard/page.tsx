'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardView } from '@/components/pawz/DashboardView';
import { useAppStore } from '@/lib/store';
import type { DawgNavSection, KPIMetric, AppointmentItem, StaffScheduleItem, FunnelStage, GroomingRecord } from '@/lib/types';

export default function DashboardPage() {
  const router = useRouter();
  const { setActiveModal } = useAppStore();
  const [metrics, setMetrics] = useState<KPIMetric[]>([]);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [staffSchedules, setStaffSchedules] = useState<StaffScheduleItem[]>([]);
  const [bookingFunnel, setBookingFunnel] = useState<FunnelStage[]>([]);
  const [groomingRecords, setGroomingRecords] = useState<GroomingRecord[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    // Fetch appointments
    fetch('/api/bookings?limit=10').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.appointments) setAppointments(d.appointments);
    }).catch(() => {});

    // Fetch staff
    fetch('/api/admin/crm/staff?limit=10').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.staff) {
        setStaffSchedules(d.staff.map((s: any) => ({
          id: s.id, name: s.displayName, role: s.isGroomer ? 'Groomer' : s.role || 'Staff',
          initials: ((s.firstName?.[0]||'')+(s.lastName?.[0]||'')||'?').toUpperCase(),
          slots: Array(8).fill('available'), appointmentsCount: s.todayAppointmentCount || 0,
        })));
      }
    }).catch(() => {});

    // Fetch orders for revenue KPIs
    fetch('/api/admin/orders?limit=50').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.orders) {
        const completed = d.orders.filter((o: any) => o.status === 'COMPLETED');
        const revenue = completed.reduce((s: number, o: any) => s + (o.subtotal || 0), 0);
        const todayAppts = appointments.length;
        setMetrics([
          { label: "Today's Revenue", value: `$${revenue.toFixed(0)}`, change: '+12%', trend: 'up' },
          { label: 'Appointments', value: String(todayAppts), change: '+5%', trend: 'up' },
          { label: 'Active Customers', value: '7', change: '+2', trend: 'up' },
          { label: 'Staff On Duty', value: String(staffSchedules.length || 3), change: '0', trend: 'flat' },
        ] as KPIMetric[]);
      }
    }).catch(() => {});

    // Fetch grooming records
    fetch('/api/admin/crm/grooming-records?limit=5').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.records) setGroomingRecords(d.records);
    }).catch(() => {});
  }, []);

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
      onToggleAppointmentStatus={(id) => setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: a.status === 'Scheduled' ? 'Confirmed' as any : 'Scheduled' as any } : a))}
    />
  );
}
