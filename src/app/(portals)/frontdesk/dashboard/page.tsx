'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  UserCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar as CalendarIcon,
  Phone,
  Plus,
  Search,
  Stethoscope,
  PawPrint,
  Receipt,
  Bell,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Front Desk Dashboard — the desk operator's at-a-glance surface.
// - KPI strip: who's checked in, who's waiting, who's done, who no-showed
// - Live check-in queue (today's arrivals, by status)
// - Today's appointment timeline
// - Quick actions: walk-in check-in, take a phone message, quick POS lookup
// ============================================================================

interface CheckInRow {
  id: string;
  time: string;
  petName: string;
  breed: string;
  ownerName: string;
  service: string;
  groomer: string;
  status: 'scheduled' | 'arrived' | 'in_progress' | 'completed' | 'no_show';
}

const KPI = [
  {
    label: 'Checked In',
    value: '12',
    delta: '+3 vs. yesterday',
    icon: UserCheck,
    tone: 'emerald',
  },
  {
    label: 'Waiting',
    value: '2',
    delta: 'avg wait 8 min',
    icon: Clock,
    tone: 'amber',
  },
  {
    label: 'Completed',
    value: '7',
    delta: 'of 19 booked',
    icon: CheckCircle2,
    tone: 'blue',
  },
  {
    label: 'No-Shows',
    value: '1',
    delta: 'follow-up queued',
    icon: XCircle,
    tone: 'rose',
  },
];

const TONE_CLASS: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  blue: 'bg-sky-50 text-sky-700 border-sky-200',
  rose: 'bg-rose-50 text-rose-700 border-rose-200',
};

const STATUS_BADGE: Record<CheckInRow['status'], { label: string; className: string }> = {
  scheduled: { label: 'Scheduled', className: 'bg-muted text-muted-foreground' },
  arrived: { label: 'Arrived', className: 'bg-emerald-100 text-emerald-800' },
  in_progress: { label: 'In Progress', className: 'bg-sky-100 text-sky-800' },
  completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-800' },
  no_show: { label: 'No-Show', className: 'bg-rose-100 text-rose-800' },
};

const TODAY_QUEUE: CheckInRow[] = [
  { id: 'q1', time: '8:30 AM', petName: 'Coco', breed: 'Poodle', ownerName: 'Maria L.', service: 'Full Groom', groomer: 'Sarah M.', status: 'completed' },
  { id: 'q2', time: '9:00 AM', petName: 'Biscuit', breed: 'Shih Tzu', ownerName: 'James W.', service: 'Bath & Tidy', groomer: 'Sarah M.', status: 'in_progress' },
  { id: 'q3', time: '9:30 AM', petName: 'Rocky', breed: 'Beagle', ownerName: 'Priya K.', service: 'Bath Only', groomer: 'Dana R.', status: 'arrived' },
  { id: 'q4', time: '10:00 AM', petName: 'Luna', breed: 'Husky', ownerName: 'Tom H.', service: 'Full Groom + Teeth', groomer: 'Dana R.', status: 'arrived' },
  { id: 'q5', time: '10:30 AM', petName: 'Mochi', breed: 'Pomeranian', ownerName: 'Ava P.', service: 'Bath & Tidy', groomer: 'Sarah M.', status: 'scheduled' },
  { id: 'q6', time: '11:00 AM', petName: 'Zeus', breed: 'German Shepherd', ownerName: 'Chris B.', service: 'Full Groom', groomer: 'Dana R.', status: 'no_show' },
];

const TIMELINE = [
  { time: '8:30 AM', label: 'Coco — Full Groom (Sarah M.)', status: 'completed' as const },
  { time: '9:00 AM', label: 'Biscuit — Bath & Tidy (Sarah M.)', status: 'in_progress' as const },
  { time: '9:30 AM', label: 'Rocky — Bath Only (Dana R.)', status: 'arrived' as const },
  { time: '10:00 AM', label: 'Luna — Full Groom + Teeth (Dana R.)', status: 'arrived' as const },
  { time: '10:30 AM', label: 'Mochi — Bath & Tidy (Sarah M.)', status: 'scheduled' as const },
  { time: '11:00 AM', label: 'Zeus — Full Groom (Dana R.)', status: 'no_show' as const },
  { time: '12:00 PM', label: 'Lunch block — no appointments', status: 'scheduled' as const },
  { time: '1:00 PM', label: 'Bella — Bath & Tidy (Sarah M.)', status: 'scheduled' as const },
];

const MESSAGES = [
  { id: 'm1', from: 'Garcia, A.', phone: '(214) 555-0118', note: 'Wants to reschedule Rocky to Thursday.', time: '9:42 AM', done: false },
  { id: 'm2', from: 'Patterson, K.', phone: '(469) 555-2231', note: 'Asking about nail trim pricing for a senior cat.', time: '10:15 AM', done: false },
  { id: 'm3', from: 'Unknown', phone: '(972) 555-8890', note: 'Hung up — sounded like a wrong number.', time: '11:03 AM', done: true },
];

