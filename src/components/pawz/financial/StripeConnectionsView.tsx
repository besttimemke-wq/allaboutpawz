'use client';

import React, { useState } from 'react';
import { DawgNavSection } from '@/lib/types';

interface StripeConnectionsViewProps {
  onNavigateSection?: (section: DawgNavSection) => void;
}

export const StripeConnectionsView: React.FC<StripeConnectionsViewProps> = ({ onNavigateSection }) => {
  const [stripeConnected, setStripeConnected] = useState(true);
  const [plaidLinked, setPlaidLinked] = useState(false);
  const [webhookLog, setWebhookLog] = useState<string[]>([
    'INFO  [09:12:04] Webhook endpoint verified: https://pawzos-backend.ai/api/v2/webhooks/stripe',
    'INFO  [10:30:15] payment_intent.succeeded received (amt: $108.25, ref: TX-9842)',
    'INFO  [11:20:02] charge.succeeded received (amt: $25.00, ref: BK-4102)'
  ]);

  const handleSimulateWebhook = () => {
    const timestamp = new Date().toTimeString().split(' ')[0];
    const newLog = `INFO  [${timestamp}] Simulated event: payment_intent.succeeded (amt: $75.00, customer: Lancelot Lake)`;
    setWebhookLog(prev => [newLog, ...prev]);
    alert('SANDBOX TRIGGER: Simulating stripe webhook callback payment_intent.succeeded on endpoint...');
  };

  const handleStripeToggle = () => {
    if (stripeConnected) {
      if (window.confirm('Are you sure you want to disconnect Stripe? This will disable mobile card checkouts.')) {
        setStripeConnected(false);
        setWebhookLog(prev => [`WARN  [SYSTEM] Stripe client credentials revoked. POS Terminal Offline.`, ...prev]);
      }
    } else {
      setStripeConnected(true);
      setWebhookLog(prev => [`INFO  [SYSTEM] Stripe oauth linkage success. acct_109482A1 linked.`, ...prev]);
      alert('Stripe Account acct_109482A1 successfully connected and authenticated!');
    }
  };

  const handlePlaidLink = () => {
    if (plaidLinked) {
      setPlaidLinked(false);
      setWebhookLog(prev => [`WARN  [SYSTEM] Plaid bank feed synchronization link unlinked.`, ...prev]);
    } else {
      setPlaidLinked(true);
      setWebhookLog(prev => [`INFO  [SYSTEM] Plaid linkage authorized: Oklahoma First National Bank synchronized.`, ...prev]);
      alert('Plaid Link:Oklahoma First National Bank connected! Real-time bank feeds activated.');
    }
  };

  return (
    <div className="flex flex-col w-full text-foreground bg-card select-text">
      {/* SYSTEM CONTEXT STRIP */}
      <div className="w-full bg-muted/40 border-b border-border px-4 py-2 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-black inline-block"></span>
          <span className="font-medium text-[11px] text-muted-foreground">
            Stripe Gateway
          </span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground text-muted-foreground">
          <span>STRIPE: {stripeConnected ? 'CONNECTED' : 'DISCONNECTED'}</span>
          <span>PLAID: {plaidLinked ? 'SYNCHRONIZED' : 'LINK_REQUIRED'}</span>
        </div>
      </div>

      <div className="p-6 border-b border-border">
        <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">Stripe Connections</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5 max-w-3xl">
          Integrate Stripe merchant processors, terminal card swipers, and Plaid bank reconciliation streams instantly to keep accounts synchronized.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-border">
        {/* LEFT COMPONENT: CONNECTION CARD SHEETS (8 COLS) */}
        <div className="lg:col-span-8 p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* STRIPE GATEWAY */}
            <div className="border border-border bg-card p-6 shadow-card-md space-y-4">
              <div className="border-b border-border pb-2 flex justify-between items-center">
                <h3 className="tabular-nums text-sm font-semibold text-foreground">01 // STRIPE MERCHANT SERVICES</h3>
                <span className={`text-[9px] font-semibold px-1.5 py-0.5 border uppercase ${
                  stripeConnected ? 'bg-success/10 border-success/30 text-success' : 'bg-destructive/5 border-destructive/30 text-destructive'
                }`}>
                  {stripeConnected ? 'ACTIVE_LIVE' : 'LINK_REQUIRED'}
                </span>
              </div>
              
              <div className="text-[12px] text-muted-foreground space-y-1.5">
                <div className="flex justify-between">
                  <span>Merchant Account ID:</span>
                  <strong className="text-foreground">{stripeConnected ? 'acct_109482A1' : 'NOT LINKED'}</strong>
                </div>
                <div className="flex justify-between">
                  <span>API Protocol Gateway:</span>
                  <strong className="text-foreground">v3.5 REST [PCI DSS]</strong>
                </div>
                <div className="flex justify-between">
                  <span>Terminal Hardware Link:</span>
                  <strong className="text-foreground">{stripeConnected ? '2 Swipers Linked' : '0 Swipers'}</strong>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleStripeToggle}
                  className={`w-full border border-border px-4 py-2 text-[12px] uppercase font-semibold tracking-wider transition-colors rounded-md cursor-pointer ${
                    stripeConnected ? 'bg-card hover:bg-destructive/5 text-foreground' : 'bg-black hover:bg-muted text-white'
                  }`}
                >
                  {stripeConnected ? 'DISCONNECT STRIPE ACCT' : 'CONNECT WITH STRIPE SECURE'}
                </button>
              </div>
            </div>

            {/* PLAID GATEWAY */}
            <div className="border border-border bg-card p-6 shadow-card-md space-y-4">
              <div className="border-b border-border pb-2 flex justify-between items-center">
                <h3 className="tabular-nums text-sm font-semibold text-foreground">02 // PLAID BANK FEED LINK</h3>
                <span className={`text-[9px] font-semibold px-1.5 py-0.5 border uppercase ${
                  plaidLinked ? 'bg-success/10 border-success/30 text-success' : 'bg-muted/40 border-border text-muted-foreground'
                }`}>
                  {plaidLinked ? 'FEED_LIVE' : 'LINK_PENDING'}
                </span>
              </div>

              <div className="text-[12px] text-muted-foreground space-y-1.5">
                <div className="flex justify-between">
                  <span>Financial Institution:</span>
                  <strong className="text-foreground">{plaidLinked ? 'Oklahoma First National' : 'NOT LINKED'}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Ledger Reconciliation Feed:</span>
                  <strong className="text-foreground">Automated Hourly Stream</strong>
                </div>
                <div className="flex justify-between">
                  <span>Verification Type:</span>
                  <strong className="text-foreground">OAUTH INSTANT</strong>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handlePlaidLink}
                  className="w-full bg-card hover:bg-muted/40 text-foreground border border-border px-4 py-2 text-[12px] uppercase font-semibold tracking-wider transition-colors rounded-md cursor-pointer"
                >
                  {plaidLinked ? 'DISCONNECT BANK FEED' : 'LINK BANK INSTITUTION WITH PLAID'}
                </button>
              </div>
            </div>
          </div>

          {/* LOWER SECTION: STRIPE WEBHOOK COMPLIANCE PANEL */}
          <div className="border border-border bg-card">
            <div className="bg-muted/40 border-b border-border p-3 flex justify-between items-center text-[13px] text-foreground font-semibold">
              <span>03 // WEBHOOK DISPATCH LOG CONSOLE</span>
              <button
                onClick={handleSimulateWebhook}
                className="bg-primary text-primary-foreground hover:bg-primary/90 border border-border px-3 py-1 text-[11px] text-muted-foreground font-semibold cursor-pointer"
              >
                SIMULATE WEBHOOK TEST CALLBACK
              </button>
            </div>
            <div className="p-4 bg-card text-muted-foreground/50 text-[12px] space-y-2 h-44 overflow-y-auto select-all">
              {webhookLog.map((log, index) => (
                <div key={index} className={log.includes('WARN') ? 'text-warning/70' : 'text-muted-foreground/50'}>
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COMPONENT: METRIC SPECS (4 COLS) */}
        <div className="lg:col-span-4 p-6 bg-muted/30 space-y-6 text-[12px]">
          <div className="border border-border p-4 bg-card space-y-2">
            <h4 className="font-semibold text-foreground uppercase">WEBHOOK COMPLIANCE ENDPOINTS</h4>
            <div className="space-y-1.5 text-muted-foreground">
              <p>1. https://pawzos-backend.ai/api/v2/stripe</p>
              <p>2. https://reconcile.pawzos-fin.net/sync</p>
              <span className="text-[10px] bg-muted/40 text-muted-foreground border border-border px-1 py-0.2">SSL APPROVED</span>
            </div>
          </div>

          <div className="border border-border p-4 bg-card space-y-2">
            <h4 className="font-display text-sm font-semibold tracking-tight text-foreground">Stripe PCI Data Accreditation</h4>
            <p className="text-muted-foreground">
              All About Pawz is PCI-DSS Level 1 compliant. Card data never touches host server memory, tokenized directly via Stripe Elements Client SDK wrapper.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
