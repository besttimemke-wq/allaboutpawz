'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, MapPin, Clock, User } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Front Desk — Today's Appointments. The desk's operational view of the day:
// every appointment, its station, its groomer, its status. Desk operators
// mark arrivals and no-shows; the grooming record itself lives in the
// groomer's station.
// ============================================================================

interface Appt {
  id: string;
  time: string;
  petName: string;
  owner: string;
  service: string;
  groomer: string;
  station: string;
  status: 'scheduled' | 'arrived' | 'in_progress' | 'completed' | 'no_show';
}

const INITIAL: Appt[] = [
  { id: 'a1', time: '8:30 AM', petName: 'Coco', owner: 'Maria L.', service: 'Full Groom', groomer: 'Sarah M.', station: 'Table 1', status: 'completed' },
  { id: 'a2', time: '9:00 AM', petName: 'Biscuit', owner: 'James W.', service: 'Bath & Tidy', groomer: 'Sarah M.', station: 'Table 2', status: 'in_progress' },
  { id: 'a3', time: '9:30 AM', petName: 'Rocky', owner: 'Priya K.', service: 'Bath Only', groomer: 'Dana R.', station: 'Bath 1', status: 'arrived' },
  { id: 'a4', time: '10:00 AM', petName: 'Luna', owner: 'Tom H.', service: 'Full Groom + Teeth', groomer: 'Dana R.', station: 'Table 1', status: 'arrived' },
  { id: 'a5', time: '10:30 AM', petName: 'Mochi', owner: 'Ava P.', service: 'Bath & Tidy', groomer: 'Sarah M.', station: 'Bath 2', status: 'scheduled' },
  { id: 'a6', time: '1:00 PM', petName: 'Bella', owner: 'Nina S.', service: 'Bath & Tidy', groomer: 'Sarah M.', station: 'Table 2', status: 'scheduled' },
  { id: 'a7', time: '2:00 PM', petName: 'Zeus', owner: 'Chris B.', service: 'Full Groom', groomer: 'Dana R.', station: 'Table 1', status: 'scheduled' },
];

const STATUS: Record<Appt['status'], { label: string; className: string }> = {
  scheduled: { label: 'Scheduled', className: 'bg-muted text-muted-foreground' },
  arrived: { label: 'Arrived', className: 'bg-emerald-100 text-emerald-800' },
  in_progress: { label: 'In Progress', className: 'bg-sky-100 text-sky-800' },
  completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-800' },
  no_show: { label: 'No-Show', className: 'bg-rose-100 text-rose-800' },
};

export default function FrontDeskAppointmentsPage() {
  const [appts, setAppts] = useState<Appt[]>(INITIAL);

  const mark = (id: string, status: Appt['status']) =>
    setAppts((a) => a.map((r) => (r.id === id ? { ...r, status } : r)));

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Today&apos;s Appointments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tuesday, May 12, 2025 · Main Location · 7 booked
          </p>
        </div>
      </div>

      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarIcon className="size-4 text-muted-foreground" /> Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/60">
            {appts.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="w-20 shrink-0 flex items-center gap-1.5 text-[13px] font-medium">
                  <Clock className="size-3.5 text-muted-foreground" /> {a.time}
                </div>
                <div className="min-w-[160px] flex-1">
                  <p className="text-[13px] font-medium">
                    {a.petName} <span className="text-muted-foreground">· {a.owner}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {a.service} · {a.groomer} · <MapPin className="inline size-3 -mt-0.5" /> {a.station}
                  </p>
                </div>
                <Badge className={cn('border-0', STATUS[a.status].className)}>{STATUS[a.status].label}</Badge>
                <div className="flex gap-1.5">
                  {a.status === 'scheduled' && (
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => mark(a.id, 'arrived')}>
                      Arrived
                    </Button>
                  )}
                  {a.status === 'arrived' && (
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => mark(a.id, 'in_progress')}>
                      Start
                    </Button>
                  )}
                  {a.status === 'in_progress' && (
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => mark(a.id, 'completed')}>
                      Complete
                    </Button>
                  )}
                  {(a.status === 'scheduled' || a.status === 'arrived') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-rose-600 hover:text-rose-700"
                      onClick={() => mark(a.id, 'no_show')}
                    >
                      No-Show
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
        <User className="size-3.5" /> Grooming records and style notes live in each groomer&apos;s station —
        this desk view tracks arrivals and room flow only.
      </p>
    </div>
  );
}
