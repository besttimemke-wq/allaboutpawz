'use client';
import React, { useState } from 'react';
import { useAppointments, useUpdateAppointment } from '@/hooks/useBookingData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Search, Loader2, AlertCircle, User, Clock, Check, X } from 'lucide-react';

export default function AppointmentsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const { data: appointments = [], isLoading, isError, error } = useAppointments({ status: statusFilter || undefined });
  const updateAppointment = useUpdateAppointment();

  const filtered = appointments.filter((a: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (a.customer_name?.toLowerCase().includes(q)) || (a.appointment_number?.toLowerCase().includes(q)) || (a.groomer_name?.toLowerCase().includes(q)) || (a.pet_names?.toLowerCase().includes(q));
  });

  const statusColors: Record<string, string> = { scheduled: 'default', confirmed: 'default', checked_in: 'secondary', in_service: 'secondary', completed: 'default', cancelled: 'destructive', no_show: 'destructive' };
  const statuses = ['', 'scheduled', 'confirmed', 'checked_in', 'in_service', 'completed', 'cancelled', 'no_show'];

  const fmtTime = (s: string) => s ? new Date(s).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
  const fmtMoney = (s: string) => s ? `$${Number(s).toFixed(2)}` : '—';

  return (
    <div className="flex flex-col w-full h-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold tracking-tight text-foreground">Appointments</h1><p className="text-[13px] text-muted-foreground mt-1">Manage grooming appointments, check-ins, and status transitions.</p></div>
        <Badge variant="secondary" className="gap-1.5"><Calendar className="size-3" />{appointments.length} appointments</Badge>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: appointments.length, color: '#547590' },
          { label: 'Confirmed', value: appointments.filter(a => a.status === 'confirmed' || a.status === 'scheduled').length, color: '#187b65' },
          { label: 'In Service', value: appointments.filter(a => a.status === 'checked_in' || a.status === 'in_service').length, color: '#956e29' },
          { label: 'Completed', value: appointments.filter(a => a.status === 'completed').length, color: '#227665' },
          { label: 'Cancelled/No-show', value: appointments.filter(a => ['cancelled', 'no_show'].includes(a.status)).length, color: '#b46545' },
        ].map(c => (
          <Card key={c.label}><CardContent className="pt-4 pb-4"><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{c.label}</p><p className="text-xl font-bold mt-1" style={{ color: c.color }}>{c.value}</p></CardContent></Card>
        ))}
      </div>
      <div className="flex gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" /><Input placeholder="Search by customer, groomer, or pet…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-border rounded-lg px-3 py-2 text-[13px] bg-background">
          {statuses.map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
        </select>
      </div>
      <Card><CardContent className="p-0">
        {isLoading ? (<div className="flex items-center justify-center py-16 gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" /><span className="text-sm">Loading appointments…</span></div>)
        : isError ? (<div className="flex items-center justify-center py-16 gap-2 text-destructive"><AlertCircle className="size-4" /><span className="text-sm">Error: {(error as Error).message}</span></div>)
        : filtered.length === 0 ? (<div className="flex items-center justify-center py-16 text-muted-foreground"><span className="text-sm">No appointments found.</span></div>)
        : (<div className="max-h-96 overflow-y-auto"><Table><TableHeader><TableRow><TableHead>Appt #</TableHead><TableHead>Customer</TableHead><TableHead>Pet(s)</TableHead><TableHead>Groomer</TableHead><TableHead>Service(s)</TableHead><TableHead>Start</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>
          {filtered.map((a: any) => (
            <TableRow key={a.id}>
              <TableCell className="font-mono text-xs">{a.appointment_number || a.id.slice(0, 8)}</TableCell>
              <TableCell className="font-medium">{a.customer_name || '—'}</TableCell>
              <TableCell className="text-[13px] text-muted-foreground">{a.pet_names || '—'}</TableCell>
              <TableCell className="text-[13px]">{a.groomer_name || 'Unassigned'}</TableCell>
              <TableCell className="text-[13px] text-muted-foreground">{a.service_names || '—'}</TableCell>
              <TableCell className="text-[13px] text-muted-foreground">{fmtTime(a.starts_at)}</TableCell>
              <TableCell className="font-semibold tabular-nums">{fmtMoney(a.total)}</TableCell>
              <TableCell><Badge variant={statusColors[a.status] || 'outline'}>{a.status}</Badge></TableCell>
              <TableCell className="text-right">
                {a.status === 'confirmed' || a.status === 'scheduled' ? <Button size="sm" variant="ghost" className="gap-1 text-green-600 h-7" onClick={() => updateAppointment.mutate({ id: a.id, updates: { status: 'checked_in' } })}><Check className="size-3" />Check In</Button>
                : a.status === 'checked_in' ? <Button size="sm" variant="ghost" className="gap-1 h-7" onClick={() => updateAppointment.mutate({ id: a.id, updates: { status: 'in_service' } })}><Clock className="size-3" />Start</Button>
                : a.status === 'in_service' ? <Button size="sm" variant="ghost" className="gap-1 text-green-600 h-7" onClick={() => updateAppointment.mutate({ id: a.id, updates: { status: 'completed' } })}><Check className="size-3" />Complete</Button>
                : <Button size="sm" variant="ghost" className="gap-1 h-7" disabled>View</Button>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody></Table></div>)}
      </CardContent></Card>
    </div>
  );
}
