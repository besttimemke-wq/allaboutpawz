'use client';

import React, { useState } from 'react';
import { useFinancePayments } from '@/hooks/useFinanceData';
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
import {
  Search,
  Loader2,
  AlertCircle,
  CreditCard,
  DollarSign,
  CheckCircle2,
} from 'lucide-react';

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

function fmtDateTime(v: unknown): string {
  if (!v) return '—';
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return String(v).slice(0, 19);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function PaymentsPage() {
  const { data, isLoading, isError, error } = useFinancePayments();
  const [query, setQuery] = useState('');

  const payments: any[] = data ?? [];

  const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
  const totalTips = payments.reduce((sum, p) => sum + Number(p.tip_amount ?? p.tips ?? 0), 0);
  const paidCount = payments.filter((p) => {
    const s = String(p.status || '').toLowerCase();
    return s === 'paid' || s === 'succeeded' || s === 'captured';
  }).length;

  const statusVariant = (s: string) => {
    const v = String(s || '').toLowerCase();
    if (v === 'paid' || v === 'succeeded' || v === 'captured') return 'default' as const;
    if (v === 'pending' || v === 'authorized') return 'secondary' as const;
    if (v === 'refunded' || v === 'failed' || v === 'voided') return 'destructive' as const;
    return 'outline' as const;
  };

  const q = query.trim().toLowerCase();
  const filtered = q
    ? payments.filter((p) =>
        [
          p.payment_number,
          p.id,
          p.status,
          p.customer_name,
          p.customer,
          p.reference,
          p.tender,
        ]
          .map((f) => String(f ?? '').toLowerCase())
          .some((s) => s.includes(q)),
      )
    : payments;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
        <p className="text-sm text-muted-foreground">
          All commerce payments collected across the platform.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Payments</p>
              <p className="text-2xl font-semibold">{payments.length}</p>
            </div>
            <CreditCard className="h-6 w-6 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Captured</p>
              <p className="text-2xl font-semibold">{paidCount}</p>
            </div>
            <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Collected</p>
              <p className="text-2xl font-semibold">{fmtMoney(totalAmount)}</p>
            </div>
            <DollarSign className="h-6 w-6 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle>Payments</CardTitle>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search payments…"
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
              <span>{(error as Error)?.message || 'Failed to load payments.'}</span>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm">Loading payments…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              No payments found.
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Tip</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p, idx) => {
                    const payNum = p.payment_number ?? p.id ?? `PAY-${idx + 1}`;
                    const customer = p.customer_name ?? p.customer ?? '—';
                    const amount = Number(p.amount ?? 0);
                    const tip = Number(p.tip_amount ?? p.tips ?? 0);
                    return (
                      <TableRow key={p.id ?? `${payNum}-${idx}`}>
                        <TableCell className="font-mono">{payNum}</TableCell>
                        <TableCell className="font-medium">{customer}</TableCell>
                        <TableCell className="text-right font-medium">
                          {fmtMoney(amount, p.currency)}
                        </TableCell>
                        <TableCell className="text-right">
                          {tip > 0 ? fmtMoney(tip, p.currency) : '—'}
                        </TableCell>
                        <TableCell className="capitalize">
                          {p.tender ?? p.payment_method ?? '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(p.status)}>
                            {String(p.status || '—').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {fmtDateTime(p.created_at ?? p.date ?? p.time)}
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
