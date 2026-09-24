'use client';

import { useEffect, useState } from 'react';
import { ShoppingBag, Package, Truck, CircleDollarSign, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: string;
}

interface CustomerOrder {
  id: string;
  status: string;
  paymentStatus: string;
  subtotal: string;
  deliveryMethod: string;
  shippingAddress: string;
  trackingNumber: string;
  carrier: string;
  notes: string;
  placedAt: string | null;
  items: OrderItem[];
}

const statusTone = (s: string) =>
  s === 'PAID'
    ? 'bg-success/10 text-success border-success/20'
    : s === 'PAYMENT_PENDING'
      ? 'bg-warning/10 text-warning border-warning/20'
      : s === 'CANCELLED' || s === 'CANCELLED_REFUNDED'
        ? 'bg-destructive/10 text-destructive border-destructive/20'
        : 'bg-muted text-muted-foreground border-border';

const paymentTone = (s: string) =>
  s === 'PAID'
    ? 'bg-success/10 text-success border-success/20'
    : s === 'UNPAID'
      ? 'bg-warning/10 text-warning border-warning/20'
      : 'bg-muted text-muted-foreground border-border';

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/customer/orders')
      .then((r) => (r.ok ? r.json() : { orders: [] }))
      .then((d) => setOrders(d.orders || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  const totalSpent = orders
    .filter((o) => o.paymentStatus === 'PAID')
    .reduce((acc, o) => acc + (parseFloat(String(o.subtotal).replace(/[^0-9.]/g, '')) || 0), 0);
  const totalItems = orders.reduce((acc, o) => acc + o.items.reduce((a, it) => a + (it.quantity || 1), 0), 0);
  const openOrders = orders.filter((o) => o.status !== 'CANCELLED' && o.paymentStatus !== 'PAID').length;

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 bg-background p-6 md:p-8">
      <div>
        <h1 className="font-bar text-2xl font-semibold tracking-tight text-foreground">
          My Orders
        </h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          Your shop purchases, order status, and tracking — all in one place.
        </p>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Orders', value: String(orders.length), icon: ShoppingBag },
          { label: 'Items Purchased', value: String(totalItems), icon: Package },
          { label: 'Total Spent', value: `$${totalSpent.toFixed(2)}`, icon: CircleDollarSign },
          { label: 'Open Orders', value: String(openOrders), icon: CreditCard },
        ].map((tile) => {
          const Icon = tile.icon;
          return (
            <div key={tile.label} className="bg-card border border-border rounded-xl shadow-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Icon className="size-4" />
                <span className="text-[11px] font-medium uppercase tracking-wider">{tile.label}</span>
              </div>
              <p className="font-bar text-xl font-semibold text-foreground mt-2 tabular-nums">{tile.value}</p>
            </div>
          );
        })}
      </div>

      {/* Order list */}
      {loading ? (
        <div className="bg-card border border-border rounded-xl shadow-card p-8 text-center text-muted-foreground text-[13px]">
          Loading your orders…
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-card border border-border rounded-xl shadow-card p-8 text-center">
          <ShoppingBag className="size-8 mx-auto text-muted-foreground/50" />
          <p className="text-[14px] font-medium text-foreground mt-3">No orders yet</p>
          <p className="text-[13px] text-muted-foreground mt-1">
            Orders you place in the shop appear here automatically — sign in with this same email at checkout.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
              {/* Order header */}
              <div className="bg-muted/40 border-b border-border px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
                    <Package className="size-4" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-foreground tabular-nums">
                      Order #{order.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {order.placedAt ? new Date(order.placedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'Date pending'}
                      {' · '}
                      {order.deliveryMethod === 'pickup' ? 'Store pickup' : 'Shipping'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn('inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase', statusTone(order.status))}>
                    {order.status === 'PAYMENT_PENDING' ? 'Awaiting Payment' : order.status}
                  </span>
                  <span className={cn('inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase', paymentTone(order.paymentStatus))}>
                    {order.paymentStatus}
                  </span>
                </div>
              </div>

              {/* Items */}
              <div className="divide-y divide-border">
                {order.items.map((item) => (
                  <div key={item.id} className="px-4 py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-foreground truncate">{item.name}</p>
                      <p className="text-[11px] text-muted-foreground">Qty {item.quantity}</p>
                    </div>
                    <p className="text-[13px] text-foreground tabular-nums shrink-0">{item.unitPrice}</p>
                  </div>
                ))}
                {order.items.length === 0 && (
                  <div className="px-4 py-3 text-[12px] text-muted-foreground">No line items recorded for this order.</div>
                )}
              </div>

              {/* Footer: total + delivery + tracking */}
              <div className="px-4 py-3 bg-muted/20 border-t border-border flex flex-wrap items-center justify-between gap-3">
                <div className="text-[12px] text-muted-foreground">
                  {order.deliveryMethod === 'ship' && order.shippingAddress && (
                    <span className="inline-flex items-center gap-1.5">
                      <Truck className="size-3.5" /> {order.shippingAddress}
                    </span>
                  )}
                  {order.trackingNumber && (
                    <span className="inline-flex items-center gap-1.5 ml-4">
                      Tracking: <span className="font-medium text-foreground tabular-nums">{order.trackingNumber}</span>
                      {order.carrier ? ` (${order.carrier})` : ''}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Total </span>
                  <span className="font-bar text-lg font-semibold text-foreground tabular-nums">{order.subtotal}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
