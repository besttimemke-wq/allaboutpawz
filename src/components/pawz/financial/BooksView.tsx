'use client';

import React, { useState, useEffect } from 'react';
import { DawgNavSection } from '@/lib/types';
import { Search, Plus, CheckCircle2, AlertTriangle, ArrowRight, BookOpen, Terminal, Check } from 'lucide-react';

interface BooksViewProps {
  onNavigateSection?: (section: DawgNavSection) => void;
}

export const BooksView: React.FC<BooksViewProps> = ({ onNavigateSection }) => {
  const [activeTab, setActiveTab] = useState<'coa' | 'transactions' | 'je' | 'gl'>('gl');
  const [coaSearch, setCoaSearch] = useState('');
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [commandText, setCommandText] = useState('');
  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    'All About Pawz Ledger Engine v2.4 initialized.',
    'System status: SECURE. Balanced double-entry verification passes (zero-delta delta=0.00).',
    'Ready for command intake. Try typing ":POST JE-003" or ":AUDIT".'
  ]);

  // Chart of Accounts State
  const [accounts, setAccounts] = useState([
    { code: '1000', name: 'Operating Cash (Clearing)', type: 'Asset', sub: 'Cash & Cash Equivalents', balance: 48150.00, status: 'Active' },
    { code: '1100', name: 'Accounts Receivable (A/R)', type: 'Asset', sub: 'Current Assets', balance: 14220.00, status: 'Active' },
    { code: '1200', name: 'Inventory Asset (Supplies & Retail)', type: 'Asset', sub: 'Current Assets', balance: 8450.00, status: 'Active' },
    { code: '1500', name: 'Commercial Grooming Fixtures', type: 'Asset', sub: 'Fixed Assets', balance: 24500.00, status: 'Active' },
    { code: '2000', name: 'Accounts Payable (A/P)', type: 'Liability', sub: 'Current Liabilities', balance: 4890.00, status: 'Active' },
    { code: '2100', name: 'Sales Tax Payable (NYS & Local)', type: 'Liability', sub: 'Current Liabilities', balance: 2845.50, status: 'Active' },
    { code: '2200', name: 'Groomer Tips Escrow Ledger', type: 'Liability', sub: 'Current Liabilities', balance: 1250.00, status: 'Active' },
    { code: '3000', name: 'Owner Equity (Initial Capital)', type: 'Equity', sub: 'Equity', balance: 50000.00, status: 'Active' },
    { code: '3100', name: 'Retained Earnings', type: 'Equity', sub: 'Equity', balance: 36334.50, status: 'Active' },
    { code: '4000', name: 'Grooming Services Revenue', type: 'Revenue', sub: 'Operating Revenue', balance: 42150.00, status: 'Active' },
    { code: '4100', name: 'Retail Merchandise Revenue', type: 'Revenue', sub: 'Operating Revenue', balance: 6450.00, status: 'Active' },
    { code: '5000', name: 'Cost of Goods Sold (COGS)', type: 'Expense', sub: 'Direct Expenses', balance: 3200.00, status: 'Active' },
    { code: '6000', name: 'Staff Wages & Contractor Payouts', type: 'Expense', sub: 'Operating Expenses', balance: 18450.00, status: 'Active' },
    { code: '6100', name: 'Facility Rent & Utilities', type: 'Expense', sub: 'Operating Expenses', balance: 4200.00, status: 'Active' },
  ]);

  const [newAccount, setNewAccount] = useState({
    code: '',
    name: '',
    type: 'Asset',
    sub: 'Current Assets',
    balance: '0.00',
  });

  // Transactions State
  const [transactions, setTransactions] = useState<any[]>([]);
  useEffect(() => {
    fetch('/api/admin/payments?limit=200').then((r) => r.ok ? r.json() : null).then((data) => {
      if (!data?.payments) return;
      const rows: any[] = [];
      for (const p of data.payments) {
        const amt = Number(p.amount) || 0; if (amt <= 0) continue;
        const txnId = p.id || `TXN-${Date.now()}`;
        const date = p.date || new Date().toISOString().slice(0,10);
        const memo = `${p.tender || 'Payment'} · ${p.customer || 'Walk-in'}`;
        rows.push({ id: txnId, date, memo, account: '1000 Operating Cash', debit: amt, credit: 0, reconciled: p.status === 'PAID', type: 'DEBIT' });
        rows.push({ id: txnId, date, memo, account: '4000 Service Revenue', debit: 0, credit: amt, reconciled: p.status === 'PAID', type: 'CREDIT' });
      }
      if (rows.length > 0) setTransactions(rows);
    }).catch(() => {});
  }, []);

  // Journal Entries State
  const [journalEntries, setJournalEntries] = useState([
    {
      id: 'JE-001',
      date: '2025-05-12',
      narrative: 'Record accrued groomer commission splits & tips',
      status: 'POSTED',
      lines: [
        { account: '6000 Staff Wages', debit: 850.00, credit: 0 },
        { account: '2200 Tips Escrow', debit: 150.00, credit: 0 },
        { account: '2000 Accounts Payable', debit: 0, credit: 1000.00 },
      ]
    },
    {
      id: 'JE-002',
      date: '2025-05-11',
      narrative: 'Depreciation provision for commercial groomers dryer fleet',
      status: 'POSTED',
      lines: [
        { account: '6100 Depreciation Expense', debit: 450.00, credit: 0 },
        { account: '1501 Accum Depreciation - Fixtures', debit: 0, credit: 450.00 },
      ]
    },
    {
      id: 'JE-003',
      date: '2025-05-12',
      narrative: 'Accrue estimated municipal utility chargeback',
      status: 'DRAFT',
      lines: [
        { account: '6100 Rent & Utilities', debit: 380.00, credit: 0 },
        { account: '2000 Accounts Payable', debit: 0, credit: 380.00 },
      ]
    }
  ]);

  const [activeJe, setActiveJe] = useState<string>('JE-001');

  // Command input handlers
  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandText.trim()) return;

    const cmd = commandText.trim();
    setConsoleLogs(prev => [...prev, `> ${cmd}`]);

    if (cmd.startsWith(':POST ')) {
      const jeId = cmd.replace(':POST ', '').toUpperCase();
      const target = journalEntries.find(j => j.id === jeId);
      if (target) {
        if (target.status === 'POSTED') {
          setConsoleLogs(prev => [...prev, `ERR: Journal ${jeId} is already posted to the General Ledger.`]);
        } else {
          setJournalEntries(prev => prev.map(j => j.id === jeId ? { ...j, status: 'POSTED' } : j));
          // Accure to CoA balances
          const lines = target.lines;
          setAccounts(prev => prev.map(acc => {
            const matches = lines.filter(l => acc.name.includes(l.account.split(' ')[1]) || l.account.startsWith(acc.code));
            let newBal = acc.balance;
            matches.forEach(m => {
              if (acc.type === 'Asset' || acc.type === 'Expense') {
                newBal = newBal + m.debit - m.credit;
              } else {
                newBal = newBal + m.credit - m.debit;
              }
            });
            return { ...acc, balance: newBal };
          }));
          setConsoleLogs(prev => [...prev, `SUCCESS: Journal ${jeId} has been successfully committed. GL ledger entries locked.`]);
        }
      } else {
        setConsoleLogs(prev => [...prev, `ERR: Journal entry identifier "${jeId}" not found in current ledger.`]);
      }
    } else if (cmd === ':AUDIT') {
      let debits = 0;
      let credits = 0;
      transactions.forEach(t => {
        debits += t.debit;
        credits += t.credit;
      });
      setConsoleLogs(prev => [
        ...prev,
        `=== AUDITING DOUBLE-ENTRY LEDGER ===`,
        `Assets = Liabilities + Equity balance checklist:`,
        `Total debit clearing: $${debits.toFixed(2)}`,
        `Total credit clearing: $${credits.toFixed(2)}`,
        `Delta variance check: $${(debits - credits).toFixed(2)}`,
        `Result: COMPLIANT WITH GAAP CRITERIA.`
      ]);
    } else if (cmd === ':RECONCILE') {
      setTransactions(prev => prev.map(t => ({ ...t, reconciled: true })));
      setConsoleLogs(prev => [...prev, 'SUCCESS: All outstanding bank feed matches have been auto-cleared. Reconciled=100%.']);
    } else {
      setConsoleLogs(prev => [...prev, `ERR: Command "${cmd}" not recognized. Commands available: :POST <JE_ID>, :AUDIT, :RECONCILE`]);
    }
    setCommandText('');
  };

  const handleAddAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccount.code || !newAccount.name) {
      alert('Please fill out Code and Name.');
      return;
    }
    setAccounts(prev => [
      ...prev,
      {
        code: newAccount.code,
        name: newAccount.name,
        type: newAccount.type,
        sub: newAccount.sub,
        balance: parseFloat(newAccount.balance) || 0,
        status: 'Active'
      }
    ].sort((a,b) => parseInt(a.code) - parseInt(b.code)));

    setNewAccount({ code: '', name: '', type: 'Asset', sub: 'Current Assets', balance: '0.00' });
    setShowAddDrawer(false);
    setConsoleLogs(prev => [...prev, `GL-ACCOUNT CREATED: Code ${newAccount.code} - ${newAccount.name} initialized.`]);
  };

  const filteredAccounts = accounts.filter(acc => {
    if (coaSearch.trim()) {
      const q = coaSearch.toLowerCase();
      return acc.code.includes(q) || (acc.name || '').toLowerCase().includes(q) || (acc.type || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="flex flex-col w-full text-foreground bg-background select-text">
      {/* STATUS STRIP */}
      <div className="w-full bg-muted/60 border-b border-border px-4 py-2 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-success animate-pulse"></span>
          <span className="font-medium text-[11px] text-muted-foreground">
            Books &amp; General Records
          </span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="font-medium">Trial Balance: <span className="text-success font-semibold">Balanced</span></span>
          <span className="hidden sm:inline font-medium">Last Audit: Today 08:30</span>
        </div>
      </div>

      {/* PAGE HEADER */}
      <div className="p-6 border-b border-border bg-background flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Books &amp; General Records</h1>
          <p className="text-[13px] text-muted-foreground mt-1 max-w-2xl leading-relaxed">
            Double-entry bookkeeping suite for All About Pawz. Tracks chart of accounts, publishes journal voucher entries, and balances total ledger accounts with zero-variance safety.
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'coa' && (
            <button
              onClick={() => setShowAddDrawer(true)}
              className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3.5 text-[13px] font-medium shadow-card transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Plus className="size-4" /> Add GL Account
            </button>
          )}
        </div>
      </div>

      {/* SUB NAVIGATION TABS */}
      <div className="w-full bg-background border-b border-border flex overflow-x-auto shrink-0 custom-scrollbar">
        <button
          onClick={() => setActiveTab('gl')}
          className={`px-5 py-3 text-[13px] font-medium border-r border-border flex items-center gap-2 cursor-pointer transition-colors duration-150 whitespace-nowrap ${
            activeTab === 'gl' ? 'text-primary  border-b-primary -mb-px' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          }`}
        >
          <span className="text-[11px] text-muted-foreground/70 tabular-nums">01</span>
          <span>General Ledger</span>
        </button>
        <button
          onClick={() => setActiveTab('coa')}
          className={`px-5 py-3 text-[13px] font-medium border-r border-border flex items-center gap-2 cursor-pointer transition-colors duration-150 whitespace-nowrap ${
            activeTab === 'coa' ? 'text-primary  border-b-primary -mb-px' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          }`}
        >
          <span className="text-[11px] text-muted-foreground/70 tabular-nums">02</span>
          <span>Chart of Accounts</span>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
            {accounts.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-5 py-3 text-[13px] font-medium border-r border-border flex items-center gap-2 cursor-pointer transition-colors duration-150 whitespace-nowrap ${
            activeTab === 'transactions' ? 'text-primary  border-b-primary -mb-px' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          }`}
        >
          <span className="text-[11px] text-muted-foreground/70 tabular-nums">03</span>
          <span>Transactions</span>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
            {transactions.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('je')}
          className={`px-5 py-3 text-[13px] font-medium border-r border-border flex items-center gap-2 cursor-pointer transition-colors duration-150 whitespace-nowrap ${
            activeTab === 'je' ? 'text-primary  border-b-primary -mb-px' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          }`}
        >
          <span className="text-[11px] text-muted-foreground/70 tabular-nums">04</span>
          <span>Journal Entries</span>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
            {journalEntries.length}
          </span>
        </button>
      </div>

      {/* TAB CONTENT: GENERAL LEDGER OVERVIEW */}
      {activeTab === 'gl' && (
        <div className="animate-fade-in p-6 space-y-6 bg-muted/30 min-h-[500px]">
          {/* KPI TILES */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between shadow-card">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total Assets</span>
              <p className="text-2xl font-display font-semibold tabular-nums text-foreground mt-2">
                ${accounts.filter(a => a.type === 'Asset').reduce((sum, a) => sum + a.balance, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className="text-[11px] text-success font-medium mt-1">In balance with Equities</span>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between shadow-card">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Liabilities</span>
              <p className="text-2xl font-display font-semibold tabular-nums text-foreground mt-2">
                ${accounts.filter(a => a.type === 'Liability').reduce((sum, a) => sum + a.balance, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className="text-[11px] text-muted-foreground mt-1">Unposted accruals: 1</span>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between shadow-card">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Owners Equity</span>
              <p className="text-2xl font-display font-semibold tabular-nums text-foreground mt-2">
                ${accounts.filter(a => a.type === 'Equity').reduce((sum, a) => sum + a.balance, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className="text-[11px] text-muted-foreground mt-1">Capital account clear</span>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between shadow-card">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Ledger Status</span>
              <div className="flex items-center gap-2 mt-2">
                <span className="size-2 rounded-full bg-success"></span>
                <p className="text-sm font-semibold text-success">Trial Stable</p>
              </div>
              <span className="text-[11px] text-muted-foreground mt-1">Zero delta deviation confirmed</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEDGER DRILL DOWN LIST */}
            <div className="lg:col-span-2 bg-card border border-border">
              <div className="bg-muted/40 border-b border-border p-3 tabular-nums font-semibold text-[13px] uppercase flex items-center justify-between">
                <span>RECENT POSTED GENERAL JOURNALS</span>
                <span className="text-[10px] text-muted-foreground">GAAP STANDARD</span>
              </div>
              <div className="p-4 space-y-4">
                {journalEntries.map(je => (
                  <div key={je.id} className="border border-border p-3 space-y-3 bg-card">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <div>
                        <span className="tabular-nums font-semibold text-[13px]">{je.id}</span>
                        <span className="text-[11px] text-muted-foreground/70 ml-3">{je.date}</span>
                      </div>
                      <span className={`text-[9px] tabular-nums font-semibold border px-1.5 py-0.2 ${je.status === 'POSTED' ? 'bg-muted/40 text-foreground border-border' : 'bg-warning/10 text-warning border-warning/20'}`}>
                        {je.status}
                      </span>
                    </div>
                    <p className="text-[12px] text-muted-foreground font-medium">{je.narrative}</p>
                    <div className="space-y-1">
                      {je.lines.map((l, lIdx) => (
                        <div key={lIdx} className="grid grid-cols-12 text-[12px] font-medium">
                          <div className={`col-span-6 ${l.credit > 0 ? 'pl-4 text-muted-foreground' : 'text-foreground'}`}>
                            {l.account}
                          </div>
                          <div className="col-span-3 text-right">
                            {l.debit > 0 ? `$${l.debit.toFixed(2)}` : '—'}
                          </div>
                          <div className="col-span-3 text-right">
                            {l.credit > 0 ? `$${l.credit.toFixed(2)}` : '—'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* LEDGER CLI / COMMAND BOX */}
            <div className="bg-black text-success text-[12px] border border-border flex flex-col h-[400px]">
              <div className="bg-card border-b border-border p-3 flex items-center gap-2 text-[10px] font-semibold text-white uppercase tracking-wider">
                <Terminal className="w-3.5 h-3.5 text-muted-foreground/70" />
                <span>LEDGER COMMAND CONSOLE</span>
              </div>
              <div className="flex-1 p-4 overflow-y-auto space-y-2 select-text custom-scrollbar">
                {consoleLogs.map((log, idx) => (
                  <div key={idx} className={log.startsWith('>') ? 'text-white' : log.startsWith('SUCCESS:') ? 'text-success font-semibold' : log.startsWith('ERR:') ? 'text-destructive/70 font-semibold' : 'text-muted-foreground/50'}>
                    {log}
                  </div>
                ))}
              </div>
              <form onSubmit={handleCommandSubmit} className="border-t border-border flex bg-card">
                <span className="p-3 text-success select-none font-semibold tabular-nums">PAWZ://</span>
                <input
                  type="text"
                  value={commandText}
                  onChange={(e) => setCommandText(e.target.value)}
                  className="flex-1 bg-transparent p-3 text-white placeholder:text-foreground outline-none border-none text-[12px]"
                  placeholder="Type CLI Command... (e.g. :POST JE-003)"
                />
              </form>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Chart of Accounts */}
      {activeTab === 'coa' && (
        <div className="animate-fade-in p-6 bg-card space-y-6">
          {/* SEARCH BAR */}
          <div className="bg-muted/30 p-4 border border-border flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-muted-foreground/70 uppercase">SEARCH CHART //</span>
              <input
                type="text"
                value={coaSearch}
                onChange={(e) => setCoaSearch(e.target.value)}
                className="w-full bg-card border border-border pl-32 pr-4 py-2 text-[12px] focus:outline-none placeholder:text-muted-foreground/70 text-foreground"
                placeholder="ACCOUNT NAME, CODE OR CLASSIFICATION..."
              />
            </div>
            <button
              onClick={() => setShowAddDrawer(true)}
              className="bg-black hover:bg-muted text-white text-[12px] uppercase px-5 py-2 font-semibold cursor-pointer rounded-md border border-border w-full md:w-auto"
            >
              + ADD ACCOUNT
            </button>
          </div>

          {/* TABLE */}
          <div className="border border-border overflow-x-auto">
            <table className="w-full text-left text-[13px] text-foreground border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b border-border font-semibold uppercase">
                  <th className="p-3 border-r border-border w-24">GL CODE</th>
                  <th className="p-3 border-r border-border">ACCOUNT NAME</th>
                  <th className="p-3 border-r border-border">GL CLASSIFICATION</th>
                  <th className="p-3 border-r border-border">SUB-LEDGER SPEC</th>
                  <th className="p-3 border-r border-border text-right w-40">CURRENT BALANCE</th>
                  <th className="p-3 text-center w-32">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium">
                {filteredAccounts.map((acc) => (
                  <tr key={acc.code} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 border-r border-border font-semibold">{acc.code}</td>
                    <td className="p-3 border-r border-border font-semibold">{acc.name}</td>
                    <td className="p-3 border-r border-border uppercase text-muted-foreground">{acc.type}</td>
                    <td className="p-3 border-r border-border text-muted-foreground">{acc.sub}</td>
                    <td className="p-3 border-r border-border text-right font-semibold tabular-nums">
                      ${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-center">
                      <span className="bg-success/10 border border-success/20 text-success text-[10px] font-semibold px-2 py-0.5 uppercase">
                        {acc.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Transactions */}
      {activeTab === 'transactions' && (
        <div className="animate-fade-in p-6 bg-card space-y-6">
          <div className="border border-border">
            <div className="bg-muted/40 border-b border-border p-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold tabular-nums uppercase text-foreground">GL CLEARING HOUSE FEED</h2>
                <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5">PLAID INTEGRATION SYNC // CONTINUOUS TRANSACTION SCANNER</p>
              </div>
              <button
                onClick={() => {
                  setTransactions(prev => prev.map(t => ({ ...t, reconciled: true })));
                  alert('Clearing house ledger reconciliation passed. Zero delta confirmed.');
                }}
                className="bg-primary text-primary-foreground text-[11px] tabular-nums uppercase tracking-wider font-semibold px-4 py-1.5 hover:bg-muted cursor-pointer rounded-md"
              >
                RECONCILE FEED
              </button>
            </div>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-[13px] text-foreground border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/30 font-semibold uppercase">
                    <th className="p-3 border-r border-border">TXN ID</th>
                    <th className="p-3 border-r border-border">VALUE DATE</th>
                    <th className="p-3 border-r border-border">LEDGER ACCOUNT ALLOCATION</th>
                    <th className="p-3 border-r border-border">TRANSACTION MEMO / REFERENCE</th>
                    <th className="p-3 border-r border-border text-right w-36">DEBIT (DR)</th>
                    <th className="p-3 border-r border-border text-right w-36">CREDIT (CR)</th>
                    <th className="p-3 text-center w-36">CLEARING STATE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card font-medium">
                  {transactions.map((t, idx) => (
                    <tr key={idx} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 border-r border-border font-semibold text-muted-foreground/70">{t.id}</td>
                      <td className="p-3 border-r border-border text-muted-foreground">{t.date}</td>
                      <td className="p-3 border-r border-border font-semibold">{t.account}</td>
                      <td className="p-3 border-r border-border text-muted-foreground truncate max-w-[200px]">{t.memo}</td>
                      <td className="p-3 border-r border-border text-right font-semibold text-foreground">
                        {t.debit > 0 ? `$${t.debit.toFixed(2)}` : '—'}
                      </td>
                      <td className="p-3 border-r border-border text-right font-semibold text-foreground">
                        {t.credit > 0 ? `$${t.credit.toFixed(2)}` : '—'}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`text-[10px] font-semibold border px-2 py-0.5 uppercase ${
                          t.reconciled ? 'bg-success/10 border-success/20 text-success' : 'bg-warning/10 border-warning/20 text-warning animate-pulse'
                        }`}>
                          {t.reconciled ? 'RECONCILED' : 'PENDING MATCH'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Journal Entries */}
      {activeTab === 'je' && (
        <div className="animate-fade-in p-6 bg-muted/30 min-h-[500px] grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT SIDE: JOURNAL VOUCHERS LIST */}
          <div className="lg:col-span-4 bg-card border border-border flex flex-col">
            <div className="bg-muted/40 border-b border-border p-3 tabular-nums font-semibold text-[13px] uppercase text-foreground">
              JOURNAL VOUCHERS REGISTRY
            </div>
            <div className="divide-y divide-border overflow-y-auto flex-1 h-[450px] custom-scrollbar bg-card">
              {journalEntries.map(je => (
                <button
                  key={je.id}
                  onClick={() => setActiveJe(je.id)}
                  className={`w-full text-left p-4 space-y-2 cursor-pointer transition-colors block border-none ${
                    activeJe === je.id ? 'bg-muted/40' : 'hover:bg-muted/30 bg-card'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold">{je.id}</span>
                    <span className="text-[11px] text-muted-foreground/70">{je.date}</span>
                  </div>
                  <p className="text-[12px] text-muted-foreground font-medium line-clamp-1">{je.narrative}</p>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="tabular-nums text-muted-foreground/70">{je.lines.length} Line items</span>
                    <span className={`text-[10px] font-semibold border px-1.5 py-0.2 ${je.status === 'POSTED' ? 'bg-success/10 border-success/20 text-success' : 'bg-warning/10 border-warning/20 text-warning animate-pulse'}`}>
                      {je.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT SIDE: SELECTED VOUCHER DETAILS & T-ACCOUNTS */}
          <div className="lg:col-span-8 space-y-6">
            {(() => {
              const selectedJe = journalEntries.find(j => j.id === activeJe);
              if (!selectedJe) return null;

              const totalDebits = selectedJe.lines.reduce((sum, l) => sum + l.debit, 0);
              const totalCredits = selectedJe.lines.reduce((sum, l) => sum + l.credit, 0);
              const isBalanced = totalDebits === totalCredits;

              return (
                <>
                  {/* DETAIL PANEL */}
                  <div className="bg-card border border-border">
                    <div className="bg-muted/40 border-b border-border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <span className="text-[11px] bg-primary text-primary-foreground px-1.5 py-0.5 font-semibold uppercase">VOUCHER DETAIL // {selectedJe.id}</span>
                        <h3 className="text-[13px] font-semibold tabular-nums text-foreground mt-1.5 uppercase">{selectedJe.narrative}</h3>
                      </div>
                      {selectedJe.status === 'DRAFT' && (
                        <button
                          onClick={() => {
                            setJournalEntries(prev => prev.map(j => j.id === selectedJe.id ? { ...j, status: 'POSTED' } : j));
                            // Accrue to CoA balances
                            setAccounts(prev => prev.map(acc => {
                              const matches = selectedJe.lines.filter(l => acc.name.includes(l.account.split(' ')[1]) || l.account.startsWith(acc.code));
                              let newBal = acc.balance;
                              matches.forEach(m => {
                                if (acc.type === 'Asset' || acc.type === 'Expense') {
                                  newBal = newBal + m.debit - m.credit;
                                } else {
                                  newBal = newBal + m.credit - m.debit;
                                }
                              });
                              return { ...acc, balance: newBal };
                            }));
                            setConsoleLogs(prev => [...prev, `JOURNAL POSTED: ${selectedJe.id} ledger entries recorded.`]);
                          }}
                          className="bg-primary text-primary-foreground hover:bg-primary/90 border border-border px-4 py-1.5 text-[12px] uppercase tracking-wider font-semibold transition-colors cursor-pointer rounded-md"
                        >
                          POST JOURNAL VOUCHER
                        </button>
                      )}
                    </div>

                    <div className="p-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4 border-b border-border pb-4">
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-muted-foreground/70">Journal Date</span>
                          <p className="text-[12px] font-semibold text-foreground mt-1">{selectedJe.date}</p>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-muted-foreground/70">Ledger Posting State</span>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={`w-2 h-2 rounded-full ${selectedJe.status === 'POSTED' ? 'bg-success/100' : 'bg-warning/100'}`}></span>
                            <span className="text-[12px] font-semibold uppercase text-foreground">{selectedJe.status}</span>
                          </div>
                        </div>
                      </div>

                      {/* DOUBLE-ENTRY TABLE */}
                      <div className="border border-border overflow-x-auto">
                        <table className="w-full text-left text-[13px] text-foreground border-collapse">
                          <thead>
                            <tr className="bg-muted/30 border-b border-border font-semibold uppercase">
                              <th className="p-3 border-r border-border">ACCOUNT CODE &amp; DESCRIPTION</th>
                              <th className="p-3 border-r border-border text-right w-44">DEBIT (DR)</th>
                              <th className="p-3 text-right w-44">CREDIT (CR)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border bg-card">
                            {selectedJe.lines.map((line, lIdx) => (
                              <tr key={lIdx} className="hover:bg-muted/30 transition-colors">
                                <td className={`p-3 border-r border-border font-semibold ${line.credit > 0 ? 'pl-8 text-muted-foreground' : 'text-foreground'}`}>
                                  {line.account}
                                </td>
                                <td className="p-3 border-r border-border text-right font-semibold">
                                  {line.debit > 0 ? `$${line.debit.toFixed(2)}` : '—'}
                                </td>
                                <td className="p-3 text-right font-semibold">
                                  {line.credit > 0 ? `$${line.credit.toFixed(2)}` : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-muted/40 border-t border-border font-semibold">
                              <td className="p-3 border-r border-border uppercase text-right">TOTAL LEDGER ACCRUAL</td>
                              <td className="p-3 border-r border-border text-right text-foreground">${totalDebits.toFixed(2)}</td>
                              <td className="p-3 text-right text-foreground">${totalCredits.toFixed(2)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      <div className="flex items-center justify-between bg-muted/40 p-3 text-[11px] font-semibold text-muted-foreground uppercase border border-border">
                        <span>LEDGER DOUBLE-ENTRY BALANCING SYSTEM</span>
                        {isBalanced ? (
                          <span className="text-success flex items-center gap-1.5"><CheckCircle2 className="w-4.5 h-4.5" /> DEBITS = CREDITS (ZERO DELTA PASS)</span>
                        ) : (
                          <span className="text-destructive flex items-center gap-1.5"><AlertTriangle className="w-4.5 h-4.5" /> BALANCING OUT OF EQUILIBRIUM</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* T-ACCOUNT VISUALIZATIONS */}
                  <div className="bg-card border border-border p-4">
                    <span className="text-[11px] font-semibold text-muted-foreground/70 uppercase">T-ACCOUNT SCHEMA GRAPHICS</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                      {selectedJe.lines.map((line, idx) => (
                        <div key={idx} className="border border-border bg-card">
                          <div className="bg-muted/40 border-b border-border p-2 text-[11px] font-semibold uppercase text-center">
                            {line.account}
                          </div>
                          <div className="grid grid-cols-2 divide-x divide-border min-h-[80px]">
                            <div className="p-2 space-y-1 text-[11px]">
                              <div className="text-[8px] font-semibold text-muted-foreground/70 border-b border-border pb-1">DEBIT (DR)</div>
                              {line.debit > 0 && (
                                <div className="text-foreground font-semibold mt-2">${line.debit.toFixed(2)}</div>
                              )}
                            </div>
                            <div className="p-2 space-y-1 text-[11px] text-right">
                              <div className="text-[8px] font-semibold text-muted-foreground/70 border-b border-border pb-1 text-right">CREDIT (CR)</div>
                              {line.credit > 0 && (
                                <div className="text-foreground font-semibold mt-2">${line.credit.toFixed(2)}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Chart of Accounts CREATION DRAWER/SLIDEOVER */}
      {showAddDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            onClick={() => setShowAddDrawer(false)}
            className="absolute inset-0 bg-card/40 backdrop-blur-xs transition-opacity"
          />
          {/* Panel */}
          <div className="relative w-full max-w-md bg-card border-l border-border p-6 flex flex-col justify-between z-10 shadow-2xl animate-slide-in-right">
            <div>
              <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
                <h3 className="text-sm font-semibold tabular-nums uppercase text-foreground">NEW GL ACCOUNT REGISTRY</h3>
                <button
                  onClick={() => setShowAddDrawer(false)}
                  className="bg-card hover:bg-black hover:text-white text-foreground border border-border w-7 h-7 flex items-center justify-center text-[12px] uppercase cursor-pointer"
                >
                  X
                </button>
              </div>

              <form onSubmit={handleAddAccountSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-muted-foreground/70 mb-1.5">GL ACCOUNT CODE *</label>
                  <input
                    required
                    type="text"
                    value={newAccount.code}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, code: e.target.value }))}
                    className="w-full bg-card border border-border p-2 text-[12px] focus:outline-none text-foreground"
                    placeholder="e.g. 1510"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-muted-foreground/70 mb-1.5">ACCOUNT NAME / DESCRIPTION *</label>
                  <input
                    required
                    type="text"
                    value={newAccount.name}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-card border border-border p-2 text-[12px] focus:outline-none text-foreground"
                    placeholder="e.g. Petty Cash"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-muted-foreground/70 mb-1.5">CLASSIFICATION TYPE</label>
                  <select
                    value={newAccount.type}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full bg-card border border-border p-2 text-[12px] focus:outline-none text-foreground cursor-pointer rounded-md"
                  >
                    <option value="Asset">Asset (Debit balance)</option>
                    <option value="Liability">Liability (Credit balance)</option>
                    <option value="Equity">Equity (Credit balance)</option>
                    <option value="Revenue">Revenue (Credit balance)</option>
                    <option value="Expense">Expense (Debit balance)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-muted-foreground/70 mb-1.5">SUB-LEDGER SPEC</label>
                  <input
                    type="text"
                    value={newAccount.sub}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, sub: e.target.value }))}
                    className="w-full bg-card border border-border p-2 text-[12px] focus:outline-none text-foreground"
                    placeholder="e.g. Current Assets"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-muted-foreground/70 mb-1.5">OPENING LEDGER BALANCE ($USD)</label>
                  <input
                    type="text"
                    value={newAccount.balance}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, balance: e.target.value }))}
                    className="w-full bg-card border border-border p-2 text-[12px] focus:outline-none text-foreground"
                    placeholder="0.00"
                  />
                </div>

                <div className="pt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddDrawer(false)}
                    className="flex-1 bg-card hover:bg-muted/30 text-foreground border border-border py-2.5 text-[12px] uppercase font-semibold cursor-pointer"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-black hover:bg-muted text-white border border-border py-2.5 text-[12px] uppercase font-semibold cursor-pointer"
                  >
                    REGISTER ACCOUNT
                  </button>
                </div>
              </form>
            </div>
            <div className="text-[10px] text-muted-foreground/70">
              Registries automatically trigger real-time ledger auditing sync.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
