'use client';

import React, { useState } from 'react';
import { AppointmentItem, AppointmentStatus } from '@/lib/types';
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  MoreHorizontal, 
  Scissors,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { AppointmentActionMenu } from './AppointmentActionMenu';

interface HourlyTimelineViewProps {
  appointments: AppointmentItem[];
  onSelectAppointment: (appointment: AppointmentItem) => void;
  onAddAppointment: (date?: string, time?: string, groomer?: string) => void;
  onUpdateStatus: (id: string, newStatus: AppointmentStatus) => void;
  onActionClick: (actionKey: string, appointment: AppointmentItem) => void;
}

const HOURS = [
  '8:00 AM',
  '9:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '1:00 PM',
  '2:00 PM',
  '3:00 PM',
  '4:00 PM',
  '5:00 PM',
  '6:00 PM',
];

const GROOMERS = ['Sarah M.', 'Mike R.', 'Jessica L.'];

export const HourlyTimelineView: React.FC<HourlyTimelineViewProps> = ({
  appointments,
  onSelectAppointment,
  onAddAppointment,
  onActionClick,
}) => {
  const [selectedDate, setSelectedDate] = useState('2025-05-16');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const parseTimeToMinutes = (timeStr?: string): number => {
    if (!timeStr) return 9 * 60; // 9:00 AM default
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return 9 * 60;
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const ampm = match[3].toUpperCase();
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  };

  const getDurationMinutes = (durationStr?: string): number => {
    if (!durationStr) return 75; // default 75 mins
    if (durationStr.includes('1.5') || durationStr.includes('90')) return 90;
    if (durationStr.includes('2') || durationStr.includes('120')) return 120;
    if (durationStr.includes('45')) return 45;
    if (durationStr.includes('30')) return 30;
    if (durationStr.includes('1 hr') || durationStr.includes('60')) return 60;
    return 75;
  };

  const getStatusColor = (status: AppointmentStatus) => {
    switch (status) {
      case 'Checked In':
        return {
          bg: 'bg-warning/100/10 border-warning/20 text-warning',
          badge: 'bg-warning/10 text-warning border-warning/20',
          borderLeft: 'border-l-4 border-l-amber-500',
        };
      case 'In Progress':
        return {
          bg: 'bg-primary/50/10 border-primary/20 text-primary',
          badge: 'text-primary border-primary/20',
          borderLeft: 'border-l-4 border-l-purple-600',
        };
      case 'Confirmed':
        return {
          bg: 'bg-success/100/10 border-success/20 text-success',
          badge: 'bg-success/10 text-success border-success/20',
          borderLeft: 'border-l-4 border-l-emerald-500',
        };
      case 'Completed':
        return {
          bg: 'bg-primary/50/10 border-primary/20 text-primary',
          badge: 'text-primary border-primary/20',
          borderLeft: 'border-l-4 border-l-teal-600',
        };
      case 'Canceled':
      case 'No Show':
        return {
          bg: 'bg-destructive/50/10 border-destructive/20 text-destructive',
          badge: 'bg-destructive/10 text-destructive border-destructive/20',
          borderLeft: 'border-l-4 border-l-rose-500',
        };
      default:
        return {
          bg: 'bg-primary/50/10 border-primary/20 text-primary',
          badge: 'text-primary border-primary/20',
          borderLeft: 'border-l-4 border-l-blue-500',
        };
    }
  };

  // Filter appointments for the selected date
  const dateAppointments = appointments.filter(
    (a) => !a.date || a.date === selectedDate
  );

  // Compute collision-free positioning for each groomer column
  const startDayMinutes = 8 * 60; // 8:00 AM
  const totalDayMinutes = 10 * 60; // 8 AM to 6 PM = 10 hours
  const pixelsPerMinute = 1.3; // 78px per hour

  return (
    <div className="flex-1 flex flex-col bg-card rounded-2xl border border-border shadow-2xs overflow-hidden">
      {/* Timeline Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-border bg-muted/40/75">
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-card border border-border rounded-xl shadow-2xs">
            <button
              type="button"
              onClick={() => setSelectedDate('2025-05-15')}
              className="p-1.5 hover:bg-muted/40 text-muted-foreground border-r border-border cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 text-[13px] font-semibold text-foreground">
              {selectedDate === '2025-05-16' ? 'Today (Fri, May 16, 2025)' : selectedDate === '2025-05-17' ? 'Tomorrow (Sat, May 17, 2025)' : selectedDate}
            </span>
            <button
              type="button"
              onClick={() => setSelectedDate('2025-05-17')}
              className="p-1.5 hover:bg-muted/40 text-muted-foreground cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSelectedDate('2025-05-16')}
              className={`px-2.5 py-1 rounded-lg text-[13px] font-semibold transition cursor-pointer ${
                selectedDate === '2025-05-16'
                  ? 'bg-primary text-white shadow-2xs'
                  : 'bg-card border border-border text-muted-foreground hover:bg-muted/40'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate('2025-05-17')}
              className={`px-2.5 py-1 rounded-lg text-[13px] font-semibold transition cursor-pointer ${
                selectedDate === '2025-05-17'
                  ? 'bg-primary text-white shadow-2xs'
                  : 'bg-card border border-border text-muted-foreground hover:bg-muted/40'
              }`}
            >
              Tomorrow
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[13px] text-muted-foreground font-medium">
            {dateAppointments.length} appointments scheduled
          </span>
          <button
            type="button"
            onClick={() => onAddAppointment(selectedDate)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-[13px] font-semibold shadow-2xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Book Slot</span>
          </button>
        </div>
      </div>

      {/* Grid: Left Hour Axis + Multi-Groomer Columns */}
      <div className="flex-1 overflow-y-auto overflow-x-auto relative custom-scrollbar">
        <div className="min-w-[760px]">
          {/* Column Header Row */}
          <div className="grid grid-cols-[80px_repeat(3,1fr)] sticky top-0 z-20 bg-muted/40/95 backdrop-blur-xs border-b border-border text-[13px] font-semibold text-foreground">
            <div className="py-2.5 px-3 border-r border-border text-center text-muted-foreground/70">
              Time
            </div>
            {GROOMERS.map((groomer) => (
              <div
                key={groomer}
                className="py-2.5 px-4 border-r border-border last: flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-semibold">
                    {groomer[0]}
                  </div>
                  <span>{groomer}</span>
                </div>
                <span className="text-[11px] font-semibold text-muted-foreground/70">
                  {dateAppointments.filter((a) => a.staffName?.includes(groomer)).length} booked
                </span>
              </div>
            ))}
          </div>

          {/* Timeline Body Canvas */}
          <div className="relative grid grid-cols-[80px_repeat(3,1fr)]" style={{ height: `${totalDayMinutes * pixelsPerMinute}px` }}>
            {/* Hour Guidelines and Labels */}
            <div className="border-r border-border bg-muted/40/50">
              {HOURS.map((hour, idx) => (
                <div
                  key={hour}
                  className="absolute w-full border-b border-border/80 text-[11px] text-muted-foreground/70 tabular-nums pr-2 text-right pt-1 select-none pointer-events-none"
                  style={{ top: `${idx * 60 * pixelsPerMinute}px`, height: `${60 * pixelsPerMinute}px` }}
                >
                  {hour}
                </div>
              ))}
            </div>

            {/* Groomer Columns with zero-collision slot partitioning */}
            {GROOMERS.map((groomer, colIndex) => {
              const groomerAppts = dateAppointments.filter(
                (a) => a.staffName?.includes(groomer) || (!a.staffName && colIndex === 0)
              );

              // Sort by start time
              const sorted = [...groomerAppts].sort((a, b) => {
                return parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time);
              });

              // Collision detection: group overlapping events
              const positionedEvents: Array<{
                appt: AppointmentItem;
                top: number;
                height: number;
                colIndex: number;
                totalCols: number;
              }> = [];

              sorted.forEach((appt) => {
                const startMins = parseTimeToMinutes(appt.time);
                const durationMins = getDurationMinutes(appt.duration);
                const endMins = startMins + durationMins;

                const top = Math.max(0, (startMins - startDayMinutes) * pixelsPerMinute);
                const height = Math.max(45, durationMins * pixelsPerMinute - 4);

                // Find overlaps with already positioned events
                const overlaps = positionedEvents.filter((item) => {
                  const itemStart = parseTimeToMinutes(item.appt.time);
                  const itemEnd = itemStart + getDurationMinutes(item.appt.duration);
                  return Math.max(startMins, itemStart) < Math.min(endMins, itemEnd);
                });

                if (overlaps.length === 0) {
                  positionedEvents.push({
                    appt,
                    top,
                    height,
                    colIndex: 0,
                    totalCols: 1,
                  });
                } else {
                  // Collision detected: arrange side by side
                  const usedCols = new Set(overlaps.map((o) => o.colIndex));
                  let availableCol = 0;
                  while (usedCols.has(availableCol)) {
                    availableCol++;
                  }
                  const newTotal = Math.max(...overlaps.map((o) => o.totalCols), availableCol + 1);

                  // Update totalCols on all overlapping items
                  overlaps.forEach((o) => {
                    o.totalCols = Math.max(o.totalCols, newTotal);
                  });

                  positionedEvents.push({
                    appt,
                    top,
                    height,
                    colIndex: availableCol,
                    totalCols: newTotal,
                  });
                }
              });

              return (
                <div
                  key={groomer}
                  className="relative border-r border-border last: hover:bg-primary/5/10 transition-colors"
                >
                  {/* Horizontal Hour Lines in each column */}
                  {HOURS.map((_, idx) => (
                    <div
                      key={idx}
                      onClick={() => onAddAppointment(selectedDate, HOURS[idx], groomer)}
                      className="absolute w-full border-b border-border hover:bg-primary/5/30 transition-colors cursor-pointer group flex items-center justify-end pr-2"
                      style={{ top: `${idx * 60 * pixelsPerMinute}px`, height: `${60 * pixelsPerMinute}px` }}
                      title={`Click to book slot with ${groomer} at ${HOURS[idx]}`}
                    >
                      <span className="opacity-0 group-hover:opacity-100 text-[10px] text-primary font-semibold transition">
                        + Book
                      </span>
                    </div>
                  ))}

                  {/* Render positioned non-colliding appointment blocks */}
                  {positionedEvents.map(({ appt, top, height, colIndex: subCol, totalCols }) => {
                    const styling = getStatusColor(appt.status);
                    const widthPercent = 100 / totalCols;
                    const leftPercent = subCol * widthPercent;

                    return (
                      <div
                        key={appt.id}
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          left: `${leftPercent}%`,
                          width: `${widthPercent - 1}%`,
                        }}
                        className={`absolute rounded-xl p-2.5 shadow-2xs border transition-all z-10 hover:z-30 hover:shadow-md cursor-pointer ${styling.bg} ${styling.borderLeft} backdrop-blur-xs flex flex-col justify-between overflow-hidden`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectAppointment(appt);
                        }}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-semibold text-[13px] truncate">
                              {appt.petName}
                            </span>
                            <span className={`px-1.5 py-0.2 text-[9px] font-semibold rounded-full border ${styling.badge}`}>
                              {appt.status}
                            </span>
                          </div>

                          <div className="relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(activeMenuId === appt.id ? null : appt.id);
                              }}
                              className="p-1 rounded hover:bg-foreground/[0-9] text-muted-foreground cursor-pointer"
                            >
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </button>

                            {activeMenuId === appt.id && (
                              <div onClick={(e) => e.stopPropagation()}>
                                <AppointmentActionMenu
                                  appointment={appt}
                                  onClose={() => setActiveMenuId(null)}
                                  onAction={onActionClick}
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {appt.serviceName}
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold pt-1">
                          <span className="flex items-center gap-1 tabular-nums">
                            <Clock className="w-3 h-3 text-muted-foreground/70" />
                            {appt.time}
                          </span>
                          <span className="font-semibold text-success">
                            ${appt.price?.toFixed(0) || '75'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
