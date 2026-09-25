'use client';

import React, { useState } from 'react';
import { useEnrollments, type Enrollment } from '@/hooks/useEnrollments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Users, Search, Loader2, AlertCircle, ArrowRight } from 'lucide-react';

export default function LmsEnrollmentPage() {
  const { enrollments, isLoading, error } = useEnrollments();
  const [search, setSearch] = useState('');

  const filtered = enrollments.filter((e: Enrollment) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (e.learner_name?.toLowerCase().includes(q)) ||
      (e.course_title?.toLowerCase().includes(q)) ||
      (e.course_code?.toLowerCase().includes(q)) ||
      (e.status?.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex flex-col w-full h-full p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">LMS Enrollments</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Manage learner enrollments, statuses, and progression pathways.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1.5">
            <Users className="size-3" />
            {enrollments.length} enrolled
          </Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Enrollments', value: enrollments.length },
          { label: 'Active', value: enrollments.filter(e => e.status === 'active').length },
          { label: 'Completed', value: enrollments.filter(e => e.status === 'completed').length },
          { label: 'Dropped', value: enrollments.filter(e => e.status === 'dropped').length },
        ].map(card => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{card.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search by learner, course, or status…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              <span className="text-sm">Loading enrollments…</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-16 gap-2 text-destructive">
              <AlertCircle className="size-4" />
              <span className="text-sm">System Error: {error}</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <span className="text-sm">No enrollments found.</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Learner</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Enrolled</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e: Enrollment) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">
                      {e.learner_name || <span className="text-muted-foreground">{e.learner_user_id.slice(0, 8)}…</span>}
                    </TableCell>
                    <TableCell>{e.course_title || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-[10px]">{e.course_code || '—'}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        e.status === 'active' ? 'default' :
                        e.status === 'completed' ? 'secondary' :
                        e.status === 'dropped' ? 'destructive' :
                        'outline'
                      }>
                        {e.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-[13px]">{e.delivery_mode}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-foreground rounded-full transition-all"
                            style={{ width: `${Math.min(100, Number(e.progress_percentage) || 0)}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          {Math.round(Number(e.progress_percentage) || 0)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-[13px]">
                      {e.enrolled_at ? new Date(e.enrolled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="gap-1.5">
                        View <ArrowRight className="size-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
