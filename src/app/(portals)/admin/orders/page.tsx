'use client';

import React, { useState } from 'react';
import { useOrders, type Order } from '@/hooks/useOrders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Search, Loader2, AlertCircle, Save, X, Edit, Truck } from 'lucide-react';

export default function OrdersPage() {
  const { orders, isLoading, error, updateOrder } = useOrders();
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ fulfillment_status: '', tracking_number: '', carrier: '' });

  const filtered = orders.filter((o: Order) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (o.email?.toLowerCase().includes(q)) ||
      (o.customer_email?.toLowerCase().includes(q)) ||
      (o.status?.toLowerCase().includes(q)) ||
      (o.fulfillment_status?.toLowerCase().includes(q)) ||
      (o.tracking_number?.toLowerCase().includes(q))
    );
  });

  const startEdit = (o: Order) => {
    setEditingId(o.id);
    setEditForm({
      fulfillment_status: o.fulfillment_status || 'pending',
      tracking_number: o.tracking_number || '',
      carrier: o.carrier || '',
    });
  };

  const saveEdit = async (id: string) => {
    await updateOrder(id, editForm);
    setEditingId(null);
  };

  const summary = {
    total: orders.length,
    paid: orders.filter(o => o.payment_status === 'paid').length,
    pending: orders.filter(o => o.fulfillment_status === 'pending').length,
    shipped: orders.filter(o => o.fulfillment_status === 'shipped').length,
  };

  return (
    <div className="flex flex-col w-full h-full p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Orders</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Manage shop orders, fulfillment, and tracking.</p>
        </div>
        <Badge variant="secondary" className="gap-1.5">
          <Truck className="size-3" />
          {orders.length} orders
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Orders', value: summary.total },
          { label: 'Paid', value: summary.paid },
          { label: 'Fulfillment Pending', value: summary.pending },
          { label: 'Shipped', value: summary.shipped },
        ].map(card => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{card.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search by email, status, or tracking number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              <span className="text-sm">Loading orders…</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-16 gap-2 text-destructive">
              <AlertCircle className="size-4" />
              <span className="text-sm">System Error: {error}</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <span className="text-sm">No orders found.</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Fulfillment</TableHead>
                  <TableHead>Tracking</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((o: Order) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.id.slice(0, 8)}</TableCell>
                    <TableCell>{o.email || o.customer_email || '—'}</TableCell>
                    <TableCell className="font-semibold tabular-nums">
                      {o.total_amount ? `$${Number(o.total_amount).toFixed(2)}` : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={o.payment_status === 'paid' ? 'default' : 'outline'}>
                        {o.payment_status || '—'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {editingId === o.id ? (
                        <select
                          value={editForm.fulfillment_status}
                          onChange={(e) => setEditForm({ ...editForm, fulfillment_status: e.target.value })}
                          className="border border-border rounded p-1 text-xs bg-background"
                        >
                          <option value="pending">Pending</option>
                          <option value="processing">Processing</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      ) : (
                        <Badge variant={o.fulfillment_status === 'delivered' ? 'secondary' : 'outline'}>
                          {o.fulfillment_status || '—'}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === o.id ? (
                        <div className="flex gap-1">
                          <Input
                            value={editForm.carrier}
                            onChange={(e) => setEditForm({ ...editForm, carrier: e.target.value })}
                            placeholder="UPS"
                            className="w-16 text-xs h-7"
                          />
                          <Input
                            value={editForm.tracking_number}
                            onChange={(e) => setEditForm({ ...editForm, tracking_number: e.target.value })}
                            placeholder="1Z..."
                            className="w-32 text-xs h-7"
                          />
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {o.carrier ? `${o.carrier}: ${o.tracking_number}` : '—'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {o.created_at ? new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {editingId === o.id ? (
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="ghost" onClick={() => saveEdit(o.id)} className="gap-1 text-green-600 h-7">
                            <Save className="size-3" /> Save
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-7">
                            <X className="size-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => startEdit(o)} className="gap-1 h-7">
                          <Edit className="size-3" /> Edit
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