export default function FrontDeskDashboardPage() {
  const router = useRouter();
  const [queue, setQueue] = useState<CheckInRow[]>(TODAY_QUEUE);
  const [messages, setMessages] = useState(MESSAGES);

  const setStatus = (id: string, status: CheckInRow['status']) =>
    setQueue((q) => q.map((r) => (r.id === id ? { ...r, status } : r)));

  const toggleMessage = (id: string) =>
    setMessages((m) => m.map((r) => (r.id === id ? { ...r, done: !r.done } : r)));

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Desk Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tuesday, May 12, 2025 · Main Location
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push('/frontdesk/check-in')}>
            <Plus className="size-4 mr-1" /> Walk-In Check-In
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push('/frontdesk/phone-messages')}>
            <Phone className="size-4 mr-1" /> Take Message
          </Button>
          <Button size="sm" onClick={() => router.push('/frontdesk/orders')}>
            <Receipt className="size-4 mr-1" /> Quick POS
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className="border-border/60">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {k.label}
                    </p>
                    <p className="text-2xl font-semibold mt-1">{k.value}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{k.delta}</p>
                  </div>
                  <div
                    className={cn(
                      'flex items-center justify-center size-9 rounded-lg border',
                      TONE_CLASS[k.tone]
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Two-column layout: queue + timeline */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Live check-in queue */}
        <Card className="xl:col-span-2 border-border/60">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <UserCheck className="size-4 text-emerald-600" />
                  Live Check-In Queue
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Arrivals today — check pets in, mark no-shows, hand off to groomers.
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-xs">
                <Search className="size-3.5 mr-1" /> Find owner
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="text-left font-medium px-4 py-2.5">Time</th>
                    <th className="text-left font-medium px-4 py-2.5">Pet</th>
                    <th className="text-left font-medium px-4 py-2.5">Owner</th>
                    <th className="text-left font-medium px-4 py-2.5">Service</th>
                    <th className="text-left font-medium px-4 py-2.5">Groomer</th>
                    <th className="text-left font-medium px-4 py-2.5">Status</th>
                    <th className="text-right font-medium px-4 py-2.5">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {queue.map((row) => {
                    const badge = STATUS_BADGE[row.status];
                    return (
                      <tr key={row.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium tabular-nums">{row.time}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center justify-center size-7 rounded-full bg-muted text-xs">
                              <PawPrint className="size-3.5" />
                            </div>
                            <div>
                              <div className="font-medium">{row.petName}</div>
                              <div className="text-[11px] text-muted-foreground">{row.breed}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">{row.ownerName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{row.service}</td>
                        <td className="px-4 py-3 text-muted-foreground">{row.groomer}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={cn('font-medium', badge.className)}>
                            {badge.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {row.status === 'scheduled' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setStatus(row.id, 'arrived')}
                            >
                              Check In
                            </Button>
                          )}
                          {row.status === 'arrived' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setStatus(row.id, 'no_show')}
                            >
                              No-Show
                            </Button>
                          )}
                          {(row.status === 'in_progress' || row.status === 'completed') && (
                            <span className="text-[11px] text-muted-foreground">—</span>
                          )}
                          {row.status === 'no_show' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setStatus(row.id, 'arrived')}
                            >
                              Undo
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Timeline + messages */}
        <div className="space-y-6">
          {/* Today's timeline */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarIcon className="size-4 text-sky-600" />
                Today&rsquo;s Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ol className="relative space-y-3 before:absolute before:left-[5px] before:top-2 before:bottom-2 before:w-px before:bg-border">
                {TIMELINE.map((t) => (
                  <li key={t.time + t.label} className="relative pl-6">
                    <span
                      className={cn(
                        'absolute left-0 top-1.5 size-2.5 rounded-full ring-4 ring-background',
                        t.status === 'completed' && 'bg-emerald-500',
                        t.status === 'in_progress' && 'bg-sky-500',
                        t.status === 'arrived' && 'bg-amber-500',
                        t.status === 'scheduled' && 'bg-muted-foreground/40',
                        t.status === 'no_show' && 'bg-rose-500'
                      )}
                    />
                    <div className="flex items-baseline gap-2">
                      <span className="text-[11px] tabular-nums text-muted-foreground">{t.time}</span>
                      <span className="text-sm">{t.label}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          {/* Phone messages */}
          <Card className="border-border/60">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Phone className="size-4 text-violet-600" />
                  Phone Messages
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  {messages.filter((m) => !m.done).length} pending
                </CardDescription>
              </div>
              <Bell className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pt-0 space-y-2.5">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    'rounded-lg border p-3 transition-opacity',
                    m.done && 'opacity-60'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{m.from}</p>
                      <p className="text-[11px] text-muted-foreground tabular-nums">{m.phone}</p>
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0">{m.time}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{m.note}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Button size="sm" variant="outline" onClick={() => toggleMessage(m.id)}>
                      {m.done ? 'Reopen' : 'Mark done'}
                    </Button>
                    <Button size="sm" variant="ghost">
                      <ArrowRight className="size-3.5 mr-1" /> Open
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Find Customer', icon: Search, path: '/frontdesk/customers' },
          { label: 'Add Pet', icon: PawPrint, path: '/frontdesk/pets' },
          { label: 'Vet & Shot Records', icon: Stethoscope, path: '/frontdesk/pets' },
          { label: 'Schedule View', icon: CalendarIcon, path: '/frontdesk/schedule' },
        ].map((q) => {
          const Icon = q.icon;
          return (
            <button
              key={q.label}
              onClick={() => router.push(q.path)}
              className="flex items-center gap-3 rounded-lg border border-border/60 bg-card p-3 text-left hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center justify-center size-9 rounded-lg bg-muted">
                <Icon className="size-4" />
              </div>
              <span className="text-sm font-medium">{q.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
