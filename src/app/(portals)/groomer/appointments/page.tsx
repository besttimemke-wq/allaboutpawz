'use client';

import { useBookings } from '@/hooks/useQueries';
import { PawPrint, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function GroomerAppointmentsPage() {
  const { data, isLoading: loading } = useBookings(100);
  const appointments = data?.appointments ?? [];

  if (loading) return <div className="p-8 text-[13px] text-muted-foreground">Loading appointments…</div>;

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6 bg-background p-6 md:p-8">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">My Appointments</h1>
      <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
        <div className="divide-y divide-border">
          {appointments.length === 0 ? (
            <div className="p-8 text-center text-[13px] text-muted-foreground">No appointments.</div>
          ) : appointments.map((appt) => (
            <div key={appt.id} className="flex items-center gap-4 p-4 hover:bg-accent/50 transition-colors">
              <div className="size-10 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
                <PawPrint className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-foreground">{appt.dogName || appt.petName || '—'} — {appt.serviceName || appt.service || 'Grooming'}</p>
                <p className="text-[11px] text-muted-foreground">{appt.customerName || appt.ownerName || '—'} · {appt.date || '—'} at {appt.time || '—'}</p>
              </div>
              <span className={cn('inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase',
                appt.status === 'Completed' || appt.status === 'completed' ? 'bg-success/10 text-success border-success/20' :
                appt.status === 'In Progress' || appt.status === 'in_service' ? 'bg-primary/10 text-primary border-primary/20' :
                'bg-muted text-muted-foreground border-border')}>{appt.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
