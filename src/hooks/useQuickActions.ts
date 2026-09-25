import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { quickActionService } from '@/services/quickActionService';

export function useQuickActions() {
  const queryClient = useQueryClient();
  const dispatchAction = useMutation({
    mutationFn: ({ domain, action, payload }: { domain: string; action: string; payload: Record<string, unknown> }) =>
      quickActionService.executeAction(domain, action, payload),
    onSuccess: (_, variables) => {
      toast.success(`Action executed: ${variables.action.replace(/_/g, ' ')}`);
      queryClient.invalidateQueries({ queryKey: [variables.domain] });
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Action execution failed');
    },
  });
  return { execute: dispatchAction.mutateAsync, isLoading: dispatchAction.isPending };
}
