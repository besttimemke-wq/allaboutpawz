import { useState, useEffect, useCallback } from 'react';

export interface Order {
  id: string;
  email: string | null;
  customer_email: string | null;
  customer_id: string | null;
  status: string;
  payment_status: string | null;
  fulfillment_status: string;
  fulfillment_method: string | null;
  subtotal: string | null;
  total_amount: string | null;
  shipping_address: string | null;
  notes: string | null;
  tracking_number: string | null;
  carrier: string | null;
  tracking_status: string | null;
  created_at: string;
  items?: Array<{
    id: string;
    product_name: string;
    quantity: string;
    unit_price: string;
    line_total: string;
  }>;
}

export interface OrderFilters {
  status?: string;
  payment?: string;
}

export function useOrders(filters: OrderFilters = {}) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.payment) params.set('payment', filters.payment);
      const query = params.toString();
      const response = await fetch(`/api/admin/orders${query ? `?${query}` : ''}`);
      if (!response.ok) {
        if (response.status === 401) throw new Error('Admin sign-in required.');
        throw new Error('Failed to fetch orders');
      }
      const data = await response.json();
      setOrders(data.orders || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [filters.status, filters.payment]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const updateOrder = useCallback(async (id: string, updates: {
    fulfillment_status?: string;
    tracking_number?: string;
    carrier?: string;
  }) => {
    try {
      const response = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      if (!response.ok) throw new Error('Failed to update order');
      await loadOrders();
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, [loadOrders]);

  return { orders, isLoading, error, updateOrder, reload: loadOrders };
}
