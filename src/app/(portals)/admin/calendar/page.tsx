'use client';
import React, { useState } from 'react';
import { useAppointments } from '@/hooks/useBookingData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, CalendarDays, Loader2 } from 'lucide-react';

export default function CalendarPage() {
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const startDate = new Date(month.getFullYear(), month.getMonth(), 1).toISOString();
  const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59).toISOString();
  const { data: appointments = [], isLoading } = useAppointments({ startDate, endDate });

  const monthName = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const weeks: (Date | null)[][] = [];
  let week: (Date | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) { week.push(new Date(month.getFullYear(), month.getMonth(), d)); if (week.length === 7) { weeks.push(week); week = []; } }
  if (week.length > 0) { while (week.length < 7) week.push(null); weeks.push(week); }

  const apptsByDay: Record<string, any[]> = {};
  for (const a of appointments) { const day = new Date(a.starts_at).toDateString(); (apptsByDay[day] ||= []).push(a); }
  const statusColors: Record<string, string> = { scheduled: 'bg-blue-100 text-blue-700', confirmed: 'bg-green-100 text-green-700', checked_in: 'bg-amber-100 text-amber-700', in_service: 'bg-purple-100 text-purple-700', completed: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-red-100 text-red-700', no_show: 'bg-red-100 text-red-700' };

  return (
    <div className="flex flex-col w-full h-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold tracking-tight text-foreground">Calendar</h1><p className="text-[13px] text-muted-foreground mt-1">Full-month appointment grid with status overview.</p></div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft className="size-4" /></Button>
          <span className="text-[15px] font-semibold min-w-[140px] text-center">{monthName}</span>
          <Button variant="outline" size="sm" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight className="size-4" /></Button>
        </div>
      </div>
      <Card><CardContent className="p-0">
        {isLoading ? (<div className="flex items-center justify-center py-16 gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" /><span className="text-sm">Loading calendar…</span></div>)
        : (<div>
          <div className="grid grid-cols-7 border-b border-border">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="p-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center border-r border-border last:border-0">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {weeks.flat().map((date, i) => {
              if (!date) return <div key={i} className="min-h-[100px] border-r border-b border-border bg-muted/20" />;
              const dayAppts = apptsByDay[date.toDateString()] || [];
              const isToday = date.toDateString() === new Date().toDateString();
              return (
                <div key={i} className={`min-h-[100px] border-r border-b border-border p-1.5 ${isToday ? 'bg-blue-50' : ''}`}>
                  <p className={`text-[11px] font-bold mb-1 ${isToday ? 'text-blue-600' : 'text-muted-foreground'}`}>{date.getDate()}</p>
                  <div className="space-y-0.5">
                    {dayAppts.slice(0, 3).map((a, j) => (
                      <div key={j} className={`text-[9px] px-1 py-0.5 rounded truncate ${statusColors[a.status] || 'bg-muted text-muted-foreground'}`} title={`${a.customer_name} - ${new Date(a.starts_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}>
                        {new Date(a.starts_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} {a.customer_name}
                      </div>
                    ))}
                    {dayAppts.length > 3 && <p className="text-[9px] text-muted-foreground">+{dayAppts.length - 3} more</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        )}
      </CardContent></Card>
    </div>
  );
}
