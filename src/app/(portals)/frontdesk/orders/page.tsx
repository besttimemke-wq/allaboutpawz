'use client';

import { useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Receipt, Plus, Minus, ShoppingCart, Trash2 } from 'lucide-react';

// ============================================================================
// Front Desk — Quick POS. The desk's point-of-sale for walk-in retail:
// leashes, shampoos, treats. Full order management (shipping, returns,
// purchase orders) lives in the admin OS — this is the counter register.
// ============================================================================

interface Product {
  id: string;
  name: string;
  price: number;
}

const PRODUCTS: Product[] = [
  { id: 's1', name: 'Oatmeal Shampoo', price: 14 },
  { id: 's2', name: 'Leather Leash', price: 26 },
  { id: 's3', name: 'Dental Chews', price: 9 },
  { id: 's4', name: 'De-shed Spray', price: 16 },
  { id: 's5', name: 'Bandana', price: 8 },
  { id: 's6', name: 'Travel Bowl', price: 12 },
];

interface LineItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

export default function FrontDeskOrdersPage() {
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<LineItem[]>([]);
  const [tendered, setTendered] = useState<'card' | 'cash'>('card');
  const [saleDone, setSaleDone] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PRODUCTS;
    return PRODUCTS.filter((p) => p.name.toLowerCase().includes(q));
  }, [query]);

  const addToCart = (p: Product) =>
    setCart((c) => {
      const found = c.find((l) => l.id === p.id);
      if (found) return c.map((l) => (l.id === p.id ? { ...l, qty: l.qty + 1 } : l));
      return [...c, { id: p.id, name: p.name, price: p.price, qty: 1 }];
    });

  const changeQty = (id: string, delta: number) =>
    setCart((c) =>
      c
        .map((l) => (l.id === id ? { ...l, qty: l.qty + delta } : l))
        .filter((l) => l.qty > 0),
    );

  const total = cart.reduce((t, l) => t + l.price * l.qty, 0);

  const checkout = () => {
    if (cart.length === 0) return;
    setSaleDone(`POS-${Date.now().toString(36).toUpperCase().slice(-6)}`);
    setCart([]);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Quick POS</h1>
        <p className="text-sm text-muted-foreground mt-1">Counter register — walk-in retail.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Catalog */}
        <Card className="border-border/60 lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="size-4 text-muted-foreground" /> Products
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products…" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="rounded-lg border border-border/60 p-3 text-left transition hover:bg-accent cursor-pointer"
                >
                  <p className="text-[13px] font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">${p.price.toFixed(2)}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Ticket */}
        <Card className="border-border/60 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="size-4 text-muted-foreground" /> Ticket
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {saleDone && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2.5 text-xs text-emerald-800">
                Sale {saleDone} completed — receipt queued.
              </div>
            )}
            {cart.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">Tap a product to start a ticket.</p>
            ) : (
              <div className="space-y-2">
                {cart.map((l) => (
                  <div key={l.id} className="flex items-center gap-2">
                    <span className="flex-1 text-[13px] truncate">{l.name}</span>
                    <Button variant="outline" size="icon" className="size-7" onClick={() => changeQty(l.id, -1)}>
                      <Minus className="size-3" />
                    </Button>
                    <span className="w-6 text-center text-[13px]">{l.qty}</span>
                    <Button variant="outline" size="icon" className="size-7" onClick={() => changeQty(l.id, 1)}>
                      <Plus className="size-3" />
                    </Button>
                    <span className="w-14 text-right text-[13px] font-medium">
                      ${(l.price * l.qty).toFixed(2)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground"
                      onClick={() => setCart((c) => c.filter((x) => x.id !== l.id))}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-border pt-3 flex items-center justify-between">
              <span className="text-[13px] text-muted-foreground">Total</span>
              <span className="text-lg font-semibold">${total.toFixed(2)}</span>
            </div>

            <div className="flex gap-2">
              <Button
                variant={tendered === 'card' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setTendered('card')}
              >
                Card
              </Button>
              <Button
                variant={tendered === 'cash' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setTendered('cash')}
              >
                Cash
              </Button>
            </div>
            <Button className="w-full" disabled={cart.length === 0} onClick={checkout}>
              Charge ${total.toFixed(2)}
            </Button>
          </CardContent>
        </Card>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Retail sales land in the register ledger; grooming invoices are handled from the appointment,
        not here.
      </p>
      <Badge variant="outline" className="hidden">
        register
      </Badge>
    </div>
  );
}
