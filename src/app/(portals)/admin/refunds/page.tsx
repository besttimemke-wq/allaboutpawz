'use client';

import React, { useState } from 'react';
import { useRefunds } from '@/hooks/useFinanceData';
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
import { Search, Loader2, AlertCircle, RotateCcw, DollarSign, AlertOctagon } from 'lucide-react';

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

export default function RefundsPage() {
  const { data, isLoading, isError, error } = useRefunds();
  const [query, setQuery] = useState('');

  const refunds: any[] = data ?? [];

  const totalAmount = refunds.reduce((sum, r) => sum + Number(r.amount ?? 0), 0);
  const openCount = refunds.filter((r) =>
    String(r.status || '').toLowerCase().match(/open|pending|processing/),
  ).length;
  const completedCount = refunds.filter((r) =>
    String(r.status || '').toLowerCase().match(/completed|succeeded|refunded|closed/),
  ).length;

  const statusVariant = (s: string) => {
    const v = String(s || '').toLowerCase();
    if (v === 'completed' || v === 'succeeded' || v === 'refunded' || v === 'closed')
      return 'default' as const;
    if (v === 'pending' || v === 'processing' || v === 'open') return 'secondary' as const;
    if (v === 'failed' || v === 'void' || v === 'canceled') return 'destructive' as const;
    return 'outline' as const;
  };

  const q = query.trim().toLowerCase();
  const filtered = q
    ? refunds.filter((r) =>
        [
          r.refund_number,
          r.id,
          r.reason,
          r.status,
          r.refund_method,
          r.customer_email,
          r.processor_reference,
        ]
          .map((f) => String(f ?? '').toLowerCase())
          .some((s) => s.includes(q)),
      )
    : refunds;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Refunds</h1>
        <p className="text-sm text-muted-foreground">
          Refunds processed against commerce sales and disputes.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Refunds</p>
              <p className="text-2xl font-semibold">{refunds.length}</p>
            </div>
            <RotateCcw className="h-6 w-6 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Open</p>
              <p className="text-2xl font-semibold">{openCount}</p>
            </div>
            <AlertOctagon className="h-6 w-6 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Refunded Value</p>
              <p className="text-2xl font-semibold">{fmtMoney(totalAmount)}</p>
            </div>
            <DollarSign className="h-6 w-6 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle>Refunds</CardTitle>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search refunds…"
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
              <span>{(error as Error)?.message || 'Failed to load refunds.'}</span>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm">Loading refunds…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              No refunds found.
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Refund #</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r, idx) => {
                    const num = r.refund_number ?? r.id ?? `RFD-${idx + 1}`;
                    const amount = Number(r.amount ?? 0);
                    return (
                      <TableRow key={r.id ?? `${num}-${idx}`}>
                        <TableCell className="font-mono">{num}</TableCell>
                        <TableCell className="text-right font-medium">
                          {fmtMoney(amount, r.currency)}
                        </TableCell>
                        <TableCell className="max-w-xs truncate" title={String(r.reason ?? '')}>
                          {r.reason ?? '—'}
                        </TableCell>
                        <TableCell className="capitalize">
                          {r.refund_method ?? r.method ?? '—'}
                        </TableCell>
                        <TableCell className="font-mono text-xs max-w-[14ch] truncate" title={String(r.processor_reference ?? '')}>
                          {r.processor_reference ?? r.reference ?? '—'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {fmtDate(r.created_at ?? r.processed_at)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(r.status)}>
                            {String(r.status || '—').toUpperCase()}
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
