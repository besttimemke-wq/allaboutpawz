import { useQuery } from "@tanstack/react-query";

// ============================================================================
// TanStack Query hooks — the single source of truth for server state.
// Each hook wraps a fetch call with automatic caching, background refetching,
// loading/error states, and cache invalidation. Pages call these hooks
// instead of writing boilerplate useEffect + useState + fetch.
// ============================================================================

// ---- Admin Dashboard ----

export function useDashboardKPIs() {
  return useQuery({
    queryKey: ["dashboard", "kpis"],
    queryFn: async () => {
      const r = await fetch("/api/admin/dashboard");
      if (!r.ok) return null;
      return r.json();
    },
    staleTime: 30_000, // 30s — KPIs don't change that fast
  });
}

export function useBookings(limit = 10) {
  return useQuery({
    queryKey: ["bookings", limit],
    queryFn: async () => {
      const r = await fetch(`/api/bookings?limit=${limit}`);
      if (!r.ok) return { appointments: [] };
      return r.json();
    },
    staleTime: 15_000,
  });
}

export function useStaff(limit = 10) {
  return useQuery({
    queryKey: ["staff", limit],
    queryFn: async () => {
      const r = await fetch(`/api/admin/crm/staff?limit=${limit}`);
      if (!r.ok) return { staff: [] };
      return r.json();
    },
    staleTime: 60_000,
  });
}

export function useGroomingRecords(limit = 5) {
  return useQuery({
    queryKey: ["grooming-records", limit],
    queryFn: async () => {
      const r = await fetch(`/api/admin/crm/grooming-records?limit=${limit}`);
      if (!r.ok) return { records: [] };
      return r.json();
    },
    staleTime: 60_000,
  });
}

// ---- CRM ----

export function useCustomers(limit = 200, search = "") {
  return useQuery({
    queryKey: ["customers", limit, search],
    queryFn: async () => {
      const qs = search ? `?search=${encodeURIComponent(search)}&limit=${limit}` : `?limit=${limit}`;
      const r = await fetch(`/api/admin/crm/customers${qs}`);
      if (!r.ok) return { customers: [] };
      return r.json();
    },
    staleTime: 30_000,
  });
}

// ---- Customer Portal ----

export function useCustomerOrders(limit = 50) {
  return useQuery({
    queryKey: ["customer-orders", limit],
    queryFn: async () => {
      const r = await fetch(`/api/customer/orders?limit=${limit}`);
      if (!r.ok) return { orders: [] };
      return r.json();
    },
    staleTime: 60_000,
  });
}

export function useCustomerAccount() {
  return useQuery({
    queryKey: ["customer-account"],
    queryFn: async () => {
      const r = await fetch("/api/customer/account");
      if (!r.ok) return null;
      return r.json();
    },
    staleTime: 60_000,
  });
}

// ---- Financial Reports (call the 4 PostgreSQL RPC functions via the
// /api/admin/finance/actions quick-action route) ----

interface ReportDateRange { startDate: string; endDate: string; }
interface ReportAsOfDate { asOfDate: string; }

export function useProfitLoss(range: ReportDateRange | null) {
  return useQuery({
    queryKey: ["analytics", "profit-loss", range],
    queryFn: async () => {
      if (!range) return null;
      const r = await fetch("/api/admin/finance/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "accts_run_profit_loss",
          payload: { start_date: range.startDate, end_date: range.endDate },
        }),
      });
      if (!r.ok) return null;
      const json = await r.json();
      return json?.profitAndLoss ?? null;
    },
    enabled: !!range,
    staleTime: 60_000,
  });
}

export function useBalanceSheet(asOf: ReportAsOfDate | null) {
  return useQuery({
    queryKey: ["analytics", "balance-sheet", asOf],
    queryFn: async () => {
      if (!asOf) return null;
      const r = await fetch("/api/admin/finance/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "accts_run_balance_sheet",
          payload: { as_of_date: asOf.asOfDate },
        }),
      });
      if (!r.ok) return null;
      const json = await r.json();
      return json?.balanceSheet ?? null;
    },
    enabled: !!asOf,
    staleTime: 60_000,
  });
}

