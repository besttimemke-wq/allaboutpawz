import type { CrmAppointmentFull, CrmOperatingHours, CrmHolidayBlackout, CrmShiftTemplate } from '@/types/database/booking';

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) { if (res.status === 401) throw new Error('Admin sign-in required.'); throw new Error(`Request failed: ${res.status}`); }
  return res.json();
}

async function apiPatch<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || `Request failed: ${res.status}`); }
  return res.json();
}

export const bookingService = {
  async getAppointments(filters?: { status?: string; startDate?: string; endDate?: string }): Promise<CrmAppointmentFull[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.startDate) params.set('startDate', filters.startDate);
    if (filters?.endDate) params.set('endDate', filters.endDate);
    const data = await apiGet<{ appointments: CrmAppointmentFull[] }>(`/api/admin/crm/appointments?${params}`);
    return data.appointments ?? [];
  },

  async updateAppointment(id: string, updates: { status?: string; assigned_groomer_id?: string; internal_notes?: string }): Promise<any> {
    return apiPatch(`/api/admin/crm/appointments`, { id, ...updates });
  },

  async getOperatingHours(): Promise<CrmOperatingHours[]> {
    // Uses existing /api/admin/crm/locations endpoint or could be a new one
    return [];
  },

  async getShiftTemplates(): Promise<CrmShiftTemplate[]> {
    // Query crm_shift_templates — would need a new API route
    return [];
  },
};
