'use client';

import React, { useState } from 'react';
import { DawgNavSection } from '@/lib/types';
import {
  FileText,
  Settings,
  Search,
  Calendar,
  Plus,
  RefreshCw,
  Mail,
  Download,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  Play,
  RotateCcw
} from 'lucide-react';
import { PageHeader, PageTabs, FilterSelect } from '../_shared/PageHeader';
import { cn } from '@/lib/utils';

let globalInvoiceCounter = 500;
function getNextInvoiceId() {
  globalInvoiceCounter += 1;
  return `INV-2025-${globalInvoiceCounter}-E`;
}

interface InvoicesViewProps {
  onNavigateSection?: (section: DawgNavSection) => void;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({ onNavigateSection }) => {
  // Tabs: 'invoices' | 'estimates' | 'recurring' | 'unpaid' | 'statements'
  const [activeSubTab, setActiveSubTab] = useState<'invoices' | 'estimates' | 'recurring' | 'unpaid' | 'statements'>('invoices');
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Shared Data States
  const [invoicesList, setInvoicesList] = useState([
    {
      id: 'INV-2025-084-A',
      customer: 'Sarah Johnson',
      pet: 'Buddy (Golden Retriever)',
      issueDate: '2025-05-10',
      dueDate: '2025-05-17',
      items: 'Full Groom + Medicated Bath',
      total: 115.00,
      balanceDue: 115.00,
      status: 'PENDING',
    },
    {
      id: 'INV-2025-083-B',
      customer: 'Marcus Johnson',
      pet: 'Rocky (French Bulldog)',
      issueDate: '2025-05-08',
      dueDate: '2025-05-15',
      items: 'Bath & Brush + De-matting',
      total: 75.00,
      balanceDue: 75.00,
      status: 'OVERDUE',
    },
    {
      id: 'INV-2025-081-D',
      customer: 'Mike Ross',
      pet: 'Luna (Siberian Husky)',
      issueDate: '2025-05-02',
      dueDate: '2025-05-02',
      items: 'Deluxe Spa Treatment',
      total: 95.00,
      balanceDue: 0.00,
      status: 'PAID',
    },
    {
      id: 'INV-2025-080-E',
      customer: 'Emily Davis',
      pet: 'Charlie (Poodle)',
      issueDate: '2025-04-28',
      dueDate: '2025-04-28',
      items: 'Full Groom + Add-ons',
      total: 105.00,
      balanceDue: 0.00,
      status: 'PAID',
    }
  ]);

  const [estimatesList, setEstimatesList] = useState([
    {
      id: 'EST-2025-4109',
      customer: 'Genevieve Archer',
      contact: '+1 (555) 301-4412',
      serviceSpec: 'SVC: PREMIUM SAMOYED SHED-OUT [PKG-09]',
      quotedAmt: 195.00,
      expiryDate: '2025-05-24',
      status: 'DRAFT_ESTIMATE',
      terms: '30-DAY PRICE GUARANTEE'
    },
    {
      id: 'EST-2025-4110',
      customer: 'Ector King',
      contact: '+1 (555) 120-4104',
      serviceSpec: 'SVC: ROYAL PEKINESE MASSAGE PACK [PKG-05]',
      quotedAmt: 175.00,
      expiryDate: '2025-05-20',
      status: 'SENT_TO_CLIENT',
      terms: 'EXCLUSIVE HOLIDAY SLOT'
    },
    {
      id: 'EST-2025-4102',
      customer: 'Gawain Knight',
      contact: '+1 (555) 782-9011',
      serviceSpec: 'SVC: DELUXE MULTIPET COMPACT PACKAGE',
      quotedAmt: 320.00,
      expiryDate: '2025-05-14',
      status: 'ACCEPTED_BY_CLIENT',
      terms: 'BOUND TO DEP-4102 HOLD'
    }
  ]);

  // Recurring schedules state (Matches 3.2 Sales & Recurring Invoices)
  const [recurringSchedules, setRecurringSchedules] = useState([
    {
      id: 'RC-89201',
      customer: 'Emily Watson',
      pet: 'Sarah (Golden Retriever // 31kg)',
      service: 'Bi-weekly Full Groom + Blueberry Facial',
      sku: 'SRV-GRM-04 // ADD: FCL-BB',
      frequency: 'BI-WEEKLY',
      nextBilling: '2025-05-14',
      daysDelta: 'T-MINUS 3 DAYS',
      cardOnFile: '•••• 4242',
      cardBrand: 'VISA',
      amount: 140.00,
      autopay: 'ENABLED',
    },
    {
      id: 'RC-89202',
      customer: 'David Miller',
      pet: 'Charlie (French Bulldog // 12kg)',
      service: 'De-shed Bath + Paw Balm & Ear Flush',
      sku: 'SRV-BTH-02 // ADD: BL-PWM',
      frequency: 'MONTHLY',
      nextBilling: '2025-05-22',
      daysDelta: 'T-MINUS 11 DAYS',
      cardOnFile: '•••• 8831',
      cardBrand: 'MC',
      amount: 95.00,
      autopay: 'ENABLED',
    },
    {
      id: 'RC-89203',
      customer: 'Marcus Sterling',
      pet: 'Thor & Freya (Siberian Huskies // 2x)',
      service: 'Dual Coat Blowout & Undercoat Rake Package',
      sku: 'SRV-DUO-99 // BUNDLE',
      frequency: 'MONTHLY',
      nextBilling: '2025-05-12',
      daysDelta: 'TODAY',
      cardOnFile: '•••• 1092',
      cardBrand: 'AMEX',
      amount: 240.00,
      autopay: 'PENDING',
    },
    {
      id: 'RC-89204',
      customer: 'Sophia Alva',
      pet: 'Mochi (Toy Poodle // 4kg)',
      service: 'Show Trim & Dental Hygiene Rinse',
      sku: 'SRV-SHW-01 // MED: DNT-01',
      frequency: 'WEEKLY',
      nextBilling: '2025-05-19',
      daysDelta: 'T-MINUS 7 DAYS',
      cardOnFile: '•••• 7714',
      cardBrand: 'VISA',
      amount: 85.00,
      autopay: 'ENABLED',
    },
    {
      id: 'RC-89205',
      customer: 'Lucas Vance',
      pet: 'Kona (Doberman // 38kg)',
      service: 'Nail Grind + Coat Hydro-Bath',
      sku: 'PAUSED BY CUSTOMER / TRAVEL',
      frequency: 'MONTHLY',
      nextBilling: 'ON HOLD',
      daysDelta: 'RESUMES 2025-06-01',
      cardOnFile: '•••• 3390',
      cardBrand: 'VISA',
      amount: 70.00,
      autopay: 'PAUSED',
    }
  ]);

  // Unpaid/Outstanding state (Matches 3.4 Invoices: Unpaid & Outstanding)
  const [unpaidInvoices, setUnpaidInvoices] = useState([
    { id: 'INV-2025-0891', debtor: 'Marcus Vance', pet: 'Thor [German Shepherd]', issueDate: '2025-02-10', dueDate: '2025-02-24', delta: 'PAST DUE +14D', items: 'FULL GROOM + MEDICATED DIP + TEETH', total: 380.00, paid: 0.00, autopay: 'VISA •••• 4242 [YES]', status: 'PAST DUE // 1-30D' },
    { id: 'INV-2025-0894', debtor: 'Elena Rostova', pet: 'Milo [French Bulldog]', issueDate: '2025-02-18', dueDate: '2025-03-04', delta: 'PAST DUE +6D', items: 'EXPRESS WASH + DESHED + NAILS + CBD', total: 1040.00, paid: 0.00, autopay: 'MC •••• 8812 [YES]', status: 'PAST DUE // 1-30D' },
    { id: 'INV-2025-0897', debtor: 'Joshua Briggs', pet: 'Thor [Golden Retriever]', issueDate: '2025-04-28', dueDate: '2025-05-14', delta: 'CURRENT 4D LEFT', items: 'HAND STRIP + EAR CARE + DENTAL', total: 640.00, paid: 0.00, autopay: 'AMEX •••• 1004 [YES]', status: 'CURRENT // NET-30' },
    { id: 'INV-2025-0842', debtor: 'Arthur Pendrick', pet: 'Zeus [Great Dane]', issueDate: '2024-12-14', dueDate: '2024-12-28', delta: 'OVERDUE +72D', items: 'BOARDING 4N + INTENSIVE GROOM + FLEA', total: 1120.50, paid: 200.00, autopay: '[NO CARD TOKEN]', status: 'CRITICAL DELAY' },
    { id: 'INV-2025-0901', debtor: 'Beatrice Chen', pet: 'Mochi [Shiba Inu]', issueDate: '2025-05-01', dueDate: '2025-05-15', delta: 'CURRENT 5D LEFT', items: 'STYLING + UNDERCOAT + BLUEBERRY FACIAL', total: 520.00, paid: 0.00, autopay: 'VISA •••• 9011 [YES]', status: 'CURRENT // NET-30' },
    { id: 'INV-2025-0904', debtor: 'Liam Kavanaugh', pet: 'Rusty [Rottweiler]', issueDate: '2025-05-03', dueDate: '2025-05-17', delta: 'CURRENT 7D LEFT', items: 'HYDROBATH THERAPY + COAT COND + PAD TRIM', total: 780.00, paid: 0.00, autopay: 'VISA •••• 1182 [YES]', status: 'CURRENT // NET-30' },
    { id: 'INV-2025-0907', debtor: 'Sophia Lind', pet: 'Piper [Australian Shepherd]', issueDate: '2025-05-04', dueDate: '2025-05-18', delta: 'CURRENT 8D LEFT', items: 'DE-SHED TREAT + EAR FLUSH + SANITARY', total: 1840.00, paid: 0.00, autopay: 'MC •••• 3349 [YES]', status: 'CURRENT // NET-30' },
    { id: 'INV-2025-0911', debtor: 'Harrison Ford', pet: 'Indy [Boxer]', issueDate: '2025-05-06', dueDate: '2025-05-20', delta: 'CURRENT 10D LEFT', items: 'NAIL TRIM + WRINKLE CLEAN + FULL BATH', total: 1600.00, paid: 0.00, autopay: '[NO CARD TOKEN]', status: 'CURRENT // NET-30' },
    { id: 'INV-2025-0915', debtor: 'Chloe Valentine', pet: 'Lulu [Pomeranian]', issueDate: '2025-05-08', dueDate: '2025-05-22', delta: 'CURRENT 12D LEFT', items: 'TEDDY BEAR CUT + PAW WAX + SPRITZ', total: 1000.00, paid: 0.00, autopay: 'DISC •••• 9901 [YES]', status: 'CURRENT // NET-30' },
  ]);

  const [selectedStatementCustomer, setSelectedStatementCustomer] = useState<string>('Sarah Johnson');
  const [statementRange, setStatementRange] = useState<string>('Q2 2025 (APR 01 - JUN 30)');

  // Filter lists
  const filteredInvoices = invoicesList.filter((inv) => {
    if (statusFilter !== 'ALL' && inv.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        inv.id.toLowerCase().includes(q) ||
        inv.customer.toLowerCase().includes(q) ||
        inv.pet.toLowerCase().includes(q) ||
        inv.items.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredEstimates = estimatesList.filter((est) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        est.id.toLowerCase().includes(q) ||
        est.customer.toLowerCase().includes(q) ||
        est.serviceSpec.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleInvoiceAction = (id: string, action: string) => {
    if (action === 'COLLECT') {
      setInvoicesList(prev => prev.map(inv => inv.id === id ? { ...inv, balanceDue: 0, status: 'PAID' } : inv));
      alert(`Ledger balance cleared! Invoice ${id} marked as fully paid.`);
    } else if (action === 'REMIND') {
      alert(`Automated email & SMS outstanding balance notice sent to client for Invoice ${id}.`);
    }
  };

  const handleEstimateAction = (id: string, action: string) => {
    if (action === 'SEND') {
      setEstimatesList(prev => prev.map(est => est.id === id ? { ...est, status: 'SENT_TO_CLIENT' } : est));
      alert(`Estimate ${id} successfully transmitted to client portal.`);
    } else if (action === 'CONVERT') {
      const target = estimatesList.find(est => est.id === id);
      if (target) {
        const newInvId = getNextInvoiceId();
        setInvoicesList(prev => [
          {
            id: newInvId,
            customer: target.customer,
            pet: 'Quoted Pet (Estimate Ref)',
            issueDate: '2025-05-12',
            dueDate: '2025-05-19',
            items: target.serviceSpec,
            total: target.quotedAmt,
            balanceDue: target.quotedAmt,
            status: 'PENDING'
          },
          ...prev
        ]);
        setEstimatesList(prev => prev.map(est => est.id === id ? { ...est, status: 'CONVERTED_TO_INVOICE' } : est));
        alert(`Successfully converted estimate ${id} into invoice ${newInvId}!`);
      }
    }
  };

  const handleRecurringRunNow = (id: string) => {
    const confirmed = window.confirm('CONFIRM IMMEDIATE TRANSACTION RUN FOR CONTRACT ENTRY?');
    if (confirmed) {
      alert(`Immediate transaction triggered for recurring contract ${id}. Card authorized successfully.`);
    }
  };

  return (
    <div className="flex flex-col w-full text-foreground bg-background select-text">
      {/* STATUS STRIP */}
      <div className="w-full bg-muted/60 border-b border-border px-4 py-2 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-success animate-pulse shrink-0"></span>
          <span className="font-medium text-[11px] text-muted-foreground">
            {
              activeSubTab === 'invoices' ? 'Active Sales Invoices' :
              activeSubTab === 'estimates' ? 'Estimates & Quotes' :
              activeSubTab === 'recurring' ? 'Recurring Subscriptions' :
              activeSubTab === 'unpaid' ? 'Unpaid AR Register' : 'Customer Statements'
            }
          </span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="font-medium">Balance System: <span className="text-success font-semibold">Online</span></span>
        </div>
      </div>

      {/* SUB NAVIGATION TABS */}
      <PageTabs
        activeId={activeSubTab}
        onSelect={(id) => setActiveSubTab(id as typeof activeSubTab)}
        tabs={[
          { id: 'invoices', label: 'Active Invoices', count: invoicesList.filter(i => i.status !== 'PAID').length },
          { id: 'estimates', label: 'Estimates & Quotes', count: estimatesList.filter(e => e.status !== 'CONVERTED_TO_INVOICE').length },
          { id: 'recurring', label: 'Recurring Invoices', count: recurringSchedules.length },
          { id: 'unpaid', label: 'Unpaid & Outstanding', count: unpaidInvoices.length },
          { id: 'statements', label: 'Customer Statements' },
        ]}
      />

      {/* VIEW: ACTIVE INVOICES */}
      {activeSubTab === 'invoices' && (
        <div className="animate-fade-in flex flex-col w-full">
          {/* CONTROL BAR */}
          <div className="p-4 bg-muted/30 border-b border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 w-full">
              <div className="relative flex-1 sm:max-w-md">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-background border border-input rounded-md pl-9 pr-3 h-9 text-[13px] text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring transition-colors"
                  placeholder="Search invoice code, customer, pet..."
                  type="text"
                />
              </div>
              <FilterSelect
                aria-label="Filter by invoice status"
                value={statusFilter}
                onChange={(v) => setStatusFilter(v)}
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="OVERDUE">Overdue</option>
                <option value="PAID">Paid</option>
              </FilterSelect>
            </div>
            <button
              onClick={() => {
                const cName = prompt('Enter customer name:');
                if (cName) {
                  const amtStr = prompt('Enter total amount ($USD):', '125.00');
                  const amt = parseFloat(amtStr || '125');
                  const newInvId = `INV-2025-${Math.floor(100 + Math.random() * 900)}-N`;
                  setInvoicesList(prev => [
                    {
                      id: newInvId,
                      customer: cName,
                      pet: 'Doodle Client (Draft)',
                      issueDate: '2025-05-12',
                      dueDate: '2025-05-19',
                      items: 'Intake Custom Service Pack',
                      total: amt,
                      balanceDue: amt,
                      status: 'PENDING'
                    },
                    ...prev
                  ]);
                  alert(`Invoice ${newInvId} drafted for ${cName}. Outstanding balance tracked.`);
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3.5 text-[13px] font-medium shadow-card transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background w-full sm:w-auto justify-center"
            >
              <Plus className="size-4" />
              Draft Sales Invoice
            </button>
          </div>

          {/* LIST TABLE */}
          <div className="p-4 bg-background">
            <div className="border border-border rounded-xl overflow-hidden shadow-card overflow-x-auto">
              <table className="w-full border-collapse text-left text-[13px] text-foreground">
                <thead>
                  <tr className="bg-muted/40 border-b border-border font-semibold uppercase text-[11px] tracking-wider text-muted-foreground">
                    <th className="p-3 border-r border-border font-semibold">Invoice ID</th>
                    <th className="p-3 border-r border-border font-semibold">Client / Account</th>
                    <th className="p-3 border-r border-border font-semibold">Pet</th>
                    <th className="p-3 border-r border-border font-semibold">Issue / Due</th>
                    <th className="p-3 border-r border-border font-semibold">Line Items</th>
                    <th className="p-3 border-r border-border text-right font-semibold">Total</th>
                    <th className="p-3 border-r border-border text-right font-semibold">Balance Due</th>
                    <th className="p-3 border-r border-border text-center font-semibold">Status</th>
                    <th className="p-3 text-center font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-accent/50 transition-colors">
                      <td className="p-3 border-r border-border font-semibold tabular-nums">{inv.id}</td>
                      <td className="p-3 border-r border-border font-medium text-foreground">{inv.customer}</td>
                      <td className="p-3 border-r border-border text-muted-foreground">{inv.pet}</td>
                      <td className="p-3 border-r border-border text-[11px] leading-tight text-muted-foreground">
                        <div>Issued: {inv.issueDate}</div>
                        <div>Due: {inv.dueDate}</div>
                      </td>
                      <td className="p-3 border-r border-border text-muted-foreground max-w-[200px] truncate">{inv.items}</td>
                      <td className="p-3 border-r border-border text-right font-semibold tabular-nums">${inv.total.toFixed(2)}</td>
                      <td className={cn(
                        "p-3 border-r border-border text-right font-semibold tabular-nums",
                        inv.balanceDue > 0 ? "text-destructive" : "text-success"
                      )}>
                        ${inv.balanceDue.toFixed(2)}
                      </td>
                      <td className="p-3 border-r border-border text-center whitespace-nowrap">
                        <span className={cn(
                          "inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase",
                          inv.status === 'PAID' ? 'bg-success/10 text-success border-success/20' :
                          inv.status === 'OVERDUE' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                          'bg-warning/10 text-warning border-warning/20'
                        )}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {inv.balanceDue > 0 ? (
                            <>
                              <button
                                onClick={() => handleInvoiceAction(inv.id, 'COLLECT')}
                                className="inline-flex items-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 px-2.5 h-7 text-[11px] font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                Collect
                              </button>
                              <button
                                onClick={() => handleInvoiceAction(inv.id, 'REMIND')}
                                className="inline-flex items-center rounded-md border border-border bg-background hover:bg-accent hover:text-accent-foreground text-foreground px-2.5 h-7 text-[11px] font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                Remind
                              </button>
                            </>
                          ) : (
                            <span className="text-[11px] text-success font-semibold flex items-center gap-1">
                              <CheckCircle2 className="size-3.5" />
                              Reconciled
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredInvoices.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-muted-foreground tabular-nums">
                        [!] ZERO INVOICE RECORDS MATCHED SEARCH QUERY
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: ESTIMATES & QUOTES */}
      {activeSubTab === 'estimates' && (
        <div className="animate-fade-in flex flex-col w-full">
          {/* CONTROL BAR */}
          <div className="p-4 bg-muted/30 border-b border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 w-full">
              <div className="relative flex-1 sm:max-w-md">
                <span className="text-[11px] font-semibold absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">SEARCH QUOTES //</span>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-card border border-border pl-28 pr-3 py-1.5 text-[13px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none rounded-md"
                  placeholder="EST CODE, CUSTOMER, SPEC..."
                  type="text"
                />
              </div>
            </div>
            <button
              onClick={() => {
                const cName = prompt('Enter prospective customer name:');
                if (cName) {
                  const spec = prompt('Enter service specification:', 'premium grooming package') || 'premium grooming package';
                  const amtStr = prompt('Enter estimated amount ($USD):', '150.00');
                  const amt = parseFloat(amtStr || '150');
                  const newEstId = `EST-2025-${Math.floor(1000 + Math.random() * 9000)}`;
                  setEstimatesList(prev => [
                    {
                      id: newEstId,
                      customer: cName,
                      contact: '+1 (555) 000-0000',
                      serviceSpec: `SVC: ${spec.toUpperCase()}`,
                      quotedAmt: amt,
                      expiryDate: '2025-05-30',
                      status: 'DRAFT_ESTIMATE',
                      terms: '14-DAY PRICE GUARANTEE'
                    },
                    ...prev
                  ]);
                  alert(`Estimate ${newEstId} drafted for ${cName}. Outstanding balance tracked.`);
                }
              }}
              className="bg-primary text-primary-foreground hover:bg-primary/90 border border-border px-4 py-2 text-[12px] uppercase tracking-wider font-semibold transition-colors cursor-pointer rounded-md w-full sm:w-auto"
            >
              + DRAFT ESTIMATE / QUOTE
            </button>
          </div>

          {/* ESTIMATES TABLE */}
          <div className="p-4 bg-card">
            <div className="border border-border overflow-x-auto">
              <table className="w-full border-collapse text-left text-[13px] text-foreground">
                <thead>
                  <tr className="bg-muted/40 border-b border-border font-semibold uppercase">
                    <th className="p-3 border-r border-border">EST ID</th>
                    <th className="p-3 border-r border-border">CLIENT REFERENCE</th>
                    <th className="p-3 border-r border-border">CONTACT</th>
                    <th className="p-3 border-r border-border">SPECIFIED SERVICE RANGE</th>
                    <th className="p-3 border-r border-border text-right">QUOTED AMT</th>
                    <th className="p-3 border-r border-border">GOOD THRU</th>
                    <th className="p-3 border-r border-border">TERMS</th>
                    <th className="p-3 border-r border-border text-center">STATUS</th>
                    <th className="p-3 text-center">COMMAND</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {filteredEstimates.map((est) => (
                    <tr key={est.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 border-r border-border font-semibold">{est.id}</td>
                      <td className="p-3 border-r border-border font-semibold uppercase">{est.customer}</td>
                      <td className="p-3 border-r border-border text-muted-foreground text-[12px]">{est.contact}</td>
                      <td className="p-3 border-r border-border text-muted-foreground max-w-[260px] truncate text-[11px] tabular-nums">{est.serviceSpec}</td>
                      <td className="p-3 border-r border-border text-right font-semibold tabular-nums">${est.quotedAmt.toFixed(2)}</td>
                      <td className="p-3 border-r border-border text-muted-foreground text-[12px]">{est.expiryDate}</td>
                      <td className="p-3 border-r border-border text-muted-foreground text-[10px]">{est.terms}</td>
                      <td className="p-3 border-r border-border text-center whitespace-nowrap">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 border uppercase ${
                          est.status === 'ACCEPTED_BY_CLIENT' ? 'bg-success/10 text-success border-success/20' :
                          est.status === 'SENT_TO_CLIENT' ? 'bg-primary/5 text-primary border-primary/30' : 'bg-muted/30 text-foreground border-border'
                        }`}>
                          {est.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {est.status === 'DRAFT_ESTIMATE' && (
                            <button
                              onClick={() => handleEstimateAction(est.id, 'SEND')}
                              className="bg-primary text-primary-foreground hover:bg-primary/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider cursor-pointer"
                            >
                              SEND
                            </button>
                          )}
                          {est.status !== 'CONVERTED_TO_INVOICE' ? (
                            <button
                              onClick={() => handleEstimateAction(est.id, 'CONVERT')}
                              className="bg-card hover:bg-muted/40 text-foreground border border-border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider cursor-pointer"
                            >
                              CONVERT
                            </button>
                          ) : (
                            <span className="text-[10px] text-success font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                              INVOICED
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: RECURRING INVOICES (3.2 Sales & Recurring Invoices) */}
      {activeSubTab === 'recurring' && (
        <div className="animate-fade-in flex flex-col w-full bg-card">
          {/* TOP SUMMARY PANELS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-b border-border">
            <div className="p-4 border-r border-border bg-card flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase">TOTAL CUSTOMERS</span>
                <span className="text-[9px] border border-border px-1.5 uppercase font-semibold">CUS_REG</span>
              </div>
              <div className="py-4 flex items-baseline justify-between">
                <span className="text-3xl font-semibold font-sans leading-none tracking-tight">342</span>
                <span className="text-[10px] text-muted-foreground tabular-nums">+12 THIS_MO</span>
              </div>
              <div className="text-[10px] text-muted-foreground border-t border-border pt-2 flex justify-between tabular-nums">
                <span>VERIFIED PROFILES</span>
                <span className="font-semibold">100%</span>
              </div>
            </div>

            <div className="p-4 border-r border-border bg-card flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase">ACTIVE SUBSCRIPTIONS</span>
                <span className="text-[9px] bg-primary text-primary-foreground px-1.5 uppercase font-semibold">RUNNING</span>
              </div>
              <div className="py-4 flex items-baseline justify-between">
                <span className="text-3xl font-semibold font-sans leading-none tracking-tight">48</span>
                <span className="text-[10px] text-muted-foreground tabular-nums">RETENTION: 98.2%</span>
              </div>
              <div className="text-[10px] text-muted-foreground border-t border-border pt-2 flex justify-between tabular-nums">
                <span>AUTOPAY ENROLLED</span>
                <span className="font-semibold">46 / 48</span>
              </div>
            </div>

            <div className="p-4 border-r border-border bg-card flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase">PROJECTED MRR</span>
                <span className="text-[9px] border border-border px-1.5 uppercase font-semibold">FORECAST</span>
              </div>
              <div className="py-4 flex items-baseline justify-between">
                <span className="text-xl font-semibold font-sans leading-none tracking-tight">$14,850.00</span>
                <span className="text-[10px] text-success font-semibold tabular-nums">+8.4%</span>
              </div>
              <div className="text-[10px] text-muted-foreground border-t border-border pt-2 flex justify-between tabular-nums">
                <span>CYCLE VELOCITY</span>
                <span className="font-semibold">14 DAYS</span>
              </div>
            </div>

            <div className="p-4 bg-card flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase">AVG ORDER VALUE</span>
                <span className="text-[9px] border border-border px-1.5 uppercase font-semibold">AOV // METRIC</span>
              </div>
              <div className="py-4 flex items-baseline justify-between">
                <span className="text-xl font-semibold font-sans leading-none tracking-tight">$126.40</span>
                <span className="text-[10px] text-muted-foreground tabular-nums">STD: $22.10</span>
              </div>
              <div className="text-[10px] text-muted-foreground border-t border-border pt-2 flex justify-between tabular-nums">
                <span>TICKET VARIANCE</span>
                <span className="font-semibold">± 4.2%</span>
              </div>
            </div>
          </div>

          {/* BATCH OPERATIONS CONTROLLER */}
          <div className="border-b border-border bg-muted/40 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">BATCH OPERATIONS &gt;&gt;</span>
              <button 
                onClick={() => alert('Compiling bulk debtor statement notices.')}
                className="bg-card hover:bg-muted border border-border px-3 py-1 font-semibold text-[10px] uppercase cursor-pointer"
              >
                GENERATE STATEMENTS
              </button>
              <button 
                onClick={() => alert('Batch card direct debit scheduled.')}
                className="bg-primary text-primary-foreground hover:bg-primary/90 border border-border px-3 py-1 font-semibold text-[10px] uppercase cursor-pointer"
              >
                BATCH PROCESS AUTOPAY
              </button>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground tabular-nums">
              <span>LAST_LEDGER_SYNC: <strong className="text-foreground">14:18:22 UTC</strong></span>
              <span className="bg-card border border-border px-1.5 py-0.5 text-foreground font-semibold">QUEUE: 00 PENDING</span>
            </div>
          </div>

          {/* SCHEDULING ACTION FILTER STRIP */}
          <div className="border-b border-border p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card">
            <div className="flex items-center gap-2 flex-1 max-w-xl">
              <span className="text-muted-foreground text-[10px] font-semibold uppercase">SEARCH:</span>
              <div className="relative flex-1">
                <input 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-card border border-border px-3 py-1.5 text-[12px] placeholder:text-muted-foreground/70 focus:outline-none rounded-md"
                  placeholder="CLIENT, PET BREED, OR SKU..."
                  type="text" 
                />
              </div>
            </div>
            <button 
              onClick={() => alert('New recurring scheduler created.')}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 font-semibold text-[13px] uppercase tracking-wider cursor-pointer"
            >
              + NEW RECURRING SCHEDULE
            </button>
          </div>

          {/* TABLE CONTAINER */}
          <div className="p-4 bg-card">
            <div className="border border-border overflow-x-auto">
              <table className="w-full border-collapse text-left text-[13px] text-foreground">
                <thead>
                  <tr className="bg-muted/40 border-b border-border font-semibold uppercase">
                    <th className="p-3 border-r border-border w-24">PROFILE ID</th>
                    <th className="p-3 border-r border-border min-w-[180px]">CUSTOMER &amp; PET</th>
                    <th className="p-3 border-r border-border min-w-[220px]">SERVICE TEMPLATE / ADD-ONS</th>
                    <th className="p-3 border-r border-border w-28 text-center">FREQUENCY</th>
                    <th className="p-3 border-r border-border w-32">NEXT BILLING</th>
                    <th className="p-3 border-r border-border w-32">CARD ON FILE</th>
                    <th className="p-3 border-r border-border text-right w-28">AMOUNT</th>
                    <th className="p-3 border-r border-border text-center w-28">AUTOPAY</th>
                    <th className="p-3 text-center">SYSTEM ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {recurringSchedules.filter(rec => {
                    const q = searchQuery.toLowerCase();
                    return !q || rec.customer.toLowerCase().includes(q) || rec.pet.toLowerCase().includes(q) || rec.service.toLowerCase().includes(q);
                  }).map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 border-r border-border font-semibold tabular-nums">{item.id}</td>
                      <td className="p-3 border-r border-border font-semibold uppercase leading-tight">
                        <div>{item.customer}</div>
                        <div className="text-[10px] text-muted-foreground font-normal mt-0.5">{item.pet}</div>
                      </td>
                      <td className="p-3 border-r border-border leading-tight text-foreground">
                        <div>{item.service}</div>
                        <div className="text-[9px] text-muted-foreground/70 tabular-nums mt-0.5 uppercase">SKU: {item.sku}</div>
                      </td>
                      <td className="p-3 border-r border-border text-center">
                        <span className="border border-border px-2 py-0.5 font-semibold text-[10px]">
                          {item.frequency}
                        </span>
                      </td>
                      <td className="p-3 border-r border-border leading-tight tabular-nums text-muted-foreground">
                        <div className="font-semibold">{item.nextBilling}</div>
                        <div className="text-[9px] text-muted-foreground/70">{item.daysDelta}</div>
                      </td>
                      <td className="p-3 border-r border-border tabular-nums text-muted-foreground text-[11px]">
                        <div className="flex items-center gap-1">
                          <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{item.cardOnFile}</span>
                          <span className="text-[9px] border border-border px-1 leading-none font-semibold bg-muted/40">{item.cardBrand}</span>
                        </div>
                      </td>
                      <td className="p-3 border-r border-border text-right font-semibold tabular-nums text-foreground">${item.amount.toFixed(2)}</td>
                      <td className="p-3 border-r border-border text-center whitespace-nowrap">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 border ${
                          item.autopay === 'ENABLED' ? 'bg-success/10 text-success border-success/20' :
                          item.autopay === 'PAUSED' ? 'bg-warning/10 text-warning border-warning/20' : 'bg-muted/30 text-foreground border-border'
                        }`}>
                          {item.autopay}
                        </span>
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleRecurringRunNow(item.id)}
                            className="bg-primary text-primary-foreground hover:bg-primary/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider cursor-pointer"
                          >
                            RUN NOW
                          </button>
                          <button
                            onClick={() => alert(`Editing contract settings for ${item.id}.`)}
                            className="border border-border bg-card hover:bg-muted/40 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider cursor-pointer"
                          >
                            EDIT
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: UNPAID & OUTSTANDING (3.4 Invoices: Unpaid & Outstanding) */}
      {activeSubTab === 'unpaid' && (
        <div className="animate-fade-in flex flex-col w-full bg-card">
          {/* SUMMARY KPI BLOCKS */}
          <div className="grid grid-cols-1 md:grid-cols-5 border-b border-border">
            <div className="p-3.5 border-r border-border flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">TOTAL OUTSTANDING AR</span>
                <span className="text-[9px] border border-border px-1 font-semibold">[TOTAL]</span>
              </div>
              <div className="my-3">
                <div className="text-xl font-semibold tracking-tight">$8,720.50</div>
                <div className="text-[10px] text-muted-foreground uppercase mt-0.5">09 INVOICES UNSETTLED</div>
              </div>
              <div className="border-t border-border pt-2 flex justify-between text-[11px]">
                <span>100% OF REVENUE OPEN</span>
                <span className="font-semibold text-success">AUDIT OK</span>
              </div>
            </div>

            <div className="p-3.5 border-r border-border flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">CURRENT NET-30</span>
                <span className="text-[9px] border border-border px-1 font-semibold">[COMPLIANT]</span>
              </div>
              <div className="my-3">
                <div className="text-xl font-semibold tracking-tight">$6,380.00</div>
                <div className="text-[10px] text-muted-foreground uppercase mt-0.5">06 INVOICES TERMS COMPLIANT</div>
              </div>
              <div className="border-t border-border pt-2 flex justify-between text-[11px]">
                <span>EXPOSURE: 73.1%</span>
                <span className="font-semibold text-foreground">[STANDARD]</span>
              </div>
            </div>

            <div className="p-3.5 border-r border-border flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">PAST DUE 1-30 DAYS</span>
                <span className="text-[9px] bg-primary text-primary-foreground px-1 font-semibold">[AGING]</span>
              </div>
              <div className="my-3">
                <div className="text-xl font-semibold tracking-tight text-destructive">$1,420.00</div>
                <div className="text-[10px] text-muted-foreground uppercase mt-0.5">02 INVOICES AGING DELAY</div>
              </div>
              <div className="border-t border-border pt-2 flex justify-between text-[11px]">
                <span>STAGE 1 DUNNING SENT</span>
                <span className="font-semibold text-destructive">RECOVERY ON</span>
              </div>
            </div>

            <div className="p-3.5 border-r border-border flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">CRITICAL (&gt;60D)</span>
                <span className="text-[9px] bg-primary text-primary-foreground px-1 font-semibold">[ALERT]</span>
              </div>
              <div className="my-3">
                <div className="text-xl font-semibold tracking-tight text-destructive">$920.50</div>
                <div className="text-[10px] text-muted-foreground uppercase mt-0.5">01 INVOICE OVERDUE SEVERE</div>
              </div>
              <div className="border-t border-border pt-2 flex justify-between text-[11px]">
                <span>LEGAL / DIRECT SUSPEND</span>
                <span className="font-semibold text-destructive">ESCALATE</span>
              </div>
            </div>

            <div className="p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">AUTOPAY PROFILES</span>
                <span className="text-[9px] border border-border px-1 font-semibold">[STRIPE CC]</span>
              </div>
              <div className="my-3">
                <div className="text-xl font-semibold tracking-tight">7 / 9</div>
                <div className="text-[10px] text-muted-foreground uppercase mt-0.5">TOKENIZED VAULT READY (77.7%)</div>
              </div>
              <div className="border-t border-border pt-2 flex justify-between text-[11px]">
                <span>DIRECT PULL CAPABLE</span>
                <span className="font-semibold text-foreground">$7,630.50 CAP</span>
              </div>
            </div>
          </div>

          {/* BULK ACTIONS / DUNNING TRIGGER BAR */}
          <div className="p-4 bg-muted/30 border-b border-border flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  alert('Bulk card payments initialized across tokenized active profiles.\nStripe Elements authorized $7,630.50.');
                }}
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-3.5 py-1.5 font-semibold uppercase text-[10px] tracking-wider cursor-pointer flex items-center gap-1.5"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>BATCH CHARGE CARDS ON FILE</span>
              </button>
              <button 
                onClick={() => alert('Dunning system dispatched email and SMS balance demand templates to 3 past due accounts.')}
                className="bg-card hover:bg-muted/40 border border-border text-foreground px-3.5 py-1.5 font-semibold uppercase text-[10px] tracking-wider cursor-pointer flex items-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>SEND PAYMENT REMINDER BLAST</span>
              </button>
            </div>
            <span className="text-[11px] text-muted-foreground font-semibold bg-card border border-border px-2 py-1">
              PROVISION RATE: 2.11% RISK RESERVE ACTIVE
            </span>
          </div>

          {/* UNPAID LIST GRID */}
          <div className="p-4 bg-card">
            <div className="border border-border overflow-x-auto">
              <table className="w-full border-collapse text-left text-[13px] text-foreground">
                <thead>
                  <tr className="bg-muted/40 border-b border-border font-semibold uppercase">
                    <th className="p-3 border-r border-border w-8 text-center">
                      <input type="checkbox" defaultChecked className="h-3 w-3 border-border text-foreground" />
                    </th>
                    <th className="p-3 border-r border-border">INVOICE ID // DEBTOR &amp; PET</th>
                    <th className="p-3 border-r border-border">ISSUE DATE</th>
                    <th className="p-3 border-r border-border">DUE DATE</th>
                    <th className="p-3 border-r border-border">DAYS DELTA / AGING</th>
                    <th className="p-3 border-r border-border">BILLED LINE ITEMS</th>
                    <th className="p-3 border-r border-border text-right">TOTAL</th>
                    <th className="p-3 border-r border-border text-right">PAID</th>
                    <th className="p-3 border-r border-border text-right font-semibold bg-muted/30">BALANCE DUE</th>
                    <th className="p-3 border-r border-border">AUTOPAY STATUS</th>
                    <th className="p-3 border-r border-border text-center">STATUS</th>
                    <th className="p-3 text-center">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {unpaidInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 border-r border-border text-center">
                        <input type="checkbox" defaultChecked className="h-3 w-3 border-border text-foreground" />
                      </td>
                      <td className="p-3 border-r border-border">
                        <div className="font-semibold">{inv.id}</div>
                        <div className="text-[10px] text-muted-foreground uppercase mt-0.5">{inv.debtor} • {inv.pet}</div>
                      </td>
                      <td className="p-3 border-r border-border text-[12px] text-muted-foreground">{inv.issueDate}</td>
                      <td className="p-3 border-r border-border text-[12px] text-muted-foreground">{inv.dueDate}</td>
                      <td className="p-3 border-r border-border whitespace-nowrap">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 border ${
                          inv.delta.includes('OVERDUE') ? 'bg-red-600 text-white border-red-700' :
                          inv.delta.includes('PAST') ? 'bg-warning/10 text-warning border-warning/20' : 'bg-muted/30 text-foreground border-border'
                        }`}>
                          {inv.delta}
                        </span>
                      </td>
                      <td className="p-3 border-r border-border text-muted-foreground truncate max-w-[200px]" title={inv.items}>{inv.items}</td>
                      <td className="p-3 border-r border-border text-right tabular-nums font-semibold">${inv.total.toFixed(2)}</td>
                      <td className="p-3 border-r border-border text-right tabular-nums text-muted-foreground">${inv.paid.toFixed(2)}</td>
                      <td className="p-3 border-r border-border text-right tabular-nums font-semibold bg-muted/30 text-destructive">${(inv.total - inv.paid).toFixed(2)}</td>
                      <td className="p-3 border-r border-border text-center text-[10px] text-muted-foreground uppercase tabular-nums">{inv.autopay}</td>
                      <td className="p-3 border-r border-border text-center whitespace-nowrap">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 border uppercase ${
                          inv.status.includes('CRITICAL') ? 'bg-destructive/5 text-destructive border-destructive/30' : 'bg-warning/10 text-warning border-warning/20 font-semibold'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1 text-[11px]">
                          {inv.autopay.includes('YES') ? (
                            <button 
                              onClick={() => alert(`Stripe Card authorized for $${inv.total - inv.paid}.`)}
                              className="bg-primary text-primary-foreground hover:bg-primary/90 px-2 py-0.5 font-semibold uppercase tracking-wider cursor-pointer"
                            >
                              CHARGE
                            </button>
                          ) : (
                            <button 
                              onClick={() => alert(`Dunning demand letter compiled and sent to ${inv.debtor}.`)}
                              className="border border-border bg-card hover:bg-muted/40 text-foreground px-2 py-0.5 font-semibold uppercase tracking-wider cursor-pointer"
                            >
                              DUN
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* LOWER STATEMENT TRIGGERS */}
          <div className="p-4 border-t border-border bg-muted/30 flex flex-col md:flex-row md:items-center justify-between gap-4 text-[12px]">
            <div className="flex flex-col gap-1.5 flex-1 max-w-2xl">
              <span className="font-semibold text-foreground">AGING CATEGORY COMPOSITION ALLOCATION (GAAP SPEC):</span>
              <div className="h-6 w-full border border-border p-0.5 flex bg-card text-[10px] select-none font-semibold text-center">
                <div className="h-full bg-primary text-primary-foreground flex items-center justify-center" style={{ width: '73.1%' }}>
                  73.1% NET-30
                </div>
                <div className="h-full bg-muted text-foreground flex items-center justify-center border-x border-border" style={{ width: '16.3%' }}>
                  16.3% PAST DUE
                </div>
                <div className="h-full bg-primary text-primary-foreground flex items-center justify-center" style={{ width: '10.6%' }}>
                  10.6% CRIT
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => alert('Debtor AR aging schedule report exported to CSV.')}
                className="bg-card hover:bg-muted text-foreground border border-border px-4 py-2 uppercase font-semibold tracking-wider cursor-pointer"
              >
                EXPORT AR SCHEDULE
              </button>
              <button 
                onClick={() => alert('Risk mitigation provision adjustments recalculated.')}
                className="bg-black hover:bg-muted text-white border border-border px-4 py-2 uppercase font-semibold tracking-wider cursor-pointer"
              >
                RECONCILE BAD-DEBT GL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: STATEMENTS */}
      {activeSubTab === 'statements' && (
        <div className="animate-fade-in flex flex-col w-full">
          {/* CONTROL BAR */}
          <div className="p-4 bg-muted/30 border-b border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 flex-1">
              <div className="flex items-center border border-border bg-card px-3 py-1.5 gap-2">
                <span className="text-[11px] text-muted-foreground font-semibold">CLIENT REFERENCE:</span>
                <select
                  value={selectedStatementCustomer}
                  onChange={(e) => setSelectedStatementCustomer(e.target.value)}
                  className="bg-transparent text-[13px] text-foreground focus:outline-none cursor-pointer rounded-md border-none"
                >
                  <option value="Sarah Johnson">Sarah Johnson</option>
                  <option value="Marcus Johnson">Marcus Johnson</option>
                  <option value="Mike Ross">Mike Ross</option>
                  <option value="Emily Davis">Emily Davis</option>
                </select>
              </div>
              <div className="flex items-center border border-border bg-card px-3 py-1.5 gap-2">
                <span className="text-[11px] text-muted-foreground font-semibold">PERIOD RANGE:</span>
                <select
                  value={statementRange}
                  onChange={(e) => setStatementRange(e.target.value)}
                  className="bg-transparent text-[13px] text-foreground focus:outline-none cursor-pointer rounded-md border-none animate-none"
                >
                  <option value="Q2 2025 (APR 01 - JUN 30)">Q2 2025 (APR 01 - JUN 30)</option>
                  <option value="Q1 2025 (JAN 01 - MAR 31)">Q1 2025 (JAN 01 - MAR 31)</option>
                  <option value="LAST 30 DAYS">LAST 30 DAYS</option>
                  <option value="FULL LIFETIME ARCHIVE">FULL LIFETIME ARCHIVE</option>
                </select>
              </div>
            </div>
          </div>

          {/* LEDGER SHEETS */}
          <div className="p-4 bg-card flex flex-col gap-6">
            <div className="p-6 bg-card border border-border space-y-6">
              {/* BRAND HEADER */}
              <div className="flex justify-between items-start  border-border pb-6">
                <div className="space-y-1">
                  <h2 className="font-display text-sm font-semibold tracking-tight text-foreground">Customer Account Statement</h2>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    ALL ABOUT PAWZ ENTERPRISES LLC<br />
                    100 BROADWAY, NEW YORK NY 10005<br />
                    TEL: +1 (555) 019-9000 // COMPLIANCE@PAWZ.CORP
                  </p>
                </div>
                <div className="text-right space-y-1 tabular-nums text-muted-foreground">
                  <div className="font-semibold text-foreground uppercase">RECONCILED ACCRUED SPEC</div>
                  <div>GENERATED: 2025-05-12 14:24 UTC</div>
                  <div>ACCOUNT ID: <span className="font-semibold text-foreground uppercase">REF-CUS-882194</span></div>
                </div>
              </div>

              {/* TARGET DETAILS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-[13px] border-b border-border pb-6">
                <div className="space-y-1">
                  <div className="text-[10px] text-muted-foreground font-semibold uppercase">STATEMENT TO // RECIPIENT</div>
                  <div className="font-semibold text-foreground uppercase">{selectedStatementCustomer}</div>
                  <div className="text-muted-foreground">PRECIPIENT CLIENT STATUS: ACTIVE MEMBER</div>
                  <div className="text-muted-foreground text-[12px]">REGISTERED TERMINAL VERIFIED</div>
                </div>
                <div className="space-y-1 sm:text-right tabular-nums">
                  <div className="text-[9px] text-muted-foreground font-semibold uppercase">SUMMARY BALANCES</div>
                  <div className="text-muted-foreground">TOTAL CHARGES THIS PERIOD: <strong className="text-foreground">$125.00</strong></div>
                  <div className="text-muted-foreground">TOTAL PAYMENTS SETTLED: <strong className="text-foreground">($125.00)</strong></div>
                  <div className="text-foreground font-semibold text-sm pt-1">
                    NET UNSETTLED PORTFOLIO BALANCE: $115.00
                  </div>
                </div>
              </div>

              {/* TRANSACTION LEDGER TABLE */}
              <div className="border border-border">
                <table className="w-full border-collapse text-left text-[13px] text-foreground">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border font-semibold uppercase">
                      <th className="p-3 border-r border-border">POST DATE</th>
                      <th className="p-3 border-r border-border">REFERENCE KEY</th>
                      <th className="p-3 border-r border-border">TRANSACTION DESCRIPTION</th>
                      <th className="p-3 border-r border-border text-right">CHARGES (+)</th>
                      <th className="p-3 border-r border-border text-right">CREDITS (-)</th>
                      <th className="p-3 text-right">CUMULATIVE TERM BALANCE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    <tr className="hover:bg-muted/30">
                      <td className="p-3 border-r border-border">2025-04-10</td>
                      <td className="p-3 border-r border-border">TXN_901842</td>
                      <td className="p-3 border-r border-border">INVOICE INV-2025-074 // FULL GROOMING SERVICE</td>
                      <td className="p-3 border-r border-border text-right">$125.00</td>
                      <td className="p-3 border-r border-border text-right">—</td>
                      <td className="p-3 text-right font-semibold">$125.00</td>
                    </tr>
                    <tr className="hover:bg-muted/30">
                      <td className="p-3 border-r border-border">2025-04-10</td>
                      <td className="p-3 border-r border-border">PAY_881203</td>
                      <td className="p-3 border-r border-border">CARD SETTLEMENT Visa •••• 4242</td>
                      <td className="p-3 border-r border-border text-right">—</td>
                      <td className="p-3 border-r border-border text-right">($125.00)</td>
                      <td className="p-3 text-right font-semibold">$0.00</td>
                    </tr>
                    <tr className="hover:bg-muted/30 text-destructive">
                      <td className="p-3 border-r border-border">2025-05-10</td>
                      <td className="p-3 border-r border-border">INV-2025-084-A</td>
                      <td className="p-3 border-r border-border">INVOICE TARGET // UNPAID TERM OUTSTANDING</td>
                      <td className="p-3 border-r border-border text-right">$115.00</td>
                      <td className="p-3 border-r border-border text-right">—</td>
                      <td className="p-3 text-right font-semibold">$115.00</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* LOWER STATEMENT TRIGGERS */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-border">
              <span className="text-[11px] text-muted-foreground/70 uppercase">
                Generated dynamically under PCI-Compliance standard section 3.2.7.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => alert(`Transmitting statement package for ${selectedStatementCustomer} via SMS/Email portal.`)}
                  className="bg-card hover:bg-muted text-foreground border border-border px-4 py-2 text-[12px] uppercase font-semibold tracking-wider cursor-pointer"
                >
                  TRANSMIT STATEMENT PORTAL
                </button>
                <button
                  onClick={() => alert(`Statement compilation PDF download initialized for ${selectedStatementCustomer}.`)}
                  className="bg-black hover:bg-muted text-white border border-border px-4 py-2 text-[12px] uppercase font-semibold tracking-wider cursor-pointer"
                >
                  DOWNLOAD COMPILED PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
