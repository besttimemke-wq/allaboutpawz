'use client';

import React, { useState } from 'react';

interface ScreenProps {
  onNavigateScreen?: (screenId: string) => void;
  selectedLocation?: string;
  onSelectLocation?: (loc: string) => void;
}

export const SystemTelemetryScreen: React.FC<ScreenProps> = ({
  onNavigateScreen,
}) => {
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [flushLoading, setFlushLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [filterGrep, setFilterGrep] = useState('');
  const [channelStatus, setChannelStatus] = useState<Record<string, string>>({
    stripe: '200 OK (42ms)',
    twilio: '200 OK (18ms)',
    sendgrid: '200 OK (31ms)',
  });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleSnapshot = () => {
    setSnapshotLoading(true);
    setTimeout(() => {
      setSnapshotLoading(false);
      showToast('SNAPSHOT S3 READY // IMMUTABLE BACKUP ARCHIVED');
    }, 1100);
  };

  const handleFlush = () => {
    setFlushLoading(true);
    setTimeout(() => {
      setFlushLoading(false);
      showToast('REDIS EDGE CACHE FLUSHED // 0 STALE KEYS');
    }, 800);
  };

  const handleRotateKeys = () => {
    if (confirm('WARNING: Rotating secret keys will require updating external webhook subscriptions. Proceed with KMS re-key?')) {
      showToast('KMS KEY ROTATION PROTOCOL QUEUED // RE-ENCRYPTION RUNNING');
    }
  };

  const pingChannel = (ch: string) => {
    setChannelStatus((prev) => ({ ...prev, [ch]: 'PINGING...' }));
    setTimeout(() => {
      const ms = Math.floor(Math.random() * 25) + 12;
      setChannelStatus((prev) => ({ ...prev, [ch]: `200 OK (${ms}ms)` }));
      showToast(`${ch.toUpperCase()} WEBHOOK PINGED: 200 OK (${ms}ms)`);
    }, 450);
  };

  const auditLogs = [
    {
      time: '14:02:11 CST',
      actor: 'David Chen',
      role: 'SYS ADMIN',
      ip: '76.184.11.4',
      intent: 'Auth: Hardware Key Challenge Verified',
      detail: 'FIDO2 WebAuthn Passkey: token_hw_99f2x',
      clearance: 'LEVEL-5 [FULL]',
      disposition: 'OK',
      blocked: false,
    },
    {
      time: '13:42:55 CST',
      actor: 'Jessica Lee',
      role: 'GROOMER (STAFF)',
      ip: '104.28.19.12',
      intent: 'Elevation Attempt: Financial Payouts Ledger Access',
      detail: 'Endpoint /api/v2/finance/payout-runs - Insufficient Scope',
      clearance: 'LEVEL-1 [BASE]',
      disposition: 'BLOCKED (403)',
      blocked: true,
    },
    {
      time: '12:15:30 CST',
      actor: 'Cron Daemon',
      role: 'INTERNAL SERVICE WORKER',
      ip: '127.0.0.1',
      intent: 'Dunning Batch: 3 notices dispatched',
      detail: 'Invoice references: INV-9812, INV-9819, INV-9821 via Twilio',
      clearance: 'DAEMON [SYS]',
      disposition: 'SUCCESS',
      blocked: false,
    },
    {
      time: '10:00:14 CST',
      actor: 'Stripe Webhook',
      role: 'PAYMENT INGESTION BOT',
      ip: '54.187.205.79',
      intent: 'Payout Settled: $4,120.00',
      detail: 'Trxn ID: po_1OaX90PawzSalonLedger to Chase Bank ending *4019',
      clearance: 'INTEGRATION',
      disposition: 'PROCESSED',
      blocked: false,
    },
  ];

  const filteredLogs = filterGrep.trim()
    ? auditLogs.filter(
        (l) =>
          l.actor.toLowerCase().includes(filterGrep.toLowerCase()) ||
          l.intent.toLowerCase().includes(filterGrep.toLowerCase()) ||
          l.ip.includes(filterGrep) ||
          l.disposition.toLowerCase().includes(filterGrep.toLowerCase())
      )
    : auditLogs;

  return (
    <div className="w-full bg-card text-foreground font-sans antialiased text-[13px]">
      {/* Toast Banner */}
      {toastMsg && (
        <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-3 border border-white z-50 flex items-center gap-3 tabular-nums text-[13px] shadow-2xl">
          <span className="w-2 h-2 bg-card animate-pulse"></span>
          <span className="uppercase font-semibold tracking-wider">{toastMsg}</span>
          <button onClick={() => setToastMsg(null)} className="ml-2 text-white hover:opacity-70 cursor-pointer">✕</button>
        </div>
      )}

      {/* Sub-Navigation Strip */}
      <div className="w-full bg-card border-b border-border overflow-x-auto select-none">
        <div className="flex items-center min-w-max">
          <div className="px-3 py-2 bg-muted/40 border-r border-border flex items-center gap-2">
            <span className="w-2 h-2 bg-black"></span>
            <span className="tabular-nums text-[11px] uppercase tracking-wider text-foreground font-semibold">MODULE // SETTINGS</span>
          </div>
          <nav className="flex items-center text-[13px] tabular-nums">
            {[
              { label: 'Overview', id: 'overview' },
              { label: 'Organization', id: 'org-multiloc' },
              { label: 'Users & Access', id: 'users-staff' },
              { label: 'Booking & Operations', id: 'booking-ops' },
              { label: 'Services & Pricing', id: 'services-pricing' },
              { label: 'Payments', id: 'payments-tax' },
              { label: 'Website', id: 'cms-wizard' },
              { label: 'Customer Portal', id: 'customer-portal' },
              { label: 'Communications', id: 'org-social' },
              { label: 'Inventory', id: 'oms-add-product' },
              { label: 'Reports', id: 'invoices-aging' },
              { label: '[12] System', id: 'system-telemetry', active: true },
            ].map((tab) => (
              <button
                key={tab.label}
                onClick={() => onNavigateScreen?.(tab.id)}
                className={`px-3 py-2 border-r border-border/30 tabular-nums text-[13px] cursor-pointer transition-none flex items-center gap-1.5 ${
                  tab.active
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : 'text-muted-foreground hover:bg-black hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                {tab.active && <span className="w-1.5 h-1.5 bg-card animate-pulse"></span>}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Control Bar & System Header */}
      <div className="w-full bg-card border-b border-border p-4 lg:p-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-[9px] tabular-nums uppercase tracking-wider px-2 py-0.5 border border-border bg-primary text-primary-foreground font-semibold">
                SEC:04 // SYSTEM CORE
              </span>
              <span className="text-[10px] tabular-nums text-muted-foreground uppercase">
                TELEMETRY // API ENGINE // RETENTION POLICIES
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-semibold uppercase tracking-tight text-foreground mt-1 font-sans">
              Supabase Engine, Webhook Listeners &amp; Security Logs
            </h1>
            <p className="text-[13px] tabular-nums text-muted-foreground">
              Global runtime telemetry, asynchronous webhook dispatch registries, and SOC-2 cryptographically signed ledger.
            </p>
          </div>

          {/* Action Button Group */}
          <div className="flex flex-wrap items-center gap-2 select-none">
            <button
              onClick={handleSnapshot}
              disabled={snapshotLoading}
              className="h-8 px-3 bg-primary text-primary-foreground border border-border tabular-nums text-[13px] uppercase hover:bg-card hover:text-foreground transition-none flex items-center gap-1.5 cursor-pointer"
            >
              <span>{snapshotLoading ? 'ARCHIVING WAL...' : 'Trigger Manual Snapshot'}</span>
            </button>
            <button
              onClick={handleFlush}
              disabled={flushLoading}
              className="h-8 px-3 bg-card text-foreground border border-border tabular-nums text-[13px] uppercase hover:bg-black hover:text-white transition-none flex items-center gap-1.5 cursor-pointer"
            >
              <span>{flushLoading ? 'FLUSHING REDIS...' : 'Flush Redis Cache'}</span>
            </button>
            <button
              onClick={handleRotateKeys}
              className="h-8 px-3 bg-card text-foreground border border-border tabular-nums text-[13px] uppercase hover:bg-black hover:text-white transition-none flex items-center gap-1.5 cursor-pointer"
            >
              <span>Rotate Secret Keys</span>
            </button>
            <div className="h-8 px-3 bg-muted/40 border border-border flex items-center gap-1.5 tabular-nums text-[13px] font-semibold text-foreground">
              <span className="inline-block w-2 h-2 bg-black"></span>
              <span>SYS:ONLINE</span>
            </div>
          </div>
        </div>
      </div>

      {/* Four-Up Telemetry Tiles */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 bg-black gap-px border-b border-border">
        <div className="bg-card p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] tabular-nums uppercase tracking-wider text-muted-foreground">NODE:DB // SUPABASE</span>
            <span className="text-[9px] tabular-nums border border-border px-1 bg-muted/40 text-foreground uppercase">PGSQL 15.1</span>
          </div>
          <div className="my-2">
            <div className="text-lg font-semibold font-sans uppercase text-foreground tracking-tight">HEALTHY</div>
            <div className="text-[13px] tabular-nums text-muted-foreground mt-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-black inline-block"></span>
              <span>14ms Direct Pooler Latency</span>
            </div>
          </div>
          <div className="pt-2 border-t border-border flex justify-between text-[9px] tabular-nums text-muted-foreground">
            <span>CONN POOL: 48/120</span>
            <span>TPS: 842.1</span>
          </div>
        </div>

        <div className="bg-card p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] tabular-nums uppercase tracking-wider text-muted-foreground">REALTIME // WEBSOCKET</span>
            <span className="text-[9px] tabular-nums border border-border px-1 bg-muted/40 text-foreground uppercase">ACTIVE</span>
          </div>
          <div className="my-2">
            <div className="text-lg font-semibold font-sans uppercase text-foreground tracking-tight">28 EDGE NODES</div>
            <div className="text-[13px] tabular-nums text-muted-foreground mt-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-black inline-block"></span>
              <span>Zero Frame Droppage</span>
            </div>
          </div>
          <div className="pt-2 border-t border-border flex justify-between text-[9px] tabular-nums text-muted-foreground">
            <span>BROADCAST: SYNCED</span>
            <span>CLIENTS: 312 CONC</span>
          </div>
        </div>

        <div className="bg-card p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] tabular-nums uppercase tracking-wider text-muted-foreground">ARCHIVE // S3 GLACIER</span>
            <span className="text-[9px] tabular-nums border border-border px-1 bg-muted/40 text-foreground uppercase">CRON:OK</span>
          </div>
          <div className="my-2">
            <div className="text-lg font-semibold font-sans uppercase text-foreground tracking-tight">COMPLETED</div>
            <div className="text-[13px] tabular-nums text-muted-foreground mt-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-black inline-block"></span>
              <span>Execution: 03:00 UTC</span>
            </div>
          </div>
          <div className="pt-2 border-t border-border flex justify-between text-[9px] tabular-nums text-muted-foreground">
            <span>DELTA: 4.82 GB</span>
            <span>NEXT RUN: 11H 14M</span>
          </div>
        </div>

        <div className="bg-card p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] tabular-nums uppercase tracking-wider text-muted-foreground">COMPLIANCE // ENCRYPTION</span>
            <span className="text-[9px] tabular-nums border border-border px-1 bg-primary text-primary-foreground uppercase font-semibold">TYPE-II</span>
          </div>
          <div className="my-2">
            <div className="text-lg font-semibold font-sans uppercase text-foreground tracking-tight">SOC2 VERIFIED</div>
            <div className="text-[13px] tabular-nums text-muted-foreground mt-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-black inline-block"></span>
              <span>AES-256 Envelope KMS</span>
            </div>
          </div>
          <div className="pt-2 border-t border-border flex justify-between text-[9px] tabular-nums text-muted-foreground">
            <span>TOKEN VAULT: ACTIVE</span>
            <span>AUDIT EXP: 342 DAYS</span>
          </div>
        </div>
      </div>

      {/* Main Split Workspace */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 bg-black gap-px border-b border-border">
        {/* SECTION 1: PLATFORM ENVIRONMENT & API WEBHOOKS (7 COLS) */}
        <div className="lg:col-span-7 bg-card flex flex-col">
          <div className="p-3 border-b border-border bg-muted/40 flex items-center justify-between tabular-nums text-[13px]">
            <span className="font-semibold uppercase text-foreground">
              SEC:04.1 // PLATFORM ENVIRONMENT &amp; API WEBHOOK LISTENERS
            </span>
            <span className="text-[9px] uppercase border border-border px-1 bg-card text-foreground">
              CLUSTER://US-CENTRAL-1
            </span>
          </div>

          <div className="p-3 border-b border-border bg-card">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 tabular-nums text-[13px]">
              <div className="p-2 border border-border bg-muted/30">
                <span className="text-[9px] text-muted-foreground uppercase block mb-1">ENVIRONMENT TYPE</span>
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-black"></span>
                  <span>Production (PROD-DALLAS-01)</span>
                </div>
                <span className="text-[9px] text-muted-foreground block mt-1">LATENCY TIER: TIER-1 ULTRA</span>
              </div>
              <div className="p-2 border border-border bg-muted/30">
                <span className="text-[9px] text-muted-foreground uppercase block mb-1">DATABASE ENGINE</span>
                <div className="font-semibold text-foreground">Supabase PostgreSQL 15.1</div>
                <span className="text-[9px] text-muted-foreground block mt-1">POOLER: DIRECT SUPAVISOR</span>
              </div>
              <div className="p-2 border border-border bg-muted/30">
                <span className="text-[9px] text-muted-foreground uppercase block mb-1">SSL / TRANSPORT</span>
                <div className="font-semibold text-foreground">TLS 1.3 / STRICT-HSTS</div>
                <span className="text-[9px] text-muted-foreground block mt-1">FINGERPRINT: SHA-256 VERIFIED</span>
              </div>
            </div>
          </div>

          {/* Webhook Registry Table */}
          <div className="flex-1 flex flex-col tabular-nums text-[13px]">
            <div className="px-3 py-1.5 bg-muted/40 border-b border-border flex items-center justify-between text-[10px]">
              <span className="font-semibold text-foreground uppercase">ACTIVE INGESTION HOOKS &amp; SUBSCRIPTIONS</span>
              <span className="text-muted-foreground">AUTO-POLLING: 1000MS</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-foreground text-[10px] uppercase font-semibold">
                    <th className="p-2.5">Provider // Endpoint</th>
                    <th className="p-2.5">Registered Events</th>
                    <th className="p-2.5">HTTP Status</th>
                    <th className="p-2.5 text-right">Trip Latency</th>
                    <th className="p-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 text-[11px]">
                  <tr className="hover:bg-muted/40">
                    <td className="p-2.5">
                      <div className="font-semibold text-foreground">Stripe Connect Engine</div>
                      <div className="text-[10px] text-muted-foreground">/api/v2/webhooks/stripe-ledger</div>
                    </td>
                    <td className="p-2.5">
                      <div className="flex flex-wrap gap-1">
                        <span className="text-[9px] border border-border px-1 bg-card text-foreground">charge.succeeded</span>
                        <span className="text-[9px] border border-border px-1 bg-card text-foreground">dispute.created</span>
                      </div>
                    </td>
                    <td className="p-2.5">
                      <span className="text-[9px] font-semibold border border-border px-1.5 py-0.5 bg-card text-foreground">
                        {channelStatus.stripe}
                      </span>
                    </td>
                    <td className="p-2.5 text-right font-semibold">42ms</td>
                    <td className="p-2.5 text-center">
                      <button
                        onClick={() => pingChannel('stripe')}
                        className="px-2 py-0.5 border border-border text-[9px] uppercase hover:bg-black hover:text-white cursor-pointer"
                      >
                        PING
                      </button>
                    </td>
                  </tr>

                  <tr className="hover:bg-muted/40">
                    <td className="p-2.5">
                      <div className="font-semibold text-foreground">Twilio SMS Gateway</div>
                      <div className="text-[10px] text-muted-foreground">/api/v2/webhooks/twilio-sms</div>
                    </td>
                    <td className="p-2.5">
                      <div className="flex flex-wrap gap-1">
                        <span className="text-[9px] border border-border px-1 bg-card text-foreground">message.delivered</span>
                        <span className="text-[9px] border border-border px-1 bg-card text-foreground">delivery.failed</span>
                      </div>
                    </td>
                    <td className="p-2.5">
                      <span className="text-[9px] font-semibold border border-border px-1.5 py-0.5 bg-card text-foreground">
                        {channelStatus.twilio}
                      </span>
                    </td>
                    <td className="p-2.5 text-right font-semibold">18ms</td>
                    <td className="p-2.5 text-center">
                      <button
                        onClick={() => pingChannel('twilio')}
                        className="px-2 py-0.5 border border-border text-[9px] uppercase hover:bg-black hover:text-white cursor-pointer"
                      >
                        PING
                      </button>
                    </td>
                  </tr>

                  <tr className="hover:bg-muted/40">
                    <td className="p-2.5">
                      <div className="font-semibold text-foreground">SendGrid Email Ingestion</div>
                      <div className="text-[10px] text-muted-foreground">/api/v2/webhooks/sendgrid-inbound</div>
                    </td>
                    <td className="p-2.5">
                      <div className="flex flex-wrap gap-1">
                        <span className="text-[9px] border border-border px-1 bg-card text-foreground">email.opened</span>
                        <span className="text-[9px] border border-border px-1 bg-card text-foreground">bounce.processed</span>
                      </div>
                    </td>
                    <td className="p-2.5">
                      <span className="text-[9px] font-semibold border border-border px-1.5 py-0.5 bg-card text-foreground">
                        {channelStatus.sendgrid}
                      </span>
                    </td>
                    <td className="p-2.5 text-right font-semibold">31ms</td>
                    <td className="p-2.5 text-center">
                      <button
                        onClick={() => pingChannel('sendgrid')}
                        className="px-2 py-0.5 border border-border text-[9px] uppercase hover:bg-black hover:text-white cursor-pointer"
                      >
                        PING
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="p-2.5 bg-muted/30 border-t border-border flex items-center justify-between text-[10px]">
              <span className="text-foreground font-semibold">[POLL STATUS] ALL CHANNELS NOMINAL</span>
              <span className="text-foreground font-semibold">SIG_VERIFY: ENFORCED</span>
            </div>
          </div>
        </div>

        {/* SECTION 2: DATA RETENTION & BACKUPS (5 COLS) */}
        <div className="lg:col-span-5 bg-card flex flex-col tabular-nums text-[13px]">
          <div className="p-3 border-b border-border bg-muted/40 flex items-center justify-between">
            <span className="font-semibold uppercase text-foreground">
              SEC:04.2 // DATA RETENTION &amp; BACKUPS
            </span>
            <span className="text-[9px] uppercase border border-border px-1 bg-card text-foreground">AWS S3 / ENCRYPT</span>
          </div>
          <div className="p-4 flex-1 flex flex-col gap-3 justify-between">
            <div className="p-3 border border-border bg-muted/30 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold uppercase text-foreground">Daily Automated Backups</span>
                <span className="text-[9px] px-1 bg-primary text-primary-foreground font-semibold uppercase">[ENABLED]</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Full snapshot generated every 24 hours at 03:00 UTC. Synced to immutable, cold-storage AWS S3 Glacier buckets.
              </p>
              <div className="mt-1 pt-1 border-t border-border flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">Retention Lifespan:</span>
                <span className="font-semibold text-foreground">90 Days Off-Site</span>
              </div>
            </div>

            <div className="p-3 border border-border bg-muted/30 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold uppercase text-foreground">Point-in-Time Recovery</span>
                <span className="text-[9px] px-1 bg-primary text-primary-foreground font-semibold uppercase">[PITR: ACTIVE]</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Continuous write-ahead log (WAL) archiving active. Restoration possible down to second-level granularity within past 14 days.
              </p>
              <div className="mt-1 pt-1 border-t border-border flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">WAL Target Stream:</span>
                <span className="font-semibold text-foreground">supabase://wal-s3-prod</span>
              </div>
            </div>

            <div className="p-3 border border-border bg-muted/30 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold uppercase text-foreground">PII Encryption at Rest</span>
                <span className="text-[9px] px-1 border border-border bg-card text-foreground font-semibold uppercase">[ENFORCED]</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                All customer credentials, phone numbers, and home addresses encrypted via AES-256 envelope vault keys. Card data tokenized via Stripe.
              </p>
              <div className="mt-1 pt-1 border-t border-border flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">Credit Card Buffer:</span>
                <span className="font-semibold text-foreground">ZERO-STORAGE STRICT</span>
              </div>
            </div>

            <div className="p-2.5 border border-border bg-primary text-primary-foreground flex items-center justify-between text-[13px]">
              <div className="flex items-center gap-2 font-semibold uppercase">
                <span>🛡 DISASTER RECOVERY READINESS: 99.999%</span>
              </div>
              <span className="text-[9px] bg-card text-foreground px-1 font-semibold">FAILOVER READY</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: SYSTEM SECURITY & REAL-TIME USER AUDIT LOG */}
      <div className="w-full bg-card flex flex-col tabular-nums text-[13px]">
        <div className="p-3 border-b border-border bg-muted/40 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground uppercase">SEC:04.3 // SYSTEM SECURITY &amp; USER AUDIT LEDGER</span>
            <span className="text-[9px] px-1 bg-primary text-primary-foreground font-semibold">[WORM STREAM]</span>
          </div>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1.5 font-semibold text-foreground">
              <span className="w-2 h-2 bg-black animate-ping"></span>
              LIVE TELEMETRY
            </span>
            <span className="text-muted-foreground">BUFFER: 4,096 LOGS IN-MEMORY</span>
          </div>
        </div>

        {/* Filter & Query Control Strip */}
        <div className="p-2 border-b border-border bg-muted/30 flex flex-wrap items-center justify-between gap-2 select-none">
          <div className="flex items-center gap-2 flex-1 max-w-lg">
            <span className="font-semibold text-foreground uppercase">FILTER //</span>
            <input
              value={filterGrep}
              onChange={(e) => setFilterGrep(e.target.value)}
              className="w-full h-7 bg-card border border-border px-2 text-[13px] focus:outline-none"
              placeholder="Grep events (e.g. 'BLOCKED', 'David Chen', '54.187...')"
              type="text"
            />
          </div>
          <div className="flex items-center gap-1">
            <button className="h-7 px-2 border border-border bg-card uppercase hover:bg-black hover:text-white cursor-pointer">Level: ALL</button>
            <button
              onClick={() => showToast('SECURITY AUDIT LOG EXPORTED (.CSV)')}
              className="h-7 px-2 border border-border bg-card uppercase hover:bg-black hover:text-white cursor-pointer"
            >
              Export CSV
            </button>
            <button
              onClick={() => setFilterGrep('')}
              className="h-7 px-2 border border-border bg-card uppercase hover:bg-black hover:text-white cursor-pointer"
            >
              Clear Visual Filter
            </button>
          </div>
        </div>

        {/* The Ledger Grid */}
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-left text-[11px]">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-foreground uppercase text-[10px] font-semibold">
                <th className="p-2.5 w-36">TIMESTAMP (CST)</th>
                <th className="p-2.5 w-48">ACTOR IDENTITY</th>
                <th className="p-2.5 w-36">IPV4 ADDRESS</th>
                <th className="p-2.5">EVENT DISPATCH / INTENT</th>
                <th className="p-2.5 w-36">CLEARANCE</th>
                <th className="p-2.5 w-28 text-right">DISPOSITION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {filteredLogs.map((log, idx) => (
                <tr key={idx} className={`hover:bg-muted/30 ${log.blocked ? 'bg-muted/40 font-medium' : ''}`}>
                  <td className="p-2.5 tabular-nums whitespace-nowrap">
                    <span className="font-semibold">{log.time}</span>
                  </td>
                  <td className="p-2.5 whitespace-nowrap">
                    <div className="font-semibold">{log.actor}</div>
                    <span className="text-[10px] text-muted-foreground">ROLE: {log.role}</span>
                  </td>
                  <td className="p-2.5 tabular-nums whitespace-nowrap">{log.ip}</td>
                  <td className="p-2.5">
                    <div className="font-semibold">{log.intent}</div>
                    <div className="text-[10px] text-muted-foreground">{log.detail}</div>
                  </td>
                  <td className="p-2.5 whitespace-nowrap">
                    <span className="border border-border px-1.5 py-0.5 bg-muted/40 text-[10px] font-semibold">
                      {log.clearance}
                    </span>
                  </td>
                  <td className="p-2.5 text-right whitespace-nowrap">
                    <span
                      className={`text-[9px] px-1.5 py-0.5 border border-border font-semibold uppercase tracking-wider ${
                        log.blocked ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground'
                      }`}
                    >
                      {log.disposition}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Terminal Command Dock at Bottom */}
        <div className="w-full bg-primary text-primary-foreground p-2.5 border-t border-border flex flex-col md:flex-row md:items-center justify-between gap-2 select-none tabular-nums text-[13px]">
          <div className="flex items-center gap-2 flex-1">
            <span className="font-semibold text-white">&gt;_</span>
            <span className="text-muted-foreground/70">{"tail -f /var/log/dawgos/security.audit.jsonl | jq '.clearance == \"HIGH\"'"}</span>
            <span className="inline-block w-2 h-3.5 bg-card animate-pulse"></span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground/50">
            <span>HASH: sha256:09bc489e21</span>
            <span>STREAM: LIVE (SOCKET 0)</span>
            <span>DAWG-CORE V2.4</span>
          </div>
        </div>
      </div>
    </div>
  );
};
