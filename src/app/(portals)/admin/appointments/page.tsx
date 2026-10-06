'use client';
import { useAppStore } from '@/lib/store';
import { AppointmentsView } from '@/components/pawz/AppointmentsView';
export default function AppointmentsPage() {
  const { appointments, setActiveModal, setAppointments } = useAppStore();
  return (
    <AppointmentsView
      appointments={appointments}
      onAddAppointment={() => setActiveModal('appointment')}
      onUpdateStatus={(id, status) => setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)))}
    />
  );
}
