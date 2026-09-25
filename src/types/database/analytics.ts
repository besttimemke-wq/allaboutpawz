export interface ExecutiveKpis {
  total_revenue: number;
  total_appointments: number;
  active_customers: number;
  average_ticket: number;
  completion_rate: number;
  total_orders: number;
  total_payments: number;
  active_staff: number;
  inventory_movements: number;
}

export interface RevenueTrendPoint {
  date: string;
  revenue: number;
  order_count: number;
}

export interface PaymentMethodBreakdown {
  method_name: string;
  method_type: string;
  total_amount: number;
  count: number;
}

export interface GroomerPerformanceMetric {
  staff_id: string;
  display_name: string;
  appointment_count: number;
  completed_count: number;
  cancellation_count: number;
  no_show_count: number;
  total_revenue: number;
  completion_rate: number;
}

export interface CustomerRetentionMetric {
  total_customers: number;
  avg_lifetime_value: number;
  avg_rebook_rate: number;
  avg_no_show_rate: number;
  avg_cancellation_rate: number;
  vip_customers: number;
  at_risk_customers: number;
}

export interface InventoryTurnoverMetric {
  total_items: number;
  total_movements: number;
  total_stock_value: number;
  low_stock_count: number;
}
