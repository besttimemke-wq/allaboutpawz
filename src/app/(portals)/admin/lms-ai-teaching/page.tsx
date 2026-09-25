'use client';

import React, { useState } from 'react';
import { useAiTeachingSessions, type AiTeachingSession } from '@/hooks/useAiTeachingSessions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Sparkles, Search, Loader2, AlertCircle, ArrowRight } from 'lucide-react';

export default function LmsAiTeachingPage() {
  const { sessions, isLoading, error } = useAiTeachingSessions();
  const [search, setSearch] = useState('');

  const filtered = sessions.filter((s: AiTeachingSession) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (s.learner_name?.toLowerCase().includes(q)) ||
      (s.course_title?.toLowerCase().includes(q)) ||
      (s.session_status?.toLowerCase().includes(q)) ||
      (s.delivery_mode?.toLowerCase().includes(q)) ||
      (s.escalation_reason?.toLowerCase().includes(q))
    );
  });

  const active = sessions.filter(s => s.session_status === 'active').length;
  const completed = sessions.filter(s => s.session_status === 'completed').length;
  const escalated = sessions.filter(s => s.escalation_triggered).length;

  return (
    <div className="flex flex-col w-full h-full p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">AI Teaching Sessions</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Monitor live and historical AI instructor sessions and escalations.</p>
        </div>
        <Badge variant="secondary" className="gap-1.5">
          <Sparkles className="size-3" />
          {sessions.length} sessions
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Sessions', value: sessions.length },
          { label: 'Active', value: active },
          { label: 'Completed', value: completed },
          { label: 'Escalated', value: escalated },
        ].map(card => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{card.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground tabular-nums">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search by learner, course, status, or escalation…"
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
              <span className="text-sm">Loading AI teaching sessions…</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-16 gap-2 text-destructive">
              <AlertCircle className="size-4" />
              <span className="text-sm">System Error: {error}</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <span className="text-sm">No AI teaching sessions found.</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Learner</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead className="text-right">Turns</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Escalation</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s: AiTeachingSession) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      {s.learner_name || <span className="text-muted-foreground">{s.learner_user_id.slice(0, 8)}…</span>}
                    </TableCell>
                    <TableCell>{s.course_title || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={
                        s.session_status === 'active' ? 'default' :
                        s.session_status === 'completed' ? 'secondary' :
                        s.session_status === 'abandoned' ? 'destructive' :
                        'outline'
                      }>
                        {s.session_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-[13px]">
                      {s.started_at ? new Date(s.started_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-[13px]">{s.total_turns ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground text-[13px]">{s.delivery_mode || '—'}</TableCell>
                    <TableCell>
                      {s.escalation_triggered ? (
                        <div className="flex flex-col gap-0.5">
                          <Badge variant="destructive" className="text-[10px] w-fit">Escalated</Badge>
                          {s.escalation_reason && (
                            <span className="text-[11px] text-muted-foreground truncate max-w-[200px]" title={s.escalation_reason}>
                              {s.escalation_reason}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">—</span>
                      )}
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
