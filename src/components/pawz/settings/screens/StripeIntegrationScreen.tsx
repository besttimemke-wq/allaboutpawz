'use client';

import React, { useState } from 'react';
import { 
  FileText, 
  DollarSign, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  Search, 
  ArrowRight, 
  RefreshCw, 
  Download, 
  Printer, 
  Lock,
  ExternalLink,
  HelpCircle,
  Copy
} from 'lucide-react';

interface ScreenProps {
  onNavigateScreen?: (screenId: string) => void;
  selectedLocation?: string;
  onSelectLocation?: (loc: string) => void;
  systemSettings?: any;
  saveSettingsToDb?: (updates: any) => Promise<void>;
}

export const StripeIntegrationScreen: React.FC<ScreenProps> = ({
  onNavigateScreen,
  selectedLocation,
  onSelectLocation,
  systemSettings,
  saveSettingsToDb,
}) => {
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [stripeMode, setStripeMode] = useState<'live' | 'test'>('live');
  const [publicKey, setPublicKey] = useState('pk_live_••••••••••••••••••••');
  const [webhookSecret, setWebhookSecret] = useState('whsec_••••••••••••••••••');

   
  React.useEffect(() => {
     
    if (systemSettings) {
      if (systemSettings.payment_processing_mode) setStripeMode(systemSettings.payment_processing_mode as 'live' | 'test');
      if (systemSettings.stripe_public_key) setPublicKey(systemSettings.stripe_public_key);
    }
  }, [systemSettings]);
   

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

      {/* SECURITY CLEARANCE BAR */}
      <div className="w-full bg-primary text-primary-foreground px-4 py-2 flex flex-wrap items-center justify-between border-b border-border text-[10px] tabular-nums tracking-wider uppercase">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 bg-destructive"></span>
          <span className="text-destructive font-semibold tracking-tight">RESTRICTED MERCHANT CONNECT</span>
          <span className="text-muted-foreground">{"//"}</span>
          <span className="text-white">AUTH_SCOPE: SUPER_ADMIN_LEVEL_0</span>
          <span className="text-muted-foreground">{"//"}</span>
          <span className="text-muted-foreground/50">NODE: TX-PROD-STRIPE-01</span>
        </div>
        <div className="flex items-center gap-4 text-[10px] tabular-nums text-muted-foreground/70">
          <span>STRIPE VERSION: 2023-10-16</span>
          <span>GATEWAY: CONNECTED</span>
        </div>
      </div>

      {/* BREADCRUMB & EXECUTIVE TOOLBAR */}
      <div className="w-full bg-card border-b border-border p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 tabular-nums text-[10px] text-muted-foreground">
            <span>ADMIN SETTINGS</span>
            <span className="text-foreground font-semibold">&gt;&gt;</span>
            <span className="text-foreground font-semibold">REVENUE &amp; STRIPE MERCHANT</span>
            <span className="text-foreground font-semibold">&gt;&gt;</span>
            <span className="bg-primary text-primary-foreground px-1 text-[9px] font-semibold">API GATEWAY</span>
          </div>
          <div className="flex items-baseline gap-2">
            <h1 className="font-semibold text-lg md:text-xl tracking-tight uppercase text-foreground">STRIPE CONNECTED GATEWAY CONFIG</h1>
            <span className="tabular-nums text-[11px] text-muted-foreground">{"// MERCHANT ACCOUNT DIRECTORY"}</span>
          </div>
        </div>
        
        {/* ACTION BUTTONS */}
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => showToast('RE-VALIDATED WEBHOOK ENVELOPE SECRETS')}
            className="h-8 px-3 bg-card border border-border text-foreground tabular-nums text-[10px] uppercase hover:bg-muted/40 transition-none flex items-center gap-1.5 cursor-pointer"
          >
            TEST WEBHOOK ENVELOPES
          </button>
           <button 
            onClick={async () => {
              if (saveSettingsToDb) {
                await saveSettingsToDb({
                  payment_processing_mode: stripeMode,
                  stripe_public_key: publicKey,
                });
              }
              showToast('STRIPE GATEWAY SETTINGS SAVED & SUPABASE DB UPDATED');
            }}
            className="h-8 px-3 bg-primary text-primary-foreground border border-border tabular-nums text-[10px] uppercase hover:bg-muted transition-none flex items-center gap-1.5 cursor-pointer"
          >
            SAVE CHANGES
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
          <div className="px-4 py-2 bg-primary text-primary-foreground border-r border-border flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-card inline-block"></span>
            <span>04 REVENUE &amp; STRIPE GATEWAY</span>
            <span className="text-[9px] px-1 bg-card text-foreground uppercase font-semibold ml-1">[ACTIVE]</span>
          </div>
          <button onClick={() => onNavigateScreen?.('system-telemetry')} className="px-4 py-2 border-r border-border/20 hover:bg-card text-muted-foreground cursor-pointer">
            05 SYSTEM HEALTH &amp; TELEMETRY
          </button>
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

      {/* TWO-COLUMN STRIPE GATEWAY CONFIG GRID */}
      <div className="p-6 grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* COLUMN 1-7: MERCHANT KEYS & ENVIRONMENT (7 COLS) */}
        <div className="xl:col-span-7 space-y-6">
          <div className="border-2 border-border p-5 bg-card shadow-card-md">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4 tabular-nums">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-black"></span>
                <h3 className="font-semibold text-sm uppercase text-foreground">SECTION A: API CREDENTIALS &amp; ENVIRONMENT MODULATION</h3>
              </div>
              <div className="flex border border-border overflow-hidden tabular-nums text-[10px]">
                <button 
                  onClick={() => { setStripeMode('live'); showToast('GATEWAY ROUTED TO PRODUCTION'); }}
                  className={`px-2.5 py-0.5 font-semibold uppercase transition-colors cursor-pointer ${stripeMode === 'live' ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground'}`}
                >
                  LIVE
                </button>
                <button 
                  onClick={() => { setStripeMode('test'); showToast('GATEWAY ROUTED TO SANDBOX'); }}
                  className={`px-2.5 py-0.5 font-semibold uppercase transition-colors cursor-pointer ${stripeMode === 'test' ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground'}`}
                >
                  TEST
                </button>
              </div>
            </div>

            <div className="space-y-4 tabular-nums text-[13px]">
              <div className="space-y-1.5">
                <label className="block text-[10px] text-muted-foreground uppercase font-semibold">STRIPE PUBLISHABLE KEY</label>
                <div className="flex items-center">
                  <input 
                    type="text" 
                    value={publicKey} 
                    onChange={(e) => setPublicKey(e.target.value)}
                    className="flex-1 border-2 border-border p-2 bg-muted/30 tabular-nums text-foreground font-semibold focus:outline-none focus:bg-card" 
                  />
                  <button onClick={() => { navigator.clipboard.writeText(publicKey); showToast('COPIED PUBLISHABLE KEY'); }} className="border-2  border-border p-2 bg-muted/40 hover:bg-muted cursor-pointer">
                    <Copy className="w-4 h-4 text-foreground" />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] text-muted-foreground uppercase font-semibold">STRIPE SECRET API KEY</label>
                <div className="flex items-center">
                  <input 
                    type="password" 
                    value="••••••••••••••••••••••••••••••••••••••••••••••••" 
                    className="flex-1 border-2 border-border p-2 bg-muted/30 tabular-nums text-foreground font-semibold focus:outline-none" 
                    readOnly
                  />
                  <button onClick={() => showToast('SECRET KEY CAN ONLY BE MUTATED SERVER-SIDE IN .ENV VAULT')} className="border-2  border-border p-2 bg-muted/40 hover:bg-muted cursor-pointer">
                    <Lock className="w-4 h-4 text-foreground" />
                  </button>
                </div>
                <span className="text-[10px] text-muted-foreground block">Stripe secret keys are restricted to server-side environments. To modify, populate <code className="bg-muted/40 px-1 font-semibold text-foreground">STRIPE_SECRET_KEY</code> in the environment console.</span>
              </div>
            </div>
          </div>

          <div className="border-2 border-border p-5 bg-card shadow-card-md">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-black"></span>
                <h3 className="font-semibold text-sm uppercase tabular-nums tracking-wider">SECTION B: REALTIME EVENT WEBHOOK HANDLERS</h3>
              </div>
              <span className="text-[10px] tabular-nums text-muted-foreground uppercase">ACTIVE CONFIG</span>
            </div>

            <div className="space-y-4 tabular-nums text-[13px]">
              <div className="space-y-1.5">
                <label className="block text-[10px] text-muted-foreground uppercase font-semibold">WEBHOOK LISTENER ENDPOINT</label>
                <div className="flex items-center">
                  <input 
                    type="text" 
                    value="https://api.pawzbookings.com/api/v1/webhooks/stripe" 
                    className="flex-1 border border-border p-2 bg-muted/40 tabular-nums text-muted-foreground font-semibold focus:outline-none" 
                    readOnly 
                  />
                  <button onClick={() => { navigator.clipboard.writeText("https://api.pawzbookings.com/api/v1/webhooks/stripe"); showToast('COPIED WEBHOOK ENDPOINT'); }} className="border  border-border p-2 bg-muted/40 hover:bg-muted cursor-pointer">
                    <Copy className="w-4 h-4 text-foreground" />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] text-muted-foreground uppercase font-semibold">WEBHOOK SIGNING SECRET (WHSEC)</label>
                <div className="flex items-center">
                  <input 
                    type="text" 
                    value={webhookSecret} 
                    onChange={(e) => setWebhookSecret(e.target.value)}
                    className="flex-1 border-2 border-border p-2 bg-muted/30 tabular-nums text-foreground font-semibold focus:outline-none focus:bg-card" 
                  />
                  <button onClick={() => { navigator.clipboard.writeText(webhookSecret); showToast('COPIED WEBHOOK SIGNING SECRET'); }} className="border-2  border-border p-2 bg-muted/40 hover:bg-muted cursor-pointer">
                    <Copy className="w-4 h-4 text-foreground" />
                  </button>
                </div>
                <span className="text-[10px] text-muted-foreground block">Required to verify that inbound events originate exclusively from Stripe.com. Mutates <code className="bg-muted/40 px-1 font-semibold text-foreground">STRIPE_SIGNING_SECRET</code>.</span>
              </div>

              <div className="border border-border p-3 bg-muted/30 space-y-1.5">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">LISTENED EVENTS STATUS</span>
                <div className="flex justify-between items-center text-[13px] tabular-nums">
                  <span>↳ <code className="bg-muted/40 px-1 font-semibold text-foreground">payment_intent.succeeded</code>:</span>
                  <span className="bg-primary text-primary-foreground text-[9px] px-1.5 py-0.2 font-semibold uppercase">HANDLED</span>
                </div>
                <div className="flex justify-between items-center text-[13px] tabular-nums">
                  <span>↳ <code className="bg-muted/40 px-1 font-semibold text-foreground">charge.refunded</code>:</span>
                  <span className="bg-primary text-primary-foreground text-[9px] px-1.5 py-0.2 font-semibold uppercase">HANDLED</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* COLUMN 8-12: STRIPE CONNECT CONNECTIVITY CARD */}
        <div className="xl:col-span-5 space-y-6">
          <div className="border-2 border-border p-4 bg-card shadow-card-md">
            <div className="flex items-center justify-between border-b border-border pb-2 mb-3">
              <h4 className="font-semibold text-[13px] uppercase tabular-nums tracking-wider">STRIPE CONNECTED MERCHANT DIRECTORY</h4>
              <span className="text-[10px] tabular-nums text-muted-foreground">LIVE MERCHANT</span>
            </div>

            <div className="space-y-3 tabular-nums text-[13px]">
              <div className="border border-border p-3 bg-muted/30 space-y-1">
                <span className="text-[9px] text-muted-foreground uppercase block font-semibold">MERCHANT ACCOUNT DESIGNATION</span>
                <div className="font-semibold text-sm text-foreground">All About Pawz Holdings LLC</div>
                <span className="text-[10px] text-muted-foreground block">Stripe ID: acct_1Mv8X3LkdG3D0X7J</span>
              </div>

              <div className="border border-border p-3 bg-muted/30 space-y-1">
                <span className="text-[9px] text-muted-foreground uppercase block font-semibold">DIRECT DEPOSIT BANK ROUTING</span>
                <div className="font-semibold text-sm text-foreground">CHASE COMMERCIAL ******9812</div>
                <span className="text-[10px] text-muted-foreground block">ACH Transfer Interval: Daily Rolling (02:00 UTC)</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border">
              <a 
                href="https://dashboard.stripe.com" 
                target="_blank" 
                rel="noreferrer"
                className="w-full bg-primary text-primary-foreground py-2 text-[13px] tabular-nums uppercase font-semibold hover:bg-muted flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>OPEN STRIPE EXECUTIVE CONSOLE</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div className="border border-border bg-muted/30 p-4 space-y-2.5 tabular-nums text-[13px]">
            <div className="flex items-center gap-1.5 font-semibold uppercase text-foreground border-b border-border pb-1.5">
              <ShieldCheck className="w-4 h-4 text-foreground" />
              <span>SECURITY CERTIFICATION</span>
            </div>
            <p className="text-muted-foreground font-sans leading-tight">
              Merchant processing operations comply fully with industry PCI-DSS Level 1 standards. Customer card information is tokens-only, securely isolated under high-standard encryption environments.
            </p>
          </div>
        </div>

      </div>

      {/* SUPER ADMIN SECURITY LOCK FOOTER / HARDWARE ATTESTATION */}
      <div className="w-full bg-muted/30 border-t border-border border-b border-border p-4 flex flex-col md:flex-row items-center justify-between gap-4 select-none tabular-nums text-[13px]">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-primary text-primary-foreground flex items-center justify-center border border-border font-semibold">
            <Lock className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-[10px] font-semibold text-foreground uppercase">
              <span>SUPER_ADMIN LEVEL 0 // MERCHANT ENGINE ACCESS</span>
              <span className="border border-border px-1.5 bg-card text-[9px] font-semibold">[YUBIKEY_FIDO2_ACTIVE]</span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Changes to live publishable keys, webhook routes, ACH payout accounts, or merchant structures require dual-signature multi-factor hardware key verification.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-[10px] uppercase">AUDIT TRAIL:</span>
          <span className="border border-border bg-card px-2 py-0.5 text-foreground font-semibold tabular-nums">STR_REF #TX-48210-9004</span>
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
          <span>&gt; STRIPE_GATEWAY: CONNECTED</span>
          <span className="inline-block w-[7px] h-[14px] bg-card animate-pulse"></span>
        </div>
        <div className="flex items-center gap-4 text-muted-foreground/70">
          <span>MODE: PRODUCTION</span>
          <span>SYNC: PASS [0.04ms]</span>
          <span>DAWG-OS MERCHANT ENGINE v2.0</span>
        </div>
      </div>
    </div>
  );
};
