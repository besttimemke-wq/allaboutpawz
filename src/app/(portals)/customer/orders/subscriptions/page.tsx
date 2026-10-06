'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  CalendarClock, Sparkles, Loader2, AlertCircle, Phone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PromoCodeBox, type AppliedPromo } from '@/components/site/islands/promo-code-box';

// ============================================================================
// Subscriptions — the PAWfection Bath Club home in the portal. Three states:
//
//   1. VERIFYING — returned from Stripe (?signup=success); /api/subscriptions
//      /status asks Stripe whether the session actually paid, activates the
//      membership, and posts the subscription_purchased perk points.
//   2. MANAGE — an active/paused membership: plan, price, visits, period end,
//      pause / cancel-at-end (cancellation takes effect at the end of the
//      billing cycle — no partial-month refunds).
//   3. SIGNUP — the tier ladder from the tenant catalog, monthly / annual
//      (12 months for the price of 10), dog picker, promo code (validated
//      server-side), then Stripe subscription checkout. XL = custom quote.
// ============================================================================

type Plan = {
  id: string;
  sizeTier: 'SMALL' | 'MEDIUM' | 'LARGE' | 'XLARGE';
  sizeLabel: string;
  weightRange: string;
  monthlyPriceCents: number | null;
  visitsPerMonth: number;
  annualPrepayMonths: number;
  annualPrepayChargeMonths: number;
  multiPetDiscountPercent: number;
};

