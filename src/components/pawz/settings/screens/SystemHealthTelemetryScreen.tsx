'use client';

import React, { useState } from 'react';
import { 
  Terminal, 
  Cpu, 
  HardDrive, 
  Network, 
  Database, 
  ShieldAlert, 
  RefreshCw, 
  Download, 
  Play, 
  StopCircle,
  Clock,
  Lock
} from 'lucide-react';

interface ScreenProps {
  onNavigateScreen?: (screenId: string) => void;
  selectedLocation?: string;
  onSelectLocation?: (loc: string) => void;
  systemSettings?: any;
  saveSettingsToDb?: (updates: any) => Promise<void>;
}

export const SystemHealthTelemetryScreen: React.FC<ScreenProps> = ({
  onNavigateScreen,
  selectedLocation,
  onSelectLocation,
  systemSettings,
  saveSettingsToDb,
}) => {
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [dbLogs, setDbLogs] = useState<{ id: number; timestamp: string; action: string; details: string }[]>([]);
  const [logs, setLogs] = useState<string[]>([
    '2025-05-18 14:02:41.002 [INFO] [SUPABASE_CDC_LISTENER] Received realtime payload for table: appointments (row_id: 2940)',
    '2025-05-18 14:02:41.006 [INFO] [SUPABASE_POOL] Active connections: 4/20. Latency: 11ms.',
    '2025-05-18 14:02:41.241 [DEBUG] [AUTH_MIDDLEWARE] Verified JWT signature in 0.42ms. Scope: TIER_04_GROOMER',
    '2025-05-18 14:02:41.590 [INFO] [TWILIO_DISPATCHER] Dispatched SMS confirmation hook to recipient client +18175550192',
    '2025-05-18 14:02:41.802 [INFO] [STRIPE_WEBHOOK_HANDLER] Received signature check. Verified payload for event: payment_intent.succeeded',
    '2025-05-18 14:02:42.110 [DEBUG] [CACHE_ENGINE] Edge hit for CDN assets/images/stylist_avatar_sm_sarah.webp. Duration: 4ms.',
  ]);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    async function fetchAuditLogs() {
      try {
        const res = await fetch("/api/admin/audit-logs");
        if (res.ok) {
          const data = await res.json();
          setDbLogs(data);
        }
      } catch (err) {
        console.error("Error fetching audit logs:", err);
      }
    }
    fetchAuditLogs();
    const interval = setInterval(fetchAuditLogs, 5000); // 5s real-time poll
    return () => clearInterval(interval);
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleTriggerReplicationSync = () => {
    showToast('REPLICATION_SYNC_FORCED: SUPABASE DB SYNCED IN 14ms');
    setLogs(prev => [
      `2025-05-18 14:02:43.001 [INFO] [REPLICATION_ENGINE] Forced replication check requested. Synced 3 tables, 0 conflicts.`,
      ...prev
    ]);
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

      {/* SECURITY CLEARANCE BAR */}
      <div className="w-full bg-primary text-primary-foreground px-4 py-2 flex flex-wrap items-center justify-between border-b border-border text-[10px] tabular-nums tracking-wider uppercase">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 bg-destructive animate-pulse"></span>
          <span className="text-destructive font-semibold tracking-tight">RESTRICTED SECURITY PROFILE</span>
          <span className="text-muted-foreground">{"//"}</span>
          <span className="text-white">AUTH_SCOPE: SUPER_ADMIN_LEVEL_0</span>
          <span className="text-muted-foreground">{"//"}</span>
          <span className="text-muted-foreground/50">NODE: TX-PROD-REPLICA-MAIN-001</span>
        </div>
        <div className="flex items-center gap-4 text-[10px] tabular-nums text-muted-foreground/70">
          <span>SUPABASE COMPILER VERSION: 15.6.2</span>
          <span>STATION STATUS: SECURE</span>
        </div>
      </div>

      {/* BREADCRUMB & EXECUTIVE TOOLBAR */}
      <div className="w-full bg-card border-b border-border p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 tabular-nums text-[10px] text-muted-foreground">
            <span>ADMIN SETTINGS</span>
            <span className="text-foreground font-semibold">&gt;&gt;</span>
            <span className="text-foreground font-semibold">SYSTEM TELEMETRY &amp; ENVIRONMENT</span>
            <span className="text-foreground font-semibold">&gt;&gt;</span>
            <span className="bg-primary text-primary-foreground px-1 text-[9px] font-semibold">L0 ROOT</span>
          </div>
          <div className="flex items-baseline gap-2">
            <h1 className="font-semibold text-lg md:text-xl tracking-tight uppercase text-foreground">SYSTEM HEALTH, REPLICATION &amp; TELEMETRY</h1>
            <span className="tabular-nums text-[11px] text-muted-foreground">{"// CLUSTER STATUS: HEALTHY"}</span>
          </div>
        </div>
        
        {/* ACTION BUTTONS */}
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={handleTriggerReplicationSync}
            className="h-8 px-3 bg-primary text-primary-foreground border border-border tabular-nums text-[10px] uppercase hover:bg-muted transition-none flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            FORCE REPLICATION RE-SYNC
          </button>
          <button 
            onClick={() => showToast('SYSTEM DIAGNOSTIC ZIP DUMP GENERATED')}
            className="h-8 px-3 bg-card border border-border text-foreground tabular-nums text-[10px] uppercase hover:bg-muted/40 transition-none flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            DOWNLOAD DIAGNOSTIC BINDER
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
          <div className="px-4 py-2 bg-primary text-primary-foreground border-r border-border flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-card inline-block"></span>
            <span>05 SYSTEM HEALTH &amp; TELEMETRY</span>
            <span className="text-[9px] px-1 bg-card text-foreground uppercase font-semibold ml-1">[ACTIVE]</span>
          </div>
          <button onClick={() => onNavigateScreen?.('services-pricing')} className="px-4 py-2 border-r border-border/20 hover:bg-card text-muted-foreground cursor-pointer">
            06 SERVICES &amp; PRICING MATRIX
          </button>
          <button onClick={() => onNavigateScreen?.('analytics-reporting')} className="px-4 py-2 border-r border-border/20 hover:bg-card text-muted-foreground cursor-pointer">
            07 ANALYTICS &amp; REPORTING
          </button>
          <button onClick={() => onNavigateScreen?.('cms-wizard')} className="px-4 py-2 text-muted-foreground hover:bg-card cursor-pointer">
            08 CMS &amp; BOOKING WIZARD
          </button>
        </div>
      </div>

      {/* CORE INFRASTRUCTURE TELEMETRY METRIC STRIP */}
      <div className="w-full grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 border-b border-border bg-card tabular-nums text-[13px]">
        {/* CPU */}
        <div className="p-3 border-r border-b lg: border-border flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground uppercase font-semibold">
            <span>CPU UTILIZATION</span>
            <Cpu className="w-3.5 h-3.5 text-muted-foreground/70" />
          </div>
          <div className="my-2">
            <div className="text-lg md:text-xl font-semibold tracking-tight text-foreground">12.4%</div>
          </div>
          <div className="w-full bg-muted/40 h-1.5 border border-border overflow-hidden">
            <div className="bg-black h-full" style={{ width: '12.4%' }}></div>
          </div>
        </div>

        {/* MEMORY */}
        <div className="p-3 border-r border-b lg: border-border flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground uppercase font-semibold">
            <span>MEMORY RESIDENT</span>
            <HardDrive className="w-3.5 h-3.5 text-muted-foreground/70" />
          </div>
          <div className="my-2">
            <div className="text-lg md:text-xl font-semibold tracking-tight text-foreground">412 MB / 2048 MB</div>
          </div>
          <div className="w-full bg-muted/40 h-1.5 border border-border overflow-hidden">
            <div className="bg-black h-full" style={{ width: '20.1%' }}></div>
          </div>
        </div>

        {/* POOL CONNECTIONS */}
        <div className="p-3 border-r border-b lg: border-border flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground uppercase font-semibold">
            <span>DB CONNECTION POOL</span>
            <Database className="w-3.5 h-3.5 text-muted-foreground/70" />
          </div>
          <div className="my-2">
            <div className="text-lg md:text-xl font-semibold tracking-tight text-foreground">04 / 20 ACTIVE</div>
          </div>
          <div className="flex items-center gap-1 tabular-nums text-[10px]">
            <span className="bg-success/10 border border-success text-success px-1 font-semibold">OPTIMAL</span>
            <span className="text-muted-foreground">queue duration 0.2ms</span>
          </div>
        </div>

        {/* EDGE LATENCY */}
        <div className="p-3 border-r border-b lg: border-border flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground uppercase font-semibold">
            <span>EDGE RESOLUTION TIME</span>
            <Network className="w-3.5 h-3.5 text-muted-foreground/70" />
          </div>
          <div className="my-2">
            <div className="text-lg md:text-xl font-semibold tracking-tight text-foreground">11ms</div>
          </div>
          <div className="flex items-center gap-1 tabular-nums text-[10px] text-muted-foreground">
            <span>CDN: CLOUDFLARE ARGO</span>
          </div>
        </div>

        {/* SYNC DELAY */}
        <div className="p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground uppercase font-semibold">
            <span>REPLICATION STATE</span>
            <span className="text-foreground font-semibold">SYNC</span>
          </div>
          <div className="my-2">
            <div className="text-lg md:text-xl font-semibold tracking-tight text-foreground">0.04ms DELAY</div>
          </div>
          <div className="flex items-center gap-1 tabular-nums text-[10px] text-muted-foreground">
            <span className="text-foreground font-semibold">CDC ACTIVE</span>
            <span>WAL_REPLICA</span>
          </div>
        </div>
      </div>

      {/* SYSTEM CONTROLS & REPLICATION MONITORING GRID */}
      <div className="w-full flex flex-col">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 border-b border-border">
          
          {/* SEC:A REPLICATION ENGINE STATUS (7 COLS) */}
          <div className="lg:col-span-7 bg-card border-b lg: lg:border-r border-border flex flex-col">
            <div className="px-4 py-2 border-b border-border bg-muted/40 flex items-center justify-between">
              <span className="font-semibold tabular-nums text-[13px] uppercase text-foreground">SEC:A // REALTIME REPLICATION ENGINE (SUPABASE CDC)</span>
              <span className="bg-primary text-primary-foreground px-1.5 py-0.5 text-[9px] font-semibold">POSTGRES WAL STREAM</span>
            </div>
            
            <div className="p-4 flex-1 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-border p-3 bg-muted/30 space-y-1.5">
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">LOGICAL REPLICATION CHANNELS</div>
                  <div className="text-[13px] tabular-nums font-semibold text-foreground flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-black rounded-md"></span>
                    <span>appointments_pub // 03 CLIENTS</span>
                  </div>
                  <div className="text-[13px] tabular-nums font-semibold text-foreground flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-black rounded-md"></span>
                    <span>pet_records_pub // 12 CLIENTS</span>
                  </div>
                  <div className="text-[13px] tabular-nums font-semibold text-foreground flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-black rounded-md"></span>
                    <span>staff_auth_pub // L0 VERIFIED</span>
                  </div>
                </div>

                <div className="border border-border p-3 bg-muted/30 space-y-1.5">
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">CDC CLIENT CONNECTION HEALTH</div>
                  <div className="flex justify-between text-[13px] tabular-nums">
                    <span>Frisco iPad Front Desk:</span>
                    <span className="font-semibold text-foreground">ACTIVE (11ms)</span>
                  </div>
                  <div className="flex justify-between text-[13px] tabular-nums">
                    <span>Plano Station 01-04 iPad:</span>
                    <span className="font-semibold text-foreground">ACTIVE (14ms)</span>
                  </div>
                  <div className="flex justify-between text-[13px] tabular-nums">
                    <span>Mobile App API Gateway:</span>
                    <span className="font-semibold text-foreground">ACTIVE (18ms)</span>
                  </div>
                </div>
              </div>

              {/* LIVE CONSOLE EXCERPT */}
              <div className="border border-border bg-primary text-primary-foreground tabular-nums p-3 text-[11px] leading-relaxed space-y-1 overflow-y-auto max-h-[180px]">
                <div className="text-muted-foreground text-[10px] uppercase border-b border-border pb-1 flex items-center justify-between">
                  <span>LIVE POSTGRESQL AUDIT STREAM // SITE_SETTINGS</span>
                  <span className="animate-pulse text-success font-semibold">[CONNECTED]</span>
                </div>
                {dbLogs.map((log) => (
                  <div key={log.id} className="text-success truncate flex gap-2">
                    <span className="text-muted-foreground">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                    <span className="text-warning font-semibold">[{log.action}]</span>
                    <span>{log.details}</span>
                  </div>
                ))}
                <div className="text-muted-foreground text-[9px] uppercase border-y border-border my-1 py-0.5">Static VM System Log Excerpt</div>
                {logs.map((log, i) => (
                  <div key={i} className="truncate text-muted-foreground/50">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SEC:B DISPATCH REPLICATION & RE-SYNC MATRIX (5 COLS) */}
          <div className="lg:col-span-5 bg-card flex flex-col">
            <div className="px-4 py-2 border-b border-border bg-muted/40 flex items-center justify-between">
              <span className="font-semibold tabular-nums text-[13px] uppercase text-foreground">SEC:B // MANAGE CLUSTER CONFIG &amp; ENV</span>
              <span className="tabular-nums text-[9px] text-muted-foreground">ENV: PRODUCTION_L0</span>
            </div>
            
            <div className="p-4 flex-1 space-y-4">
              <div className="border border-border p-3 bg-card space-y-2">
                <div className="flex items-center justify-between text-[10px] font-semibold border-b border-border pb-1">
                  <span className="uppercase">DATABASE DIRECTORY</span>
                  <span className="text-muted-foreground">PORT: 5432</span>
                </div>
                <div className="space-y-1.5 text-[13px] tabular-nums text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Database Host:</span>
                    <span className="font-semibold text-foreground">aws-tx-replica.supabase.co</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Region:</span>
                    <span className="font-semibold text-foreground">us-east-1 (N. Virginia)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SSL Mode:</span>
                    <span className="font-semibold text-foreground">verify-full [STRICT]</span>
                  </div>
                </div>
              </div>

              <div className="border border-border p-3 bg-card space-y-2">
                <div className="flex items-center justify-between text-[10px] font-semibold border-b border-border pb-1">
                  <span className="uppercase text-foreground">SMS TWILIO API TELEMETRY</span>
                  <span className="text-foreground font-semibold">OK [200]</span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Realtime pipeline triggers instant SMS text messaging notifications to dog owners as groomers drag and drop styling states on the pipeline board.
                </div>
                <div className="flex items-center justify-between text-[13px] tabular-nums">
                  <span>Pending Outbound Queue:</span>
                  <span className="font-semibold text-foreground">0 MSGS</span>
                </div>
              </div>

              {/* ENVIRONMENT VAULT KEYS PREVIEW */}
              <div className="border border-border p-3 bg-card space-y-2">
                <div className="flex items-center justify-between text-[10px] font-semibold border-b border-border pb-1">
                  <span className="uppercase text-foreground">ENVIRONMENT SECRET VAULT</span>
                  <span className="text-muted-foreground">SECRET CREDENTIALS</span>
                </div>
                <div className="space-y-1.5 text-[11px] tabular-nums">
                  <div className="flex justify-between items-center">
                    <span>SUPABASE_SERVICE_ROLE_KEY:</span>
                    <span className="tabular-nums text-[10px] text-muted-foreground select-none">••••••••••••••••••••3A1F</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>TWILIO_AUTH_TOKEN:</span>
                    <span className="tabular-nums text-[10px] text-muted-foreground select-none">••••••••••••••••••••9D04</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>STRIPE_SIGNING_SECRET:</span>
                    <span className="tabular-nums text-[10px] text-muted-foreground select-none">••••••••••••••••••••EF94</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SUPER ADMIN SECURITY LOCK FOOTER / HARDWARE ATTESTATION */}
      <div className="w-full bg-muted/30 border-b border-border p-4 flex flex-col md:flex-row items-center justify-between gap-4 select-none tabular-nums text-[13px]">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-primary text-primary-foreground flex items-center justify-center border border-border font-semibold">
            <Lock className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-[10px] font-semibold text-foreground uppercase">
              <span>SUPER_ADMIN LEVEL 0 // CORE ENCLAVE VAULT KEY</span>
              <span className="border border-border px-1.5 bg-card text-[9px] font-semibold">[YUBIKEY_FIDO2_ACTIVE]</span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Changes to database credentials, Stripe webhook triggers, or SMS notification handlers require dual-signature multi-factor hardware ratification.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-[10px] uppercase">AUDIT TRAIL:</span>
          <span className="border border-border bg-card px-2 py-0.5 text-foreground font-semibold tabular-nums">TELE_REF #TX-49210-9921</span>
          <button 
            onClick={() => showToast('SUPER_ADMIN ENCLAVE SESSION TERMINATED')}
            className="h-6 px-3 bg-primary text-primary-foreground text-[10px] uppercase font-semibold hover:bg-muted transition-none cursor-pointer"
          >
            TERMINATE SESSION
          </button>
        </div>
      </div>

      {/* MONOCHROME TERMINAL STATUS LINE */}
      <div className="w-full bg-primary text-primary-foreground px-4 py-1.5 flex items-center justify-between tabular-nums text-[11px]">
        <div className="flex items-center gap-2">
          <span>&gt; CONSOLE_DAEMON: LISTENING</span>
          <span className="inline-block w-[7px] h-[14px] bg-card animate-pulse"></span>
        </div>
        <div className="flex items-center gap-4 text-muted-foreground/70">
          <span>REPL_THREAD: #0042</span>
          <span>SYNC_PORT: 5432</span>
          <span>DAWG-OS TELEMETRY ENGINE v1.2</span>
        </div>
      </div>
    </div>
  );
};
