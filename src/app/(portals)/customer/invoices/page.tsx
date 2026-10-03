'use client';

import { useCustomerOrders } from '@/hooks/useQueries';
import { FileText, Download, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CustomerInvoicesPage() {
  const { data, isLoading: loading } = useCustomerOrders(50);
  const orders = data?.orders ?? [];

  if (loading) return <div className="p-8 text-[13px] text-muted-foreground">Loading receipts…</div>;

  const paid = orders.filter(o => o.paymentStatus === 'paid' || o.paymentStatus === 'PAID' || o.status === 'COMPLETED' || o.status === 'completed');
  const pending = orders.filter(o => o.paymentStatus === 'pending' || o.paymentStatus === 'PENDING' || o.status === 'PENDING');

  return (
    <div className="mx-auto w-full max-w-[1000px] space-y-6 bg-background p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">My Receipts & Invoices</h1>
        <p className="text-[13px] text-muted-foreground mt-1">View your order history and payment receipts.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total Orders</p>
          <p className="text-2xl font-semibold mt-1">{orders.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Paid</p>
          <p className="text-2xl font-semibold mt-1 text-success">{paid.length}</p>
        </div>
      </div>

      {/* Receipts list */}
      <div className="space-y-2">
        {orders.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-6 text-center text-[13px] text-muted-foreground">
            No receipts yet. Your order history will appear here.
          </div>
        ) : orders.map((order) => (
          <div key={order.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
            <div className="size-10 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
              <FileText className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-medium text-foreground">
                {order.orderNumber || order.id?.slice(0, 8) || '—'}
              </p>
              <p className="text-[12px] text-muted-foreground">
                {order.total != null ? `$${Number(order.total).toFixed(2)}` : order.subtotal ? `$${Number(order.subtotal).toFixed(2)}` : '—'} · {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '—'}
              </p>
            </div>
            <span className={cn(
              'inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase',
              order.paymentStatus === 'paid' || order.paymentStatus === 'PAID' || order.status === 'COMPLETED' || order.status === 'completed'
                ? 'bg-success/10 text-success border-success/20'
                : 'bg-warning/10 text-warning border-warning/20'
            )}>
              {order.paymentStatus || order.status || '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
