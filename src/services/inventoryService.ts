import type { CatalogItem, InventoryMovement, ErpVendor, ErpPurchaseOrder } from '@/types/database/inventory';

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) { if (res.status === 401) throw new Error('Admin sign-in required.'); throw new Error(`Request failed: ${res.status}`); }
  return res.json();
}

export const inventoryService = {
  async getCatalog(): Promise<CatalogItem[]> {
    const data = await apiGet<{ catalogItems: CatalogItem[] }>('/api/admin/inventory');
    return data.catalogItems ?? [];
  },
  async getMovements(): Promise<InventoryMovement[]> {
    const data = await apiGet<{ movements: InventoryMovement[] }>('/api/admin/inventory');
    return data.movements ?? [];
  },
  async getPurchaseOrders(): Promise<ErpPurchaseOrder[]> {
    const data = await apiGet<{ purchaseOrders: ErpPurchaseOrder[] }>('/api/admin/purchase-orders');
    return data.purchaseOrders ?? [];
  },
  async getVendors(): Promise<ErpVendor[]> {
    const data = await apiGet<{ vendors: ErpVendor[] }>('/api/admin/purchase-orders');
    return data.vendors ?? [];
  },
};
