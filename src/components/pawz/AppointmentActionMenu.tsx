'use client';

import React from 'react';
import { AppointmentItem } from '@/lib/types';
import {
  Eye, Edit3, Sparkles, Check, Clock,
  CheckCircle2, CreditCard, Send, FileText, Printer, Copy,
  XCircle, UserMinus, Trash2, CheckCheck, X
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
  const fire = (key: string) => {
    onAction(key, appointment);
    onClose();
  };

  const sections = [
    {
      label: 'Status',
      items: [
        { key: 'confirm', label: 'Confirm', icon: Check, color: 'text-primary' },
        { key: 'check-in', label: 'Check In', icon: Clock, color: 'text-primary' },
        { key: 'mark-in-progress', label: 'Start Service', icon: CheckCircle2, color: 'text-primary' },
        { key: 'mark-complete', label: 'Complete', icon: CheckCheck, color: 'text-success' },
        { key: 'no-show', label: 'No Show', icon: UserMinus, color: 'text-warning' },
      ],
    },
    {
      label: 'Edit',
      items: [
        { key: 'view-details', label: 'View Customer Profile', icon: Eye, color: 'text-foreground' },
        { key: 'edit', label: 'Edit Details & Reschedule', icon: Edit3, color: 'text-foreground' },
        { key: 'add-on', label: 'Add / Edit Add-ons', icon: Sparkles, color: 'text-foreground' },
        { key: 'duplicate', label: 'Duplicate', icon: Copy, color: 'text-foreground' },
      ],
    },
    {
      label: 'Billing & Comms',
      items: [
        { key: 'take-payment', label: 'Charge Payment', icon: CreditCard, color: 'text-foreground' },
        { key: 'send-message', label: 'Send Message', icon: Send, color: 'text-foreground' },
        { key: 'add-note', label: 'Add Note', icon: FileText, color: 'text-foreground' },
        { key: 'print-sheet', label: 'Print Receipt', icon: Printer, color: 'text-foreground' },
      ],
    },
    {
      label: 'Danger',
      items: [
        { key: 'cancel', label: 'Cancel Appointment', icon: XCircle, color: 'text-destructive' },
        { key: 'delete', label: 'Delete Permanently', icon: Trash2, color: 'text-destructive' },
      ],
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-[2px] animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 z-[71] h-full w-[340px] bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-10 rounded-xl text-2xl flex items-center justify-center bg-primary/5 border border-primary/15 shrink-0">
              {appointment.petEmoji || '🐕'}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground text-[14px] truncate">{appointment.petName}</h3>
              <p className="text-[11px] text-muted-foreground truncate">
                {appointment.customerName} · {appointment.serviceName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer shrink-0"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Status badge */}
        <div className="px-4 py-2 border-b border-border bg-background">
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-muted-foreground">Status:</span>
            <span className="font-semibold text-primary px-2 py-0.5 rounded-full bg-primary/5 border border-primary/20">
              {appointment.status}
            </span>
            <span className="text-muted-foreground ml-2">{appointment.date} · {appointment.time}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {sections.map((section) => (
            <div key={section.label}>
              <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                {section.label}
              </p>
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    onClick={() => fire(item.key)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium hover:bg-muted transition-colors cursor-pointer ${item.color}`}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
              <div className="h-px bg-border/50 my-1" />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border bg-muted/20">
          <p className="text-[10px] text-muted-foreground text-center">
            Appointment ID: {appointment.id?.slice(0, 8) || '—'}
          </p>
        </div>
      </div>
    </>
  );
};
