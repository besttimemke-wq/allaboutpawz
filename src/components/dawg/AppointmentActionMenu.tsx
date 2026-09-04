'use client';

import React from 'react';
import { AppointmentItem } from '@/lib/dawg-types';
import { 
  Eye, 
  Edit3, 
  Calendar as CalendarIcon, 
  Sparkles, 
  Check, 
  Clock, 
  CheckCircle2, 
  CreditCard, 
  Send, 
  FileText, 
  Printer, 
  Receipt, 
  Copy, 
  XCircle, 
  UserMinus, 
  UserPlus, 
  Trash2 
} from 'lucide-react';

interface AppointmentActionMenuProps {
  appointment: AppointmentItem;
  onClose: () => void;
  onAction: (actionKey: string, appointment: AppointmentItem) => void;
}

export const AppointmentActionMenu: React.FC<AppointmentActionMenuProps> = ({
  appointment,
  onClose,
  onAction,
}) => {
  const [activeSubTab, setActiveSubTab] = React.useState<'Details' | 'Columns'>('Details');

  return (
    <div 
      className="absolute top-8 right-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2.5 z-40 divide-y divide-slate-100 font-sans animate-in fade-in zoom-in-95"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Top Sub-Tabs within dropdown matching Screen 2 / Image 2 */}
      <div className="px-2 pb-2">
        <div className="flex rounded-xl bg-slate-100 p-0.5 text-[11px] font-medium text-slate-500">
          <button
            type="button"
            onClick={() => setActiveSubTab('Details')}
            className={`flex-1 py-1 px-2 rounded-lg text-center font-semibold transition cursor-pointer ${
              activeSubTab === 'Details'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'hover:text-slate-800'
            }`}
          >
            Details
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('Columns')}
            className={`flex-1 py-1 px-2 rounded-lg text-center transition cursor-pointer ${
              activeSubTab === 'Columns'
                ? 'bg-white text-slate-800 shadow-xs font-semibold'
                : 'hover:text-slate-800'
            }`}
          >
            Columns
          </button>
        </div>
      </div>

      {activeSubTab === 'Columns' ? (
        <div className="py-2 px-3 text-[11px] space-y-1.5 text-slate-600">
          <p className="font-bold text-slate-400 uppercase text-[9px] tracking-wider mb-1">Visible Columns</p>
          {['Date & Time', 'Customer / Pet', 'Service', 'Groomer', 'Location', 'Status', 'Payment'].map((col) => (
            <label key={col} className="flex items-center gap-2 cursor-pointer hover:text-slate-900">
              <input type="checkbox" defaultChecked className="rounded text-indigo-600 focus:ring-0" />
              <span>{col}</span>
            </label>
          ))}
        </div>
      ) : (
        /* Menu Group: Appointment Actions (16 items exact match to design spec) */
        <div className="py-1.5 text-[11px] max-h-80 overflow-y-auto custom-scrollbar">
          <p className="px-3 py-1 text-[9px] uppercase font-bold tracking-wider text-slate-400">
            Appointment Actions
          </p>

          <button
            type="button"
            onClick={() => onAction('view-details', appointment)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition text-left cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-slate-400" />
            <span>View Details</span>
          </button>

          <button
            type="button"
            onClick={() => onAction('edit', appointment)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition text-left cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-400" />
            <span>Edit Appointment</span>
          </button>

          <button
            type="button"
            onClick={() => onAction('reschedule', appointment)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition text-left cursor-pointer"
          >
            <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
            <span>Reschedule</span>
          </button>

          <button
            type="button"
            onClick={() => onAction('add-on', appointment)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition text-left cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-400" />
            <span>Add-on / Service Update</span>
          </button>

          <button
            type="button"
            onClick={() => onAction('check-in', appointment)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-slate-700 hover:bg-slate-50 hover:text-emerald-600 transition text-left cursor-pointer"
          >
            <Check className="w-3.5 h-3.5 text-emerald-500 font-bold" />
            <span>Check In</span>
          </button>

          <button
            type="button"
            onClick={() => onAction('mark-in-progress', appointment)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition text-left cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Mark In Progress</span>
          </button>

          <button
            type="button"
            onClick={() => onAction('mark-complete', appointment)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition text-left cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Mark Complete</span>
          </button>

          <button
            type="button"
            onClick={() => onAction('take-payment', appointment)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition text-left cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5 text-slate-400" />
            <span>Take Payment</span>
          </button>

          <button
            type="button"
            onClick={() => onAction('send-message', appointment)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition text-left cursor-pointer"
          >
            <Send className="w-3.5 h-3.5 text-slate-400" />
            <span>Send Message</span>
          </button>

          <button
            type="button"
            onClick={() => onAction('add-note', appointment)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition text-left cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>Add Note</span>
          </button>

          <button
            type="button"
            onClick={() => onAction('print-sheet', appointment)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition text-left cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span>Print Checkout Sheet</span>
          </button>

          <button
            type="button"
            onClick={() => onAction('print-invoice', appointment)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition text-left cursor-pointer"
          >
            <Receipt className="w-3.5 h-3.5 text-slate-400" />
            <span>Print Invoice</span>
          </button>

          <button
            type="button"
            onClick={() => onAction('duplicate', appointment)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition text-left cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-slate-400" />
            <span>Duplicate</span>
          </button>

          <button
            type="button"
            onClick={() => onAction('cancel', appointment)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-rose-600 hover:bg-rose-50 transition text-left cursor-pointer"
          >
            <XCircle className="w-3.5 h-3.5 text-rose-500" />
            <span>Cancel Appointment</span>
          </button>

          <button
            type="button"
            onClick={() => onAction('no-show', appointment)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-slate-700 hover:bg-slate-50 hover:text-amber-700 transition text-left cursor-pointer"
          >
            <UserMinus className="w-3.5 h-3.5 text-slate-400" />
            <span>No Show</span>
          </button>

          <button
            type="button"
            onClick={() => onAction('add-waitlist', appointment)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition text-left cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5 text-slate-400" />
            <span>Add to Waitlist</span>
          </button>

          <button
            type="button"
            onClick={() => onAction('delete', appointment)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-rose-600 hover:bg-rose-50 transition text-left cursor-pointer border-t border-slate-100 mt-1 pt-1.5"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            <span>Delete</span>
          </button>
        </div>
      )}
    </div>
  );
};
