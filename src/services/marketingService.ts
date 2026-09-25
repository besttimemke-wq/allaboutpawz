import type { CrmCampaign, CrmMessageTemplate, CrmSegment, CrmAutomationWorkflow } from '@/types/database/marketing';

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) { if (res.status === 401) throw new Error('Admin sign-in required.'); throw new Error(`Request failed: ${res.status}`); }
  return res.json();
}

export const marketingService = {
  async getCampaigns(): Promise<{ campaigns: CrmCampaign[]; templates: CrmMessageTemplate[]; segments: CrmSegment[] }> {
    return apiGet('/api/admin/marketing/campaigns');
  },
  async getAutomations(): Promise<{ workflows: CrmAutomationWorkflow[]; enrollments: any[]; runs: any[] }> {
    return apiGet('/api/admin/marketing/automations');
  },
};
