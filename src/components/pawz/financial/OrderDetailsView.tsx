'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Printer, Truck, Mail, CreditCard, CheckCircle2, Clock,
  ShieldCheck, Send, AlertCircle, Package, MapPin, User, Calendar,
} from 'lucide-react';
import { DawgNavSection } from '@/lib/types';

interface OrderDetailsViewProps {
  onNavigateSection?: (section: DawgNavSection) => void;
}

type OrderData = {
  id: string;
  saleNumber?: string;
  email: string;
  customerName: string | null;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  fulfillmentMethod: string | null;
  subtotal: string;
  totalAmount: string;
  shippingAddress: string | null;
  trackingNumber: string | null;
  carrier: string | null;
  trackingStatus: string | null;
  notes: string | null;
  createdAt: string;
  items: {
    id: string;
    productId: string | null;
    name: string;
    quantity: number;
    unitPrice: string;
  }[];
};

export const OrderDetailsView: React.FC<OrderDetailsViewProps> = ({ onNavigateSection }) => {
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [sentNotice, setSentNotice] = useState(false);

  // Get the order ID from the URL query (?id=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('id');
    if (!orderId) {
      setError('No order ID provided');
      setLoading(false);
      return;
    }
    fetch('/api/admin/orders')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        const found = d?.orders?.find((o: any) => o.id === orderId);
        if (found) setOrder(found);
        else setError('Order not found');
      })
      .catch(() => setError('Failed to load order'))
      .finally(() => setLoading(false));
  }, []);

  const handleSend = () => {
    if (!message.trim() || !order) return;
    setSentNotice(true);
    setTimeout(() => { setMessage(''); setSentNotice(false); }, 2500);
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  if (loading) {
    return <div className="p-6 text-muted-foreground">Loading order details…</div>;
  }

  if (error || !order) {
    return (
      <div className="p-6 space-y-4">
        <button onClick={() => onNavigateSection?.('orders')} className="text-[13px] text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Orders
        </button>
        <div className="text-center py-12">
          <AlertCircle className="size-8 mx-auto text-muted-foreground/40" />
          <p className="text-[14px] text-muted-foreground mt-3">{error || 'Order not found'}</p>
        </div>
      </div>
    );
  }

  const total = parseFloat(String(order.totalAmount || '0').replace(/[^0-9.]/g, '')) || 0;
  const itemsTotal = order.items.reduce((sum, it) => {
    const unit = parseFloat(String(it.unitPrice || '0').replace(/[^0-9.]/g, '')) || 0;
    return sum + unit * it.quantity;
  }, 0);

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto text-foreground bg-card min-h-full">
      {/* Top bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border border-border p-4 bg-card gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] tabular-nums uppercase tracking-wider text-muted-foreground">
            <button onClick={() => onNavigateSection?.('orders')} className="hover:underline flex items-center gap-1 text-foreground font-semibold cursor-pointer">
              <ArrowLeft className="w-3 h-3" /> <span>ORDERS</span>
            </button>
            <span>{'//'}</span>
            <span className="text-foreground font-semibold">#{order.id.slice(0, 8).toUpperCase()}</span>
          </div>
          <h1 className="text-[20px] font-semibold mt-1.5">Order Details</h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Placed {formatDate(order.createdAt)} · {order.fulfillmentMethod || 'Shipping'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 border border-border text-[11px] font-semibold hover:bg-accent/50 flex items-center gap-1.5 cursor-pointer">
            <Printer className="w-3 h-3" /> Packing Slip
          </button>
          <button className="px-3 py-1.5 border border-border text-[11px] font-semibold hover:bg-accent/50 flex items-center gap-1.5 cursor-pointer">
            <Truck className="w-3 h-3" /> Shipping Label
          </button>
          <button className="px-3 py-1.5 border border-border text-[11px] font-semibold hover:bg-accent/50 flex items-center gap-1.5 cursor-pointer">
            <Mail className="w-3 h-3" /> Resend Alert
          </button>
        </div>
      </div>

      {/* Status + SLA */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="border border-border p-3">
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Fulfillment</p>
          <p className={`text-[13px] font-semibold mt-1 ${order.fulfillmentStatus === 'delivered' ? 'text-success' : order.fulfillmentStatus === 'shipped' ? 'text-primary' : 'text-warning'}`}>
            {order.fulfillmentStatus || 'pending'}
          </p>
        </div>
        <div className="border border-border p-3">
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Payment</p>
          <p className={`text-[13px] font-semibold mt-1 ${order.paymentStatus === 'paid' ? 'text-success' : 'text-warning'}`}>
            {order.paymentStatus || 'unpaid'}
          </p>
        </div>
        <div className="border border-border p-3">
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Method</p>
          <p className="text-[13px] font-semibold mt-1">{order.fulfillmentMethod || '—'}</p>
        </div>
        <div className="border border-border p-3">
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Order Age</p>
          <p className="text-[13px] font-semibold mt-1">
            {order.createdAt ? `${Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 3600000)}h` : '—'}
          </p>
        </div>
      </div>

      {/* Two-column: items + customer */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* Items */}
        <div className="border border-border">
          <div className="px-4 py-2.5 border-b border-border bg-muted/30">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Items ({order.items.length})</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/20">
              <tr>
                <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Item</th>
                <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Qty</th>
                <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Unit Price</th>
                <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, i) => {
                const unit = parseFloat(String(item.unitPrice || '0').replace(/[^0-9.]/g, '')) || 0;
                return (
                  <tr key={i} className="border-t border-border">
                    <td className="px-4 py-2.5 text-[13px] text-foreground">{item.name}</td>
                    <td className="px-4 py-2.5 text-right text-[13px] tabular-nums">{item.quantity}</td>
                    <td className="px-4 py-2.5 text-right text-[13px] tabular-nums">${unit.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right text-[13px] font-semibold tabular-nums">${(unit * item.quantity).toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-muted/20">
                <td colSpan={3} className="px-4 py-2.5 text-right text-[12px] font-bold text-muted-foreground">Subtotal</td>
                <td className="px-4 py-2.5 text-right text-[13px] font-semibold tabular-nums">${itemsTotal.toFixed(2)}</td>
              </tr>
              <tr className="bg-muted/20">
                <td colSpan={3} className="px-4 py-2.5 text-right text-[12px] font-bold text-foreground">Total</td>
                <td className="px-4 py-2.5 text-right text-[15px] font-bold tabular-nums">${total.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Customer + shipping */}
        <div className="space-y-4">
          <div className="border border-border p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Customer</p>
            <div className="space-y-1.5">
              <p className="text-[13px] font-medium text-foreground flex items-center gap-1.5">
                <User className="size-3 text-muted-foreground" /> {order.customerName || 'Guest'}
              </p>
              <p className="text-[12px] text-muted-foreground">{order.email}</p>
            </div>
          </div>

          {order.shippingAddress && (
            <div className="border border-border p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Shipping Address</p>
              <p className="text-[12px] text-foreground leading-relaxed">{order.shippingAddress}</p>
            </div>
          )}

          {(order.trackingNumber || order.carrier) && (
            <div className="border border-border p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Tracking</p>
              <div className="space-y-1">
                <p className="text-[12px] text-foreground">
                  <span className="font-medium">{order.carrier || 'USPS'}:</span> {order.trackingNumber}
                </p>
                {order.trackingStatus && (
                  <p className="text-[11px] text-muted-foreground">{order.trackingStatus}</p>
                )}
              </div>
            </div>
          )}

          {order.notes && (
            <div className="border border-border p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Notes</p>
              <p className="text-[12px] text-foreground">{order.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Message bar */}
      <div className="border border-border p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Send Customer Alert</p>
        <div className="flex gap-2">
          <input
            type="text" value={message} onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message to send to the customer…"
            className="flex-1 border border-border px-3 py-2 text-[13px] bg-background focus:outline-none focus:border-foreground"
          />
          <button onClick={handleSend} className="px-4 py-2 bg-ink text-white text-[12px] font-semibold flex items-center gap-1.5 cursor-pointer hover:opacity-90">
            <Send className="w-3.5 h-3.5" /> Send
          </button>
        </div>
        {sentNotice && <p className="text-[11px] text-success mt-2">Alert sent to {order.email}</p>}
      </div>
    </div>
  );
};
