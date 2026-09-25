// ============================================================================
// Finance Service Layer — data access over gated API routes
// ============================================================================

import type {
  AcctBook, AcctChartOfAccounts, AcctArInvoice, AcctArReceipt,
  AcctBankAccount, AcctBankTransaction, AcctPayrollRun, AcctEmployee,
  AcctTaxCode, AcctTaxJurisdiction, CommerceGiftCard,
  AcctEntity, AcctFiscalYear, AcctPeriod, AcctCurrency,
} from '@/types/database/finance';

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 401) throw new Error('Admin sign-in required.');
    throw new Error(`Request failed: ${res.status}`);
  }
  return res.json();
}

export const financeService = {
  // Books + Chart of Accounts
  async getBooks(): Promise<{ books: AcctBook[]; chartOfAccounts: AcctChartOfAccounts[] }> {
    return apiGet('/api/admin/books');
  },

  // Invoices (existing route)
  async getInvoices(): Promise<AcctArInvoice[]> {
    const data = await apiGet<{ invoices: AcctArInvoice[] }>('/api/admin/invoices');
    return data.invoices ?? [];
  },

  // Payments (existing route, shared with CRM)
  async getPayments(): Promise<any[]> {
    const data = await apiGet<{ payments: any[] }>('/api/admin/payments');
    return data.payments ?? [];
  },

  // Deposits (existing route)
  async getDeposits(): Promise<any[]> {
    const data = await apiGet<{ deposits: any[] }>('/api/admin/deposits');
    return data.deposits ?? [];
  },

  // Refunds (existing route)
  async getRefunds(): Promise<any[]> {
    const data = await apiGet<{ refunds: any[] }>('/api/admin/refunds');
    return data.refunds ?? [];
  },

  // Gift Cards
  async getGiftCards(): Promise<CommerceGiftCard[]> {
    const data = await apiGet<{ giftCards: CommerceGiftCard[] }>('/api/admin/gift-cards');
    return data.giftCards ?? [];
  },

  // Payroll (existing route)
  async getPayroll(): Promise<AcctPayrollRun[]> {
    const data = await apiGet<{ payroll: AcctPayrollRun[] }>('/api/admin/payroll');
    return data.payroll ?? [];
  },

  // Taxes
  async getTaxes(): Promise<{ taxCodes: AcctTaxCode[]; jurisdictions: AcctTaxJurisdiction[] }> {
    return apiGet('/api/admin/taxes');
  },

  // Reports (journal entries + lines)
  async getReports(): Promise<any> {
    return apiGet('/api/admin/reports');
  },

  // Financial Settings
  async getFinancialSettings(): Promise<{
    entities: AcctEntity[];
    fiscalYears: AcctFiscalYear[];
    periods: AcctPeriod[];
    currencies: AcctCurrency[];
    books: AcctBook[];
  }> {
    return apiGet('/api/admin/financial-settings');
  },

  // Stripe Connections
  async getStripeConnections(): Promise<any[]> {
    const data = await apiGet<{ stripePaymentMethods: any[] }>('/api/admin/stripe-connections');
    return data.stripePaymentMethods ?? [];
  },
};
