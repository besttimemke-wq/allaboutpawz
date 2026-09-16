'use client';

import React, { useState } from 'react';
import { DawgNavSection } from '@/lib/types';
import { CreditCard, Terminal, Search, Shield, RefreshCw, Smartphone, DollarSign, Calculator, ChevronRight, Check } from 'lucide-react';
import { PageHeader, PageTabs, FilterSelect, KpiTiles } from '../_shared/PageHeader';
import { cn } from '@/lib/utils';

interface PaymentsViewProps {
  onNavigateSection?: (section: DawgNavSection) => void;
  onOpenQuickPayment?: () => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({ onNavigateSection, onOpenQuickPayment }) => {
  // Navigation: 'overview' | 'retail' | 'ecommerce' | 'cash' | 'pending' | 'fleet' | 'checkouts' | 'register'
  const [activeSubView, setActiveSubView] = useState<'overview' | 'retail' | 'ecommerce' | 'cash' | 'pending' | 'fleet' | 'checkouts' | 'register'>('overview');
  
  // Search state
  const [paymentsSearch, setPaymentsSearch] = useState('');
  const [paymentsTab, setPaymentsTab] = useState<'all' | 'completed' | 'pending' | 'cash' | 'card'>('all');
  const [checkoutSearch, setCheckoutSearch] = useState('');
  const [checkoutGroomerFilter, setCheckoutGroomerFilter] = useState('ALL');
  const [registerSearch, setRegisterSearch] = useState('');
  const [registerTab, setRegisterTab] = useState<'bills' | 'vendors' | 'po'>('bills');

  // Interactive cash register denominations calculator
  const [cashCalc, setCashCalc] = useState({
    hundreds: 5,  // $500
    fifties: 6,   // $300
    twenties: 15, // $300
    tens: 12,     // $120
    fives: 16,    // $80
    ones: 45,     // $45
    quarters: 20, // $5
    dimes: 30,    // $3
    nickels: 20,  // $1
    pennies: 50,  // $0.50
    openingFloat: 200,
    expectedInflow: 1154.50,
  });

  // Calculate counted register till
  const countedTill = 
    (cashCalc.hundreds * 100) + 
    (cashCalc.fifties * 50) + 
    (cashCalc.twenties * 20) + 
    (cashCalc.tens * 10) + 
    (cashCalc.fives * 5) + 
    (cashCalc.ones * 1) + 
    (cashCalc.quarters * 0.25) + 
    (cashCalc.dimes * 0.10) + 
    (cashCalc.nickels * 0.05) + 
    (cashCalc.pennies * 0.01);

  const totalExpected = cashCalc.openingFloat + cashCalc.expectedInflow;
  const variance = countedTill - totalExpected;

  // Terminal Fleet State
  const [fleetTerminalLogs, setFleetTerminalLogs] = useState<string[]>([
    'PAX-A920 (Lane 1) connected over PoE. RSSI: -48dBm.',
    'S700-Countertop (Boutique) status check: idle.',
    'Mobile-Lane-03 (Van #1) GPS binding triggers online.',
    'System ready. Type :PING or :DRAWER_KICK below.'
  ]);
  const [fleetCmd, setFleetCmd] = useState('');

  // Dummy payments list
  const [paymentsList, setPaymentsList] = useState([
    { id: 'TXN-9021', customer: 'Alice Cooper', pet: 'Rockstar (Retriever)', service: 'Full Groom + Deshedding', invoice: 'INV-2025-901', amount: 145.00, method: 'CREDIT_CARD', date: '2025-05-12', time: '14:21', status: 'PAID', details: 'Stripe Terminal #L1-PAX-A920' },
    { id: 'TXN-9022', customer: 'David Bowie', pet: 'Starman (Poodle)', service: 'Breed Standard Cut', invoice: 'INV-2025-902', amount: 125.00, method: 'CASH', date: '2025-05-12', time: '13:05', status: 'PAID', details: 'Register Till Drawer A' },
    { id: 'TXN-9023', customer: 'Freddie Mercury', pet: 'Balsara (Persian)', service: 'De-matting & Bath', invoice: 'INV-2025-903', amount: 110.00, method: 'E_STORE_AUTOPAY', date: '2025-05-11', time: '16:45', status: 'PAID', details: 'Stripe Storefront Online Webhook' },
    { id: 'TXN-9024', customer: 'Iggy Pop', pet: 'WildOne (Bulldog)', service: 'Nail Grinding Accrual', invoice: 'INV-2025-904', amount: 35.00, method: 'CREDIT_CARD', date: '2025-05-11', time: '10:12', status: 'PAID', details: 'Stripe Terminal #L2-S700' },
    { id: 'TXN-9025', customer: 'Robert Plant', pet: 'Zeppelin (Malamute)', service: 'Blowout & Brush', invoice: 'INV-2025-905', amount: 165.00, method: 'CREDIT_CARD', date: '2025-05-12', time: '09:14', status: 'PENDING_AUTH', details: 'Pre-auth escrow reservation lock' },
  ]);

  // Dummy checkouts queue
  const [checkoutQueue, setCheckoutQueue] = useState([
    { id: 'APP-901', customer: 'Alice Cooper', pet: 'Rockstar', type: 'Golden Retriever (Groom + Deshed)', groomer: 'Sarah M.', price: 130.00, commissionRate: '45%', tips: 15.00, billable: '$145.00', status: 'AWAITING_PAYMENT' },
    { id: 'APP-902', customer: 'David Bowie', pet: 'Starman', type: 'Standard Poodle (Breed Cut)', groomer: 'Jessica L.', price: 110.00, commissionRate: '45%', tips: 15.00, billable: '$125.00', status: 'AWAITING_PAYMENT' },
    { id: 'APP-903', customer: 'Freddie Mercury', pet: 'Balsara', type: 'Persian Cat (Bath & De-mat)', groomer: 'Mike R.', price: 100.00, commissionRate: '50%', tips: 10.00, billable: '$110.00', status: 'COMPLETED' },
  ]);

  // Dummy bills list
  const [billsList, setBillsList] = useState([
    { id: 'BILL-4011', ref: 'INV-APEX-902', supplier: 'APEX GROOMING SUPPLIES', dueDate: '2025-05-28', category: 'SALON GENERAL SUPPLIES', gross: 350.00, tax: 28.00, net: 378.00, status: 'PENDING_APPROVAL', auditRef: 'AUDIT: APEX_801' },
    { id: 'BILL-4012', ref: 'INV-FLEET-34', supplier: 'CENTRAL ENERGY (PET VAN FUEL)', dueDate: '2025-05-20', category: 'MOBILE VAN FUELS', gross: 120.00, tax: 0.00, net: 120.00, status: 'APPROVED', auditRef: 'AUDIT: FUEL_903' },
    { id: 'BILL-4013', ref: 'INV-RENT-05', supplier: 'NORMAN REAL ESTATE HOLDINGS', dueDate: '2025-06-01', category: 'FACILITY LEASES & UTILITIES', gross: 3200.00, tax: 0.00, net: 3200.00, status: 'SETTLED', auditRef: 'AUDIT: LEASE_405' },
  ]);

  const filteredPayments = paymentsList.filter((p) => {
    if (paymentsTab === 'completed' && p.status !== 'PAID') return false;
    if (paymentsTab === 'pending' && p.status !== 'PENDING_AUTH') return false;
    if (paymentsTab === 'cash' && p.method !== 'CASH') return false;
    if (paymentsTab === 'card' && p.method !== 'CREDIT_CARD' && p.method !== 'E_STORE_AUTOPAY') return false;

    if (paymentsSearch.trim()) {
      const q = paymentsSearch.toLowerCase();
      return (
        p.id.toLowerCase().includes(q) ||
        p.customer.toLowerCase().includes(q) ||
        p.pet.toLowerCase().includes(q) ||
        p.invoice.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredCheckouts = checkoutQueue.filter((chk) => {
    if (checkoutGroomerFilter !== 'ALL' && chk.groomer !== checkoutGroomerFilter) return false;
    if (checkoutSearch.trim()) {
      const q = checkoutSearch.toLowerCase();
      return (
        chk.id.toLowerCase().includes(q) ||
        chk.customer.toLowerCase().includes(q) ||
        chk.pet.toLowerCase().includes(q) ||
        chk.type.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredBills = billsList.filter((bill) => {
    if (registerSearch.trim()) {
      const q = registerSearch.toLowerCase();
      return (
        bill.id.toLowerCase().includes(q) ||
        bill.supplier.toLowerCase().includes(q) ||
        bill.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCheckoutAction = (id: string, action: string) => {
    if (action === 'COLLECT_NOW') {
      const tipVal = prompt(`Enter customer tip amount for appointment ${id} ($USD):`, '15.00');
      if (tipVal !== null) {
        const parsedTip = parseFloat(tipVal) || 0;
        alert(`Successfully checkout appointment ${id}! Tip of $${parsedTip.toFixed(2)} recorded.`);
        setCheckoutQueue(prev => prev.map(c => c.id === id ? { ...c, status: 'COMPLETED', tips: parsedTip } : c));
      }
    }
  };

  const handleBillAction = (id: string, action: string) => {
    if (action === 'APPROVE') {
      setBillsList(prev => prev.map(b => b.id === id ? { ...b, status: 'APPROVED' } : b));
      alert(`Bill ${id} approved for outflow scheduling.`);
    } else if (action === 'PAY_NOW') {
      setBillsList(prev => prev.map(b => b.id === id ? { ...b, status: 'SETTLED' } : b));
      alert(`Outflow payment processed for Bill ${id}. Transaction recorded.`);
    }
  };

  const handleFleetCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fleetCmd.trim()) return;

    const cmd = fleetCmd.trim().toUpperCase();
    setFleetTerminalLogs(prev => [...prev, `PAWZ:// ${cmd}`]);

    if (cmd === ':PING') {
      setFleetTerminalLogs(prev => [
        ...prev,
        'L1-PAX: PING SUCCESS. LATENCY: 12ms. EMV FIRMWARE v3.4.',
        'L2-S700: PING SUCCESS. LATENCY: 22ms. BATTERY: 94% (Charging).'
      ]);
    } else if (cmd === ':DRAWER_KICK') {
      setFleetTerminalLogs(prev => [...prev, 'SYS: RECON_SOLENOID_RELEASE trigged. Drawer A opened physically.']);
    } else {
      setFleetTerminalLogs(prev => [...prev, `ERR: Command "${cmd}" unknown. Use :PING or :DRAWER_KICK.`]);
    }
    setFleetCmd('');
  };

  return (
    <div className="flex flex-col w-full text-foreground bg-background select-text">
      {/* STATUS STRIP */}
      <div className="w-full bg-muted/60 border-b border-border px-4 py-2 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-success animate-pulse shrink-0"></span>
          <span className="font-medium text-[11px] text-muted-foreground">Payments &amp; Checkouts</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="font-medium">Gateway: <span className="text-success font-semibold">Stripe Balanced</span></span>
          <span className="font-medium hidden sm:inline">Currency: <span className="text-foreground font-semibold">USD</span></span>
        </div>
      </div>

      {/* PAGE HEADER */}
      <PageHeader
        contextLabel="Payments & Checkouts"
        statusItems={[
          { label: "Gateway:", value: "Stripe Balanced", tone: "success" },
          { label: "Currency:", value: "USD" },
        ]}
        title="Payments"
        badge="Financial Register"
        description="Complete POS and gateway interface. Track lane-specific countertop hardware EMV terminals, web-storefront checkouts, live pending pre-auth escrows, and cash register audits."
      />

      {/* SUB NAVIGATION TABS */}
      <PageTabs
        activeId={activeSubView}
        onSelect={(id) => setActiveSubView(id as typeof activeSubView)}
        tabs={[
          { id: 'overview', label: 'Financial Register' },
          { id: 'retail', label: 'POS Retail Hardware' },
          { id: 'ecommerce', label: 'Ecommerce Gateway' },
          { id: 'cash', label: 'Cash & Register Till' },
          { id: 'pending', label: 'Pending Authorizations' },
          { id: 'fleet', label: 'Terminal Fleet Manager' },
          { id: 'checkouts', label: 'Checkouts Queue' },
          { id: 'register', label: 'Outflow Bills & POs' },
        ]}
      />

      {/* VIEW CONTENT: OVERVIEW (FINANCIAL REGISTER) */}
      {activeSubView === 'overview' && (
        <div className="animate-fade-in p-6 space-y-6">
          {/* KPI TILES */}
          <KpiTiles
            tiles={[
              {
                label: 'Total Revenue (MTD)',
                value: '$18,450.00',
                caption: '+14.8% vs last month',
                tone: 'primary',
                icon: DollarSign,
              },
              {
                label: 'Completed Payments',
                value: '142',
                caption: 'Average ticket: $129.92',
                icon: Check,
              },
              {
                label: 'Escrow Deposits',
                value: '3 ($245.00)',
                caption: 'ACH / Card Holds pending clearance',
                tone: 'warning',
                icon: Shield,
              },
              {
                label: 'Salon Conversion',
                value: '97.8%',
                caption: 'Immediate settlement rate',
                tone: 'success',
                icon: CreditCard,
              },
            ]}
          />

          {/* CONTROL BAR */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card border border-border rounded-xl shadow-card p-3">
            <div className="relative w-full sm:max-w-md">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={paymentsSearch}
                onChange={(e) => setPaymentsSearch(e.target.value)}
                className="w-full bg-background border border-input rounded-md pl-9 pr-3 h-9 text-[13px] text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring transition-colors"
                placeholder="Search txn ID, customer, invoice..."
                type="text"
              />
            </div>
            <button
              onClick={onOpenQuickPayment}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3.5 text-[13px] font-medium shadow-card transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background w-full sm:w-auto justify-center"
            >
              <DollarSign className="size-4" />
              Record Direct Payment
            </button>
          </div>

          {/* TABS STRIP FOR REGISTER VIEW */}
          <div className="bg-background border border-border rounded-xl shadow-card flex overflow-x-auto custom-scrollbar">
            {(['all', 'completed', 'pending', 'cash', 'card'] as const).map((tab) => {
              const isActive = paymentsTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setPaymentsTab(tab)}
                  className={cn(
                    "px-5 py-2.5 text-[12px] font-medium border-r border-border cursor-pointer transition-colors duration-150 whitespace-nowrap first:rounded-l-xl last:rounded-r-xl last:",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  {tab === 'all' ? 'All Transactions' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              );
            })}
          </div>

          {/* TABLE */}
          <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden overflow-x-auto">
            <table className="w-full border-collapse text-left text-[13px] text-foreground">
              <thead>
                <tr className="bg-muted/40 border-b border-border font-semibold uppercase text-[11px] tracking-wider text-muted-foreground">
                  <th className="p-3 border-r border-border font-semibold">Transaction ID</th>
                  <th className="p-3 border-r border-border font-semibold">Customer / Pet</th>
                  <th className="p-3 border-r border-border font-semibold">Service Details</th>
                  <th className="p-3 border-r border-border font-semibold">Channel Reference</th>
                  <th className="p-3 border-r border-border text-right font-semibold">Amount</th>
                  <th className="p-3 border-r border-border font-semibold">Channel</th>
                  <th className="p-3 border-r border-border font-semibold">Timestamp</th>
                  <th className="p-3 text-center font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium">
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-accent/50 transition-colors">
                    <td className="p-3 border-r border-border font-semibold tabular-nums">{p.id}</td>
                    <td className="p-3 border-r border-border">
                      <div className="font-medium text-foreground">{p.customer}</div>
                      <div className="text-[10px] text-muted-foreground">{p.pet}</div>
                    </td>
                    <td className="p-3 border-r border-border text-muted-foreground truncate max-w-[200px]">{p.service}</td>
                    <td className="p-3 border-r border-border text-muted-foreground tabular-nums">{p.details}</td>
                    <td className="p-3 border-r border-border text-right font-semibold tabular-nums text-foreground">${p.amount.toFixed(2)}</td>
                    <td className="p-3 border-r border-border text-muted-foreground">{p.method.replace(/_/g, ' ')}</td>
                    <td className="p-3 border-r border-border">
                      <div className="text-foreground">{p.date}</div>
                      <div className="text-[10px] text-muted-foreground">{p.time}</div>
                    </td>
                    <td className="p-3 text-center">
                      <span className={cn(
                        "inline-flex items-center text-[10px] font-semibold border px-2 py-0.5 rounded-full uppercase",
                        p.status === 'PAID'
                          ? "bg-success/10 border-success/20 text-success"
                          : "bg-warning/10 border-warning/20 text-warning animate-pulse",
                      )}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW CONTENT: RETAIL PAYMENTS (POS) */}
      {activeSubView === 'retail' && (
        <div className="animate-fade-in p-6 space-y-6 bg-muted/30 min-h-[500px]">
          {/* LANE DIAGNOSTICS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card border border-border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase text-muted-foreground text-muted-foreground/70">LANE 01 // MAIN DESK</span>
                <span className="w-2.5 h-2.5 bg-success/100 rounded-full animate-ping"></span>
              </div>
              <p className="text-sm tabular-nums font-semibold">PAX-A920 TERMINAL</p>
              <div className="text-[11px] text-muted-foreground">IP: 192.168.1.104 // PORT: 3000</div>
              <div className="bg-muted/30 p-2 text-[10px] text-muted-foreground/70 border border-border">
                ESC/POS RECEIPT SPOOLER: ACTIVE (PAPER: 85%)
              </div>
            </div>
            <div className="bg-card border border-border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase text-muted-foreground text-muted-foreground/70">LANE 02 // BOUTIQUE RECEPT</span>
                <span className="w-2.5 h-2.5 bg-success/100 rounded-full"></span>
              </div>
              <p className="text-sm tabular-nums font-semibold">S700 COUNTERTOP</p>
              <div className="text-[11px] text-muted-foreground">IP: 192.168.1.109 // PORT: 3000</div>
              <div className="bg-muted/30 p-2 text-[10px] text-muted-foreground/70 border border-border">
                ESC/POS RECEIPT SPOOLER: ACTIVE (PAPER: 100%)
              </div>
            </div>
            <div className="bg-card border border-border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase text-muted-foreground text-muted-foreground/70">MOBILE VAN #1 TERM</span>
                <span className="w-2.5 h-2.5 bg-warning/100 rounded-full"></span>
              </div>
              <p className="text-sm tabular-nums font-semibold">PAX-A920 (WIFI HOTSPOT)</p>
              <div className="text-[11px] text-muted-foreground">CONNECTED VIA LTE ROAMING</div>
              <div className="bg-muted/30 p-2 text-[10px] text-muted-foreground/70 border border-border">
                PRINTER: LOW_PAPER (PAPER: 14%)
              </div>
            </div>
          </div>

          {/* RETAIL TRANSACTION REGISTER */}
          <div className="bg-card border border-border">
            <div className="bg-muted/40 border-b border-border p-3 tabular-nums font-semibold text-[13px] uppercase text-foreground">
              ACTIVE POS COUNTERTOP TRANSACTION LOG
            </div>
            <div className="p-4 overflow-x-auto">
              <table className="w-full text-left text-[13px] text-foreground border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/30 font-semibold uppercase">
                    <th className="p-3 border-r border-border">TXN ID</th>
                    <th className="p-3 border-r border-border">LANE BOUND</th>
                    <th className="p-3 border-r border-border">CUSTOMER / PET</th>
                    <th className="p-3 border-r border-border">AUTHENTICATION</th>
                    <th className="p-3 border-r border-border text-right">AMOUNT</th>
                    <th className="p-3 text-center">RECEIPT COMMAND</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-medium">
                  {paymentsList.filter(p => p.method === 'CREDIT_CARD' || p.method === 'CASH').map(p => (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 border-r border-border font-semibold">{p.id}</td>
                      <td className="p-3 border-r border-border font-semibold text-muted-foreground">{p.details.split('#')[1] || 'L1-MAIN-DESK'}</td>
                      <td className="p-3 border-r border-border">
                        <div className="font-semibold">{p.customer}</div>
                        <div className="text-[10px] text-muted-foreground/70">{p.pet}</div>
                      </td>
                      <td className="p-3 border-r border-border text-muted-foreground font-semibold">EMV_CHIP_VERIFIED // PIN_PASS</td>
                      <td className="p-3 border-r border-border text-right font-semibold">${p.amount.toFixed(2)}</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => alert(`Spooling POS thermal printer spool to hardware port 9100... Printing receipt for transaction ${p.id}.`)}
                          className="bg-black hover:bg-muted text-white border border-border px-3 py-1 text-[11px] text-muted-foreground font-semibold rounded-md cursor-pointer"
                        >
                          PRINT ESC/POS RECEIPT
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW CONTENT: ECOMMERCE GATEWAY */}
      {activeSubView === 'ecommerce' && (
        <div className="animate-fade-in p-6 space-y-6 bg-muted/30 min-h-[500px]">
          {/* SEC GATEWAY TELEMETRY */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-card border border-border p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-[12px] font-semibold text-foreground uppercase">STRIPE API WEBHOOK INTAKE FEED</span>
                <span className="text-[9px] bg-primary text-primary-foreground px-1.5 py-0.5 tabular-nums font-semibold animate-pulse">LIVE NODE</span>
              </div>
              <div className="bg-card text-success p-4 h-[250px] overflow-y-auto text-[11px] space-y-1.5 rounded-md border border-border">
                <div>[2025-05-12 14:21:05] SECURE mTLS HANDSHAKE ESTABLISHED - ip=3.18.12.112</div>
                <div>[2025-05-12 14:21:06] event_type=charge.succeeded status=api_authorized</div>
                <div>[2025-05-12 14:21:06] txn_amount=14500 currency=usd signature_check=AES-256-GCM-OK</div>
                <div>[2025-05-12 14:21:07] clearinghouse_state=funds_deposited bank_node_id=PLD_CHKH_911</div>
                <div className="text-white font-semibold">&gt;&gt; Live webhook monitor idle. Waiting on web storefront checkout...</div>
              </div>
            </div>

            <div className="bg-card border border-border p-4 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground/70 uppercase">PLAID BANKING NETWORK</span>
                <div className="border border-border p-3 mt-4 flex items-center justify-between bg-muted/30">
                  <span className="text-[12px] font-semibold">CHASE COMMERCIAL</span>
                  <span className="text-success text-[10px] font-semibold uppercase">LINKED</span>
                </div>
                <div className="border border-border p-3 mt-2 flex items-center justify-between bg-muted/30">
                  <span className="text-[12px] font-semibold">GATEWAY DAILY SWEEPS</span>
                  <span className="text-foreground text-[10px] font-semibold uppercase">AUTOMATIC (00:00)</span>
                </div>
              </div>
              <div className="text-[10px] text-muted-foreground/70 leading-relaxed border-t border-border pt-3">
                All digital storefront invoices accrue automatically and are swept straight into primary clearing checking cash.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW CONTENT: CASH & REGISTER TILL */}
      {activeSubView === 'cash' && (
        <div className="animate-fade-in p-6 space-y-6 bg-muted/30 min-h-[500px]">
          {/* DENOMINATIONS ROW & CALCULATOR */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* CALCULATOR PANEL */}
            <div className="lg:col-span-2 bg-card border border-border p-6 space-y-6">
              <div className="border-b border-border pb-2 flex items-center justify-between">
                <span className="text-[12px] font-semibold uppercase text-foreground">INTERACTIVE DENOMINATION TILL COUNT</span>
                <Calculator className="w-4 h-4 text-muted-foreground/70" />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-[12px]">
                {/* BILLS INPUTS */}
                <div className="space-y-2">
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground/70 block border-b border-border pb-1">PAPER BILLS</span>
                  <div className="flex items-center justify-between">
                    <span>$100 Bills:</span>
                    <input
                      type="number"
                      value={cashCalc.hundreds}
                      onChange={(e) => setCashCalc(prev => ({ ...prev, hundreds: parseInt(e.target.value) || 0 }))}
                      className="w-20 bg-card border border-border p-1 text-right text-foreground tabular-nums"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>$50 Bills:</span>
                    <input
                      type="number"
                      value={cashCalc.fifties}
                      onChange={(e) => setCashCalc(prev => ({ ...prev, fifties: parseInt(e.target.value) || 0 }))}
                      className="w-20 bg-card border border-border p-1 text-right text-foreground tabular-nums"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>$20 Bills:</span>
                    <input
                      type="number"
                      value={cashCalc.twenties}
                      onChange={(e) => setCashCalc(prev => ({ ...prev, twenties: parseInt(e.target.value) || 0 }))}
                      className="w-20 bg-card border border-border p-1 text-right text-foreground tabular-nums"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>$10 Bills:</span>
                    <input
                      type="number"
                      value={cashCalc.tens}
                      onChange={(e) => setCashCalc(prev => ({ ...prev, tens: parseInt(e.target.value) || 0 }))}
                      className="w-20 bg-card border border-border p-1 text-right text-foreground tabular-nums"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>$5 Bills:</span>
                    <input
                      type="number"
                      value={cashCalc.fives}
                      onChange={(e) => setCashCalc(prev => ({ ...prev, fives: parseInt(e.target.value) || 0 }))}
                      className="w-20 bg-card border border-border p-1 text-right text-foreground tabular-nums"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>$1 Bills:</span>
                    <input
                      type="number"
                      value={cashCalc.ones}
                      onChange={(e) => setCashCalc(prev => ({ ...prev, ones: parseInt(e.target.value) || 0 }))}
                      className="w-20 bg-card border border-border p-1 text-right text-foreground tabular-nums"
                    />
                  </div>
                </div>

                {/* COINS INPUTS */}
                <div className="space-y-2">
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground/70 block border-b border-border pb-1">METAL COINS</span>
                  <div className="flex items-center justify-between">
                    <span>Quarters (25¢):</span>
                    <input
                      type="number"
                      value={cashCalc.quarters}
                      onChange={(e) => setCashCalc(prev => ({ ...prev, quarters: parseInt(e.target.value) || 0 }))}
                      className="w-20 bg-card border border-border p-1 text-right text-foreground tabular-nums"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Dimes (10¢):</span>
                    <input
                      type="number"
                      value={cashCalc.dimes}
                      onChange={(e) => setCashCalc(prev => ({ ...prev, dimes: parseInt(e.target.value) || 0 }))}
                      className="w-20 bg-card border border-border p-1 text-right text-foreground tabular-nums"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Nickels (5¢):</span>
                    <input
                      type="number"
                      value={cashCalc.nickels}
                      onChange={(e) => setCashCalc(prev => ({ ...prev, nickels: parseInt(e.target.value) || 0 }))}
                      className="w-20 bg-card border border-border p-1 text-right text-foreground tabular-nums"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Pennies (1¢):</span>
                    <input
                      type="number"
                      value={cashCalc.pennies}
                      onChange={(e) => setCashCalc(prev => ({ ...prev, pennies: parseInt(e.target.value) || 0 }))}
                      className="w-20 bg-card border border-border p-1 text-right text-foreground tabular-nums"
                    />
                  </div>

                  <div className="pt-6 border-t border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-muted-foreground/70 text-[10px]">Opening Float:</span>
                      <input
                        type="number"
                        value={cashCalc.openingFloat}
                        onChange={(e) => setCashCalc(prev => ({ ...prev, openingFloat: parseFloat(e.target.value) || 0 }))}
                        className="w-20 bg-card border border-border p-1 text-right text-foreground tabular-nums"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-muted-foreground/70 text-[10px]">Expected Inflow:</span>
                      <input
                        type="number"
                        value={cashCalc.expectedInflow}
                        onChange={(e) => setCashCalc(prev => ({ ...prev, expectedInflow: parseFloat(e.target.value) || 0 }))}
                        className="w-20 bg-card border border-border p-1 text-right text-foreground tabular-nums"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AUDIT SUMMARY & RECONCILIATION */}
            <div className="bg-card border border-border p-6 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <span className="text-[11px] font-semibold text-muted-foreground/70 uppercase">TILL AUDITING REPORT</span>
                <div className="divide-y divide-neutral-200 text-[12px] pt-2">
                  <div className="py-2.5 flex justify-between">
                    <span>Counted Till Total:</span>
                    <strong className="text-foreground font-semibold">${countedTill.toFixed(2)}</strong>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span>Expected Total:</span>
                    <strong className="text-foreground font-semibold">${totalExpected.toFixed(2)}</strong>
                  </div>
                  <div className="py-2.5 flex justify-between bg-muted/30 p-2">
                    <span>Variance (Drift):</span>
                    <strong className={`font-semibold ${variance === 0 ? 'text-success' : variance > 0 ? 'text-success' : 'text-destructive'}`}>
                      {variance === 0 ? '$0.00' : `${variance > 0 ? '+' : ''}$${variance.toFixed(2)}`}
                    </strong>
                  </div>
                </div>

                {variance === 0 ? (
                  <div className="bg-success/10 border border-success/20 p-3 text-[11px] text-success font-semibold uppercase text-center">
                    TILL IS PERFECTLY BALANCED
                  </div>
                ) : (
                  <div className="bg-warning/10 border border-warning/20 p-3 text-[11px] text-warning font-semibold uppercase text-center leading-relaxed">
                    TILL VARIANCE: {variance > 0 ? 'SURPLUS' : 'DEFICIT'} DETECTED.<br />DISCREPANCY PENDING SUPERVISOR OVERRIDE.
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  const supervisorCode = prompt('Enter supervisor override PIN to authorize shift close:');
                  if (supervisorCode) {
                    alert('Shift till audit cleared. Register log committed to books.');
                  }
                }}
                className="bg-primary text-primary-foreground hover:bg-primary/90 border border-border py-2 text-[12px] uppercase font-semibold tracking-wider transition-colors cursor-pointer rounded-md w-full"
              >
                COMMIT TILL AUDIT &amp; CLOSE SHIFT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW CONTENT: PENDING AUTHORIZATIONS */}
      {activeSubView === 'pending' && (
        <div className="animate-fade-in p-6 space-y-6 bg-muted/30 min-h-[500px]">
          {/* STRIPE RADAR CARD */}
          <div className="bg-card border border-border p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div>
                <span className="font-medium text-[11px] uppercase tracking-wider text-muted-foreground">Escrow Reservations</span>
                <h3 className="font-display text-sm font-semibold tracking-tight text-foreground mt-1">Stripe Radar Fraud Risk Evaluation</h3>
              </div>
              <Shield className="w-5 h-5 text-muted-foreground/70" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px] text-foreground border-collapse">
                <thead>
                  <tr className="bg-muted/30 border-b border-border font-semibold uppercase">
                    <th className="p-3 border-r border-border">AUTH ID</th>
                    <th className="p-3 border-r border-border">CLIENT ACCOUNT</th>
                    <th className="p-3 border-r border-border text-right">PRE-AUTH AMT</th>
                    <th className="p-3 border-r border-border text-center">FRAUD SCORE</th>
                    <th className="p-3 border-r border-border">AVS ZIP STATUS</th>
                    <th className="p-3 border-r border-border text-center">CAPTURE EXPRIY</th>
                    <th className="p-3 text-center">HOLD ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  <tr>
                    <td className="p-3 border-r border-border font-semibold text-muted-foreground/70">ATH-4091</td>
                    <td className="p-3 border-r border-border font-semibold">Robert Plant</td>
                    <td className="p-3 border-r border-border text-right font-semibold">$165.00</td>
                    <td className="p-3 border-r border-border text-center">
                      <span className="bg-success/10 text-success text-[10px] font-semibold px-1.5 py-0.2 border border-success/20">
                        12 (LOW RISK)
                      </span>
                    </td>
                    <td className="p-3 border-r border-border text-success font-semibold">MATCHED (OK)</td>
                    <td className="p-3 border-r border-border text-center text-muted-foreground">2 Days Left</td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => {
                          setPaymentsList(prev => prev.map(p => p.id === 'TXN-9025' ? { ...p, status: 'PAID' } : p));
                          alert('Success: Pre-authorized hold funds captured and processed.');
                        }}
                        className="bg-black hover:bg-muted text-white border border-border px-3 py-1 text-[11px] text-muted-foreground font-semibold rounded-md cursor-pointer"
                      >
                        CAPTURE FUNDS
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW CONTENT: TERMINAL FLEET MANAGER */}
      {activeSubView === 'fleet' && (
        <div className="animate-fade-in p-6 space-y-6 bg-muted/30 min-h-[500px]">
          {/* TERMINAL STATUS DIAGNOSTICS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-card border border-border p-4 space-y-4">
              <div className="bg-muted/40 border-b border-border p-3 tabular-nums font-semibold text-[13px] uppercase text-foreground">
                ACTIVE SMART TERMINAL HEARTBEATS
              </div>
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-[13px] text-foreground border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 font-semibold uppercase">
                      <th className="p-3 border-r border-border">TERMINAL MODEL</th>
                      <th className="p-3 border-r border-border">SERIAL NUMBER</th>
                      <th className="p-3 border-r border-border">RSSI / SIGNAL</th>
                      <th className="p-3 border-r border-border">CONNECTION</th>
                      <th className="p-3 text-center">HARDWARE DIAGNOSTIC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-medium">
                    <tr>
                      <td className="p-3 border-r border-border">PAX-A920 (Lane 1)</td>
                      <td className="p-3 border-r border-border font-semibold text-muted-foreground/70">SN-4921-901-PAX</td>
                      <td className="p-3 border-r border-border text-success font-semibold">-48dBm (Excellent)</td>
                      <td className="p-3 border-r border-border text-success font-semibold">PoE ETH</td>
                      <td className="p-3 text-center">
                        <span className="bg-success/10 border border-success/20 text-success text-[10px] font-semibold px-2 py-0.5 uppercase">
                          ONLINE / ACTIVE
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 border-r border-border">S700 (Boutique)</td>
                      <td className="p-3 border-r border-border font-semibold text-muted-foreground/70">SN-8201-445-S700</td>
                      <td className="p-3 border-r border-border text-success font-semibold">-52dBm (Good)</td>
                      <td className="p-3 border-r border-border text-success font-semibold">WI-FI (2.4Ghz)</td>
                      <td className="p-3 text-center">
                        <span className="bg-success/10 border border-success/20 text-success text-[10px] font-semibold px-2 py-0.5 uppercase">
                          ONLINE / IDLE
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 border-r border-border">PAX-A920 (Mobile Van)</td>
                      <td className="p-3 border-r border-border font-semibold text-muted-foreground/70">SN-4922-108-PAX</td>
                      <td className="p-3 border-r border-border text-warning font-semibold">-74dBm (Weak)</td>
                      <td className="p-3 border-r border-border text-warning font-semibold">LTE CELULAR</td>
                      <td className="p-3 text-center">
                        <span className="bg-warning/10 border border-warning/20 text-warning text-[10px] font-semibold px-2 py-0.5 uppercase">
                          LOW_PAPER_WARN
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* SERIAL CONSOLE MONITOR */}
            <div className="lg:col-span-4 bg-black text-success text-[12px] border border-border flex flex-col h-[300px]">
              <div className="bg-card border-b border-border p-3 flex items-center gap-2 text-[10px] font-semibold text-white uppercase tracking-wider">
                <Terminal className="w-3.5 h-3.5 text-muted-foreground/70" />
                <span>TERMINAL SERIAL PORT BUS LOG</span>
              </div>
              <div className="flex-1 p-4 overflow-y-auto space-y-1.5 custom-scrollbar select-text">
                {fleetTerminalLogs.map((log, idx) => (
                  <div key={idx} className={log.startsWith('PAWZ://') ? 'text-white' : 'text-success'}>
                    {log}
                  </div>
                ))}
              </div>
              <form onSubmit={handleFleetCommandSubmit} className="border-t border-border flex bg-card">
                <span className="p-3 text-success select-none font-semibold">BUS://</span>
                <input
                  type="text"
                  value={fleetCmd}
                  onChange={(e) => setFleetCmd(e.target.value)}
                  className="flex-1 bg-transparent p-3 text-white placeholder:text-foreground outline-none border-none text-[12px]"
                  placeholder="Commands: :PING, :DRAWER_KICK..."
                />
              </form>
            </div>
          </div>
        </div>
      )}

      {/* VIEW CONTENT: CHECKOUTS QUEUE */}
      {activeSubView === 'checkouts' && (
        <div className="animate-fade-in p-6 bg-card space-y-6">
          <div className="border border-border">
            <div className="bg-muted/40 border-b border-border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-sm font-semibold tracking-tight text-foreground">In-Service Pending Checkout Bundles</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">FIFO Automatic Queue — Waiting on Point of Sale Intake</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">FILTER BY GROOMER:</span>
                <select
                  value={checkoutGroomerFilter}
                  onChange={(e) => setCheckoutGroomerFilter(e.target.value)}
                  className="bg-card border border-border px-2 py-1 text-[13px] text-foreground focus:outline-none cursor-pointer rounded-md animate-none"
                >
                  <option value="ALL">ALL GROOMERS</option>
                  <option value="Sarah M.">Sarah M.</option>
                  <option value="Jessica L.">Jessica L.</option>
                  <option value="Mike R.">Mike R.</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full border-collapse text-left text-[13px] text-foreground">
                <thead>
                  <tr className="border-b border-border bg-muted/30 font-semibold uppercase">
                    <th className="p-3 border-r border-border">APPOINTMENT ID</th>
                    <th className="p-3 border-r border-border">CUSTOMER / PET</th>
                    <th className="p-3 border-r border-border">SERVICE CLASSIFICATION</th>
                    <th className="p-3 border-r border-border">GROOMER</th>
                    <th className="p-3 border-r border-border text-right">PRICE</th>
                    <th className="p-3 border-r border-border text-right">COMMISSION</th>
                    <th className="p-3 border-r border-border text-right">TIPS</th>
                    <th className="p-3 border-r border-border text-right">TOTAL BILLABLE</th>
                    <th className="p-3 border-r border-border text-center">STATUS</th>
                    <th className="p-3 text-center">COMMAND</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-medium">
                  {filteredCheckouts.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 border-r border-border font-semibold">{c.id}</td>
                      <td className="p-3 border-r border-border">
                        <div className="font-semibold">{c.customer}</div>
                        <div className="text-[10px] text-muted-foreground/70">{c.pet}</div>
                      </td>
                      <td className="p-3 border-r border-border">{c.type}</td>
                      <td className="p-3 border-r border-border font-semibold">{c.groomer}</td>
                      <td className="p-3 border-r border-border text-right">${c.price.toFixed(2)}</td>
                      <td className="p-3 border-r border-border text-right tabular-nums text-muted-foreground">{c.commissionRate}</td>
                      <td className="p-3 border-r border-border text-right text-foreground font-semibold">${c.tips.toFixed(2)}</td>
                      <td className="p-3 border-r border-border text-right font-semibold text-foreground">{c.billable}</td>
                      <td className="p-3 border-r border-border text-center">
                        <span className={`text-[9px] font-semibold border px-2 py-0.5 uppercase tracking-wider ${
                          c.status === 'COMPLETED' ? 'bg-muted/40 border-border text-muted-foreground' : 'bg-destructive/5 border-destructive/20 text-destructive animate-pulse'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {c.status === 'AWAITING_PAYMENT' ? (
                          <button
                            onClick={() => handleCheckoutAction(c.id, 'COLLECT_NOW')}
                            className="bg-black hover:bg-muted text-white border border-border px-3 py-1 text-[11px] text-muted-foreground font-semibold tracking-wider rounded-md cursor-pointer"
                          >
                            SWIPE &amp; CHECKOUT
                          </button>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/70 tabular-nums">SETTLED</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="p-3 bg-muted/30 border-t border-border text-[13px] tabular-nums text-muted-foreground">
              Checkout terminals auto-bound to mobile grooming van GPS telemetry triggers.
            </div>
          </div>
        </div>
      )}

      {/* VIEW CONTENT: EXPENSES & OUTFLOWS */}
      {activeSubView === 'register' && (
        <div className="animate-fade-in p-6 bg-card space-y-6">
          <div className="border border-border">
            {/* SUB-TABS under register */}
            <div className="bg-muted/30 border-b border-border flex overflow-x-auto">
              <button
                onClick={() => setRegisterTab('bills')}
                className={`px-5 py-3 text-[12px] uppercase border-r border-border flex items-center gap-2 cursor-pointer ${
                  registerTab === 'bills' ? 'bg-primary text-primary-foreground font-semibold' : 'bg-transparent text-foreground hover:bg-muted/40'
                }`}
              >
                01. BILLS &amp; PAYABLES
              </button>
              <button
                onClick={() => {
                  setRegisterTab('vendors');
                  alert('Opening Supplier Profile Registries... 12 Suppliers Online.');
                }}
                className={`px-5 py-3 text-[12px] uppercase border-r border-border flex items-center gap-2 cursor-pointer ${
                  registerTab === 'vendors' ? 'bg-primary text-primary-foreground font-semibold' : 'bg-transparent text-foreground hover:bg-muted/40'
                }`}
              >
                02. SUPPLIERS &amp; VENDORS
              </button>
              <button
                onClick={() => {
                  setRegisterTab('po');
                  alert('Opening Purchase Orders Subsystem...');
                }}
                className={`px-5 py-3 text-[12px] uppercase border-r border-border flex items-center gap-2 cursor-pointer ${
                  registerTab === 'po' ? 'bg-primary text-primary-foreground font-semibold' : 'bg-transparent text-foreground hover:bg-muted/40'
                }`}
              >
                03. PRODUCTS &amp; INVENTORY POs
              </button>
            </div>

            {/* BILLS GRID */}
            <div className="p-4 bg-muted/30 border-b border-border flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:max-w-md">
                <span className="text-[11px] font-semibold absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">FILTER //</span>
                <input
                  value={registerSearch}
                  onChange={(e) => setRegisterSearch(e.target.value)}
                  className="w-full bg-card border border-border pl-20 pr-3 py-1.5 text-[13px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
                  placeholder="VENDOR, BILL ID, CATEGORY..."
                  type="text"
                />
              </div>
              <button
                onClick={() => {
                  const sName = prompt('Enter vendor/supplier name:');
                  if (sName) {
                    const amtStr = prompt('Enter gross amount ($USD):', '100.00');
                    const amt = parseFloat(amtStr || '100');
                    const newBillId = `BILL-N`;
                    setBillsList(prev => [
                      {
                        id: newBillId,
                        ref: 'REF: #NEW_INTAKE',
                        supplier: sName.toUpperCase(),
                        dueDate: '2025-06-01',
                        category: 'SALON GENERAL',
                        gross: amt,
                        tax: amt * 0.08,
                        net: amt * 1.08,
                        status: 'PENDING_APPROVAL',
                        auditRef: 'AUDIT: GEN_9001'
                      },
                      ...prev
                    ]);
                    alert(`Intake recorded for bill ${newBillId} from ${sName}! Pending compliance audit.`);
                  }
                }}
                className="bg-primary text-primary-foreground hover:bg-primary/90 border border-border px-4 py-1.5 text-[12px] uppercase tracking-wider font-semibold transition-colors cursor-pointer rounded-md"
              >
                + RECORD INCOMING BILL
              </button>
            </div>

            {/* BILLS TABLE */}
            <div className="overflow-x-auto w-full">
              <table className="w-full border-collapse text-left text-[13px] text-foreground">
                <thead>
                  <tr className="border-b border-border bg-card font-semibold uppercase">
                    <th className="p-3 border-r border-border">BILL ID // REF</th>
                    <th className="p-3 border-r border-border">SUPPLIER // VENDOR</th>
                    <th className="p-3 border-r border-border">DUE DATE</th>
                    <th className="p-3 border-r border-border">ALLOCATION CATEGORY</th>
                    <th className="p-3 border-r border-border text-right">GROSS AMT</th>
                    <th className="p-3 border-r border-border text-right">TAX</th>
                    <th className="p-3 border-r border-border text-right">NET OUTFLOW</th>
                    <th className="p-3 border-r border-border text-center">STATUS</th>
                    <th className="p-3 text-center">COMMAND</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-medium bg-card">
                  {filteredBills.map((b) => (
                    <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 border-r border-border">
                        <div className="font-semibold">{b.id}</div>
                        <div className="text-[10px] text-muted-foreground/70">{b.ref}</div>
                      </td>
                      <td className="p-3 border-r border-border font-semibold uppercase">{b.supplier}</td>
                      <td className="p-3 border-r border-border tabular-nums text-muted-foreground">{b.dueDate}</td>
                      <td className="p-3 border-r border-border font-semibold text-foreground">{b.category}</td>
                      <td className="p-3 border-r border-border text-right font-semibold">${b.gross.toFixed(2)}</td>
                      <td className="p-3 border-r border-border text-right text-muted-foreground/70">${b.tax.toFixed(2)}</td>
                      <td className="p-3 border-r border-border text-right font-semibold text-foreground">${b.net.toFixed(2)}</td>
                      <td className="p-3 border-r border-border text-center">
                        <span className={`text-[9px] font-semibold border px-2 py-0.5 uppercase tracking-wider ${
                          b.status === 'SETTLED' ? 'bg-muted/40 text-muted-foreground border-border' :
                          b.status === 'APPROVED' ? 'bg-card border-border text-foreground' :
                          'bg-warning/10 border-warning/20 text-warning animate-pulse'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {b.status === 'PENDING_APPROVAL' && (
                          <button
                            onClick={() => handleBillAction(b.id, 'APPROVE')}
                            className="bg-black hover:bg-muted text-white border border-border px-2.5 py-0.5 text-[11px] text-muted-foreground font-semibold cursor-pointer rounded-md"
                          >
                            APPROVE
                          </button>
                        )}
                        {b.status === 'APPROVED' && (
                          <button
                            onClick={() => handleBillAction(b.id, 'PAY_NOW')}
                            className="bg-card hover:bg-black hover:text-white text-foreground border border-border px-2.5 py-0.5 text-[11px] text-muted-foreground font-semibold cursor-pointer rounded-md transition-colors"
                          >
                            DISBURSE FUNDS
                          </button>
                        )}
                        {b.status === 'SETTLED' && (
                          <span className="text-[10px] text-muted-foreground/70 tabular-nums">COMPLIANT</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
