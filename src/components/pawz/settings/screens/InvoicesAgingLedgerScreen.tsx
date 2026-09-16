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
  Lock 
} from 'lucide-react';

interface ScreenProps {
  onNavigateScreen?: (screenId: string) => void;
  selectedLocation?: string;
  onSelectLocation?: (loc: string) => void;
  systemSettings?: any;
  saveSettingsToDb?: (updates: any) => Promise<void>;
}

export const InvoicesAgingLedgerScreen: React.FC<ScreenProps> = ({
  onNavigateScreen,
  selectedLocation,
  onSelectLocation,
  systemSettings,
  saveSettingsToDb,
}) => {
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSegment, setActiveSegment] = useState<'all' | 'current' | '31-60' | '61-90' | 'over90'>('all');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const agingBuckets = {
    current: '$32,490.00',
    thirtyToSixty: '$8,450.00',
    sixtyToNinety: '$1,240.00',
    overNinety: '$812.00',
    totalOutstanding: '$42,992.00'
  };

  const [invoices, setInvoices] = useState([
    { id: 'INV-2025-091', date: 'MAY 12, 2025', client: 'ALEXANDER DUPONT', pet: 'Barnaby (Golden Retriever)', amount: '$115.00', status: 'UNPAID', category: '31-60', days: 42, groomer: 'Sarah Miller', loc: 'FRISCO HQ' },
    { id: 'INV-2025-086', date: 'MAY 08, 2025', client: 'BEATRICE CORTEZ', pet: 'Coco (Toy Poodle)', amount: '$84.20', status: 'UNPAID', category: '31-60', days: 46, groomer: 'Mike Ross', loc: 'FRISCO HQ' },
    { id: 'INV-2025-052', date: 'APR 02, 2025', client: 'DEREK WESTERHOUSE', pet: 'Zeus (Great Dane)', amount: '$240.00', status: 'DELINQUENT', category: '61-90', days: 78, groomer: 'Kevin Diaz', loc: 'MOBILE VAN-02' },
    { id: 'INV-2025-014', date: 'FEB 14, 2025', client: 'ELIZABETH KAUFMAN', pet: 'Fifi (Standard Poodle)', amount: '$185.00', status: 'COLLECTIONS', category: 'over90', days: 114, groomer: 'Jessica Lee', loc: 'PLANO WEST' },
    { id: 'INV-2025-104', date: 'MAY 18, 2025', client: 'GERALD PINE', pet: 'Winston (French Bulldog)', amount: '$74.00', status: 'UNPAID', category: 'current', days: 12, groomer: 'Sarah Miller', loc: 'FRISCO HQ' },
  ]);

  const filteredInvoices = invoices.filter(inv => {
    if (activeSegment !== 'all' && inv.category !== activeSegment) return false;
    if (searchQuery) {
      return inv.client.toLowerCase().includes(searchQuery.toLowerCase()) || 
             inv.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
             inv.pet.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

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
          <span className="text-destructive font-semibold tracking-tight">RESTRICTED FINANCIAL ACCESS</span>
          <span className="text-muted-foreground">{"//"}</span>
          <span className="text-white">AUTH_SCOPE: SUPER_ADMIN_LEVEL_0</span>
          <span className="text-muted-foreground">{"//"}</span>
          <span className="text-muted-foreground/50">NODE: TX-PROD-FINANCE-01</span>
        </div>
        <div className="flex items-center gap-4 text-[10px] tabular-nums text-muted-foreground/70">
          <span>LEDGER ENGINE: v2.4-ROLLUP</span>
          <span>CURRENCY: USD</span>
        </div>
      </div>

      {/* BREADCRUMB & EXECUTIVE TOOLBAR */}
      <div className="w-full bg-card border-b border-border p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 tabular-nums text-[10px] text-muted-foreground">
            <span>ADMIN SETTINGS</span>
            <span className="text-foreground font-semibold">&gt;&gt;</span>
            <span className="text-foreground font-semibold">SALON INVOICES &amp; AGING LEDGER</span>
            <span className="text-foreground font-semibold">&gt;&gt;</span>
            <span className="bg-primary text-primary-foreground px-1 text-[9px] font-semibold">AGING BUCKETS</span>
          </div>
          <div className="flex items-baseline gap-2">
            <h1 className="font-semibold text-lg md:text-xl tracking-tight uppercase text-foreground">SALON INVOICES &amp; AGING LEDGER</h1>
            <span className="tabular-nums text-[11px] text-muted-foreground">{"// DEBTOR AGING STATUS MATRIX"}</span>
          </div>
        </div>
        
        {/* ACTION BUTTONS */}
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => showToast('SUMMARY EXPORTED TO FIN_REPORTS.XLSX')}
            className="h-8 px-3 bg-card border border-border text-foreground tabular-nums text-[10px] uppercase hover:bg-black hover:text-white transition-none flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            EXPORT EXCEL AGING MATRIX
          </button>
          <button 
            onClick={() => showToast('PREPARING PRINT BULK AGING...')}
            className="h-8 px-3 bg-primary text-primary-foreground border border-border tabular-nums text-[10px] uppercase hover:bg-muted transition-none flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            PRINT DELINQUENT ROLLUP
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

      {/* QUICK KPI BUCKET CARDS */}
      <div className="w-full grid grid-cols-2 lg:grid-cols-5 border-b border-border bg-card tabular-nums text-[13px]">
        {/* CURRENT BUCKET */}
        <button 
          onClick={() => { setActiveSegment('current'); showToast('FILTER: CURRENT'); }}
          className={`p-3 border-r border-b lg: border-border text-left flex flex-col justify-between transition-colors ${
            activeSegment === 'current' ? 'bg-muted/40 font-semibold' : 'hover:bg-muted/30'
          }`}
        >
          <span className="text-[10px] text-muted-foreground uppercase font-semibold">01 CURRENT [0-30 DAYS]</span>
          <div className="my-2">
            <div className="text-lg md:text-xl font-semibold tracking-tight text-foreground">{agingBuckets.current}</div>
          </div>
          <span className="text-[9px] text-muted-foreground">ACTIVE CLIENT CHECKOUTS</span>
        </button>

        {/* 31-60 DAYS */}
        <button 
          onClick={() => { setActiveSegment('31-60'); showToast('FILTER: 31-60 DAYS'); }}
          className={`p-3 border-r border-b lg: border-border text-left flex flex-col justify-between transition-colors ${
            activeSegment === '31-60' ? 'bg-muted/40 font-semibold' : 'hover:bg-muted/30'
          }`}
        >
          <span className="text-[10px] text-muted-foreground uppercase font-semibold">02 AR_AGING [31-60 DAYS]</span>
          <div className="my-2">
            <div className="text-lg md:text-xl font-semibold tracking-tight text-foreground">{agingBuckets.thirtyToSixty}</div>
          </div>
          <span className="text-[9px] text-destructive font-semibold">14 INVOICES UNPAID</span>
        </button>

        {/* 61-90 DAYS */}
        <button 
          onClick={() => { setActiveSegment('61-90'); showToast('FILTER: 61-90 DAYS'); }}
          className={`p-3 border-r border-border text-left flex flex-col justify-between transition-colors ${
            activeSegment === '61-90' ? 'bg-muted/40 font-semibold' : 'hover:bg-muted/30'
          }`}
        >
          <span className="text-[10px] text-muted-foreground uppercase font-semibold">03 AR_AGING [61-90 DAYS]</span>
          <div className="my-2">
            <div className="text-lg md:text-xl font-semibold tracking-tight text-foreground">{agingBuckets.sixtyToNinety}</div>
          </div>
          <span className="text-[9px] text-destructive font-semibold">4 DELINQUENT</span>
        </button>

        {/* OVER 90 DAYS */}
        <button 
          onClick={() => { setActiveSegment('over90'); showToast('FILTER: OVER 90 DAYS'); }}
          className={`p-3 border-r border-border text-left flex flex-col justify-between transition-colors ${
            activeSegment === 'over90' ? 'bg-muted/40 font-semibold' : 'hover:bg-muted/30'
          }`}
        >
          <span className="text-[10px] text-muted-foreground uppercase font-semibold">04 CRITICAL [90+ DAYS]</span>
          <div className="my-2">
            <div className="text-lg md:text-xl font-semibold tracking-tight text-foreground">{agingBuckets.overNinety}</div>
          </div>
          <span className="text-[9px] bg-destructive/10 border border-destructive text-destructive px-1 py-0.2 font-semibold w-max uppercase">COLLECTIONS</span>
        </button>

        {/* TOTAL REVENUE DELINQUENT */}
        <div className="p-3 bg-muted/30 flex flex-col justify-between text-left">
          <span className="text-[10px] text-muted-foreground uppercase font-semibold">05 TOTAL AR DEBT ROLLUP</span>
          <div className="my-2">
            <div className="text-lg md:text-xl font-semibold tracking-tight text-destructive">{agingBuckets.totalOutstanding}</div>
          </div>
          <span className="text-[9px] text-muted-foreground tabular-nums">NET RECOVERY: 88.4%</span>
        </div>
      </div>

      {/* FILTER & INVOICES MATRIX LIST */}
      <div className="w-full flex flex-col tabular-nums text-[13px]">
        {/* Search Toolbar */}
        <div className="px-4 py-2 border-b border-border bg-muted/40 flex flex-col md:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-1 w-full md:w-1/3">
            <Search className="w-4 h-4 text-muted-foreground/70" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Alexander Dupont, Inv # or pet name..."
              className="w-full border-b border-border focus:outline-none bg-transparent py-0.5 text-[13px] text-foreground" 
            />
          </div>
          <div className="flex items-center gap-2 tabular-nums text-[11px]">
            <button 
              onClick={() => { setActiveSegment('all'); showToast('SHOWING ALL'); }} 
              className={`px-3 py-1 border border-border ${activeSegment === 'all' ? 'bg-primary text-primary-foreground font-semibold' : 'bg-card text-foreground hover:bg-muted/40'}`}
            >
              ALL ACCOUNTS
            </button>
            <span className="text-muted-foreground/50">|</span>
            <span className="text-muted-foreground font-semibold uppercase">SEGMENTED MATCHES: {filteredInvoices.length} INVOICES</span>
          </div>
        </div>

        {/* Table Structure */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-[13px] tabular-nums">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-foreground text-[10px] uppercase font-semibold">
                <th className="p-3 border-r border-border">INVOICE FILE ID</th>
                <th className="p-3 border-r border-border">ISSUED DATE</th>
                <th className="p-3 border-r border-border">CLIENT NAME / BREED</th>
                <th className="p-3 border-r border-border text-right">TOTAL AMOUNT</th>
                <th className="p-3 border-r border-border text-right">AGING DAYS</th>
                <th className="p-3 border-r border-border">ASSIGNED STYLIST</th>
                <th className="p-3 border-r border-border">ORIGIN NODE</th>
                <th className="p-3 text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-muted/30 transition-none">
                  <td className="p-3 border-r border-border font-semibold text-foreground">{inv.id}</td>
                  <td className="p-3 border-r border-border">{inv.date}</td>
                  <td className="p-3 border-r border-border font-semibold">
                    <div className="flex flex-col">
                      <span className="uppercase text-foreground">{inv.client}</span>
                      <span className="text-[10px] text-muted-foreground font-normal">{inv.pet}</span>
                    </div>
                  </td>
                  <td className="p-3 border-r border-border text-right font-semibold text-foreground">{inv.amount}</td>
                  <td className="p-3 border-r border-border text-right font-semibold">
                    <span className={inv.days > 60 ? 'text-destructive' : 'text-foreground'}>
                      {inv.days} DAYS LATE
                    </span>
                  </td>
                  <td className="p-3 border-r border-border uppercase">{inv.groomer}</td>
                  <td className="p-3 border-r border-border font-semibold uppercase">{inv.loc}</td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button 
                        onClick={() => showToast(`DUNNING INVOICE REMINDER DEMAND SENT TO ${inv.client}`)}
                        className="bg-primary text-primary-foreground px-2 py-1 text-[10px] uppercase font-semibold hover:bg-muted cursor-pointer"
                      >
                        DUN DEMAND
                      </button>
                      <button 
                        onClick={() => showToast(`SETTLED INVOICE CASH MANUAL OVERRIDE`)}
                        className="border border-border bg-card text-foreground px-2 py-1 text-[10px] uppercase font-semibold hover:bg-muted/40 cursor-pointer"
                      >
                        SETTLE
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
              <span>SUPER_ADMIN LEVEL 0 // ACCOUNTS RECEIVABLE LEDGER MODULE</span>
              <span className="border border-border px-1.5 bg-card text-[9px] font-semibold">[FIDO2_LEDGER_LOCKED]</span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Changes to debt-aging collection tiers, automatic dunning SMS configurations, or write-off ledger transactions require hardware-key dual verification.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-[10px] uppercase">AUDIT TRAIL:</span>
          <span className="border border-border bg-card px-2 py-0.5 text-foreground font-semibold tabular-nums">FIN_REF #TX-8041-2025</span>
          <button 
            onClick={() => showToast('FINANCIAL SESSION SIGNED OUT')}
            className="h-6 px-3 bg-primary text-primary-foreground text-[10px] uppercase font-semibold hover:bg-muted transition-none cursor-pointer"
          >
            SIGN OUT SECURE
          </button>
        </div>
      </div>

      {/* MONOCHROME TERMINAL STATUS LINE */}
      <div className="w-full bg-primary text-primary-foreground px-4 py-1.5 flex items-center justify-between tabular-nums text-[11px]">
        <div className="flex items-center gap-2">
          <span>&gt; FINANCE_DAEMON: CONNECTED</span>
          <span className="inline-block w-[7px] h-[14px] bg-card animate-pulse"></span>
        </div>
        <div className="flex items-center gap-4 text-muted-foreground/70">
          <span>BALANCE REPL: SYNCED</span>
          <span>CURRENCY: USD</span>
          <span>DAWG-OS LEDGER v2.4</span>
        </div>
      </div>
    </div>
  );
};
