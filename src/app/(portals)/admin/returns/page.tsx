'use client';
import React, { useState } from 'react';
import { useReturns, useProcessRefund } from '@/hooks/useCommerceActions';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RotateCcw, Loader2, AlertCircle, DollarSign } from 'lucide-react';

export default function ReturnsPage() {
  const [filter, setFilter] = useState('');
  const { data, isLoading, isError, error } = useReturns(filter || undefined);
  const processRefund = useProcessRefund();
  const d = data as any;
  const returns = d?.returns ?? [];

  const filters = [
    { id: '', label: 'All Returns' },
    { id: 'action_required', label: 'Action Required' },
    { id: 'completed', label: 'Completed' },
  ];

  const handleRefund = async (id: string, amount: number) => {
    await processRefund.mutateAsync({ returnId: id, payload: { refundAmount: amount, restockInventory: false } });
  };

  return (
    <div className="flex flex-col w-full h-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold tracking-tight text-foreground">Returns & RMA</h1><p className="text-[13px] text-muted-foreground mt-1">Manage customer returns, refunds, and RMA processing.</p></div>
        <Badge variant="secondary" className="gap-1.5"><RotateCcw className="size-3" />{returns.length} returns</Badge>
      </div>
      <div className="flex gap-2">
        {filters.map(f => <Button key={f.id} variant={filter === f.id ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f.id)}>{f.label}</Button>)}
      </div>
      <Card><CardContent className="p-0">
        {isLoading ? <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" /><span className="text-sm">Loading returns…</span></div>
        : isError ? <div className="flex items-center justify-center py-16 gap-2 text-destructive"><AlertCircle className="size-4" /><span className="text-sm">Error: {(error as Error)?.message}</span></div>
        : returns.length === 0 ? <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground"><RotateCcw className="size-8 opacity-40" /><span className="text-sm">No returns found.</span></div>
        : <div className="max-h-96 overflow-y-auto"><Table><TableHeader><TableRow><TableHead>Order ID</TableHead><TableHead>Customer</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead><TableHead>Payment</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>
          {returns.map((r: any) => (
            <TableRow key={r.id}>
              <TableCell className="font-mono text-xs">{r.id?.slice(0, 8)}</TableCell>
              <TableCell className="text-[13px]">{r.customer_email || r.email || '—'}</TableCell>
              <TableCell className="font-semibold tabular-nums">{r.total_amount ? `$${Number(r.total_amount).toFixed(2)}` : '—'}</TableCell>
              <TableCell><Badge variant={r.status === 'refunded' ? 'default' : 'destructive'}>{r.status}</Badge></TableCell>
              <TableCell><Badge variant="outline">{r.payment_status || '—'}</Badge></TableCell>
              <TableCell className="text-[13px] text-muted-foreground">{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</TableCell>
              <TableCell className="text-right">
                {r.status !== 'refunded' && <Button size="sm" variant="ghost" className="gap-1 text-green-600 h-7" disabled={processRefund.isPending} onClick={() => handleRefund(r.id, Number(r.total_amount) || 0)}><DollarSign className="size-3" /> Process Refund</Button>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody></Table></div>}
      </CardContent></Card>
    </div>
  );
}
