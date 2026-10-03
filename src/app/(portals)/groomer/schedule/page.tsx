'use client';

import { useBookings } from '@/hooks/useQueries';
import { Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function GroomerSchedulePage() {
  const { data, isLoading: loading } = useBookings(100);
  const appointments = data?.appointments ?? [];

  if (loading) return <div className="p-8 text-[13px] text-muted-foreground">Loading schedule…</div>;

  // Group by date
  const byDate: Record<string, any[]> = {};
  for (const a of appointments) {
    const d = a.date || 'Unknown';
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(a);
  }
  const dates = Object.keys(byDate).sort();

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6 bg-background p-6 md:p-8">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">My Schedule</h1>
      {dates.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center text-[13px] text-muted-foreground">No scheduled appointments.</div>
      ) : dates.map(date => (
        <div key={date} className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="bg-muted/40 border-b border-border px-4 py-2.5">
            <span className="text-[13px] font-medium text-foreground flex items-center gap-2">
              <Calendar className="size-4" /> {date}
            </span>
          </div>
          <div className="divide-y divide-border">
            {byDate[date].map((appt) => (
              <div key={appt.id} className="flex items-center gap-4 p-3">
                <Clock className="size-4 text-muted-foreground" />
                <span className="text-[12px] font-medium tabular-nums text-foreground">{appt.time || '—'}</span>
                <span className="text-[13px] text-foreground">{appt.dogName || appt.petName || '—'}</span>
                <span className="text-[11px] text-muted-foreground">{appt.serviceName || appt.service || 'Grooming'}</span>
                <span className={cn('ml-auto inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase',
                  appt.status === 'Completed' || appt.status === 'completed' ? 'bg-success/10 text-success border-success/20' : 'bg-muted text-muted-foreground border-border')}>{appt.status}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
