'use client';
import React, { useState } from 'react';
import { useCatalog, useInventoryMovements } from '@/hooks/useInventoryData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, Search, Loader2, AlertCircle, TrendingUp, TrendingDown, Plus, Minus } from 'lucide-react';

export default function InventoryPage() {
  const { data: catalog = [], isLoading: catLoading, isError: catErr, error: catError } = useCatalog();
  const { data: movements = [], isLoading: mvLoading } = useInventoryMovements();
  const [search, setSearch] = useState('');

  const filtered = catalog.filter((c: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.sku?.toLowerCase().includes(q) || c.brand?.toLowerCase().includes(q);
  });
  const totalStock = catalog.reduce((s: number, c: any) => s + (Number(c.stock_on_hand) || 0), 0);
  const lowStock = catalog.filter((c: any) => Number(c.stock_on_hand) < 10).length;
  const fmtNum = (s: string) => s ? Number(s).toFixed(0) : '0';

  const mvIcon = (t: string) => /receive|in/i.test(t) ? <Plus className="size-3 text-green-600" /> : /ship|out/i.test(t) ? <Minus className="size-3 text-red-600" /> : <TrendingUp className="size-3 text-muted-foreground" />;

  return (
    <div className="flex flex-col w-full h-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold tracking-tight text-foreground">Inventory</h1><p className="text-[13px] text-muted-foreground mt-1">Product catalog, stock levels, and movement history.</p></div>
        <Badge variant="secondary" className="gap-1.5"><Package className="size-3" />{catalog.length} items</Badge>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{label:'Catalog Items',value:catalog.length},{label:'Total Stock',value:fmtNum(String(totalStock))},{label:'Low Stock (<10)',value:lowStock},{label:'Movements',value:movements.length}].map(c => (
          <Card key={c.label}><CardContent className="pt-4 pb-4"><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{c.label}</p><p className="text-xl font-bold mt-1">{c.value}</p></CardContent></Card>
        ))}
      </div>
      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" /><Input placeholder="Search by name, SKU, or brand…" value={search} onChange={e=>setSearch(e.target.value)} className="pl-9" /></div>
      <Card><CardContent className="p-0">
        {catLoading ? <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" /><span className="text-sm">Loading catalog…</span></div>
        : catErr ? <div className="flex items-center justify-center py-16 gap-2 text-destructive"><AlertCircle className="size-4" /><span className="text-sm">Error: {(catError as Error).message}</span></div>
        : filtered.length === 0 ? <div className="flex items-center justify-center py-16 text-muted-foreground"><span className="text-sm">No items found.</span></div>
        : <div className="max-h-96 overflow-y-auto"><Table><TableHeader><TableRow><TableHead>SKU</TableHead><TableHead>Name</TableHead><TableHead>Brand</TableHead><TableHead>Type</TableHead><TableHead>Stock</TableHead><TableHead>Unit Cost</TableHead><TableHead>POS</TableHead><TableHead>Active</TableHead></TableRow></TableHeader><TableBody>
          {filtered.map((c: any) => (
            <TableRow key={c.id}>
              <TableCell><Badge variant="outline" className="font-mono text-[10px]">{c.sku}</Badge></TableCell>
              <TableCell className="font-medium">{c.name}</TableCell>
              <TableCell className="text-[13px] text-muted-foreground">{c.brand || '—'}</TableCell>
              <TableCell className="text-[13px] text-muted-foreground">{c.item_type}</TableCell>
              <TableCell><Badge variant={Number(c.stock_on_hand) < 10 ? 'destructive' : Number(c.stock_on_hand) < 20 ? 'secondary' : 'default'}>{fmtNum(c.stock_on_hand)}</Badge></TableCell>
              <TableCell className="text-[13px] tabular-nums">{c.unit_cost ? `$${Number(c.unit_cost).toFixed(2)}` : '—'}</TableCell>
              <TableCell>{c.pos_enabled ? <Badge variant="default">Yes</Badge> : <Badge variant="outline">No</Badge>}</TableCell>
              <TableCell>{c.active ? <Badge variant="default">Active</Badge> : <Badge variant="outline">Inactive</Badge>}</TableCell>
            </TableRow>
          ))}
        </TableBody></Table></div>}
      </CardContent></Card>
      <div><h2 className="text-[16px] font-semibold mb-3">Recent Stock Movements</h2>
        <Card><CardContent className="p-0">
          {mvLoading ? <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" /><span className="text-sm">Loading movements…</span></div>
          : movements.length === 0 ? <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">No movements recorded.</div>
          : <div className="max-h-64 overflow-y-auto"><Table><TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Item</TableHead><TableHead>Qty</TableHead><TableHead>Unit Cost</TableHead><TableHead>Reason</TableHead><TableHead>Date</TableHead></TableRow></TableHeader><TableBody>
            {movements.map((m: any) => (
              <TableRow key={m.id}>
                <TableCell><div className="flex items-center gap-1.5">{mvIcon(m.movement_type)}<span className="text-[12px]">{m.movement_type}</span></div></TableCell>
                <TableCell className="text-[13px]">{m.item_name || m.item_sku || '—'}</TableCell>
                <TableCell className="font-semibold tabular-nums">{Number(m.quantity).toFixed(0)}</TableCell>
                <TableCell className="text-[13px] tabular-nums">{m.unit_cost ? `$${Number(m.unit_cost).toFixed(2)}` : '—'}</TableCell>
                <TableCell className="text-[13px] text-muted-foreground">{m.reason || '—'}</TableCell>
                <TableCell className="text-[13px] text-muted-foreground">{new Date(m.occurred_at).toLocaleDateString('en-US', {month:'short',day:'numeric'})}</TableCell>
              </TableRow>
            ))}
          </TableBody></Table></div>}
        </CardContent></Card>
      </div>
    </div>
  );
}
