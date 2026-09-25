'use client';

import React, { useState } from 'react';
import { useDeposits } from '@/hooks/useFinanceData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Loader2, AlertCircle, PiggyBank, DollarSign, Clock } from 'lucide-react';

function fmtMoney(v: unknown, currency = 'USD'): string {
  const n = Number(v ?? 0);
  if (Number.isNaN(n)) return '—';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: String(currency || 'USD').toUpperCase(),
    }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

function fmtDate(v: unknown): string {
  if (!v) return '—';
  const s = String(v);
  const d = new Date(s.length <= 10 ? `${s}T00:00:00Z` : s);
  if (Number.isNaN(d.getTime())) return s.slice(0, 10);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
}

export default function DepositsPage() {
  const { data, isLoading, isError, error } = useDeposits();
  const [query, setQuery] = useState('');

  const deposits: any[] = data ?? [];

  const totalAmount = deposits.reduce((sum, d) => sum + Number(d.amount ?? 0), 0);
  const pendingCount = deposits.filter((d) =>
    String(d.status || '').toLowerCase().match(/pending|held/),
  ).length;
  const collectedCount = deposits.filter((d) =>
    String(d.status || '').toLowerCase().match(/collected|applied|released/),
  ).length;

  const statusVariant = (s: string) => {
    const v = String(s || '').toLowerCase();
    if (v === 'applied' || v === 'collected' || v === 'released') return 'default' as const;
    if (v === 'pending' || v === 'held') return 'secondary' as const;
    if (v === 'forfeited' || v === 'refunded') return 'destructive' as const;
    return 'outline' as const;
  };

  const q = query.trim().toLowerCase();
  const filtered = q
    ? deposits.filter((d) =>
        [
          d.deposit_number,
          d.id,
          d.customer,
          d.customer_name,
          d.pet,
          d.service,
          d.status,
          d.method,
        ]
          .map((f) => String(f ?? '').toLowerCase())
          .some((s) => s.includes(q)),
      )
    : deposits;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Deposits &amp; Escrow</h1>
        <p className="text-sm text-muted-foreground">
          Customer deposits held in escrow against future appointments.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Deposits</p>
              <p className="text-2xl font-semibold">{deposits.length}</p>
            </div>
            <PiggyBank className="h-6 w-6 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Held / Pending</p>
              <p className="text-2xl font-semibold">{pendingCount}</p>
            </div>
            <Clock className="h-6 w-6 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Value</p>
              <p className="text-2xl font-semibold">{fmtMoney(totalAmount)}</p>
            </div>
            <DollarSign className="h-6 w-6 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle>Deposits</CardTitle>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search deposits…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isError ? (
            <div className="flex items-center gap-2 text-sm text-destructive p-4">
              <AlertCircle className="h-4 w-4" />
              <span>{(error as Error)?.message || 'Failed to load deposits.'}</span>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm">Loading deposits…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              No deposits found.
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Deposit #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Pet</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Collected</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((d, idx) => {
                    const depNum = d.deposit_number ?? d.id ?? `DEP-${idx + 1}`;
                    const amount = Number(d.amount ?? 0);
                    return (
                      <TableRow key={d.id ?? `${depNum}-${idx}`}>
                        <TableCell className="font-mono">{depNum}</TableCell>
                        <TableCell className="font-medium">{d.customer ?? '—'}</TableCell>
                        <TableCell>{d.pet ?? '—'}</TableCell>
                        <TableCell>{d.service ?? '—'}</TableCell>
                        <TableCell className="text-right font-medium">
                          {fmtMoney(amount, d.currency)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{d.method ?? '—'}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {fmtDate(d.collected_at ?? d.collectedDate)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(d.status)}>
                            {String(d.status || '—').toUpperCase()}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
