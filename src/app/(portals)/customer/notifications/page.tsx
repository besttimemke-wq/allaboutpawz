'use client';

// ============================================================================
// Customer Portal — Notifications (owner ruling: the notifications box
// lives IN the customer portal, not in admin analytics — these are SYSTEM
// notifications for the customer).
//
// Every customer-facing email the salon sends also lands here as an in-app
// copy: communication of days (appointment confirmations, reminders,
// reschedules), copies of invoices and payment receipts, copies of shop
// orders, subscription events, account notices and salon messages.
//
// Wired to /api/customer/notifications (session-scoped). Filters by family,
// mark-all-read, deep links per row, unread highlighting, responsive
// mobile-first. Auth gating lives in the layout; a mid-visit 401 shows the
// sign-in card pattern.
// ============================================================================

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  BellRing,
  CalendarDays,
  Receipt,
  ShoppingBag,
  Repeat,
  UserRound,
  GraduationCap,
  Mail,
  Loader2,
  CheckCheck,
  RefreshCw,
  AlertTriangle,
  LogIn,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PortalNotification {
  id: string;
  type: 'appointment' | 'invoice' | 'order' | 'subscription' | 'account' | 'learning' | 'message';
  title: string;
  body: string | null;
  link: string | null;
  relatedId: string | null;
  readAt: string | null;
  createdAt: string | null;
}

const TYPE_ICON: Record<PortalNotification['type'], typeof Bell> = {
  appointment: CalendarDays,
  invoice: Receipt,
  order: ShoppingBag,
  subscription: Repeat,
  account: UserRound,
  learning: GraduationCap,
  message: Mail,
};

const TYPE_LABEL: Record<PortalNotification['type'], string> = {
  appointment: 'Appointments',
  invoice: 'Invoices',
  order: 'Orders',
  subscription: 'Subscriptions',
  account: 'Account',
  learning: 'Learning',
  message: 'Messages',
};

type Filter = 'all' | PortalNotification['type'];

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'appointment', label: 'Appointments' },
  { key: 'invoice', label: 'Invoices' },
  { key: 'order', label: 'Orders' },
  { key: 'subscription', label: 'Subscriptions' },
  { key: 'message', label: 'Messages' },
];

