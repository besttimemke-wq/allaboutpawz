'use client';

import React, { useState } from 'react';
import { usePayroll } from '@/hooks/useFinanceData';
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
import { Search, Loader2, AlertCircle, Wallet, DollarSign, Users } from 'lucide-react';
import type { AcctPayrollRun } from '@/types/database/finance';

function fmtMoney(v: unknown): string {
  const n = Number(v ?? 0);
  if (Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(n);
}

export default function PayrollPage() {
  const { data, isLoading, isError, error } = usePayroll();
  const [query, setQuery] = useState('');

  const runs: AcctPayrollRun[] = data ?? [];

  const grossTotal = runs.reduce((sum, r) => sum + Number(r.gross_total ?? 0), 0);
  const netTotal = runs.reduce((sum, r) => sum + Number(r.net_total ?? 0), 0);
  const taxTotal = runs.reduce((sum, r) => sum + Number(r.tax_total ?? 0), 0);
  const paidCount = runs.filter((r) => String(r.status || '').toLowerCase() === 'paid').length;

  const statusVariant = (s: string) => {
    const v = String(s || '').toLowerCase();
    if (v === 'paid' || v === 'posted' || v === 'closed') return 'default' as const;
    if (v === 'draft' || v === 'pending' || v === 'processing') return 'secondary' as const;
    if (v === 'void' || v === 'failed') return 'destructive' as const;
    return 'outline' as const;
  };

  const q = query.trim().toLowerCase();
  const filtered = q
    ? runs.filter((r) =>
        [r.run_number, r.run_type, r.status].some((f) =>
          String(f ?? '').toLowerCase().includes(q),
        ),
      )
    : runs;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Payroll Runs</h1>
        <p className="text-sm text-muted-foreground">
          Payroll run records with gross, net, and tax totals.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Payroll Runs</p>
              <p className="text-2xl font-semibold">{runs.length}</p>
            </div>
            <Users className="h-6 w-6 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Gross</p>
              <p className="text-2xl font-semibold">{fmtMoney(grossTotal)}</p>
            </div>
            <DollarSign className="h-6 w-6 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Net</p>
              <p className="text-2xl font-semibold">{fmtMoney(netTotal)}</p>
            </div>
            <Wallet className="h-6 w-6 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Taxes</p>
              <p className="text-2xl font-semibold">{fmtMoney(taxTotal)}</p>
            </div>
            <DollarSign className="h-6 w-6 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle>Payroll Runs</CardTitle>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search payroll…"
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
              <span>{(error as Error)?.message || 'Failed to load payroll.'}</span>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm">Loading payroll…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-sm text-muted-foreground gap-1">
              <Wallet className="h-6 w-6 opacity-50" />
              <span>No payroll runs found.</span>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Run #</TableHead>
                    <TableHead>Run Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Gross Total</TableHead>
                    <TableHead className="text-right">Net Total</TableHead>
                    <TableHead className="text-right">Tax Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono">{r.run_number}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {r.run_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(r.status)}>
                          {String(r.status || '—').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {fmtMoney(r.gross_total)}
                      </TableCell>
                      <TableCell className="text-right">{fmtMoney(r.net_total)}</TableCell>
                      <TableCell className="text-right">{fmtMoney(r.tax_total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
