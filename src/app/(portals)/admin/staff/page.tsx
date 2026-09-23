'use client';
import { useState, useEffect } from 'react';
import { StaffView } from '@/components/pawz/StaffView';
import { StaffScheduleItem } from '@/lib/types';

export default function StaffPage() {
  const [staffList, setStaffList] = useState<StaffScheduleItem[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const qs = search ? `?search=${encodeURIComponent(search)}&limit=100` : '?limit=100';
    fetch(`/api/admin/crm/staff${qs}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data?.staff) return;
        setStaffList(data.staff.map((s: any) => {
          const slotCount = 8;
          const booked = Math.min(s.todayAppointmentCount || 0, slotCount);
          const slots: ('booked' | 'available' | 'break' | 'blocked')[] = [];
          for (let i = 0; i < slotCount; i++) slots.push(i < booked ? 'booked' : 'available');
          const roleDisplay = s.isGroomer ? 'Groomer'
            : String(s.role || '').toLowerCase().includes('front') || String(s.role || '').toLowerCase().includes('desk') ? 'Front Desk'
            : String(s.role || '').toLowerCase().includes('manager') ? 'Manager'
            : (s.role || 'Staff').charAt(0).toUpperCase() + (s.role || 'staff').slice(1);
          const initials = ((s.firstName?.[0] || '') + (s.lastName?.[0] || '') || (s.displayName?.[0]?.toUpperCase() || '?')).toUpperCase();
          return {
            id: s.id,
            name: s.displayName,
            role: roleDisplay as any,
            initials,
            slots,
            appointmentsCount: s.todayAppointmentCount || 0,
            phone: s.phone || undefined,
            commissionRate: 50,
          } as StaffScheduleItem;
        }));
      })
      .catch(() => {});
  }, [search]);

  return (
    <>
      <div className="px-6 pt-4 flex items-center gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search staff by name, role, or email…"
          className="bg-background border border-input rounded-md px-3 h-9 text-[13px] flex-1 max-w-md"
        />
      </div>
      <StaffView staffList={staffList} />
    </>
  );
}
