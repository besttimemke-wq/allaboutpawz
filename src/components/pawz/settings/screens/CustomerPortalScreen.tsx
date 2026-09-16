'use client';

import React, { useState } from 'react';

interface ScreenProps {
  onNavigateScreen?: (screenId: string) => void;
  selectedLocation?: string;
  onSelectLocation?: (loc: string) => void;
  systemSettings?: any;
  saveSettingsToDb?: (updates: any) => Promise<void>;
}

export const CustomerPortalScreen: React.FC<ScreenProps> = ({
  onNavigateScreen,
  systemSettings,
  saveSettingsToDb,
}) => {
  const [selfReg, setSelfReg] = useState(true);
  const [smsOtp, setSmsOtp] = useState(true);
  const [googleSso, setGoogleSso] = useState(true);
  const [cutoff, setCutoff] = useState('24');
  const [reschedLimit, setReschedLimit] = useState('2');
  const [forfeiturePrompt, setForfeiturePrompt] = useState(true);
  const [portalGreeting, setPortalGreeting] = useState('Welcome to your All About Pawz Pet Care Portal');

  /* eslint-disable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (systemSettings) {
      if (systemSettings.portal_allow_self_cancel !== undefined) setSelfReg(systemSettings.portal_allow_self_cancel);
      if (systemSettings.booking_cancellation_cutoff_hours !== undefined) setCutoff(String(systemSettings.booking_cancellation_cutoff_hours));
      if (systemSettings.portal_theme) setGoogleSso(systemSettings.portal_theme === 'dark');
      if (systemSettings.org_business_name) setPortalGreeting(`Welcome to your ${systemSettings.org_business_name} Pet Care Portal`);
    }
  }, [systemSettings]);
  /* eslint-enable react-hooks/set-state-in-effect */
  
  const [featureFlags, setFeatureFlags] = useState([
    { key: '01', title: 'Online Booking & Appointment Rescheduling', badge: 'CORE', desc: 'Permits calendar slot reservation, groomer tier selection, and self-reschedule up to 24h before appointment.', integration: 'CAL://SCHEDULE_V2', enabled: true },
    { key: '02', title: 'Live Grooming Stage Tracking', badge: 'TELEMETRY', desc: 'Displays real-time salon Kanban progression (Check-in → Bath → Drying → Styling → Ready for Pickup) with push status pings.', integration: 'OPS://KANBAN_PIPE', enabled: true },
    { key: '03', title: 'Vaccine Document Self-Upload', badge: 'COMPLIANCE', desc: 'Direct photo/PDF ingestion for Rabies, DHPP, and Bordetella verification with OCR expiration date indexing.', integration: 'DOC://OCR_VAULT', enabled: true },
    { key: '04', title: 'Card on File Management', badge: 'PAYMENTS', desc: 'PCI-compliant tokenized card vault powered by Stripe Elements. Enables automatic checkout and tip authorization.', integration: 'STRIPE://ELEMENTS_V3', enabled: true },
    { key: '05', title: 'Digital Invoice Download & Payment', badge: '', desc: 'Provides ledger of past salon receipts, PDF export, itemized retail slips, and balance settlement.', integration: 'FIN://LEDGER_ARCH', enabled: true },
    { key: '06', title: 'Digital Waivers & E-Signatures', badge: 'LEGAL', desc: 'Touch-screen stylus or finger signature binding. Policy sets mandatory re-signature validation every 365 days.', integration: 'SIGN://E_VERIFY', enabled: true },
    { key: '07', title: 'Loyalty Points & Rewards Balance', badge: 'RETENTION', desc: 'Accrual rule: 1 point per $1 spent. Real-time balance counter with 1-click redemption toward upgrades and add-ons.', integration: 'RWD://POINTS_LED', enabled: true },
  ]);

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  };

  const handleToggleFlag = (key: string) => {
    setFeatureFlags((prev) =>
      prev.map((f) => (f.key === key ? { ...f, enabled: !f.enabled } : f))
    );
  };

  const handleEnableAll = () => {
    setFeatureFlags((prev) => prev.map((f) => ({ ...f, enabled: true })));
    showToast('ALL 7 CUSTOMER PORTAL CAPABILITIES ENABLED');
  };

  const handleDisableAll = () => {
    setFeatureFlags((prev) => prev.map((f) => ({ ...f, enabled: false })));
    showToast('WARNING: ALL FEATURE ACCESS FLAGS DISABLED');
  };

  const handleResetDefaults = () => {
    setSelfReg(true);
    setSmsOtp(true);
    setGoogleSso(true);
    setCutoff('24');
    setReschedLimit('2');
    setForfeiturePrompt(true);
    setPortalGreeting('Welcome to your All About Pawz Pet Care Portal');
    setFeatureFlags((prev) => prev.map((f) => ({ ...f, enabled: true })));
    showToast('All policies restored to standard defaults');
  };

  return (
    <div className="w-full bg-surface text-on-surface font-sans antialiased text-[13px]">
      {/* Toast Banner */}
      {toastMsg && (
        <div className="fixed bottom-4 right-4 bg-primary text-on-primary px-4 py-3 border border-white z-50 flex items-center gap-3 tabular-nums text-[13px] shadow-2xl">
          <span className="w-2 h-2 bg-card animate-pulse"></span>
          <span className="uppercase font-semibold tracking-wider">{toastMsg}</span>
          <button onClick={() => setToastMsg(null)} className="ml-2 text-white hover:opacity-70 cursor-pointer">✕</button>
        </div>
      )}

      {/* Sub-Navigation Strip */}
      <div className="w-full bg-card border-b border-primary flex items-center overflow-x-auto select-none">
        <div className="px-4 py-2 bg-primary text-on-primary tabular-nums text-[11px] font-semibold tracking-wider uppercase flex items-center gap-2 shrink-0 border-r border-primary">
          <span className="w-1.5 h-1.5 bg-card"></span>
          <span>CFG://ADMIN</span>
        </div>
        <div className="flex items-stretch divide-x divide-primary/30 text-[12px] tabular-nums shrink-0">
          {[
            { num: '01', label: 'Overview', id: 'overview' },
            { num: '02', label: 'Organization', id: 'org-multiloc' },
            { num: '03', label: 'Users & Access', id: 'users-staff' },
            { num: '04', label: 'Booking & Operations', id: 'booking-ops' },
            { num: '05', label: 'Services & Pricing', id: 'services-pricing' },
            { num: '06', label: 'Payments', id: 'payments-tax' },
            { num: '07', label: 'Website', id: 'cms-wizard' },
            { num: '08', label: 'Customer Portal', id: 'customer-portal', active: true },
            { num: '09', label: 'Communications', id: 'org-social' },
            { num: '10', label: 'Inventory', id: 'oms-add-product' },
            { num: '11', label: 'Reports', id: 'invoices-aging' },
            { num: '12', label: 'System', id: 'system-telemetry' },
          ].map((item) => (
            <button
              key={item.num}
              onClick={() => onNavigateScreen?.(item.id)}
              className={`px-3 py-2 flex items-center gap-1 cursor-pointer transition-colors ${
                item.active
                  ? 'bg-primary text-on-primary font-semibold'
                  : 'text-muted-foreground hover:text-primary hover:bg-muted/40'
              }`}
            >
              <span className={item.active ? 'text-muted-foreground/70' : 'text-muted-foreground/70'}>
                {item.active ? `[${item.num}]` : item.num}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Command Control & Header Bar */}
      <div className="w-full bg-card border-b border-primary p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="tabular-nums text-[11px] text-primary font-semibold">
              SEC:04 // BUSINESS OPS // ADMIN SETTINGS // CUSTOMER PORTAL
            </span>
            <span className="text-[9px] tabular-nums px-1.5 py-0.5 border border-primary text-primary bg-muted/40 uppercase">
              NODE:PRTL-90
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight uppercase text-primary font-sans">
            Client Self-Service Portal Configuration &amp; Feature Flags
          </h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-[9px] tabular-nums uppercase px-2 py-0.5 bg-primary text-on-primary font-semibold">
              <span className="w-1.5 h-1.5 bg-card animate-pulse"></span>
              PORTAL ENGINE: ONLINE // 1,102 REGISTERED CLIENTS
            </span>
            <span className="text-[9px] tabular-nums text-muted-foreground border border-primary/40 px-1.5 py-0.5">
              AUTH PROTOCOL: JWT+OTP
            </span>
            <span className="text-[9px] tabular-nums text-muted-foreground border border-primary/40 px-1.5 py-0.5">
              GATEWAY: STRIPE_ELEM_V3
            </span>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            onClick={() => showToast('PREVIEWING CLIENT SELF-SERVICE PORTAL')}
            className="h-8 px-3 bg-card border border-primary text-primary tabular-nums text-[13px] uppercase hover:bg-black hover:text-white transition-none flex items-center gap-1 cursor-pointer"
          >
            <span>Preview Portal View</span>
            <span>↗</span>
          </button>
          <button
            onClick={handleResetDefaults}
            className="h-8 px-3 bg-card border border-primary text-primary tabular-nums text-[13px] uppercase hover:bg-black hover:text-white transition-none flex items-center gap-1 cursor-pointer"
          >
            <span>↺ Reset Defaults</span>
          </button>
          <button
            onClick={async () => {
              if (saveSettingsToDb) {
                await saveSettingsToDb({
                  portal_allow_self_cancel: selfReg,
                  booking_cancellation_cutoff_hours: Number(cutoff) || 24,
                  portal_theme: googleSso ? 'dark' : 'light',
                });
              }
              showToast('PORTAL CONFIGURATION SAVED & PERSISTED TO SUPABASE');
            }}
            className="h-8 px-4 bg-primary border border-primary text-on-primary tabular-nums text-[13px] uppercase font-semibold hover:bg-muted transition-none flex items-center gap-1 cursor-pointer"
          >
            <span>💾 Save Configuration</span>
          </button>
        </div>
      </div>

      {/* Telemetry Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 border-b border-primary bg-card text-primary">
        <div className="p-3 border-r border-primary flex flex-col justify-between">
          <span className="text-[9px] tabular-nums uppercase text-muted-foreground">ACTIVE SELF-SERVE SESSIONS (24H)</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold tabular-nums">482</span>
            <span className="text-[9px] tabular-nums border border-primary px-1">▲ +14.2%</span>
          </div>
        </div>
        <div className="p-3 border-r border-primary flex flex-col justify-between">
          <span className="text-[9px] tabular-nums uppercase text-muted-foreground">SELF-RESCHEDULE VOLUME</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold tabular-nums">67</span>
            <span className="text-[9px] tabular-nums text-muted-foreground">4.8% TOTAL</span>
          </div>
        </div>
        <div className="p-3 border-r border-primary flex flex-col justify-between">
          <span className="text-[9px] tabular-nums uppercase text-muted-foreground">VACCINE UPLOADS PENDING REVIEW</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold tabular-nums">12</span>
            <span className="text-[9px] tabular-nums bg-primary text-on-primary px-1">ACTION REQ</span>
          </div>
        </div>
        <div className="p-3 flex flex-col justify-between">
          <span className="text-[9px] tabular-nums uppercase text-muted-foreground">DIGITAL WAIVER COMPLIANCE</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-semibold tabular-nums">99.1%</span>
            <span className="text-[9px] tabular-nums text-primary">1,092/1,102</span>
          </div>
        </div>
      </div>

      {/* Main Config Content Grid */}
      <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 bg-muted/30">
        {/* Column Left: Sections 1 & 3 & 4 (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Section 1: Customer Authentication & Registration */}
          <div className="border border-primary bg-card">
            <div className="px-3 py-2 bg-muted/40 border-b border-primary flex items-center justify-between">
              <span className="tabular-nums text-[11px] uppercase font-semibold text-primary">
                SEC:01 // CUSTOMER AUTHENTICATION &amp; ACCESS
              </span>
              <span className="text-[9px] tabular-nums text-muted-foreground">[AUTH.RULESET]</span>
            </div>
            <div className="p-3 space-y-3 tabular-nums">
              {/* Toggle Row 1 */}
              <div className="flex items-start justify-between gap-3 pb-2 border-b border-border">
                <div>
                  <div className="text-[13px] font-semibold text-primary uppercase">Allow Client Self-Registration</div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Allows new pet owners to create account and register dogs without front-desk manual pre-creation.</p>
                </div>
                <label className="relative flex items-center cursor-pointer select-none pt-0.5">
                  <input
                    checked={selfReg}
                    onChange={(e) => setSelfReg(e.target.checked)}
                    className="sr-only peer"
                    type="checkbox"
                  />
                  <div className="w-10 h-5 border border-primary bg-card peer-checked:bg-primary transition-none flex items-center px-0.5">
                    <div className="w-3.5 h-3.5 bg-primary peer-checked:bg-card transition-none"></div>
                  </div>
                </label>
              </div>

              {/* Toggle Row 2 */}
              <div className="flex items-start justify-between gap-3 pb-2 border-b border-border">
                <div>
                  <div className="text-[13px] font-semibold text-primary uppercase flex items-center gap-1.5">
                    <span>Require Phone Verification (SMS OTP)</span>
                    <span className="text-[9px] px-1 border border-primary text-primary bg-muted/40">TWILIO</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Enforces 6-digit one-time PIN delivery to verify mobile numbers before booking confirmation.</p>
                </div>
                <label className="relative flex items-center cursor-pointer select-none pt-0.5">
                  <input
                    checked={smsOtp}
                    onChange={(e) => setSmsOtp(e.target.checked)}
                    className="sr-only peer"
                    type="checkbox"
                  />
                  <div className="w-10 h-5 border border-primary bg-card peer-checked:bg-primary transition-none flex items-center px-0.5">
                    <div className="w-3.5 h-3.5 bg-primary peer-checked:bg-card transition-none"></div>
                  </div>
                </label>
              </div>

              {/* Toggle Row 3 */}
              <div className="flex items-start justify-between gap-3 pb-2 border-b border-border">
                <div>
                  <div className="text-[13px] font-semibold text-primary uppercase">Google One-Tap / OAuth SSO</div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Enables federated credential exchange for low-friction parent registration &amp; logins.</p>
                </div>
                <label className="relative flex items-center cursor-pointer select-none pt-0.5">
                  <input
                    checked={googleSso}
                    onChange={(e) => setGoogleSso(e.target.checked)}
                    className="sr-only peer"
                    type="checkbox"
                  />
                  <div className="w-10 h-5 border border-primary bg-card peer-checked:bg-primary transition-none flex items-center px-0.5">
                    <div className="w-3.5 h-3.5 bg-primary peer-checked:bg-card transition-none"></div>
                  </div>
                </label>
              </div>

              {/* Password Policy */}
              <div className="pt-1">
                <label className="block text-[10px] uppercase text-primary font-semibold mb-1">PASSWORD POLICY ENFORCEMENT</label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="border border-primary p-2 bg-muted/40">
                    <span className="text-[9px] uppercase block text-muted-foreground">POLICY STANDARD</span>
                    <span className="text-[13px] font-semibold text-primary">MIN 8 CHARS // ALPHANUM</span>
                  </div>
                  <div className="border border-primary p-2 bg-muted/40">
                    <span className="text-[9px] uppercase block text-muted-foreground">SESSION TIMEOUT</span>
                    <span className="text-[13px] font-semibold text-primary">14 DAYS (STAY LOGGED IN)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Cancellation & Rescheduling Rules */}
          <div className="border border-primary bg-card">
            <div className="px-3 py-2 bg-muted/40 border-b border-primary flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-primary">
                Cancellation &amp; Rescheduling Policies
              </span>
              <span className="text-[9px] tabular-nums text-muted-foreground">[CHURN.GUARD]</span>
            </div>
            <div className="p-3 space-y-3 tabular-nums">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] uppercase font-semibold text-primary">CLIENT SELF-CANCELLATION CUTOFF</label>
                  <span className="text-[9px] text-muted-foreground">[HOURS PRIOR TO SLOT]</span>
                </div>
                <div className="flex items-center gap-1">
                  <select
                    value={cutoff}
                    onChange={(e) => setCutoff(e.target.value)}
                    className="flex-1 h-8 bg-card border border-primary px-2 text-[13px] focus:outline-none"
                  >
                    <option value="12">12 Hours Prior</option>
                    <option value="24">24 Hours Prior (Standard Policy)</option>
                    <option value="48">48 Hours Prior</option>
                    <option value="72">72 Hours Prior (Peak / Holiday Strict)</option>
                  </select>
                  <div className="h-8 px-2 bg-muted/40 border border-primary flex items-center justify-center text-[10px] uppercase font-semibold">
                    {cutoff}H
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground block mt-1">
                  Cancellations submitted inside 24 hours require front-desk phone authorization.
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] uppercase font-semibold text-primary">SELF-RESCHEDULE LIMIT PER APPOINTMENT</label>
                  <span className="text-[9px] text-muted-foreground">[MAX ATTEMPTS]</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {['1', '2', 'unlimited'].map((opt) => (
                    <label
                      key={opt}
                      onClick={() => setReschedLimit(opt)}
                      className={`flex items-center gap-1.5 p-1.5 border border-primary cursor-pointer ${
                        reschedLimit === opt ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/40 bg-card text-foreground'
                      }`}
                    >
                      <span className="text-[13px] font-semibold uppercase">{opt === 'unlimited' ? 'UNLIMITED' : `${opt} TIME${opt === '1' ? '' : 'S'}`}</span>
                    </label>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Exceeding 2 automated reschedules locks portal adjustments and routes client to concierge desk.</p>
              </div>

              <div className="border-t border-border pt-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[13px] font-semibold text-primary uppercase">Forfeiture &amp; Fee Penalty Modal Prompt</div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Displays explicit $35 late-cancellation forfeit warning prompt requiring confirmation check before cancelling.</p>
                  </div>
                  <label className="relative flex items-center cursor-pointer select-none pt-0.5">
                    <input
                      checked={forfeiturePrompt}
                      onChange={(e) => setForfeiturePrompt(e.target.checked)}
                      className="sr-only peer"
                      type="checkbox"
                    />
                    <div className="w-10 h-5 border border-primary bg-card peer-checked:bg-primary transition-none flex items-center px-0.5">
                      <div className="w-3.5 h-3.5 bg-primary peer-checked:bg-card transition-none"></div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Portal Branding & Navigation Customization */}
          <div className="border border-primary bg-card">
            <div className="px-3 py-2 bg-muted/40 border-b border-primary flex items-center justify-between">
              <span className="tabular-nums text-[11px] uppercase font-semibold text-primary">
                SEC:04 // BRANDING &amp; SUPPORT CHANNELS
              </span>
              <span className="text-[9px] tabular-nums text-muted-foreground">[PORTAL.UI]</span>
            </div>
            <div className="p-3 space-y-3 tabular-nums">
              <div>
                <label className="block text-[10px] uppercase font-semibold text-primary mb-1">PORTAL WELCOME GREETING STRING</label>
                <input
                  value={portalGreeting}
                  onChange={(e) => setPortalGreeting(e.target.value)}
                  className="w-full h-8 bg-card border border-primary px-2 text-[13px] tabular-nums focus:outline-none"
                  type="text"
                />
                <span className="text-[9px] text-muted-foreground mt-1 block">RENDERED AT TOP OF CLIENT PORTAL DASHBOARD</span>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-semibold text-primary mb-1">EXPOSED SUPPORT CHANNELS IN CLIENT TRAY</label>
                <div className="space-y-1.5 text-[13px]">
                  <div className="flex items-center justify-between p-1.5 border border-primary bg-card">
                    <span className="font-semibold">Phone Helpline: (214) 555-0198</span>
                    <span className="text-[9px] px-1.5 py-0.5 bg-primary text-primary-foreground font-semibold">[ACTIVE]</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 border border-primary bg-card">
                    <span className="font-semibold">Two-Way SMS Messaging (Twilio)</span>
                    <span className="text-[9px] px-1.5 py-0.5 bg-primary text-primary-foreground font-semibold">[ACTIVE]</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 border border-primary bg-card">
                    <span className="font-semibold">Knowledge Base FAQ Link</span>
                    <span className="text-[9px] px-1.5 py-0.5 bg-primary text-primary-foreground font-semibold">[ACTIVE]</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Column Right: Section 2 Feature Flags Matrix (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="border border-primary bg-card flex flex-col">
            <div className="px-3 py-2 bg-muted/40 border-b border-primary flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="tabular-nums text-[11px] uppercase font-semibold text-primary">
                  SEC:02 // SELF-SERVICE FEATURE ACCESS FLAGS
                </span>
                <span className="text-[9px] tabular-nums border border-primary px-1 bg-card text-primary">
                  7 FLAGS DEPLOYED
                </span>
              </div>
              <span className="text-[9px] tabular-nums text-muted-foreground">TOGGLE REALTIME STATE</span>
            </div>

            <div className="p-3 border-b border-primary bg-muted/30 tabular-nums">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="text-[13px] text-foreground">
                  <span className="font-semibold text-primary uppercase">Granular Capability Engine</span> — Real-time authorization flags governing what registered clients can perform autonomously inside their authenticated session.
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={handleEnableAll}
                    className="px-2 py-1 border border-border bg-card text-[9px] tabular-nums uppercase hover:bg-black hover:text-white cursor-pointer"
                  >
                    ENABLE ALL
                  </button>
                  <button
                    onClick={handleDisableAll}
                    className="px-2 py-1 border border-border bg-card text-[9px] tabular-nums uppercase hover:bg-black hover:text-white cursor-pointer"
                  >
                    DISABLE ALL
                  </button>
                </div>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse tabular-nums">
                <thead>
                  <tr className="border-b border-primary bg-muted/40 text-[10px] uppercase text-primary font-semibold">
                    <th className="p-2 w-12 text-center border-r border-primary">KEY</th>
                    <th className="p-2 border-r border-primary">FEATURE CAPABILITY / DESCRIPTION</th>
                    <th className="p-2 w-36 border-r border-primary">INTEGRATION</th>
                    <th className="p-2 w-28 text-center">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary text-[13px]">
                  {featureFlags.map((flag) => (
                    <tr key={flag.key} className="hover:bg-muted/30">
                      <td className="p-2 text-center border-r border-primary text-muted-foreground text-[10px]">{flag.key}</td>
                      <td className="p-2 border-r border-primary">
                        <div className="font-semibold text-primary uppercase flex items-center gap-1.5">
                          <span>{flag.title}</span>
                          {flag.badge && (
                            <span className="text-[9px] px-1 bg-primary text-primary-foreground font-semibold">{flag.badge}</span>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{flag.desc}</div>
                      </td>
                      <td className="p-2 border-r border-primary text-[10px]">
                        <span className="border border-primary px-1 py-0.5 bg-muted/40 block text-center truncate">
                          {flag.integration}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input
                            checked={flag.enabled}
                            onChange={() => handleToggleFlag(flag.key)}
                            className="sr-only peer"
                            type="checkbox"
                          />
                          <div className="w-10 h-5 border border-primary bg-card peer-checked:bg-primary transition-none flex items-center px-0.5">
                            <div className="w-3.5 h-3.5 bg-primary peer-checked:bg-card transition-none"></div>
                          </div>
                        </label>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Terminal Diagnostic Footer */}
            <div className="mt-auto border-t border-primary p-2.5 bg-card flex flex-col md:flex-row md:items-center justify-between gap-1 text-[13px] tabular-nums">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-black inline-block"></span>
                <span className="font-semibold text-primary uppercase">DAWG-OS PORTAL RUNTIME:</span>
                <span className="text-muted-foreground">TLS 1.3 // EDGE CDN CACHE ACTIVE // SYNCHRONIZED</span>
              </div>
              <div className="flex items-center gap-1 text-[10px]">
                <span className="border border-primary px-1.5 py-0.5 uppercase bg-muted/40">BUILD: #2409-P</span>
                <span className="border border-primary px-1.5 py-0.5 uppercase bg-primary text-primary-foreground font-semibold">ALL SERVICES GREEN</span>
              </div>
            </div>
          </div>

          {/* Live Client Preview Simulated Viewport */}
          <div className="border border-primary bg-card">
            <div className="px-3 py-2 bg-muted/40 border-b border-primary flex items-center justify-between">
              <span className="tabular-nums text-[11px] uppercase font-semibold text-primary">
                SIMULATOR // CLIENT PORTAL DASHBOARD WIREFRAME PREVIEW
              </span>
              <span className="text-[9px] tabular-nums text-muted-foreground">[VIEWPORT: DESKTOP/MOBILE AUTO]</span>
            </div>
            <div className="p-4 bg-muted/40">
              <div className="border border-primary bg-card p-4 space-y-4">
                <div className="border-b border-primary pb-2 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="text-[9px] tabular-nums text-muted-foreground block uppercase">PORTAL BANNER</span>
                    <span className="font-sans font-semibold text-base uppercase text-primary">{portalGreeting}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] tabular-nums text-muted-foreground block uppercase">ACCOUNT STATUS</span>
                    <span className="tabular-nums text-[13px] font-semibold text-primary">CLIENT: SARAH JENKINS (2 DOGS)</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center tabular-nums text-[13px]">
                  <div className="border border-primary p-2 bg-muted/30">
                    <span className="text-[9px] text-muted-foreground uppercase block">NEXT BOOKING</span>
                    <span className="font-semibold text-primary uppercase text-sm">Tomorrow 10:30 AM</span>
                    <span className="text-[10px] block text-muted-foreground mt-0.5">Milo • Full Pawz Spa</span>
                  </div>
                  <div className="border border-primary p-2 bg-muted/30">
                    <span className="text-[9px] text-muted-foreground uppercase block">LIVE STATUS</span>
                    <span className="font-semibold text-primary uppercase text-sm flex items-center justify-center gap-1">
                      <span className="w-1.5 h-1.5 bg-black inline-block"></span>
                      BATH &amp; DRY (STAGE 2/4)
                    </span>
                    <span className="text-[10px] block text-muted-foreground mt-0.5">Est. Ready: 12:15 PM</span>
                  </div>
                  <div className="border border-primary p-2 bg-muted/30">
                    <span className="text-[9px] text-muted-foreground uppercase block">REWARDS WALLET</span>
                    <span className="font-semibold text-primary uppercase text-sm">480 PTS ($24.00)</span>
                    <span className="text-[10px] block text-primary font-semibold mt-0.5">[REDEEM AT CHECKOUT]</span>
                  </div>
                </div>

                <div className="border-t border-border pt-2 flex flex-wrap items-center justify-between text-[11px] text-muted-foreground gap-2 tabular-nums">
                  <div className="flex items-center gap-3">
                    <span>TEL: (214) 555-0198</span>
                    <span>•</span>
                    <span>SMS READY</span>
                    <span>•</span>
                    <span>FAQ PORTAL ONLINE</span>
                  </div>
                  <span className="text-[9px] uppercase border border-primary px-1">CLIENT SESSION SECURE // STRIPE ENCRYPTED</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
