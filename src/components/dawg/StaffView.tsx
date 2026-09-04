'use client';

import React from 'react';
import { StaffScheduleItem } from '@/lib/dawg-types';
import { UserCheck, Phone, DollarSign, Clock, Plus, Shield } from 'lucide-react';

interface StaffViewProps {
  staffList: StaffScheduleItem[];
}

export const StaffView: React.FC<StaffViewProps> = ({ staffList }) => {
  return (
    <div className="p-4 sm:p-6 space-y-6 ">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-indigo-600" />
            <span>Staff & Groomer Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Shift capacity, appointment distribution, commission tiers, and contact information.
          </p>
        </div>

        <button className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs">
          <Plus className="w-4 h-4" />
          <span>Add Team Member</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {staffList.map((staff) => (
          <div key={staff.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-sm border border-indigo-100">
                  {staff.initials}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{staff.name}</h3>
                  <p className="text-xs text-slate-400 font-medium">{staff.role}</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs">
                {staff.appointmentsCount} Appts Today
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl space-y-2 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <Clock className="w-3.5 h-3.5" /> Shift Slots
                </span>
                <span className="font-semibold text-slate-800">9:00 AM – 5:00 PM</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <DollarSign className="w-3.5 h-3.5" /> Commission Rate
                </span>
                <span className="font-semibold text-emerald-600">{staff.commissionRate || 50}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <Phone className="w-3.5 h-3.5" /> Phone
                </span>
                <span className="font-medium text-slate-700">{staff.phone}</span>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-slate-500 mb-1.5">Today&apos;s Capacity Matrix:</p>
              <div className="flex items-center gap-1">
                {staff.slots.map((s, idx) => (
                  <span
                    key={idx}
                    title={`Slot ${idx + 1}: ${s}`}
                    className={`flex-1 h-3 rounded-xs ${
                      s === 'booked'
                        ? 'bg-emerald-500'
                        : s === 'break'
                        ? 'bg-rose-400'
                        : s === 'blocked'
                        ? 'bg-amber-400'
                        : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
