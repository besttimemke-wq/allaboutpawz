import { useState, useEffect, useCallback } from 'react';

export interface PosCatalogItem {
  id: string;
  sku: string;
  name: string;
  itemType: 'product' | 'service' | 'subscription';
  price: number;
  compareAtPrice: number | null;
  stock: number | null;
  categoryName?: string;
}

export interface PosCategory {
  id: string | null;
  name: string;
  itemCount: number;
}

export interface PosPaymentMethod {
  id: string;
  code: string;
  name: string;
  methodType: string;
}

export interface PosRegister {
  id: string;
  registerNumber: string;
  name: string;
  status: string;
  active: boolean;
  activeSession: {
    id: string;
    openingCash: number;
    expectedCash: number;
    openedAt: string;
  } | null;
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

export interface PosSaleLine {
  catalogItemId?: string;
  serviceId?: string;
  subscriptionPlanId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  itemType: 'product' | 'service' | 'subscription';
}

export interface PosPayment {
  paymentMethodId: string;
  amount: number;
  tipAmount?: number;
  giftCardNumber?: string;
  checkReference?: string;
}

export interface PosSaleResult {
  sale: {
    receiptNumber: string;
    total: number;
    changeDue: number;
    journalEntryId?: string;
    receiptRaw?: string;
  };
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
      const res = await fetch('/api/admin/pos');
      if (!res.ok) {
        if (res.status === 401) throw new Error('Admin sign-in required.');
        return;
      }
      const data = await res.json();
      setCatalog(data.catalog || []);
      setCategories(data.categories || []);
      setPaymentMethods(data.paymentMethods || []);
      setRegisters(data.registers || []);
      setSummary(data.todaySummary || null);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openRegister = useCallback(async (registerId: string, openingCash: number) => {
    const res = await fetch('/api/admin/pos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'open_register', registerId, openingCash }),
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'Failed to open register');
    }
    await load();
    return res.json();
  }, [load]);

  const closeRegister = useCallback(async (sessionId: string, countedCash: string) => {
    const res = await fetch('/api/admin/pos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'close_register', sessionId, countedCash }),
    });
    if (!res.ok) throw new Error('Failed to close register');
    await load();
    return res.json();
  }, [load]);

  const completeSale = useCallback(async (params: {
    registerSessionId: string;
    lines: PosSaleLine[];
    discountTotal: number;
    taxTotal: number;
    payments: PosPayment[];
    customerEmail?: string;
  }): Promise<PosSaleResult> => {
    const idempotencyKey = crypto.randomUUID();
    const res = await fetch('/api/admin/pos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'complete_sale',
        idempotencyKey,
        registerSessionId: params.registerSessionId,
        lines: params.lines,
        discountTotal: params.discountTotal,
        taxTotal: params.taxTotal,
        payments: params.payments,
        customerEmail: params.customerEmail,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Sale failed');
    await load();
    return data as PosSaleResult;
  }, [load]);

  const queryGiftCard = useCallback(async (cardNumber: string) => {
    const res = await fetch('/api/admin/pos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'query_gift_card', cardNumber }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gift card not found');
    return data;
  }, []);

  return {
    catalog,
    categories,
    paymentMethods,
    registers,
    summary,
    isLoading,
    error,
    openRegister,
    closeRegister,
    completeSale,
    queryGiftCard,
    reload: load,
  };
}
