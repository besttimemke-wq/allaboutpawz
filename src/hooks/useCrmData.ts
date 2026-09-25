// ============================================================================
// CRM TanStack Query Hooks — client-side SWR caching + optimistic updates.
//
// All hooks call crmService which routes through gated /api/admin/crm/*
// endpoints. The tenant_id is resolved server-side by requireAdminApi() +
// TENANT_ID() — the client never passes it.
// ============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { crmService } from '@/services/crmService';
import type { CrmCustomer, CrmPet, CrmAppointment } from '@/types/database/crm';

export const CRM_QUERY_KEYS = {
  customers: ['crm', 'customers'] as const,
  customer: (id: string) => ['crm', 'customer', id] as const,
  pets: (customerId: string) => ['crm', 'pets', customerId] as const,
  allPets: ['crm', 'pets'] as const,
  services: ['crm', 'services'] as const,
  appointments: (startDate?: string, endDate?: string) =>
    ['crm', 'appointments', startDate, endDate] as const,
  staff: ['crm', 'staff'] as const,
  locations: ['crm', 'locations'] as const,
  payments: (customerId?: string) => ['crm', 'payments', customerId ?? 'all'] as const,
  notes: (customerId: string) => ['crm', 'customer', customerId, 'notes'] as const,
  messages: (customerId: string) => ['crm', 'customer', customerId, 'messages'] as const,
  documents: (customerId: string) => ['crm', 'customer', customerId, 'documents'] as const,
};

// --- Customers ---
export function useCustomers() {
  return useQuery({
    queryKey: CRM_QUERY_KEYS.customers,
    queryFn: () => crmService.getCustomers(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCustomer(customerId: string) {
  return useQuery({
    queryKey: CRM_QUERY_KEYS.customer(customerId),
    queryFn: () => crmService.getCustomerById(customerId),
    enabled: Boolean(customerId),
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<CrmCustomer>) => crmService.createCustomer(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CRM_QUERY_KEYS.customers });
    },
  });
}

// --- Pets ---
export function useCustomerPets(customerId: string) {
  return useQuery({
    queryKey: CRM_QUERY_KEYS.pets(customerId),
    queryFn: () => crmService.getPetsByCustomer(customerId),
    enabled: Boolean(customerId),
  });
}

export function useAllPets() {
  return useQuery({
    queryKey: CRM_QUERY_KEYS.allPets,
    queryFn: () => crmService.getAllPets(),
    staleTime: 5 * 60 * 1000,
  });
}

// --- Services ---
export function useServices() {
  return useQuery({
    queryKey: CRM_QUERY_KEYS.services,
    queryFn: () => crmService.getServices(),
    staleTime: 10 * 60 * 1000,
  });
}

// --- Appointments ---
export function useAppointments(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: CRM_QUERY_KEYS.appointments(startDate, endDate),
    queryFn: () => crmService.getAppointments(startDate, endDate),
    enabled: true,
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<CrmAppointment>) => crmService.createAppointment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'appointments'] });
    },
  });
}

// --- Staff ---
export function useStaff() {
  return useQuery({
    queryKey: CRM_QUERY_KEYS.staff,
    queryFn: () => crmService.getStaff(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<CrmCustomer>) => crmService.createStaff(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CRM_QUERY_KEYS.staff });
    },
  });
}

// --- Locations ---
export function useLocations() {
  return useQuery({
    queryKey: CRM_QUERY_KEYS.locations,
    queryFn: () => crmService.getLocations(),
    staleTime: 10 * 60 * 1000,
  });
}

// --- Payments ---
export function usePayments(customerId?: string) {
  return useQuery({
    queryKey: CRM_QUERY_KEYS.payments(customerId),
    queryFn: () => crmService.getPayments(customerId),
    staleTime: 2 * 60 * 1000,
  });
}

// --- Customer Sub-Tabs ---
export function useCustomerSubTabs(customerId: string) {
  const queryClient = useQueryClient();

  const notesQuery = useQuery({
    queryKey: CRM_QUERY_KEYS.notes(customerId),
    queryFn: () => crmService.getNotes(customerId),
    enabled: Boolean(customerId),
  });

  const messagesQuery = useQuery({
    queryKey: CRM_QUERY_KEYS.messages(customerId),
    queryFn: () => crmService.getMessages(customerId),
    enabled: Boolean(customerId),
  });

  const documentsQuery = useQuery({
    queryKey: CRM_QUERY_KEYS.documents(customerId),
    queryFn: () => crmService.getDocuments(customerId),
    enabled: Boolean(customerId),
  });

  const addNoteMutation = useMutation({
    mutationFn: (note: { note_type: string; body: string; is_pinned?: boolean }) =>
      crmService.createNote({ customer_id: customerId, ...note }),
    onMutate: async (newNote) => {
      await queryClient.cancelQueries({ queryKey: CRM_QUERY_KEYS.notes(customerId) });
      const previousNotes = queryClient.getQueryData(CRM_QUERY_KEYS.notes(customerId)) || [];
      const optimisticNote = {
        id: `temp-${Date.now()}`,
        tenant_id: 'temp',
        customer_id: customerId,
        pet_id: null,
        appointment_id: null,
        grooming_record_id: null,
        created_by: null,
        note_type: newNote.note_type,
        body: newNote.body,
        is_pinned: newNote.is_pinned || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      queryClient.setQueryData(CRM_QUERY_KEYS.notes(customerId), [optimisticNote, ...previousNotes]);
      return { previousNotes };
    },
    onError: (_err, _newNote, context) => {
      if (context?.previousNotes) {
        queryClient.setQueryData(CRM_QUERY_KEYS.notes(customerId), context.previousNotes);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CRM_QUERY_KEYS.notes(customerId) });
    },
  });

  return {
    notes: notesQuery.data ?? [],
    messages: messagesQuery.data ?? [],
    documents: documentsQuery.data ?? [],
    isLoading: notesQuery.isLoading || messagesQuery.isLoading || documentsQuery.isLoading,
    isError: notesQuery.isError || messagesQuery.isError || documentsQuery.isError,
    error: notesQuery.error || messagesQuery.error || documentsQuery.error,
    addNote: addNoteMutation.mutateAsync,
  };
}
