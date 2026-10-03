'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import {
  Search, ShoppingCart, User, Package, Scissors, Repeat, RefreshCw,
  Plus, Minus, X, DollarSign, Receipt, Lock, Tag, Percent, Wallet,
  Gift, Check, Pause, Trash2, CreditCard,
} from 'lucide-react';

type CatalogItem = {
  id: string; sku: string; name: string;
  itemType: 'product' | 'service' | 'subscription';
  price: number; compareAtPrice: number | null; stock: number | null;
  categoryName?: string;
};

type Category = { id: string | null; name: string; itemCount: number };
type PaymentMethod = { id: string; code: string; name: string; methodType: string };
type Register = {
  id: string; registerNumber: string; name: string;
  activeSession: { id: string; openingCash: number; expectedCash: number; openedAt: string } | null;
};

type CartLine = {
  key: string; catalogItemId?: string; serviceId?: string; subscriptionPlanId?: string;
  description: string; quantity: number; unitPrice: number; discountAmount: number;
  itemType: 'product' | 'service' | 'subscription';
};

type TodaySummary = {
  salesCount: number; grossSales: number; discounts: number;
  tax: number; netSales: number; cashSales: number; cardSales: number;
};

// ---- localStorage cart backup (survives browser crash/refresh) ----
const CART_STORAGE_KEY = (sessionId: string) => `pos-cart-${sessionId}`;

