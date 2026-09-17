'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Download, 
  Plus, 
  Printer, 
  Truck, 
  Store, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ChevronRight,
  Filter,
  ExternalLink,
  Barcode,
  Package,
  Layers
} from 'lucide-react';
import { DawgNavSection } from '@/lib/types';

interface OrdersViewProps {
  onNavigateSection?: (section: DawgNavSection) => void;
  onOpenOrderDetails?: (orderId: string) => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({ 
  onNavigateSection,
  onOpenOrderDetails 
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'unfulfilled' | 'ready' | 'pickup' | 'shipped' | 'delivered' | 'returns'>('unfulfilled');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrders, setSelectedOrders] = useState<string[]>(['ORD-2025-1048', 'ORD-2025-1044', 'ORD-2025-1042']);

  // ---- LIVE DATA (fallback to mock when no real orders exist) ----
  // Real shop orders live in the Supabase `orders` table (written by the
  // Stripe shop checkout + booking deposit flow). The fetch happens once on
  // mount; when it returns rows we surface them and stop showing the mock
  // array. When the env is unconfigured or the call fails, the existing mock
  // rows render so the page is never blank.
  const MOCK_ORDERS = [
    {
      id: 'ORD-2025-1048',
      time: '1h 40m ago',
      dateText: 'Today, 10:14 AM',
      customer: 'Sarah Johnson',
      pets: 'Buddy (Golden) & Luna',
      items: '2x Blueberry Facial Wash (250ml), 1x De-shedding Rake Pro',
      bins: 'BIN B-04 · BIN T-12',
      total: 85.00,
      payment: 'PAID (STRIPE)',
      method: 'USPS Ground Adv.',
      methodType: 'shipping',
      weight: '2.4 lbs',
      urgency: 'RUSH WAVE',
      due: 'DUE 15:30',
      status: 'UNFULFILLED',
    },
    {
      id: 'ORD-2025-1047',
      time: '2h 00m ago',
      dateText: 'Today, 09:42 AM',
      customer: 'Marcus Johnson',
      pets: 'Rocky (Rottweiler Mix)',
      items: '1x Hypo Shampoo (1 Gal), 1x Ear Cleaner 16oz',
      bins: 'BAY 4 (BULK) · BIN S-08',
      total: 124.50,
      payment: 'PAID (ONLINE)',
      method: 'Curbside Vehicle (Bay 1)',
      methodType: 'pickup',
      weight: '9.8 lbs',
      urgency: 'ARRIVED',
      due: 'ARRIVED 4M AGO',
      status: 'READY',
    },
    {
      id: 'ORD-2025-1046',
      time: '2h 10m ago',
      dateText: 'Today, 09:30 AM',
      customer: 'Emily Davis',
      pets: 'Charlie (Toy Poodle)',
      items: '1x Paw Balm Stick, 1x Silk Coat Spray',
      bins: 'SHELF P-03',
      total: 32.00,
      payment: 'PAID (ONLINE)',
      method: 'In-Salon Counter',
      methodType: 'pickup',
      weight: '0.8 lbs',
      urgency: 'HOLDING',
      due: 'READY ON SHELF',
      status: 'LOCAL_PICKUP',
    },
    {
      id: 'ORD-2025-1045',
      time: '3h ago',
      dateText: 'Today, 08:30 AM',
      customer: 'David Wilson',
      pets: 'Max (German Shepherd)',
      items: '1x Pro Shears 8", 1x Undercoat Comb',
      bins: 'DISPATCH CENTER',
      total: 168.00,
      payment: 'PAID (VISA)',
      method: 'USPS Priority Mail',
      methodType: 'shipping',
      weight: '1.4 lbs',
      urgency: 'IN TRANSIT',
      due: 'DELIVERY TODAY',
      status: 'SHIPPED',
    },
    {
      id: 'ORD-2025-1044',
      time: '2h 15m ago',
      dateText: 'Today, 09:39 AM',
      customer: 'Jessica Ramirez',
      pets: 'Oliver (DSH Feline)',
      items: '3x Wild Organic Salmon Oil 16oz, 1x Foam Wash',
      bins: 'BIN S-01 · BIN S-08',
      total: 54.20,
      payment: 'PAID (APPLE PAY)',
      method: 'USPS Priority Mail',
      methodType: 'shipping',
      weight: '3.8 lbs',
      urgency: 'STANDARD',
      due: 'DUE 18:00',
      status: 'UNFULFILLED',
    },
    {
      id: 'ORD-2025-1043',
      time: '3h 30m ago',
      dateText: 'Today, 08:18 AM',
      customer: 'Anthony Thorne',
      pets: 'Titan (Great Dane)',
      items: '1x XXL Orthopedic Bolster Bed',
      bins: 'BULK BAY 4',
      total: 210.00,
      payment: 'PARTIAL (50% DUE)',
      method: 'Curbside Vehicle (Bay 3)',
      methodType: 'pickup',
      weight: '14.5 lbs',
      urgency: 'ARRIVED',
      due: 'BAL $105 DUE',
      status: 'READY',
    },
    {
      id: 'ORD-2025-1042',
      time: '3h 10m ago',
      dateText: 'Today, 08:44 AM',
      customer: 'Claire Sterling',
      pets: 'Bella & Milo (Frenchies)',
      items: '2x Velvet Step-in Harness (Exchange M→S)',
      bins: 'AISLE 02-B',
      total: 0.00,
      payment: 'EXCHANGED (BAL 0)',
      method: 'USPS Ground Adv.',
      methodType: 'shipping',
      weight: '1.1 lbs',
      urgency: 'WARRANTY',
      due: 'RMA VERIFIED',
      status: 'UNFULFILLED',
    },
    {
      id: 'ORD-2025-1032',
      time: '4h ago',
      dateText: 'May 08, 09:15 AM',
      customer: 'Sarah Johnson',
      pets: 'Buddy (Golden)',
      items: '2x Blueberry Facial Wash, 1x Silk Coat Spray',
      bins: 'PORCH VERIFIED',
      total: 64.00,
      payment: 'PAID (STRIPE)',
      method: 'USPS Priority (POD Photo)',
      methodType: 'shipping',
      weight: '1.5 lbs',
      urgency: 'VERIFIED',
      due: 'DELIVERED',
      status: 'DELIVERED',
    },
  ] as const;

  type MockOrder = typeof MOCK_ORDERS[number];
  const [realOrders, setRealOrders] = useState<MockOrder[]>([]);
  const [realOrdersLoading, setRealOrdersLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/orders')
      .then((r) => (r.ok ? r.json() : { orders: [] }))
      .then((d) => {
        const rows: MockOrder[] = (d.orders || []).map((o: any) => {
          // Map the live order row to the display shape the table already expects.
          const createdIso = o.createdAt || null;
          let dateText = '—';
          let time = '—';
          if (createdIso) {
            const dt = new Date(createdIso);
            if (!isNaN(dt.getTime())) {
              dateText = dt.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
              const minsAgo = Math.max(0, Math.floor((Date.now() - dt.getTime()) / 60000));
              if (minsAgo < 60) time = `${minsAgo}m ago`;
              else if (minsAgo < 1440) time = `${Math.floor(minsAgo / 60)}h ago`;
              else time = `${Math.floor(minsAgo / 1440)}d ago`;
            }
          }
          const itemsText = (o.items || []).map((it: any) => `${it.quantity}× ${it.name}`).join(', ') || (o.itemCount ? `${o.itemCount} item${o.itemCount > 1 ? 's' : ''}` : '—');
          const methodType = (o.deliveryMethod || '').toLowerCase().includes('pickup') ? 'pickup' : (o.deliveryMethod || '').toLowerCase().includes('ship') ? 'shipping' : 'pickup';
          const payment = (o.paymentStatus || '').toUpperCase() === 'PAID' ? 'PAID (ONLINE)' : (o.paymentStatus || 'UNPAID').toUpperCase();
          const total = Number(o.subtotal || o.itemsTotal || 0) || 0;
          // Status mapping: live `orders.status` is e.g. PAYMENT_PENDING / PAID / CANCELLED.
          // Display uses: UNFULFILLED | READY | LOCAL_PICKUP | SHIPPED | DELIVERED.
          let status: MockOrder['status'] = 'UNFULFILLED';
          const fs = String(o.fulfillmentStatus || '').toUpperCase();
          if (fs === 'DELIVERED') status = 'DELIVERED';
          else if (fs === 'SHIPPED' || fs.includes('SHIP')) status = 'SHIPPED';
          else if (methodType === 'pickup' && String(o.status || '').toUpperCase() === 'PAID') status = 'READY';
          else if (methodType === 'pickup') status = 'LOCAL_PICKUP';
          return {
            id: o.id || '—',
            time,
            dateText,
            customer: o.customerName || o.email || 'Guest',
            pets: '—',
            items: itemsText,
            bins: '—',
            total,
            payment,
            method: o.deliveryMethod || (methodType === 'pickup' ? 'In-Salon Counter' : 'USPS'),
            methodType,
            weight: '—',
            urgency: String(o.status || '').toUpperCase(),
            due: '—',
            status,
          } as unknown as MockOrder;
        });
        setRealOrders(rows);
      })
      .catch(() => setRealOrders([]))
      .finally(() => setRealOrdersLoading(false));
  }, []);

