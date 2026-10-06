'use client';

// ============================================================================
// Customer Portal — My Appointments.
//
// The page where a pet parent controls their own destiny: pay a pending
// booking (or the remaining balance), reschedule onto any open slot, cancel
// honestly, and finish the pre-visit questionnaire — all against the REAL
// signals from /api/customer/appointments (pending / booked / paid /
// abandoned / cancelled / completed). Auth gating lives in the layout; if the
// session expired mid-visit the API 401s and we surface a sign-in card.
//
// Design: salon tokens — cream surfaces, ink text, gold accents, white cards
// with border-ink/10. Playfair headings via inline var(--font-display) (the
// .pawz-theme scope forces Hanken on h1–h5, so the utility class alone is
// not enough inside the portal).
// ============================================================================

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Loader2,
  PawPrint,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';

// ---------------------------------------------------------------------------
// Types — the API contract from Task 35-a
// ---------------------------------------------------------------------------
type BookingSignal =
  | 'pending'
  | 'booked'
  | 'paid'
  | 'abandoned'
  | 'cancelled'
  | 'completed';

interface Booking {
  id: string;
  signal: BookingSignal;
  signalLabel: string;
  paymentStatus: string;
  payMode: 'FULL' | 'DEPOSIT' | null;
  date: string;
  time: string;
  dogName: string;
  breed: string | null;
  service: string;
  items: { name: string; qty: number }[];
  subtotal: string | null;
  tax: string | null;
  total: string | null;
  paid: string | null;
  paidCents: number;
  balanceDue: string | null;
  amountDueCents: number;
  depositCents: number;
  notes: string;
  questionnaireComplete: boolean;
  createdAt: string;
}

