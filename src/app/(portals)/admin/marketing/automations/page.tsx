'use client';
import React from 'react';
import { useAutomations } from '@/hooks/useMarketingData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Workflow, Loader2, AlertCircle, Zap, Play, Clock, Activity } from 'lucide-react';

export default function AutomationsPage() {
  const { data, isLoading, isError, error } = useAutomations();
  const workflows = data?.workflows ?? [];
  const enrollments = data?.enrollments ?? [];
  const runs = data?.runs ?? [];

  return (
    <div className="flex flex-col w-full h-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold tracking-tight text-foreground">Automations</h1><p className="text-[13px] text-muted-foreground mt-1">Trigger-based marketing workflows and customer lifecycle automations.</p></div>
        <Button className="gap-1.5"><Zap className="size-4" /> New Workflow</Button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[{label:'Workflows',value:workflows.length,icon:Workflow},{label:'Active Enrollments',value:enrollments.filter(e=>e.status==='active').length,icon:Activity},{label:'Total Runs',value:runs.length,icon:Play}].map(c => (
          <Card key={c.label}><CardContent className="pt-4 pb-4"><div className="flex items-center gap-2 mb-1"><c.icon className="size-3.5 text-muted-foreground" /><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{c.label}</p></div><p className="text-xl font-bold">{c.value}</p></CardContent></Card>
        ))}
      </div>
      <Card><CardHeader><CardTitle className="text-[15px] flex items-center gap-2"><Workflow className="size-4" /> Workflows</CardTitle></CardHeader><CardContent className="p-0">
        {isLoading ? <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" /><span className="text-sm">Loading workflows…</span></div>
        : isError ? <div className="flex items-center justify-center py-16 gap-2 text-destructive"><AlertCircle className="size-4" /><span className="text-sm">Error: {(error as Error)?.message}</span></div>
        : workflows.length === 0 ? <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground"><Workflow className="size-8 opacity-40" /><span className="text-sm">No automation workflows yet.</span></div>
        : <div className="max-h-96 overflow-y-auto"><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Enrollments</TableHead><TableHead>Re-entry</TableHead><TableHead>Created</TableHead></TableRow></TableHeader><TableBody>
          {workflows.map((w: any) => (<TableRow key={w.id}>
            <TableCell className="font-medium">{w.name}</TableCell>
            <TableCell className="text-[13px]">{w.workflow_type}</TableCell>
            <TableCell><Badge variant={w.status === 'active' ? 'default' : 'outline'}>{w.status}</Badge></TableCell>
            <TableCell className="tabular-nums">{w.enrollment_count ?? 0}</TableCell>
            <TableCell>{w.allow_reentry ? <Badge variant="secondary">Allowed</Badge> : <span className="text-[12px] text-muted-foreground">No</span>}</TableCell>
            <TableCell className="text-[13px] text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</TableCell>
          </TableRow>))}
        </TableBody></Table></div>}
      </CardContent></Card>
      {enrollments.length > 0 && (
        <Card><CardHeader><CardTitle className="text-[15px] flex items-center gap-2"><Activity className="size-4" /> Recent Enrollments</CardTitle></CardHeader><CardContent className="p-0"><div className="max-h-48 overflow-y-auto"><Table><TableHeader><TableRow><TableHead>Status</TableHead><TableHead>Step</TableHead><TableHead>Scheduled</TableHead><TableHead>Started</TableHead><TableHead>Error</TableHead></TableRow></TableHeader><TableBody>
          {enrollments.slice(0, 10).map((e: any) => (<TableRow key={e.id}>
            <TableCell><Badge variant={e.status === 'completed' ? 'default' : 'outline'}>{e.status}</Badge></TableCell>
            <TableCell className="tabular-nums">{e.current_step}</TableCell>
            <TableCell className="text-[13px] text-muted-foreground">{e.scheduled_for ? new Date(e.scheduled_for).toLocaleString() : '—'}</TableCell>
            <TableCell className="text-[13px] text-muted-foreground">{e.started_at ? new Date(e.started_at).toLocaleDateString() : '—'}</TableCell>
            <TableCell className="text-[12px] text-destructive truncate max-w-[200px]">{e.last_error || '—'}</TableCell>
          </TableRow>))}
        </TableBody></Table></div></CardContent></Card>
      )}
    </div>
  );
}