function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? '' : 's'} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} day${d === 1 ? '' : 's'} ago`;
  return new Date(t).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function dayBucket(iso: string | null): 'today' | 'yesterday' | 'earlier' {
  if (!iso) return 'earlier';
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return 'earlier';
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  if (t >= startOfToday) return 'today';
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  if (t >= startOfYesterday) return 'yesterday';
  return 'earlier';
}

const BUCKET_LABEL: Record<'today' | 'yesterday' | 'earlier', string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  earlier: 'Earlier',
};

export default function CustomerNotificationsPage() {
  const [notifications, setNotifications] = useState<PortalNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [authMiss, setAuthMiss] = useState(false);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch('/api/customer/notifications', { cache: 'no-store' });
      if (res.status === 401) {
        setAuthMiss(true);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
      setUnreadCount(Number(data.unreadCount || 0));
      setAuthMiss(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: n.readAt || new Date().toISOString() } : n)),
    );
    setUnreadCount((u) => Math.max(0, u - 1));
    fetch('/api/customer/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_read', id }),
    }).catch(() => {});
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
    setUnreadCount(0);
    fetch('/api/customer/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_all_read' }),
    }).catch(() => {});
  }, []);

  const filtered = useMemo(
    () => (filter === 'all' ? notifications : notifications.filter((n) => n.type === filter)),
    [notifications, filter],
  );

  const buckets = useMemo(() => {
    const groups: { bucket: 'today' | 'yesterday' | 'earlier'; items: PortalNotification[] }[] = [
      { bucket: 'today', items: [] },
      { bucket: 'yesterday', items: [] },
      { bucket: 'earlier', items: [] },
    ];
    for (const n of filtered) groups.find((g) => g.bucket === dayBucket(n.createdAt))?.items.push(n);
    return groups.filter((g) => g.items.length > 0);
  }, [filtered]);

  // ---------------------------------------------------------------------
  // 401 mid-visit — the same sign-in card pattern every customer page uses.
  // ---------------------------------------------------------------------
  if (authMiss) {
    return (
      <div className="p-6 lg:p-10">
        <div className="mx-auto max-w-md rounded-lg border border-ink/10 bg-white p-8 text-center shadow-sm">
          <LogIn className="mx-auto size-8 text-gold-deep" />
          <h1
            className="mt-4 text-[24px] leading-tight text-ink"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Please sign in
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
            Your notifications are private to your account.
          </p>
          <Button asChild className="mt-6 h-11 bg-gold-deep text-on-dark hover:bg-gold-deep/90">
            <Link href="/access-customer?redirect=/customer/notifications">Sign in to your portal</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gold-deep">
            My Account
          </p>
          <h1
            className="mt-2 text-[30px] leading-[1.15] text-ink sm:text-[34px]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Notifications
          </h1>
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-muted-foreground">
            A copy of every communication we send you — appointment reminders, invoice copies,
            order updates, and membership news. The same emails, always here in your portal.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            disabled={loading}
            className="h-9 border-ink/15 bg-white text-ink hover:bg-cream-deep"
            aria-label="Refresh notifications"
          >
            <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllRead}
              className="h-9 border-ink/15 bg-white text-ink hover:bg-cream-deep"
              aria-label={`Mark all ${unreadCount} notifications as read`}
            >
              <CheckCheck className="size-3.5" />
              <span className="hidden sm:inline">Mark all read</span>
              <span className="sm:hidden">Read all</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filter chips */}
      <div
        className="mt-6 flex gap-2 overflow-x-auto pb-1 custom-scrollbar"
        role="tablist"
        aria-label="Filter notifications"
      >
        {FILTERS.map((f) => {
          const count =
            f.key === 'all' ? notifications.length : notifications.filter((n) => n.type === f.key).length;
          if (f.key !== 'all' && count === 0) return null;
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(f.key)}
              className={cn(
                'flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[11.5px] font-semibold transition-colors',
                active
                  ? 'border-gold-deep bg-gold-deep text-on-dark'
                  : 'border-ink/15 bg-white text-ink/70 hover:border-gold-deep/50 hover:text-ink',
              )}
            >
              {f.label}
              <span
                className={cn(
                  'rounded-full px-1.5 text-[10px] font-bold',
                  active ? 'bg-white/20 text-on-dark' : 'bg-ink/5 text-muted-foreground',
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="mt-6">
        {loading && notifications.length === 0 ? (
          <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading notifications">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-4 rounded-lg border border-ink/10 bg-white p-4"
              >
                <div className="size-10 animate-pulse rounded-full bg-ink/5" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-24 animate-pulse rounded bg-ink/5" />
                  <div className="h-4 w-3/4 animate-pulse rounded bg-ink/5" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-ink/5" />
                </div>
              </div>
            ))}
          </div>
        ) : failed ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-brick/30 bg-brick/[0.04] px-6 py-10 text-center">
            <AlertTriangle className="size-7 text-brick" />
            <p className="text-[14px] font-semibold text-ink">Couldn&apos;t load your notifications</p>
            <p className="text-[12.5px] text-muted-foreground">
              This looks like a temporary hiccup — nothing is lost.
            </p>
            <Button
              onClick={load}
              className="mt-2 h-10 bg-gold-deep text-on-dark hover:bg-gold-deep/90"
            >
              Try again
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-ink/10 bg-white px-6 py-14 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-cream-deep">
              <BellRing className="size-6 text-gold-deep" />
            </span>
            <p className="text-[15px] font-semibold text-ink">
              {filter === 'all' ? 'You have no notifications yet' : `No ${TYPE_LABEL[filter as PortalNotification['type']] || 'notifications'} yet`}
            </p>
            <p className="max-w-sm text-[12.5px] leading-relaxed text-muted-foreground">
              When you book an appointment, receive an invoice, or place a shop order, a copy of
              every email lands here — plus your pre check-in reminders before each visit.
            </p>
            <Button
              asChild
              variant="outline"
              className="mt-2 h-10 border-gold-deep/60 bg-white text-gold-deep hover:bg-gold-deep/10"
            >
              <Link href="/book/appointment">Book an appointment</Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {buckets.map(({ bucket, items }) => (
              <section key={bucket} aria-label={BUCKET_LABEL[bucket]}>
                <h2 className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  {BUCKET_LABEL[bucket]}
                </h2>
                <ul className="flex flex-col gap-2">
                  {items.map((n) => {
                    const Icon = TYPE_ICON[n.type] || Bell;
                    const unreadRow = !n.readAt;
                    const inner = (
                      <>
                        <span
                          className={cn(
                            'mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border',
                            unreadRow
                              ? 'border-gold-deep/40 bg-gold-deep/10 text-gold-deep'
                              : 'border-border bg-muted/60 text-muted-foreground',
                          )}
                        >
                          <Icon className="size-[18px]" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                              {TYPE_LABEL[n.type] || 'Update'}
                            </span>
                            <span className="text-[10.5px] text-muted-foreground/80">
                              {timeAgo(n.createdAt)}
                            </span>
                            {unreadRow && (
                              <span className="rounded-full bg-gold-deep/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-gold-deep">
                                New
                              </span>
                            )}
                          </span>
                          <span
                            className={cn(
                              'mt-1 block text-[14px] leading-snug',
                              unreadRow ? 'font-semibold text-ink' : 'font-medium text-ink/80',
                            )}
                          >
                            {n.title}
                          </span>
                          {n.body && (
                            <span className="mt-1 block text-[12.5px] leading-relaxed text-muted-foreground">
                              {n.body}
                            </span>
                          )}
                        </span>
                        {unreadRow && (
                          <span
                            aria-hidden="true"
                            className="mt-2 size-2.5 shrink-0 rounded-full bg-gold-deep"
                          />
                        )}
                      </>
                    );
                    return (
                      <li key={n.id}>
                        {n.link ? (
                          <Link
                            href={n.link}
                            onClick={() => unreadRow && markRead(n.id)}
                            className={cn(
                              'flex gap-4 rounded-lg border p-4 transition-colors',
                              'hover:border-gold-deep/40 hover:bg-cream/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                              unreadRow
                                ? 'border-gold-deep/25 bg-gold-deep/[0.04]'
                                : 'border-ink/10 bg-white',
                            )}
                          >
                            {inner}
                          </Link>
                        ) : (
                          <button
                            onClick={() => unreadRow && markRead(n.id)}
                            className={cn(
                              'flex w-full gap-4 rounded-lg border p-4 text-left transition-colors',
                              'hover:border-gold-deep/40 hover:bg-cream/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                              unreadRow
                                ? 'border-gold-deep/25 bg-gold-deep/[0.04]'
                                : 'border-ink/10 bg-white',
                            )}
                          >
                            {inner}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* Loading more indicator while refreshing with data on screen */}
      {loading && notifications.length > 0 && (
        <p className="mt-4 flex items-center justify-center gap-2 text-[11.5px] text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> Refreshing…
        </p>
      )}
    </div>
  );
}
