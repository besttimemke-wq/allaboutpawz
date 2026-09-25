import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/services/analyticsService';

export const ANALYTICS_QUERY_KEYS = {
  overview: ['analytics', 'overview'] as const,
  revenue: (range: string) => ['analytics', 'revenue', range] as const,
  operations: ['analytics', 'operations'] as const,
};

export function useExecutiveOverview() {
  return useQuery({ queryKey: ANALYTICS_QUERY_KEYS.overview, queryFn: () => analyticsService.getOverview(), staleTime: 60 * 1000 });
}
export function useRevenueAnalytics(range?: string) {
  const r = range || '30';
  return useQuery({ queryKey: ANALYTICS_QUERY_KEYS.revenue(r), queryFn: () => analyticsService.getRevenue(r), staleTime: 60 * 1000 });
}
export function useOperationsAnalytics() {
  return useQuery({ queryKey: ANALYTICS_QUERY_KEYS.operations, queryFn: () => analyticsService.getOperations(), staleTime: 60 * 1000 });
}
