'use client';

import React, { useState } from 'react';
import { DawgNavSection } from '@/lib/types';
import { PageHeader, PageTabs, KpiTiles, FilterSelect } from '../_shared/PageHeader';
import { cn } from '@/lib/utils';

interface DepositsViewProps {
  onNavigateSection?: (section: DawgNavSection) => void;
}

export const DepositsView: React.FC<DepositsViewProps> = ({ onNavigateSection }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'held' | 'applied' | 'released' | 'forfeited' | 'refunded'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [rangeFilter, setRangeFilter] = useState('Current Week (May 12 - 18, 2025)');
  const [showCollectModal, setShowCollectModal] = useState(false);

  const initialDeposits = [
    {
      id: 'DEP-0456-A',
      customer: 'Evelyn Vance',
      phone: '+1 (555) 201-9981',
      pet: 'Max Doodle',
      breed: 'Golden Doodle',
      service: 'SVC: FULL GROOM [PKG-01]',
      amount: 50.00,
      collectedDate: '2025-05-10',
      collectedTime: '09:14:22 UTC',
      targetApptDate: 'May 16, 2025',
      targetApptTime: '10:30 AM // STATION 02',
      method: 'CARD •••• 1111',
      auth: 'AUTH: TXN_88129',
      status: 'HELD'
    },
    {
      id: 'DEP-0457-B',
      customer: 'Marcus Chen',
      phone: '+1 (555) 304-4112',
      pet: 'Bella Shih Tzu',
      breed: 'Shih Tzu',
      service: 'SVC: BATH & BRUSH [PKG-04]',
      amount: 25.00,
      collectedDate: '2025-05-11',
      collectedTime: '14:02:11 UTC',
      targetApptDate: 'May 16, 2025',
      targetApptTime: '01:00 PM // STATION 01',
      method: 'APPLE PAY',
      auth: 'AUTH: TXN_99104',
      status: 'HELD'
    },
    {
      id: 'DEP-0442-X',
      customer: 'Cassandra Frost',
      phone: '+1 (555) 890-3444',
      pet: 'Thor Rottweiler',
      breed: 'Rottweiler',
      service: 'SVC: DE-SHEDDING SPA',
      amount: 75.00,
      collectedDate: '2025-05-08',
      collectedTime: '11:15:40 UTC',
      targetApptDate: 'May 14, 2025',
      targetApptTime: '09:00 AM // COMPLETED',
      method: 'CARD •••• 9920',
      auth: 'AUTH: TXN_77401',
      status: 'APPLIED'
    },
    {
      id: 'DEP-0439-K',
      customer: 'Devon Brooks',
      phone: '+1 (555) 441-2090',
      pet: 'Kona Husky',
      breed: 'Husky',
      service: 'SVC: EXPRESS GROOM',
      amount: 50.00,
      collectedDate: '2025-05-06',
      collectedTime: '16:49:02 UTC',
      targetApptDate: 'May 13, 2025',
      targetApptTime: '02:30 PM // NO-SHOW',
      method: 'CARD •••• 4018',
      auth: 'AUTH: TXN_66311',
      status: 'FORFEITED'
    },
    {
      id: 'DEP-0430-P',
      customer: 'Sophia Lindqvist',
      phone: '+1 (555) 773-1289',
      pet: 'Pixel Maltipoo',
      breed: 'Maltipoo',
      service: 'SVC: TEETH CLEAN + BATH',
      amount: 40.00,
      collectedDate: '2025-05-04',
      collectedTime: '10:04:19 UTC',
      targetApptDate: 'May 11, 2025',
      targetApptTime: '11:00 AM // CANCELLED >48H',
      method: 'CARD •••• 5590',
      auth: 'AUTH: TXN_55102',
      status: 'RELEASED'
    },
    {
      id: 'DEP-0460-Z',
      customer: 'Julian Alvarez',
      phone: '+1 (555) 670-8821',
      pet: 'Rocky Boxer',
      breed: 'Boxer',
      service: 'SVC: FULL GROOM + DESHED',
      amount: 100.00,
      collectedDate: '2025-05-12',
      collectedTime: '08:22:15 UTC',
      targetApptDate: 'May 17, 2025',
      targetApptTime: '03:30 PM // STATION 03',
      method: 'APPLE PAY',
      auth: 'AUTH: TXN_31980',
      status: 'HELD'
    }
  ];

  const [depositsList, setDepositsList] = useState(initialDeposits);

  const filteredDeposits = depositsList.filter((dep) => {
    // Tab filter
    if (activeTab === 'held' && dep.status !== 'HELD') return false;
    if (activeTab === 'applied' && dep.status !== 'APPLIED') return false;
    if (activeTab === 'released' && dep.status !== 'RELEASED') return false;
    if (activeTab === 'forfeited' && dep.status !== 'FORFEITED') return false;
    if (activeTab === 'refunded' && dep.status !== 'REFUNDED') return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        dep.id.toLowerCase().includes(q) ||
        dep.customer.toLowerCase().includes(q) ||
        dep.pet.toLowerCase().includes(q) ||
        dep.phone.toLowerCase().includes(q) ||
        dep.service.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const handleActionChange = (id: string, action: string) => {
    if (!action || action.includes('ACTION')) return;

    setDepositsList(prev => prev.map(dep => {
      if (dep.id === id) {
        if (action === 'APPLY TO BALANCE') {
          alert(`Applied ${dep.id} balance of $${dep.amount.toFixed(2)} to invoice!`);
          return { ...dep, status: 'APPLIED' };
        } else if (action === 'RELEASE / REFUND') {
          alert(`Released / Refunded deposit ${dep.id} of $${dep.amount.toFixed(2)}.`);
          return { ...dep, status: 'RELEASED' };
        } else if (action === 'FORFEIT TO REVENUE') {
          alert(`Forfeited deposit ${dep.id} of $${dep.amount.toFixed(2)} to cancellation revenue.`);
          return { ...dep, status: 'FORFEITED' };
        }
      }
      return dep;
    }));
  };

  return (
    <div className="flex flex-col w-full text-foreground bg-background select-text">
      {/* STATUS STRIP */}
      <div className="w-full bg-muted/60 border-b border-border px-4 py-2 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-success animate-pulse shrink-0"></span>
          <span className="font-medium text-[11px] text-muted-foreground">Deposit Management</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="font-medium">Ledger State: <span className="text-success font-semibold">Balanced</span> <span className="text-muted-foreground/60">(Audit OK)</span></span>
        </div>
      </div>

      {/* SUB NAVIGATION TABS */}
      <PageTabs
        activeId={activeTab}
        onSelect={(id) => setActiveTab(id as typeof activeTab)}
        tabs={[
          { id: 'all', label: 'Deposits Dashboard' },
          { id: 'held', label: 'Held / Active', count: 38 },
          { id: 'applied', label: 'Applied to Invoice' },
          { id: 'released', label: 'Released' },
          { id: 'forfeited', label: 'Forfeited / Late Cancel', count: 4 },
        ]}
      />

      {/* KPI TILES */}
      <div className="p-6 border-b border-border">
        <KpiTiles
          tiles={[
            {
              label: 'Total Active Deposits',
              value: '$6,780.00',
              caption: 'Escrow balance across all held deposits',
              tone: 'primary',
            },
            {
              label: 'Held for Upcoming (48h)',
              value: '$2,340.00',
              caption: 'Pre-appointment escrow holds',
              tone: 'warning',
            },
            {
              label: 'Applied This Month',
              value: '$3,120.00',
              caption: 'MTD deposits applied to invoices',
              tone: 'success',
            },
            {
              label: 'Forfeited / Late Cancel',
              value: '$420.00',
              caption: 'Penalty revenue from no-shows',
              tone: 'destructive',
            },
          ]}
        />
      </div>

      {/* FILTER & CONTROL BAR */}
      <div className="p-4 bg-muted/30 border-b border-border">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1 sm:max-w-md">
              <svg className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.39l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
              </svg>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-background border border-input rounded-md pl-9 pr-3 h-9 text-[13px] text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring transition-colors"
                placeholder="Search dep ID, customer, pet breed..."
                type="text"
              />
            </div>
            <FilterSelect
              aria-label="Filter by appointment range"
              value={rangeFilter}
              onChange={(v) => setRangeFilter(v)}
            >
              <option>Current Week (May 12 - 18, 2025)</option>
              <option>Next 7 Days</option>
              <option>Next 30 Days</option>
              <option>Historical / Archive</option>
            </FilterSelect>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowCollectModal(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3.5 text-[13px] font-medium shadow-card transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <span>Collect Deposit</span>
            </button>
            <button
              onClick={() => alert('Batch applying selected deposits to active invoices...')}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background hover:bg-accent hover:text-accent-foreground text-foreground h-9 px-3.5 text-[13px] font-medium transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <span>Apply to Invoice</span>
            </button>
          </div>
        </div>
      </div>

      {/* MAIN DATA TABLE REGISTRY */}
      <div className="p-4 bg-background">
        <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
          <div className="bg-muted/40 border-b border-border px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium text-[11px] text-muted-foreground uppercase tracking-wider">Escrow Transaction Registry</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-success/10 text-success border border-success/20">Live</span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              Showing <span className="font-semibold text-foreground tabular-nums">{filteredDeposits.length}</span> records · Total escrow: <span className="font-semibold text-primary tabular-nums">${(filteredDeposits.reduce((acc, curr) => acc + (curr.status === 'HELD' ? curr.amount : 0), 0)).toFixed(2)}</span>
            </div>
          </div>
          <div className="overflow-x-auto w-full">
            <table className="w-full border-collapse text-left text-[13px] text-foreground">
              <thead>
                <tr className="border-b border-border bg-muted/30 font-semibold uppercase text-[11px] tracking-wider text-muted-foreground">
                  <th className="p-3 border-r border-border font-semibold">ID / Ref</th>
                  <th className="p-3 border-r border-border font-semibold">Customer / Contact</th>
                  <th className="p-3 border-r border-border font-semibold">Pet &amp; Service</th>
                  <th className="p-3 border-r border-border text-right font-semibold">Amount</th>
                  <th className="p-3 border-r border-border font-semibold">Collected</th>
                  <th className="p-3 border-r border-border font-semibold">Target Apt</th>
                  <th className="p-3 border-r border-border font-semibold">Pay Method</th>
                  <th className="p-3 border-r border-border font-semibold">Status</th>
                  <th className="p-3 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {filteredDeposits.map((dep) => (
                  <tr key={dep.id} className="hover:bg-accent/50 transition-colors">
                    <td className="p-3 border-r border-border font-semibold tabular-nums">{dep.id}</td>
                    <td className="p-3 border-r border-border">
                      <div className="font-medium text-foreground">{dep.customer}</div>
                      <div className="text-[10px] text-muted-foreground tabular-nums">{dep.phone}</div>
                    </td>
                    <td className="p-3 border-r border-border">
                      <div className="font-medium text-foreground">{dep.pet}</div>
                      <div className="text-[10px] text-muted-foreground">{dep.service}</div>
                    </td>
                    <td className="p-3 border-r border-border text-right font-semibold tabular-nums text-foreground">${dep.amount.toFixed(2)}</td>
                    <td className="p-3 border-r border-border">
                      <div className="text-foreground">{dep.collectedDate}</div>
                      <div className="text-[10px] text-muted-foreground tabular-nums">{dep.collectedTime}</div>
                    </td>
                    <td className="p-3 border-r border-border">
                      <div className="font-medium text-foreground">{dep.targetApptDate}</div>
                      <div className="text-[10px] text-muted-foreground tabular-nums">{dep.targetApptTime}</div>
                    </td>
                    <td className="p-3 border-r border-border">
                      <div className="font-medium text-foreground">{dep.method}</div>
                      <div className="text-[10px] text-muted-foreground tabular-nums">{dep.auth}</div>
                    </td>
                    <td className="p-3 border-r border-border">
                      <span className={cn(
                        "inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider",
                        dep.status === 'HELD' ? 'bg-warning/10 text-warning border-warning/20' :
                        dep.status === 'APPLIED' ? 'bg-success/10 text-success border-success/20' :
                        dep.status === 'RELEASED' ? 'bg-muted text-muted-foreground border-border' :
                        'bg-destructive/10 text-destructive border-destructive/20'
                      )}>
                        {dep.status === 'HELD' ? 'Held / Active' : dep.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <select
                        onChange={(e) => handleActionChange(dep.id, e.target.value)}
                        className="bg-background text-foreground border border-input hover:border-primary/40 rounded-md h-7 px-2 text-[11px] font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`Actions for deposit ${dep.id}`}
                      >
                        <option>Action: Select</option>
                        {dep.status === 'HELD' && (
                          <>
                            <option>Apply to Balance</option>
                            <option>Release / Refund</option>
                            <option>Forfeit to Revenue</option>
                          </>
                        )}
                        <option>Print Receipt</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-muted/40 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>Page 01 of 01</span>
              <span className="text-muted-foreground/40">|</span>
              <span>System Sync: <span className="text-success font-semibold">Active</span></span>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 h-7 rounded-md border border-border bg-background hover:bg-accent hover:text-accent-foreground text-[11px] font-medium transition-colors cursor-pointer">Prev</button>
              <button className="px-3 h-7 rounded-md bg-primary text-primary-foreground text-[11px] font-medium transition-colors cursor-pointer">01</button>
              <button className="px-3 h-7 rounded-md border border-border bg-background hover:bg-accent hover:text-accent-foreground text-[11px] font-medium transition-colors cursor-pointer">Next</button>
            </div>
          </div>
        </div>
      </div>

      {/* LOWER RULES & POLICIES FOOTER SECTION */}
      <div className="p-4 bg-card border-t border-border">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 border border-border bg-card flex flex-col justify-between">
            <div>
              <div className="bg-muted/40 border-b border-border px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] bg-primary text-primary-foreground px-1.5 py-0.5">CFG</span>
                  <span className="text-[12px] font-semibold text-foreground uppercase">DEPOSIT ESCROW POLICY SETTINGS</span>
                </div>
                <span className="text-[10px] text-muted-foreground">[SEC_ENFORCED]</span>
              </div>
              <div className="p-4 space-y-4 text-[13px] text-foreground">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
                  <div className="max-w-xl">
                    <div className="font-semibold text-foreground text-sm">24-Hour Cancellation Requirement Flag</div>
                    <div className="text-[12px] text-muted-foreground/70 mt-1">
                      Appointments cancelled under 24 hours automatically tag the security escrow deposit as eligibility-forfeited.
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input defaultChecked className="w-4 h-4 rounded-md accent-black border border-border cursor-pointer" type="checkbox" />
                    <span className="tabular-nums font-semibold text-foreground">ENFORCE_24H</span>
                  </label>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
                  <div className="max-w-xl">
                    <div className="font-semibold text-foreground text-sm">Automated Forfeit &amp; Ledger Allocation Rule</div>
                    <div className="text-[12px] text-muted-foreground/70 mt-1">
                      Automatically converts unredeemed deposit amounts to General Salon Forfeit Revenue after appointment window expiration (+60m).
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input defaultChecked className="w-4 h-4 rounded-md accent-black border border-border cursor-pointer" type="checkbox" />
                    <span className="tabular-nums font-semibold text-foreground">AUTO_REVENUE_SWEEP</span>
                  </label>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="max-w-xl">
                    <div className="font-semibold text-foreground text-sm">PCI Card Tokenization &amp; Vaulting</div>
                    <div className="text-[12px] text-muted-foreground/70 mt-1">
                      Retain customer billing instrument cryptographic tokens for remaining balance payment upon appointment completion.
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input defaultChecked className="w-4 h-4 rounded-md accent-black border border-border cursor-pointer" type="checkbox" />
                    <span className="tabular-nums font-semibold text-foreground">VAULT_ENABLED</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="p-3 bg-muted/40 border-t border-border flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground/70">POLICY_VERSION: 2025.2 // LAST UPDATED 03 MAY 2025 BY ROOT</span>
              <button 
                onClick={() => alert('Updated Deposit Escrow Policy Registry!')}
                className="bg-primary text-primary-foreground hover:bg-muted hover:text-foreground border border-border px-4 py-1.5 text-[12px] uppercase tracking-wider transition-colors rounded-md cursor-pointer"
              >
                UPDATE POLICY REGISTRY
              </button>
            </div>
          </div>

          {/* RIGHT COL: AUDIT LOG */}
          <div className="border border-border bg-card flex flex-col justify-between">
            <div>
              <div className="bg-muted/40 border-b border-border px-4 py-2 flex items-center justify-between">
                <span className="text-[12px] font-semibold text-foreground uppercase">AUDIT LOG // DISPUTES</span>
                <span className="text-[10px] text-muted-foreground">REALTIME_EVENT_BUS</span>
              </div>
              <div className="p-4 divide-y divide-border text-[12px] text-foreground">
                <div className="py-2.5">
                  <div className="flex items-center justify-between text-muted-foreground/70 text-[10px]">
                    <span>EVENT #9921</span>
                    <span>13:58:12 UTC</span>
                  </div>
                  <div className="font-semibold text-foreground mt-1">FORFEIT: DEP-0439-K allocated to REV_ACCT_4100 ($50.00)</div>
                </div>
                <div className="py-2.5">
                  <div className="flex items-center justify-between text-muted-foreground/70 text-[10px]">
                    <span>EVENT #9920</span>
                    <span>11:22:04 UTC</span>
                  </div>
                  <div className="font-semibold text-foreground mt-1">APPLIED: DEP-0442-X settled against INV-891 ($75.00)</div>
                </div>
                <div className="py-2.5">
                  <div className="flex items-center justify-between text-muted-foreground/70 text-[10px]">
                    <span>EVENT #9919</span>
                    <span>08:22:15 UTC</span>
                  </div>
                  <div className="font-semibold text-foreground mt-1">INTAKE: DEP-0460-Z collected via ApplePay ($100.00)</div>
                </div>
              </div>
            </div>
            <div className="p-3 bg-muted/40 border-t border-border text-center">
              <button 
                onClick={() => alert('Downloading deposit audit log CSV...')}
                className="text-[12px] font-semibold text-foreground hover:underline uppercase block w-full text-center"
              >
                DOWNLOAD AUDIT MANIFEST (CSV) →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* COLLECT DEPOSIT MODAL */}
      {showCollectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-none z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-card border border-border">
            <div className="bg-muted/40 border-b border-border p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium text-[9px] bg-primary text-primary-foreground px-1.5 py-0.5 uppercase">Escrow Intake</span>
                <span className="font-display text-[13px] font-semibold tracking-tight text-foreground">Collect New Deposit</span>
              </div>
              <button 
                onClick={() => setShowCollectModal(false)}
                className="text-[12px] font-semibold text-foreground hover:bg-black hover:text-white px-2 py-0.5 border border-border cursor-pointer"
              >
                [X]
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1 uppercase">SELECT CUSTOMER &amp; PET RECORD //*</label>
                <select className="w-full bg-card border border-border px-3 py-2 text-[13px] text-foreground focus:outline-none rounded-md">
                  <option>Vance, Evelyn (Max Doodle // Golden Doodle)</option>
                  <option>Chen, Marcus (Bella // Shih Tzu)</option>
                  <option>Alvarez, Julian (Rocky // Boxer)</option>
                  <option>Nakamura, Kenji (Hana // Akita)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1 uppercase">DEPOSIT AMOUNT ($USD) //*</label>
                  <input className="w-full bg-card border border-border px-3 py-2 text-[13px] text-foreground focus:outline-none rounded-md" type="text" defaultValue="50.00" />
                </div>
                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1 uppercase">APPOINTMENT TARGET //*</label>
                  <input className="w-full bg-card border border-border px-3 py-2 text-[13px] text-foreground focus:outline-none rounded-md" type="text" defaultValue="2025-05-20 11:00" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1 uppercase">PAYMENT INTAKE CHANNEL //*</label>
                <div className="grid grid-cols-3 gap-2 text-[11px] font-semibold">
                  <button className="border border-border bg-primary text-primary-foreground p-2 text-center cursor-pointer" type="button">CARD ON FILE</button>
                  <button className="border border-border bg-card text-foreground p-2 text-center hover:bg-muted/40 cursor-pointer" type="button">TERMINAL</button>
                  <button className="border border-border bg-card text-foreground p-2 text-center hover:bg-muted/40 cursor-pointer" type="button">MANUAL LINK</button>
                </div>
              </div>
              <div className="p-3 bg-muted/40 border border-border text-[11px] text-foreground">
                RULE: Escrow will be isolated in Vault Account #400-ESCROW until final checkout or forfeiture confirmation.
              </div>
            </div>
            <div className="p-4 bg-muted/40 border-t border-border flex items-center justify-between">
              <button 
                onClick={() => setShowCollectModal(false)}
                className="border border-border bg-card hover:bg-muted px-4 py-1.5 text-[12px] uppercase tracking-wider rounded-md cursor-pointer"
              >
                ABORT
              </button>
              <button 
                onClick={() => {
                  setShowCollectModal(false);
                  alert('SYSTEM NOTIFICATION: Escrow transaction successfully authorized and indexed.');
                }}
                className="border border-border bg-primary text-primary-foreground hover:bg-muted hover:text-foreground px-4 py-1.5 text-[12px] uppercase tracking-wider rounded-md cursor-pointer"
              >
                CONFIRM ESCROW HOLD
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
