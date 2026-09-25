// ============================================================================
// CRM Service Layer — data access over gated API routes (no Supabase anon key).
//
// Every method calls a dedicated /api/admin/crm/* endpoint that enforces
// requireAdminApi() + pgQuery on the server. The client never touches the
// database directly.
// ============================================================================

import type {
  CrmCustomer,
  CrmPet,
  CrmService,
  CrmAppointment,
  CrmStaff,
  CrmLocation,
  CrmNote,
  CrmMessage,
  CrmDocument,
  CommercePayment,
} from '@/types/database/crm';

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 401) throw new Error('Admin sign-in required.');
    throw new Error(`Request failed: ${res.status}`);
  }
  return res.json();
}

async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

async function apiPatch<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const crmService = {
  // ---- Customers ----
  async getCustomers(): Promise<CrmCustomer[]> {
    const data = await apiGet<{ customers: CrmCustomer[] }>('/api/admin/crm/customers');
    return data.customers ?? [];
  },

  async getCustomerById(id: string): Promise<CrmCustomer | null> {
    const data = await apiGet<{ customer: CrmCustomer }>(`/api/admin/crm/customers/${id}`);
    return data.customer ?? null;
  },

  async createCustomer(payload: Partial<CrmCustomer>): Promise<CrmCustomer> {
    const data = await apiPost<{ customer: CrmCustomer }>('/api/admin/crm/customers', payload);
    return data.customer;
  },

  async updateCustomer(id: string, payload: Partial<CrmCustomer>): Promise<CrmCustomer> {
    const data = await apiPatch<{ customer: CrmCustomer }>(`/api/admin/crm/customers`, { id, ...payload });
    return data.customer;
  },

  // ---- Pets ----
  async getPetsByCustomer(customerId: string): Promise<CrmPet[]> {
    const data = await apiGet<{ pets: CrmPet[] }>(`/api/admin/crm/pets?customerId=${customerId}`);
    return data.pets ?? [];
  },

  async getAllPets(): Promise<CrmPet[]> {
    const data = await apiGet<{ pets: CrmPet[] }>('/api/admin/crm/pets');
    return data.pets ?? [];
  },

  async createPet(payload: Partial<CrmPet>): Promise<CrmPet> {
    const data = await apiPost<{ pet: CrmPet }>('/api/admin/crm/pets', payload);
    return data.pet;
  },

  // ---- Services ----
  async getServices(): Promise<CrmService[]> {
    const data = await apiGet<{ services: CrmService[] }>('/api/admin/crm/services');
    return data.services ?? [];
  },

  async createService(payload: Partial<CrmService>): Promise<CrmService> {
    const data = await apiPost<{ service: CrmService }>('/api/admin/crm/services', payload);
    return data.service;
  },

  // ---- Appointments ----
  async getAppointments(startDate?: string, endDate?: string): Promise<CrmAppointment[]> {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const data = await apiGet<{ appointments: CrmAppointment[] }>(`/api/admin/crm/appointments?${params}`);
    return data.appointments ?? [];
  },

  async createAppointment(payload: Partial<CrmAppointment>): Promise<CrmAppointment> {
    const data = await apiPost<{ appointment: CrmAppointment }>('/api/admin/crm/appointments', payload);
    return data.appointment;
  },

  // ---- Staff ----
  async getStaff(): Promise<CrmStaff[]> {
    const data = await apiGet<{ staff: CrmStaff[] }>('/api/admin/crm/staff');
    return data.staff ?? [];
  },

  async createStaff(payload: Partial<CrmStaff>): Promise<CrmStaff> {
    const data = await apiPost<{ staffMember: CrmStaff }>('/api/admin/crm/staff', payload);
    return data.staffMember;
  },

  // ---- Locations ----
  async getLocations(): Promise<CrmLocation[]> {
    const data = await apiGet<{ locations: CrmLocation[] }>('/api/admin/crm/locations');
    return data.locations ?? [];
  },

  // ---- Payments ----
  async getPayments(customerId?: string): Promise<CommercePayment[]> {
    const url = customerId ? `/api/admin/payments?customerId=${customerId}` : '/api/admin/payments';
    const data = await apiGet<{ payments: CommercePayment[] }>(url);
    return data.payments ?? [];
  },

  // ---- Customer Sub-Tabs (notes, messages, documents) ----
  async getNotes(customerId: string): Promise<CrmNote[]> {
    const data = await apiGet<{ notes: CrmNote[] }>(`/api/admin/crm/notes?customerId=${customerId}`);
    return data.notes ?? [];
  },

  async createNote(payload: { customer_id: string; note_type: string; body: string; is_pinned?: boolean }): Promise<CrmNote> {
    const data = await apiPost<{ note: CrmNote }>('/api/admin/crm/notes', payload);
    return data.note;
  },

  async getMessages(customerId: string): Promise<CrmMessage[]> {
    const data = await apiGet<{ messages: CrmMessage[] }>(`/api/admin/crm/messages?customerId=${customerId}`);
    return data.messages ?? [];
  },

  async getDocuments(customerId: string): Promise<CrmDocument[]> {
    const data = await apiGet<{ documents: CrmDocument[] }>(`/api/admin/crm/documents?customerId=${customerId}`);
    return data.documents ?? [];
  },
};
