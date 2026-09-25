'use client';
import React from 'react';
import { useAppointments } from '@/hooks/useBookingData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarClock, Loader2 } from 'lucide-react';

export default function SchedulePage() {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const { data: appointments = [], isLoading } = useAppointments({ startDate: today, endDate: tomorrow + 'T23:59:59' });

  const groomers: Record<string, any[]> = {};
  for (const a of appointments) { const g = a.groomer_name || 'Unassigned'; (groomers[g] ||= []).push(a); }
  const fmtTime = (s: string) => s ? new Date(s).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—';

  return (
    <div className="flex flex-col w-full h-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold tracking-tight text-foreground">Schedule</h1><p className="text-[13px] text-muted-foreground mt-1">Today's groomer assignments and appointment timeline.</p></div>
        <Badge variant="secondary" className="gap-1.5"><CalendarClock className="size-3" />{appointments.length} today</Badge>
      </div>
      {isLoading ? (<div className="flex items-center justify-center py-16 gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" /><span className="text-sm">Loading schedule…</span></div>)
      : Object.keys(groomers).length === 0 ? (<Card><CardContent className="py-16 text-center text-muted-foreground text-sm">No appointments scheduled for today.</CardContent></Card>)
      : (<div className="space-y-4">
        {Object.entries(groomers).map(([groomer, appts]) => (
          <Card key={groomer}>
            <CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="text-[15px]">{groomer}</CardTitle><Badge variant="outline">{appts.length} appointments</Badge></div></CardHeader>
            <CardContent className="p-0"><div className="max-h-64 overflow-y-auto"><Table><TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Customer</TableHead><TableHead>Pet(s)</TableHead><TableHead>Service(s)</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>
              {appts.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()).map((a: any) => (
                <TableRow key={a.id}><TableCell className="font-mono text-xs">{fmtTime(a.starts_at)}</TableCell><TableCell className="font-medium">{a.customer_name}</TableCell><TableCell className="text-[13px] text-muted-foreground">{a.pet_names || '—'}</TableCell><TableCell className="text-[13px] text-muted-foreground">{a.service_names || '—'}</TableCell><TableCell><Badge variant={a.status === 'completed' ? 'default' : a.status === 'cancelled' ? 'destructive' : 'outline'}>{a.status}</Badge></TableCell></TableRow>
              ))}
            </TableBody></Table></div></CardContent>
          </Card>
        ))}
      </div>)}
    </div>
  );
}
