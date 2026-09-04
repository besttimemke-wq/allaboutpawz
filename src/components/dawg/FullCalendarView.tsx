'use client';

import React, { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { AppointmentItem } from '@/lib/dawg-types';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Filter,
  Scissors
} from 'lucide-react';

interface FullCalendarViewProps {
  appointments: AppointmentItem[];
  onSelectAppointment: (appointment: AppointmentItem) => void;
  onAddAppointment: (dateStr?: string) => void;
  onDateChange?: (dateStr: string) => void;
}

export const FullCalendarView: React.FC<FullCalendarViewProps> = ({
  appointments,
  onSelectAppointment,
  onAddAppointment,
  onDateChange,
}) => {
  const [calendarView, setCalendarView] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'>('timeGridWeek');
  const [groomerFilter, setGroomerFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const calendarRef = React.useRef<FullCalendar | null>(null);
  const [currentTitle, setCurrentTitle] = useState('May 2025');

  // Map appointment items to FullCalendar event format
  const calendarEvents = appointments
    .filter((a) => {
      const matchGroomer = groomerFilter === 'All' || a.staffName?.includes(groomerFilter);
      const matchStatus = statusFilter === 'All' || a.status === statusFilter;
      return matchGroomer && matchStatus;
    })
    .map((appt) => {
      // Determine date and time
      const datePart = appt.date || '2025-05-16';
      
      // Parse time e.g. "8:30 AM" or "10:30 AM"
      let startHour = 9;
      let startMinute = 0;
      if (appt.time) {
        const timeMatch = appt.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (timeMatch) {
          let h = parseInt(timeMatch[1], 10);
          const m = parseInt(timeMatch[2], 10);
          const ampm = timeMatch[3].toUpperCase();
          if (ampm === 'PM' && h < 12) h += 12;
          if (ampm === 'AM' && h === 12) h = 0;
          startHour = h;
          startMinute = m;
        }
      }

      const formattedHour = startHour.toString().padStart(2, '0');
      const formattedMinute = startMinute.toString().padStart(2, '0');
      const endHour = (startHour + 2).toString().padStart(2, '0');

      const startIso = `${datePart}T${formattedHour}:${formattedMinute}:00`;
      const endIso = `${datePart}T${endHour}:${formattedMinute}:00`;

      // Status color matching Design Spec
      let bg = '#4f46e5'; // indigo
      let border = '#4338ca';
      let textColor = '#ffffff';

      if (appt.status === 'Checked In') {
        bg = '#f59e0b'; // amber
        border = '#d97706';
      } else if (appt.status === 'In Progress') {
        bg = '#8b5cf6'; // purple
        border = '#7c3aed';
      } else if (appt.status === 'Completed') {
        bg = '#10b981'; // emerald
        border = '#059669';
      } else if (appt.status === 'Confirmed') {
        bg = '#059669'; // teal/emerald
        border = '#047857';
      } else if (appt.status === 'Canceled') {
        bg = '#f43f5e'; // rose
        border = '#e11d48';
      } else if (appt.status === 'Waitlisted') {
        bg = '#f97316'; // orange
        border = '#ea580c';
      } else if (appt.status === 'Scheduled') {
        bg = '#3b82f6'; // blue
        border = '#2563eb';
      }

      return {
        id: appt.id,
        title: `${appt.petEmoji || '🐶'} ${appt.petName} (${appt.serviceName})`,
        start: startIso,
        end: endIso,
        backgroundColor: bg,
        borderColor: border,
        textColor: textColor,
        extendedProps: {
          raw: appt,
        },
      };
    });

  const handleEventClick = (info: any) => {
    const rawAppt = info.event.extendedProps?.raw;
    if (rawAppt) {
      onSelectAppointment(rawAppt);
    }
  };

  const handleDateSelect = (selectInfo: any) => {
    onAddAppointment(selectInfo.startStr);
  };

  const handlePrev = () => {
    const api = calendarRef.current?.getApi();
    if (api) {
      api.prev();
      setCurrentTitle(api.view.title);
      if (onDateChange) onDateChange(api.getDate().toISOString().split('T')[0]);
    }
  };

  const handleNext = () => {
    const api = calendarRef.current?.getApi();
    if (api) {
      api.next();
      setCurrentTitle(api.view.title);
      if (onDateChange) onDateChange(api.getDate().toISOString().split('T')[0]);
    }
  };

  const handleToday = () => {
    const api = calendarRef.current?.getApi();
    if (api) {
      api.today();
      setCurrentTitle(api.view.title);
      if (onDateChange) onDateChange(api.getDate().toISOString().split('T')[0]);
    }
  };

  const handleChangeView = (viewName: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay') => {
    setCalendarView(viewName);
    const api = calendarRef.current?.getApi();
    if (api) {
      api.changeView(viewName);
      setCurrentTitle(api.view.title);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4 font-sans">
      {/* Calendar Navigation & Filters Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        {/* Left: Date Controls */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleToday}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition cursor-pointer"
          >
            Today
          </button>

          <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <button
              type="button"
              onClick={handlePrev}
              className="p-1.5 hover:bg-slate-50 text-slate-500 border-r border-slate-200 cursor-pointer"
              title="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="p-1.5 hover:bg-slate-50 text-slate-500 cursor-pointer"
              title="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h3 className="text-base font-bold text-slate-900 ml-1 tracking-tight">
            {currentTitle || 'May 16, 2025'}
          </h3>
        </div>

        {/* Right: Groomer filter, Status filter & View Switcher */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Groomer Filter */}
          <select
            value={groomerFilter}
            onChange={(e) => setGroomerFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500 shadow-2xs cursor-pointer"
          >
            <option value="All">All Groomers</option>
            <option value="Sarah M.">Sarah M.</option>
            <option value="Mike R.">Mike R.</option>
            <option value="Jessica L.">Jessica L.</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500 shadow-2xs cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Checked In">Checked In</option>
            <option value="In Progress">In Progress</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Completed">Completed</option>
            <option value="Waitlisted">Waitlisted</option>
            <option value="Canceled">Canceled</option>
          </select>

          {/* View Mode Buttons */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => handleChangeView('dayGridMonth')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                calendarView === 'dayGridMonth'
                  ? 'bg-white text-indigo-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => handleChangeView('timeGridWeek')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                calendarView === 'timeGridWeek'
                  ? 'bg-white text-indigo-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => handleChangeView('timeGridDay')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                calendarView === 'timeGridDay'
                  ? 'bg-white text-indigo-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Day
            </button>
          </div>

          <button
            type="button"
            onClick={() => onAddAppointment()}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Book Slot</span>
          </button>
        </div>
      </div>

      {/* FullCalendar React Container */}
      <div className="fullcalendar-custom-wrapper">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          initialDate="2025-05-16"
          headerToolbar={false}
          events={calendarEvents}
          editable={true}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          weekends={true}
          slotMinTime="07:00:00"
          slotMaxTime="20:00:00"
          slotDuration="00:30:00"
          allDaySlot={false}
          eventClick={handleEventClick}
          select={handleDateSelect}
          height={680}
          eventClassNames="cursor-pointer hover:opacity-90 font-medium text-xs rounded-md shadow-xs p-1"
        />
      </div>

      {/* Mini Legend Footer */}
      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span>Scheduled</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            <span>Confirmed</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Checked In</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
            <span>In Progress</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
            <span>Completed</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>Canceled</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
            <span>Waitlisted</span>
          </span>
        </div>
        <div className="text-slate-400 font-medium">
          Drag &amp; drop to reschedule or click any slot to book
        </div>
      </div>
    </div>
  );
};
