'use client';

import { useAppStore } from '@/lib/store';
import { Calendar, PawPrint, CreditCard, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CustomerDashboardPage() {
  const { appointments, pets, currentUser } = useAppStore();

  const myAppts = appointments.slice(0, 3);
  const myPets = pets.slice(0, 3);

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 bg-background p-6 md:p-8">
      <div>
        <h1 className="font-bar text-2xl font-semibold tracking-tight text-foreground">
          Welcome, {currentUser?.name}
        </h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          Manage your pets, appointments, and billing.
        </p>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Upcoming Appts', value: myAppts.length, icon: Calendar },
          { label: 'Registered Pets', value: myPets.length, icon: PawPrint },
          { label: 'Outstanding Balance', value: '$0.00', icon: CreditCard },
          { label: 'Loyalty Points', value: '245', icon: Clock },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="bg-card border border-border rounded-xl p-4 shadow-card">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{kpi.label}</span>
                <Icon className="size-4 text-primary" />
              </div>
              <div className="text-2xl font-bar font-semibold tabular-nums text-foreground mt-2">{kpi.value}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Appointments */}
        <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
          <div className="bg-muted/40 border-b border-border px-4 py-2.5 flex items-center justify-between">
            <span className="text-[13px] font-medium text-foreground">Upcoming Appointments</span>
          </div>
          <div className="divide-y divide-border">
            {myAppts.map((appt) => (
              <div key={appt.id} className="flex items-center gap-4 p-4 hover:bg-accent/50 transition-colors">
                <div className="size-10 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-lg">
                  <PawPrint className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-foreground">{appt.petName} — {appt.serviceName}</p>
                  <p className="text-[11px] text-muted-foreground">{appt.date} · {appt.time}</p>
                </div>
                <span className={cn(
                  'inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase',
                  appt.status === 'Completed' ? 'bg-success/10 text-success border-success/20' :
                  'bg-muted text-muted-foreground border-border'
                )}>
                  {appt.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* My Pets */}
        <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
          <div className="bg-muted/40 border-b border-border px-4 py-2.5 flex items-center justify-between">
            <span className="text-[13px] font-medium text-foreground">My Pets</span>
          </div>
          <div className="divide-y divide-border">
            {myPets.map((pet) => (
              <div key={pet.id} className="flex items-center gap-4 p-4 hover:bg-accent/50 transition-colors">
                <div className="size-10 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-lg">
                  {pet.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-foreground">{pet.name}</p>
                  <p className="text-[11px] text-muted-foreground">{pet.breed} · {pet.age}</p>
                </div>
                <span className={cn(
                  'inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                  pet.vaccinationStatus === 'Up to date'
                    ? 'bg-success/10 text-success border-success/20'
                    : 'bg-warning/10 text-warning border-warning/20'
                )}>
                  {pet.vaccinationStatus}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
