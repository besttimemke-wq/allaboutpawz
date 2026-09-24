'use client';
import { useState, useEffect } from 'react';
import { FullCalendarView } from '@/components/pawz/FullCalendarView';
import { AppointmentItem } from '@/lib/types';
import { useAppStore } from '@/lib/store';

export default function CalendarPage() {
  const { setActiveModal } = useAppStore();
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/bookings?limit=200')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.appointments) {
          setAppointments(data.appointments);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      {loading && (
        <div className="p-6 text-[13px] text-muted-foreground">Loading calendar…</div>
      )}
      <FullCalendarView
        appointments={appointments}
        onSelectAppointment={() => setActiveModal('appointment')}
        onAddAppointment={() => setActiveModal('appointment')}
      />
    </>
  );
}
