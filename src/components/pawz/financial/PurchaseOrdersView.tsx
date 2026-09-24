'use client';

import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Search, 
  Download, 
  Plus, 
  Truck, 
  Barcode, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Store,
  Check
} from 'lucide-react';
import { DawgNavSection } from '@/lib/types';

interface PurchaseOrdersViewProps {
  onNavigateSection?: (section: DawgNavSection) => void;
}

export const PurchaseOrdersView: React.FC<PurchaseOrdersViewProps> = ({ onNavigateSection }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'ordered' | 'transit' | 'received'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [scannedQty, setScannedQty] = useState(10);
  const [verifiedCount, setVerifiedCount] = useState(60);
  const totalExpected = 80;

  // LIVE DATA — fetch purchase orders from the API
  const [livePos, setLivePos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreatePO, setShowCreatePO] = useState(false);
  const [poVendor, setPoVendor] = useState('');
  const [poItems, setPoItems] = useState('');
  const [poQty, setPoQty] = useState('10');
  const [poCost, setPoCost] = useState('');

  useEffect(() => {
    fetch('/api/admin/orders')
      .then((r) => r.ok ? r.json() : { orders: [] })
      .then((d) => {
        // Map commerce_orders to PO display shape (until /api/admin/purchase-orders exists)
        const rows = (d.orders || []).map((o: any) => ({
          id: o.id?.slice(0, 12).toUpperCase() || 'PO-?',
          vendor: o.email || '—',
          items: (o.items || []).map((it: any) => `${it.quantity}× ${it.name}`).join(', ') || '—',
          delivery: o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase() : '—',
          eta: o.fulfillmentStatus || '—',
          totalUnits: o.items?.reduce((s: number, it: any) => s + (it.quantity || 0), 0) || 0,
          checkedUnits: 0,
          cost: parseFloat(String(o.totalAmount || '0').replace(/[^0-9.]/g, '')) || 0,
          terms: o.paymentStatus?.toUpperCase() || 'UNPAID',
          status: (o.fulfillmentStatus || 'ORDERED').toUpperCase(),
        }));
        setLivePos(rows);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const pos = livePos.length > 0 ? livePos : [];

  const handleScanCheckIn = () => {
    setVerifiedCount(prev => Math.min(totalExpected, prev + scannedQty));
  };

  const percentComplete = Math.round((verifiedCount / totalExpected) * 100);

  const filteredPos = pos.filter((po) => {
    if (activeTab === 'ordered' && po.status !== 'ORDERED') return false;
    if (activeTab === 'transit' && po.status !== 'IN TRANSIT') return false;
    if (activeTab === 'received' && po.status !== 'RECEIVED' && po.status !== 'PARTIAL') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        po.id.toLowerCase().includes(q) ||
        po.vendor.toLowerCase().includes(q) ||
        po.items.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto text-foreground bg-card min-h-full">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2 text-[10px] tabular-nums uppercase tracking-wider text-muted-foreground mb-1">
            <span className="bg-primary text-primary-foreground px-1.5 py-0.5 font-semibold">LOGISTICS // OMS</span>
            <span>/</span>
            <span className="text-foreground font-semibold">PO-RECV-STATION-01</span>
          </div>
          <h1 className="text-2xl font-semibold uppercase tracking-tight text-foreground">
            Purchase Orders &amp; Receiving
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Create vendor purchase orders, receive supplier shipments, and update inventory counts in bulk.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => alert('Viewing vendor directory...')}
            className="h-9 px-3 border border-border bg-card hover:bg-accent/50 text-foreground font-semibold text-[13px] uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Store className="w-3.5 h-3.5" />
            <span>Vendors</span>
          </button>
          <button 
            onClick={() => alert('Exporting purchase ledger...')}
            className="h-9 px-3 border border-border bg-card hover:bg-accent/50 text-foreground font-semibold text-[13px] uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Ledger</span>
          </button>
          <button 
            onClick={() => setShowCreatePO(true)}
            className="h-9 px-4 bg-black hover:bg-muted text-white font-semibold text-[13px] uppercase tracking-wider flex items-center gap-1.5 border border-border cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Create PO</span>
          </button>
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <div className="border border-border p-4 bg-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Open Orders</span>
            <span className="text-[12px]">03</span>
          </div>
          <p className="text-2xl font-semibold tabular-nums mt-2 tracking-tight text-foreground">03</p>
          <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5">$3,420 committed</p>
        </div>

        <div className="border border-border p-4 bg-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span>In-Transit</span>
            <Truck className="w-3.5 h-3.5 text-foreground" />
          </div>
          <p className="text-2xl font-semibold tabular-nums mt-2 tracking-tight text-foreground">02</p>
          <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5">ETA: 48-72 hrs</p>
        </div>

        <div className="border border-border p-4 bg-card flex flex-col justify-between shadow-card">
          <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <span>Partial Recv</span>
            <span className="px-1 py-0.2 bg-primary text-primary-foreground text-[9px] font-semibold">ACTIVE</span>
          </div>
          <p className="text-2xl font-semibold tabular-nums mt-2 tracking-tight text-foreground">01</p>
          <p className="text-[10px] text-foreground font-semibold tabular-nums mt-0.5">20 units left</p>
        </div>

        <div className="border border-border p-4 bg-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Active Vendors</span>
            <Store className="w-3.5 h-3.5 text-foreground" />
          </div>
          <p className="text-2xl font-semibold tabular-nums mt-2 tracking-tight text-foreground">08</p>
          <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5">100% on-time</p>
        </div>

        <div className="border border-border p-4 bg-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Recv This Month</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-foreground" />
          </div>
          <p className="text-2xl font-semibold tabular-nums mt-2 tracking-tight text-foreground">$8,940</p>
          <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5">14 shipments</p>
        </div>

        <div className="border border-border p-4 bg-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Low Stock Alerts</span>
            <AlertTriangle className="w-3.5 h-3.5 text-foreground" />
          </div>
          <p className="text-2xl font-semibold tabular-nums mt-2 tracking-tight text-foreground">05</p>
          <p className="text-[10px] text-foreground font-semibold tabular-nums mt-0.5">Reorder points</p>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="border border-border bg-card">
        {/* Tabs */}
        <div className="flex items-center overflow-x-auto border-b border-border">
          {[
            { id: 'all', label: 'All Orders', count: 18 },
            { id: 'ordered', label: 'Open / Ordered', count: 3 },
            { id: 'transit', label: 'In-Transit', count: 2 },
            { id: 'received', label: 'Received / Closed', count: 13 },
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
              placeholder="Filter PO #, vendor, or items..."
              className="w-full h-8 pl-8 pr-3 text-[13px] bg-card border border-border text-foreground placeholder-gray-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px] text-foreground border-collapse tabular-nums">
            <thead>
              <tr className="bg-muted/30 border-b border-border font-semibold uppercase text-[11px] tracking-wider text-foreground">
                <th className="py-2.5 px-3 border-r border-border">PO Number</th>
                <th className="py-2.5 px-3 border-r border-border">Vendor Name</th>
                <th className="py-2.5 px-3 border-r border-border">Expected Delivery</th>
                <th className="py-2.5 px-3 border-r border-border text-center">Total Units</th>
                <th className="py-2.5 px-3 border-r border-border text-right">Total Cost</th>
                <th className="py-2.5 px-3 border-r border-border text-center">Terms</th>
                <th className="py-2.5 px-3 border-r border-border">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredPos.map((po) => (
                <tr key={po.id} className="hover:bg-accent/50 transition-colors">
                  <td className="py-3 px-3 font-semibold text-foreground border-r border-border">
                    {po.id}
                  </td>
                  <td className="py-3 px-3 border-r border-border font-sans">
                    <p className="font-semibold text-foreground">{po.vendor}</p>
                    <p className="text-[10px] text-muted-foreground tabular-nums">{po.items}</p>
                  </td>
                  <td className="py-3 px-3 border-r border-border">
                    <p className="font-semibold text-foreground">{po.delivery}</p>
                    <p className="text-[10px] text-muted-foreground">{po.eta}</p>
                  </td>
                  <td className="py-3 px-3 border-r border-border text-center font-semibold">
                    {po.checkedUnits} / {po.totalUnits}
                  </td>
                  <td className="py-3 px-3 border-r border-border text-right font-semibold">
                    ${po.cost.toFixed(2)}
                  </td>
                  <td className="py-3 px-3 border-r border-border text-center">
                    <span className="px-1.5 py-0.5 border border-border bg-muted/40 text-[10px] font-semibold">
                      {po.terms}
                    </span>
                  </td>
                  <td className="py-3 px-3 border-r border-border">
                    <span className={`inline-block px-2 py-0.5 border border-border text-[10px] font-semibold uppercase ${
                      po.status === 'IN TRANSIT'
                        ? 'bg-primary text-primary-foreground'
                        : po.status === 'PARTIAL'
                        ? 'bg-muted/40 text-foreground'
                        : 'bg-card text-foreground'
                    }`}>
                      {po.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button 
                      onClick={() => alert(`Receiving stock for ${po.id}`)}
                      className="px-2.5 py-1 bg-primary text-primary-foreground hover:bg-primary/90 text-[10px] font-semibold uppercase transition-colors cursor-pointer"
                    >
                      Receive
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
            Showing {filteredPos.length} of {pos.length} purchase orders
          </p>
        </div>
      </div>

      {/* Rapid Receiving Dock Barcode Scanner */}
      <div className="border border-border bg-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-2">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-primary text-primary-foreground text-[10px] tabular-nums font-semibold uppercase">STATION LIVE</span>
            <h3 className="font-semibold uppercase text-[13px] text-foreground">Rapid Receiving Dock // Barcode Scanner</h3>
          </div>
          <span className="text-[11px] tabular-nums text-muted-foreground">PO CONTEXT: PO-2025-017 (BARKBOUTIQUE)</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-3">
            <p className="text-[13px] text-muted-foreground tabular-nums">
              Scan barcode or enter internal SKU to automatically increment verified stock.
            </p>
            <div className="flex gap-2">
              <input 
                type="text"
                defaultValue="SKU-88210-CLMTREAT"
                className="flex-1 h-10 px-3 bg-muted/30 border border-border text-[13px] tabular-nums uppercase focus:outline-none"
              />
              <div className="flex items-center border border-border bg-muted/30 px-2 text-[12px]">
                <span className="text-muted-foreground text-[10px] mr-2">QTY</span>
                <input 
                  type="number"
                  value={scannedQty}
                  onChange={(e) => setScannedQty(parseInt(e.target.value) || 1)}
                  className="w-12 text-center font-semibold bg-transparent focus:outline-none"
                />
              </div>
              <button 
                onClick={handleScanCheckIn}
                className="px-4 bg-primary text-primary-foreground font-semibold text-[13px] uppercase tracking-wider flex items-center gap-1 border border-border cursor-pointer hover:bg-muted"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirm</span>
              </button>
            </div>
            <p className="text-[11px] tabular-nums text-muted-foreground">
              LAST SCANNED: <strong>Organic Calming Lavender Hemp Treats (100g)</strong> • 100% SKU HIT
            </p>
          </div>

          <div className="lg:col-span-5 border border-border p-4 bg-muted/30 space-y-3 text-[12px]">
            <div className="flex justify-between font-semibold">
              <span>PO PROGRESS TALLY</span>
              <span>{percentComplete}% COMPLETE</span>
            </div>
            <div className="w-full h-3 border border-border bg-card overflow-hidden">
              <div className="h-full bg-black transition-all" style={{ width: `${percentComplete}%` }}></div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-semibold">
              <div className="p-2 bg-card border border-border">
                <p className="text-muted-foreground">EXPECTED</p>
                <p className="text-base font-semibold text-foreground mt-0.5">{totalExpected}</p>
              </div>
              <div className="p-2 bg-card border border-border">
                <p className="text-muted-foreground">VERIFIED</p>
                <p className="text-base font-semibold text-foreground mt-0.5">{verifiedCount}</p>
              </div>
              <div className="p-2 bg-card border border-border">
                <p className="text-muted-foreground">REMAINING</p>
                <p className="text-base font-semibold text-foreground mt-0.5">{Math.max(0, totalExpected - verifiedCount)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create PO Modal */}
      {showCreatePO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/90 p-4">
          <div className="w-full max-w-md bg-card rounded-2xl border border-border p-6 space-y-4">
            <h3 className="text-[16px] font-semibold">Create Purchase Order</h3>
            <div className="space-y-3">
              <input type="text" placeholder="Vendor name" value={poVendor} onChange={e => setPoVendor(e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-[13px]" />
              <input type="text" placeholder="Items (e.g. 60x Oatmeal Shampoo)" value={poItems} onChange={e => setPoItems(e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-[13px]" />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder="Qty" value={poQty} onChange={e => setPoQty(e.target.value)}
                  className="border border-border rounded-lg px-3 py-2 text-[13px]" />
                <input type="number" placeholder="Total cost ($)" value={poCost} onChange={e => setPoCost(e.target.value)}
                  className="border border-border rounded-lg px-3 py-2 text-[13px]" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowCreatePO(false)} className="flex-1 py-2.5 border border-border rounded-lg text-[13px] font-semibold hover:bg-muted cursor-pointer">Cancel</button>
              <button onClick={() => { setShowCreatePO(false); alert(`PO created for ${poVendor}`); }} className="flex-1 py-2.5 bg-ink text-white rounded-lg text-[13px] font-semibold cursor-pointer">Create PO</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
