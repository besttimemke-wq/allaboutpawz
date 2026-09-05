'use client'

import React, { useEffect, useRef } from 'react'
import {
  Lightning, X, CalendarPlus, PawPrint, CurrencyDollar, ChatCircleDots,
  FileText, FileLock, Clipboard, PencilSimple, Copy, XCircle, Checks,
  Bell, ArrowClockwise, Heartbeat, CheckCircle, PauseCircle, Phone,
  User, Receipt, ClockClockwise, Sliders, ArrowRight,
} from '@phosphor-icons/react'

// ============================================================================
// QuickActionsModal — universal quick action launcher.
// ----------------------------------------------------------------------------
// Used by: customer profile, appointment cards, admin surfaces, and any place
// that needs a consistent entry point to common operational actions.
//
// Action IDs are intentionally typed as a string union so callers can pass
// partial handlers (e.g. only wire 6 of the 27 actions today; the rest show
// a "coming soon" toast).
// ============================================================================

export type QuickActionId =
  // Section 1: Customer (6) — wired today
  | 'new_appointment' | 'add_pet' | 'take_payment' | 'send_message'
  | 'add_note' | 'update_documents'
  // Section 2: Appointment — wired next batch
  | 'add_to_waitlist' | 'reschedule' | 'duplicate' | 'cancel'
  | 'confirm_appointment' | 'send_reminder' | 'follow_up'
  // Section 2: Live Status Transitions (5) — wired next batch
  | 'status_check_in' | 'status_in_service' | 'status_complete'
  | 'status_hold' | 'status_no_show'
  // Section 3: Shared (8) — wired final batch
  | 'call_customer' | 'view_customer' | 'create_invoice'
  | 'issue_refund' | 'payment_history'

export interface QuickActionsModalProps {
  open: boolean
  onClose: () => void
  /**
   * Called when the user clicks any action button. The caller decides what to
   * do for each ID. Unwired actions should fall through to a "coming soon"
   * toast or no-op in the caller.
   */
  onAction: (id: QuickActionId) => void
  /**
   * Optional context filter — show only sections relevant to the current
   * surface. Defaults to all sections.
   */
  showSections?: ('customer' | 'appointment' | 'shared')[]
  /** Optional title override. Defaults to "Quick Actions". */
  title?: string
  /** Optional description override. */
  description?: string
}

// ---------------------------------------------------------------------------
// Action definitions — metadata drives the rendered cards.
// Each icon is the correct Phosphor equivalent of the Font Awesome icon from
// the original HTML design (fa-bolt → Lightning, fa-paw → PawPrint, etc).
// ---------------------------------------------------------------------------

type Variant = 'primary' | 'success' | 'danger' | 'info' | 'warning'

interface ActionDef {
  id: QuickActionId
  label: string
  description: string
  icon: React.ComponentType<{ size?: number; weight?: 'fill' | 'regular' | 'bold'; className?: string }>
  variant?: Variant
}

const VARIANT_STYLES: Record<Variant, { bg: string; text: string }> = {
  primary: { bg: 'bg-indigo-50', text: 'text-indigo-600' },
  success: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  danger: { bg: 'bg-rose-50', text: 'text-rose-600' },
  info: { bg: 'bg-blue-50', text: 'text-blue-600' },
  warning: { bg: 'bg-amber-50', text: 'text-amber-600' },
}

// Section 1 — Customer actions (6). Each icon is the Phosphor equivalent of
// the Font Awesome icon used in the original HTML design.
const CUSTOMER_ACTIONS: ActionDef[] = [
  // fa-calendar-plus
  { id: 'new_appointment', label: 'New Appointment', description: 'Create a new appointment for customer', icon: CalendarPlus },
  // fa-paw
  { id: 'add_pet', label: 'Add Pet', description: 'Register a new pet to profile', icon: PawPrint },
  // fa-dollar-sign (emerald variant in original)
  { id: 'take_payment', label: 'Take Payment', description: 'Charge or record payment', icon: CurrencyDollar, variant: 'success' },
  // fa-comment-dots
  { id: 'send_message', label: 'Send Message', description: 'SMS or email message', icon: ChatCircleDots },
  // fa-file-lines
  { id: 'add_note', label: 'Add Note', description: 'Internal or customer note', icon: FileText },
  // fa-file-shield
  { id: 'update_documents', label: 'Update Documents', description: 'Vaccines, waivers & forms', icon: FileLock },
]

