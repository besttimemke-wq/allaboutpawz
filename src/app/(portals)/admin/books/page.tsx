'use client';

import React, { useMemo, useState } from 'react';
import { useBooks } from '@/hooks/useFinanceData';
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
import { BookOpen, Search, Loader2, AlertCircle, Layers, FileText } from 'lucide-react';
import type { AcctBook, AcctChartOfAccounts } from '@/types/database/finance';

export default function BooksPage() {
  const { data, isLoading, isError, error } = useBooks();
  const [bookQuery, setBookQuery] = useState('');
  const [coaQuery, setCoaQuery] = useState('');

  const books: AcctBook[] = data?.books ?? [];
  const chartOfAccounts: AcctChartOfAccounts[] = data?.chartOfAccounts ?? [];

  const activeBooks = books.filter((b) => b.is_active).length;
  const activeAccounts = chartOfAccounts.filter((a) => a.is_active).length;

  const filteredBooks = useMemo(() => {
    const q = bookQuery.trim().toLowerCase();
    if (!q) return books;
    return books.filter((b) =>
      [b.code, b.name, b.book_type, b.currency].some((f) => String(f ?? '').toLowerCase().includes(q)),
    );
  }, [books, bookQuery]);

  const filteredCoa = useMemo(() => {
    const q = coaQuery.trim().toLowerCase();
    if (!q) return chartOfAccounts;
    return chartOfAccounts.filter((a) =>
      [a.code, a.name, a.account_type, a.normal_balance].some((f) =>
        String(f ?? '').toLowerCase().includes(q),
      ),
    );
  }, [chartOfAccounts, coaQuery]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Books &amp; Chart of Accounts</h1>
        <p className="text-sm text-muted-foreground">
          Accounting books and the chart of accounts for the active tenant.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Books</p>
              <p className="text-2xl font-semibold">{books.length}</p>
            </div>
            <BookOpen className="h-6 w-6 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Active Books</p>
              <p className="text-2xl font-semibold">{activeBooks}</p>
            </div>
            <Layers className="h-6 w-6 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">COA Rows</p>
              <p className="text-2xl font-semibold">{chartOfAccounts.length}</p>
            </div>
            <FileText className="h-6 w-6 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Active Accounts</p>
              <p className="text-2xl font-semibold">{activeAccounts}</p>
            </div>
            <FileText className="h-6 w-6 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      {/* Books table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle>Accounting Books</CardTitle>
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
          {isError ? (
            <div className="flex items-center gap-2 text-sm text-destructive p-4">
              <AlertCircle className="h-4 w-4" />
              <span>{(error as Error)?.message || 'Failed to load books.'}</span>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm">Loading books…</span>
            </div>
          ) : filteredBooks.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              No books found.
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
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

      {/* Chart of accounts table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle>Chart of Accounts</CardTitle>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search accounts…"
              value={coaQuery}
              onChange={(e) => setCoaQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isError ? (
            <div className="flex items-center gap-2 text-sm text-destructive p-4">
              <AlertCircle className="h-4 w-4" />
              <span>{(error as Error)?.message || 'Failed to load chart of accounts.'}</span>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm">Loading chart of accounts…</span>
            </div>
          ) : filteredCoa.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              No chart of accounts found.
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Account Type</TableHead>
                    <TableHead>Normal Balance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCoa.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono">{a.code}</TableCell>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {a.account_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">{a.normal_balance}</TableCell>
                      <TableCell>
                        {a.is_active ? (
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
    </div>
  );
}