  const orders: MockOrder[] = realOrders.length > 0 ? realOrders : (MOCK_ORDERS as unknown as MockOrder[]);
  const handleToggleSelect = (id: string) => {
    setSelectedOrders(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders.map(o => o.id));
    }
  };

  const filteredOrders = orders.filter((ord) => {
    if (activeTab === 'unfulfilled' && ord.status !== 'UNFULFILLED') return false;
    if (activeTab === 'ready' && ord.status !== 'READY' && ord.status !== 'LOCAL_PICKUP') return false;
    if (activeTab === 'pickup' && ord.methodType !== 'pickup') return false;
    if (activeTab === 'shipped' && ord.status !== 'SHIPPED') return false;
    if (activeTab === 'delivered' && ord.status !== 'DELIVERED') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        ord.id.toLowerCase().includes(q) ||
        ord.customer.toLowerCase().includes(q) ||
        ord.pets.toLowerCase().includes(q) ||
        ord.items.toLowerCase().includes(q);
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
            <span className="bg-primary text-primary-foreground px-1.5 py-0.5 font-semibold">OMS // LIVE QUEUE</span>
            <span>/</span>
            <span className="text-foreground font-semibold">STATION: MAIN-SALON-A</span>
          </div>
          <h1 className="text-2xl font-semibold uppercase tracking-tight text-foreground">
            Orders &amp; Fulfillment
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Manage customer retail orders, track warehouse picking queues, and coordinate shipping dispatches.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => alert('Batch exporting order ledger...')}
            className="h-9 px-3 border border-border bg-card hover:bg-accent/50 text-foreground font-semibold text-[13px] uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button 
            onClick={() => onNavigateSection?.('shipping')}
            className="h-9 px-3 border border-border bg-card hover:bg-accent/50 text-foreground font-semibold text-[13px] uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Shipping &amp; Labels</span>
          </button>
          <button 
            onClick={() => alert('Printing all queued packing slips...')}
            className="h-9 px-3 border border-border bg-card hover:bg-accent/50 text-foreground font-semibold text-[13px] uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Batch Slips</span>
          </button>
          <button 
            onClick={() => alert('Opening Create Retail Order modal...')}
            className="h-9 px-4 bg-black hover:bg-muted text-white font-semibold text-[13px] uppercase tracking-wider flex items-center gap-1.5 border border-border cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Create Order</span>
          </button>
        </div>
      </div>

      {/* KPI 6-Tile Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <div 
          onClick={() => setActiveTab('unfulfilled')}
          className="border border-border p-4 bg-card flex flex-col justify-between cursor-pointer hover:bg-accent/50 shadow-card"
        >
          <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <span>Unfulfilled</span>
            <span className="w-2 h-2 bg-black animate-pulse"></span>
          </div>
          <p className="text-2xl font-semibold tabular-nums mt-2 tracking-tight text-foreground">18</p>
          <p className="text-[10px] text-foreground font-semibold tabular-nums mt-0.5">+3 Rush queue</p>
        </div>

        <div 
          onClick={() => setActiveTab('ready')}
          className="border border-border p-4 bg-card flex flex-col justify-between cursor-pointer hover:bg-accent/50"
        >
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Ready to Ship</span>
            <Truck className="w-3.5 h-3.5 text-foreground" />
          </div>
          <p className="text-2xl font-semibold tabular-nums mt-2 tracking-tight text-foreground">12</p>
          <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5">Packed &amp; Staged</p>
        </div>

        <div 
          onClick={() => setActiveTab('pickup')}
          className="border border-border p-4 bg-card flex flex-col justify-between cursor-pointer hover:bg-accent/50"
        >
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Local Pickup</span>
            <Store className="w-3.5 h-3.5 text-foreground" />
          </div>
          <p className="text-2xl font-semibold tabular-nums mt-2 tracking-tight text-foreground">6</p>
          <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5">2 Curbside arrived</p>
        </div>

        <div 
          onClick={() => setActiveTab('shipped')}
          className="border border-border p-4 bg-card flex flex-col justify-between cursor-pointer hover:bg-accent/50"
        >
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Shipped Today</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-foreground" />
          </div>
          <p className="text-2xl font-semibold tabular-nums mt-2 tracking-tight text-foreground">34</p>
          <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5">Dispatched</p>
        </div>

        <div 
          onClick={() => onNavigateSection?.('returns')}
          className="border border-border p-4 bg-card flex flex-col justify-between cursor-pointer hover:bg-accent/50"
        >
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Returns / Issues</span>
            <AlertTriangle className="w-3.5 h-3.5 text-foreground" />
          </div>
          <p className="text-2xl font-semibold tabular-nums mt-2 tracking-tight text-foreground">2</p>
          <p className="text-[10px] text-foreground font-semibold tabular-nums mt-0.5">RMA Action Req</p>
        </div>

        <div className="border border-border p-4 bg-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span>MTD Revenue</span>
            <ShoppingBag className="w-3.5 h-3.5 text-foreground" />
          </div>
          <p className="text-2xl font-semibold tabular-nums mt-2 tracking-tight text-foreground">$14,890</p>
          <p className="text-[10px] text-foreground font-semibold tabular-nums mt-0.5">+14.2% volume</p>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="border border-border bg-card">
        {/* Navigation Tabs */}
        <div className="flex items-center overflow-x-auto border-b border-border">
          {[
            { id: 'all', label: 'All Orders', count: 72 },
            { id: 'unfulfilled', label: 'Unfulfilled', count: 18 },
            { id: 'ready', label: 'Ready to Ship', count: 12 },
            { id: 'pickup', label: 'Local Pickup', count: 6 },
            { id: 'shipped', label: 'Shipped', count: 32 },
            { id: 'delivered', label: 'Delivered', count: 140 },
            { id: 'returns', label: 'Returns / Refunds', count: 2 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === 'returns') {
                  onNavigateSection?.('returns');
                } else {
                  setActiveTab(tab.id as any);
                }
              }}
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

        {/* Search & Filter bar */}
        <div className="p-3 bg-muted/30 border-b border-border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <span className="absolute left-2.5 top-2.5 text-muted-foreground pointer-events-none">
              <Search className="w-3.5 h-3.5" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search order #, SKU, customer, or pet..."
              className="w-full h-8 pl-8 pr-3 text-[13px] bg-card border border-border text-foreground placeholder-gray-400 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button 
              onClick={() => onNavigateSection?.('shipping')}
              className="h-8 px-3 border border-border bg-card hover:bg-accent/50 text-foreground text-[13px] font-semibold uppercase flex items-center gap-1 cursor-pointer"
            >
              <Truck className="w-3 h-3" />
              <span>Label Station</span>
            </button>
            <button 
              onClick={() => onNavigateSection?.('purchase-orders')}
              className="h-8 px-3 border border-border bg-card hover:bg-accent/50 text-foreground text-[13px] font-semibold uppercase flex items-center gap-1 cursor-pointer"
            >
              <Package className="w-3 h-3" />
              <span>Purchase Orders</span>
            </button>
          </div>
        </div>

        {/* Batch Actions Toolbar */}
        <div className="p-2 bg-muted/40 border-b border-border flex items-center justify-between text-[13px] tabular-nums">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer font-semibold uppercase">
              <input 
                type="checkbox"
                checked={selectedOrders.length === orders.length && orders.length > 0}
                onChange={handleSelectAll}
                className="rounded-md border-border accent-primary"
              />
              <span>{selectedOrders.length} Selected</span>
            </label>
            <span className="text-muted-foreground/70">|</span>
            <button 
              onClick={handleSelectAll}
              className="underline font-semibold uppercase text-foreground hover:opacity-70"
            >
              Select All
            </button>
            <button 
              onClick={() => setSelectedOrders([])}
              className="text-muted-foreground uppercase hover:text-foreground"
            >
              Clear
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => alert(`Printing pick list for ${selectedOrders.length} orders...`)}
              disabled={selectedOrders.length === 0}
              className="px-2.5 py-1 border border-border bg-card hover:bg-accent/50 font-semibold uppercase text-[10px] disabled:opacity-40 cursor-pointer"
            >
              Print Pick Lists ({selectedOrders.length})
            </button>
            <button 
              onClick={() => onNavigateSection?.('shipping')}
              disabled={selectedOrders.length === 0}
              className="px-2.5 py-1 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold uppercase text-[10px] disabled:opacity-40 cursor-pointer"
            >
              Batch Labels
            </button>
          </div>
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px] text-foreground border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b border-border font-semibold uppercase text-[11px] tracking-wider text-foreground">
                <th className="py-2.5 px-3 w-10 text-center border-r border-border">#</th>
                <th className="py-2.5 px-3 border-r border-border">Order # &amp; SLA</th>
                <th className="py-2.5 px-3 border-r border-border">Date &amp; Age</th>
                <th className="py-2.5 px-3 border-r border-border">Customer &amp; Pet</th>
                <th className="py-2.5 px-3 border-r border-border">Items &amp; Bin Location</th>
                <th className="py-2.5 px-3 border-r border-border text-right">Total</th>
                <th className="py-2.5 px-3 border-r border-border">Method</th>
                <th className="py-2.5 px-3 border-r border-border text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-[12px]">
              {filteredOrders.map((ord) => {
                const isSelected = selectedOrders.includes(ord.id);
                return (
                  <tr key={ord.id} className={`hover:bg-accent/50 transition-colors ${isSelected ? 'bg-muted/30' : ''}`}>
                    <td className="py-3 px-3 text-center border-r border-border">
                      <input 
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(ord.id)}
                        className="rounded-md border-border accent-primary cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-3 border-r border-border">
                      <button
                        onClick={() => {
                          if (onOpenOrderDetails) {
                            onOpenOrderDetails(ord.id);
                          } else {
                            onNavigateSection?.('order-details');
                          }
                        }}
                        className="font-semibold text-foreground hover:underline text-left cursor-pointer"
                      >
                        {ord.id}
                      </button>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="px-1 py-0.2 bg-primary text-primary-foreground text-[9px] font-semibold uppercase">{ord.urgency}</span>
                        <span className="text-[10px] text-muted-foreground font-semibold">{ord.due}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 border-r border-border">
                      <p className="font-semibold text-foreground">{ord.time}</p>
                      <p className="text-[10px] text-muted-foreground">{ord.dateText}</p>
                    </td>
                    <td className="py-3 px-3 border-r border-border font-sans">
                      <p className="font-semibold text-foreground uppercase">{ord.customer}</p>
                      <p className="text-[10px] text-muted-foreground">{ord.pets}</p>
                    </td>
                    <td className="py-3 px-3 border-r border-border font-sans max-w-xs">
                      <p className="font-medium text-foreground truncate">{ord.items}</p>
                      <p className="text-[10px] tabular-nums text-muted-foreground uppercase">{ord.bins}</p>
                    </td>
                    <td className="py-3 px-3 border-r border-border text-right">
                      <p className="font-semibold text-foreground">${ord.total.toFixed(2)}</p>
                      <p className="text-[9px] font-semibold text-muted-foreground">{ord.payment}</p>
                    </td>
                    <td className="py-3 px-3 border-r border-border">
                      <p className="font-semibold text-foreground">{ord.method}</p>
                      <p className="text-[10px] text-muted-foreground">Wt: {ord.weight}</p>
                    </td>
                    <td className="py-3 px-3 border-r border-border text-center">
                      <span className={`inline-block px-2 py-0.5 border border-border text-[10px] font-semibold uppercase ${
                        ord.status === 'UNFULFILLED'
                          ? 'bg-primary text-primary-foreground'
                          : ord.status === 'READY'
                          ? 'bg-muted/40 text-foreground'
                          : 'bg-card text-foreground'
                      }`}>
                        {ord.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => {
                            if (ord.methodType === 'pickup') {
                              alert(`Handing off pickup order ${ord.id}`);
                            } else {
                              onNavigateSection?.('shipping');
                            }
                          }}
                          className="px-2 py-1 bg-primary text-primary-foreground hover:bg-primary/90 text-[10px] font-semibold uppercase transition-colors cursor-pointer"
                        >
                          {ord.methodType === 'pickup' ? 'Handover' : 'Fulfill'}
                        </button>
                        <button 
                          onClick={() => onNavigateSection?.('order-details')}
                          className="px-1.5 py-1 border border-border bg-card hover:bg-accent/50 text-[10px] cursor-pointer"
                          title="View Order Details"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-3 bg-muted/30 border-t border-border flex items-center justify-between text-[13px]">
          <p className="text-muted-foreground text-[12px] uppercase">
            Showing {filteredOrders.length} of {orders.length} orders
          </p>
        </div>
      </div>
    </div>
  );
};