// Section 2 — Appointment lifecycle actions (7). Phosphor equivalents of the
// Font Awesome icons used in the original HTML design.
const APPOINTMENT_ACTIONS: ActionDef[] = [
  // fa-clipboard
  { id: 'add_to_waitlist', label: 'Add to Waitlist', description: 'Queue customer for opening', icon: Clipboard },
  // fa-pen
  { id: 'reschedule', label: 'Reschedule', description: 'Change date or time', icon: PencilSimple },
  // fa-copy
  { id: 'duplicate', label: 'Duplicate', description: 'Clone appointment details', icon: Copy },
  // fa-circle-xmark (rose variant in original)
  { id: 'cancel', label: 'Cancel', description: 'Cancel scheduled appointment', icon: XCircle, variant: 'danger' },
  // fa-check-double (blue variant in original)
  { id: 'confirm_appointment', label: 'Confirm Appointment', description: 'Mark appointment confirmed', icon: Checks, variant: 'info' },
  // fa-bell
  { id: 'send_reminder', label: 'Send Reminder', description: 'Trigger SMS/email reminder', icon: Bell },
  // fa-rotate-right
  { id: 'follow_up', label: 'Follow Up', description: 'Log post-groom follow up', icon: ArrowClockwise },
]

// Section 2 — Live status transitions (5). Each maps to the original HTML's
// colored pill (emerald/indigo/blue/amber/rose).
const STATUS_TRANSITIONS: ActionDef[] = [
  // fa-circle-check (emerald)
  { id: 'status_check_in', label: 'Check In', description: 'Arrived', icon: CheckCircle, variant: 'success' },
  // fa-heart-pulse (indigo)
  { id: 'status_in_service', label: 'In Service', description: 'Grooming', icon: Heartbeat, variant: 'primary' },
  // fa-circle-check (blue)
  { id: 'status_complete', label: 'Complete', description: 'Ready', icon: CheckCircle, variant: 'info' },
  // fa-circle-pause (amber)
  { id: 'status_hold', label: 'Hold', description: 'Paused', icon: PauseCircle, variant: 'warning' },
  // fa-circle-xmark (rose)
  { id: 'status_no_show', label: 'No Show', description: 'Missed', icon: XCircle, variant: 'danger' },
]

// Section 3 — Shared actions (8). Phosphor equivalents of the Font Awesome
// icons used in the original HTML design.
const SHARED_ACTIONS: ActionDef[] = [
  // fa-comment-dots
  { id: 'send_message', label: 'Send Message', description: 'Chat, SMS, or email', icon: ChatCircleDots },
  // fa-phone
  { id: 'call_customer', label: 'Call Customer', description: 'Direct voice call link', icon: Phone },
  // fa-file-lines
  { id: 'add_note', label: 'Add Note', description: 'Activity & record note', icon: FileText },
  // fa-user
  { id: 'view_customer', label: 'View Customer', description: 'Open full client profile', icon: User },
  // fa-dollar-sign (emerald variant)
  { id: 'take_payment', label: 'Take Payment', description: 'Terminal or card on file', icon: CurrencyDollar, variant: 'success' },
  // fa-file-invoice
  { id: 'create_invoice', label: 'Create Invoice', description: 'Generate billing invoice', icon: Receipt },
  // fa-receipt
  { id: 'issue_refund', label: 'Issue Refund', description: 'Process customer refund', icon: Receipt },
  // fa-clock-rotate-left
  { id: 'payment_history', label: 'Payment History', description: 'View ledger & receipts', icon: ClockClockwise },
]

// ---------------------------------------------------------------------------
// Small presentational helpers — each one renders a different card layout
// matching the original HTML's three card variants (customer grid card,
// appointment grid card, status transition pill).
// ---------------------------------------------------------------------------

