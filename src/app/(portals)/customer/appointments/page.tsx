'use client';

import { useBookings } from '@/hooks/useQueries';
import { Calendar, Clock, PawPrint, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function CustomerAppointmentsPage() {
  const { data, isLoading: loading } = useBookings(50);
  const appointments = data?.appointments ?? [];

  const upcoming = appointments.filter(a => 
    a.status === 'CONFIRMED' || a.status === 'PAYMENT_PENDING' || a.status === 'Scheduled' || a.status === 'precheck' || a.status === 'confirmed'
  );
  const past = appointments.filter(a => 
    a.status === 'COMPLETED' || a.status === 'Completed' || a.status === 'completed' || a.status === 'CANCELLED' || a.status === 'Cancelled'
  );

  if (loading) return <div className="p-8 text-[13px] text-muted-foreground">Loading appointments…</div>;

  return (
    <div className="mx-auto w-full max-w-[1000px] space-y-6 bg-background p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">My Appointments</h1>
        <p className="text-[13px] text-muted-foreground mt-1">View upcoming and past grooming appointments.</p>
      </div>

      {/* Upcoming */}
      <section>
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Upcoming ({upcoming.length})</h2>
        <div className="space-y-2">
          {upcoming.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-6 text-center text-[13px] text-muted-foreground">
              No upcoming appointments.{' '}
              <Link href="/book" className="text-primary font-medium hover:underline">Book one now →</Link>
            </div>
          ) : upcoming.map((appt) => (
            <div key={appt.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
              <div className="size-10 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
                <PawPrint className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium text-foreground">{appt.dogName || appt.petName || '—'} — {appt.serviceName || appt.service || 'Grooming'}</p>
                <p className="text-[12px] text-muted-foreground">{appt.date || '—'} at {appt.time || '—'}</p>
              </div>
              <span className={cn(
                'inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase',
                appt.status === 'CONFIRMED' || appt.status === 'confirmed' ? 'bg-success/10 text-success border-success/20' :
                'bg-warning/10 text-warning border-warning/20'
              )}>
                {appt.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Past */}
      {past.length > 0 && (
        <section>
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Past ({past.length})</h2>
          <div className="space-y-2">
            {past.map((appt) => (
              <div key={appt.id} className="bg-muted/30 border border-border rounded-xl p-4 flex items-center gap-4 opacity-75">
                <div className="size-10 rounded-lg bg-muted text-muted-foreground border border-border flex items-center justify-center">
                  <Calendar className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-foreground">{appt.dogName || appt.petName || '—'} — {appt.serviceName || appt.service || 'Grooming'}</p>
                  <p className="text-[12px] text-muted-foreground">{appt.date || '—'} at {appt.time || '—'}</p>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground uppercase">
                  {appt.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
