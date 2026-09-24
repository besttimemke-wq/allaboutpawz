'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppointmentsView } from '@/components/pawz/AppointmentsView';
import { AppointmentItem } from '@/lib/types';
import { useAppStore } from '@/lib/store';

export default function AppointmentsPage() {
  const router = useRouter();
  const { setActiveModal } = useAppStore();
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/bookings?limit=200')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.appointments) setAppointments(data.appointments);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6 text-[13px] text-muted-foreground">Loading appointments…</div>;

  return (
    <AppointmentsView
      appointments={appointments}
      onAddAppointment={() => setActiveModal('appointment')}
      onSelectAppointment={(appt) => {
        // Navigate to the customer directory with the customer name pre-filled
        router.push(`/admin/customers?search=${encodeURIComponent(appt.customerName || '')}`);
      }}
      onUpdateStatus={(id, status) => setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)))}
    />
  );
}
