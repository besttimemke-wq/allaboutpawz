import { useQuery } from '@tanstack/react-query';
import { inventoryService } from '@/services/inventoryService';

export const INVENTORY_QUERY_KEYS = {
  catalog: ['inventory', 'catalog'] as const,
  movements: ['inventory', 'movements'] as const,
  purchaseOrders: ['inventory', 'purchase-orders'] as const,
  vendors: ['inventory', 'vendors'] as const,
};

export function useCatalog() {
  return useQuery({ queryKey: INVENTORY_QUERY_KEYS.catalog, queryFn: () => inventoryService.getCatalog(), staleTime: 30 * 1000 });
}
export function useInventoryMovements() {
  return useQuery({ queryKey: INVENTORY_QUERY_KEYS.movements, queryFn: () => inventoryService.getMovements(), staleTime: 30 * 1000 });
}
export function usePurchaseOrders() {
  return useQuery({ queryKey: INVENTORY_QUERY_KEYS.purchaseOrders, queryFn: () => inventoryService.getPurchaseOrders(), staleTime: 5 * 60 * 1000 });
}
export function useVendors() {
  return useQuery({ queryKey: INVENTORY_QUERY_KEYS.vendors, queryFn: () => inventoryService.getVendors(), staleTime: 5 * 60 * 1000 });
}
