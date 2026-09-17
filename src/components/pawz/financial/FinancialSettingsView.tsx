'use client';

import React, { useState } from 'react';
import { DawgNavSection } from '@/lib/types';

interface FinancialSettingsViewProps {
  onNavigateSection?: (section: DawgNavSection) => void;
}

export const FinancialSettingsView: React.FC<FinancialSettingsViewProps> = ({ onNavigateSection }) => {
  // Tabs: 'company' | 'sales-payments' | 'customer-portal'
  const [activeSettingsTab, setActiveSettingsTab] = useState<'company' | 'sales-payments' | 'customer-portal'>('company');

  // State for Company info
  const [companyName, setCompanyName] = useState('ALL ABOUT PAWZ LTD');
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [fiscalYearEnd, setFiscalYearEnd] = useState('DECEMBER_31');

  // State for Sales & Payments Setup
  const [requireDeposit, setRequireDeposit] = useState(true);
  const [defaultDepositAmt, setDefaultDepositAmt] = useState('25.00');
  const [paymentTermsDays, setPaymentTermsDays] = useState('7');

  // State for Customer Portal
  const [allowSelfBooking, setAllowSelfBooking] = useState(true);
  const [showInvoiceHistory, setShowInvoiceHistory] = useState(true);

  const handleSaveSettings = () => {
    alert('SYSTEM CONFIGURATION: Financial settings saved successfully. System ledger values synchronized.');
  };

  return (
    <div className="flex flex-col w-full text-foreground bg-card select-text">
      {/* SYSTEM CONTEXT STRIP */}
      <div className="w-full bg-muted/40 border-b border-border px-4 py-2 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-black inline-block"></span>
          <span className="font-medium text-[11px] text-muted-foreground">
            Financial Settings
          </span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground text-muted-foreground">
          <span>SECURE_ENCRYPT: AES_256</span>
        </div>
      </div>

      {/* SUB-TABS NAVIGATION */}
      <div className="w-full bg-card border-b border-border overflow-x-auto flex shrink-0">
        <button
          onClick={() => setActiveSettingsTab('company')}
          className={`px-6 py-3.5 text-[12px] uppercase border-r border-border flex items-center gap-2 cursor-pointer transition-colors ${
            activeSettingsTab === 'company' ? 'bg-primary text-primary-foreground font-semibold' : 'bg-card text-foreground hover:bg-muted/40'
          }`}
        >
          <span>[01]</span>
          <span>COMPANY &amp; CURRENCIES</span>
        </button>
        <button
          onClick={() => setActiveSettingsTab('sales-payments')}
          className={`px-6 py-3.5 text-[12px] uppercase border-r border-border flex items-center gap-2 cursor-pointer transition-colors ${
            activeSettingsTab === 'sales-payments' ? 'bg-primary text-primary-foreground font-semibold' : 'bg-card text-foreground hover:bg-muted/40'
          }`}
        >
          <span>[02]</span>
          <span>SALES &amp; PAYMENTS SETUP</span>
        </button>
        <button
          onClick={() => setActiveSettingsTab('customer-portal')}
          className={`px-6 py-3.5 text-[12px] uppercase border-r border-border flex items-center gap-2 cursor-pointer transition-colors ${
            activeSettingsTab === 'customer-portal' ? 'bg-primary text-primary-foreground font-semibold' : 'bg-card text-foreground hover:bg-muted/40'
          }`}
        >
          <span>[03]</span>
          <span>ADMIN SETTINGS - CUSTOMER PORTAL</span>
        </button>
      </div>

      {/* TAB CONTENT: COMPANY & CURRENCIES */}
      {activeSettingsTab === 'company' && (
        <div className="animate-fade-in p-6 space-y-6">
          <div className="border border-border bg-card p-6 shadow-card-md max-w-3xl space-y-6">
            <div className="border-b border-border pb-3">
              <span className="font-medium text-[11px] uppercase tracking-wider text-muted-foreground">Company Info</span>
              <h3 className="font-display text-md font-semibold tracking-tight text-foreground mt-0.5">Company Registration &amp; Base Ledger Currencies</h3>
            </div>

            <div className="space-y-4 text-[12px]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-muted-foreground mb-1 uppercase">COMPANY LEGAL REGISTER NAME //*</label>
                  <input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-card border border-border px-3 py-2 text-[13px] text-foreground focus:outline-none rounded-md"
                    type="text"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground mb-1 uppercase">BASE LEDGER CURRENCY //*</label>
                  <select
                    value={baseCurrency}
                    onChange={(e) => setBaseCurrency(e.target.value)}
                    className="w-full bg-card border border-border px-2 py-2 text-[13px] text-foreground focus:outline-none rounded-md cursor-pointer"
                  >
                    <option value="USD">USD ($) // UNITED STATES DOLLAR</option>
                    <option value="EUR">EUR (€) // EUROPEAN UNION EURO</option>
                    <option value="GBP">GBP (£) // BRITISH POUND STERLING</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-muted-foreground mb-1 uppercase">FISCAL YEAR END DETERMINANT //*</label>
                  <select
                    value={fiscalYearEnd}
                    onChange={(e) => setFiscalYearEnd(e.target.value)}
                    className="w-full bg-card border border-border px-2 py-2 text-[13px] text-foreground focus:outline-none rounded-md cursor-pointer"
                  >
                    <option value="DECEMBER_31">DECEMBER 31 // STANDARD CALENDAR CALC</option>
                    <option value="JUNE_30">JUNE 30 // RETROGRADE TERM END</option>
                    <option value="SEPTEMBER_30">SEPTEMBER 30 // QUARTER THREE CLOSURE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground mb-1 uppercase">PRIMARY REGIONAL JURISDICTION</label>
                  <input
                    className="w-full bg-card border border-border px-3 py-2 text-[13px] text-foreground focus:outline-none rounded-md"
                    type="text"
                    defaultValue="OKLAHOMA // UNITED STATES"
                    disabled
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border flex justify-end">
              <button
                onClick={handleSaveSettings}
                className="bg-black hover:bg-muted text-white border border-border px-5 py-2 text-[12px] uppercase font-semibold tracking-wider transition-colors cursor-pointer rounded-md"
              >
                SAVE COMPANY DETAILS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: SALES & PAYMENTS SETUP */}
      {activeSettingsTab === 'sales-payments' && (
        <div className="animate-fade-in p-6 space-y-6">
          <div className="border border-border bg-card p-6 shadow-card-md max-w-3xl space-y-6">
            <div className="border-b border-border pb-3">
              <span className="font-medium text-[11px] uppercase tracking-wider text-muted-foreground">Checkout Policies</span>
              <h3 className="font-display text-md font-semibold tracking-tight text-foreground mt-0.5">Sales Binding &amp; Payment Collection Rules</h3>
            </div>

            <div className="space-y-4 text-[12px] text-foreground">
              <div className="flex items-center justify-between gap-4 pb-4 border-b border-border">
                <div className="max-w-xl">
                  <div className="font-semibold text-foreground text-sm">Require Escrow Security Hold on Booking</div>
                  <div className="text-[12px] text-muted-foreground/70 mt-1">
                    Enforces automatic credit/debit deposit hold when booking through salon client portal or POS terminal.
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    checked={requireDeposit}
                    onChange={(e) => setRequireDeposit(e.target.checked)}
                    className="w-4 h-4 rounded-md accent-black border border-border cursor-pointer"
                    type="checkbox"
                  />
                  <span className="tabular-nums font-semibold text-foreground uppercase">ENFORCE_DEP</span>
                </label>
              </div>

              {requireDeposit && (
                <div className="pl-6 pb-4 border-b border-border">
                  <label className="block text-[10px] text-muted-foreground mb-1 uppercase">DEFAULT DEPOSIT ESCROW AMOUNT ($USD) //*</label>
                  <input
                    value={defaultDepositAmt}
                    onChange={(e) => setDefaultDepositAmt(e.target.value)}
                    className="bg-card border border-border px-3 py-1.5 text-[13px] text-foreground focus:outline-none rounded-md max-w-xs"
                    type="text"
                  />
                </div>
              )}

              <div className="flex items-center justify-between gap-4 pb-4 border-b border-border">
                <div className="max-w-xl">
                  <div className="font-semibold text-foreground text-sm">Outstanding Invoice Payment Grace Period</div>
                  <div className="text-[12px] text-muted-foreground/70 mt-1">
                    Maximum billing days grace allowed before automatic penalty charge is applied and marked as Overdue.
                  </div>
                </div>
                <div className="flex items-center gap-2 tabular-nums">
                  <input
                    value={paymentTermsDays}
                    onChange={(e) => setPaymentTermsDays(e.target.value)}
                    className="w-16 bg-card border border-border px-2 py-1 text-center text-[13px] text-foreground focus:outline-none"
                    type="text"
                  />
                  <span className="text-[11px] font-semibold text-foreground uppercase">DAYS</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border flex justify-end">
              <button
                onClick={handleSaveSettings}
                className="bg-black hover:bg-muted text-white border border-border px-5 py-2 text-[12px] uppercase font-semibold tracking-wider transition-colors cursor-pointer rounded-md"
              >
                SAVE INTAKE CRITERIA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: CUSTOMER PORTAL */}
      {activeSettingsTab === 'customer-portal' && (
        <div className="animate-fade-in p-6 space-y-6">
          <div className="border border-border bg-card p-6 shadow-card-md max-w-3xl space-y-6">
            <div className="border-b border-border pb-3">
              <span className="font-medium text-[11px] uppercase tracking-wider text-muted-foreground">Customer Web Interface</span>
              <h3 className="font-display text-md font-semibold tracking-tight text-foreground mt-0.5">Client Portal Interactive Permissions</h3>
            </div>

            <div className="space-y-4 text-[12px] text-foreground">
              <div className="flex items-center justify-between gap-4 pb-4 border-b border-border">
                <div className="max-w-xl">
                  <div className="font-semibold text-foreground text-sm">Allow Self-Service Grooming Booking</div>
                  <div className="text-[12px] text-muted-foreground/70 mt-1">
                    Permits registered clients to select timeslots, assign groomers, and submit deposits via their portal.
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    checked={allowSelfBooking}
                    onChange={(e) => setAllowSelfBooking(e.target.checked)}
                    className="w-4 h-4 rounded-md accent-black border border-border cursor-pointer"
                    type="checkbox"
                  />
                  <span className="tabular-nums font-semibold text-foreground uppercase">ALLOW_PORTAL</span>
                </label>
              </div>

              <div className="flex items-center justify-between gap-4 pb-4 border-b border-border">
                <div className="max-w-xl">
                  <div className="font-semibold text-foreground text-sm">Expose Real-time Invoice &amp; Statement Ledger</div>
                  <div className="text-[12px] text-muted-foreground/70 mt-1">
                    Clients can securely download past transaction statements, pay outstanding balances, and check digital gift card histories.
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    checked={showInvoiceHistory}
                    onChange={(e) => setShowInvoiceHistory(e.target.checked)}
                    className="w-4 h-4 rounded-md accent-black border border-border cursor-pointer"
                    type="checkbox"
                  />
                  <span className="tabular-nums font-semibold text-foreground uppercase">EXPOSE_LEDGER</span>
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-border flex justify-end">
              <button
                onClick={handleSaveSettings}
                className="bg-black hover:bg-muted text-white border border-border px-5 py-2 text-[12px] uppercase font-semibold tracking-wider transition-colors cursor-pointer rounded-md"
              >
                SAVE PORTAL PERMISSIONS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
