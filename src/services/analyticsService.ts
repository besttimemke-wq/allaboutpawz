async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) { if (res.status === 401) throw new Error('Admin sign-in required.'); throw new Error(`Request failed: ${res.status}`); }
  return res.json();
}

export const analyticsService = {
  async getOverview() { return apiGet('/api/admin/analytics/overview'); },
  async getRevenue(range?: string) { return apiGet(`/api/admin/analytics/revenue?range=${range || '30'}`); },
  async getOperations() { return apiGet('/api/admin/analytics/operations'); },
};
