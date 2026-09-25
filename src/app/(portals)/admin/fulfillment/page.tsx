'use client';
import React, { useState } from 'react';
import { useFulfillmentQueue, useUpdateFulfillmentStatus } from '@/hooks/useCommerceActions';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, Loader2, AlertCircle, Truck, Check, ArrowRight } from 'lucide-react';

export default function FulfillmentPage() {
  const { data, isLoading, isError, error } = useFulfillmentQueue();
  const updateStatus = useUpdateFulfillmentStatus();
  const [selected, setSelected] = useState<string[]>([]);
  const [activeStage, setActiveStage] = useState('unfulfilled');

  const d = data as any;
  const counts = d?.counts ?? {};
  const allOrders = d?.orders ?? [];
  const orders = allOrders.filter((o: any) => o.stage === activeStage || (activeStage === 'unfulfilled' && (!o.fulfillment_status || o.fulfillment_status === 'UNFULFILLED' || o.fulfillment_status === 'pending')));

  const stages = [
    { id: 'unfulfilled', label: 'Unfulfilled', count: counts.unfulfilled ?? 0 },
    { id: 'ready_to_ship', label: 'Ready to Ship', count: counts.ready_to_ship ?? 0 },
    { id: 'local_pickup', label: 'Local Pickup', count: counts.local_pickup ?? 0 },
    { id: 'shipped', label: 'Shipped', count: counts.shipped ?? 0 },
    { id: 'delivered', label: 'Delivered', count: counts.delivered ?? 0 },
  ];

  const toggleSelect = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const selectAll = () => setSelected(orders.map((o: any) => o.id));
  const batchUpdate = async (status: string) => {
    if (selected.length === 0) return;
    await updateStatus.mutateAsync({ orderIds: selected, status });
    setSelected([]);
  };

  return (
    <div className="flex flex-col w-full h-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold tracking-tight text-foreground">Fulfillment Queue</h1><p className="text-[13px] text-muted-foreground mt-1">Order fulfillment pipeline with batch status transitions.</p></div>
        <Badge variant="secondary" className="gap-1.5"><Package className="size-3" />{counts.total ?? 0} orders</Badge>
      </div>
      <div className="flex gap-2 overflow-x-auto">
        {stages.map(s => (
          <button key={s.id} onClick={() => { setActiveStage(s.id); setSelected([]); }}
            className={`px-4 py-2 rounded-lg text-[13px] font-medium whitespace-nowrap transition-colors ${activeStage === s.id ? 'bg-foreground text-background' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}>
            {s.label} <span className="opacity-60">({s.count})</span>
          </button>
        ))}
      </div>
      {selected.length > 0 && (
        <Card><CardContent className="py-3 flex items-center gap-3">
          <span className="text-[13px] font-medium">{selected.length} selected</span>
          <div className="flex gap-2">
            {activeStage === 'unfulfilled' && <Button size="sm" variant="default" className="gap-1" onClick={() => batchUpdate('ready_to_ship')} disabled={updateStatus.isPending}><ArrowRight className="size-3" /> Mark Ready</Button>}
            <Button size="sm" variant="default" className="gap-1" onClick={() => batchUpdate('shipped')} disabled={updateStatus.isPending}><Truck className="size-3" /> Ship</Button>
            <Button size="sm" variant="default" className="gap-1" onClick={() => batchUpdate('delivered')} disabled={updateStatus.isPending}><Check className="size-3" /> Deliver</Button>
          </div>
        </CardContent></Card>
      )}
      <Card><CardContent className="p-0">
        {isLoading ? <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" /><span className="text-sm">Loading fulfillment queue…</span></div>
        : isError ? <div className="flex items-center justify-center py-16 gap-2 text-destructive"><AlertCircle className="size-4" /><span className="text-sm">Error: {(error as Error)?.message}</span></div>
        : orders.length === 0 ? <div className="flex items-center justify-center py-16 text-muted-foreground"><Package className="size-8 mb-2 opacity-40" /><span className="text-sm">No orders in this stage.</span></div>
        : <div className="max-h-96 overflow-y-auto"><Table><TableHeader><TableRow>
          <TableHead className="w-8"><Checkbox checked={selected.length === orders.length && orders.length > 0} onCheckedChange={selectAll} /></TableHead>
          <TableHead>Order ID</TableHead><TableHead>Customer</TableHead><TableHead>Total</TableHead><TableHead>Method</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead>
        </TableRow></TableHeader><TableBody>
          {orders.map((o: any) => (
            <TableRow key={o.id} className={selected.includes(o.id) ? 'bg-muted/30' : ''}>
              <TableCell><Checkbox checked={selected.includes(o.id)} onCheckedChange={() => toggleSelect(o.id)} /></TableCell>
              <TableCell className="font-mono text-xs">{o.id?.slice(0, 8)}</TableCell>
              <TableCell className="text-[13px]">{o.customer_email || o.email || '—'}</TableCell>
              <TableCell className="font-semibold tabular-nums">{o.total_amount ? `$${Number(o.total_amount).toFixed(2)}` : '—'}</TableCell>
              <TableCell className="text-[13px] text-muted-foreground">{o.fulfillment_method || '—'}</TableCell>
              <TableCell><Badge variant="outline">{o.fulfillment_status || 'pending'}</Badge></TableCell>
              <TableCell className="text-[13px] text-muted-foreground">{o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody></Table></div>}
      </CardContent></Card>
    </div>
  );
}