interface Registry {
  customer: { name: string; email: string; phone: string; status: string | null };
  upcoming: Booking[];
  past: Booking[];
  counts: {
    pending: number;
    booked: number;
    paid: number;
    abandoned: number;
    cancelled: number;
    completed: number;
  };
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
const displayFont = { fontFamily: 'var(--font-display)' } as const;

const parseDate = (iso: string): Date | null => {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};

const prettyDate = (iso: string): string => {
  const d = parseDate(iso);
  return d
    ? d.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : iso;
};

const prettyDateShort = (iso: string): string => {
  const d = parseDate(iso);
  return d
    ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : iso;
};

const fmtCents = (cents: number): string => `$${(cents / 100).toFixed(2)}`;

const isMonday = (d: Date) => d.getDay() === 1;

const SIGNAL_TONE: Record<BookingSignal, string> = {
  pending: 'bg-gold-light text-gold-deep border-gold/50',
  booked: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold',
  abandoned: 'bg-muted text-muted-foreground border-border',
  cancelled: 'bg-muted text-muted-foreground border-border',
  completed: 'bg-ink text-white border-ink',
};

function SignalBadge({ booking }: { booking: Booking }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide',
        SIGNAL_TONE[booking.signal] ?? SIGNAL_TONE.cancelled,
      )}
    >
      {booking.signalLabel}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function CustomerAppointmentsPage() {
  const [data, setData] = useState<Registry | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [justPaid, setJustPaid] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch('/api/customer/appointments')
      .then(async (r) => {
        if (r.status === 401) {
          setUnauthorized(true);
          setData(null);
          return null;
        }
        if (!r.ok) {
          setPageError('Could not load your appointments right now.');
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (!d) return;
        setData(d as Registry);
        setPageError(null);
      })
      .catch(() => setPageError('Could not load your appointments right now.'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // One-shot: returning from Stripe (?paid=1) → friendly confirmation banner.
  // The URL is cleaned so a refresh doesn't re-show it.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('paid') !== '1') return;
    window.history.replaceState(null, '', '/customer/appointments');
    setJustPaid(true);
  }, []);

  const loading = !data && !unauthorized && !pageError;

  // ---- Modal targets -------------------------------------------------------
  const [rescheduleFor, setRescheduleFor] = useState<Booking | null>(null);
  const [cancelFor, setCancelFor] = useState<Booking | null>(null);
  const [questionnaireFor, setQuestionnaireFor] = useState<Booking | null>(null);

  // ---- Reschedule modal state (reset in the OPEN handler — never in an effect body) ----
  const [rDate, setRDate] = useState('');
  const [rTime, setRTime] = useState('');
  const [rTimes, setRTimes] = useState<string[]>([]);
  const [rResolved, setRResolved] = useState('');
  const [rSubmitting, setRSubmitting] = useState(false);
  const [rError, setRError] = useState<string | null>(null);

  // Availability for the picked day — setState only inside .then (React 19 rule).
  useEffect(() => {
    if (!rDate) return;
    let alive = true;
    fetch(`/api/availability?date=${rDate}&duration=120`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive) return;
        setRTimes(Array.isArray(d?.times) ? d.times : []);
        setRResolved(rDate);
        setRTime('');
      })
      .catch(() => {
        if (alive) {
          setRTimes([]);
          setRResolved(rDate);
        }
      });
    return () => {
      alive = false;
    };
  }, [rDate]);

  const rLoadingTimes = !!rDate && rDate !== rResolved;
  const rMorning = useMemo(() => rTimes.filter((t) => /AM$/i.test(t)), [rTimes]);
  const rAfternoon = useMemo(() => rTimes.filter((t) => /PM$/i.test(t)), [rTimes]);
  const rNoTimes = !!rDate && rDate === rResolved && rTimes.length === 0;
  const rSelected = rDate ? (parseDate(rDate) ?? undefined) : undefined;

  const openReschedule = (b: Booking) => {
    setRescheduleFor(b);
    setRDate('');
    setRTime('');
    setRTimes([]);
    setRResolved('');
    setRError(null);
  };

  const submitReschedule = async () => {
    if (!rescheduleFor || !rDate || !rTime) return;
    setRSubmitting(true);
    setRError(null);
    try {
      const res = await fetch('/api/customer/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reschedule',
          bookingId: rescheduleFor.id,
          date: rDate,
          time: rTime,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRError(d?.error || 'That time was just taken — pick another slot.');
        return;
      }
      setRescheduleFor(null);
      load();
    } catch {
      setRError('Network problem — please try again.');
    } finally {
      setRSubmitting(false);
    }
  };

  // ---- Cancel modal state --------------------------------------------------
  const [cSubmitting, setCSubmitting] = useState(false);
  const [cError, setCError] = useState<string | null>(null);

  const openCancel = (b: Booking) => {
    setCancelFor(b);
    setCError(null);
  };

  const submitCancel = async () => {
    if (!cancelFor) return;
    setCSubmitting(true);
    setCError(null);
    try {
      const res = await fetch('/api/customer/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', bookingId: cancelFor.id }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCError(d?.error || 'Could not cancel — please try again.');
        return;
      }
      setCancelFor(null);
      load();
    } catch {
      setCError('Network problem — please try again.');
    } finally {
      setCSubmitting(false);
    }
  };

  // ---- Payment (Stripe hosted checkout) ------------------------------------
  const pay = async (b: Booking) => {
    setPayingId(b.id);
    setPayError(null);
    try {
      const res = await fetch('/api/customer/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pay', bookingId: b.id }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPayError(d?.error || 'Checkout could not start — please try again.');
        return;
      }
      if (d?.url) {
        window.location.href = String(d.url);
        return;
      }
      setPayError('Checkout could not start — please try again.');
    } catch {
      setPayError('Network problem — please try again.');
    } finally {
      setPayingId(null);
    }
  };

  // ---- Questionnaire saved --------------------------------------------------
  const onQuestionnaireSaved = () => {
    setQuestionnaireFor(null);
    load();
  };

  // ---------------------------------------------------------------------------
  // 401 — session expired mid-visit (the layout gate normally handles this)
  // ---------------------------------------------------------------------------
  if (unauthorized) {
    return (
      <div className="mx-auto w-full max-w-2xl p-6 md:p-8">
        <div className="rounded-xl border border-ink/10 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-cream">
            <PawPrint className="size-7 text-gold-deep" />
          </div>
          <h1 style={displayFont} className="mt-4 text-[24px] text-ink">
            Sign in to see your appointments
          </h1>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-soft">
            Your session has expired. Sign in again to reschedule, pay, or manage
            your pup&apos;s visits.
          </p>
          <Button
            asChild
            className="mt-5 h-10 rounded-lg bg-ink px-5 text-[12px] font-bold uppercase tracking-[0.12em] text-white hover:bg-ink-soft"
          >
            <Link href="/access-customer">Sign in</Link>
          </Button>
        </div>
      </div>
    );
  }

  const upcoming = data?.upcoming ?? [];
  const past = data?.past ?? [];
  const counts = data?.counts;

  const chips: { label: string; count: number }[] = counts
    ? [
        { label: 'Upcoming', count: upcoming.length },
        { label: 'Pending payment', count: counts.pending },
        { label: 'Booked', count: counts.booked },
        { label: 'Paid in full', count: counts.paid },
      ].filter((c) => c.count > 0)
    : [];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6 md:p-8">
      {/* Page header */}
      <div>
        <h1 style={displayFont} className="text-[28px] leading-tight text-ink">
          My Appointments
        </h1>
        <p className="mt-1 text-[13.5px] text-ink-soft">
          Your visits, your control — reschedule, pay, or cancel any time.
        </p>
      </div>

      {/* Stripe return banner */}
      {justPaid && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-4.5 shrink-0 text-emerald-600" />
            <p className="text-[13px] leading-relaxed text-emerald-800">
              Thank you! Your payment is being confirmed — this list updates the
              moment it clears.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setJustPaid(false)}
            aria-label="Dismiss"
            className="text-emerald-700/70 transition-colors hover:text-emerald-800"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Payment error banner (inline — no toaster is wired in this layout) */}
      {payError && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-4.5 shrink-0 text-red-600" />
            <p className="text-[13px] leading-relaxed text-red-800">{payError}</p>
          </div>
          <button
            type="button"
            onClick={() => setPayError(null)}
            aria-label="Dismiss"
            className="text-red-700/70 transition-colors hover:text-red-800"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-56 rounded-full" />
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-44 rounded-xl" />
        </div>
      ) : pageError ? (
        <div className="rounded-xl border border-ink/10 bg-white p-6 text-center shadow-sm">
          <AlertTriangle className="mx-auto size-7 text-gold-deep" />
          <p className="mt-3 text-[14px] font-medium text-ink">{pageError}</p>
          <Button
            variant="outline"
            onClick={() => {
              setPageError(null);
              load();
            }}
            className="mt-4 h-10 rounded-lg border-ink/20 text-[12px] font-semibold text-ink"
          >
            Try again
          </Button>
        </div>
      ) : (
        <>
          {/* Signal summary strip */}
          {chips.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {chips.map((c) => (
                <div
                  key={c.label}
                  className="flex items-center gap-2 rounded-full border border-ink/10 bg-cream px-3.5 py-1.5"
                >
                  <span className="text-[16px] font-bold leading-none text-gold-deep tabular-nums">
                    {c.count}
                  </span>
                  <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-soft">
                    {c.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* ------------------------- Upcoming ------------------------- */}
          <section aria-labelledby="upcoming-heading" className="space-y-4">
            <h2
              id="upcoming-heading"
              style={displayFont}
              className="text-[20px] text-ink"
            >
              Upcoming
            </h2>

            {upcoming.length === 0 ? (
              <div className="rounded-xl border border-ink/10 bg-white p-10 text-center shadow-sm">
                <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-cream">
                  <PawPrint className="size-7 text-gold-deep" />
                </div>
                <h3 style={displayFont} className="mt-4 text-[20px] text-ink">
                  No appointments yet — your pup deserves this.
                </h3>
                <p className="mx-auto mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-ink-soft">
                  Book a groom in under two minutes — pick a package, a day, and
                  pay just a deposit to hold the slot.
                </p>
                <Button
                  asChild
                  className="mt-5 h-11 rounded-lg bg-ink px-6 text-[12px] font-bold uppercase tracking-[0.12em] text-white hover:bg-ink-soft"
                >
                  <Link href="/book/appointment">Book an appointment</Link>
                </Button>
              </div>
            ) : (
              upcoming.map((b) => {
                const d = parseDate(b.date);
                const dayNum = d ? String(d.getDate()) : '—';
                const month = d
                  ? d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
                  : '';
                // Balance shown is DERIVED from the authoritative cents
                // (total − paid) so it always agrees with the Pay button;
                // the legacy balanceDue string column can go stale.
                const balance =
                  b.signal === 'booked' && b.amountDueCents > 0
                    ? fmtCents(b.amountDueCents)
                    : null;
                const canAct = b.signal === 'pending' || b.signal === 'booked';
                // What the pay action actually charges right now (mirrors the
                // server's payableCents): pending+FULL → the total, any other
                // pending → the deposit, booked → the remaining balance.
                const payAmountCents =
                  b.signal === 'pending'
                    ? b.payMode === 'FULL'
                      ? b.amountDueCents
                      : b.depositCents
                    : b.amountDueCents;

                return (
                  <article
                    key={b.id}
                    className="overflow-hidden rounded-xl border border-ink/10 bg-white shadow-sm"
                  >
                    <div className="flex flex-col sm:flex-row">
                      {/* Date block */}
                      <div className="flex shrink-0 items-center justify-center gap-2 border-b border-ink/10 bg-cream px-4 py-3 sm:w-[96px] sm:flex-col sm:justify-center sm:gap-0.5 sm:border-b-0 sm:border-r sm:py-5">
                        <span className="text-[30px] font-bold leading-none text-ink tabular-nums">
                          {dayNum}
                        </span>
                        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-gold-deep">
                          {month}
                        </span>
                      </div>

                      {/* Middle — the visit */}
                      <div className="min-w-0 flex-1 p-4 sm:p-5">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="text-[16px] font-bold leading-snug text-ink">
                              {b.dogName}
                              {b.breed ? (
                                <span className="font-normal text-ink-soft">
                                  {' '}
                                  · {b.breed}
                                </span>
                              ) : null}
                            </h3>
                            <p className="mt-0.5 text-[13.5px] font-medium text-ink-soft">
                              {b.service}
                            </p>
                          </div>
                          <SignalBadge booking={b} />
                        </div>

                        {b.items.length > 0 && (
                          <p className="mt-2 text-[12px] leading-relaxed text-ink-soft/80">
                            {b.items
                              .map((i) => (i.qty > 1 ? `${i.name} ×${i.qty}` : i.name))
                              .join(' · ')}
                          </p>
                        )}

                        <p className="mt-2.5 flex items-center gap-1.5 text-[12.5px] font-medium text-ink">
                          <CalendarDays className="size-3.5 shrink-0 text-gold-deep" />
                          {prettyDate(b.date)} at {b.time}
                        </p>

                        <p className="mt-1.5 text-[12.5px] text-ink-soft">
                          {b.total ? (
                            <>
                              Total{' '}
                              <span className="font-semibold text-ink">{b.total}</span>
                            </>
                          ) : null}
                          {b.paid ? (
                            <>
                              {' '}
                              · Paid so far{' '}
                              <span className="font-semibold text-ink">{b.paid}</span>
                            </>
                          ) : null}
                          {balance && b.signal === 'booked' ? (
                            <>
                              {' '}
                              · Balance due{' '}
                              <span className="font-semibold text-gold-deep">
                                {balance}
                              </span>
                            </>
                          ) : null}
                        </p>
                      </div>

                      {/* Actions */}
                      {canAct && (
                        <div className="flex flex-wrap items-center gap-2 border-t border-ink/10 p-4 sm:w-[224px] sm:flex-col sm:items-stretch sm:border-l sm:border-t-0 sm:p-5">
                          {b.signal === 'pending' && payAmountCents > 0 ? (
                            <Button
                              onClick={() => pay(b)}
                              disabled={payingId === b.id}
                              className="h-10 rounded-lg bg-ink px-3 text-[12px] font-bold text-white hover:bg-ink-soft"
                            >
                              {payingId === b.id ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <CreditCard className="size-3.5" />
                              )}
                              Pay now — {fmtCents(payAmountCents)}
                              {b.payMode === 'FULL' ? '' : ' deposit'}
                            </Button>
                          ) : b.signal !== 'pending' && b.amountDueCents > 0 ? (
                            <Button
                              onClick={() => pay(b)}
                              disabled={payingId === b.id}
                              className="h-10 rounded-lg bg-ink px-3 text-[12px] font-bold text-white hover:bg-ink-soft"
                            >
                              {payingId === b.id ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <CreditCard className="size-3.5" />
                              )}
                              Pay balance — {fmtCents(b.amountDueCents)}
                            </Button>
                          ) : null}
                          <Button
                            variant="outline"
                            onClick={() => openReschedule(b)}
                            className="h-10 rounded-lg border-ink/20 bg-white text-[12px] font-semibold text-ink hover:bg-cream hover:text-ink"
                          >
                            Reschedule
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => openCancel(b)}
                            className="h-10 rounded-lg text-[12px] font-semibold text-red-700/80 hover:bg-red-50 hover:text-red-800"
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Pre-visit questionnaire nudge */}
                    {!b.questionnaireComplete &&
                      (b.signal === 'pending' || b.signal === 'booked' || b.signal === 'paid') && (
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gold/30 bg-gold-light/20 px-4 py-3 sm:px-5">
                          <p className="text-[12.5px] font-medium text-ink">
                            Finish the pre-visit questionnaire — saves time at the
                            salon.
                          </p>
                          <Button
                            size="sm"
                            onClick={() => setQuestionnaireFor(b)}
                            className="h-8 rounded-lg bg-gold-deep px-3.5 text-[11px] font-bold text-white hover:bg-ink"
                          >
                            Start questionnaire
                          </Button>
                        </div>
                      )}
                  </article>
                );
              })
            )}
          </section>

          {/* ------------------------- Past visits ------------------------- */}
          {past.length > 0 && (
            <section aria-labelledby="past-heading" className="space-y-3">
              <h2
                id="past-heading"
                style={displayFont}
                className="text-[20px] text-ink"
              >
                Past visits
              </h2>
              <div className="overflow-hidden rounded-xl border border-ink/10 bg-white shadow-sm">
                <div className="grid grid-cols-[92px_1fr_84px_auto] items-center gap-3 border-b border-ink/10 bg-cream px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-soft sm:px-5">
                  <span>Date</span>
                  <span>Visit</span>
                  <span className="text-right">Total</span>
                  <span className="pr-1">Status</span>
                </div>
                <div className="max-h-96 divide-y divide-ink/8 overflow-y-auto custom-scrollbar">
                  {past.map((b) => (
                    <div
                      key={b.id}
                      className="grid grid-cols-[92px_1fr_84px_auto] items-center gap-3 px-4 py-3.5 transition-colors hover:bg-cream/50 sm:px-5"
                    >
                      <span className="text-[12px] text-ink-soft">
                        {prettyDateShort(b.date)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-ink">
                          {b.dogName} — {b.service}
                        </p>
                        {b.items.length > 0 && (
                          <p className="truncate text-[11px] text-ink-soft/75">
                            {b.items
                              .map((i) => (i.qty > 1 ? `${i.name} ×${i.qty}` : i.name))
                              .join(' · ')}
                          </p>
                        )}
                      </div>
                      <span className="text-right text-[13px] font-semibold text-ink tabular-nums">
                        {b.total ?? '—'}
                      </span>
                      <SignalBadge booking={b} />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {/* ------------------- Reschedule modal ------------------- */}
      <Dialog
        open={!!rescheduleFor}
        onOpenChange={(o) => {
          if (!o) setRescheduleFor(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle style={displayFont} className="text-[20px] text-ink">
              Reschedule{' '}
              {rescheduleFor?.dogName ? `${rescheduleFor.dogName}'s` : 'your'}{' '}
              appointment
            </DialogTitle>
            <DialogDescription className="text-[12.5px] leading-relaxed">
              {rescheduleFor
                ? `Currently ${prettyDate(rescheduleFor.date)} at ${rescheduleFor.time}. Pick a new day, then a time — we're closed Mondays.`
                : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-center rounded-lg border border-ink/10 p-3">
              <Calendar
                mode="single"
                selected={rSelected}
                onSelect={(d) => {
                  if (!d) return;
                  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                  setRDate(iso);
                  setRTime('');
                }}
                disabled={[{ before: new Date() }, isMonday]}
                classNames={{
                  today: 'bg-gold-light/40 rounded-md text-ink font-bold',
                  selected: 'bg-ink text-white rounded-md font-bold',
                  day_selected: 'bg-ink text-white hover:bg-ink rounded-md font-bold',
                }}
              />
            </div>

            {rDate && (
              <div>
                <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.1em] text-ink-soft">
                  Available times ·{' '}
                  {new Date(`${rDate}T00:00:00`).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                {rLoadingTimes ? (
                  <div className="flex gap-2">
                    <Skeleton className="h-11 flex-1" />
                    <Skeleton className="h-11 flex-1" />
                  </div>
                ) : rNoTimes ? (
                  <div className="rounded-md border border-gold/40 bg-gold-light/15 p-3.5 text-[12.5px] text-ink">
                    No times that day — pick another day above.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-soft">
                        Morning
                      </Label>
                      <Select
                        value={/AM$/i.test(rTime) ? rTime : ''}
                        onValueChange={(v) => setRTime(v)}
                      >
                        <SelectTrigger className="h-11 w-full rounded-md border-ink/15 bg-white text-[13.5px] text-ink focus:ring-gold-deep">
                          <SelectValue
                            placeholder={rMorning.length ? 'AM times' : 'None'}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {rMorning.map((t) => (
                            <SelectItem key={t} value={t} className="text-[13px]">
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-soft">
                        Afternoon
                      </Label>
                      <Select
                        value={/PM$/i.test(rTime) ? rTime : ''}
                        onValueChange={(v) => setRTime(v)}
                      >
                        <SelectTrigger className="h-11 w-full rounded-md border-ink/15 bg-white text-[13.5px] text-ink focus:ring-gold-deep">
                          <SelectValue
                            placeholder={rAfternoon.length ? 'PM times' : 'None'}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {rAfternoon.map((t) => (
                            <SelectItem key={t} value={t} className="text-[13px]">
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            )}

            {rError && (
              <p className="rounded-md border border-red-200 bg-red-50 p-3 text-[12.5px] font-medium text-red-700">
                {rError}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setRescheduleFor(null)}
              disabled={rSubmitting}
              className="h-10 rounded-lg border-ink/20 text-[12px] font-semibold text-ink"
            >
              Keep current time
            </Button>
            <Button
              onClick={submitReschedule}
              disabled={!rDate || !rTime || rSubmitting}
              className="h-10 rounded-lg bg-ink text-[12px] font-bold text-white hover:bg-ink-soft"
            >
              {rSubmitting && <Loader2 className="size-3.5 animate-spin" />}
              Confirm new time
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------- Cancel modal ------------------- */}
      <AlertDialog
        open={!!cancelFor}
        onOpenChange={(o) => {
          if (!o) setCancelFor(null);
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-left text-[17px] text-ink">
              Cancel {cancelFor?.dogName ? `${cancelFor.dogName}'s` : 'your'}{' '}
              appointment on {cancelFor ? prettyDateShort(cancelFor.date) : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left text-[13px] leading-relaxed">
              Your slot opens up to other pups immediately. Deposit refunds are
              handled by the salon — call us at (901) 800-7182 with any questions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {cError && (
            <p className="rounded-md border border-red-200 bg-red-50 p-3 text-[12.5px] font-medium text-red-700">
              {cError}
            </p>
          )}
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              disabled={cSubmitting}
              className="h-10 rounded-lg text-[12px] font-semibold text-ink"
            >
              Keep my appointment
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault(); // stay open until the POST resolves
                submitCancel();
              }}
              disabled={cSubmitting}
              className="h-10 rounded-lg bg-red-700 text-[12px] font-bold text-white hover:bg-red-800"
            >
              {cSubmitting && <Loader2 className="size-3.5 animate-spin" />}
              Cancel appointment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ------------------- Questionnaire modal ------------------- */}
      {questionnaireFor && (
        <QuestionnaireModal
          booking={questionnaireFor}
          onClose={() => setQuestionnaireFor(null)}
          onSaved={onQuestionnaireSaved}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Questionnaire — the pre-visit facts that save time at the salon.
// Same answers shape the booking-flow confirmation panel saves (Task 35-a).
// ---------------------------------------------------------------------------
function QuestionnaireModal({
  booking,
  onClose,
  onSaved,
}: {
  booking: Booking;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    vaccinationsCurrent: '',
    sameDayShots: '',
    muzzle: '',
    sedation: '',
    healthNotes: '',
    groomingGoals: '',
    behaviorNotes: '',
    emergencyName: '',
    emergencyPhone: '',
    vetName: '',
    vetPhone: '',
    authorize: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (p: Partial<typeof form>) => setForm((f) => ({ ...f, ...p }));

  const save = async () => {
    if (!form.authorize) {
      setError('Please authorize the grooming service to continue.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/customer/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'questionnaire',
          bookingId: booking.id,
          answers: form,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d?.error || 'Could not save — please try again.');
        return;
      }
      onSaved();
    } catch {
      setError('Network problem — please try again.');
    } finally {
      setBusy(false);
    }
  };

  const yesNo = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    yesLabel = 'Yes',
    noLabel = 'No',
  ) => (
    <div>
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-ink-soft">
        {label}
      </p>
      <div className="flex gap-2">
        {[
          { v: 'yes', l: yesLabel },
          { v: 'no', l: noLabel },
        ].map((o) => (
          <button
            key={o.v}
            type="button"
            aria-pressed={value === o.v}
            onClick={() => onChange(o.v)}
            className={cn(
              'flex-1 rounded-md border px-3 py-2.5 text-[12.5px] font-semibold transition-colors',
              value === o.v
                ? 'border-gold-deep bg-gold-light/15 text-gold-deep'
                : 'border-ink/12 bg-white text-ink-soft hover:border-gold-deep/60',
            )}
          >
            {o.l}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !busy) onClose(); }}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle style={displayFont} className="text-[20px] text-ink">
            Pre-visit questionnaire
          </DialogTitle>
          <DialogDescription className="text-[12.5px] leading-relaxed">
            For {booking.dogName}&apos;s visit on {prettyDateShort(booking.date)}.
            Two minutes now saves ten at the counter — and keeps every groom safe.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {yesNo(
            'Vaccinations current? (rabies, DHPP, bordetella)',
            form.vaccinationsCurrent,
            (v) => set({ vaccinationsCurrent: v }),
            'Yes — up to date',
            'Not yet',
          )}
          {yesNo('Any vaccines in the last 24 hours?', form.sameDayShots, (v) =>
            set({ sameDayShots: v }),
          )}
          {yesNo('Has your pup ever needed a muzzle?', form.muzzle, (v) =>
            set({ muzzle: v }),
          )}
          {yesNo('Any sedation or calming medication before the visit?', form.sedation, (v) =>
            set({ sedation: v }),
          )}

          {form.sedation === 'yes' && (
            <div className="rounded-md border border-gold/40 bg-gold-light/20 p-3.5 text-[12px] leading-relaxed text-ink">
              Please call us to reschedule — medicated pets can&apos;t be groomed
              the same day. (901) 800-7182.
            </div>
          )}

          <div className="space-y-2">
            <Label
              htmlFor="q-health"
              className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-soft"
            >
              Health notes
            </Label>
            <Textarea
              id="q-health"
              value={form.healthNotes}
              onChange={(e) => set({ healthNotes: e.target.value })}
              rows={2}
              placeholder="Skin conditions, allergies, recent surgery, hip issues…"
              className="rounded-md border-ink/15 text-[13px] text-ink placeholder:text-ink-soft/40 focus-visible:ring-gold-deep"
            />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="q-goals"
              className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-soft"
            >
              Grooming goals
            </Label>
            <Textarea
              id="q-goals"
              value={form.groomingGoals}
              onChange={(e) => set({ groomingGoals: e.target.value })}
              rows={2}
              placeholder="The look you want, length preferences, anything to keep long…"
              className="rounded-md border-ink/15 text-[13px] text-ink placeholder:text-ink-soft/40 focus-visible:ring-gold-deep"
            />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="q-behavior"
              className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-soft"
            >
              Behavior notes
            </Label>
            <Textarea
              id="q-behavior"
              value={form.behaviorNotes}
              onChange={(e) => set({ behaviorNotes: e.target.value })}
              rows={2}
              placeholder="Nervous with dryers, sensitive paws, loves treats…"
              className="rounded-md border-ink/15 text-[13px] text-ink placeholder:text-ink-soft/40 focus-visible:ring-gold-deep"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label
                htmlFor="q-em-name"
                className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-soft"
              >
                Emergency contact
              </Label>
              <Input
                id="q-em-name"
                value={form.emergencyName}
                onChange={(e) => set({ emergencyName: e.target.value })}
                placeholder="Name"
                className="h-10 rounded-md border-ink/15 text-[13px] focus-visible:ring-gold-deep"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="q-em-phone"
                className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-soft"
              >
                Emergency phone
              </Label>
              <Input
                id="q-em-phone"
                value={form.emergencyPhone}
                onChange={(e) => set({ emergencyPhone: e.target.value })}
                placeholder="(901) 555-0100"
                type="tel"
                className="h-10 rounded-md border-ink/15 text-[13px] focus-visible:ring-gold-deep"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="q-vet-name"
                className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-soft"
              >
                Vet name{' '}
                <span className="font-normal normal-case tracking-normal text-ink-soft/60">
                  (optional)
                </span>
              </Label>
              <Input
                id="q-vet-name"
                value={form.vetName}
                onChange={(e) => set({ vetName: e.target.value })}
                placeholder="Clinic name"
                className="h-10 rounded-md border-ink/15 text-[13px] focus-visible:ring-gold-deep"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="q-vet-phone"
                className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-soft"
              >
                Vet phone
              </Label>
              <Input
                id="q-vet-phone"
                value={form.vetPhone}
                onChange={(e) => set({ vetPhone: e.target.value })}
                placeholder="(901) 555-0100"
                type="tel"
                className="h-10 rounded-md border-ink/15 text-[13px] focus-visible:ring-gold-deep"
              />
            </div>
          </div>

          <label
            htmlFor="q-authorize"
            className="flex cursor-pointer items-start gap-2.5 rounded-md border border-ink/10 bg-cream/60 p-3.5"
          >
            <Checkbox
              id="q-authorize"
              checked={form.authorize}
              onCheckedChange={(c) => set({ authorize: c === true })}
              className="mt-0.5 data-[state=checked]:border-gold-deep data-[state=checked]:bg-gold-deep"
            />
            <span className="text-[12px] leading-relaxed text-ink-soft">
              I authorize All About Pawz to perform grooming services for my pet
              and agree to the salon policies. I&apos;ve disclosed all known health
              and behavior concerns above.
            </span>
          </label>

          {error && (
            <p className="text-[12.5px] font-medium text-red-700">{error}</p>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={busy}
              className="h-11 flex-1 rounded-lg border-ink/20 text-[12px] font-semibold text-ink"
            >
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={busy}
              className="h-11 flex-1 rounded-lg bg-ink text-[11px] font-bold uppercase tracking-[0.14em] text-white hover:bg-ink-soft"
            >
              {busy && <Loader2 className="size-3.5 animate-spin" />}
              Save questionnaire
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
