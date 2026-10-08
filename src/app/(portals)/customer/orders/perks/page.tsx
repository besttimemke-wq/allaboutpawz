'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Gift, PawPrint, ShoppingBag, CalendarDays, RefreshCcw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Perks Dashboard — the real points ledger. One balance per user
// (SUM of perk_ledger, never a stored column), 1 pt per $1 on completed
// grooms, shop orders, and Bath Club payments. Redemption: 100 pts = $1 at
// checkout (tenant-configurable). History lists every ledger entry —
// positive earns, negative redemptions.
// ============================================================================

type Entry = {
  id: string;
  points: number;
  source: 'order' | 'booking' | 'subscription' | 'redemption' | 'manual';
  note: string | null;
  createdAt: string;
};

const SOURCE_LABEL: Record<Entry['source'], string> = {
  order: 'Shop order',
  booking: 'Grooming visit',
  subscription: 'Bath Club',
  redemption: 'Redeemed',
  manual: 'Adjustment',
};

export default function PerksPage() {
  const [points, setPoints] = useState<number | null>(null);
  const [rate, setRate] = useState(100);
  const [history, setHistory] = useState<Entry[]>([]);
  const [signedOut, setSignedOut] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/perks/balance', { cache: 'no-store' })
      .then(async (r) => {
        if (r.status === 401) {
          setSignedOut(true);
          return null;
        }
        if (!r.ok) throw new Error('Couldn’t load your Perks.');
        return r.json();
      })
      .then((d) => {
        if (!d) return;
        setPoints(typeof d.points === 'number' ? d.points : 0);
        setRate(typeof d.pointsPerDollar === 'number' ? d.pointsPerDollar : 100);
        setHistory(Array.isArray(d.history) ? d.history : []);
      })
      .catch((e) => setError(e.message || 'Couldn’t load your Perks.'));
  }, []);

  if (signedOut) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <Gift className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <p className="mt-3 text-[14px] font-semibold text-foreground">Sign in to see your Perks</p>
        <p className="mt-1 text-[13px] text-muted-foreground">Points live in your account — one login, one portal.</p>
        <Link
          href="/access-customer?next=/customer/orders/perks"
          className="mt-5 inline-flex h-11 items-center rounded-md bg-foreground px-6 text-[12px] font-bold uppercase tracking-[0.1em] text-background transition-colors hover:bg-gold-deep hover:text-white"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[24px] font-bold text-foreground">Pawz Perks</h1>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          Earn points on completed grooms, shop orders, and Bath Club payments — spend them at checkout.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
          <p className="text-[13px] text-red-700">{error}</p>
        </div>
      )}

      {/* The balance */}
      <div className="rounded-xl border border-gold-deep/30 bg-gradient-to-br from-amber-50/70 to-white p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gold-deep">Your balance</p>
            <p className="mt-1.5 text-[42px] font-bold leading-none tabular-nums text-foreground">
              {points === null ? '…' : points.toLocaleString()}
              <span className="ml-2 text-[14px] font-semibold text-muted-foreground">points</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[12px] font-semibold text-muted-foreground">
              {rate} points = $1 at checkout
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {points != null && points >= rate
                ? `Worth ${'$' + (points / rate).toFixed(2)} on your next booking`
                : 'Earn more with your next groom'}
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2.5">
          <Link
            href="/book/appointment"
            className="inline-flex h-11 items-center gap-2 rounded-md bg-foreground px-5 text-[11px] font-bold uppercase tracking-[0.1em] text-background transition-colors hover:bg-gold-deep hover:text-white"
          >
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            Book a groom
          </Link>
          <Link
            href="/shop"
            className="inline-flex h-11 items-center gap-2 rounded-md border border-border bg-white px-5 text-[11px] font-bold uppercase tracking-[0.1em] text-foreground transition-colors hover:border-foreground"
          >
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            Shop
          </Link>
        </div>
      </div>

      {/* How it earns */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: CalendarDays, title: 'Grooms', body: 'Points post when the visit is completed — not when it’s booked.' },
          { icon: ShoppingBag, title: 'Shop orders', body: 'Points post when the order is paid and fulfilled.' },
          { icon: RefreshCcw, title: 'Bath Club', body: 'Every membership payment and renewal earns too.' },
        ].map((c) => (
          <div key={c.title} className="rounded-lg border border-border bg-card p-4">
            <c.icon className="h-5 w-5 text-gold-deep" aria-hidden="true" />
            <p className="mt-2.5 text-[13px] font-bold text-foreground">{c.title}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{c.body}</p>
          </div>
        ))}
      </div>

      {/* History — the ledger, newest first */}
      <div className="rounded-xl border border-border bg-card shadow-card">
        <div className="border-b border-border bg-muted/40 px-5 py-3">
          <p className="text-[14px] font-semibold text-foreground">History</p>
        </div>
        {history.length === 0 ? (
          <div className="flex items-center gap-3 px-5 py-8">
            <PawPrint className="h-6 w-6 shrink-0 text-gold-deep" aria-hidden="true" />
            <div>
              <p className="text-[13.5px] font-medium text-foreground">No points yet</p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                Your first completed groom starts the ledger.
              </p>
            </div>
          </div>
        ) : (
          <ul className="max-h-96 divide-y divide-border overflow-y-auto">
            {history.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="text-[13.5px] font-medium text-foreground">{SOURCE_LABEL[h.source]}</p>
                  <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                    {new Date(h.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    {h.note ? ` · ${h.note}` : ''}
                  </p>
                </div>
                <p
                  className={cn(
                    'shrink-0 text-[15px] font-bold tabular-nums',
                    h.points >= 0 ? 'text-green-600' : 'text-gold-deep',
                  )}
                >
                  {h.points >= 0 ? '+' : ''}
                  {h.points.toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