export function useTrialBalance(asOf: ReportAsOfDate | null) {
  return useQuery({
    queryKey: ["analytics", "trial-balance", asOf],
    queryFn: async () => {
      if (!asOf) return null;
      const r = await fetch("/api/admin/finance/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "accts_run_trial_balance",
          payload: { end_date: asOf.asOfDate },
        }),
      });
      if (!r.ok) return null;
      const json = await r.json();
      return json?.trialBalance ?? null;
    },
    enabled: !!asOf,
    staleTime: 60_000,
  });
}

export function useGeneralLedger(range: ReportDateRange | null) {
  return useQuery({
    queryKey: ["analytics", "general-ledger", range],
    queryFn: async () => {
      if (!range) return null;
      const r = await fetch("/api/admin/finance/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "accts_run_general_ledger",
          payload: { start_date: range.startDate, end_date: range.endDate },
        }),
      });
      if (!r.ok) return null;
      const json = await r.json();
      return json?.generalLedger ?? null;
    },
    enabled: !!range,
    staleTime: 60_000,
  });
}

// ---- Operations Analytics (call the 3 inline-SQL analytics handlers via
// /api/admin/analytics/actions) ----

export function useBookingsFunnel(range: ReportDateRange | null) {
  return useQuery({
    queryKey: ["analytics", "bookings-funnel", range],
    queryFn: async () => {
      if (!range) return null;
      const r = await fetch("/api/admin/analytics/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "analytics_view_bookings_funnel",
          payload: { start_date: range.startDate, end_date: range.endDate },
        }),
      });
      if (!r.ok) return null;
      const json = await r.json();
      return json?.bookingsFunnel ?? null;
    },
    enabled: !!range,
    staleTime: 60_000,
  });
}

export function useNoShowRate(range: ReportDateRange | null) {
  return useQuery({
    queryKey: ["analytics", "no-show-rate", range],
    queryFn: async () => {
      if (!range) return null;
      const r = await fetch("/api/admin/analytics/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "analytics_view_no_show_rate",
          payload: { start_date: range.startDate, end_date: range.endDate },
        }),
      });
      if (!r.ok) return null;
      const json = await r.json();
      return json?.noShowRate ?? null;
    },
    enabled: !!range,
    staleTime: 60_000,
  });
}

export function useRebookRate(range: ReportDateRange | null) {
  return useQuery({
    queryKey: ["analytics", "rebook-rate", range],
    queryFn: async () => {
      if (!range) return null;
      const r = await fetch("/api/admin/analytics/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "analytics_view_rebook_rate",
          payload: { start_date: range.startDate, end_date: range.endDate },
        }),
      });
      if (!r.ok) return null;
      const json = await r.json();
      return json?.rebookRate ?? null;
    },
    enabled: !!range,
    staleTime: 60_000,
  });
}

// ---- Entity Reports (10 SQL aggregation reports via
// /api/admin/analytics/actions) ----

export function useDailyRevenue(range: ReportDateRange | null) {
  return useQuery({
    queryKey: ["analytics", "daily-revenue", range],
    queryFn: async () => {
      const r = await fetch("/api/admin/analytics/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "analytics_view_daily_revenue",
          payload: range ? { start_date: range.startDate, end_date: range.endDate } : {},
        }),
      });
      if (!r.ok) return null;
      const json = await r.json();
      return json?.dailyRevenue ?? null;
    },
    staleTime: 60_000,
  });
}

export function useServiceRevenue(range: ReportDateRange | null) {
  return useQuery({
    queryKey: ["analytics", "service-revenue", range],
    queryFn: async () => {
      const r = await fetch("/api/admin/analytics/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "analytics_view_service_revenue",
          payload: range ? { start_date: range.startDate, end_date: range.endDate } : {},
        }),
      });
      if (!r.ok) return null;
      const json = await r.json();
      return json?.serviceRevenue ?? null;
    },
    enabled: !!range,
    staleTime: 60_000,
  });
}

