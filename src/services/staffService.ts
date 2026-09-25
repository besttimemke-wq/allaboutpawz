import type { CrmStaffFull, CrmStaffShift, CrmShiftTemplate, CrmStaffTimeClockEntry } from '@/types/database/staff';

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) { if (res.status === 401) throw new Error('Admin sign-in required.'); throw new Error(`Request failed: ${res.status}`); }
  return res.json();
}

export const staffService = {
  async getStaff(): Promise<CrmStaffFull[]> {
    const data = await apiGet<{ staff: CrmStaffFull[] }>('/api/admin/crm/staff');
    return data.staff ?? [];
  },
  async getSchedules(): Promise<{ shifts: CrmStaffShift[]; templates: CrmShiftTemplate[]; clockEntries: CrmStaffTimeClockEntry[] }> {
    return apiGet('/api/admin/staff/schedules');
  },
};
