import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commerceActionService } from '@/services/commerceActionService';

export const COMMERCE_QUERY_KEYS = {
  fulfillment: ['commerce', 'fulfillment'] as const,
  returns: (filter?: string) => ['commerce', 'returns', filter ?? 'all'] as const,
};

export function useFulfillmentQueue() {
  return useQuery({ queryKey: COMMERCE_QUERY_KEYS.fulfillment, queryFn: () => commerceActionService.getFulfillmentQueue(), staleTime: 15 * 1000 });
}

export function useUpdateFulfillmentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderIds, status }: { orderIds: string[]; status: string }) => commerceActionService.updateFulfillmentStatus(orderIds, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: COMMERCE_QUERY_KEYS.fulfillment }); qc.invalidateQueries({ queryKey: ['admin', 'orders'] }); },
  });
}

export function usePackingSlip() {
  return useMutation({ mutationFn: (orderId: string) => commerceActionService.generatePackingSlip(orderId) });
}

export function useResendAlert() {
  return useMutation({ mutationFn: ({ orderId, type }: { orderId: string; type: string }) => commerceActionService.resendAlert(orderId, type) });
}

export function useReturns(filter?: string) {
  return useQuery({ queryKey: COMMERCE_QUERY_KEYS.returns(filter), queryFn: () => commerceActionService.getReturns(filter), staleTime: 30 * 1000 });
}

export function useProcessRefund() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ returnId, payload }: { returnId: string; payload: { refundAmount: number; restockInventory: boolean } }) => commerceActionService.processRefund(returnId, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['commerce', 'returns'] }); },
  });
}

export function useRestockItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { sku: string; quantity: number; binLocation?: string; reason: string }) => commerceActionService.restockItem(payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory', 'catalog'] }); qc.invalidateQueries({ queryKey: ['inventory', 'movements'] }); },
  });
}
