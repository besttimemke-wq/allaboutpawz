'use client';

import React, { useState } from 'react';
import {
  useBridge,
  type BridgeSyncLogRow,
  type CommerceSyncQueueRow,
} from '@/hooks/useBridge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ArrowRightLeft, Search, Loader2, AlertCircle } from 'lucide-react';

export default function LmsBridgePage() {
  const { syncLog, commerceQueue, isLoading, error } = useBridge();
  const [syncSearch, setSyncSearch] = useState('');
  const [queueSearch, setQueueSearch] = useState('');

  const filteredSync = syncLog.filter((r: BridgeSyncLogRow) => {
    if (!syncSearch.trim()) return true;
    const q = syncSearch.toLowerCase();
    return (
      (r.sync_type?.toLowerCase().includes(q)) ||
      (r.sync_status?.toLowerCase().includes(q)) ||
      (r.started_by?.toLowerCase().includes(q))
    );
  });

  const filteredQueue = commerceQueue.filter((r: CommerceSyncQueueRow) => {
    if (!queueSearch.trim()) return true;
    const q = queueSearch.toLowerCase();
    return (
      (r.sync_direction?.toLowerCase().includes(q)) ||
      (r.entity_type?.toLowerCase().includes(q)) ||
      (r.sync_status?.toLowerCase().includes(q)) ||
      (r.error_message?.toLowerCase().includes(q))
    );
  });

  const successSync = syncLog.filter(s => s.sync_status === 'success' || s.sync_status === 'completed').length;
  const failedSync = syncLog.filter(s => s.sync_status === 'failed' || s.sync_status === 'error').length;
  const pendingQueue = commerceQueue.filter(q => q.sync_status === 'pending' || q.sync_status === 'queued').length;

  return (
    <div className="flex flex-col w-full h-full p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Platform Bridge</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Sync log for credential → commerce integrations and the queued sync jobs.</p>
        </div>
        <Badge variant="secondary" className="gap-1.5">
          <ArrowRightLeft className="size-3" />
          {syncLog.length + commerceQueue.length} records
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Sync Runs', value: syncLog.length },
          { label: 'Successful', value: successSync },
          { label: 'Failed', value: failedSync },
          { label: 'Pending Queue', value: pendingQueue },
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

      {/* Sync Log Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold tracking-tight text-foreground">Sync Log</h2>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search sync runs…"
              value={syncSearch}
              onChange={(e) => setSyncSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                <span className="text-sm">Loading sync log…</span>
              </div>
            ) : filteredSync.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <span className="text-sm">No sync runs logged yet.</span>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto custom-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sync Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Processed</TableHead>
                      <TableHead className="text-right">Succeeded</TableHead>
                      <TableHead className="text-right">Failed</TableHead>
                      <TableHead>Started By</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Completed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSync.map((r: BridgeSyncLogRow) => (
                      <TableRow key={r.id}>
                        <TableCell><Badge variant="outline" className="text-[10px] capitalize">{r.sync_type}</Badge></TableCell>
                        <TableCell>
                          <Badge variant={
                            r.sync_status === 'success' || r.sync_status === 'completed' ? 'secondary' :
                            r.sync_status === 'failed' || r.sync_status === 'error' ? 'destructive' :
                            r.sync_status === 'in_progress' || r.sync_status === 'running' ? 'default' :
                            'outline'
                          } className="capitalize">
                            {r.sync_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-[13px]">{r.records_processed ?? '—'}</TableCell>
                        <TableCell className="text-right tabular-nums text-[13px]">{r.records_succeeded ?? '—'}</TableCell>
                        <TableCell className="text-right tabular-nums text-[13px]">
                          {r.records_failed ? (
                            <span className="text-destructive">{r.records_failed}</span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-[12px] text-muted-foreground">
                          {r.started_by ? `${r.started_by.slice(0, 8)}…` : '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-[13px]">
                          {r.started_at ? new Date(r.started_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-[13px]">
                          {r.completed_at ? new Date(r.completed_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'}
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

      {/* Commerce Queue Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold tracking-tight text-foreground">Commerce Sync Queue</h2>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search queue…"
              value={queueSearch}
              onChange={(e) => setQueueSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                <span className="text-sm">Loading commerce queue…</span>
              </div>
            ) : filteredQueue.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <span className="text-sm">No commerce sync jobs queued yet.</span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Direction</TableHead>
                    <TableHead>Entity Type</TableHead>
                    <TableHead>Entity ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Error</TableHead>
                    <TableHead>Processed</TableHead>
                    <TableHead>Queued</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQueue.map((r: CommerceSyncQueueRow) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Badge variant={r.sync_direction === 'inbound' ? 'outline' : 'default'} className="text-[10px] capitalize">
                          {r.sync_direction}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[13px] capitalize">{r.entity_type}</TableCell>
                      <TableCell className="font-mono text-[12px] text-muted-foreground">
                        {r.entity_id ? r.entity_id.slice(0, 12) : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          r.sync_status === 'completed' || r.sync_status === 'success' ? 'secondary' :
                          r.sync_status === 'failed' || r.sync_status === 'error' ? 'destructive' :
                          r.sync_status === 'pending' || r.sync_status === 'queued' ? 'default' :
                          'outline'
                        } className="capitalize">
                          {r.sync_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[12px] text-destructive truncate max-w-[200px]" title={r.error_message || ''}>
                        {r.error_message || '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-[13px]">
                        {r.processed_at ? new Date(r.processed_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-[13px]">
                        {r.created_at ? new Date(r.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'}
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