export function useProductSales(range: ReportDateRange | null) {
  return useQuery({
    queryKey: ["analytics", "product-sales", range],
    queryFn: async () => {
      const r = await fetch("/api/admin/analytics/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "analytics_view_product_sales",
          payload: range ? { start_date: range.startDate, end_date: range.endDate } : {},
        }),
      });
      if (!r.ok) return null;
      const json = await r.json();
      return json?.productSales ?? null;
    },
    enabled: !!range,
    staleTime: 60_000,
  });
}

export function useMultiLocationRevenue(range: ReportDateRange | null) {
  return useQuery({
    queryKey: ["analytics", "multi-location-revenue", range],
    queryFn: async () => {
      const r = await fetch("/api/admin/analytics/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "analytics_view_multi_location_revenue",
          payload: range ? { start_date: range.startDate, end_date: range.endDate } : {},
        }),
      });
      if (!r.ok) return null;
      const json = await r.json();
      return json?.multiLocationRevenue ?? null;
    },
    enabled: !!range,
    staleTime: 60_000,
  });
}

export function useGroomerPerformance(range: ReportDateRange | null) {
  return useQuery({
    queryKey: ["analytics", "groomer-performance", range],
    queryFn: async () => {
      const r = await fetch("/api/admin/analytics/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "analytics_view_groomer_performance",
          payload: range ? { start_date: range.startDate, end_date: range.endDate } : {},
        }),
      });
      if (!r.ok) return null;
      const json = await r.json();
      return json?.groomerPerformance ?? null;
    },
    enabled: !!range,
    staleTime: 60_000,
  });
}

export function useCustomerAcquisition() {
  return useQuery({
    queryKey: ["analytics", "customer-acquisition"],
    queryFn: async () => {
      const r = await fetch("/api/admin/analytics/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "analytics_view_customer_acquisition", payload: {} }),
      });
      if (!r.ok) return null;
      const json = await r.json();
      return json?.customerAcquisition ?? null;
    },
    staleTime: 60_000,
  });
}

export function useARAging(asOf?: ReportAsOfDate | null) {
  return useQuery({
    queryKey: ["analytics", "ar-aging", asOf],
    queryFn: async () => {
      const r = await fetch("/api/admin/analytics/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "analytics_view_ar_aging",
          payload: asOf ? { as_of_date: asOf.asOfDate } : {},
        }),
      });
      if (!r.ok) return null;
      const json = await r.json();
      return json?.arAging ?? null;
    },
    staleTime: 60_000,
  });
}

export function useGiftCardLiability() {
  return useQuery({
    queryKey: ["analytics", "gift-card-liability"],
    queryFn: async () => {
      const r = await fetch("/api/admin/analytics/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "analytics_view_gift_card_liability", payload: {} }),
      });
      if (!r.ok) return null;
      const json = await r.json();
      return json?.giftCardLiability ?? null;
    },
    staleTime: 60_000,
  });
}

export function useStoreCreditLiability() {
  return useQuery({
    queryKey: ["analytics", "store-credit-liability"],
    queryFn: async () => {
      const r = await fetch("/api/admin/analytics/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "analytics_view_store_credit_liability", payload: {} }),
      });
      if (!r.ok) return null;
      const json = await r.json();
      return json?.storeCreditLiability ?? null;
    },
    staleTime: 60_000,
  });
}

export function useDepositLiability() {
  return useQuery({
    queryKey: ["analytics", "deposit-liability"],
    queryFn: async () => {
      const r = await fetch("/api/admin/analytics/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "analytics_view_deposit_liability", payload: {} }),
      });
      if (!r.ok) return null;
      const json = await r.json();
      return json?.depositLiability ?? null;
    },
    staleTime: 60_000,
  });
}
