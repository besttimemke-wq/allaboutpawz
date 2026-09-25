'use client';

import React, { useState } from 'react';
import {
  useSupport,
  type EscalationRow,
  type NavigatorCaseloadRow,
} from '@/hooks/useSupport';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { HeartHandshake, Search, Loader2, AlertCircle } from 'lucide-react';

export default function LmsSupportPage() {
  const { escalations, caseloads, isLoading, error } = useSupport();
  const [escSearch, setEscSearch] = useState('');
  const [caseSearch, setCaseSearch] = useState('');

  const filteredEsc = escalations.filter((r: EscalationRow) => {
    if (!escSearch.trim()) return true;
    const q = escSearch.toLowerCase();
    return (
      (r.learner_name?.toLowerCase().includes(q)) ||
      (r.escalation_type?.toLowerCase().includes(q)) ||
      (r.priority?.toLowerCase().includes(q)) ||
      (r.status?.toLowerCase().includes(q)) ||
      (r.assigned_role?.toLowerCase().includes(q))
    );
  });

  const filteredCases = caseloads.filter((r: NavigatorCaseloadRow) => {
    if (!caseSearch.trim()) return true;
    const q = caseSearch.toLowerCase();
    return (
      (r.learner_name?.toLowerCase().includes(q)) ||
      (r.status?.toLowerCase().includes(q)) ||
      (r.navigator_user_id?.toLowerCase().includes(q))
    );
  });

  const pendingEsc = escalations.filter(r => r.status === 'pending').length;
  const resolvedEsc = escalations.filter(r => r.status === 'resolved').length;
  const openCases = caseloads.filter(r => r.status === 'open' || r.status === 'active').length;

  return (
    <div className="flex flex-col w-full h-full p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Support Queue</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Human escalation queue and navigator caseload assignments.</p>
        </div>
        <Badge variant="secondary" className="gap-1.5">
          <HeartHandshake className="size-3" />
          {escalations.length + caseloads.length} records
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Escalations', value: escalations.length },
          { label: 'Pending', value: pendingEsc },
          { label: 'Resolved', value: resolvedEsc },
          { label: 'Open Caseloads', value: openCases },
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

      {/* Error banner */}
      {error && !isLoading && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-2 text-destructive">
            <AlertCircle className="size-4" />
            <span className="text-sm">System Error: {error}</span>
          </CardContent>
        </Card>
      )}

      {/* Escalations Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold tracking-tight text-foreground">Escalation Queue</h2>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search escalations…"
              value={escSearch}
              onChange={(e) => setEscSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                <span className="text-sm">Loading escalations…</span>
              </div>
            ) : filteredEsc.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <span className="text-sm">No escalations in the queue.</span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Learner</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEsc.map((r: EscalationRow) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        {r.learner_name || <span className="text-muted-foreground">{r.learner_user_id.slice(0, 8)}…</span>}
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{r.escalation_type}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={
                          r.priority === 'urgent' || r.priority === 'high' ? 'destructive' :
                          r.priority === 'medium' ? 'default' :
                          'outline'
                        } className="text-[10px] capitalize">
                          {r.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-[12px] text-muted-foreground">{r.assigned_to?.slice(0, 8) || '—'}…</TableCell>
                      <TableCell className="text-[13px] text-muted-foreground">{r.assigned_role || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={
                          r.status === 'pending' ? 'default' :
                          r.status === 'resolved' ? 'secondary' :
                          r.status === 'closed' ? 'outline' :
                          'outline'
                        } className="capitalize">
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-[13px]">
                        {r.created_at ? new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Caseloads Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold tracking-tight text-foreground">Navigator Caseloads</h2>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search caseloads…"
              value={caseSearch}
              onChange={(e) => setCaseSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                <span className="text-sm">Loading caseloads…</span>
              </div>
            ) : filteredCases.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <span className="text-sm">No navigator caseload assignments yet.</span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Navigator</TableHead>
                    <TableHead>Learner</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead>Closed</TableHead>
                    <TableHead>Closed Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCases.map((r: NavigatorCaseloadRow) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-[12px] text-muted-foreground">{r.navigator_user_id?.slice(0, 8)}…</TableCell>
                      <TableCell className="font-medium">
                        {r.learner_name || <span className="text-muted-foreground">{r.learner_user_id.slice(0, 8)}…</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          r.status === 'open' || r.status === 'active' ? 'default' :
                          r.status === 'closed' ? 'secondary' :
                          'outline'
                        } className="capitalize">
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-[13px]">
                        {r.assigned_at ? new Date(r.assigned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-[13px]">
                        {r.closed_at ? new Date(r.closed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </TableCell>
                      <TableCell className="text-[12px] text-muted-foreground truncate max-w-[200px]" title={r.closed_reason || ''}>
                        {r.closed_reason || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
