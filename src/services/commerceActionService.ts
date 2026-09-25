async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) { if (res.status === 401) throw new Error('Admin sign-in required.'); throw new Error(`Request failed: ${res.status}`); }
  return res.json();
}
async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || `Request failed: ${res.status}`); }
  return res.json();
}
async function apiPatch<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || `Request failed: ${res.status}`); }
  return res.json();
}

export const commerceActionService = {
  // Fulfillment
  async getFulfillmentQueue() { return apiGet('/api/admin/fulfillment'); },
  async updateFulfillmentStatus(orderIds: string[], status: string) { return apiPatch('/api/admin/fulfillment', { orderIds, status }); },
  // Order actions
  async generatePackingSlip(orderId: string) { return apiPost(`/api/admin/orders/${orderId}/actions/packing-slip`); },
  async resendAlert(orderId: string, type: string) { return apiPost(`/api/admin/orders/${orderId}/actions/resend-alert`, { type }); },
  // Returns
  async getReturns(filter?: string) { return apiGet(`/api/admin/returns${filter ? `?filter=${filter}` : ''}`); },
  async processRefund(returnId: string, payload: { refundAmount: number; restockInventory: boolean }) { return apiPost(`/api/admin/returns/${returnId}/refund`, payload); },
  // Inventory
  async restockItem(payload: { sku: string; quantity: number; binLocation?: string; reason: string }) { return apiPost('/api/admin/inventory/restock', payload); },
};