type Membership = {
  id: string;
  planName: string;
  sizeTier: string;
  dogName: string | null;
  status: 'PENDING' | 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'PAST_DUE';
  billingInterval: 'monthly' | 'annual';
  priceCents: number;
  visitsIncluded: number;
  visitsUsed: number;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

type PetOption = { id: string; name: string; weightLbs: string | null; size: string | null };

const money = (cents: number) => `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;

// useSearchParams needs a Suspense boundary for prerendering.
export default function SubscriptionsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-gold-deep" aria-hidden="true" />
        </div>
      }
    >
      <SubscriptionsInner />
    </Suspense>
  );
}

function SubscriptionsInner() {
  const params = useSearchParams();
  const returning = params.get('signup') === 'success';
  const cancelled = params.get('signup') === 'cancelled';

  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [memberships, setMemberships] = useState<Membership[] | null>(null);
  const [pets, setPets] = useState<PetOption[]>([]);
  const [verifying, setVerifying] = useState(returning);
  const [notice, setNotice] = useState<string | null>(cancelled ? 'Membership signup cancelled — nothing was charged.' : null);
  const [error, setError] = useState('');

  // ---- signup state ----
  const [planId, setPlanId] = useState('');
  const [interval, setIntervalChoice] = useState<'monthly' | 'annual'>('monthly');
  const [dogId, setDogId] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      // The status route verifies PENDING memberships against Stripe,
      // activates paid ones, and posts perk points — idempotent.
      const [statusRes, plansRes] = await Promise.all([
        fetch('/api/subscriptions/status', { cache: 'no-store' }),
        fetch('/api/subscriptions/plans', { cache: 'no-store' }),
      ]);
      const statusData = await statusRes.json().catch(() => ({}));
      const plansData = await plansRes.json().catch(() => ({}));
      setMemberships(Array.isArray(statusData?.memberships) ? statusData.memberships : []);
      const planList: Plan[] = Array.isArray(plansData?.plans) ? plansData.plans : [];
      setPlans(planList);
      if (planList.length > 0) {
        setPlanId((cur) => cur || planList.find((p) => p.monthlyPriceCents != null)?.id || '');
      }
      if (returning) {
        const activated = Array.isArray(statusData?.activated) ? statusData.activated.length : 0;
        setNotice(
          activated > 0
            ? 'Your PAWfection Bath Club membership is active — points are on the way to your Perks balance.'
            : 'Payment is still settling — your membership activates the moment Stripe confirms it.',
        );
      }
    } catch {
      setMemberships([]);
      setPlans([]);
    } finally {
      setVerifying(false);
    }
  }, [returning]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetch('/api/customer/pets', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { pets: [] }))
      .then((d) => {
        const list: PetOption[] = Array.isArray(d?.pets) ? d.pets : [];
        setPets(list);
        if (list.length > 0) setDogId((cur) => cur || list[0].id);
      })
      .catch(() => {});
  }, []);

  const active = memberships?.find((m) => m.status === 'ACTIVE') || null;
  const pending = memberships?.find((m) => m.status === 'PENDING') || null;
  const paused = memberships?.find((m) => m.status === 'PAUSED') || null;
  const selectedPlan = plans?.find((p) => p.id === planId) || null;

  const manage = async (membershipId: string, action: string) => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/subscriptions/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ membershipId, action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'That didn’t work — try again.');
        return;
      }
      await load();
    } catch {
      setError('Network problem — try again.');
    } finally {
      setBusy(false);
    }
  };

  const startMembership = async () => {
    if (!selectedPlan) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlan.id,
          billingInterval: interval,
          dogId: dogId || null,
          dogName: pets.find((p) => p.id === dogId)?.name ?? null,
          promoCode: appliedPromo?.code ?? '',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        window.location.href = '/access-customer?next=/customer/orders/subscriptions';
        return;
      }
      if (!res.ok || !data?.url) {
        setError(data?.error || 'Couldn’t start the membership — try again.');
        return;
      }
      window.location.href = data.url;
    } catch {
      setError('Network problem — try again.');
    } finally {
      setBusy(false);
    }
  };

  // ---------- VERIFYING ----------
  if (verifying || memberships === null) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-7 w-7 animate-spin text-gold-deep" aria-hidden="true" />
          <p className="mt-3 text-[13px] font-medium text-muted-foreground">
            {verifying ? 'Verifying your payment with Stripe…' : 'Loading your memberships…'}
          </p>
        </div>
      </div>
    );
  }

  const membership = active || paused || pending;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[24px] font-bold text-foreground">Subscriptions</h1>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          PAWfection Bath Club — monthly memberships, up to 4 baths a month.
        </p>
      </div>

      {notice && (
        <div className="flex items-start gap-3 rounded-lg border border-gold-deep/30 bg-amber-50/50 p-4">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-gold-deep" aria-hidden="true" />
          <p className="text-[13px] leading-relaxed text-foreground">{notice}</p>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
          <p className="text-[13px] leading-relaxed text-red-700">{error}</p>
        </div>
      )}

      {/* ---------- MANAGE ---------- */}
      {membership ? (
        <div className="rounded-xl border border-border bg-card shadow-card">
          <div className="flex items-center justify-between border-b border-border bg-muted/40 px-5 py-3">
            <div className="flex items-center gap-2.5">
              <CalendarClock className="h-5 w-5 text-gold-deep" aria-hidden="true" />
              <p className="text-[14px] font-semibold text-foreground">
                {membership.planName}
                <span className="ml-2 text-[12px] font-normal text-muted-foreground">
                  {membership.sizeTier[0] + membership.sizeTier.slice(1).toLowerCase()}
                  {membership.dogName ? ` · ${membership.dogName}` : ''}
                </span>
              </p>
            </div>
            <span
              className={cn(
                'rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.06em]',
                membership.status === 'ACTIVE' && 'bg-green-100 text-green-700',
                membership.status === 'PAUSED' && 'bg-amber-100 text-amber-700',
                membership.status === 'PENDING' && 'bg-neutral-100 text-neutral-600',
              )}
            >
              {membership.status === 'PENDING' ? 'Payment pending' : membership.status}
              {membership.cancelAtPeriodEnd && ' · ends at period end'}
            </span>
          </div>
          <div className="grid gap-4 px-5 py-5 sm:grid-cols-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Price</p>
              <p className="mt-1 text-[16px] font-bold tabular-nums text-foreground">
                {money(membership.priceCents)}
                <span className="text-[12px] font-normal text-muted-foreground">
                  /{membership.billingInterval === 'annual' ? 'yr' : 'mo'}
                </span>
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Baths this period</p>
              <p className="mt-1 text-[16px] font-bold tabular-nums text-foreground">
                {membership.visitsUsed}/{membership.visitsIncluded}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Renews</p>
              <p className="mt-1 text-[14px] font-semibold text-foreground">
                {membership.currentPeriodEnd
                  ? new Date(membership.currentPeriodEnd).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                  : '—'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5 border-t border-border px-5 py-4">
            {membership.status === 'ACTIVE' && !membership.cancelAtPeriodEnd && (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => manage(membership.id, 'pause')}
                  className="h-10 rounded-md border border-border bg-white px-4 text-[11px] font-bold uppercase tracking-[0.1em] text-foreground transition-colors hover:border-foreground disabled:opacity-50"
                >
                  Pause
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => manage(membership.id, 'cancel_at_end')}
                  className="h-10 rounded-md border border-border bg-white px-4 text-[11px] font-bold uppercase tracking-[0.1em] text-foreground transition-colors hover:border-red-300 hover:text-red-600 disabled:opacity-50"
                >
                  Cancel at period end
                </button>
              </>
            )}
            {membership.status === 'ACTIVE' && membership.cancelAtPeriodEnd && (
              <button
                type="button"
                disabled={busy}
                onClick={() => manage(membership.id, 'resume')}
                className="h-10 rounded-md bg-foreground px-4 text-[11px] font-bold uppercase tracking-[0.1em] text-background transition-colors hover:bg-gold-deep disabled:opacity-50"
              >
                Keep it going
              </button>
            )}
            {membership.status === 'PAUSED' && (
              <button
                type="button"
                disabled={busy}
                onClick={() => manage(membership.id, 'unpause')}
                className="h-10 rounded-md bg-foreground px-4 text-[11px] font-bold uppercase tracking-[0.1em] text-background transition-colors hover:bg-gold-deep disabled:opacity-50"
              >
                Resume
              </button>
            )}
            <p className="w-full pt-1 text-[11px] leading-relaxed text-muted-foreground">
              Cancellation takes effect at the end of the billing cycle — no partial-month refunds.
            </p>
          </div>
        </div>
      ) : plans && plans.length > 0 ? (
        /* ---------- SIGNUP ---------- */
        <div className="rounded-xl border border-border bg-card shadow-card">
          <div className="border-b border-border bg-muted/40 px-5 py-3">
            <p className="text-[14px] font-semibold text-foreground">Join the PAWfection Bath Club</p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              Monthly membership · up to 4 baths a month · appointments required
            </p>
          </div>

          <div className="px-5 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Your pup’s size
            </p>
            <div role="radiogroup" aria-label="Membership tier" className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {plans.map((p) => {
                const selected = planId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={p.monthlyPriceCents == null}
                    onClick={() => setPlanId(p.id)}
                    className={cn(
                      'rounded-lg border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                      selected ? 'border-gold-deep bg-amber-50/40' : 'border-border bg-white hover:border-neutral-300',
                    )}
                  >
                    <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-gold-deep">{p.sizeLabel}</p>
                    <p className="mt-0.5 text-[11.5px] text-muted-foreground">{p.weightRange}</p>
                    <p className="mt-2.5 text-[19px] font-bold tabular-nums text-foreground">
                      {p.monthlyPriceCents != null ? (
                        <>
                          {money(p.monthlyPriceCents)}
                          <span className="text-[11px] font-normal text-muted-foreground">/mo</span>
                        </>
                      ) : (
                        <span className="flex items-center gap-1.5 text-[14px]">
                          <Phone className="h-3.5 w-3.5 text-gold-deep" aria-hidden="true" />
                          Custom quote
                        </span>
                      )}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Billing interval — annual prepay from the plan row */}
            <div className="mt-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Billing</p>
              <div role="radiogroup" aria-label="Billing interval" className="mt-3 grid gap-3 sm:grid-cols-2">
                {(['monthly', 'annual'] as const).map((iv) => (
                  <button
                    key={iv}
                    type="button"
                    role="radio"
                    aria-checked={interval === iv}
                    onClick={() => setIntervalChoice(iv)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border p-4 text-left transition-colors',
                      interval === iv ? 'border-gold-deep bg-amber-50/40' : 'border-border bg-white hover:border-neutral-300',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                        interval === iv ? 'border-gold-deep' : 'border-neutral-300',
                      )}
                    >
                      {interval === iv && <span className="h-2.5 w-2.5 rounded-full bg-gold-deep" />}
                    </span>
                    <span>
                      <span className="block text-[14px] font-bold text-foreground">
                        {iv === 'monthly' ? 'Monthly' : `Prepay ${selectedPlan?.annualPrepayMonths ?? 12} months`}
                      </span>
                      <span className="mt-0.5 block text-[12px] text-muted-foreground">
                        {iv === 'monthly'
                          ? 'Cancel or pause anytime.'
                          : `For the price of ${selectedPlan?.annualPrepayChargeMonths ?? 10} — two months free.`}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Dog picker */}
            {pets.length > 0 && (
              <div className="mt-5">
                <label htmlFor="sub-dog" className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Membership for
                </label>
                <select
                  id="sub-dog"
                  value={dogId}
                  onChange={(e) => setDogId(e.target.value)}
                  className="mt-2 h-11 w-full rounded-md border border-border bg-white px-3 text-[14px] text-foreground focus:border-gold-deep focus:outline-none focus:ring-2 focus:ring-gold-deep/30 sm:w-72"
                >
                  {pets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.weightLbs ? ` · ${p.weightLbs} lbs` : ''}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  One dog per membership — {selectedPlan?.multiPetDiscountPercent ?? 10}% off each additional
                  membership in the same household.
                </p>
              </div>
            )}

            {/* Promo — validated server-side; the discount rides the checkout */}
            {selectedPlan && selectedPlan.monthlyPriceCents != null && (
              <div className="mt-5">
                <PromoCodeBox
                  context={{
                    subscriptionPlanId: selectedPlan.id,
                    subtotalCents: selectedPlan.monthlyPriceCents,
                  }}
                  onApplied={(p) => setAppliedPromo(p)}
                  onRemoved={() => setAppliedPromo(null)}
                />
              </div>
            )}

            <button
              type="button"
              disabled={busy || !selectedPlan || selectedPlan.monthlyPriceCents == null}
              onClick={startMembership}
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-foreground px-6 text-[12px] font-bold uppercase tracking-[0.1em] text-background transition-colors hover:bg-gold-deep hover:text-white disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {selectedPlan?.monthlyPriceCents == null
                ? 'Call the salon for XL'
                : interval === 'annual'
                  ? `Start — ${money(Math.round(((selectedPlan?.monthlyPriceCents ?? 0) * (selectedPlan?.annualPrepayChargeMonths ?? 10)) / (selectedPlan?.annualPrepayMonths ?? 12)))} for the year`
                  : `Start — ${money(selectedPlan?.monthlyPriceCents ?? 0)}/mo`}
            </button>
            <p className="mt-2.5 text-[11px] leading-relaxed text-muted-foreground">
              Secure checkout with Stripe. Unused visits don&apos;t roll over; heavy matting or
              excessive labor may add a charge. <Link href="/pricing#bath-club" className="font-semibold text-gold-deep">See the full terms</Link>.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <CalendarClock className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <p className="mt-3 text-[14px] font-semibold text-foreground">Memberships aren&apos;t available yet</p>
          <p className="mt-1 text-[13px] text-muted-foreground">Check back soon — the Bath Club is almost here.</p>
        </div>
      )}
    </div>
  );
}
