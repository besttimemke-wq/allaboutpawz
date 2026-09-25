'use client';

import React, { useMemo, useState } from 'react';
import { useFinancialSettings } from '@/hooks/useFinanceData';
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
  Building2,
  CalendarDays,
  CalendarRange,
  Coins,
  BookOpen,
} from 'lucide-react';

function fmtDate(v: unknown): string {
  if (!v) return '—';
  const s = String(v);
  const d = new Date(s.length <= 10 ? `${s}T00:00:00Z` : s);
  if (Number.isNaN(d.getTime())) return s.slice(0, 10);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
}

function useFiltered<T>(rows: T[], q: string, fields: (row: T) => string[]): T[] {
  return useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((r) => fields(r).some((f) => String(f ?? '').toLowerCase().includes(query)));
  }, [rows, q, fields]);
}

export default function FinancialSettingsPage() {
  const { data, isLoading, isError, error } = useFinancialSettings();

  const entities: any[] = data?.entities ?? [];
  const fiscalYears: any[] = data?.fiscalYears ?? [];
  const periods: any[] = data?.periods ?? [];
  const currencies: any[] = data?.currencies ?? [];
  const books: any[] = data?.books ?? [];

  const [entityQuery, setEntityQuery] = useState('');
  const [fyQuery, setFyQuery] = useState('');
  const [periodQuery, setPeriodQuery] = useState('');
  const [currencyQuery, setCurrencyQuery] = useState('');
  const [bookQuery, setBookQuery] = useState('');

  const filteredEntities = useFiltered(entities, entityQuery, (e) => [
    e.code,
    e.legal_name,
    e.display_name,
    e.entity_type,
    e.country,
  ]);
  const filteredFy = useFiltered(fiscalYears, fyQuery, (y) => [
    y.fiscal_year,
    String(y.start_date ?? ''),
    String(y.end_date ?? ''),
  ]);
  const filteredPeriods = useFiltered(periods, periodQuery, (p) => [
    p.name,
    String(p.period_no ?? ''),
    p.status,
  ]);
  const filteredCurrencies = useFiltered(currencies, currencyQuery, (c) => [
    c.code,
    c.name,
    c.symbol,
  ]);
  const filteredBooks = useFiltered(books, bookQuery, (b) => [
    b.code,
    b.name,
    b.book_type,
    b.currency,
  ]);

  const sections = [
    { label: 'Entities', count: entities.length, icon: Building2 },
    { label: 'Fiscal Years', count: fiscalYears.length, icon: CalendarDays },
    { label: 'Periods', count: periods.length, icon: CalendarRange },
    { label: 'Currencies', count: currencies.length, icon: Coins },
    { label: 'Books', count: books.length, icon: BookOpen },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Financial Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure accounting entities, fiscal years, periods, currencies, and books.
        </p>
      </div>

      {isError ? (
        <Card>
          <CardContent className="p-4 flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{(error as Error)?.message || 'Failed to load financial settings.'}</span>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-sm">Loading financial settings…</span>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {sections.map((s) => {
              const Icon = s.icon;
              return (
                <Card key={s.label}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {s.label}
                      </p>
                      <p className="text-2xl font-semibold">{s.count}</p>
                    </div>
                    <Icon className="h-6 w-6 text-muted-foreground" />
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Entities */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle>Entities</CardTitle>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search entities…"
                  value={entityQuery}
                  onChange={(e) => setEntityQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </CardHeader>
            <CardContent>
              {filteredEntities.length === 0 ? (
                <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                  No entities found.
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto custom-scrollbar">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Legal Name</TableHead>
                        <TableHead>Display Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Country</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEntities.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell className="font-mono">{e.code}</TableCell>
                          <TableCell className="font-medium">{e.legal_name}</TableCell>
                          <TableCell>{e.display_name}</TableCell>
                          <TableCell className="capitalize">{e.entity_type}</TableCell>
                          <TableCell className="font-mono">{e.country ?? '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Fiscal Years */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle>Fiscal Years</CardTitle>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search fiscal years…"
                  value={fyQuery}
                  onChange={(e) => setFyQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </CardHeader>
            <CardContent>
              {filteredFy.length === 0 ? (
                <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                  No fiscal years found.
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto custom-scrollbar">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fiscal Year</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead>Adjustment</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFy.map((y) => (
                        <TableRow key={y.id}>
                          <TableCell className="font-mono font-medium">{y.fiscal_year}</TableCell>
                          <TableCell className="whitespace-nowrap">{fmtDate(y.start_date)}</TableCell>
                          <TableCell className="whitespace-nowrap">{fmtDate(y.end_date)}</TableCell>
                          <TableCell>
                            {y.is_adjustment_year ? (
                              <Badge variant="secondary">Adjustment</Badge>
                            ) : (
                              <Badge variant="outline">Standard</Badge>
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

          {/* Periods */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle>Accounting Periods</CardTitle>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search periods…"
                  value={periodQuery}
                  onChange={(e) => setPeriodQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </CardHeader>
            <CardContent>
              {filteredPeriods.length === 0 ? (
                <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                  No periods found.
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto custom-scrollbar">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Start</TableHead>
                        <TableHead>End</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPeriods.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-mono">{p.period_no}</TableCell>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell className="whitespace-nowrap">{fmtDate(p.start_date)}</TableCell>
                          <TableCell className="whitespace-nowrap">{fmtDate(p.end_date)}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="capitalize">
                              {p.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Currencies */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle>Currencies</CardTitle>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search currencies…"
                  value={currencyQuery}
                  onChange={(e) => setCurrencyQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </CardHeader>
            <CardContent>
              {filteredCurrencies.length === 0 ? (
                <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                  No currencies found.
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto custom-scrollbar">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Symbol</TableHead>
                        <TableHead className="text-right">Minor Units</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCurrencies.map((c) => (
                        <TableRow key={c.code}>
                          <TableCell className="font-mono font-medium">{c.code}</TableCell>
                          <TableCell>{c.name}</TableCell>
                          <TableCell className="font-mono">{c.symbol}</TableCell>
                          <TableCell className="text-right">{c.minor_units}</TableCell>
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

          {/* Books */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle>Books</CardTitle>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search books…"
                  value={bookQuery}
                  onChange={(e) => setBookQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </CardHeader>
            <CardContent>
              {filteredBooks.length === 0 ? (
                <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                  No books found.
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto custom-scrollbar">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Book Type</TableHead>
                        <TableHead>Accounting Basis</TableHead>
                        <TableHead>Currency</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBooks.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="font-mono">{b.code}</TableCell>
                          <TableCell className="font-medium">{b.name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="capitalize">
                              {b.book_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="capitalize">{b.accounting_basis}</TableCell>
                          <TableCell className="font-mono">{b.currency}</TableCell>
                          <TableCell>
                            {b.is_active ? (
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
        </>
      )}
    </div>
  );
}
