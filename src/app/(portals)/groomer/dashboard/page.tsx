'use client';

import { useAppStore } from '@/lib/store';
import { Calendar, Clock, PawPrint, DollarSign, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function GroomerDashboardPage() {
  const { appointments, staffSchedules, currentUser } = useAppStore();

  const myAppts = appointments.filter(a => a.staffName?.includes('Sarah') || true).slice(0, 5);
  const completed = appointments.filter(a => a.status === 'Completed').length;
  const inProgress = appointments.filter(a => a.status === 'In Progress').length;
  const scheduled = appointments.filter(a => a.status === 'Scheduled').length;
  const todayRevenue = appointments
    .filter(a => a.status === 'Completed')
    .reduce((sum, a) => sum + (a.price || 0), 0);

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 bg-background p-6 md:p-8">
      <div>
        <h1 className="font-bar text-2xl font-semibold tracking-tight text-foreground">
          Welcome, {currentUser?.name}
        </h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          Your station schedule and active appointments for today.
        </p>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Scheduled Today', value: scheduled, icon: Calendar, tone: 'text-primary' },
          { label: 'In Progress', value: inProgress, icon: Clock, tone: 'text-warning' },
          { label: 'Completed', value: completed, icon: CheckCircle2, tone: 'text-success' },
          { label: 'Revenue Today', value: `$${todayRevenue.toFixed(0)}`, icon: DollarSign, tone: 'text-primary' },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="bg-card border border-border rounded-xl p-4 shadow-card">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{kpi.label}</span>
                <Icon className={cn('size-4', kpi.tone)} />
              </div>
              <div className="text-2xl font-bar font-semibold tabular-nums text-foreground mt-2">{kpi.value}</div>
            </div>
          );
        })}
      </div>

      {/* Today's Appointments */}
      <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
        <div className="bg-muted/40 border-b border-border px-4 py-2.5 flex items-center justify-between">
          <span className="text-[13px] font-medium text-foreground">Today's Appointments</span>
          <span className="text-[11px] text-muted-foreground">{myAppts.length} scheduled</span>
        </div>
        <div className="divide-y divide-border">
          {myAppts.map((appt) => (
            <div key={appt.id} className="flex items-center gap-4 p-4 hover:bg-accent/50 transition-colors">
              <div className="size-10 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-lg">
                <PawPrint className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-foreground">{appt.petName} — {appt.breed}</p>
                <p className="text-[11px] text-muted-foreground">{appt.serviceName} · {appt.customerName}</p>
              </div>
              <div className="text-right">
                <p className="text-[12px] font-medium tabular-nums text-foreground">{appt.time}</p>
                <p className="text-[10px] text-muted-foreground">{appt.staffName}</p>
              </div>
              <span className={cn(
                'inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase',
                appt.status === 'Completed' ? 'bg-success/10 text-success border-success/20' :
                appt.status === 'In Progress' ? 'bg-primary/10 text-primary border-primary/20' :
                'bg-muted text-muted-foreground border-border'
              )}>
                {appt.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
