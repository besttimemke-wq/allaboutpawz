// ============================================================================
// Finance TanStack Query Hooks — SWR caching over gated API routes
// ============================================================================

import { useQuery } from '@tanstack/react-query';
import { financeService } from '@/services/financeService';

export const FINANCE_QUERY_KEYS = {
  books: ['finance', 'books'] as const,
  invoices: ['finance', 'invoices'] as const,
  payments: ['finance', 'payments'] as const,
  deposits: ['finance', 'deposits'] as const,
  refunds: ['finance', 'refunds'] as const,
  giftCards: ['finance', 'gift-cards'] as const,
  payroll: ['finance', 'payroll'] as const,
  taxes: ['finance', 'taxes'] as const,
  reports: ['finance', 'reports'] as const,
  financialSettings: ['finance', 'financial-settings'] as const,
  stripeConnections: ['finance', 'stripe-connections'] as const,
};

export function useBooks() {
  return useQuery({
    queryKey: FINANCE_QUERY_KEYS.books,
    queryFn: () => financeService.getBooks(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useInvoices() {
  return useQuery({
    queryKey: FINANCE_QUERY_KEYS.invoices,
    queryFn: () => financeService.getInvoices(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useFinancePayments() {
  return useQuery({
    queryKey: FINANCE_QUERY_KEYS.payments,
    queryFn: () => financeService.getPayments(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useDeposits() {
  return useQuery({
    queryKey: FINANCE_QUERY_KEYS.deposits,
    queryFn: () => financeService.getDeposits(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useRefunds() {
  return useQuery({
    queryKey: FINANCE_QUERY_KEYS.refunds,
    queryFn: () => financeService.getRefunds(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useGiftCards() {
  return useQuery({
    queryKey: FINANCE_QUERY_KEYS.giftCards,
    queryFn: () => financeService.getGiftCards(),
    staleTime: 5 * 60 * 1000,
  });
}

export function usePayroll() {
  return useQuery({
    queryKey: FINANCE_QUERY_KEYS.payroll,
    queryFn: () => financeService.getPayroll(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useTaxes() {
  return useQuery({
    queryKey: FINANCE_QUERY_KEYS.taxes,
    queryFn: () => financeService.getTaxes(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useFinanceReports() {
  return useQuery({
    queryKey: FINANCE_QUERY_KEYS.reports,
    queryFn: () => financeService.getReports(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useFinancialSettings() {
  return useQuery({
    queryKey: FINANCE_QUERY_KEYS.financialSettings,
    queryFn: () => financeService.getFinancialSettings(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useStripeConnections() {
  return useQuery({
    queryKey: FINANCE_QUERY_KEYS.stripeConnections,
    queryFn: () => financeService.getStripeConnections(),
    staleTime: 5 * 60 * 1000,
  });
}
