'use client';

import React, { useMemo, useState } from 'react';
import { useFinanceReports } from '@/hooks/useFinanceData';
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
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  Receipt,
} from 'lucide-react';

function fmtMoney(v: unknown): string {
  const n = Number(v ?? 0);
  if (Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(n);
}

export default function ReportsPage() {
  const { data, isLoading, isError, error } = useFinanceReports();
  const [query, setQuery] = useState('');

  const totals: any = data?.totals ?? {};
  const tenderBreakdown: any[] = data?.tenderBreakdown ?? [];
  const days: number = data?.days ?? 30;

  const net = Number(totals.net ?? 0);
  const revenue = Number(totals.revenue ?? 0);
  const refunds = Number(totals.refunds ?? 0);
  const pending = Number(totals.pending ?? 0);
  const paidCount = Number(totals.paidCount ?? 0);
  const totalCount = Number(totals.totalCount ?? 0);

  const filteredTender = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tenderBreakdown;
    return tenderBreakdown.filter((t) =>
      String(t.tender ?? '').toLowerCase().includes(q),
    );
  }, [tenderBreakdown, query]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Finance Reports</h1>
        <p className="text-sm text-muted-foreground">
          Revenue overview and tender breakdown for the last {days} days.
        </p>
      </div>

      {isError ? (
        <Card>
          <CardContent className="p-4 flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{(error as Error)?.message || 'Failed to load reports.'}</span>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-sm">Loading reports…</span>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Revenue</p>
                  <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
                    {fmtMoney(revenue)}
                  </p>
                </div>
                <TrendingUp className="h-6 w-6 text-muted-foreground" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Refunds</p>
                  <p className="text-2xl font-semibold text-rose-600 dark:text-rose-400">
                    {fmtMoney(refunds)}
                  </p>
                </div>
                <TrendingDown className="h-6 w-6 text-muted-foreground" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Pending</p>
                  <p className="text-2xl font-semibold">{fmtMoney(pending)}</p>
                </div>
                <Clock className="h-6 w-6 text-muted-foreground" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Net</p>
                  <p className="text-2xl font-semibold">{fmtMoney(net)}</p>
                </div>
                <DollarSign className="h-6 w-6 text-muted-foreground" />
              </CardContent>
            </Card>
          </div>

          {/* Payment counts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Paid Payments</p>
                  <p className="text-2xl font-semibold">{paidCount}</p>
                </div>
                <Receipt className="h-6 w-6 text-muted-foreground" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Payments</p>
                  <p className="text-2xl font-semibold">{totalCount}</p>
                </div>
                <Receipt className="h-6 w-6 text-muted-foreground" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Window</p>
                  <p className="text-2xl font-semibold">{days} days</p>
                </div>
                <Clock className="h-6 w-6 text-muted-foreground" />
              </CardContent>
            </Card>
          </div>

          {/* Tender breakdown */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle>Tender Breakdown</CardTitle>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tenders…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </CardHeader>
            <CardContent>
              {filteredTender.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-sm text-muted-foreground gap-1">
                  <Receipt className="h-6 w-6 opacity-50" />
                  <span>No tender data available.</span>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto custom-scrollbar">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tender</TableHead>
                        <TableHead className="text-right">Count</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Share</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTender.map((t, idx) => {
                        const total = Number(t.total ?? 0);
                        const count = Number(t.count ?? 0);
                        const share = revenue > 0 ? (total / revenue) * 100 : 0;
                        return (
                          <TableRow key={`${t.tender ?? idx}-${idx}`}>
                            <TableCell className="font-medium">{t.tender ?? '—'}</TableCell>
                            <TableCell className="text-right">{count}</TableCell>
                            <TableCell className="text-right font-medium">
                              {fmtMoney(total)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="secondary">{share.toFixed(1)}%</Badge>
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
        </>
      )}
    </div>
  );
}
