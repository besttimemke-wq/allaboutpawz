'use client';

import React, { useState } from 'react';
import { 
  DawgNavSection, 
  KPIMetric, 
  AppointmentItem, 
  StaffScheduleItem, 
  FunnelStage, 
  GroomingRecord, 
  AlertNotification 
} from '@/lib/dawg-types';
import { 
  Calendar, 
  DollarSign, 
  UserPlus, 
  PawPrint, 
  RefreshCw, 
  ArrowUpRight, 
  ArrowDownRight, 
  ArrowRight, 
  ChevronDown, 
  Plus, 
  MoreHorizontal,
  ShieldAlert,
  FileText,
  Cake,
  Package,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react';

interface DashboardViewProps {
  metrics: KPIMetric[];
  appointments: AppointmentItem[];
  staffSchedules: StaffScheduleItem[];
  bookingFunnel: FunnelStage[];
  groomingRecords: GroomingRecord[];
  alerts: AlertNotification[];
  onNavigateSection: (section: DawgNavSection) => void;
  onOpenQuickAction: (actionType: 'appointment' | 'customer' | 'pet' | 'intake' | 'payment' | 'invoice') => void;
  onSelectAppointment?: (appt: AppointmentItem) => void;
  onToggleAppointmentStatus?: (id: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  metrics,
  appointments,
  staffSchedules,
  bookingFunnel,
  groomingRecords,
  alerts,
  onNavigateSection,
  onOpenQuickAction,
  onSelectAppointment,
  onToggleAppointmentStatus
}) => {
  const [revenuePeriod, setRevenuePeriod] = useState<'This Week' | 'This Month' | 'Quarter'>('This Week');
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(4); // default Friday highlighted

  // Revenue chart dataset
  const revenuePoints = [
    { day: 'Mon', amount: '$4,200', x: 30, y: 95 },
    { day: 'Tue', amount: '$4,800', x: 75, y: 88 },
    { day: 'Wed', amount: '$6,200', x: 120, y: 62 },
    { day: 'Thu', amount: '$5,900', x: 165, y: 72 },
    { day: 'Fri', amount: '$8,400', x: 210, y: 40 },
    { day: 'Sat', amount: '$6,900', x: 255, y: 64 },
    { day: 'Sun', amount: '$5,400', x: 300, y: 80 },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-5 ">
      {/* 1. KEY PERFORMANCE INDICATOR CARDS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5" data-purpose="kpi-metrics-grid">
        {/* Card 1: Today's Appointments */}
        <div 
          onClick={() => onNavigateSection('appointments')}
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:border-indigo-300 transition-all cursor-pointer flex items-center gap-3"
        >
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl flex-shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-500 truncate">Today&apos;s Appointments</p>
            <p className="text-xl font-bold text-slate-900 tracking-tight">28</p>
            <p className="text-[10px] font-semibold text-emerald-600 flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3 stroke-[2.5]" /> 12% <span className="font-normal text-slate-400 ml-0.5">vs yesterday</span>
            </p>
          </div>
        </div>

        {/* Card 2: Today's Revenue */}
        <div 
          onClick={() => onNavigateSection('payments')}
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:border-indigo-300 transition-all cursor-pointer flex items-center gap-3"
        >
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl flex-shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-500 truncate">Today&apos;s Revenue</p>
            <p className="text-xl font-bold text-slate-900 tracking-tight">$6,842.50</p>
            <p className="text-[10px] font-semibold text-emerald-600 flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3 stroke-[2.5]" /> 18% <span className="font-normal text-slate-400 ml-0.5">vs yesterday</span>
            </p>
          </div>
        </div>

        {/* Card 3: New Customers (30d) */}
        <div 
          onClick={() => onNavigateSection('customers')}
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:border-indigo-300 transition-all cursor-pointer flex items-center gap-3"
        >
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl flex-shrink-0">
            <UserPlus className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-500 truncate">New Customers (30d)</p>
            <p className="text-xl font-bold text-slate-900 tracking-tight">46</p>
            <p className="text-[10px] font-semibold text-emerald-600 flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3 stroke-[2.5]" /> 15% <span className="font-normal text-slate-400 ml-0.5">vs last 30 days</span>
            </p>
          </div>
        </div>

        {/* Card 4: No Show Rate (30d) */}
        <div 
          onClick={() => onNavigateSection('reports')}
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:border-indigo-300 transition-all cursor-pointer flex items-center gap-3"
        >
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center text-xl flex-shrink-0">
            <PawPrint className="w-5 h-5 fill-amber-500" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-500 truncate">No Show Rate (30d)</p>
            <p className="text-xl font-bold text-slate-900 tracking-tight">4.2%</p>
            <p className="text-[10px] font-semibold text-emerald-600 flex items-center gap-0.5">
              <ArrowDownRight className="w-3 h-3 stroke-[2.5]" /> 1.3% <span className="font-normal text-slate-400 ml-0.5">vs last 30 days</span>
            </p>
          </div>
        </div>

        {/* Card 5: Rebook Rate (30d) */}
        <div 
          onClick={() => onNavigateSection('reports')}
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:border-indigo-300 transition-all cursor-pointer flex items-center gap-3"
        >
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center text-xl flex-shrink-0">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-500 truncate">Rebook Rate (30d)</p>
            <p className="text-xl font-bold text-slate-900 tracking-tight">68%</p>
            <p className="text-[10px] font-semibold text-emerald-600 flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3 stroke-[2.5]" /> 6% <span className="font-normal text-slate-400 ml-0.5">vs last 30 days</span>
            </p>
          </div>
        </div>
      </section>

      {/* 2. MID SECTION (Appointments, Revenue Chart, Staff Schedule) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5" data-purpose="primary-operations-grid">
        {/* Column 1: Today's Appointments List (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Today&apos;s Appointments</h3>
              <button
                onClick={() => onNavigateSection('calendar')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                View Calendar
              </button>
            </div>

            {/* List of Appointments */}
            <div className="space-y-3">
              {appointments.slice(0, 5).map((appt) => (
                <div 
                  key={appt.id} 
                  onClick={() => onToggleAppointmentStatus && onToggleAppointmentStatus(appt.id)}
                  className="flex items-center justify-between text-xs py-1 hover:bg-slate-50/80 px-1 rounded-lg transition-colors cursor-pointer"
                >
                  <span className="text-slate-400 font-medium text-[11px] w-14">{appt.time}</span>
                  <div className="flex items-center gap-2 flex-1 min-w-0 px-2">
                    <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 text-xs font-bold flex-shrink-0">
                      {appt.petEmoji}
                    </div>
                    <div className="truncate">
                      <p className="font-bold text-slate-800 leading-tight truncate">{appt.petName}</p>
                      <p className="text-[10px] text-slate-400 leading-tight">{appt.breed}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[11px] text-slate-700 font-medium">{appt.serviceName}</p>
                    {appt.staffName && (
                      <span className="text-[10px] text-slate-400 block">{appt.staffName}</span>
                    )}
                    <span className={`inline-block px-1.5 py-0.5 text-[9px] font-semibold rounded ${
                      appt.status === 'Checked In'
                        ? 'text-emerald-700 bg-emerald-50'
                        : 'text-blue-700 bg-blue-50'
                    }`}>
                      {appt.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 mt-2 border-t border-slate-100">
            <button
              onClick={() => onNavigateSection('appointments')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              <span>View all appointments</span>
              <ArrowRight className="w-3 h-3 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Column 2: Revenue Overview (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Revenue Overview</h3>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-xl font-extrabold text-slate-900 tracking-tight">$34,341.00</span>
                  <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-0.5">
                    <ArrowUpRight className="w-3 h-3 stroke-[2.5]" /> 16.4% <span className="font-normal text-slate-400 ml-0.5">vs last week</span>
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setRevenuePeriod(p => p === 'This Week' ? 'This Month' : 'This Week')}
                className="flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg hover:bg-slate-100"
              >
                <span>{revenuePeriod}</span>
                <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
              </button>
            </div>

            {/* SVG Line Chart */}
            <div className="mt-4 h-36 w-full relative">
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 320 120">
                {/* Grid Lines */}
                <line stroke="#f1f5f9" strokeWidth="1" x1="20" x2="310" y1="20" y2="20" />
                <line stroke="#f1f5f9" strokeWidth="1" x1="20" x2="310" y1="50" y2="50" />
                <line stroke="#f1f5f9" strokeWidth="1" x1="20" x2="310" y1="80" y2="80" />
                <line stroke="#f1f5f9" strokeWidth="1" x1="20" x2="310" y1="110" y2="110" />

                {/* Left Axis Labels */}
                <text fill="#94a3b8" fontSize="8" x="0" y="24">$8K</text>
                <text fill="#94a3b8" fontSize="8" x="0" y="54">$6K</text>
                <text fill="#94a3b8" fontSize="8" x="0" y="84">$4K</text>
                <text fill="#94a3b8" fontSize="8" x="0" y="114">$0</text>

                {/* Gradient Definition */}
                <defs>
                  <linearGradient id="chartGradientDawg" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Area Fill */}
                <path d="M 30 95 L 75 88 L 120 62 L 165 72 L 210 40 L 255 64 L 300 80 L 300 110 L 30 110 Z" fill="url(#chartGradientDawg)" />

                {/* Main Line */}
                <path d="M 30 95 L 75 88 L 120 62 L 165 72 L 210 40 L 255 64 L 300 80" fill="none" stroke="#6366f1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />

                {/* Interactive Nodes */}
                {revenuePoints.map((pt, i) => (
                  <g key={pt.day} onMouseEnter={() => setHoveredPoint(i)}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      fill={hoveredPoint === i ? '#4338ca' : '#6366f1'}
                      r={hoveredPoint === i ? 4.5 : 2.5}
                      stroke={hoveredPoint === i ? '#ffffff' : 'none'}
                      strokeWidth={1.5}
                      className="cursor-pointer transition-all"
                    />
                  </g>
                ))}
              </svg>

              {/* X-Axis Labels */}
              <div className="flex justify-between pl-6 pr-2 text-[9px] text-slate-400 mt-1 font-medium">
                {revenuePoints.map((pt, i) => (
                  <span 
                    key={pt.day}
                    className={hoveredPoint === i ? 'font-bold text-indigo-600' : ''}
                  >
                    {pt.day}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Stat Category Pills */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
            <div className="bg-indigo-50/50 p-2 rounded-xl border border-indigo-100">
              <p className="text-[10px] text-slate-500 font-medium">Services</p>
              <p className="text-xs font-bold text-slate-900">$26,541.00</p>
              <p className="text-[9px] text-indigo-600 font-medium">77%</p>
            </div>
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
              <p className="text-[10px] text-slate-500 font-medium">Products</p>
              <p className="text-xs font-bold text-slate-900">$4,842.00</p>
              <p className="text-[9px] text-slate-500 font-medium">14%</p>
            </div>
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
              <p className="text-[10px] text-slate-500 font-medium">Add-ons</p>
              <p className="text-xs font-bold text-slate-900">$2,958.00</p>
              <p className="text-[9px] text-slate-500 font-medium">9%</p>
            </div>
          </div>
        </div>

        {/* Column 3: Today's Schedule (Staff Capacity) (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Today&apos;s Schedule (Staff)</h3>
              <button
                onClick={() => onNavigateSection('schedule')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                View Full Schedule
              </button>
            </div>

            {/* Staff Grid Slots */}
            <div className="space-y-3.5">
              {staffSchedules.map((staff) => (
                <div key={staff.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 w-28 flex-shrink-0">
                    <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                      {staff.initials}
                    </div>
                    <div className="truncate">
                      <p className="font-bold text-slate-800 leading-tight truncate">{staff.name}</p>
                      <p className="text-[10px] text-slate-400">{staff.role}</p>
                    </div>
                  </div>

                  {/* Mini slot bars */}
                  <div className="flex items-center gap-1">
                    {staff.slots.map((slot, idx) => (
                      <span
                        key={idx}
                        title={`${staff.name} - Slot ${idx + 1}: ${slot}`}
                        className={`w-2.5 h-4 rounded-xs transition-colors ${
                          slot === 'booked'
                            ? 'bg-emerald-500'
                            : slot === 'break'
                            ? 'bg-rose-400'
                            : slot === 'blocked'
                            ? 'bg-amber-400'
                            : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="text-right w-10">
                    <span className="font-bold text-slate-800 text-xs">{staff.appointmentsCount}</span>
                    <span className="text-[10px] text-slate-400 block">appts</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Schedule Legend */}
          <div className="flex items-center justify-center gap-4 text-[10px] text-slate-500 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" /> Booked</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-xs bg-slate-200" /> Available</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-xs bg-rose-400" /> Break</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-xs bg-amber-400" /> Blocked</div>
          </div>
        </div>
      </section>

      {/* 3. LOWER SECTION (Funnel, Records, Alerts) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5" data-purpose="funnel-records-alerts-grid">
        {/* Bookings Funnel (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900 mb-3">Bookings Funnel (30 Days)</h3>

            {/* Trapezoid Funnel Representation */}
            <div className="flex flex-col items-center justify-center py-2 space-y-1 relative">
              {/* Tier 1 */}
              <div className="w-11/12 bg-indigo-300 text-indigo-950 py-1.5 px-3 rounded-t-lg text-center shadow-2xs">
                <p className="font-bold text-xs">412</p>
                <p className="text-[10px] font-medium opacity-80">Website Visits</p>
              </div>

              {/* Conversion indicator 1 */}
              <div className="text-[10px] font-bold text-slate-500 self-end mr-6 flex items-center gap-1">
                <span className="w-3 h-px bg-slate-300" /> 45.9%
              </div>

              {/* Tier 2 */}
              <div className="w-9/12 bg-indigo-400 text-white py-1.5 px-3 text-center shadow-2xs">
                <p className="font-bold text-xs">189</p>
                <p className="text-[10px] font-medium opacity-90">Account Created</p>
              </div>

              {/* Conversion indicator 2 */}
              <div className="text-[10px] font-bold text-slate-500 self-end mr-10 flex items-center gap-1">
                <span className="w-3 h-px bg-slate-300" /> 75.1%
              </div>

              {/* Tier 3 */}
              <div className="w-7/12 bg-emerald-400 text-white py-1.5 px-3 text-center shadow-2xs">
                <p className="font-bold text-xs">142</p>
                <p className="text-[10px] font-medium opacity-90">Intake Completed</p>
              </div>

              {/* Conversion indicator 3 */}
              <div className="text-[10px] font-bold text-slate-500 self-end mr-14 flex items-center gap-1">
                <span className="w-3 h-px bg-slate-300" /> 81.4%
              </div>

              {/* Tier 4 */}
              <div className="w-5/12 bg-amber-300 text-amber-950 py-1.5 px-3 text-center shadow-2xs">
                <p className="font-bold text-xs">118</p>
                <p className="text-[10px] font-medium opacity-90">Booked</p>
              </div>

              {/* Conversion indicator 4 */}
              <div className="text-[10px] font-bold text-slate-500 self-end mr-16 flex items-center gap-1">
                <span className="w-3 h-px bg-slate-300" /> 81.4%
              </div>

              {/* Tier 5 */}
              <div className="w-4/12 bg-rose-400 text-white py-1.5 px-2 rounded-b-lg text-center shadow-2xs">
                <p className="font-bold text-xs">96</p>
                <p className="text-[9px] font-medium opacity-90">Completed</p>
              </div>
            </div>
          </div>

          <div className="text-center pt-2 text-[11px] text-slate-400">
            Overall Conversion: <span className="font-bold text-slate-700">23.3%</span> (Visit to Completed)
          </div>
        </div>

        {/* Recent Grooming Records (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Recent Grooming Records</h3>
              <button
                onClick={() => onNavigateSection('grooming-records')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                View All
              </button>
            </div>

            {/* Grooming Record items */}
            <div className="space-y-3">
              {groomingRecords.slice(0, 4).map((rec) => (
                <div key={rec.id} className="flex items-center justify-between text-xs py-1 hover:bg-slate-50/80 px-1 rounded-lg transition-colors">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
                    <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-xs flex-shrink-0">
                      {rec.petEmoji}
                    </div>
                    <div className="truncate">
                      <p className="font-bold text-slate-800 leading-tight truncate">{rec.petName}</p>
                      <p className="text-[10px] text-slate-400 leading-tight truncate">{rec.breed}</p>
                    </div>
                  </div>
                  <div className="text-center text-[10px] text-slate-500 px-1">
                    <p className="font-medium text-slate-700">{rec.date} • {rec.serviceName}</p>
                    <p className="text-slate-400">Groomer: {rec.groomer}</p>
                  </div>
                  <div className="text-right w-16 flex-shrink-0">
                    <p className="font-bold text-slate-900">${rec.amount.toFixed(2)}</p>
                    <span className="text-[9px] font-bold text-emerald-600 uppercase">Paid</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 mt-2 border-t border-slate-100">
            <button
              onClick={() => onNavigateSection('grooming-records')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              <span>View all grooming records</span>
              <ArrowRight className="w-3 h-3 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Alerts & Reminders (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Alerts &amp; Reminders</h3>
              <span className="text-[11px] font-medium text-slate-400">Priority Feed</span>
            </div>

            {/* Alert rows */}
            <div className="space-y-3">
              {/* Alert 1 */}
              <div 
                onClick={() => onNavigateSection('pets')}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-lg flex-shrink-0">
                    <ShieldAlert className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Vaccinations Expiring Soon</p>
                    <p className="text-[10px] text-slate-400">12 pets have vaccinations expiring in 30 days</p>
                  </div>
                </div>
                <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 font-bold text-[11px] flex items-center justify-center flex-shrink-0">
                  12
                </span>
              </div>

              {/* Alert 2 */}
              <div 
                onClick={() => onNavigateSection('documents')}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg flex-shrink-0">
                    <FileText className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Unsigned Documents</p>
                    <p className="text-[10px] text-slate-400">8 documents need customer signature</p>
                  </div>
                </div>
                <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 font-bold text-[11px] flex items-center justify-center flex-shrink-0">
                  8
                </span>
              </div>

              {/* Alert 3 */}
              <div 
                onClick={() => onNavigateSection('pets')}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg flex-shrink-0">
                    <Cake className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Upcoming Birthdays</p>
                    <p className="text-[10px] text-slate-400">5 pets have birthdays this week</p>
                  </div>
                </div>
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-[11px] flex items-center justify-center flex-shrink-0">
                  5
                </span>
              </div>

              {/* Alert 4 */}
              <div 
                onClick={() => onNavigateSection('inventory')}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-lg flex-shrink-0">
                    <Package className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Low Inventory</p>
                    <p className="text-[10px] text-slate-400">7 products are running low</p>
                  </div>
                </div>
                <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 font-bold text-[11px] flex items-center justify-center flex-shrink-0">
                  7
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 mt-2 border-t border-slate-100">
            <button
              onClick={() => onNavigateSection('appointments')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              <span>View all alerts</span>
              <ArrowRight className="w-3 h-3 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </section>

      {/* 4. BOTTOM QUICK ACTIONS BAR */}
      <section className="bg-white rounded-2xl border border-slate-200 p-3 shadow-2xs flex flex-wrap items-center justify-between gap-2" data-purpose="quick-actions-bar">
        <span className="text-xs font-bold text-slate-800 px-2">Quick Actions</span>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Action: New Appointment */}
          <button 
            onClick={() => onOpenQuickAction('appointment')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100 font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Appointment</span>
          </button>

          {/* Action: Add Customer */}
          <button 
            onClick={() => onOpenQuickAction('customer')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Customer</span>
          </button>

          {/* Action: Add Pet */}
          <button 
            onClick={() => onOpenQuickAction('pet')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Pet</span>
          </button>

          {/* Action: Intake Form */}
          <button 
            onClick={() => onOpenQuickAction('intake')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Intake Form</span>
          </button>

          {/* Action: Payment */}
          <button 
            onClick={() => onOpenQuickAction('payment')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Payment</span>
          </button>

          {/* Action: Invoice */}
          <button 
            onClick={() => onOpenQuickAction('invoice')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Invoice</span>
          </button>

          {/* Action: More Actions */}
          <button 
            onClick={() => onNavigateSection('settings')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-500 bg-white hover:bg-slate-50 font-medium transition-colors"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
            <span>More Actions</span>
          </button>
        </div>
      </section>
    </div>
  );
};
