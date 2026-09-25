import { useState, useEffect, useCallback } from 'react';

export interface PosCatalogItem {
  id: string;
  sku: string;
  name: string;
  item_type: string;
  price: number | string;
  stock: number | string | null;
  pos_enabled: boolean;
}

export interface PosCategory {
  id: string;
  name: string;
}

export interface PosPaymentMethod {
  id: string;
  code: string;
  name: string;
  method_type: string;
  processor: string | null;
}

export interface PosRegister {
  id: string;
  register_number: string;
  name: string;
  status: string;
  active: boolean;
  activeSession: any | null;
}

export interface PosTodaySummary {
  salesCount: number;
  grossSales: number;
  discounts: number;
  tax: number;
  netSales: number;
  cashSales: number;
  cardSales: number;
}

export interface PosSaleInput {
  items: Array<{ sku: string; name: string; quantity: number; unitPrice: number }>;
  paymentMethodId: string;
  customerId?: string;
  customerEmail?: string;
  registerId: string;
  tip?: number;
  notes?: string;
}

export function usePOS() {
  const [catalog, setCatalog] = useState<PosCatalogItem[]>([]);
  const [categories, setCategories] = useState<PosCategory[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PosPaymentMethod[]>([]);
  const [registers, setRegisters] = useState<PosRegister[]>([]);
  const [summary, setSummary] = useState<PosTodaySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/pos');
      if (!response.ok) {
        if (response.status === 401) throw new Error('Admin sign-in required.');
        throw new Error('Failed to fetch POS data');
      }
      const data = await response.json();
      setCatalog(data.catalog || []);
      setCategories(data.categories || []);
      setPaymentMethods(data.paymentMethods || []);
      setRegisters(data.registers || []);
      setSummary(data.todaySummary || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const completeSale = useCallback(async (sale: PosSaleInput) => {
    const response = await fetch('/api/admin/pos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete_sale', ...sale }),
    });
    if (!response.ok) throw new Error('Failed to complete sale');
    const result = await response.json();
    await load();
    return result;
  }, [load]);

  const openRegister = useCallback(async (registerId: string, openingCash: string) => {
    const response = await fetch('/api/admin/pos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'open_register', registerId, openingCash }),
    });
    if (!response.ok) throw new Error('Failed to open register');
    await load();
    return response.json();
  }, [load]);

  const closeRegister = useCallback(async (sessionId: string, countedCash: string) => {
    const response = await fetch('/api/admin/pos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'close_register', sessionId, countedCash }),
    });
    if (!response.ok) throw new Error('Failed to close register');
    await load();
    return response.json();
  }, [load]);

  const queryGiftCard = useCallback(async (cardNumber: string) => {
    const response = await fetch('/api/admin/pos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'query_gift_card', cardNumber }),
    });
    if (!response.ok) throw new Error('Gift card not found');
    return response.json();
  }, []);

  return {
    catalog,
    categories,
    paymentMethods,
    registers,
    summary,
    isLoading,
    error,
    completeSale,
    openRegister,
    closeRegister,
    queryGiftCard,
    reload: load,
  };
}
