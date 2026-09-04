'use client';

import React from 'react';
import { 
  Eye, 
  Edit3, 
  Calendar, 
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
  Trash2,
  Info
} from 'lucide-react';

interface ActionsReferenceGuideModalProps {
  onClose: () => void;
}

export const ActionsReferenceGuideModal: React.FC<ActionsReferenceGuideModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#f8f9ff] rounded-3xl max-w-6xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-indigo-600">Appointments</span>
                <span className="text-slate-300">/</span>
                <span className="text-xs font-medium text-slate-500">Cheat Sheet &amp; Documentation</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
                About Appointment Actions
              </h2>
              <p className="text-xs text-slate-500">Overview of all 16 context actions available for managing appointments.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
              16 Context Actions
            </span>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 4-Column Action Grid matching Screen 10 / Row 4 */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-2xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {/* Column 1 */}
          <div className="space-y-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <Eye className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-slate-900 leading-tight">View Details</h3>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">View full appointment details.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <Edit3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-slate-900 leading-tight">Edit Appointment</h3>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">Update appointment information.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-slate-900 leading-tight">Reschedule</h3>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">Change date and/or time.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-slate-900 leading-tight">Add-on / Service Update</h3>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">Add or modify grooming services and extras.</p>
              </div>
            </div>
          </div>

          {/* Column 2 */}
          <div className="space-y-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 text-emerald-500 font-bold" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-slate-900 leading-tight">Check In</h3>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">Check in the pet for appointment.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-slate-900 leading-tight">Mark In Progress</h3>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">Mark grooming as in progress.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-slate-900 leading-tight">Mark Complete</h3>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">Mark appointment as completed.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-slate-900 leading-tight">Take Payment</h3>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">Collect payment or process deposit.</p>
              </div>
            </div>
          </div>

          {/* Column 3 */}
          <div className="space-y-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <Send className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-slate-900 leading-tight">Send Message</h3>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">Send SMS or email update to customer.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-slate-900 leading-tight">Add Note</h3>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">Add internal or customer-visible note.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <Printer className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-slate-900 leading-tight">Print Checkout Sheet</h3>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">Print grooming checklist.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-slate-900 leading-tight">Print Invoice</h3>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">Print or email invoice.</p>
              </div>
            </div>
          </div>

          {/* Column 4 */}
          <div className="space-y-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <Copy className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-slate-900 leading-tight">Duplicate</h3>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">Copy this appointment.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                <XCircle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-rose-600 leading-tight">Cancel Appointment</h3>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">Cancel appointment with optional reason.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <UserMinus className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-amber-700 leading-tight">No Show</h3>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">Mark as no show.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-rose-600 leading-tight">Delete</h3>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">Permanently delete appointment.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Note */}
        <div className="bg-white rounded-2xl border border-slate-200/80 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>Actions can be triggered from the three-dot <strong className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">···</strong> menu on any row in the appointment list.</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
