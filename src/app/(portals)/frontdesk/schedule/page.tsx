'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarClock, Clock } from 'lucide-react';

// ============================================================================
// Front Desk — Schedule & Shifts. Who is on the floor today: groomer
// stations, desk coverage, breaks. Editing shift templates belongs to the
// admin OS; the desk needs the day's answer at a glance.
// ============================================================================

const SHIFTS = [
  { name: 'Sarah M.', role: 'Groomer', time: '8:00 AM – 4:30 PM', station: 'Tables 1–2', status: 'On shift' },
  { name: 'Dana R.', role: 'Groomer', time: '9:00 AM – 5:30 PM', station: 'Bath 1 + Table 1', status: 'On shift' },
  { name: 'Ellie T.', role: 'Front Desk', time: '8:00 AM – 2:00 PM', station: 'Desk', status: 'On shift' },
  { name: 'You', role: 'Front Desk', time: '12:00 PM – 6:30 PM', station: 'Desk', status: 'Current' },
  { name: 'Marcus V.', role: 'Bather', time: '10:00 AM – 4:00 PM', station: 'Bath 2', status: 'Break' },
];

const BREAKS = [
  { name: 'Marcus V.', time: '12:30 – 1:00 PM' },
  { name: 'Sarah M.', time: '1:00 – 1:30 PM' },
  { name: 'Dana R.', time: '1:30 – 2:00 PM' },
];

export default function FrontDeskSchedulePage() {
  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Schedule &amp; Shifts</h1>
        <p className="text-sm text-muted-foreground mt-1">Tuesday, May 12, 2025 · Main Location.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border/60 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarClock className="size-4 text-muted-foreground" /> Today&apos;s coverage
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/60">
              {SHIFTS.map((s) => (
                <div key={s.name} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-[140px] flex-1">
                    <p className="text-[13px] font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.role} · {s.station}</p>
                  </div>
                  <span className="text-[13px] flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="size-3.5" /> {s.time}
                  </span>
                  <Badge
                    className={
                      s.status === 'On shift'
                        ? 'bg-emerald-100 text-emerald-800 border-0'
                        : s.status === 'Current'
                          ? 'bg-sky-100 text-sky-800 border-0'
                          : 'bg-amber-100 text-amber-800 border-0'
                    }
                  >
                    {s.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Upcoming breaks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {BREAKS.map((b) => (
              <div key={b.name} className="flex items-center justify-between text-[13px]">
                <span>{b.name}</span>
                <span className="text-muted-foreground">{b.time}</span>
              </div>
            ))}
            <p className="text-[11px] text-muted-foreground pt-2">
              Desk coverage never drops below one operator during breaks.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
