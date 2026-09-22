'use client';

import { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Search, ShoppingCart, User, Package, Scissors, Repeat, RefreshCw,
  Plus, Minus, X, DollarSign, Receipt, Lock, Unlock, ArrowUpCircle, ArrowDownCircle,
  Tag, Percent, Wallet,
} from 'lucide-react';

type CatalogItem = {
  id: string;
  sku: string;
  name: string;
  itemType: 'product' | 'service' | 'subscription';
  price: number;
  compareAtPrice: number | null;
  stock: number | null;
  serviceName?: string | null;
  subscriptionPlanCode?: string | null;
};

type PaymentMethod = {
  id: string;
  code: string;
  name: string;
  methodType: string;
};

type Register = {
  id: string;
  registerNumber: string;
  name: string;
  activeSession: {
    id: string;
    openingCash: number;
    expectedCash: number;
    openedAt: string;
  } | null;
};

type CartLine = {
  key: string;
  catalogItemId?: string;
  serviceId?: string;
  subscriptionPlanId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  itemType: 'product' | 'service' | 'subscription';
};

type TodaySummary = {
  salesCount: number;
  grossSales: number;
  discounts: number;
  tax: number;
  netSales: number;
  cashSales: number;
  cardSales: number;
};

export default function PosPage() {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [registers, setRegisters] = useState<Register[]>([]);
  const [summary, setSummary] = useState<TodaySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'product' | 'service' | 'subscription'>('all');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerEmail, setCustomerEmail] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [showOpenDrawer, setShowOpenDrawer] = useState(false);
  const [openingCash, setOpeningCash] = useState('100.00');
  const [busy, setBusy] = useState(false);
  const [lastSale, setLastSale] = useState<{ saleNumber: string; receiptNumber: string; total: number; changeDue: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeRegister = registers[0];
  const activeSession = activeRegister?.activeSession;

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/pos');
      if (!res.ok) return;
      const data = await res.json();
      setCatalog(data.catalog || []);
      setPaymentMethods(data.paymentMethods || []);
      setRegisters(data.registers || []);
      setSummary(data.todaySummary || null);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = catalog.filter((c) => {
    if (filter !== 'all' && c.itemType !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.sku.toLowerCase().includes(q);
    }
    return true;
  });

  const addToCart = (item: CatalogItem) => {
    setCart((prev) => {
      const key = `${item.itemType}-${item.id}`;
      const existing = prev.find((l) => l.key === key);
      if (existing) {
        return prev.map((l) => l.key === key ? { ...l, quantity: l.quantity + 1 } : l);
      }
      return [...prev, {
        key,
        catalogItemId: item.itemType === 'product' ? item.id : undefined,
        serviceId: item.itemType === 'service' ? item.id : undefined,
        subscriptionPlanId: item.itemType === 'subscription' ? item.id : undefined,
        description: item.name,
        quantity: 1,
        unitPrice: item.price,
        discountAmount: 0,
        itemType: item.itemType,
      }];
    });
  };

  const updateQty = (key: string, delta: number) => {
    setCart((prev) => prev.map((l) => l.key === key ? { ...l, quantity: Math.max(1, l.quantity + delta) } : l));
  };

  const updatePrice = (key: string, price: number) => {
    setCart((prev) => prev.map((l) => l.key === key ? { ...l, unitPrice: price } : l));
  };

  const removeLine = (key: string) => {
    setCart((prev) => prev.filter((l) => l.key !== key));
  };

  const subtotal = cart.reduce((s, l) => s + (l.unitPrice * l.quantity) - l.discountAmount, 0);
  const discountTotal = cart.reduce((s, l) => s + l.discountAmount, 0);
  const taxRate = 0.0925;
  const taxTotal = Math.round((subtotal - discountTotal) * taxRate * 100) / 100;
  const total = subtotal - discountTotal + taxTotal;

  const openDrawer = async () => {
    if (!activeRegister || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/pos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'open_register', registerId: activeRegister.id, openingCash: Number(openingCash) }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed'); setBusy(false); return; }
      setShowOpenDrawer(false);
      load();
    } catch { setError('Failed'); } finally { setBusy(false); }
  };

  const completeSale = async (payments: { paymentMethodId: string; amount: number; tipAmount?: number }[]) => {
    if (!activeSession || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/pos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete_sale',
          registerSessionId: activeSession.id,
          customerId: customerId || null,
          lines: cart.map((l, i) => ({
            catalogItemId: l.catalogItemId,
            serviceId: l.serviceId,
            subscriptionPlanId: l.subscriptionPlanId,
            description: l.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            discountAmount: l.discountAmount,
            itemType: l.itemType,
          })),
          discountTotal,
          taxTotal,
          payments,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Sale failed'); setBusy(false); return; }
      setLastSale(data.sale);
      setCart([]);
      setShowPayment(false);
      setCustomerId(null);
      setCustomerEmail('');
      load();
    } catch { setError('Sale failed'); } finally { setBusy(false); }
  };

  if (loading) return <div className="p-6 text-muted-foreground">Loading POS…</div>;

  // No active session → show open drawer screen
  if (!activeSession) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full bg-background p-6">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <Lock className="size-12 mx-auto text-muted-foreground/40" />
            <h1 className="text-2xl font-semibold tracking-tight mt-4">Register Closed</h1>
            <p className="text-[13px] text-muted-foreground mt-1">
              {activeRegister?.name || 'Register #1'} — open the drawer to start making sales.
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div>
              <label className="block text-[12px] font-medium text-foreground mb-1.5">Opening Cash Float</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="number" step="0.01" value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  className="w-full border border-border rounded-lg pl-9 pr-3 py-2.5 text-[15px] text-foreground focus:outline-none focus:border-foreground"
                />
              </div>
            </div>
            <button
              onClick={openDrawer} disabled={busy}
              className="w-full py-3 bg-ink text-white rounded-lg text-[13px] font-semibold tracking-wider uppercase hover:opacity-90 disabled:opacity-60 cursor-pointer"
            >
              {busy ? 'Opening…' : 'Open Register'}
            </button>
            {error && <p className="text-[12px] text-destructive text-center">{error}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-full bg-background overflow-hidden">
      {/* LEFT: Catalog grid */}
      <div className="flex-1 flex flex-col overflow-hidden border-r border-border">
        {/* Search + filters */}
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search SKU, name, or scan barcode…"
                className="w-full border border-border rounded-lg pl-9 pr-3 py-2.5 text-[13px] text-foreground focus:outline-none focus:border-foreground"
              />
            </div>
            <button onClick={load} className="p-2.5 rounded-lg border border-border hover:bg-muted cursor-pointer" title="Refresh">
              <RefreshCw className="size-4 text-muted-foreground" />
            </button>
          </div>
          <div className="flex items-center gap-1">
            {(['all', 'product', 'service', 'subscription'] as const).map((f) => (
              <button
                key={f} onClick={() => setFilter(f)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-[12px] font-medium capitalize transition-colors cursor-pointer',
                  filter === f ? 'bg-ink text-white' : 'bg-muted/50 text-muted-foreground hover:bg-muted',
                )}
              >
                {f === 'all' ? 'All Items' : f + 's'}
              </button>
            ))}
          </div>
        </div>

        {/* Catalog grid */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-[13px]">No items found.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
              {filtered.map((item) => (
                <button
                  key={item.id} onClick={() => addToCart(item)}
                  className="flex flex-col items-start p-3 bg-card border border-border rounded-lg hover:border-ink hover:shadow-sm transition-all text-left cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    {item.itemType === 'product' && <Package className="size-3.5 text-muted-foreground" />}
                    {item.itemType === 'service' && <Scissors className="size-3.5 text-muted-foreground" />}
                    {item.itemType === 'subscription' && <Repeat className="size-3.5 text-muted-foreground" />}
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{item.itemType}</span>
                  </div>
                  <span className="text-[13px] font-medium text-foreground leading-tight line-clamp-2">{item.name}</span>
                  <div className="flex items-center justify-between w-full mt-2">
                    <span className="text-[14px] font-bold text-foreground">${item.price.toFixed(2)}</span>
                    {item.stock != null && item.stock > 0 && (
                      <span className="text-[10px] text-muted-foreground">{item.stock} in stock</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Cart + payment */}
      <div className="w-full lg:w-[420px] flex flex-col bg-card overflow-hidden">
        {/* Cart header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[15px] font-semibold text-foreground flex items-center gap-2">
              <ShoppingCart className="size-4" />
              Current Sale
            </h2>
            {activeSession && (
              <span className="text-[10px] font-medium text-success bg-success/10 px-2 py-1 rounded-full">
                Drawer Open · ${activeSession.openingCash.toFixed(2)}
              </span>
            )}
          </div>
          {/* Customer selector */}
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              type="email" value={customerEmail}
              onChange={(e) => { setCustomerEmail(e.target.value); setCustomerId(null); }}
              placeholder="Customer email (optional)…"
              className="w-full border border-border rounded-lg pl-8 pr-3 py-2 text-[12px] text-foreground focus:outline-none focus:border-foreground"
            />
          </div>
        </div>

        {/* Cart lines */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
              <ShoppingCart className="size-10 mb-3 opacity-30" />
              <p className="text-[13px]">Scan or tap items to start a sale</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {cart.map((line) => (
                <div key={line.key} className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[13px] font-medium text-foreground flex-1">{line.description}</span>
                    <button onClick={() => removeLine(line.key)} className="text-muted-foreground hover:text-destructive cursor-pointer">
                      <X className="size-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(line.key, -1)} className="p-1 rounded border border-border hover:bg-muted cursor-pointer">
                        <Minus className="size-3" />
                      </button>
                      <span className="w-8 text-center text-[13px] font-medium">{line.quantity}</span>
                      <button onClick={() => updateQty(line.key, 1)} className="p-1 rounded border border-border hover:bg-muted cursor-pointer">
                        <Plus className="size-3" />
                      </button>
                    </div>
                    <div className="relative">
                      <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                      <input
                        type="number" step="0.01"
                        value={line.unitPrice}
                        onChange={(e) => updatePrice(line.key, Number(e.target.value))}
                        className="w-20 border border-border rounded pl-6 pr-1 py-1 text-[12px] text-foreground focus:outline-none focus:border-foreground"
                      />
                    </div>
                    <span className="ml-auto text-[13px] font-semibold text-foreground">
                      ${(line.unitPrice * line.quantity - line.discountAmount).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals + checkout */}
        {cart.length > 0 && (
          <div className="border-t border-border p-4 space-y-3">
            <div className="space-y-1 text-[13px]">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {discountTotal > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Discounts</span>
                  <span>−${discountTotal.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>Tax (9.25%)</span>
                <span>${taxTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[16px] font-bold text-foreground pt-1 border-t border-border">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
            <button
              onClick={() => setShowPayment(true)}
              className="w-full py-3 bg-ink text-white rounded-lg text-[14px] font-semibold tracking-wider uppercase hover:opacity-90 cursor-pointer flex items-center justify-center gap-2"
            >
              <Wallet className="size-4" />
              Charge ${total.toFixed(2)}
            </button>
          </div>
        )}

        {/* Today's summary */}
        {summary && (
          <div className="border-t border-border p-3 bg-muted/30">
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Today's Summary</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[16px] font-bold text-foreground">{summary.salesCount}</p>
                <p className="text-[9px] text-muted-foreground uppercase">Sales</p>
              </div>
              <div>
                <p className="text-[16px] font-bold text-foreground">${summary.netSales.toFixed(0)}</p>
                <p className="text-[9px] text-muted-foreground uppercase">Net</p>
              </div>
              <div>
                <p className="text-[16px] font-bold text-foreground">${(summary.cashSales + summary.cardSales).toFixed(0)}</p>
                <p className="text-[9px] text-muted-foreground uppercase">Tendered</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payment drawer modal */}
      {showPayment && (
        <PaymentDrawer
          total={total}
          subtotal={subtotal}
          taxTotal={taxTotal}
          discountTotal={discountTotal}
          paymentMethods={paymentMethods}
          onComplete={completeSale}
          onClose={() => setShowPayment(false)}
          busy={busy}
          error={error}
        />
      )}

      {/* Sale success modal */}
      {lastSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/90 p-4">
          <div className="w-full max-w-sm bg-card rounded-2xl border border-border p-6 space-y-4 text-center">
            <Receipt className="size-12 mx-auto text-success" />
            <h3 className="text-[18px] font-semibold text-foreground">Sale Complete</h3>
            <div className="space-y-1 text-[13px]">
              <p className="text-muted-foreground">Receipt #{lastSale.receiptNumber}</p>
              <p className="text-[20px] font-bold text-foreground">${lastSale.total.toFixed(2)}</p>
              {lastSale.changeDue > 0 && (
                <p className="text-[14px] font-semibold text-success">Change due: ${lastSale.changeDue.toFixed(2)}</p>
              )}
            </div>
            <button
              onClick={() => setLastSale(null)}
              className="w-full py-2.5 bg-ink text-white rounded-lg text-[13px] font-semibold cursor-pointer"
            >
              New Sale
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Payment Drawer component ----
function PaymentDrawer({
  total, subtotal, taxTotal, discountTotal, paymentMethods, onComplete, onClose, busy, error,
}: {
  total: number;
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  paymentMethods: PaymentMethod[];
  onComplete: (payments: { paymentMethodId: string; amount: number; tipAmount?: number }[]) => void;
  onClose: () => void;
  busy: boolean;
  error: string | null;
}) {
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [amount, setAmount] = useState(total.toFixed(2));
  const [tip, setTip] = useState('0.00');
  const [payments, setPayments] = useState<{ paymentMethodId: string; amount: number; tipAmount?: number }[]>([]);

  useEffect(() => {
    if (paymentMethods.length > 0 && !selectedMethod) {
      setSelectedMethod(paymentMethods[0].id);
    }
  }, [paymentMethods, selectedMethod]);

  const remaining = Math.max(0, total - payments.reduce((s, p) => s + p.amount, 0));

  const addPayment = () => {
    const amt = Number(amount);
    if (!selectedMethod || amt <= 0) return;
    setPayments([...payments, { paymentMethodId: selectedMethod, amount: amt, tipAmount: Number(tip) || 0 }]);
    setAmount(remaining.toFixed(2));
    setTip('0.00');
  };

  const grouped = paymentMethods.reduce((acc, m) => {
    (acc[m.methodType] = acc[m.methodType] || []).push(m);
    return acc;
  }, {} as Record<string, PaymentMethod[]>);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/90 p-4">
      <div className="w-full max-w-lg bg-card rounded-2xl border border-border shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="text-[16px] font-semibold text-foreground">Payment</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer">
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Totals */}
          <div className="bg-muted/40 rounded-lg p-4 space-y-1 text-[13px]">
            <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
            {discountTotal > 0 && <div className="flex justify-between text-muted-foreground"><span>Discounts</span><span>−${discountTotal.toFixed(2)}</span></div>}
            <div className="flex justify-between text-muted-foreground"><span>Tax</span><span>${taxTotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-[18px] font-bold text-foreground pt-1 border-t border-border">
              <span>Total Due</span><span>${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Already paid */}
          {payments.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tendered</p>
              {payments.map((p, i) => {
                const m = paymentMethods.find((m) => m.id === p.paymentMethodId);
                return (
                  <div key={i} className="flex justify-between text-[13px]">
                    <span className="text-foreground">{m?.name || 'Payment'}</span>
                    <span className="text-foreground">${p.amount.toFixed(2)}</span>
                  </div>
                );
              })}
              <div className="flex justify-between text-[14px] font-semibold pt-1 border-t border-border">
                <span className="text-muted-foreground">Remaining</span>
                <span className={remaining > 0 ? 'text-destructive' : 'text-success'}>${remaining.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Payment method selector */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Payment Method</p>
            {Object.entries(grouped).map(([type, methods]) => (
              <div key={type}>
                <p className="text-[10px] text-muted-foreground/70 capitalize mb-1">{type}</p>
                <div className="grid grid-cols-3 gap-2">
                  {methods.map((m) => (
                    <button
                      key={m.id} onClick={() => setSelectedMethod(m.id)}
                      className={cn(
                        'py-2 px-2 rounded-lg text-[12px] font-medium border transition-colors cursor-pointer',
                        selectedMethod === m.id ? 'bg-ink text-white border-ink' : 'border-border text-foreground hover:bg-muted',
                      )}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Amount + tip */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Amount</label>
              <div className="relative">
                <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <input
                  type="number" step="0.01" value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full border border-border rounded-lg pl-8 pr-2 py-2 text-[14px] text-foreground focus:outline-none focus:border-foreground"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Tip</label>
              <div className="relative">
                <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <input
                  type="number" step="0.01" value={tip}
                  onChange={(e) => setTip(e.target.value)}
                  className="w-full border border-border rounded-lg pl-8 pr-2 py-2 text-[14px] text-foreground focus:outline-none focus:border-foreground"
                />
              </div>
            </div>
          </div>

          {/* Quick cash buttons */}
          <div className="grid grid-cols-4 gap-2">
            {[20, 50, 100, 'Exact'].map((q) => (
              <button
                key={q} onClick={() => setAmount(q === 'Exact' ? remaining.toFixed(2) : String(q))}
                className="py-1.5 rounded-lg border border-border text-[12px] font-medium hover:bg-muted cursor-pointer"
              >
                {q === 'Exact' ? 'Exact' : `$${q}`}
              </button>
            ))}
          </div>

          {error && <p className="text-[12px] text-destructive text-center">{error}</p>}
        </div>

        {/* Actions */}
        <div className="border-t border-border p-4 flex gap-2">
          {remaining > 0.01 && (
            <button
              onClick={addPayment}
              className="flex-1 py-2.5 border border-border rounded-lg text-[13px] font-semibold hover:bg-muted cursor-pointer"
            >
              Add Payment
            </button>
          )}
          <button
            onClick={() => onComplete(payments.length > 0 ? payments : [{ paymentMethodId: selectedMethod, amount: Number(amount) || total, tipAmount: Number(tip) || 0 }])}
            disabled={busy || !selectedMethod}
            className="flex-1 py-2.5 bg-ink text-white rounded-lg text-[13px] font-semibold hover:opacity-90 disabled:opacity-60 cursor-pointer"
          >
            {busy ? 'Processing…' : remaining > 0.01 ? 'Complete (Split)' : `Complete Sale`}
          </button>
        </div>
      </div>
    </div>
  );
}
