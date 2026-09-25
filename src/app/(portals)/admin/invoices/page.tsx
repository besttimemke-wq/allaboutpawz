'use client';

import React, { useState } from 'react';
import { useInvoices } from '@/hooks/useFinanceData';
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
  FileText,
  DollarSign,
  AlertTriangle,
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

function fmtDate(v: unknown): string {
  if (!v) return '—';
  const s = String(v);
  const d = new Date(s.length <= 10 ? `${s}T00:00:00Z` : s);
  if (Number.isNaN(d.getTime())) return s.slice(0, 10);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
}

export default function InvoicesPage() {
  const { data, isLoading, isError, error } = useInvoices();
  const [query, setQuery] = useState('');

  const invoices: any[] = data ?? [];

  const totalAmount = invoices.reduce((sum, i) => sum + Number(i.total ?? 0), 0);
  const outstanding = invoices.reduce(
    (sum, i) => sum + Number(i.outstanding_amount ?? i.balanceDue ?? 0),
    0,
  );
  const openCount = invoices.filter((i) =>
    String(i.status || '').toLowerCase().match(/open|due|unpaid|partial|sent/),
  ).length;

  const statusVariant = (s: string) => {
    const v = String(s || '').toLowerCase();
    if (v === 'paid' || v === 'closed' || v === 'captured') return 'default' as const;
    if (v === 'open' || v === 'sent' || v === 'partial') return 'secondary' as const;
    if (v === 'void' || v === 'bad' || v === 'failed') return 'destructive' as const;
    return 'outline' as const;
  };

  const q = query.trim().toLowerCase();
  const filtered = q
    ? invoices.filter((i) =>
        [
          i.invoice_number,
          i.number,
          i.status,
          i.customer_name,
          i.customerName,
          i.customer_email,
          i.customerEmail,
        ]
          .map((f) => String(f ?? '').toLowerCase())
          .some((s) => s.includes(q)),
      )
    : invoices;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
        <p className="text-sm text-muted-foreground">Accounts receivable invoices issued to customers.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Invoices</p>
              <p className="text-2xl font-semibold">{invoices.length}</p>
            </div>
            <FileText className="h-6 w-6 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Open / Outstanding</p>
              <p className="text-2xl font-semibold">{openCount}</p>
            </div>
            <AlertTriangle className="h-6 w-6 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Outstanding Balance</p>
              <p className="text-2xl font-semibold">{fmtMoney(outstanding)}</p>
            </div>
            <DollarSign className="h-6 w-6 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle>Invoices</CardTitle>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices…"
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
              <span>{(error as Error)?.message || 'Failed to load invoices.'}</span>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm">Loading invoices…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              No invoices found.
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Invoice Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((i, idx) => {
                    const num = i.invoice_number ?? i.number ?? `INV-${idx + 1}`;
                    const date = i.invoice_date ?? i.createdAt ?? i.created_at ?? i.date;
                    const due = i.due_date ?? i.dueDate;
                    const total = Number(i.total ?? 0);
                    const out = Number(
                      i.outstanding_amount ?? i.balanceDue ?? Math.max(0, total - Number(i.amount_paid ?? 0)),
                    );
                    return (
                      <TableRow key={i.id ?? `${num}-${idx}`}>
                        <TableCell className="font-mono">{num}</TableCell>
                        <TableCell>{fmtDate(date)}</TableCell>
                        <TableCell>{fmtDate(due)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {fmtMoney(total, i.currency)}
                        </TableCell>
                        <TableCell className="text-right">
                          {fmtMoney(out, i.currency)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(i.status)}>
                            {String(i.status || '—').toUpperCase()}
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
