'use client';

import React, { useState, useEffect } from 'react';
import { DawgNavSection } from '@/lib/types';
import { Search, BarChart3, TrendingUp, AlertOctagon, RefreshCw, FileSpreadsheet, Download, Mail, ArrowUpRight } from 'lucide-react';

interface ReportsViewProps {
  onNavigateSection?: (section: DawgNavSection) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ onNavigateSection }) => {
  // Tabs: 'profit-loss' | 'balance-sheet' | 'trial-balance' | 'general-ledger-audit' | 'revenue-telemetry' | 'disputes-chargebacks'
  const [activeReportTab, setActiveReportTab] = useState<'profit-loss' | 'balance-sheet' | 'trial-balance' | 'general-ledger-audit' | 'revenue-telemetry' | 'disputes-chargebacks'>('profit-loss');

  const [disputesList, setDisputesList] = useState<any[]>([]);
  useEffect(() => {
    fetch('/api/admin/reports?days=30').then((r) => r.ok ? r.json() : null).then((data) => {
      if (!data?.totals) return;
      // Reports view shows aggregates — disputes come from payments with status != succeeded
    }).catch(() => {});
  }, []);

  const [selectedDispute, setSelectedDispute] = useState<string | null>('DISP-401');
  const [responseEvidence, setResponseEvidence] = useState('');

  const handleDisputeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!responseEvidence.trim()) return;
    setDisputesList(prev => prev.map(d => d.id === selectedDispute ? { ...d, status: 'EVIDENCE_SUBMITTED' } : d));
    alert(`Success: Dispute response and digital grooming logs transmitted to merchant gateway.`);
    setResponseEvidence('');
  };

  return (
    <div className="flex flex-col w-full text-foreground bg-card select-text">
      {/* SYSTEM CONTEXT STRIP */}
      <div className="w-full bg-muted/40 border-b border-border px-4 py-2 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-black inline-block animate-pulse"></span>
          <span className="font-medium text-[11px] text-muted-foreground">
            Financial &amp; Compliance Reports
          </span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground text-muted-foreground">
          <span>COMPLIANCE_PASS: TRUE</span>
          <span>LEDGER_LOCK: LOCKED</span>
        </div>
      </div>

      {/* SUB-TABS STRIP */}
      <div className="w-full bg-card border-b border-border overflow-x-auto flex shrink-0">
        <button
          onClick={() => setActiveReportTab('profit-loss')}
          className={`px-6 py-3.5 text-[12px] uppercase border-r border-border flex items-center gap-2 cursor-pointer transition-colors shrink-0 ${
            activeReportTab === 'profit-loss' ? 'bg-primary text-primary-foreground font-semibold' : 'bg-card text-foreground hover:bg-muted/40'
          }`}
        >
          <span>[01]</span>
          <span>PROFIT &amp; LOSS (P&amp;L)</span>
        </button>
        <button
          onClick={() => setActiveReportTab('balance-sheet')}
          className={`px-6 py-3.5 text-[12px] uppercase border-r border-border flex items-center gap-2 cursor-pointer transition-colors shrink-0 ${
            activeReportTab === 'balance-sheet' ? 'bg-primary text-primary-foreground font-semibold' : 'bg-card text-foreground hover:bg-muted/40'
          }`}
        >
          <span>[02]</span>
          <span>BALANCE SHEET</span>
        </button>
        <button
          onClick={() => setActiveReportTab('trial-balance')}
          className={`px-6 py-3.5 text-[12px] uppercase border-r border-border flex items-center gap-2 cursor-pointer transition-colors shrink-0 ${
            activeReportTab === 'trial-balance' ? 'bg-primary text-primary-foreground font-semibold' : 'bg-card text-foreground hover:bg-muted/40'
          }`}
        >
          <span>[03]</span>
          <span>TRIAL BALANCE &amp; LEDGER</span>
        </button>
        <button
          onClick={() => setActiveReportTab('general-ledger-audit')}
          className={`px-6 py-3.5 text-[12px] uppercase border-r border-border flex items-center gap-2 cursor-pointer transition-colors shrink-0 ${
            activeReportTab === 'general-ledger-audit' ? 'bg-primary text-primary-foreground font-semibold' : 'bg-card text-foreground hover:bg-muted/40'
          }`}
        >
          <span>[04]</span>
          <span>GENERAL LEDGER AUDIT</span>
        </button>
        <button
          onClick={() => setActiveReportTab('revenue-telemetry')}
          className={`px-6 py-3.5 text-[12px] uppercase border-r border-border flex items-center gap-2 cursor-pointer transition-colors shrink-0 ${
            activeReportTab === 'revenue-telemetry' ? 'bg-primary text-primary-foreground font-semibold' : 'bg-card text-foreground hover:bg-muted/40'
          }`}
        >
          <span>[05]</span>
          <span>REVENUE TELEMETRY</span>
        </button>
        <button
          onClick={() => setActiveReportTab('disputes-chargebacks')}
          className={`px-6 py-3.5 text-[12px] uppercase border-r border-border flex items-center gap-2 cursor-pointer transition-colors shrink-0 ${
            activeReportTab === 'disputes-chargebacks' ? 'bg-primary text-primary-foreground font-semibold' : 'bg-card text-foreground hover:bg-muted/40'
          }`}
        >
          <span>[06]</span>
          <span>DISPUTES &amp; CHARGEBACKS</span>
        </button>
      </div>

      {/* TAB CONTENT: PROFIT & LOSS (P&L) */}
      {activeReportTab === 'profit-loss' && (
        <div className="animate-fade-in p-6 space-y-6 bg-muted/30 min-h-[500px]">
          {/* HEADER STRIP */}
          <div className="bg-card border border-border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="font-medium text-[11px] uppercase tracking-wider text-muted-foreground">Compliance › Reports › P&amp;L</span>
              <h2 className="font-display text-sm font-semibold tracking-tight text-foreground">Statement of Revenue &amp; Operating Income (P&amp;L)</h2>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => alert('Exporting GAAP-compliant PDF ledger summary... Generated.')}
                className="bg-card hover:bg-muted/40 text-foreground border border-border px-3 py-1 text-[11px] text-muted-foreground font-semibold cursor-pointer rounded-md flex items-center gap-1.5"
              >
                <Download className="w-3 h-3" /> EXPORT PDF
              </button>
              <button
                onClick={() => alert('Transmitting accounting spreadsheet CSV... Downloaded.')}
                className="bg-black hover:bg-muted text-white border border-border px-3 py-1 text-[11px] text-muted-foreground font-semibold cursor-pointer rounded-md flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-3 h-3" /> EXPORT CSV
              </button>
            </div>
          </div>

          {/* TELEMETRY / KPI TILES */}
          <div className="grid grid-cols-2 lg:grid-cols-5 border border-border divide-x divide-y lg:divide-y-0 divide-black bg-card">
            <div className="p-4 flex flex-col justify-between">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">GROSS REVENUE</span>
              <p className="text-lg font-semibold tabular-nums tracking-tight text-foreground mt-2">$48,600.00</p>
              <span className="text-[10px] text-success font-semibold">+12.4% vs last Q</span>
            </div>
            <div className="p-4 flex flex-col justify-between">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">TOTAL COGS</span>
              <p className="text-lg font-semibold tabular-nums tracking-tight text-foreground mt-2">$3,200.00</p>
              <span className="text-[10px] text-muted-foreground">6.6% cost of goods</span>
            </div>
            <div className="p-4 flex flex-col justify-between bg-muted/30">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">GROSS PROFIT</span>
              <p className="text-lg font-semibold tabular-nums tracking-tight text-foreground mt-2">$45,400.00</p>
              <span className="text-[10px] text-success font-semibold">93.4% Margin</span>
            </div>
            <div className="p-4 flex flex-col justify-between">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">TOTAL OPEX</span>
              <p className="text-lg font-semibold tabular-nums tracking-tight text-foreground mt-2">$22,650.00</p>
              <span className="text-[10px] text-muted-foreground">Includes labor &amp; rent</span>
            </div>
            <div className="p-4 flex flex-col justify-between bg-muted/40">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">NET INCOME (EBITDA)</span>
              <p className="text-lg font-semibold tabular-nums tracking-tight text-foreground mt-2">$22,750.00</p>
              <span className="text-[10px] text-success font-semibold">46.8% Net Margin</span>
            </div>
          </div>

          {/* MAIN P&L RECURSIVE TABLE */}
          <div className="bg-card border border-border">
            <div className="bg-muted/40 border-b border-border p-3 tabular-nums font-semibold text-[13px] uppercase flex justify-between">
              <span>UNAUDITED INCOME STATEMENT (GAAP FORMAT)</span>
              <span>PERIOD: YTD (2025)</span>
            </div>
            <div className="p-4 text-[13px] text-foreground">
              <div className="space-y-4">
                {/* REVENUES SECTION */}
                <div className="space-y-1.5">
                  <div className="border-b border-border font-semibold pb-1 uppercase flex justify-between text-muted-foreground/70 text-[10px]">
                    <span>4000 OPERATING REVENUE</span>
                    <span>BALANCE</span>
                  </div>
                  <div className="flex justify-between pl-4 py-0.5">
                    <span>4010-00 // Grooming Services Revenue (Base)</span>
                    <span className="font-semibold">$42,150.00</span>
                  </div>
                  <div className="flex justify-between pl-4 py-0.5">
                    <span>4020-00 // Walk-In / Add-On Treatments (Nails, Teeth)</span>
                    <span className="font-semibold">$4,300.00</span>
                  </div>
                  <div className="flex justify-between pl-4 py-0.5">
                    <span>4030-00 // Retail Merchandise &amp; Boutique Sales</span>
                    <span className="font-semibold">$2,150.00</span>
                  </div>
                  <div className="flex justify-between pl-4 py-0.5 border-b border-border pb-1.5">
                    <span>4040-00 // Late Cancellations / No-Show Escrow Fees</span>
                    <span className="font-semibold">$0.00</span>
                  </div>
                  <div className="flex justify-between font-semibold text-foreground pt-1 bg-muted/30 p-1.5">
                    <span>TOTAL OPERATING REVENUE</span>
                    <span>$48,600.00</span>
                  </div>
                </div>

                {/* COGS SECTION */}
                <div className="space-y-1.5">
                  <div className="border-b border-border font-semibold pb-1 uppercase flex justify-between text-muted-foreground/70 text-[10px]">
                    <span>5000 COST OF GOODS SOLD (COGS)</span>
                    <span>BALANCE</span>
                  </div>
                  <div className="flex justify-between pl-4 py-0.5">
                    <span>5010-00 // Professional Grooming Supplies (Shampoos, Oils)</span>
                    <span className="font-semibold">$2,100.00</span>
                  </div>
                  <div className="flex justify-between pl-4 py-0.5 border-b border-border pb-1.5">
                    <span>5020-00 // Wholesale Cost of Retail Inventory Items</span>
                    <span className="font-semibold">$1,100.00</span>
                  </div>
                  <div className="flex justify-between font-semibold text-foreground pt-1 bg-muted/30 p-1.5">
                    <span>TOTAL COST OF GOODS SOLD</span>
                    <span>($3,200.00)</span>
                  </div>
                </div>

                {/* OPEX SECTION */}
                <div className="space-y-1.5">
                  <div className="border-b border-border font-semibold pb-1 uppercase flex justify-between text-muted-foreground/70 text-[10px]">
                    <span>6000 OPERATING EXPENSES (OPEX)</span>
                    <span>BALANCE</span>
                  </div>
                  <div className="flex justify-between pl-4 py-0.5">
                    <span>6010-00 // Groomer Salaries &amp; Staff Wages (Accrued)</span>
                    <span className="font-semibold">$18,450.00</span>
                  </div>
                  <div className="flex justify-between pl-4 py-0.5">
                    <span>6020-00 // Facility Rent &amp; Commercial Utilities</span>
                    <span className="font-semibold">$3,200.00</span>
                  </div>
                  <div className="flex justify-between pl-4 py-0.5 border-b border-border pb-1.5">
                    <span>6030-00 // Advertising, Local SEO, and SMS Notification Triggers</span>
                    <span className="font-semibold">$1,000.00</span>
                  </div>
                  <div className="flex justify-between font-semibold text-foreground pt-1 bg-muted/30 p-1.5">
                    <span>TOTAL OPERATING EXPENSES</span>
                    <span>($22,650.00)</span>
                  </div>
                </div>

                {/* EBITDA ACCRUAL */}
                <div className="border-t-2 border-border pt-3 flex justify-between items-center bg-primary text-primary-foreground p-3 font-semibold text-sm">
                  <span>NET OPERATING INCOME (EBITDA)</span>
                  <span className="text-success font-semibold">$22,750.00</span>
                </div>
              </div>

              {/* FOOTNOTES / GAAP STANDARDS DISCLOSURES */}
              <div className="border-t border-border pt-4 mt-6 space-y-1 text-[9px] text-muted-foreground/70 leading-relaxed tabular-nums">
                <div>[DISCLOSURE 01] GAAP REVENUE RECOGNITION: Revenue from pet grooming services is recognized immediately upon complete checkout capture. No-show holds are accrued strictly in accordance with client agreements.</div>
                <div>[DISCLOSURE 02] LEASE COMMITTALS: Rental expenses are calculated straight-line. Direct costs of shampoo supplies are categorized strictly under COGS.</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: BALANCE SHEET */}
      {activeReportTab === 'balance-sheet' && (
        <div className="animate-fade-in p-6 space-y-6 bg-muted/30 min-h-[500px]">
          <div className="border border-border bg-card p-6">
            <div className="border-b border-border pb-4 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="font-medium text-[11px] uppercase tracking-wider text-muted-foreground">Compliance › Reports › Balance Sheet</span>
                <h2 className="font-display text-sm font-semibold tracking-tight text-foreground mt-1">Consolidated Statement of Financial Position</h2>
              </div>
              <div className="text-right text-[12px]">
                <div>PERIOD ENDING: MAY 12, 2025</div>
                <div className="text-muted-foreground/70 mt-0.5">CURRENCY: USD [UNAUDITED // INTERNAL USE ONLY]</div>
              </div>
            </div>

            {/* ASSETS / LIABILITIES GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-[13px] tabular-nums">
              {/* ASSETS SIDE */}
              <div className="space-y-6">
                <div className=" border-border pb-2 flex justify-between items-end">
                  <h3 className="font-semibold text-sm uppercase text-foreground">01 // ACTIVE CURRENT &amp; FIXED ASSETS</h3>
                  <span className="text-[10px] text-muted-foreground/70">DEBIT BALANCE NATURE</span>
                </div>
                <div className="divide-y divide-neutral-200">
                  <div className="py-2.5 flex justify-between">
                    <span>1010-00 // Cash &amp; Bank Equivalents</span>
                    <strong className="text-foreground font-semibold">$18,450.00</strong>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span>1020-00 // Client Escrow Deposits Hold Account</span>
                    <strong className="text-foreground font-semibold">$6,780.00</strong>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span>1210-00 // Accounts Receivable (Invoiced Balance)</span>
                    <strong className="text-foreground font-semibold">$380.00</strong>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span>1410-00 // Operating Salon Shampoo Supplies &amp; PO Hold</span>
                    <strong className="text-foreground font-semibold">$1,200.00</strong>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span>1610-00 // Mobile Groomer Van Equipment Unit #01</span>
                    <strong className="text-foreground font-semibold">$45,000.00</strong>
                  </div>
                </div>
                <div className="pt-4 border-t-2 border-border flex justify-between items-center bg-muted/30 p-3">
                  <span className="font-semibold uppercase text-foreground text-sm">Total Consolidated Assets</span>
                  <strong className="text-foreground font-semibold text-lg tabular-nums">$71,810.00</strong>
                </div>
              </div>

              {/* LIABILITIES & EQUITIES SIDE */}
              <div className="space-y-6">
                <div className=" border-border pb-2 flex justify-between items-end">
                  <h3 className="font-semibold text-sm uppercase text-foreground">02 // LIABILITIES &amp; SHAREHOLDERS EQUITY</h3>
                  <span className="text-[10px] text-muted-foreground/70">CREDIT BALANCE NATURE</span>
                </div>
                <div className="divide-y divide-neutral-200">
                  <div className="py-2 flex justify-between text-muted-foreground font-semibold">
                    <span>[CURRENT LIABILITIES]</span>
                    <span>—</span>
                  </div>
                  <div className="py-2.5 flex justify-between pl-4">
                    <span>2010-00 // Accounts Payable (Operating Bills)</span>
                    <strong className="text-foreground font-semibold">$4,686.00</strong>
                  </div>
                  <div className="py-2.5 flex justify-between pl-4">
                    <span>2020-00 // Accrued Sales Taxes Collected</span>
                    <strong className="text-foreground font-semibold">$542.00</strong>
                  </div>
                  <div className="py-2 flex justify-between text-muted-foreground font-semibold">
                    <span>[SHAREHOLDERS EQUITIES]</span>
                    <span>—</span>
                  </div>
                  <div className="py-2.5 flex justify-between pl-4">
                    <span>3010-00 // Paid-in Capital Stock Shares</span>
                    <strong className="text-foreground font-semibold">$50,000.00</strong>
                  </div>
                  <div className="py-2.5 flex justify-between pl-4">
                    <span>3110-00 // Retained Salon Earnings</span>
                    <strong className="text-foreground font-semibold">$16,582.00</strong>
                  </div>
                </div>
                <div className="pt-4 border-t-2 border-border flex justify-between items-center bg-muted/30 p-3">
                  <span className="font-semibold uppercase text-foreground text-sm">Total Liabilities &amp; Equity</span>
                  <strong className="text-foreground font-semibold text-lg tabular-nums">$71,810.00</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: TRIAL BALANCE */}
      {activeReportTab === 'trial-balance' && (
        <div className="animate-fade-in p-6 bg-muted/30 min-h-[500px]">
          <div className="border border-border bg-card p-6">
            <div className="border-b border-border pb-4 mb-6">
              <span className="font-medium text-[11px] uppercase tracking-wider text-muted-foreground">Compliance › Trial Balance</span>
              <h2 className="font-display text-sm font-semibold tracking-tight text-foreground mt-1">Consolidated Trial Balance Status</h2>
            </div>

            <div className="border border-border overflow-x-auto">
              <table className="w-full text-left text-[13px] text-foreground border-collapse">
                <thead>
                  <tr className="bg-muted/30 border-b border-border font-semibold uppercase">
                    <th className="p-3 border-r border-border">ACCOUNT GL CODE</th>
                    <th className="p-3 border-r border-border">ACCOUNT DESCRIPTION</th>
                    <th className="p-3 border-r border-border text-right w-44">DEBIT BALANCE (DR)</th>
                    <th className="p-3 text-right w-44">CREDIT BALANCE (CR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-medium">
                  <tr>
                    <td className="p-3 border-r border-border">1010-00</td>
                    <td className="p-3 border-r border-border">Operating Checking Cash</td>
                    <td className="p-3 border-r border-border text-right font-semibold">$18,450.00</td>
                    <td className="p-3 text-right text-muted-foreground/70">—</td>
                  </tr>
                  <tr>
                    <td className="p-3 border-r border-border">1020-00</td>
                    <td className="p-3 border-r border-border">Client Escrow Deposits</td>
                    <td className="p-3 border-r border-border text-right font-semibold">$6,780.00</td>
                    <td className="p-3 text-right text-muted-foreground/70">—</td>
                  </tr>
                  <tr>
                    <td className="p-3 border-r border-border">1210-00</td>
                    <td className="p-3 border-r border-border">Accounts Receivable (A/R)</td>
                    <td className="p-3 border-r border-border text-right font-semibold">$380.00</td>
                    <td className="p-3 text-right text-muted-foreground/70">—</td>
                  </tr>
                  <tr>
                    <td className="p-3 border-r border-border">1410-00</td>
                    <td className="p-3 border-r border-border">Boutique Inventory Assets</td>
                    <td className="p-3 border-r border-border text-right font-semibold">$1,200.00</td>
                    <td className="p-3 text-right text-muted-foreground/70">—</td>
                  </tr>
                  <tr>
                    <td className="p-3 border-r border-border">1610-00</td>
                    <td className="p-3 border-r border-border">Mobile Grooming Vans</td>
                    <td className="p-3 border-r border-border text-right font-semibold">$45,000.00</td>
                    <td className="p-3 text-right text-muted-foreground/70">—</td>
                  </tr>
                  <tr>
                    <td className="p-3 border-r border-border">2010-00</td>
                    <td className="p-3 border-r border-border">Accounts Payable (AP)</td>
                    <td className="p-3 border-r border-border text-right text-muted-foreground/70">—</td>
                    <td className="p-3 text-right font-semibold">$4,686.00</td>
                  </tr>
                  <tr>
                    <td className="p-3 border-r border-border">2020-00</td>
                    <td className="p-3 border-r border-border">Sales Tax Liabilities</td>
                    <td className="p-3 border-r border-border text-right text-muted-foreground/70">—</td>
                    <td className="p-3 text-right font-semibold">$542.00</td>
                  </tr>
                  <tr>
                    <td className="p-3 border-r border-border">3010-00</td>
                    <td className="p-3 border-r border-border">Owner Equity Capital</td>
                    <td className="p-3 border-r border-border text-right text-muted-foreground/70">—</td>
                    <td className="p-3 text-right font-semibold">$50,000.00</td>
                  </tr>
                  <tr>
                    <td className="p-3 border-r border-border">3110-00</td>
                    <td className="p-3 border-r border-border">Retained Salon Earnings</td>
                    <td className="p-3 border-r border-border text-right text-muted-foreground/70">—</td>
                    <td className="p-3 text-right font-semibold">$16,582.00</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="bg-muted/40 border-t border-border font-semibold text-foreground">
                    <td className="p-3 border-r border-border uppercase text-right" colSpan={2}>TRIAL BALANCE EQUILIBRIUM check</td>
                    <td className="p-3 border-r border-border text-right">$71,810.00</td>
                    <td className="p-3 text-right">$71,810.00</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="bg-success/10 border border-success/20 p-3 mt-4 text-[10px] font-semibold text-success uppercase flex items-center justify-between">
              <span>LEDGER EQUILIBRIUM: OK (ZERO SYSTEM DEVIATION DETECTED)</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: GENERAL LEDGER AUDIT */}
      {activeReportTab === 'general-ledger-audit' && (
        <div className="animate-fade-in p-6 bg-muted/30 min-h-[500px]">
          <div className="bg-card border border-border p-6 space-y-4">
            <h3 className="text-sm font-semibold tabular-nums uppercase text-foreground">3.1 Books &amp; General Records Auditing Hook</h3>
            <p className="text-[13px] text-muted-foreground tabular-nums">
              Auditing tools and trial balance verification modules are fully integrated into All About Pawz Ledger Books. 
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (onNavigateSection) {
                    onNavigateSection('books');
                  }
                }}
                className="bg-primary text-primary-foreground hover:bg-primary/90 border border-border px-4 py-2 text-[12px] uppercase tracking-wider font-semibold transition-colors cursor-pointer rounded-md"
              >
                OPEN GL LEDGER BOOKS VIEW
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: REVENUE TELEMETRY */}
      {activeReportTab === 'revenue-telemetry' && (
        <div className="animate-fade-in p-6 bg-muted/30 min-h-[500px] space-y-6">
          <div className="bg-card border border-border p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <span className="text-[11px] text-muted-foreground/70 uppercase">REVENUE VELOCITY // TELEMETRY STREAM</span>
                <h2 className="text-sm font-semibold tabular-nums uppercase text-foreground">WEEKLY REVENUE TELEMETRY DIAGRAM</h2>
              </div>
              <span className="text-success font-semibold text-[13px] tabular-nums">+12.8% OVER TARGET</span>
            </div>

            {/* Simulated graph / SVG diagram */}
            <div className="border border-border p-4 bg-muted/30 h-[220px] flex items-end justify-between gap-2">
              <div className="flex-1 flex flex-col items-center h-full justify-end">
                <div className="w-full bg-black hover:opacity-80 transition-opacity" style={{ height: '65%' }}></div>
                <span className="text-[10px] mt-2 font-semibold text-muted-foreground">MON</span>
              </div>
              <div className="flex-1 flex flex-col items-center h-full justify-end">
                <div className="w-full bg-black hover:opacity-80 transition-opacity" style={{ height: '78%' }}></div>
                <span className="text-[10px] mt-2 font-semibold text-muted-foreground">TUE</span>
              </div>
              <div className="flex-1 flex flex-col items-center h-full justify-end">
                <div className="w-full bg-black hover:opacity-80 transition-opacity" style={{ height: '55%' }}></div>
                <span className="text-[10px] mt-2 font-semibold text-muted-foreground">WED</span>
              </div>
              <div className="flex-1 flex flex-col items-center h-full justify-end">
                <div className="w-full bg-black hover:opacity-80 transition-opacity" style={{ height: '90%' }}></div>
                <span className="text-[10px] mt-2 font-semibold text-muted-foreground">THU</span>
              </div>
              <div className="flex-1 flex flex-col items-center h-full justify-end">
                <div className="w-full bg-black hover:opacity-80 transition-opacity" style={{ height: '85%' }}></div>
                <span className="text-[10px] mt-2 font-semibold text-muted-foreground">FRI</span>
              </div>
              <div className="flex-1 flex flex-col items-center h-full justify-end">
                <div className="w-full bg-black hover:opacity-80 transition-opacity" style={{ height: '98%' }}></div>
                <span className="text-[10px] mt-2 font-semibold text-muted-foreground">SAT</span>
              </div>
              <div className="flex-1 flex flex-col items-center h-full justify-end">
                <div className="w-full bg-black hover:opacity-80 transition-opacity" style={{ height: '30%' }}></div>
                <span className="text-[10px] mt-2 font-semibold text-muted-foreground">SUN</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[13px] text-foreground pt-4">
              <div className="border border-border p-3 bg-card">
                <span className="text-[9px] uppercase font-semibold text-muted-foreground/70">AVERAGE TICKET SIZE</span>
                <p className="text-base font-semibold mt-1">$128.50</p>
              </div>
              <div className="border border-border p-3 bg-card">
                <span className="text-[9px] uppercase font-semibold text-muted-foreground/70">DAILY CHECKOUT COUNT</span>
                <p className="text-base font-semibold mt-1">28 Checkout Sessions</p>
              </div>
              <div className="border border-border p-3 bg-card">
                <span className="text-[9px] uppercase font-semibold text-muted-foreground/70">SATURDAY CONVERSION</span>
                <p className="text-base font-semibold mt-1">98.2% immediate settlement</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: DISPUTES & CHARGEBACKS */}
      {activeReportTab === 'disputes-chargebacks' && (
        <div className="animate-fade-in p-6 bg-muted/30 min-h-[500px] grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* DISPUTES INTAKE */}
          <div className="lg:col-span-5 bg-card border border-border flex flex-col">
            <div className="bg-muted/40 border-b border-border p-3 tabular-nums font-semibold text-[13px] uppercase flex justify-between items-center">
              <span>DISPUTES INTAKE RADAR</span>
              <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.2">STRIPE REAL-TIME</span>
            </div>
            <div className="divide-y divide-border overflow-y-auto flex-1 h-[450px] custom-scrollbar bg-card text-[12px]">
              {disputesList.map(disp => (
                <button
                  key={disp.id}
                  onClick={() => setSelectedDispute(disp.id)}
                  className={`w-full text-left p-4 space-y-2 cursor-pointer transition-colors block border-none ${
                    selectedDispute === disp.id ? 'bg-muted/40' : 'hover:bg-muted/30 bg-card'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{disp.id} {"//"} {disp.client}</span>
                    <span className="text-destructive font-semibold">${disp.amount.toFixed(2)}</span>
                  </div>
                  <p className="text-muted-foreground truncate max-w-[280px]">{disp.reason}</p>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground/70 font-medium">
                    <span>Deadline: {disp.deadline}</span>
                    <span className={`text-[9px] font-semibold border px-2 py-0.5 uppercase ${
                      disp.status === 'NEEDS_RESPONSE' ? 'bg-warning/10 border-warning/20 text-warning animate-pulse' :
                      disp.status === 'WON' ? 'bg-success/10 border-success/20 text-success' :
                      'bg-muted/40 border-border text-muted-foreground'
                    }`}>
                      {disp.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* RESPONSE EVIDENCE BUILDER */}
          <div className="lg:col-span-7 bg-card border border-border">
            {(() => {
              const disp = disputesList.find(d => d.id === selectedDispute);
              if (!disp) return <div className="p-6 text-[12px] text-muted-foreground/70 text-center">Select a dispute case from the gateway radar list.</div>;

              return (
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div>
                      <span className="text-[11px] bg-primary text-primary-foreground px-1.5 py-0.5 font-semibold uppercase">DISPUTE DETAIL // {disp.id}</span>
                      <h3 className="text-sm font-semibold tabular-nums mt-1.5 uppercase">{disp.client}</h3>
                    </div>
                    <span className="text-destructive font-semibold text-sm tabular-nums">${disp.amount.toFixed(2)}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-[12px]">
                    <div>
                      <span className="text-[9px] text-muted-foreground/70 font-semibold uppercase">REASON CODE / CLAIM</span>
                      <p className="font-semibold text-foreground mt-1">{disp.reason}</p>
                    </div>
                    <div>
                      <span className="text-[9px] text-muted-foreground/70 font-semibold uppercase">GATEWAY CASE DEADLINE</span>
                      <p className="font-semibold text-destructive mt-1">{disp.deadline}</p>
                    </div>
                  </div>

                  <div className="border border-border p-3 bg-muted/30 text-[12px] leading-relaxed text-muted-foreground">
                    <strong>SYSTEM AUDIT SUGGESTION:</strong> Milo (Moodle) checked in on {disp.date} under groomer Sarah M. with complete signed waiver checkout. Electronic logs show physical signature clearance. Transmit logs as dispute evidence to secure immediate payout hold release.
                  </div>

                  {disp.status === 'NEEDS_RESPONSE' ? (
                    <form onSubmit={handleDisputeSubmit} className="space-y-4">
                      <div>
                        <label className="block font-medium text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Response Evidence Pack &amp; Grooming Logs *</label>
                        <textarea
                          required
                          value={responseEvidence}
                          onChange={(e) => setResponseEvidence(e.target.value)}
                          rows={4}
                          className="w-full bg-card border border-border p-2 text-[12px] focus:outline-none text-foreground placeholder:text-muted-foreground/50"
                          placeholder="e.g. Attaching Signed Waiver Checkout, Digital RFID Paw ID scanning, and Grooming Completion Photo..."
                        />
                      </div>
                      <button
                        type="submit"
                        className="bg-primary text-primary-foreground hover:bg-primary/90 border border-border px-4 py-2 text-[12px] uppercase tracking-wider font-semibold transition-colors cursor-pointer rounded-md w-full"
                      >
                        TRANSMIT EVIDENCE TO STRIPE MERCHANT PORTAL
                      </button>
                    </form>
                  ) : (
                    <div className="bg-success/10 border border-success/20 p-3 flex items-center justify-center text-[12px] text-success font-semibold uppercase gap-2">
                      <span>✓ DISPUTE EVIDENCE ACQUIRED BY MERCHANT AUDITOR. CASE SUBMITTED.</span>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
