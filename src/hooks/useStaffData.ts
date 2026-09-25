import { useQuery } from '@tanstack/react-query';
import { staffService } from '@/services/staffService';

export const STAFF_QUERY_KEYS = {
  staff: ['staff', 'roster'] as const,
  schedules: ['staff', 'schedules'] as const,
};

export function useStaffRoster() {
  return useQuery({ queryKey: STAFF_QUERY_KEYS.staff, queryFn: () => staffService.getStaff(), staleTime: 60 * 1000 });
}

export function useStaffSchedules() {
  return useQuery({ queryKey: STAFF_QUERY_KEYS.schedules, queryFn: () => staffService.getSchedules(), staleTime: 30 * 1000 });
}
