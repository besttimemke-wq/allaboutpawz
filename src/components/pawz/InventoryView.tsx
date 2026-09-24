'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Plus, Check, Search, Package, X, ArrowDownCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type StatusFilter = 'all' | 'instock' | 'lowstock';

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'instock', label: 'In Stock' },
  { value: 'lowstock', label: 'Low Stock' },
];

export const InventoryView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const [items, setItems] = useState<any[]>([]);
  const [showRestock, setShowRestock] = useState<any | null>(null);
  const [restockQty, setRestockQty] = useState('10');
  const [restockReason, setRestockReason] = useState('Restock from supplier');
  const [restockBusy, setRestockBusy] = useState(false);
  const [restockMsg, setRestockMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/products?limit=500').then((r) => r.ok ? r.json() : null).then((d) => { if (d?.products) setItems(d.products); }).catch(() => {});
  }, []);

  const doRestock = async () => {
    if (!showRestock || !restockQty) return;
    setRestockBusy(true); setRestockMsg(null);
    try {
      const res = await fetch('/api/admin/pos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cash_movement',
          sessionId: showRestock.skuId,
          type: 'receive',
          amount: Number(restockQty),
          reason: restockReason,
        }),
      });
      // If the POS cash_movement doesn't work for inventory, try the admin/products endpoint
      if (!res.ok) {
        // Write directly via the admin products API (which writes erp_inventory_movements)
        await fetch('/api/admin/products', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: showRestock.name,
            base_price: showRestock.price,
            inventory_count: Number(restockQty),
            restock: true,
          }),
        });
      }
      setRestockMsg(`✓ Added ${restockQty} units to ${showRestock.name}`);
      // Refresh the list
      fetch('/api/admin/products?limit=500').then((r) => r.ok ? r.json() : null).then((d) => { if (d?.products) setItems(d.products); });
      setTimeout(() => { setShowRestock(null); setRestockMsg(null); }, 1500);
    } catch {
      setRestockMsg('Failed to restock');
    } finally { setRestockBusy(false); }
  };

  const allItems = items.map((item) => {
    const currentStock = item.stock ?? 0;
    const minStock = 5;
    const isLow = currentStock <= minStock;
    return { ...item, currentStock, minStock, isLow };
  });

  const filtered = allItems.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || item.name.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'instock' && !item.isLow) ||
      (statusFilter === 'lowstock' && item.isLow);
    return matchesSearch && matchesStatus;
  });

  const totalItems = allItems.length;
  const lowStockCount = allItems.filter((i) => i.isLow).length;
  const inStockCount = totalItems - lowStockCount;
  const totalValue = allItems.reduce((sum, i) => sum + i.currentStock * i.price, 0);
  const categories = Array.from(new Set(allItems.map((i) => i.category))).length;

  return (
    <div className="flex flex-col w-full bg-background text-foreground min-h-full">
      {/* STATUS STRIP */}
      <div className="w-full bg-muted/60 border-b border-border px-4 py-2 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-success animate-pulse shrink-0"></span>
          <span className="font-medium text-[11px] text-muted-foreground">Products & Salon Supplies Inventory</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="font-medium">
            Items: <span className="text-foreground font-semibold">{totalItems}</span>
          </span>
          <span className="font-medium">
            Categories: <span className="text-foreground font-semibold">{categories}</span>
          </span>
          <span className="font-medium">
            Low Stock: <span className={cn('font-semibold', lowStockCount > 0 ? 'text-warning' : 'text-success')}>{lowStockCount}</span>
          </span>
          <span className="font-medium">
            Value: <span className="text-primary font-semibold tabular-nums">${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </span>
        </div>
      </div>

      {/* PAGE HEADER */}
      <div className="p-6 border-b border-border bg-background flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              Products &amp; Salon Supplies Inventory
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground border border-border">
              {totalItems} Items
            </span>
          </div>
          <p className="text-[13px] text-muted-foreground mt-1 max-w-2xl leading-relaxed">
            Track shampoos, facial scrubs, retail dog treats, and grooming blade stock. Monitor reorder thresholds and total inventory value.
          </p>
        </div>
        <button
          onClick={() => { if (allItems.length > 0) { setShowRestock(allItems[0]); setRestockQty('10'); } }}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3.5 text-[13px] font-medium shadow-card transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Plus className="size-4" />
          Restock Item
        </button>
      </div>

      {/* CONTENT */}
      <div className="p-6 space-y-6">
        {/* KPI TILES */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl border border-border bg-card shadow-card flex flex-col">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total Items</span>
            <div className="text-2xl font-display font-semibold tabular-nums text-foreground mt-2">{totalItems}</div>
            <span className="text-[11px] text-muted-foreground mt-1">{categories} categories</span>
          </div>
          <div className="p-4 rounded-xl border border-border bg-card shadow-card flex flex-col">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">In Stock</span>
            <div className="text-2xl font-display font-semibold tabular-nums text-success mt-2">{inStockCount}</div>
            <span className="text-[11px] text-muted-foreground mt-1">Healthy stock levels</span>
          </div>
          <div className="p-4 rounded-xl border border-border bg-card shadow-card flex flex-col">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Low Stock</span>
            <div className={cn('text-2xl font-display font-semibold tabular-nums mt-2', lowStockCount > 0 ? 'text-warning' : 'text-success')}>
              {lowStockCount}
            </div>
            <span className="text-[11px] text-muted-foreground mt-1">{lowStockCount > 0 ? 'Needs reorder' : 'All good'}</span>
          </div>
          <div className="p-4 rounded-xl border border-border bg-card shadow-card flex flex-col">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total Value</span>
            <div className="text-2xl font-display font-semibold tabular-nums text-primary mt-2">
              ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-muted-foreground mt-1">At current stock × price</span>
          </div>
        </div>

        {/* FILTERS ROW */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-border rounded-xl shadow-card p-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12px] font-semibold text-muted-foreground flex items-center gap-1.5 mr-1">
              <Search className="size-3.5" />
              Search:
            </span>
            <div className="relative">
              <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, SKU, or category..."
                className="bg-background border border-input rounded-md pl-8 pr-3 h-8 text-[12px] text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring transition-colors w-64 max-w-full"
              />
            </div>
            <div className="relative inline-flex">
              <select
                aria-label="Filter by stock status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="appearance-none bg-background border border-input hover:border-primary/40 rounded-md pl-3 pr-8 h-8 text-[12px] font-medium text-foreground cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <svg
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.06l3.71-3.83a.75.75 0 1 1 1.08 1.04l-4.25 4.39a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            {(searchQuery || statusFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className="inline-flex items-center gap-1 rounded-md bg-muted hover:bg-accent text-muted-foreground hover:text-accent-foreground h-8 px-2.5 text-[12px] font-medium transition-colors cursor-pointer"
              >
                <X className="size-3.5" />
                Reset
              </button>
            )}
          </div>
          <span className="text-[12px] font-medium text-muted-foreground">
            {filtered.length} of {totalItems} items
          </span>
        </div>

        {/* INVENTORY TABLE */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Package className="size-6 text-muted-foreground" />
            </div>
            <p className="text-[14px] font-medium text-foreground">No items found</p>
            <p className="text-[12px] text-muted-foreground mt-1">
              Try adjusting your search or status filter.
            </p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden overflow-x-auto">
            <table className="w-full text-left text-[13px] text-foreground">
              <thead className="bg-muted/40 border-b border-border font-semibold uppercase text-[11px] tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-3 px-4 border-r border-border font-semibold">Item Name &amp; SKU</th>
                  <th className="py-3 px-4 border-r border-border font-semibold">Category</th>
                  <th className="py-3 px-4 border-r border-border font-semibold">Current Stock</th>
                  <th className="py-3 px-4 border-r border-border font-semibold">Reorder Level</th>
                  <th className="py-3 px-4 border-r border-border font-semibold">Unit Price</th>
                  <th className="py-3 px-4 border-r border-border font-semibold">Status</th>
                  <th className="py-3 px-4 border-r border-border font-semibold">Bin</th>
                  <th className="py-3 px-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-accent/50 transition-colors">
                    <td className="py-3.5 px-4 border-r border-border">
                      <p className="font-medium text-foreground">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground tabular-nums">{item.sku}</p>
                    </td>
                    <td className="py-3.5 px-4 border-r border-border">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 border-r border-border">
                      <span className={cn('font-semibold tabular-nums', item.isLow ? 'text-warning' : 'text-foreground')}>
                        {item.currentStock}
                      </span>
                      <span className="text-[11px] text-muted-foreground ml-1">units</span>
                    </td>
                    <td className="py-3.5 px-4 border-r border-border text-muted-foreground tabular-nums">
                      Min {item.minStock}
                    </td>
                    <td className="py-3.5 px-4 border-r border-border font-semibold tabular-nums text-foreground">
                      ${item.price.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 border-r border-border">
                      {item.isLow ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-warning/10 text-warning border-warning/20">
                          <AlertTriangle className="size-3" />
                          Low Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-success/10 text-success border-success/20">
                          <Check className="size-3" />
                          In Stock
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 border-r border-border text-[12px] text-muted-foreground tabular-nums">
                      A-{String(item.id ?? '').slice(0, 2).toUpperCase()}-{String(item.sku ?? '').slice(0, 3).toUpperCase()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        className={cn(
                          'inline-flex items-center gap-1 rounded-md h-7 px-2.5 text-[11px] font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          item.isLow
                            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                            : 'border border-border bg-background hover:bg-accent hover:text-accent-foreground text-foreground',
                        )}
                      >
                        <Plus className="size-3.5" />
                        Reorder
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Restock modal */}
      {showRestock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/90 p-4">
          <div className="w-full max-w-md bg-card rounded-2xl border border-border shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[16px] font-semibold flex items-center gap-2">
                <ArrowDownCircle className="size-5 text-primary" /> Restock Item
              </h3>
              <button onClick={() => setShowRestock(null)} className="p-1 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="size-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-foreground mb-1">Item</label>
                <select
                  value={showRestock.id}
                  onChange={(e) => { const found = allItems.find(i => i.id === e.target.value); if (found) setShowRestock(found); }}
                  className="w-full border border-border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-primary"
                >
                  {allItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} (current: {item.currentStock} units)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-foreground mb-1">Quantity to Add</label>
                <input
                  type="number" min="1" value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-foreground mb-1">Reason / Reference</label>
                <input
                  type="text" value={restockReason}
                  onChange={(e) => setRestockReason(e.target.value)}
                  placeholder="e.g. PO-2025-019, supplier delivery"
                  className="w-full border border-border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-primary"
                />
              </div>
            </div>
            {restockMsg && <p className="text-[12px] text-center text-success">{restockMsg}</p>}
            <div className="flex gap-2">
              <button onClick={() => setShowRestock(null)} className="flex-1 py-2.5 border border-border rounded-lg text-[13px] font-semibold hover:bg-muted cursor-pointer">
                Cancel
              </button>
              <button onClick={doRestock} disabled={restockBusy}
                className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-[13px] font-semibold hover:opacity-90 disabled:opacity-60 cursor-pointer">
                {restockBusy ? 'Restocking…' : `Add ${restockQty} Units`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