function SectionHeader({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="mb-2.5 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="inline-block h-3.5 w-1.5 rounded-full bg-indigo-600" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">{title}</h3>
      </div>
      <span className="text-[11px] font-medium text-slate-400">{hint}</span>
    </div>
  )
}

/** Customer-section card: horizontal layout with 32px icon, label, description, trailing arrow. */
function CustomerActionCard({ a, onClick }: { a: ActionDef; onClick: () => void }) {
  const v = a.variant || 'primary'
  const vs = VARIANT_STYLES[v]
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition-all duration-150 hover:border-indigo-400 hover:shadow-sm"
    >
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs transition-transform group-hover:scale-105 ${vs.bg} ${vs.text}`}>
        <a.icon size={16} weight="regular" />
      </div>
      <div className="min-w-0 flex-1">
        <span className="block truncate text-xs font-semibold leading-tight text-slate-800">{a.label}</span>
        <span className="mt-0.5 block truncate text-[10px] leading-tight text-slate-500">{a.description}</span>
      </div>
      <ArrowRight size={10} weight="bold" className="mt-1 text-indigo-400 transition-all group-hover:translate-x-0.5 group-hover:text-indigo-600" />
    </button>
  )
}

/** Appointment-section card: vertical layout with 28px icon top-right, label + description bottom. */
function GridActionCard({ a, onClick }: { a: ActionDef; onClick: () => void }) {
  const v = a.variant || 'primary'
  const vs = VARIANT_STYLES[v]
  const borderHover = v === 'danger' ? 'hover:border-rose-400' : 'hover:border-indigo-400'
  const arrowColor = v === 'danger' ? 'text-rose-400 group-hover:text-rose-600' : 'text-indigo-400 group-hover:text-indigo-600'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex h-[96px] flex-col justify-between rounded-xl border border-slate-200 bg-white p-2.5 text-left transition-all duration-150 hover:shadow-sm ${borderHover}`}
    >
      <div className="flex w-full items-center justify-between">
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs transition-transform group-hover:scale-105 ${vs.bg} ${vs.text}`}>
          <a.icon size={14} weight="regular" />
        </div>
        <ArrowRight size={10} weight="bold" className={`transition-all group-hover:translate-x-0.5 ${arrowColor}`} />
      </div>
      <div>
        <span className="block truncate text-xs font-semibold leading-tight text-slate-800">{a.label}</span>
        <span className="mt-0.5 block truncate text-[9.5px] leading-snug text-slate-400">{a.description}</span>
      </div>
    </button>
  )
}

/** Status-transition pill: colored background, icon + label inline. */
function StatusTransitionPill({ a, onClick }: { a: ActionDef; onClick: () => void }) {
  const v = a.variant || 'primary'
  const vs = VARIANT_STYLES[v]
  const baseBg: Record<Variant, string> = {
    success: 'bg-emerald-50/50 border-emerald-200/80 hover:border-emerald-400 hover:bg-emerald-50',
    primary: 'bg-indigo-50/50 border-indigo-200/80 hover:border-indigo-400 hover:bg-indigo-50',
    info: 'bg-blue-50/50 border-blue-200/80 hover:border-blue-400 hover:bg-blue-50',
    warning: 'bg-amber-50/50 border-amber-200/80 hover:border-amber-400 hover:bg-amber-50',
    danger: 'bg-rose-50/50 border-rose-200/80 hover:border-rose-400 hover:bg-rose-50',
  }
  const labelColor: Record<Variant, string> = {
    success: 'text-emerald-900',
    primary: 'text-indigo-900',
    info: 'text-blue-900',
    warning: 'text-amber-900',
    danger: 'text-rose-900',
  }
  const subColor: Record<Variant, string> = {
    success: 'text-emerald-700/80',
    primary: 'text-indigo-700/80',
    info: 'text-blue-700/80',
    warning: 'text-amber-700/80',
    danger: 'text-rose-700/80',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex items-center gap-2 rounded-lg border p-2 text-left transition-all hover:shadow-sm ${baseBg[v]}`}
    >
      <span className={`shrink-0 text-sm ${vs.text}`}>
        <a.icon size={14} weight="regular" />
      </span>
      <div className="overflow-hidden">
        <span className={`block truncate text-xs font-semibold ${labelColor[v]}`}>{a.label}</span>
        <span className={`block truncate text-[9px] ${subColor[v]}`}>{a.description}</span>
      </div>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Main modal component
