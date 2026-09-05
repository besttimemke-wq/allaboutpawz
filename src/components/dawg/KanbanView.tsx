'use client';

import React, { useState } from 'react';
import { AppointmentItem, AppointmentStatus } from '@/lib/dawg-types';
import { 
  Clock, 
  User, 
  MoreHorizontal, 
  Plus, 
  Scissors, 
  DollarSign, 
  CheckCircle2, 
  Play, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { AppointmentActionMenu } from './AppointmentActionMenu';

interface KanbanViewProps {
  appointments: AppointmentItem[];
  onSelectAppointment: (appointment: AppointmentItem) => void;
  onUpdateStatus: (id: string, newStatus: AppointmentStatus) => void;
  onAddAppointment: (status?: AppointmentStatus) => void;
  onActionClick: (actionKey: string, appointment: AppointmentItem) => void;
}

interface StageColumn {
  id: AppointmentStatus | 'Waitlist';
  title: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  statusFilter: AppointmentStatus[];
}

const STAGES: StageColumn[] = [
  {
    id: 'Scheduled',
    title: 'Scheduled',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    borderColor: 'border-blue-200',
    statusFilter: ['Scheduled'],
  },
  {
    id: 'Confirmed',
    title: 'Confirmed',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    borderColor: 'border-emerald-200',
    statusFilter: ['Confirmed'],
  },
  {
    id: 'Checked In',
    title: 'Checked In',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
    borderColor: 'border-amber-200',
    statusFilter: ['Checked In'],
  },
  {
    id: 'In Progress',
    title: 'In Progress',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
    borderColor: 'border-purple-200',
    statusFilter: ['In Progress'],
  },
  {
    id: 'Completed',
    title: 'Completed',
    badgeBg: 'bg-teal-50',
    badgeText: 'text-teal-700',
    borderColor: 'border-teal-200',
    statusFilter: ['Completed'],
  },
];

export const KanbanView: React.FC<KanbanViewProps> = ({
  appointments,
  onSelectAppointment,
  onUpdateStatus,
  onAddAppointment,
  onActionClick,
}) => {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const getNextStatus = (current: AppointmentStatus): AppointmentStatus | null => {
    switch (current) {
      case 'Scheduled': return 'Confirmed';
      case 'Confirmed': return 'Checked In';
      case 'Checked In': return 'In Progress';
      case 'In Progress': return 'Completed';
      default: return null;
    }
  };

  const getNextStatusLabel = (current: AppointmentStatus): string => {
    switch (current) {
      case 'Scheduled': return 'Confirm';
      case 'Confirmed': return 'Check In';
      case 'Checked In': return 'Start Groom';
      case 'In Progress': return 'Complete';
      default: return 'Next';
    }
  };

  return (
    <div className="w-full flex-1 overflow-x-auto pb-6 custom-scrollbar">
      <div className="inline-flex gap-4 min-w-full items-start px-1">
        {STAGES.map((stage) => {
          const stageAppts = appointments.filter((a) =>
            stage.statusFilter.includes(a.status)
          );
          const totalValue = stageAppts.reduce((sum, a) => sum + (a.price || 0), 0);

          return (
            <div
              key={stage.id}
              className="w-80 flex-shrink-0 bg-slate-100/80 rounded-2xl p-3 border border-slate-200/80 flex flex-col max-h-[calc(100vh-250px)]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 px-1 border-b border-slate-200/60 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${stage.badgeBg} ${stage.badgeText} ${stage.borderColor}`}>
                    {stage.title}
                  </span>
                  <span className="text-xs font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                    {stageAppts.length}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-600">
                    ${totalValue.toFixed(0)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onAddAppointment(stage.id === 'Waitlist' ? 'Waitlisted' : stage.id)}
                    className="p-1 hover:bg-white rounded-lg text-slate-500 hover:text-indigo-600 transition cursor-pointer"
                    title={`Add to ${stage.title}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Cards Container */}
              <div className="flex-1 overflow-y-auto space-y-3 py-3 px-0.5 custom-scrollbar">
                {stageAppts.length === 0 ? (
                  <div className="py-8 text-center border-2 border-dashed border-slate-200 rounded-xl bg-white/50">
                    <p className="text-xs text-slate-400 font-medium">No appointments</p>
                    <button
                      type="button"
                      onClick={() => onAddAppointment(stage.id === 'Waitlist' ? 'Waitlisted' : stage.id)}
                      className="mt-2 text-xs text-indigo-600 font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Add Card
                    </button>
                  </div>
                ) : (
                  stageAppts.map((appt) => {
                    const nextStatus = getNextStatus(appt.status);
                    return (
                      <div
                        key={appt.id}
                        className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs hover:shadow-md transition-all relative group"
                      >
                        {/* Card Header: Time & Action Trigger */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                            <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span>{appt.time}</span>
                            {appt.duration && (
                              <span className="text-[10px] text-slate-400 font-normal">
                                ({appt.duration})
                              </span>
                            )}
                          </div>
                          
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setActiveMenuId(activeMenuId === appt.id ? null : appt.id)}
                              className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition cursor-pointer"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>

                            {activeMenuId === appt.id && (
                              <AppointmentActionMenu
                                appointment={appt}
                                onClose={() => setActiveMenuId(null)}
                                onAction={onActionClick}
                              />
                            )}
                          </div>
                        </div>

                        {/* Pet & Customer Info */}
                        <div 
                          onClick={() => onSelectAppointment(appt)}
                          className="flex items-start gap-2.5 cursor-pointer"
                        >
                          {appt.petAvatar ? (
                            <img
                              src={appt.petAvatar}
                              alt={appt.petName}
                              className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0">
                              {appt.customerInitials || appt.petEmoji || '🐾'}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold text-slate-900 truncate hover:text-indigo-600 transition">
                                {appt.petName}
                              </h4>
                              <span className="text-xs font-bold text-emerald-600 shrink-0 ml-1">
                                ${appt.price?.toFixed(2) || '75.00'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" />
                              {appt.customerName || 'Customer'}
                            </p>
                          </div>
                        </div>

                        {/* Service & Groomer Badges */}
                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px]">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium truncate">
                            <Scissors className="w-3 h-3 text-slate-500 shrink-0" />
                            <span className="truncate">{appt.serviceName}</span>
                          </span>

                          <span className="text-[10px] text-slate-500 font-medium shrink-0">
                            {appt.staffName ? appt.staffName.split(' ')[0] : 'Unassigned'}
                          </span>
                        </div>

                        {/* Direct Next Action Trigger */}
                        {nextStatus && (
                          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => onSelectAppointment(appt)}
                              className="text-[11px] text-indigo-600 font-semibold hover:underline cursor-pointer"
                            >
                              Details
                            </button>
                            <button
                              type="button"
                              onClick={() => onUpdateStatus(appt.id, nextStatus)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-semibold transition cursor-pointer"
                            >
                              <span>{getNextStatusLabel(appt.status)}</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
