'use client';

import React, { useMemo, useState } from 'react';
import { useTaxes } from '@/hooks/useFinanceData';
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
import { Search, Loader2, AlertCircle, Receipt, MapPin, Percent } from 'lucide-react';
import type { AcctTaxCode, AcctTaxJurisdiction } from '@/types/database/finance';

function fmtPercent(v: unknown): string {
  const n = Number(v ?? 0);
  if (Number.isNaN(n)) return '—';
  // Stored as a fraction (0.0825) or as a percentage (8.25). Render both sensibly.
  const pct = n > 1 ? n : n * 100;
  return `${pct.toFixed(pct % 1 === 0 ? 0 : 2)}%`;
}

export default function TaxesPage() {
  const { data, isLoading, isError, error } = useTaxes();
  const [codeQuery, setCodeQuery] = useState('');
  const [jurQuery, setJurQuery] = useState('');

  const taxCodes: AcctTaxCode[] = data?.taxCodes ?? [];
  const jurisdictions: AcctTaxJurisdiction[] = data?.jurisdictions ?? [];

  const activeCodes = taxCodes.filter((c) => c.is_active).length;

  const filteredCodes = useMemo(() => {
    const q = codeQuery.trim().toLowerCase();
    if (!q) return taxCodes;
    return taxCodes.filter((c) =>
      [c.code, c.name, c.tax_type].some((f) => String(f ?? '').toLowerCase().includes(q)),
    );
  }, [taxCodes, codeQuery]);

  const filteredJur = useMemo(() => {
    const q = jurQuery.trim().toLowerCase();
    if (!q) return jurisdictions;
    return jurisdictions.filter((j) =>
      [j.code, j.name, j.country_code, j.state_code, j.locality].some((f) =>
        String(f ?? '').toLowerCase().includes(q),
      ),
    );
  }, [jurisdictions, jurQuery]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Taxes</h1>
        <p className="text-sm text-muted-foreground">
          Tax codes and jurisdictions configured for the active tenant.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Tax Codes</p>
              <p className="text-2xl font-semibold">{taxCodes.length}</p>
            </div>
            <Receipt className="h-6 w-6 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Active Codes</p>
              <p className="text-2xl font-semibold">{activeCodes}</p>
            </div>
            <Percent className="h-6 w-6 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Jurisdictions</p>
              <p className="text-2xl font-semibold">{jurisdictions.length}</p>
            </div>
            <MapPin className="h-6 w-6 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      {/* Tax Codes */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle>Tax Codes</CardTitle>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tax codes…"
              value={codeQuery}
              onChange={(e) => setCodeQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isError ? (
            <div className="flex items-center gap-2 text-sm text-destructive p-4">
              <AlertCircle className="h-4 w-4" />
              <span>{(error as Error)?.message || 'Failed to load tax codes.'}</span>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm">Loading tax codes…</span>
            </div>
          ) : filteredCodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-sm text-muted-foreground gap-1">
              <Receipt className="h-6 w-6 opacity-50" />
              <span>No tax codes found.</span>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Tax Type</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Recoverable</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCodes.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono">{c.code}</TableCell>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="capitalize">{c.tax_type}</TableCell>
                      <TableCell className="text-right font-medium">
                        {fmtPercent(c.rate)}
                      </TableCell>
                      <TableCell className="text-right">
                        {fmtPercent(c.recoverable_percent)}
                      </TableCell>
                      <TableCell>
                        {c.is_active ? (
                          <Badge>Active</Badge>
                        ) : (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Jurisdictions */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle>Tax Jurisdictions</CardTitle>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search jurisdictions…"
              value={jurQuery}
              onChange={(e) => setJurQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isError ? (
            <div className="flex items-center gap-2 text-sm text-destructive p-4">
              <AlertCircle className="h-4 w-4" />
              <span>{(error as Error)?.message || 'Failed to load jurisdictions.'}</span>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm">Loading jurisdictions…</span>
            </div>
          ) : filteredJur.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-sm text-muted-foreground gap-1">
              <MapPin className="h-6 w-6 opacity-50" />
              <span>No jurisdictions found.</span>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Locality</TableHead>
                    <TableHead>Registration #</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJur.map((j) => (
                    <TableRow key={j.id}>
                      <TableCell className="font-mono">{j.code}</TableCell>
                      <TableCell className="font-medium">{j.name}</TableCell>
                      <TableCell className="font-mono">{j.country_code}</TableCell>
                      <TableCell className="font-mono">{j.state_code ?? '—'}</TableCell>
                      <TableCell>{j.locality ?? '—'}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {j.registration_number ?? '—'}
                      </TableCell>
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
