'use client';

import React from 'react';
import { AppointmentItem } from '@/lib/types';
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
  Trash2,
  Zap,
  UserCheck 
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
      className="absolute top-8 right-2 w-56 bg-card rounded-2xl shadow-2xl border border-border py-2.5 z-40 divide-y divide-border font-sans animate-in fade-in zoom-in-95"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Top Sub-Tabs within dropdown matching Screen 2 / Image 2 */}
      <div className="px-2 pb-2">
        <div className="flex rounded-xl bg-muted/40 p-0.5 text-[11px] font-medium text-muted-foreground">
          <button
            type="button"
            onClick={() => setActiveSubTab('Details')}
            className={`flex-1 py-1 px-2 rounded-lg text-center font-semibold transition cursor-pointer ${
              activeSubTab === 'Details'
                ? 'bg-card text-foreground shadow-xs'
                : 'hover:text-foreground'
            }`}
          >
            Details
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('Columns')}
            className={`flex-1 py-1 px-2 rounded-lg text-center transition cursor-pointer ${
              activeSubTab === 'Columns'
                ? 'bg-card text-foreground shadow-xs font-semibold'
                : 'hover:text-foreground'
            }`}
          >
            Columns
          </button>
        </div>
      </div>

      {activeSubTab === 'Columns' ? (
        <div className="py-2 px-3 text-[11px] space-y-1.5 text-muted-foreground">
          <p className="font-semibold text-muted-foreground/70 uppercase text-[9px] tracking-wider mb-1">Visible Columns</p>
          {['Date & Time', 'Customer / Pet', 'Service', 'Groomer', 'Location', 'Status', 'Payment'].map((col) => (
            <label key={col} className="flex items-center gap-2 cursor-pointer hover:text-foreground">
              <input type="checkbox" defaultChecked className="rounded text-primary focus:ring-0" />
              <span>{col}</span>
            </label>
          ))}
        </div>
      ) : (
        /* Menu Group: Appointment Actions (16 items exact match to design spec) */
        <div className="py-1.5 text-[11px] max-h-80 overflow-y-auto custom-scrollbar">
          <p className="px-3 py-1 text-[9px] uppercase font-semibold tracking-wider text-muted-foreground/70">
            Appointment Actions
          </p>

          <button
            type="button"
            onClick={() => onAction('quick-actions', appointment)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-primary bg-primary/5/50 hover:bg-primary/5 font-semibold transition text-left cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span>Open Quick Actions</span>
          </button>

          <button
            type="button"
            onClick={() => onAction('convert-to-customer', appointment)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-foreground hover:bg-muted/40 hover:text-primary transition text-left cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5 text-success" />
            <span>Convert to Customer</span>
          </button>

          <button
            type="button"
            onClick={() => onAction('view-details', appointment)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-foreground hover:bg-muted/40 hover:text-primary transition text-left cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-muted-foreground/70" />
            <span>View Details</span>
          </button>

          <button
            type="button"
            onClick={() => onAction('edit', appointment)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-foreground hover:bg-muted/40 hover:text-primary transition text-left cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-muted-foreground/70" />
            <span>Edit Appointment</span>
          </button>

          <button
            type="button"
            onClick={() => onAction('reschedule', appointment)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-foreground hover:bg-muted/40 hover:text-primary transition text-left cursor-pointer"
          >
            <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground/70" />
            <span>Reschedule</span>
          </button>

          <button
            type="button"
            onClick={() => onAction('add-on', appointment)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-foreground hover:bg-muted/40 hover:text-primary transition text-left cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-muted-foreground/70" />
            <span>Add-on / Service Update</span>
          </button>

          <button
            type="button"
            onClick={() => onAction('check-in', appointment)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-foreground hover:bg-muted/40 hover:text-success transition text-left cursor-pointer"
          >
            <Check className="w-3.5 h-3.5 text-success font-semibold" />
            <span>Check In</span>
          </button>

          <button
            type="button"
            onClick={() => onAction('mark-in-progress', appointment)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-foreground hover:bg-muted/40 hover:text-primary transition text-left cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5 text-muted-foreground/70" />
            <span>Mark In Progress</span>
          </button>

          <button
            type="button"
            onClick={() => onAction('mark-complete', appointment)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-foreground hover:bg-muted/40 hover:text-primary transition text-left cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground/70" />
            <span>Mark Complete</span>
          </button>

          <button
            type="button"
            onClick={() => onAction('take-payment', appointment)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-foreground hover:bg-muted/40 hover:text-primary transition text-left cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5 text-muted-foreground/70" />
            <span>Take Payment</span>
          </button>

          <button
            type="button"
            onClick={() => onAction('send-message', appointment)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-foreground hover:bg-muted/40 hover:text-primary transition text-left cursor-pointer"
          >
            <Send className="w-3.5 h-3.5 text-muted-foreground/70" />
            <span>Send Message</span>
          </button>

          <button
            type="button"
            onClick={() => onAction('add-note', appointment)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-foreground hover:bg-muted/40 hover:text-primary transition text-left cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-muted-foreground/70" />
            <span>Add Note</span>
          </button>

          <button
            type="button"
            onClick={() => onAction('print-sheet', appointment)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-foreground hover:bg-muted/40 hover:text-primary transition text-left cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-muted-foreground/70" />
            <span>Print Checkout Sheet</span>
          </button>

          <button
            type="button"
            onClick={() => onAction('print-invoice', appointment)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-foreground hover:bg-muted/40 hover:text-primary transition text-left cursor-pointer"
          >
            <Receipt className="w-3.5 h-3.5 text-muted-foreground/70" />
            <span>Print Invoice</span>
          </button>

          <button
            type="button"
            onClick={() => onAction('duplicate', appointment)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-foreground hover:bg-muted/40 hover:text-primary transition text-left cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-muted-foreground/70" />
            <span>Duplicate</span>
          </button>

          <button
            type="button"
            onClick={() => onAction('cancel', appointment)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-destructive hover:bg-destructive/5 transition text-left cursor-pointer"
          >
            <XCircle className="w-3.5 h-3.5 text-destructive" />
            <span>Cancel Appointment</span>
          </button>

          <button
            type="button"
            onClick={() => onAction('no-show', appointment)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-foreground hover:bg-muted/40 hover:text-warning transition text-left cursor-pointer"
          >
            <UserMinus className="w-3.5 h-3.5 text-muted-foreground/70" />
            <span>No Show</span>
          </button>

          <button
            type="button"
            onClick={() => onAction('add-waitlist', appointment)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-foreground hover:bg-muted/40 hover:text-primary transition text-left cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5 text-muted-foreground/70" />
            <span>Add to Waitlist</span>
          </button>

          <button
            type="button"
            onClick={() => onAction('delete', appointment)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-destructive hover:bg-destructive/5 transition text-left cursor-pointer border-t border-border mt-1 pt-1.5"
          >
            <Trash2 className="w-3.5 h-3.5 text-destructive" />
            <span>Delete</span>
          </button>
        </div>
      )}
    </div>
  );
};