// ---------------------------------------------------------------------------

export function QuickActionsModal({
  open,
  onClose,
  onAction,
  showSections = ['customer', 'appointment', 'shared'],
  title = 'Quick Actions',
  description = 'Choose an action to perform or customize your quick action workflows.',
}: QuickActionsModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  // Escape key closes; lock body scroll while modal is open.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  const showCustomer = showSections.includes('customer')
  const showAppointment = showSections.includes('appointment')
  const showShared = showSections.includes('shared')

  return (
    <div
      className="fixed inset-0 z-50 flex w-full items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm sm:p-6"
      data-purpose="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-actions-title"
        aria-describedby="quick-actions-description"
        className="flex max-h-[90vh] w-full max-w-[780px] flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <header className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-6 py-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600 shadow-sm">
              <Lightning size={18} weight="fill" />
            </div>
            <div>
              <h2 id="quick-actions-title" className="text-lg font-bold leading-tight text-slate-900">
                {title}
              </h2>
              <p id="quick-actions-description" className="mt-0.5 text-xs text-slate-500">
                {description}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={20} weight="bold" />
          </button>
        </header>

        {/* Modal Body */}
        <div className="max-h-[calc(90vh-130px)] space-y-6 overflow-y-auto bg-slate-50/30 px-6 py-5">
          {/* Section 1: Customer Actions */}
          {showCustomer && (
            <div data-purpose="action-group-customer">
              <SectionHeader title="Customer" hint="Client & Pet Management" />
              <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-3">
                {CUSTOMER_ACTIONS.map((a) => (
                  <CustomerActionCard key={a.id} a={a} onClick={() => onAction(a.id)} />
                ))}
              </div>
            </div>
          )}

          {/* Section 2: Appointment Actions */}
          {showAppointment && (
            <div className="space-y-3" data-purpose="action-group-appointment">
              <SectionHeader title="Appointment" hint="Scheduling & Status Controls" />

              {/* Sub-group A: Scheduling & Lifecycle */}
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {APPOINTMENT_ACTIONS.map((a) => (
                  <GridActionCard key={a.id} a={a} onClick={() => onAction(a.id)} />
                ))}
              </div>

              {/* Sub-group B: Live Status Transitions */}
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                  <Sliders size={10} weight="fill" className="text-indigo-500" />
                  <span>Live Status Transitions:</span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {STATUS_TRANSITIONS.map((a) => (
                    <StatusTransitionPill key={a.id} a={a} onClick={() => onAction(a.id)} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Shared Actions */}
          {showShared && (
            <div data-purpose="action-group-shared">
              <SectionHeader title="Shared" hint="Operations, Comms & Billing" />
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {SHARED_ACTIONS.map((a) => (
                  <GridActionCard key={`${a.id}-shared`} a={a} onClick={() => onAction(a.id)} />
                ))}
              </div>
            </div>
          )}

          {/* Section 4: Add Quick Action */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => onAction('add_quick_action' as QuickActionId)}
              className="group flex w-full items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 px-4 py-3 text-center transition-all hover:border-indigo-400 hover:bg-indigo-50/80"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white transition-transform group-hover:scale-110">
                +
              </div>
              <div className="text-left">
                <span className="block text-xs font-bold leading-tight text-indigo-700">Add Quick Action</span>
                <span className="block text-[10px] leading-tight text-indigo-500">
                  Customize or add a new shortcut to your workflow
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <footer className="flex justify-end border-t border-slate-100 bg-white p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-6 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
          >
            Close
          </button>
        </footer>
      </section>
    </div>
  )
}

export default QuickActionsModal
