import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingService } from '@/services/bookingService';
import type { CrmAppointmentFull } from '@/types/database/booking';

export const BOOKING_QUERY_KEYS = {
  appointments: (filters?: { status?: string }) => ['booking', 'appointments', filters?.status ?? 'all'] as const,
  calendar: (date: string) => ['booking', 'calendar', date] as const,
};

export function useAppointments(filters?: { status?: string; startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: BOOKING_QUERY_KEYS.appointments(filters),
    queryFn: () => bookingService.getAppointments(filters),
    staleTime: 30 * 1000, // 30 seconds — appointments change frequently
  });
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => bookingService.updateAppointment(id, updates),
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['booking', 'appointments'] });
      const previous = queryClient.getQueryData<CrmAppointmentFull[]>(['booking', 'appointments', 'all']) || [];
      const optimistic = previous.map(a => a.id === id ? { ...a, ...updates } : a);
      queryClient.setQueryData(['booking', 'appointments', 'all'], optimistic);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['booking', 'appointments', 'all'], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', 'appointments'] });
    },
  });
}
