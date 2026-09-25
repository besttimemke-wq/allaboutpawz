'use client';

import React, { useState } from 'react';
import { useGiftCards } from '@/hooks/useFinanceData';
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
import { Search, Loader2, AlertCircle, Gift, DollarSign, CheckCircle2 } from 'lucide-react';
import type { CommerceGiftCard } from '@/types/database/finance';

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

export default function GiftCardsPage() {
  const { data, isLoading, isError, error } = useGiftCards();
  const [query, setQuery] = useState('');

  const cards: CommerceGiftCard[] = data ?? [];

  const totalBalance = cards.reduce((sum, c) => sum + Number(c.balance ?? 0), 0);
  const totalIssued = cards.reduce((sum, c) => sum + Number(c.initial_balance ?? 0), 0);
  const activeCount = cards.filter((c) => String(c.status || '').toLowerCase() === 'active').length;

  const statusVariant = (s: string) => {
    const v = String(s || '').toLowerCase();
    if (v === 'active') return 'default' as const;
    if (v === 'redeemed' || v === 'used') return 'secondary' as const;
    if (v === 'expired' || v === 'void') return 'destructive' as const;
    return 'outline' as const;
  };

  const q = query.trim().toLowerCase();
  const filtered = q
    ? cards.filter((c) =>
        [c.card_number, c.currency, c.status].some((f) =>
          String(f ?? '').toLowerCase().includes(q),
        ),
      )
    : cards;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Gift Cards</h1>
        <p className="text-sm text-muted-foreground">
          Issued gift cards, balances, and lifecycle status.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Cards</p>
              <p className="text-2xl font-semibold">{cards.length}</p>
            </div>
            <Gift className="h-6 w-6 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Outstanding Balance</p>
              <p className="text-2xl font-semibold">{fmtMoney(totalBalance)}</p>
            </div>
            <DollarSign className="h-6 w-6 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Active</p>
              <p className="text-2xl font-semibold">{activeCount}</p>
            </div>
            <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle>Gift Cards</CardTitle>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search gift cards…"
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
              <span>{(error as Error)?.message || 'Failed to load gift cards.'}</span>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm">Loading gift cards…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-sm text-muted-foreground gap-1">
              <Gift className="h-6 w-6 opacity-50" />
              <span>No gift cards found.</span>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Card #</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Initial Balance</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead>Expires</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono">{c.card_number}</TableCell>
                      <TableCell className="text-right font-medium">
                        {fmtMoney(c.balance, c.currency)}
                      </TableCell>
                      <TableCell className="font-mono">{c.currency}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(c.status)}>
                          {String(c.status || '—').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {fmtMoney(c.initial_balance, c.currency)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{fmtDate(c.issued_at)}</TableCell>
                      <TableCell className="whitespace-nowrap">{fmtDate(c.expires_at)}</TableCell>
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
