'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Package, Truck, CheckCircle2, Clock, AlertCircle, Printer,
  Mail, ExternalLink, Zap, MapPin, ShoppingBag,
} from 'lucide-react';
import type { DawgNavSection } from '@/lib/types';

type Order = {
  id: string;
  email: string;
  customerName: string | null;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  fulfillmentMethod: string | null;
  totalAmount: string;
  shippingAddress: string | null;
  trackingNumber: string | null;
  carrier: string | null;
  createdAt: string;
  items: { id: string; name: string; quantity: number; unitPrice: string }[];
};

const STAGES = [
  { id: 'unfulfilled', label: 'Unfulfilled', icon: Clock, color: 'text-warning' },
  { id: 'rush', label: 'Rush Queue', icon: Zap, color: 'text-destructive' },
  { id: 'ready', label: 'Ready to Ship', icon: Package, color: 'text-primary' },
  { id: 'packed', label: 'Packed & Staged', icon: CheckCircle2, color: 'text-primary' },
  { id: 'pickup', label: 'Local Pickup', icon: MapPin, color: 'text-muted-foreground' },
  { id: 'curbside', label: 'Curbside Arrived', icon: MapPin, color: 'text-muted-foreground' },
  { id: 'shipped', label: 'Shipped Today', icon: Truck, color: 'text-success' },
  { id: 'dispatched', label: 'Dispatched', icon: CheckCircle2, color: 'text-success' },
] as const;

