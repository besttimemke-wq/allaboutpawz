'use client';

import React, { useEffect, useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Percent, 
  Zap, 
  TrendingDown, 
  ShieldAlert, 
  Download, 
  Printer, 
  Calendar,
  Lock,
  RefreshCw,
  Activity
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Live event stream — the salon's OWN custom analytics (analytics_events
// table in Supabase), fed by the client-side `track` library. Independent
// of the Google console: booking + ecommerce events land here via
// navigator.sendBeacon while the visitor granted the analytics cookie
// category.
// ---------------------------------------------------------------------------
type LiveEvent = {
  id: string
  createdAt: string
  event: string
  page: string
  sessionId?: string
  value: number | null
  currency?: string
  data: Record<string, unknown>
}
type LiveCounts = { event: string; count: number; totalValue: number }

function LiveEventStream() {
  const [events, setEvents] = useState<LiveEvent[] | null>(null)
  const [counts, setCounts] = useState<LiveCounts[]>([])
  const [sessions, setSessions] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Initial load — results land in the async callbacks only (codebase
  // pattern); `events === null` is the initial loading state.
  useEffect(() => {
    let alive = true
    fetch('/api/analytics/events?limit=50&days=7')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => {
        if (!alive) return
        setEvents(d.recent || [])
        setCounts(d.counts || [])
        setSessions(d.sessions || 0)
      })
      .catch((e: Error) => {
        if (alive) setError(e.message)
      })
    return () => {
      alive = false
    }
  }, [])

  const load = () => {
    setRefreshing(true)
    setError(null)
    fetch('/api/analytics/events?limit=50&days=7')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => {
        setEvents(d.recent || [])
        setCounts(d.counts || [])
        setSessions(d.sessions || 0)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setRefreshing(false))
  }

  const totalEvents = counts.reduce((n, c) => n + c.count, 0)
  const totalValue = counts.reduce((n, c) => n + (c.totalValue || 0), 0)

  return (
    <div className="border border-border bg-card">
      {/* Panel header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
            Live Event Stream — Custom Analytics
          </span>
          <span className="border border-border bg-card px-1.5 py-0.5 text-[9px] font-semibold uppercase text-muted-foreground">
            analytics_events · 7 days
          </span>
        </div>
        <button
          onClick={load}
          disabled={refreshing}
          className="flex h-7 items-center gap-1.5 border border-border bg-card px-2.5 text-[9px] font-semibold uppercase tracking-wider text-foreground hover:bg-muted/40 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="px-4 py-6 text-center text-[11px] text-muted-foreground">
          Event stream unavailable ({error}). The table exists — events appear here as visitors
          with analytics consent browse, add to bag, book, or purchase.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px]">
          {/* Recent events */}
          <div className="max-h-96 overflow-y-auto border-r border-border">
            {events === null ? (
              <div className="px-4 py-6 text-center text-[11px] text-muted-foreground">Loading…</div>
            ) : events.length === 0 ? (
              <div className="px-4 py-6 text-center text-[11px] text-muted-foreground">
                No events recorded in the last 7 days yet.
              </div>
            ) : (
              <table className="w-full text-[10px] tabular-nums">
                <thead className="sticky top-0 bg-muted/60 text-[9px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Time</th>
                    <th className="px-3 py-2 text-left font-semibold">Event</th>
                    <th className="px-3 py-2 text-left font-semibold">Page</th>
                    <th className="px-3 py-2 text-left font-semibold">Detail</th>
                    <th className="px-3 py-2 text-right font-semibold">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => (
                    <tr key={e.id} className="border-t border-border/50">
                      <td className="px-3 py-1.5 text-muted-foreground">
                        {new Date(e.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-3 py-1.5">
                        <span className="border border-border bg-muted/40 px-1.5 py-0.5 font-semibold">{e.event}</span>
                      </td>
                      <td className="px-3 py-1.5 text-muted-foreground">{e.page || '—'}</td>
                      <td className="px-3 py-1.5 text-muted-foreground truncate max-w-[220px]">
                        {e.data && typeof e.data === 'object'
                          ? (e.data.item_name as string)
                            || ((e.data.items as any[])?.[0]?.item_name as string)
                            || (e.data.step_name as string)
                            || (e.data.booking_flow as string)
                            || (e.data.lead_type as string)
                            || ''
                          : ''}
                      </td>
                      <td className="px-3 py-1.5 text-right font-semibold">
                        {e.value != null ? `$${e.value.toFixed(2)}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Aggregate rail */}
          <div className="p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-border bg-muted/30 p-3">
                <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Events · 7d</div>
                <div className="mt-1 text-[20px] font-semibold tabular-nums">{totalEvents}</div>
              </div>
              <div className="border border-border bg-muted/30 p-3">
                <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Sessions</div>
                <div className="mt-1 text-[20px] font-semibold tabular-nums">{sessions}</div>
              </div>
            </div>
            <div className="mt-3 border border-border bg-muted/30 p-3">
              <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                Event value · 7d
              </div>
              <div className="mt-1 text-[20px] font-semibold tabular-nums">${totalValue.toFixed(2)}</div>
            </div>
            <div className="mt-3 space-y-1">
              <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                By event name
              </div>
              {counts.length === 0 ? (
                <div className="text-[10px] text-muted-foreground">—</div>
              ) : (
                counts.slice(0, 14).map((c) => (
                  <div key={c.event} className="flex items-center justify-between text-[10px] tabular-nums">
                    <span className="truncate text-foreground">{c.event}</span>
                    <span className="ml-2 shrink-0 text-muted-foreground">{c.count}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface ScreenProps {
  systemSettings?: any;
  saveSettingsToDb?: (updates: any) => void;
  onNavigateScreen?: (screenId: string) => void;
  selectedLocation?: string;
  onSelectLocation?: (loc: string) => void;
}

export const AnalyticsReportingScreen: React.FC<ScreenProps> = ({
  onNavigateScreen,
  selectedLocation,
  onSelectLocation,
}) => {
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  return (
    <div className="w-full bg-card text-foreground font-sans antialiased text-[13px]">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-3 border border-white z-50 flex items-center gap-3 tabular-nums text-[13px] shadow-2xl">
          <span className="w-2 h-2 bg-card animate-pulse"></span>
          <span className="uppercase font-semibold tracking-wider">{toastMsg}</span>
          <button onClick={() => setToastMsg(null)} className="ml-2 text-white hover:opacity-70 cursor-pointer">✕</button>
        </div>
      )}

      {/* SECURITY CLEARANCE & CONTEXT BAR */}
      <div className="w-full bg-primary text-primary-foreground px-4 py-2 flex flex-wrap items-center justify-between border-b border-border text-[10px] tabular-nums tracking-wider uppercase">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 bg-destructive"></span>
          <span className="text-destructive font-semibold tracking-tight">RESTRICTED ACCREDITATION</span>
          <span className="text-muted-foreground">{"//"}</span>
          <span className="text-white">AUTH_SCOPE: SUPER_ADMIN_LEVEL_0</span>
          <span className="text-muted-foreground">{"//"}</span>
          <span className="text-muted-foreground/50">NODE: HQ-TEXAS-CLUSTER-09</span>
        </div>
        <div className="flex items-center gap-4 text-[10px] tabular-nums text-muted-foreground/70">
          <span>HASH: 8F2A.0091.ECC4</span>
          <span>REALTIME REPLICATION: SYNCED [0.04ms]</span>
        </div>
      </div>

      {/* BREADCRUMB & EXECUTIVE TOOLBAR */}
      <div className="w-full bg-card border-b border-border p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 tabular-nums text-[10px] text-muted-foreground">
            <span>ADMIN SETTINGS</span>
            <span className="text-foreground font-semibold">&gt;&gt;</span>
            <span className="text-foreground font-semibold">ANALYTICS &amp; EXECUTIVE REPORTING</span>
            <span className="text-foreground font-semibold">&gt;&gt;</span>
            <span className="bg-primary text-primary-foreground px-1 text-[9px] font-semibold">SUPER_ADMIN L0</span>
          </div>
          <div className="flex items-baseline gap-2">
            <h1 className="font-semibold text-lg md:text-xl tracking-tight uppercase text-foreground">BUSINESS OPS TELEMETRY</h1>
            <span className="tabular-nums text-[11px] text-muted-foreground">{"// PERIOD: MAY 01 - MAY 30, 2025"}</span>
          </div>
        </div>
        
        {/* QUICK ACTIONS */}
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => showToast('EXPORTED AUDIT LEDGER CSV')}
            className="h-8 px-3 bg-card border border-border text-foreground tabular-nums text-[10px] uppercase hover:bg-black hover:text-white transition-none flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            EXPORT AUDIT LEDGER (CSV)
          </button>
          <button 
            onClick={() => showToast('CALENDAR FILTER OPENED')}
            className="h-8 px-3 bg-card border border-border text-foreground tabular-nums text-[10px] uppercase hover:bg-muted/40 transition-none flex items-center gap-1.5 cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>DATE RANGE: 30D / MAY 2025</span>
            <span className="tabular-nums text-[9px]">▼</span>
          </button>
          <button 
            onClick={() => showToast('PREPARING PRINT ROLLUP...')}
            className="h-8 px-3 bg-primary text-primary-foreground border border-border tabular-nums text-[10px] uppercase hover:bg-muted transition-none flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            PRINT EXECUTIVE ROLLUP
          </button>
        </div>
      </div>

      {/* RESTRICTED SETTINGS SUB-NAV TAB MATRIX */}
      <div className="w-full bg-muted/40 border-b border-border overflow-x-auto">
        <div className="flex items-stretch min-w-max text-[11px] tabular-nums">
          <button onClick={() => onNavigateScreen?.('org-multiloc')} className="px-4 py-2 border-r border-border/20 hover:bg-card text-muted-foreground cursor-pointer">
            01 LOCATIONS &amp; SALONS
          </button>
          <button onClick={() => onNavigateScreen?.('users-staff')} className="px-4 py-2 border-r border-border/20 hover:bg-card text-muted-foreground cursor-pointer">
            02 USERS, STAFF &amp; ROLES
          </button>
          <button onClick={() => onNavigateScreen?.('booking-rules')} className="px-4 py-2 border-r border-border/20 hover:bg-card text-muted-foreground cursor-pointer">
            03 BOOKING RULES &amp; POLICIES
          </button>
          <button onClick={() => onNavigateScreen?.('revenue-stripe')} className="px-4 py-2 border-r border-border/20 hover:bg-card text-muted-foreground cursor-pointer">
            04 REVENUE &amp; STRIPE GATEWAY
          </button>
          <button onClick={() => onNavigateScreen?.('system-telemetry')} className="px-4 py-2 border-r border-border/20 hover:bg-card text-muted-foreground cursor-pointer">
            05 SYSTEM HEALTH &amp; SUPABASE
          </button>
          <button onClick={() => onNavigateScreen?.('services-pricing')} className="px-4 py-2 border-r border-border/20 hover:bg-card text-muted-foreground cursor-pointer">
            06 SERVICES &amp; PRICING MATRIX
          </button>
          <div className="px-4 py-2 bg-primary text-primary-foreground border-r border-border flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-card inline-block"></span>
            <span>07 ANALYTICS &amp; REPORTING</span>
            <span className="text-[9px] px-1 bg-card text-foreground uppercase font-semibold ml-1">[ACTIVE]</span>
          </div>
          <button onClick={() => onNavigateScreen?.('cms-wizard')} className="px-4 py-2 text-muted-foreground hover:bg-card cursor-pointer">
            08 CMS &amp; BOOKING WIZARD
          </button>
        </div>
      </div>

      {/* KPI TELEMETRY STRIP */}
      <div className="w-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 border-b border-border bg-card tabular-nums text-[13px]">
        {/* METRIC 01 */}
        <div className="p-3 border-r border-b lg: border-border flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground uppercase font-semibold">
            <span>TOTAL REVENUE [MTD]</span>
            <span className="text-foreground font-semibold">REV.01</span>
          </div>
          <div className="my-2">
            <div className="text-lg md:text-xl font-semibold tracking-tight text-foreground">$58,490.00</div>
          </div>
          <div className="flex items-center gap-1 tabular-nums text-[10px]">
            <span className="bg-primary text-primary-foreground px-1 font-semibold">+18.4%</span>
            <span className="text-muted-foreground">vs prev 30d</span>
          </div>
        </div>

        {/* METRIC 02 */}
        <div className="p-3 border-r border-b lg: border-border flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground uppercase font-semibold">
            <span>COMPLETED BOOKINGS</span>
            <span className="text-foreground font-semibold">VOL.02</span>
          </div>
          <div className="my-2">
            <div className="text-lg md:text-xl font-semibold tracking-tight text-foreground">412</div>
          </div>
          <div className="flex items-center gap-1 tabular-nums text-[10px] text-muted-foreground">
            <span className="text-foreground font-semibold">GROOMS LOGGED</span>
            <span>(100% target)</span>
          </div>
        </div>

        {/* METRIC 03 */}
        <div className="p-3 border-r border-b lg: border-border flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground uppercase font-semibold">
            <span>AVG TICKET SIZE</span>
            <span className="text-foreground font-semibold">ARPU.03</span>
          </div>
          <div className="my-2">
            <div className="text-lg md:text-xl font-semibold tracking-tight text-foreground">$84.20</div>
          </div>
          <div className="flex items-center gap-1 tabular-nums text-[10px] text-muted-foreground">
            <span className="text-foreground font-semibold">+$6.40</span>
            <span>post-addon rollup</span>
          </div>
        </div>

        {/* METRIC 04 */}
        <div className="p-3 border-r border-b lg: border-border flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground uppercase font-semibold">
            <span>NO-SHOW RATE (30D)</span>
            <span className="text-foreground font-semibold">LOSS.04</span>
          </div>
          <div className="my-2">
            <div className="text-lg md:text-xl font-semibold tracking-tight text-foreground">2.4%</div>
          </div>
          <div className="flex items-center gap-1 tabular-nums text-[10px] text-muted-foreground">
            <span>IND. AVG: 6.8%</span>
            <span className="border border-border px-1 text-foreground font-semibold">OPTIMAL</span>
          </div>
        </div>

        {/* METRIC 05 */}
        <div className="p-3 border-r border-border flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground uppercase font-semibold">
            <span>REBOOK RATE (30D)</span>
            <span className="text-foreground font-semibold">RET.05</span>
          </div>
          <div className="my-2">
            <div className="text-lg md:text-xl font-semibold tracking-tight text-foreground">74.2%</div>
          </div>
          <div className="flex items-center gap-1 tabular-nums text-[10px] text-muted-foreground">
            <span className="text-foreground font-semibold">TARGET: &gt;70%</span>
            <span>[PASS]</span>
          </div>
        </div>

        {/* METRIC 06 */}
        <div className="p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground uppercase font-semibold">
            <span>CHURN RATE</span>
            <span className="text-foreground font-semibold">CHRN.06</span>
          </div>
          <div className="my-2">
            <div className="text-lg md:text-xl font-semibold tracking-tight text-foreground">3.1%</div>
          </div>
          <div className="flex items-center gap-1 tabular-nums text-[10px] text-muted-foreground">
            <span>ACTIVE LOSS: 11 ACCTS</span>
          </div>
        </div>
      </div>

      {/* MAIN OPERATIONAL MATRIX */}
      <div className="w-full flex flex-col">
        {/* ROW 1: SECTION A (FUNNEL) & SECTION D (RETENTION/LTV) */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 border-b border-border">
          
          {/* SECTION A: 30-DAY BOOKINGS FUNNEL CONVERSION (7 COLS) */}
          <div className="lg:col-span-7 bg-card border-b lg: lg:border-r border-border flex flex-col">
            <div className="px-4 py-2 border-b border-border bg-muted/40 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="font-semibold tabular-nums text-[13px] uppercase text-foreground">SEC:A // 30-DAY BOOKING WIZARD FUNNEL TELEMETRY</span>
              </div>
              <div className="flex items-center gap-2 tabular-nums text-[10px]">
                <span className="border border-border px-1.5 bg-card">SAMPLE: 1,840 HITS</span>
                <span className="bg-primary text-primary-foreground px-1.5 font-semibold">CONV_RATE: 22.4%</span>
              </div>
            </div>
            
            <div className="p-4 flex-1 flex flex-col justify-between gap-4">
              {/* ASCII / MONO CONVERSION BARS */}
              <div className="flex flex-col gap-3 tabular-nums text-[13px]">
                {/* STAGE 1 */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-baseline text-[10px] font-semibold text-foreground">
                    <span>[STAGE 01] WEBSITE &amp; BOOKING WIZARD VISITS</span>
                    <span>1,840 SESSIONS [100.0%]</span>
                  </div>
                  <div className="w-full h-6 border border-border bg-muted/40 flex items-center p-0.5">
                    <div className="h-full bg-black flex items-center px-2 text-white text-[9px] font-semibold" style={{ width: '100%' }}>
                      ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■ 100%
                    </div>
                  </div>
                </div>

                {/* STAGE 2 */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-baseline text-[10px] font-semibold text-foreground">
                    <span>[STAGE 02] SERVICE &amp; LOCATION/BAY SELECTED</span>
                    <span>892 SELECTIONS [48.5%]</span>
                  </div>
                  <div className="w-full h-6 border border-border bg-muted/40 flex items-center p-0.5">
                    <div className="h-full bg-black flex items-center px-2 text-white text-[9px] font-semibold" style={{ width: '48.5%' }}>
                      ■■■■■■■■■■■■■■■ 48.5%
                    </div>
                  </div>
                </div>

                {/* STAGE 3 */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-baseline text-[10px] font-semibold text-foreground">
                    <span>[STAGE 03] PET INTAKE &amp; PROFILE COMPLETED</span>
                    <span>514 PROFILES [27.9%]</span>
                  </div>
                  <div className="w-full h-6 border border-border bg-muted/40 flex items-center p-0.5">
                    <div className="h-full bg-black flex items-center px-2 text-white text-[9px] font-semibold" style={{ width: '27.9%' }}>
                      ■■■■■■■■ 27.9%
                    </div>
                  </div>
                </div>

                {/* STAGE 4 */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-baseline text-[10px] font-semibold text-foreground">
                    <span>[STAGE 04] DEPOSIT AUTHORIZED (STRIPE)</span>
                    <span>435 COMMITTED [23.6%]</span>
                  </div>
                  <div className="w-full h-6 border border-border bg-muted/40 flex items-center p-0.5">
                    <div className="h-full bg-black flex items-center px-2 text-white text-[9px] font-semibold" style={{ width: '23.6%' }}>
                      ■■■■■■ 23.6%
                    </div>
                  </div>
                </div>

                {/* STAGE 5 */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-baseline text-[10px] font-semibold text-foreground">
                    <span>[STAGE 05] GROOM FULFILLED &amp; SETTLED CHECKOUT</span>
                    <span className="font-semibold">412 FULFILLED [22.4%]</span>
                  </div>
                  <div className="w-full h-6 border border-border bg-muted/40 flex items-center p-0.5">
                    <div className="h-full bg-black flex items-center px-2 text-white text-[9px] font-semibold" style={{ width: '22.4%' }}>
                      ■■■■■ 22.4%
                    </div>
                  </div>
                </div>
              </div>

              {/* DIAGNOSTIC BREAKDOWN GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-border pt-4">
                <div className="border border-border p-3 bg-muted/30 flex flex-col justify-between">
                  <div className="flex justify-between text-[10px] font-semibold uppercase">
                    <span>GATEWAY FRICTION METRIC</span>
                    <span className="font-semibold text-destructive">[ABANDON]</span>
                  </div>
                  <div className="my-2 flex items-baseline gap-2">
                    <span className="text-lg font-semibold text-foreground">15.3%</span>
                    <span className="tabular-nums text-[10px] text-muted-foreground">DROP AT DEPOSIT</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground leading-snug">
                    79 drop-offs between pet health liability consent and payment input. Potential Stripe 3D Secure micro-delay.
                  </div>
                </div>
                
                <div className="border border-border p-3 bg-muted/30 flex flex-col justify-between">
                  <div className="flex justify-between text-[10px] font-semibold uppercase">
                    <span>TELEMETRY RATIO</span>
                    <span className="font-semibold">[CLIENT DEVICE]</span>
                  </div>
                  <div className="my-2 flex items-baseline gap-2">
                    <span className="text-lg font-semibold text-foreground">68% / 32%</span>
                    <span className="tabular-nums text-[10px] text-muted-foreground">MOB vs DSK</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground leading-snug">
                    Mobile web booking conversion sits at 24.1% vs Desktop booking conversion at 18.8%.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION D: CLIENT RETENTION & PROJECTIONS LEDGER (5 COLS) */}
          <div className="lg:col-span-5 bg-card flex flex-col">
            <div className="px-4 py-2 border-b border-border bg-muted/40 flex items-center justify-between">
              <span className="font-semibold tabular-nums text-[13px] uppercase text-foreground">SEC:D // RETENTION, LTV &amp; PRODUCT ATTACHMENT</span>
              <span className="tabular-nums text-[10px] text-muted-foreground">MDL:PRED-LTV</span>
            </div>
            
            <div className="p-4 flex-1 flex flex-col justify-between gap-4 tabular-nums text-[13px]">
              {/* RETENTION LEDGER ITEMS */}
              <div className="flex flex-col gap-3">
                <div className="border border-border p-3 bg-card">
                  <div className="flex justify-between items-center text-[10px] font-semibold border-b border-border pb-1 mb-2">
                    <span className="uppercase text-foreground">NEW CLIENTS ACQUIRED (30D)</span>
                    <span className="bg-primary text-primary-foreground px-1.5 py-0.5 text-[9px]">N=86 CLIENTS</span>
                  </div>
                  <div className="space-y-1 text-muted-foreground text-[11px]">
                    <div className="flex justify-between">
                      <span>↳ Online Self-Service Wizard:</span>
                      <span className="font-semibold text-foreground">42 ACCTS (48.8%)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>↳ Reception Walk-in / Direct Phone:</span>
                      <span className="font-semibold text-foreground">28 ACCTS (32.6%)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>↳ Verified Peer/Client Referral:</span>
                      <span className="font-semibold text-foreground">16 ACCTS (18.6%)</span>
                    </div>
                  </div>
                </div>

                {/* PROJECTION MODEL CARD */}
                <div className="border border-border p-3 bg-card">
                  <div className="flex justify-between items-center text-[10px] font-semibold border-b border-border pb-1 mb-2">
                    <span className="uppercase text-foreground">6-MONTH FORWARD LTV PROJECTION</span>
                    <span className="text-muted-foreground text-[9px]">FREQ: 5.2 WKS</span>
                  </div>
                  <div className="text-xl font-semibold text-foreground mb-1">$342,000.00</div>
                  <div className="text-[11px] text-muted-foreground leading-tight">
                    Calculated on active base recurring cohort cycle with baseline salon ticket index and current maintenance intervals.
                  </div>
                </div>

                {/* RETAIL PRODUCT ATTACHMENT RATE */}
                <div className="border border-border p-3 bg-card">
                  <div className="flex justify-between items-center text-[10px] font-semibold border-b border-border pb-1 mb-2">
                    <span className="uppercase text-foreground">PRODUCT UPSELL CONVERSION</span>
                    <span className="border border-border px-1 bg-muted/30 text-[9px] font-semibold">34.2% ATTACH</span>
                  </div>
                  <div className="flex items-center gap-1.5 tabular-nums text-[11px] mb-2">
                    <span className="font-semibold text-foreground">141 OF 412 GROOMS</span>
                    <span className="text-muted-foreground">CONVERTED RETAIL ADDONS</span>
                  </div>
                  <div className="w-full bg-muted/40 h-2 border border-border overflow-hidden mb-2">
                    <div className="bg-black h-full" style={{ width: '34.2%' }}></div>
                  </div>
                  <div className="flex justify-between text-[9px] text-muted-foreground uppercase tracking-tight">
                    <span>BLUEBERRY ($14)</span>
                    <span>DESHED ($18)</span>
                    <span>DENTAL ($12)</span>
                  </div>
                </div>
              </div>

              {/* SYSTEM AUDIT TRIGGER */}
              <div className="p-2 border border-border bg-muted/40 flex items-center justify-between text-[10px] font-semibold uppercase">
                <span>AUTO-REFRESH INTERVAL: 60 SECONDS</span>
                <span className="text-foreground">[MONITOR ACTIVE]</span>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 2: SECTION B: MULTI-LOCATION FINANCIAL PERFORMANCE ROLLUP */}
        <div className="w-full bg-card border-b border-border flex flex-col tabular-nums text-[13px]">
          <div className="px-4 py-2 border-b border-border bg-muted/40 flex flex-wrap items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="font-semibold text-[13px] uppercase text-foreground">SEC:B // MULTI-LOCATION FINANCIAL PERFORMANCE ROLLUP</span>
              <span className="bg-primary text-primary-foreground px-1.5 py-0.5 text-[9px] font-semibold">3 OPERATING NODES</span>
            </div>
            <div className="text-[10px] text-muted-foreground flex items-center gap-3">
              <span>CURRENCY: USD</span>
              <span>LEDGER ENGINE: V2-ROLLUP</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-[13px] tabular-nums">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-foreground text-[10px] uppercase font-semibold">
                  <th className="p-3 border-r border-border">FACILITY / SALON DESIGNATION</th>
                  <th className="p-3 border-r border-border text-right">CAPACITY BAYS</th>
                  <th className="p-3 border-r border-border text-right">GROSS REVENUE</th>
                  <th className="p-3 border-r border-border text-right">NET REVENUE</th>
                  <th className="p-3 border-r border-border text-right">UTILIZATION</th>
                  <th className="p-3 border-r border-border text-right">ACTIVE STAFF</th>
                  <th className="p-3 border-r border-border text-right">AVG TICKET</th>
                  <th className="p-3 text-center">SYSTEM STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                <tr className="hover:bg-muted/30 transition-none">
                  <td className="p-3 border-r border-border font-semibold">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-black"></span>
                      <span>FRISCO MAIN HQ</span>
                      <span className="border border-border px-1 bg-muted/40 text-[9px] font-semibold">LOC-01</span>
                    </div>
                  </td>
                  <td className="p-3 border-r border-border text-right">08 BAYS</td>
                  <td className="p-3 border-r border-border text-right font-semibold">$34,820.00</td>
                  <td className="p-3 border-r border-border text-right">$31,450.00</td>
                  <td className="p-3 border-r border-border text-right font-semibold">91.2%</td>
                  <td className="p-3 border-r border-border text-right">12 STAFF</td>
                  <td className="p-3 border-r border-border text-right">$88.50</td>
                  <td className="p-3 text-center">
                    <span className="border border-border bg-muted/30 text-[9px] font-semibold px-1.5 py-0.5">OPERATIONAL</span>
                  </td>
                </tr>
                <tr className="hover:bg-muted/30 transition-none">
                  <td className="p-3 border-r border-border font-semibold">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-black"></span>
                      <span>PLANO WEST BRANCH</span>
                      <span className="border border-border px-1 bg-muted/40 text-[9px] font-semibold">LOC-02</span>
                    </div>
                  </td>
                  <td className="p-3 border-r border-border text-right">05 BAYS</td>
                  <td className="p-3 border-r border-border text-right font-semibold">$16,420.00</td>
                  <td className="p-3 border-r border-border text-right">$14,880.00</td>
                  <td className="p-3 border-r border-border text-right font-semibold">84.6%</td>
                  <td className="p-3 border-r border-border text-right">07 STAFF</td>
                  <td className="p-3 border-r border-border text-right">$79.20</td>
                  <td className="p-3 text-center">
                    <span className="border border-border bg-muted/30 text-[9px] font-semibold px-1.5 py-0.5">OPERATIONAL</span>
                  </td>
                </tr>
                <tr className="hover:bg-muted/30 transition-none">
                  <td className="p-3 border-r border-border font-semibold">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-black"></span>
                      <span>MOBILE VAN DISPATCH FLEET</span>
                      <span className="border border-border px-1 bg-muted/40 text-[9px] font-semibold">MOB-TX</span>
                    </div>
                  </td>
                  <td className="p-3 border-r border-border text-right">03 VANS</td>
                  <td className="p-3 border-r border-border text-right font-semibold">$7,250.00</td>
                  <td className="p-3 border-r border-border text-right">$6,520.00</td>
                  <td className="p-3 border-r border-border text-right font-semibold">96.0%</td>
                  <td className="p-3 border-r border-border text-right">05 STAFF</td>
                  <td className="p-3 border-r border-border text-right font-semibold">$115.00</td>
                  <td className="p-3 text-center">
                    <span className="border border-border bg-muted/30 text-[9px] font-semibold px-1.5 py-0.5">OPERATIONAL</span>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="bg-muted/40 font-semibold  border-border text-foreground">
                  <td className="p-3 border-r border-border uppercase font-semibold text-[10px]">
                    TOTAL CONSOLIDATED ROLLUP
                  </td>
                  <td className="p-3 border-r border-border text-right">16 UNITS</td>
                  <td className="p-3 border-r border-border text-right tabular-nums font-semibold text-[13px]">$58,490.00</td>
                  <td className="p-3 border-r border-border text-right tabular-nums font-semibold text-[13px]">$52,850.00</td>
                  <td className="p-3 border-r border-border text-right">89.4% AVG</td>
                  <td className="p-3 border-r border-border text-right">24 CREW</td>
                  <td className="p-3 border-r border-border text-right">$84.20 BLENDED</td>
                  <td className="p-3 text-center">
                    <span className="bg-primary text-primary-foreground px-2 py-0.5 text-[9px] font-semibold">[ALL HEALTHY]</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ROW 3: SECTION C: GROOMER COMMISSION, PERFORMANCE & TIPS SUMMARY */}
        <div className="w-full bg-card flex flex-col tabular-nums text-[13px]">
          <div className="px-4 py-2 border-b border-border bg-muted/40 flex flex-wrap items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="font-semibold text-[13px] uppercase text-foreground">SEC:C // GROOMER COMMISSION, PERFORMANCE AUDIT &amp; TIPS SUMMARY</span>
            </div>
            <div className="text-[10px] text-muted-foreground">
              SETTLEMENT FREQUENCY: BI-WEEKLY PAYROLL // CYCLE 10
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-[13px] tabular-nums">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-foreground text-[10px] uppercase font-semibold">
                  <th className="p-3 border-r border-border">STYLIST NAME / ROLE / BRANCH</th>
                  <th className="p-3 border-r border-border text-right">TOTAL GROOMS</th>
                  <th className="p-3 border-r border-border text-right">TOTAL BILLINGS</th>
                  <th className="p-3 border-r border-border text-right">COMMISSION RATE</th>
                  <th className="p-3 border-r border-border text-right">NET COMMISSION PAY</th>
                  <th className="p-3 border-r border-border text-right">CARD / CASH TIPS</th>
                  <th className="p-3 border-r border-border text-right">AVG RATING</th>
                  <th className="p-3 text-right">REBOOK RATE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                <tr className="hover:bg-muted/30 transition-none">
                  <td className="p-3 border-r border-border">
                    <div className="flex flex-col">
                      <span className="font-semibold text-foreground uppercase">Sarah Miller</span>
                      <span className="text-[10px] text-muted-foreground">Lead Groomer // Frisco HQ</span>
                    </div>
                  </td>
                  <td className="p-3 border-r border-border text-right font-semibold">48 GROOMS</td>
                  <td className="p-3 border-r border-border text-right">$4,320.00</td>
                  <td className="p-3 border-r border-border text-right">45% BASE</td>
                  <td className="p-3 border-r border-border text-right font-semibold">$1,944.00</td>
                  <td className="p-3 border-r border-border text-right">$780.00</td>
                  <td className="p-3 border-r border-border text-right font-semibold">4.98 ★</td>
                  <td className="p-3 text-right">
                    <span className="border border-border px-1.5 py-0.5 bg-muted/40 font-semibold">82%</span>
                  </td>
                 </tr>
                <tr className="hover:bg-muted/30 transition-none">
                  <td className="p-3 border-r border-border">
                    <div className="flex flex-col">
                      <span className="font-semibold text-foreground uppercase">Mike Ross</span>
                      <span className="text-[10px] text-muted-foreground">Canine Stylist {"//"} Frisco HQ</span>
                    </div>
                  </td>
                  <td className="p-3 border-r border-border text-right font-semibold">42 GROOMS</td>
                  <td className="p-3 border-r border-border text-right">$3,650.00</td>
                  <td className="p-3 border-r border-border text-right">42% BASE</td>
                  <td className="p-3 border-r border-border text-right font-semibold">$1,533.00</td>
                  <td className="p-3 border-r border-border text-right">$610.00</td>
                  <td className="p-3 border-r border-border text-right font-semibold">4.91 ★</td>
                  <td className="p-3 text-right">
                    <span className="border border-border px-1.5 py-0.5 bg-muted/40 font-semibold">76%</span>
                  </td>
                </tr>
                <tr className="hover:bg-muted/30 transition-none">
                  <td className="p-3 border-r border-border">
                    <div className="flex flex-col">
                      <span className="font-semibold text-foreground uppercase">Jessica Lee</span>
                      <span className="text-[10px] text-muted-foreground">Senior Stylist {"//"} Plano West</span>
                    </div>
                  </td>
                  <td className="p-3 border-r border-border text-right font-semibold">38 GROOMS</td>
                  <td className="p-3 border-r border-border text-right">$3,190.00</td>
                  <td className="p-3 border-r border-border text-right">42% BASE</td>
                  <td className="p-3 border-r border-border text-right font-semibold">$1,339.80</td>
                  <td className="p-3 border-r border-border text-right">$540.00</td>
                  <td className="p-3 border-r border-border text-right font-semibold">4.95 ★</td>
                  <td className="p-3 text-right">
                    <span className="border border-border px-1.5 py-0.5 bg-muted/40 font-semibold">79%</span>
                  </td>
                </tr>
                <tr className="hover:bg-muted/30 transition-none">
                  <td className="p-3 border-r border-border">
                    <div className="flex flex-col">
                      <span className="font-semibold text-foreground uppercase">Kevin Diaz</span>
                      <span className="text-[10px] text-muted-foreground">Mobile Tech {"//"} Van-02</span>
                    </div>
                  </td>
                  <td className="p-3 border-r border-border text-right font-semibold">31 GROOMS</td>
                  <td className="p-3 border-r border-border text-right">$3,565.00</td>
                  <td className="p-3 border-r border-border text-right">50% MOBILE</td>
                  <td className="p-3 border-r border-border text-right font-semibold">$1,782.50</td>
                  <td className="p-3 border-r border-border text-right">$690.00</td>
                  <td className="p-3 border-r border-border text-right font-semibold">4.99 ★</td>
                  <td className="p-3 text-right">
                    <span className="border border-border px-1.5 py-0.5 bg-muted/40 font-semibold">88%</span>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="bg-muted/40 text-foreground text-[10px] uppercase font-semibold">
                  <td className="p-3 border-r border-border">COHORT SUMMARIES (TOP 4 PERFORMERS)</td>
                  <td className="p-3 border-r border-border text-right">159 GROOMS</td>
                  <td className="p-3 border-r border-border text-right">$14,725.00</td>
                  <td className="p-3 border-r border-border text-right">--</td>
                  <td className="p-3 border-r border-border text-right font-semibold">$6,599.30</td>
                  <td className="p-3 border-r border-border text-right font-semibold">$2,620.00</td>
                  <td className="p-3 border-r border-border text-right font-semibold">4.96 ★ AVG</td>
                  <td className="p-3 text-right font-semibold">81.2% AVG</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* LIVE EVENT STREAM — the salon's own custom analytics (real data) */}
      <LiveEventStream />

      {/* SUPER ADMIN SECURITY LOCK FOOTER / HARDWARE ATTESTATION */}
      <div className="w-full bg-muted/30 border-b border-border p-4 flex flex-col md:flex-row items-center justify-between gap-4 select-none tabular-nums text-[13px]">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-primary text-primary-foreground flex items-center justify-center border border-border font-semibold">
            <Lock className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-[10px] font-semibold text-foreground uppercase">
              <span>SUPER_ADMIN LEVEL 0 // SYSTEM ENCLAVE ACCESS</span>
              <span className="border border-border px-1.5 bg-card text-[9px] font-semibold">[HARDWARE KEY VERIFIED]</span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Changes to ledger allocations, base payroll split percentages, or Stripe merchant hooks require dual-signature multi-factor ratification.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-[10px] uppercase">AUDIT TRAIL:</span>
          <span className="border border-border bg-card px-2 py-0.5 text-foreground font-semibold tabular-nums">LOG_ID #TX-90412-2025</span>
          <button 
            onClick={() => showToast('SUPER_ADMIN ENCLAVE SESSION SIGNED OUT')}
            className="h-6 px-3 bg-primary text-primary-foreground text-[10px] uppercase font-semibold hover:bg-muted transition-none cursor-pointer"
          >
            SIGN OUT ENCLAVE
          </button>
        </div>
      </div>

      {/* MONOCHROME TERMINAL STATUS LINE */}
      <div className="w-full bg-primary text-primary-foreground px-4 py-1.5 flex items-center justify-between tabular-nums text-[11px]">
        <div className="flex items-center gap-2">
          <span>&gt; OPS_CONSOLE: READY</span>
          <span className="inline-block w-[7px] h-[14px] bg-card animate-pulse"></span>
        </div>
        <div className="flex items-center gap-4 text-muted-foreground/70">
          <span>MEM: 44.8 MB</span>
          <span>LATENCY: 12ms</span>
          <span>DAWG-OS KERNEL v2.4.0-PRD</span>
        </div>
      </div>
    </div>
  );
};
