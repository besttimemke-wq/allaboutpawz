'use client';

import React, { useState, useEffect } from 'react';
import { 
  RotateCcw, 
  Search, 
  Download, 
  Plus, 
  Truck, 
  CheckCircle2, 
  AlertTriangle, 
  Gift, 
  CreditCard,
  Layers,
  ArrowRight
} from 'lucide-react';
import { DawgNavSection } from '@/lib/types';

interface ReturnsViewProps {
  onNavigateSection?: (section: DawgNavSection) => void;
}

export const ReturnsView: React.FC<ReturnsViewProps> = ({ onNavigateSection }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'action' | 'transit' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [liveRmas, setLiveRmas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch REAL refunds from the POS API (which has the refund action)
    // + also fetch orders to cross-reference
    Promise.all([
      fetch('/api/admin/pos').then(r => r.ok ? r.json() : { catalog: [] }).catch(() => ({ catalog: [] })),
      fetch('/api/admin/orders').then(r => r.ok ? r.json() : { orders: [] }).catch(() => ({ orders: [] })),
    ]).then(([posData, ordersData]) => {
      const orders = ordersData.orders || [];
      // Map orders with return/cancelled/refunded status to RMA display
      const fromOrders = orders
        .filter((o: any) => {
          const fs = String(o.fulfillmentStatus || '').toUpperCase();
          const ps = String(o.paymentStatus || '').toUpperCase();
          return fs === 'CANCELLED' || fs === 'RETURNED' || fs === 'REFUNDED' || ps === 'REFUNDED';
        })
        .map((o: any) => ({
          id: `RMA-${o.id?.slice(0, 8).toUpperCase() || '???'}`,
          time: o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—',
          orderRef: `#${o.id?.slice(0, 8).toUpperCase() || '???'}`,
          customer: o.customerName || o.email || 'Guest',
          pet: '—',
          item: (o.items || []).map((it: any) => `${it.quantity}× ${it.name}`).join(', ') || '—',
          condition: '—',
          reason: o.notes || 'Customer return',
          resolution: `$${parseFloat(String(o.totalAmount || '0').replace(/[^0-9.]/g, '')).toFixed(2)}`,
          status: (o.fulfillmentStatus || 'Pending').toUpperCase(),
          orderId: o.id,
        }));
      setLiveRmas(fromOrders);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const rmas = liveRmas;

  const filteredRmas = rmas.filter((rma) => {
    const st = String(rma.status || '').toUpperCase();
    if (activeTab === 'action' && !(st.includes('PENDING') || st.includes('ACTION') || st.includes('INSPECT'))) return false;
    if (activeTab === 'transit' && !st.includes('AWAITING')) return false;
    if (activeTab === 'completed' && !(st.includes('COMPLETE') || st.includes('REFUND') || st.includes('CANCEL'))) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        rma.id.toLowerCase().includes(q) ||
        rma.orderRef.toLowerCase().includes(q) ||
        rma.customer.toLowerCase().includes(q) ||
        rma.item.toLowerCase().includes(q) ||
        rma.reason.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto text-foreground bg-card min-h-full">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
            <span>Operations</span>
            <span>/</span>
            <span>OMS</span>
            <span>/</span>
            <span className="text-foreground font-semibold">Reverse Logistics &amp; RMA</span>
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Returns &amp; Exchanges (RMA)
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Inspect incoming retail returns, issue replacements, and synchronize refunds or store credits.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => alert('Viewing salon return policies...')}
            className="h-9 px-3 border border-border bg-card hover:bg-accent/50 text-foreground font-semibold text-[13px] uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <span>Return Policy</span>
          </button>
          <button 
            onClick={() => alert('Generating return shipping label...')}
            className="h-9 px-3 border border-border bg-card hover:bg-accent/50 text-foreground font-semibold text-[13px] uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Generate Label</span>
          </button>
          <button 
            onClick={() => alert('Opening Initiate Return form...')}
            className="h-9 px-4 bg-black hover:bg-muted text-white font-semibold text-[13px] uppercase tracking-wider flex items-center gap-1.5 border border-border cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Initiate RMA</span>
          </button>
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <div className="border border-border p-4 bg-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Open RMA Requests</span>
            <span className="px-1 py-0.2 bg-primary text-primary-foreground text-[9px] font-semibold">ACTIVE</span>
          </div>
          <p className="text-2xl font-semibold tabular-nums mt-2 tracking-tight text-foreground">04</p>
          <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5">Active cases</p>
        </div>

        <div className="border border-border p-4 bg-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span>In-Transit to Salon</span>
            <Truck className="w-3.5 h-3.5 text-foreground" />
          </div>
          <p className="text-2xl font-semibold tabular-nums mt-2 tracking-tight text-foreground">02</p>
          <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5">USPS Returns</p>
        </div>

        <div className="border border-border p-4 bg-card flex flex-col justify-between shadow-card">
          <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <span>Awaiting Inspection</span>
            <span className="px-1 py-0.2 bg-primary text-primary-foreground text-[9px] font-semibold">ACTION</span>
          </div>
          <p className="text-2xl font-semibold tabular-nums mt-2 tracking-tight text-foreground">01</p>
          <p className="text-[10px] text-foreground font-semibold tabular-nums mt-0.5">At Salon Facility</p>
        </div>

        <div className="border border-border p-4 bg-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Processed (MTD)</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-foreground" />
          </div>
          <p className="text-2xl font-semibold tabular-nums mt-2 tracking-tight text-foreground">14</p>
          <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5">$480.00 volume</p>
        </div>

        <div className="border border-border p-4 bg-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Store Credit Retained</span>
            <Gift className="w-3.5 h-3.5 text-foreground" />
          </div>
          <p className="text-2xl font-semibold tabular-nums mt-2 tracking-tight text-foreground">65%</p>
          <p className="text-[10px] text-foreground font-semibold tabular-nums mt-0.5">Kept in-house</p>
        </div>

        <div className="border border-border p-4 bg-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Restock Rate</span>
            <Layers className="w-3.5 h-3.5 text-foreground" />
          </div>
          <p className="text-2xl font-semibold tabular-nums mt-2 tracking-tight text-foreground">88%</p>
          <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5">Resellable condition</p>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="border border-border bg-card">
        {/* Tabs */}
        <div className="flex items-center overflow-x-auto border-b border-border">
          {[
            { id: 'all', label: 'All Returns', count: 21 },
            { id: 'action', label: 'Action Required', count: 4 },
            { id: 'transit', label: 'Awaiting Package', count: 2 },
            { id: 'completed', label: 'Completed', count: 12 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 text-[13px] font-semibold uppercase tracking-wider border-r border-border whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-foreground hover:bg-accent/50'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="p-3 bg-muted/30 border-b border-border flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <span className="absolute left-2.5 top-2.5 text-muted-foreground pointer-events-none">
              <Search className="w-3.5 h-3.5" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search RMA #, order #, customer, or item..."
              className="w-full h-8 pl-8 pr-3 text-[13px] bg-card border border-border text-foreground placeholder-gray-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px] text-foreground border-collapse tabular-nums">
            <thead>
              <tr className="bg-muted/30 border-b border-border font-semibold uppercase text-[11px] tracking-wider text-foreground">
                <th className="py-2.5 px-3 border-r border-border">RMA ID</th>
                <th className="py-2.5 px-3 border-r border-border">Order Ref</th>
                <th className="py-2.5 px-3 border-r border-border">Customer &amp; Pet</th>
                <th className="py-2.5 px-3 border-r border-border">Item &amp; Condition</th>
                <th className="py-2.5 px-3 border-r border-border">Reason</th>
                <th className="py-2.5 px-3 border-r border-border">Resolution</th>
                <th className="py-2.5 px-3 border-r border-border text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRmas.map((rma) => (
                <tr key={rma.id} className="hover:bg-accent/50 transition-colors">
                  <td className="py-3 px-3 font-semibold text-foreground border-r border-border">
                    <p>{rma.id}</p>
                    <p className="text-[10px] text-muted-foreground font-normal">{rma.time}</p>
                  </td>
                  <td className="py-3 px-3 border-r border-border">
                    <span className="font-semibold underline cursor-pointer">{rma.orderRef}</span>
                  </td>
                  <td className="py-3 px-3 border-r border-border font-sans">
                    <p className="font-semibold text-foreground uppercase">{rma.customer}</p>
                    <p className="text-[10px] text-muted-foreground">{rma.pet}</p>
                  </td>
                  <td className="py-3 px-3 border-r border-border font-sans max-w-xs">
                    <p className="font-medium text-foreground">{rma.item}</p>
                    <p className="text-[10px] text-muted-foreground tabular-nums">Cond: {rma.condition}</p>
                  </td>
                  <td className="py-3 px-3 border-r border-border">
                    <span className="px-1.5 py-0.5 border border-border bg-muted/40 text-[10px] font-semibold">
                      {rma.reason}
                    </span>
                  </td>
                  <td className="py-3 px-3 border-r border-border font-semibold text-foreground">
                    {rma.resolution}
                  </td>
                  <td className="py-3 px-3 border-r border-border text-center">
                    <span className={`inline-block px-2 py-0.5 border border-border text-[10px] font-semibold uppercase ${
                      rma.status === 'Pending Inspection'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card text-foreground'
                    }`}>
                      {rma.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button 
                      onClick={() => alert(`Inspecting and resolving ${rma.id}`)}
                      className="px-2.5 py-1 border border-border bg-primary text-primary-foreground hover:bg-primary/90 text-[10px] font-semibold uppercase transition-colors cursor-pointer"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-3 bg-muted/30 border-t border-border flex items-center justify-between text-[13px] tabular-nums">
          <p className="text-muted-foreground text-[11px] uppercase">
            Showing {filteredRmas.length} of {rmas.length} RMA requests
          </p>
        </div>
      </div>

      {/* 3-Step Workflow Banner */}
      <div className="border border-border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <h3 className="font-display font-semibold tracking-tight text-[13px] text-foreground">3-Step Return Resolution Workflow</h3>
          <span className="text-[10px] tabular-nums text-foreground font-semibold">OMS AUTO-SYNC ACTIVE</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[13px] tabular-nums">
          <div className="p-3 border border-border bg-muted/30 space-y-1">
            <p className="font-semibold uppercase text-[11px] text-foreground">01. Condition &amp; Seal Verification</p>
            <p className="text-[11px] text-muted-foreground font-sans">Inspect hygienic packaging, hair-free status on brushes, and seal integrity.</p>
          </div>
          <div className="p-3 border border-border bg-muted/30 space-y-1">
            <p className="font-semibold uppercase text-[11px] text-foreground">02. Automated Inventory Restock</p>
            <p className="text-[11px] text-muted-foreground font-sans">One-click reintegration updates stock levels across POS and E-Commerce catalog.</p>
          </div>
          <div className="p-3 border border-border bg-muted/30 space-y-1">
            <p className="font-semibold uppercase text-[11px] text-foreground">03. Instant Credit or Card Refund</p>
            <p className="text-[11px] text-muted-foreground font-sans">Generate digital store credit voucher or dispatch automated refund payload.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