export default function FulfillmentPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState<string>('unfulfilled');

  useEffect(() => {
    fetch('/api/admin/orders')
      .then((r) => r.ok ? r.json() : { orders: [] })
      .then((d) => setOrders(d.orders || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stageOrders = (stage: string) => {
    return orders.filter((o) => {
      const fs = String(o.fulfillmentStatus || '').toUpperCase();
      const isPickup = (o.fulfillmentMethod || '').toLowerCase().includes('pickup');
      switch (stage) {
        case 'unfulfilled': return fs === 'PENDING' || fs === 'UNFULFILLED' || fs === 'PROCESSING';
        case 'rush': return fs === 'PENDING' && (o.createdAt && (Date.now() - new Date(o.createdAt).getTime()) > 3600000);
        case 'ready': return fs === 'PROCESSING' || (fs === 'PENDING' && !isPickup);
        case 'packed': return fs === 'PACKED' || fs === 'STAGED';
        case 'pickup': return isPickup && fs !== 'DELIVERED' && fs !== 'DISPATCHED';
        case 'curbside': return isPickup && (fs === 'CURBSIDE' || fs === 'READY');
        case 'shipped': return fs === 'SHIPPED';
        case 'dispatched': return fs === 'DISPATCHED' || fs === 'DELIVERED';
      }
    });
  };

  const navigate = (s: DawgNavSection) => router.push(`/admin/${s === 'dashboard' ? 'dashboard' : s}`);
  const viewOrder = (id: string) => { window.location.href = `/admin/order-details?id=${id}`; };

  const sendAlert = async (orderId: string) => {
    // Resend alert — calls the existing email infrastructure
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order?.email) return;
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: order.email,
          subject: `Your order #${orderId.slice(0, 8).toUpperCase()} — All About Pawz`,
          template: 'order_alert',
          html: `<p>Hi ${order.customerName || 'there'},</p><p>Your order is being processed. We'll notify you when it ships.</p><p>Order: #${orderId.slice(0, 8).toUpperCase()}</p>`,
        }),
      });
    } catch {}
  };

  if (loading) return <div className="p-6 text-muted-foreground">Loading fulfillment queue…</div>;

  const activeOrders = stageOrders(activeStage);

  return (
    <div className="flex flex-col w-full bg-background text-foreground min-h-full">
      {/* Header */}
      <div className="border-b border-border bg-card px-4 sm:px-6 pt-4 pb-0">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Package className="size-6" /> Fulfillment Queue
        </h1>
        <p className="text-[13px] text-muted-foreground mt-1 mb-3">
          Track every order from unfulfilled to dispatched. Select a stage to see orders in that queue.
        </p>
        {/* Stage tabs */}
        <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar -mb-px">
          {STAGES.map((stage) => {
            const Icon = stage.icon;
            const count = stageOrders(stage.id).length;
            const active = activeStage === stage.id;
            return (
              <button
                key={stage.id}
                onClick={() => setActiveStage(stage.id)}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-2 text-[13px] font-medium whitespace-nowrap border-b-2 transition-colors cursor-pointer',
                  active ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
                )}
              >
                <Icon className={cn('size-4', active ? stage.color : '')} />
                {stage.label}
                {count > 0 && (
                  <span className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                    active ? 'bg-ink text-white' : 'bg-muted text-muted-foreground',
                  )}>{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Queue body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {activeOrders.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle2 className="size-10 mx-auto text-muted-foreground/30" />
            <p className="text-[14px] font-medium text-foreground mt-3">No orders in this queue</p>
            <p className="text-[13px] text-muted-foreground mt-1">All caught up — check another stage.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeOrders.map((order) => {
              const total = parseFloat(String(order.totalAmount || '0').replace(/[^0-9.]/g, '')) || 0;
              const age = order.createdAt ? Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 3600000) : 0;
              const isRush = age > 24;
              return (
                <div key={order.id} className="border border-border bg-card rounded-lg p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: order info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[13px] font-bold text-foreground">#{order.id.slice(0, 8).toUpperCase()}</span>
                        {isRush && (
                          <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">
                            <Zap className="size-2.5" /> Rush
                          </span>
                        )}
                        <span className="text-[11px] text-muted-foreground">{age}h ago</span>
                      </div>
                      <p className="text-[13px] text-foreground">{order.customerName || order.email}</p>
                      <p className="text-[12px] text-muted-foreground mt-0.5">
                        {order.items.length} item{order.items.length !== 1 ? 's' : ''}: {order.items.map(it => `${it.quantity}× ${it.name}`).join(', ').slice(0, 80)}
                      </p>
                      {order.shippingAddress && (
                        <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                          <MapPin className="size-3" /> {order.shippingAddress.slice(0, 60)}
                        </p>
                      )}
                      {order.trackingNumber && (
                        <p className="text-[11px] text-success mt-1 flex items-center gap-1">
                          <Truck className="size-3" /> {order.carrier || 'USPS'}: {order.trackingNumber}
                        </p>
                      )}
                    </div>

                    {/* Right: total + actions */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="text-[15px] font-bold tabular-nums">${total.toFixed(2)}</span>
                      <span className={cn(
                        'text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded',
                        order.fulfillmentStatus === 'shipped' ? 'bg-success/10 text-success' :
                        order.fulfillmentStatus === 'delivered' ? 'bg-success/10 text-success' :
                        'bg-warning/10 text-warning',
                      )}>
                        {order.fulfillmentStatus || 'pending'}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => viewOrder(order.id)}
                          className="p-1.5 border border-border rounded hover:bg-muted cursor-pointer"
                          title="View details"
                        >
                          <ExternalLink className="size-3" />
                        </button>
                        <button
                          onClick={() => sendAlert(order.id)}
                          className="p-1.5 border border-border rounded hover:bg-muted cursor-pointer"
                          title="Resend alert"
                        >
                          <Mail className="size-3" />
                        </button>
                        <button
                          onClick={() => {
                            // Packing slip — generate printable HTML
                            const w = window.open('', '_blank', 'width=400,height=600');
                            if (!w) return;
                            const items = order.items.map(it => `<tr><td>${it.quantity}x</td><td>${it.name}</td></tr>`).join('');
                            w.document.write(`<html><head><title>Packing Slip</title><style>body{font-family:monospace;font-size:12px;padding:20px}table{width:100%}td,th{padding:4px;border-bottom:1px solid #ccc}</style></head><body><h1>All About Pawz</h1><p>Order: #${order.id.slice(0,8).toUpperCase()}</p><p>Customer: ${order.customerName || order.email}</p><hr><table><tr><th>Qty</th><th>Item</th></tr>${items}</table></body></html>`);
                            w.document.close();
                            w.print();
                          }}
                          className="p-1.5 border border-border rounded hover:bg-muted cursor-pointer"
                          title="Packing slip"
                        >
                          <Printer className="size-3" />
                        </button>
                        <button
                          onClick={() => { window.location.href = `/admin/shipping?orderId=${order.id}`; }}
                          className="p-1.5 border border-border rounded hover:bg-muted cursor-pointer"
                          title="Shipping label"
                        >
                          <Truck className="size-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
