'use client';
import { useState, useEffect } from 'react';
import { StaffView } from '@/components/pawz/StaffView';
import { StaffScheduleItem } from '@/lib/types';

export default function SchedulePage() {
  const [staffList, setStaffList] = useState<StaffScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/crm/staff?limit=100')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data?.staff) return;
        setStaffList(data.staff.map((s: any) => {
          const booked = Math.min(s.todayAppointmentCount || 0, 8);
          const slots: ('booked'|'available'|'break'|'blocked')[] = Array.from({length: 8}, (_, i) => i < booked ? 'booked' : 'available');
          const initials = ((s.firstName?.[0]||'')+(s.lastName?.[0]||'')||s.displayName?.[0]?.toUpperCase()||'?').toUpperCase();
          return {
            id: s.id, name: s.displayName, role: s.isGroomer ? 'Groomer' : (s.role||'Staff'),
            initials, slots, appointmentsCount: s.todayAppointmentCount || 0,
            phone: s.phone || undefined, commissionRate: 50,
          } as StaffScheduleItem;
        }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6 text-[13px] text-muted-foreground">Loading schedule…</div>;

  return <StaffView staffList={staffList} />;
}
