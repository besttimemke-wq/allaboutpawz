'use client';

import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  Calendar, 
  XCircle, 
  AlertCircle, 
  Sparkles,
  Info
} from 'lucide-react';

interface StatusLegendModalProps {
  onClose: () => void;
}

const LEGEND_ITEMS = [
  {
    status: 'Scheduled',
    desc: 'Appointment is scheduled.',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    dotClass: 'bg-blue-500 ring-4 ring-blue-100',
  },
  {
    status: 'Confirmed',
    desc: 'Appointment is confirmed.',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500 ring-4 ring-emerald-100',
  },
  {
    status: 'Checked In',
    desc: 'Pet has been checked in.',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    dotClass: 'bg-amber-500 ring-4 ring-amber-100',
  },
  {
    status: 'In Progress',
    desc: 'Grooming is in progress.',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    dotClass: 'bg-purple-500 ring-4 ring-purple-100',
  },
  {
    status: 'Completed',
    desc: 'Appointment is completed.',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
    dotClass: 'bg-teal-600 ring-4 ring-teal-100',
  },
  {
    status: 'Canceled',
    desc: 'Appointment was canceled.',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    dotClass: 'bg-rose-500 ring-4 ring-rose-100',
  },
  {
    status: 'No Show',
    desc: 'Customer did not show up.',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
    dotClass: 'bg-slate-600 ring-4 ring-slate-200',
  },
  {
    status: 'Waitlisted',
    desc: 'Pet is on the waitlist.',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
    dotClass: 'bg-orange-500 ring-4 ring-orange-100',
  },
];

export const StatusLegendModal: React.FC<StatusLegendModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
        {/* Header Section */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Appointment Status Legend
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Design specifications &amp; lifecycle state definitions for the All About the Dawg OS appointment schedule engine.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              System v2.4 Spec
            </span>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Status Grid Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {LEGEND_ITEMS.map((item) => (
            <div
              key={item.status}
              className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-3">
                <span className={`w-2.5 h-2.5 rounded-full ${item.dotClass}`} />
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${item.badgeClass}`}>
                  {item.status}
                </span>
              </div>
              <p className="text-xs text-slate-600 text-right">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Live Table Row Preview */}
        <div className="border-t border-slate-100 pt-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Live Table Appearance Example
            </h3>
            <span className="text-xs text-slate-400">Row Context: Appointments Table</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[11px] font-semibold text-slate-400 border-b border-slate-100 pb-2">
                  <th className="pb-2 font-medium">Date &amp; Time</th>
                  <th className="pb-2 font-medium">Customer / Pet</th>
                  <th className="pb-2 font-medium">Service</th>
                  <th className="pb-2 font-medium">Groomer</th>
                  <th className="pb-2 font-medium text-center">Status</th>
                  <th className="pb-2 font-medium text-right">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr>
                  <td className="py-3 text-slate-500">
                    <span className="font-semibold text-slate-800 block text-xs">May 16, 2025</span>
                    8:30 AM (2.5 hrs)
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-xs font-bold text-amber-700">SJ</span>
                      <div>
                        <span className="font-semibold text-slate-900 block leading-tight">Sarah Johnson</span>
                        <span className="text-[11px] text-slate-400">Buddy</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-slate-600 font-medium">Full Groom</td>
                  <td className="py-3 text-slate-600">Sarah M.</td>
                  <td className="py-3 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      Scheduled
                    </span>
                  </td>
                  <td className="py-3 text-right font-bold text-emerald-600">$25.00 <span className="text-[10px] text-slate-400 font-normal">Deposit</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <p className="text-[11px] text-slate-400">Dawg OS Design System • Component Spec</p>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
