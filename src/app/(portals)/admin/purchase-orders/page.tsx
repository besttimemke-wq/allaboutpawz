'use client';
import React from 'react';
import { usePurchaseOrders, useVendors } from '@/hooks/useInventoryData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Inbox, Loader2, AlertCircle, Users, Package } from 'lucide-react';

export default function PurchaseOrdersPage() {
  const { data: purchaseOrders = [], isLoading: poLoading, isError: poErr, error: poError } = usePurchaseOrders();
  const { data: vendors = [], isLoading: vLoading } = useVendors();

  return (
    <div className="flex flex-col w-full h-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold tracking-tight text-foreground">Purchase Orders</h1><p className="text-[13px] text-muted-foreground mt-1">Manage supplier purchase orders and vendor records.</p></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Card><CardContent className="pt-4 pb-4"><div className="flex items-center gap-2"><Package className="size-4 text-muted-foreground" /><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Purchase Orders</p></div><p className="text-xl font-bold mt-1">{purchaseOrders.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-4"><div className="flex items-center gap-2"><Users className="size-4 text-muted-foreground" /><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Active Vendors</p></div><p className="text-xl font-bold mt-1">{vendors.length}</p></CardContent></Card>
      </div>
      <div><h2 className="text-[16px] font-semibold mb-3">Purchase Orders</h2>
        <Card><CardContent className="p-0">
          {poLoading ? <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" /><span className="text-sm">Loading purchase orders…</span></div>
          : poErr ? <div className="flex items-center justify-center py-8 gap-2 text-destructive"><AlertCircle className="size-4" /><span className="text-sm">Error: {(poError as Error).message}</span></div>
          : purchaseOrders.length === 0 ? <div className="flex items-center justify-center py-12 text-muted-foreground"><Inbox className="size-8 mb-2 opacity-40" /><span className="text-sm">No purchase orders yet.</span></div>
          : <Table><TableHeader><TableRow><TableHead>PO #</TableHead><TableHead>Vendor</TableHead><TableHead>Status</TableHead><TableHead>Order Date</TableHead><TableHead>Expected</TableHead><TableHead>Total</TableHead></TableRow></TableHeader><TableBody>
            {purchaseOrders.map((po: any) => (
              <TableRow key={po.id}>
                <TableCell className="font-mono text-xs">{po.po_number}</TableCell>
                <TableCell className="font-medium">{po.vendor_name || '—'}</TableCell>
                <TableCell><Badge variant={po.status === 'received' ? 'default' : 'outline'}>{po.status}</Badge></TableCell>
                <TableCell className="text-[13px] text-muted-foreground">{new Date(po.order_date).toLocaleDateString()}</TableCell>
                <TableCell className="text-[13px] text-muted-foreground">{po.expected_date ? new Date(po.expected_date).toLocaleDateString() : '—'}</TableCell>
                <TableCell className="font-semibold tabular-nums">{po.total ? `$${Number(po.total).toFixed(2)}` : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody></Table>}
        </CardContent></Card>
      </div>
      <div><h2 className="text-[16px] font-semibold mb-3">Suppliers</h2>
        <Card><CardContent className="p-0">
          {vLoading ? <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" /><span className="text-sm">Loading vendors…</span></div>
          : vendors.length === 0 ? <div className="flex items-center justify-center py-12 text-muted-foreground"><Users className="size-8 mb-2 opacity-40" /><span className="text-sm">No vendors yet.</span></div>
          : <Table><TableHeader><TableRow><TableHead>Vendor #</TableHead><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Payment Terms</TableHead><TableHead>Currency</TableHead></TableRow></TableHeader><TableBody>
            {vendors.map((v: any) => (
              <TableRow key={v.id}>
                <TableCell className="font-mono text-xs">{v.vendor_number}</TableCell>
                <TableCell className="font-medium">{v.name}</TableCell>
                <TableCell className="text-[13px] text-muted-foreground">{v.email || '—'}</TableCell>
                <TableCell className="text-[13px] text-muted-foreground">{v.phone || '—'}</TableCell>
                <TableCell className="text-[13px] text-muted-foreground">{v.payment_terms || '—'}</TableCell>
                <TableCell className="text-[13px]">{v.currency || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody></Table>}
        </CardContent></Card>
      </div>
    </div>
  );
}