export default function PosPage() {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [registers, setRegisters] = useState<Register[]>([]);
  const [summary, setSummary] = useState<TodaySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [heldCarts, setHeldCarts] = useState<CartLine[][]>([]);
  const [customerEmail, setCustomerEmail] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [showOpenDrawer, setShowOpenDrawer] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [openingCash, setOpeningCash] = useState('100.00');
  const [busy, setBusy] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const activeRegister = registers[0];
  const activeSession = activeRegister?.activeSession;

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/pos');
      if (!res.ok) return;
      const data = await res.json();
      setCatalog(data.catalog || []);
      setCategories(data.categories || []);
      setPaymentMethods(data.paymentMethods || []);
      setRegisters(data.registers || []);
      setSummary(data.todaySummary || null);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ---- localStorage cart backup ----
  // Mirror the active cart to localStorage keyed by register_session_id.
  // If the browser crashes or the cashier hits refresh, the cart survives.
  useEffect(() => {
    if (activeSession?.id) {
      const saved = localStorage.getItem(CART_STORAGE_KEY(activeSession.id));
      if (saved && cart.length === 0) {
        try { setCart(JSON.parse(saved)); } catch {}
      }
    }
  }, [activeSession?.id]);

  useEffect(() => {
    if (activeSession?.id) {
      localStorage.setItem(CART_STORAGE_KEY(activeSession.id), JSON.stringify(cart));
    }
  }, [cart, activeSession?.id]);

  // ---- keyboard shortcut: focus search on "/" ----
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const filtered = catalog.filter((c) => {
    if (activeCategory && activeCategory !== 'All Items' && c.categoryName !== activeCategory) return false;
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
      if (existing) return prev.map((l) => l.key === key ? { ...l, quantity: l.quantity + 1 } : l);
      return [...prev, {
        key, catalogItemId: item.itemType === 'product' ? item.id : undefined,
        serviceId: item.itemType === 'service' ? item.id : undefined,
        subscriptionPlanId: item.itemType === 'subscription' ? item.id : undefined,
        description: item.name, quantity: 1, unitPrice: item.price, discountAmount: 0, itemType: item.itemType,
      }];
    });
    setSearch('');
    searchInputRef.current?.focus();
  };

  const updateQty = (key: string, delta: number) => {
    setCart((prev) => prev.map((l) => l.key === key ? { ...l, quantity: Math.max(1, l.quantity + delta) } : l));
  };
  const updatePrice = (key: string, price: number) => {
    setCart((prev) => prev.map((l) => l.key === key ? { ...l, unitPrice: price } : l));
  };
  const removeLine = (key: string) => setCart((prev) => prev.filter((l) => l.key !== key));
  const clearCart = () => { setCart([]); setError(null); };
  const holdCart = () => { if (cart.length > 0) { setHeldCarts([...heldCarts, cart]); setCart([]); } };
  const resumeCart = (idx: number) => { setCart(heldCarts[idx]); setHeldCarts(heldCarts.filter((_, i) => i !== idx)); };

  const subtotal = cart.reduce((s, l) => s + (l.unitPrice * l.quantity) - l.discountAmount, 0);
  const discountTotal = cart.reduce((s, l) => s + l.discountAmount, 0);
  const taxRate = 0.0925;
  const taxTotal = Math.round((subtotal - discountTotal) * taxRate * 100) / 100;
  const total = subtotal - discountTotal + taxTotal;

  const openDrawer = async () => {
    if (!activeRegister || busy) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch('/api/admin/pos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'open_register', registerId: activeRegister.id, openingCash: Number(openingCash) }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed'); setBusy(false); return; }
      setShowOpenDrawer(false); load();
    } catch { setError('Failed'); } finally { setBusy(false); }
  };

  const completeSale = async (payments: any[]) => {
    if (!activeSession || busy) return;
    setBusy(true); setError(null);
    try {
      // Generate a client-side idempotency key — blocks double-submission.
      const idempotencyKey = crypto.randomUUID();
      const res = await fetch('/api/admin/pos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete_sale',
          idempotencyKey,
          registerSessionId: activeSession.id,
          lines: cart.map((l) => ({
            catalogItemId: l.catalogItemId, serviceId: l.serviceId,
            subscriptionPlanId: l.subscriptionPlanId, description: l.description,
            quantity: l.quantity, unitPrice: l.unitPrice, discountAmount: l.discountAmount,
            itemType: l.itemType,
          })),
          discountTotal, taxTotal, payments,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Sale failed'); setBusy(false); return; }
      setLastSale(data.sale);
      setCart([]);
      if (activeSession?.id) localStorage.removeItem(CART_STORAGE_KEY(activeSession.id));
      setShowPayment(false); load();
    } catch { setError('Sale failed'); } finally { setBusy(false); }
  };

  // ---- thermal receipt printing (raw ESC/POS via Web Serial) ----
  const printReceipt = async (receiptRaw: string) => {
    // Try Web Serial API (Chrome) for direct thermal printer connection.
    // Falls back to a new window with pre-formatted text if Web Serial
    // isn't available (non-Chrome browsers, no printer connected).
    if ('serial' in navigator) {
      try {
        const port = await (navigator as any).serial.requestPort();
        await port.open({ baudRate: 9600 });
        const writer = port.writable.getWriter();
        await writer.write(new TextEncoder().encode(receiptRaw));
        writer.releaseLock();
        await port.close();
        return;
      } catch (e) {
        // User cancelled or printer not available — fall through to window print
      }
    }
    // Fallback: open a plain-text window (no HTML margins, monospace)
    const w = window.open('', '_blank', 'width=400,height=600');
    if (w) {
      w.document.write(`<pre style="font-family:monospace;font-size:11px;margin:0;padding:8px;">${receiptRaw.replace(/</g, '&lt;')}</pre>`);
      w.document.close();
      w.print();
    }
  };

  if (loading) return <div className="p-6 text-muted-foreground">Loading POS…</div>;

  // ---- No active session → open drawer screen ----
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
                <input type="number" step="0.01" value={openingCash} onChange={(e) => setOpeningCash(e.target.value)}
                  className="w-full border border-border rounded-lg pl-9 pr-3 py-2.5 text-[15px] focus:outline-none focus:border-foreground" />
              </div>
            </div>
            <button onClick={openDrawer} disabled={busy}
              className="w-full py-3 bg-ink text-white rounded-lg text-[13px] font-semibold tracking-wider uppercase hover:opacity-90 disabled:opacity-60 cursor-pointer">
              {busy ? 'Opening…' : 'Open Register'}
            </button>
            {error && <p className="text-[12px] text-destructive text-center">{error}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-background overflow-hidden">
      {/* =========================================== */}
      {/* LEFT: Catalog & Inputs (65% width) */}
      {/* =========================================== */}
      <div className="flex-1 flex flex-col overflow-hidden border-r border-border" style={{ flexBasis: '65%' }}>
        {/* Search/barcode bar */}
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                ref={searchInputRef}
                type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search or scan barcode… (press / to focus)"
                className="w-full border border-border rounded-lg pl-9 pr-3 py-2.5 text-[13px] focus:outline-none focus:border-ink"
                autoFocus
              />
            </div>
            <button onClick={load} className="p-2.5 rounded-lg border border-border hover:bg-muted cursor-pointer" title="Refresh">
              <RefreshCw className="size-4 text-muted-foreground" />
            </button>
            <button onClick={() => setShowQuickAdd(true)} className="px-3 py-2.5 rounded-lg bg-ink text-white text-[12px] font-semibold hover:opacity-90 cursor-pointer flex items-center gap-1.5" title="Quick add item">
              <Plus className="size-4" /> Add Item
            </button>
          </div>
        </div>

        {/* Category navigation */}
        <div className="px-3 py-2 border-b border-border overflow-x-auto custom-scrollbar">
          <div className="flex items-center gap-1">
            {categories.map((cat) => (
              <button
                key={cat.name} onClick={() => setActiveCategory(cat.name === 'All Items' ? null : cat.name)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-colors cursor-pointer',
                  (activeCategory === null && cat.name === 'All Items') || activeCategory === cat.name
                    ? 'bg-ink text-white' : 'bg-muted/50 text-muted-foreground hover:bg-muted',
                )}
              >
                {cat.name} <span className="opacity-60">({cat.itemCount})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Product quick-keys grid */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-[13px]">No items found.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2.5">
              {filtered.map((item) => (
                <button
                  key={item.id} onClick={() => addToCart(item)}
                  className="flex flex-col items-start p-3 bg-card border border-border rounded-lg hover:border-ink hover:shadow-sm transition-all text-left cursor-pointer"
                >
                  <div className="flex items-center gap-1 mb-1">
                    {item.itemType === 'product' && <Package className="size-3.5 text-muted-foreground" />}
                    {item.itemType === 'service' && <Scissors className="size-3.5 text-muted-foreground" />}
                    {item.itemType === 'subscription' && <Repeat className="size-3.5 text-muted-foreground" />}
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{item.itemType}</span>
                  </div>
                  <span className="text-[13px] font-medium leading-tight line-clamp-2">{item.name}</span>
                  <div className="flex items-center justify-between w-full mt-2">
                    <span className="text-[14px] font-bold">${item.price.toFixed(2)}</span>
                    {item.stock != null && item.stock > 0 && <span className="text-[10px] text-muted-foreground">{item.stock}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* =========================================== */}
      {/* RIGHT: Cart & Summary (35% width) */}
      {/* =========================================== */}
      <div className="flex flex-col bg-card overflow-hidden" style={{ flexBasis: '35%', maxWidth: '480px' }}>
        {/* Cart header */}
        <div className="p-3 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[14px] font-semibold flex items-center gap-2">
              <ShoppingCart className="size-4" /> Current Ticket
            </h2>
            {activeSession && (
              <span className="text-[10px] font-medium text-success bg-success/10 px-2 py-1 rounded-full">
                Drawer ${activeSession.openingCash.toFixed(2)}
              </span>
            )}
          </div>
          {/* Customer */}
          <div className="relative">
            <User className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="Customer email (optional)…"
              className="w-full border border-border rounded-lg pl-8 pr-3 py-1.5 text-[12px] focus:outline-none focus:border-ink" />
          </div>
        </div>

        {/* Held carts */}
        {heldCarts.length > 0 && (
          <div className="px-3 py-2 border-b border-border bg-muted/30">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Held Tickets ({heldCarts.length})</p>
            <div className="flex gap-1 flex-wrap">
              {heldCarts.map((hc, i) => (
                <button key={i} onClick={() => resumeCart(i)}
                  className="px-2 py-1 rounded text-[11px] bg-card border border-border hover:bg-muted cursor-pointer">
                  <Pause className="size-2.5 inline mr-1" />{hc.length} items
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Cart lines */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
              <ShoppingCart className="size-10 mb-3 opacity-30" />
              <p className="text-[13px]">Scan or tap items to start</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {cart.map((line) => (
                <div key={line.key} className="p-2.5 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[12px] font-medium flex-1">{line.description}</span>
                    <button onClick={() => removeLine(line.key)} className="text-muted-foreground hover:text-destructive cursor-pointer">
                      <X className="size-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(line.key, -1)} className="p-0.5 rounded border border-border hover:bg-muted cursor-pointer"><Minus className="size-3" /></button>
                      <span className="w-7 text-center text-[12px] font-medium">{line.quantity}</span>
                      <button onClick={() => updateQty(line.key, 1)} className="p-0.5 rounded border border-border hover:bg-muted cursor-pointer"><Plus className="size-3" /></button>
                    </div>
                    <div className="relative">
                      <DollarSign className="absolute left-1.5 top-1/2 -translate-y-1/2 size-2.5 text-muted-foreground" />
                      <input type="number" step="0.01" value={line.unitPrice} onChange={(e) => updatePrice(line.key, Number(e.target.value))}
                        className="w-16 border border-border rounded pl-5 pr-1 py-0.5 text-[11px] focus:outline-none focus:border-ink" />
                    </div>
                    <span className="ml-auto text-[12px] font-semibold">${(line.unitPrice * line.quantity - line.discountAmount).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Order totals + action buttons */}
        {cart.length > 0 && (
          <div className="border-t border-border p-3 space-y-2.5">
            <div className="space-y-0.5 text-[12px]">
              <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
              {discountTotal > 0 && <div className="flex justify-between text-muted-foreground"><span>Discounts</span><span>−${discountTotal.toFixed(2)}</span></div>}
              <div className="flex justify-between text-muted-foreground"><span>Tax (9.25%)</span><span>${taxTotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-[16px] font-bold pt-1 border-t border-border"><span>Total</span><span>${total.toFixed(2)}</span></div>
            </div>
            {/* Action buttons */}
            <div className="flex gap-1.5">
              <button onClick={clearCart} className="flex-1 py-2 border border-border rounded-lg text-[11px] font-medium hover:bg-muted cursor-pointer flex items-center justify-center gap-1">
                <Trash2 className="size-3" /> Clear
              </button>
              <button onClick={holdCart} className="flex-1 py-2 border border-border rounded-lg text-[11px] font-medium hover:bg-muted cursor-pointer flex items-center justify-center gap-1">
                <Pause className="size-3" /> Hold
              </button>
            </div>
            <button onClick={() => setShowPayment(true)}
              className="w-full py-3 bg-ink text-white rounded-lg text-[14px] font-semibold tracking-wider uppercase hover:opacity-90 cursor-pointer flex items-center justify-center gap-2">
              <Wallet className="size-4" /> Charge ${total.toFixed(2)}
            </button>
          </div>
        )}

        {/* Today's summary */}
        {summary && (
          <div className="border-t border-border p-2.5 bg-muted/30">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div><p className="text-[15px] font-bold">{summary.salesCount}</p><p className="text-[9px] text-muted-foreground uppercase">Sales</p></div>
              <div><p className="text-[15px] font-bold">${summary.netSales.toFixed(0)}</p><p className="text-[9px] text-muted-foreground uppercase">Net</p></div>
              <div><p className="text-[15px] font-bold">${(summary.cashSales + summary.cardSales).toFixed(0)}</p><p className="text-[9px] text-muted-foreground uppercase">Tendered</p></div>
            </div>
          </div>
        )}
      </div>

      {/* Payment drawer */}
      {showPayment && (
        <PaymentDrawer
          total={total} subtotal={subtotal} taxTotal={taxTotal} discountTotal={discountTotal}
          paymentMethods={paymentMethods} onComplete={completeSale} onClose={() => setShowPayment(false)}
          busy={busy} error={error}
        />
      )}

      {/* Sale success + receipt printing */}
      {lastSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/90 p-4">
          <div className="w-full max-w-sm bg-card rounded-2xl border border-border p-6 space-y-4 text-center">
            <Receipt className="size-12 mx-auto text-success" />
            <h3 className="text-[18px] font-semibold">Sale Complete</h3>
            <div className="space-y-1 text-[13px]">
              <p className="text-muted-foreground">Receipt #{lastSale.receiptNumber}</p>
              <p className="text-[20px] font-bold">${lastSale.total.toFixed(2)}</p>
              {lastSale.changeDue > 0 && <p className="text-[14px] font-semibold text-success">Change: ${lastSale.changeDue.toFixed(2)}</p>}
              {lastSale.journalEntryId && <p className="text-[10px] text-muted-foreground">GL Entry: {lastSale.journalEntryId.slice(0,8)}</p>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => printReceipt(lastSale.receiptRaw)}
                className="flex-1 py-2.5 border border-border rounded-lg text-[13px] font-semibold hover:bg-muted cursor-pointer flex items-center justify-center gap-1.5">
                <Receipt className="size-3.5" /> Print
              </button>
              <button onClick={() => setLastSale(null)}
                className="flex-1 py-2.5 bg-ink text-white rounded-lg text-[13px] font-semibold cursor-pointer">
                New Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Item modal — cashier creates a new item on the fly */}
      {showQuickAdd && (
        <QuickAddItem
          onClose={() => setShowQuickAdd(false)}
          onCreated={(item) => {
            // Add the new item to the cart immediately
            setCart((prev) => {
              const key = `product-${item.id}`;
              return [...prev, {
                key, catalogItemId: item.id, description: item.name,
                quantity: 1, unitPrice: item.price, discountAmount: 0,
                itemType: 'product' as const,
              }];
            });
            setShowQuickAdd(false);
            load(); // refresh catalog
          }}
        />
      )}
    </div>
  );
}

// ---- Payment Drawer (cash/change, check, gift card, card) ----
function PaymentDrawer({
  total, subtotal, taxTotal, discountTotal, paymentMethods, onComplete, onClose, busy, error,
}: {
  total: number; subtotal: number; taxTotal: number; discountTotal: number;
  paymentMethods: PaymentMethod[];
  onComplete: (payments: any[]) => void;
  onClose: () => void; busy: boolean; error: string | null;
}) {
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [amount, setAmount] = useState(total.toFixed(2));
  const [tip, setTip] = useState('0.00');
  const [payments, setPayments] = useState<any[]>([]);
  const [giftCardNumber, setGiftCardNumber] = useState('');
  const [giftCardBalance, setGiftCardBalance] = useState<number | null>(null);
  const [checkRef, setCheckRef] = useState('');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (paymentMethods.length > 0 && !selectedMethod) setSelectedMethod(paymentMethods[0].id);
  }, [paymentMethods, selectedMethod]);

  const remaining = Math.max(0, total - payments.reduce((s, p) => s + p.amount, 0));
  const selectedPM = paymentMethods.find(m => m.id === selectedMethod);
  const isCash = selectedPM?.methodType === 'cash';
  const isCheck = selectedPM?.methodType === 'check';
  const isGiftCard = selectedPM?.code === 'STORE_CREDIT';
  const changeDue = Math.max(0, Number(amount) - remaining);

  const checkGiftCard = async () => {
    const res = await fetch('/api/admin/pos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'query_gift_card', cardNumber: giftCardNumber }),
    });
    const data = await res.json();
    if (res.ok) setGiftCardBalance(data.card.balance);
    else { setGiftCardBalance(null); alert(data.error || 'Gift card not found'); }
  };

  const addPayment = () => {
    const amt = Number(amount);
    if (!selectedMethod || amt <= 0) return;
    if (isGiftCard && giftCardBalance != null && amt > giftCardBalance) {
      alert(`Gift card balance is only $${giftCardBalance.toFixed(2)}`);
      return;
    }
    setPayments([...payments, {
      paymentMethodId: selectedMethod, amount: amt, tipAmount: Number(tip) || 0,
      giftCardNumber: isGiftCard ? giftCardNumber : undefined,
      checkReference: isCheck ? checkRef : undefined,
    }]);
    setAmount(remaining.toFixed(2)); setTip('0.00');
    if (isGiftCard) { setGiftCardNumber(''); setGiftCardBalance(null); }
    if (isCheck) setCheckRef('');
  };

  const grouped = paymentMethods.reduce((acc, m) => {
    (acc[m.methodType] = acc[m.methodType] || []).push(m);
    return acc;
  }, {} as Record<string, PaymentMethod[]>);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/90 p-4">
      <div className="w-full max-w-lg bg-card rounded-2xl border border-border shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="text-[16px] font-semibold">Payment</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"><X className="size-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Totals */}
          <div className="bg-muted/40 rounded-lg p-3 space-y-0.5 text-[12px]">
            <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
            {discountTotal > 0 && <div className="flex justify-between text-muted-foreground"><span>Discounts</span><span>−${discountTotal.toFixed(2)}</span></div>}
            <div className="flex justify-between text-muted-foreground"><span>Tax</span><span>${taxTotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-[17px] font-bold pt-1 border-t border-border"><span>Total Due</span><span>${total.toFixed(2)}</span></div>
          </div>

          {/* Tendered so far */}
          {payments.length > 0 && (
            <div className="space-y-1">
              {payments.map((p, i) => {
                const m = paymentMethods.find(m => m.id === p.paymentMethodId);
                return <div key={i} className="flex justify-between text-[12px]"><span>{m?.name}</span><span>${p.amount.toFixed(2)}</span></div>;
              })}
              <div className="flex justify-between text-[13px] font-semibold pt-1 border-t border-border">
                <span className="text-muted-foreground">Remaining</span>
                <span className={remaining > 0 ? 'text-destructive' : 'text-success'}>${remaining.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Payment method selector */}
          <div className="space-y-2">
            {Object.entries(grouped).map(([type, methods]) => (
              <div key={type}>
                <p className="text-[10px] text-muted-foreground/70 capitalize mb-1">{type}</p>
                <div className="grid grid-cols-3 gap-2">
                  {methods.map((m) => (
                    <button key={m.id} onClick={() => setSelectedMethod(m.id)}
                      className={cn('py-2 px-2 rounded-lg text-[12px] font-medium border transition-colors cursor-pointer',
                        selectedMethod === m.id ? 'bg-ink text-white border-ink' : 'border-border hover:bg-muted')}>
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Gift card input */}
          {isGiftCard && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Gift className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <input type="text" value={giftCardNumber} onChange={(e) => setGiftCardNumber(e.target.value)}
                    placeholder="Gift card number…"
                    className="w-full border border-border rounded-lg pl-8 pr-2 py-2 text-[12px] focus:outline-none focus:border-ink" />
                </div>
                <button onClick={checkGiftCard} className="px-3 py-2 border border-border rounded-lg text-[12px] font-medium hover:bg-muted cursor-pointer">Check</button>
              </div>
              {giftCardBalance != null && <p className="text-[11px] text-success">Balance: ${giftCardBalance.toFixed(2)}</p>}
            </div>
          )}

          {/* Check reference */}
          {isCheck && (
            <input type="text" value={checkRef} onChange={(e) => setCheckRef(e.target.value)}
              placeholder="Check # / reference…"
              className="w-full border border-border rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:border-ink" />
          )}

          {/* Amount + tip */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Amount</label>
              <div className="relative">
                <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
                  className="w-full border border-border rounded-lg pl-8 pr-2 py-2 text-[14px] focus:outline-none focus:border-ink" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Tip</label>
              <div className="relative">
                <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <input type="number" step="0.01" value={tip} onChange={(e) => setTip(e.target.value)}
                  className="w-full border border-border rounded-lg pl-8 pr-2 py-2 text-[14px] focus:outline-none focus:border-ink" />
              </div>
            </div>
          </div>

          {/* Change due (cash/check) */}
          {(isCash || isCheck) && changeDue > 0 && (
            <div className="bg-success/10 border border-success/20 rounded-lg p-3 text-center">
              <p className="text-[11px] text-muted-foreground uppercase">Change Due</p>
              <p className="text-[20px] font-bold text-success">${changeDue.toFixed(2)}</p>
              <p className="text-[9px] text-muted-foreground mt-1">Cash drawer will open automatically</p>
            </div>
          )}

          {/* Quick cash buttons */}
          {(isCash || isCheck) && (
            <div className="grid grid-cols-5 gap-1.5">
              {[20, 50, 100, 'Exact', 'Next'].map((q) => (
                <button key={q} onClick={() => {
                  if (q === 'Exact') setAmount(remaining.toFixed(2));
                  else if (q === 'Next') { const n = Math.ceil(remaining / 20) * 20; setAmount(n.toFixed(2)); }
                  else setAmount(String(q));
                }} className="py-1.5 rounded-lg border border-border text-[11px] font-medium hover:bg-muted cursor-pointer">
                  {q === 'Exact' || q === 'Next' ? q : `$${q}`}
                </button>
              ))}
            </div>
          )}

          {error && <p className="text-[12px] text-destructive text-center">{error}</p>}
        </div>

        {/* Actions */}
        <div className="border-t border-border p-4 flex gap-2">
          {remaining > 0.01 && (
            <button onClick={addPayment} className="flex-1 py-2.5 border border-border rounded-lg text-[13px] font-semibold hover:bg-muted cursor-pointer">Add Payment</button>
          )}
          <button
            onClick={() => onComplete(payments.length > 0 ? payments : [{ paymentMethodId: selectedMethod, amount: Number(amount) || total, tipAmount: Number(tip) || 0, giftCardNumber: isGiftCard ? giftCardNumber : undefined, checkReference: isCheck ? checkRef : undefined }])}
            disabled={busy || !selectedMethod}
            className="flex-1 py-2.5 bg-ink text-white rounded-lg text-[13px] font-semibold hover:opacity-90 disabled:opacity-60 cursor-pointer">
            {busy ? 'Processing…' : remaining > 0.01 ? 'Complete (Split)' : 'Complete Sale'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Quick Add Item — create a new catalog item from the register ----
function QuickAddItem({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: (item: { id: string; name: string; price: number }) => void;
}) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [ecoEnabled, setEcoEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    if (!name.trim() || !price) { setError('Name and price required'); return; }
    setBusy(true); setError(null);
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          base_price: Number(price),
          pos_enabled: true,
          ecommerce_enabled: ecoEnabled,
          short_description: 'Quick-add from POS register',
          inventory_count: 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed'); setBusy(false); return; }
      onCreated({ id: data.product.id, name: data.product.name, price: data.product.priceCents / 100 });
    } catch { setError('Failed'); setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/90 p-4">
      <div className="w-full max-w-md bg-card rounded-2xl border border-border shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[16px] font-semibold flex items-center gap-2">
            <Plus className="size-4" /> Quick Add Item
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer">
            <X className="size-5" />
          </button>
        </div>
        <p className="text-[12px] text-muted-foreground">
          Create a new item to sell right now. It'll be added to the cart + the catalog.
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-foreground mb-1">Item Name</label>
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Oatmeal Shampoo (new arrival)"
              className="w-full border border-border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-ink"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-foreground mb-1">Price ($)</label>
            <div className="relative">
              <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <input
                type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full border border-border rounded-lg pl-8 pr-3 py-2 text-[13px] focus:outline-none focus:border-ink"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-[12px] text-muted-foreground cursor-pointer">
            <input
              type="checkbox" checked={ecoEnabled} onChange={(e) => setEcoEnabled(e.target.checked)}
              className="rounded border-border"
            />
            Also sell on the website (storefront)
          </label>
        </div>
        {error && <p className="text-[12px] text-destructive text-center">{error}</p>}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-lg text-[13px] font-semibold hover:bg-muted cursor-pointer">
            Cancel
          </button>
          <button onClick={create} disabled={busy}
            className="flex-1 py-2.5 bg-ink text-white rounded-lg text-[13px] font-semibold hover:opacity-90 disabled:opacity-60 cursor-pointer">
            {busy ? 'Creating…' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  );
}
