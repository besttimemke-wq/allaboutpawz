'use client';

import React, { useMemo, useState } from 'react';
import { useStripeConnections } from '@/hooks/useFinanceData';
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
import { Search, Loader2, AlertCircle, CreditCard, Layers } from 'lucide-react';

export default function StripeConnectionsPage() {
  const { data, isLoading, isError, error } = useStripeConnections();
  const [query, setQuery] = useState('');

  const methods: any[] = data ?? [];

  const types = useMemo(
    () => Array.from(new Set(methods.map((m) => m.method_type))).filter(Boolean),
    [methods],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return methods;
    return methods.filter((m) =>
      [m.code, m.name, m.method_type, m.processor].some((f) =>
        String(f ?? '').toLowerCase().includes(q),
      ),
    );
  }, [methods, query]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Stripe Connections</h1>
        <p className="text-sm text-muted-foreground">
          Stripe payment methods configured for this tenant.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Payment Methods</p>
              <p className="text-2xl font-semibold">{methods.length}</p>
            </div>
            <CreditCard className="h-6 w-6 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Method Types</p>
              <p className="text-2xl font-semibold">{types.length}</p>
            </div>
            <Layers className="h-6 w-6 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Processor</p>
              <p className="text-2xl font-semibold capitalize">
                {methods[0]?.processor ?? '—'}
              </p>
            </div>
            <CreditCard className="h-6 w-6 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle>Stripe Payment Methods</CardTitle>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search methods…"
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
              <span>{(error as Error)?.message || 'Failed to load Stripe connections.'}</span>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm">Loading Stripe connections…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-sm text-muted-foreground gap-1">
              <CreditCard className="h-6 w-6 opacity-50" />
              <span>No Stripe payment methods found.</span>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Method Type</TableHead>
                    <TableHead>Processor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((m) => (
                    <TableRow key={m.id ?? m.code}>
                      <TableCell className="font-mono">{m.code}</TableCell>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {m.method_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">{m.processor}</TableCell>
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
