export const quickActionService = {
  async executeAction<T = unknown>(domain: string, action: string, payload: Record<string, unknown>): Promise<T> {
    const routeMap: Record<string, string> = {
      'crm': '/api/admin/crm/actions',
      'appointment': '/api/admin/crm/appointments/actions',
      'commerce': '/api/admin/commerce/actions',
      'finance': '/api/admin/finance/actions',
      'system': '/api/admin/system/actions',
    };
    const route = routeMap[domain] || `/api/admin/${domain}/actions`;
    const res = await fetch(route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...payload }) });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || `Action failed: ${res.status}`); }
    return res.json();
  },
  async globalSearch(query: string) {
    const res = await fetch(`/api/admin/system/global-search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('Global search failed');
    return res.json();
  },
};
