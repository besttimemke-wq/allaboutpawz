import { useQuery } from '@tanstack/react-query';
import { marketingService } from '@/services/marketingService';

export const MARKETING_QUERY_KEYS = {
  campaigns: ['marketing', 'campaigns'] as const,
  automations: ['marketing', 'automations'] as const,
};

export function useCampaigns() {
  return useQuery({ queryKey: MARKETING_QUERY_KEYS.campaigns, queryFn: () => marketingService.getCampaigns(), staleTime: 60 * 1000 });
}
export function useAutomations() {
  return useQuery({ queryKey: MARKETING_QUERY_KEYS.automations, queryFn: () => marketingService.getAutomations(), staleTime: 30 * 1000 });
}
