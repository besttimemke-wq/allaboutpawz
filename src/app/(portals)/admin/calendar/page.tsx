'use client';
import { useAppStore } from '@/lib/store';
import { FullCalendarView } from '@/components/pawz/FullCalendarView';
export default function CalendarPage() {
  const { appointments, setActiveModal } = useAppStore();
  return (
    <FullCalendarView
      appointments={appointments}
      onSelectAppointment={() => setActiveModal('appointment')}
      onAddAppointment={() => setActiveModal('appointment')}
    />
  );
}
