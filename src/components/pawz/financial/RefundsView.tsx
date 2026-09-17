'use client';

import React, { useState } from 'react';
import { DawgNavSection } from '@/lib/types';
import { PageTabs, KpiTiles, FilterSelect } from '../_shared/PageHeader';
import { cn } from '@/lib/utils';

interface RefundsViewProps {
  onNavigateSection?: (section: DawgNavSection) => void;
}

export const RefundsView: React.FC<RefundsViewProps> = ({ onNavigateSection }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'all' | 'pending' | 'disputes' | 'credit' | 'policies'>('disputes');
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('ALL CHARGEBACKS & INQUIRIES');
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedDisputeId, setSelectedDisputeId] = useState<string | null>('DISP-0841-A');

  const initialRefundsAndDisputes = [
    {
      id: 'DISP-0841-A',
      customer: 'Sarah Gallagher',
      phone: '+1 (555) 304-4412',
      email: 's.gallagher@example.com',
      service: 'SVC: ROYAL PEKINESE MASSAGE PACK [PKG-05]',
      amount: 175.00,
      origTxId: 'TXN-901842',
      origTxDate: '2025-05-02',
      disputeDate: '2025-05-10',
      reasonCode: '10.4 // SERVICES NOT AS DESCRIBED',
      acquirerRef: 'ARN: 7421008420199410319',
      status: 'DISPUTE_UNDER_REVIEW',
      evidenceFile: 'EXHIBIT_A_HAIRCUT_TIMESTAMP.PNG',
      refundStatus: 'PENDING_REBUTTAL'
    },
    {
      id: 'RFND-0244-X',
      customer: 'Gregory Peck',
      phone: '+1 (555) 120-4491',
      email: 'gregory@peckstudios.co',
      service: 'SVC: EXPRESS DESHEDDING TREATMENT',
      amount: 85.00,
      origTxId: 'TXN-901501',
      origTxDate: '2025-05-01',
      disputeDate: '2025-05-08',
      reasonCode: '04 // UNINTENTIONAL DUPLICATE CHARGE',
      acquirerRef: 'ARN: 8812004291040182741',
      status: 'REFUNDED',
      evidenceFile: 'SYSTEM_AUTODETECT_LOGS.PDF',
      refundStatus: 'COMPLETED'
    },
    {
      id: 'DISP-0839-C',
      customer: 'Valerie Adams',
      phone: '+1 (555) 782-9011',
      email: 'v.adams@colemancare.net',
      service: 'SVC: SPA DAY DE LUXE [ADDONS_INCL]',
      amount: 220.00,
      origTxId: 'TXN-900812',
      origTxDate: '2025-04-28',
      disputeDate: '2025-05-07',
      reasonCode: '83 // NO SHOW CHARGE INCORRECTLY APPLIED',
      acquirerRef: 'ARN: 3310492810041289304',
      status: 'DISPUTE_LOST',
      evidenceFile: 'CUSTOMER_WIFI_CHECKIN_LOG.TXT',
      refundStatus: 'CHARGEBACK_ENFORCED'
    },
    {
      id: 'RFND-0241-K',
      customer: 'Tobias Jenkins',
      phone: '+1 (555) 881-2201',
      email: 'tjenk@jenkinslaw.com',
      service: 'SVC: NAIL GRINDING + TEETH CLEANING',
      amount: 45.00,
      origTxId: 'TXN-899120',
      origTxDate: '2025-04-25',
      disputeDate: '2025-05-02',
      reasonCode: '12 // CUSTOMER SATISFACTION REFUND',
      acquirerRef: 'ARN: 5510429104829304122',
      status: 'REFUNDED',
      evidenceFile: 'REASON_VERBAL_COMPLAINT.TXT',
      refundStatus: 'STORE_CREDIT_CONVERTED'
    }
  ];

  const [refundsAndDisputes, setRefundsAndDisputes] = useState(initialRefundsAndDisputes);

  const filteredItems = refundsAndDisputes.filter((item) => {
    // Tab filter
    if (activeTab === 'disputes' && !item.id.startsWith('DISP')) return false;
    if (activeTab === 'pending' && item.status !== 'DISPUTE_UNDER_REVIEW') return false;
    if (activeTab === 'credit' && item.refundStatus !== 'STORE_CREDIT_CONVERTED') return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        item.id.toLowerCase().includes(q) ||
        item.customer.toLowerCase().includes(q) ||
        item.service.toLowerCase().includes(q) ||
        item.origTxId.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const selectedDispute = refundsAndDisputes.find(d => d.id === selectedDisputeId);

  const handleUploadEvidence = () => {
    alert('SYSTEM DIALOG: File selector opened. Select evidence document to bind (PDF/PNG/JPEG).');
  };

  const handleRebut = () => {
    alert('SYSTEM TRANSACTION: Evidence bundle compiled. Rebuttal package uploaded and sent to card issuer network.');
    if (selectedDisputeId) {
      setRefundsAndDisputes(prev => prev.map(item => {
        if (item.id === selectedDisputeId) {
          return { ...item, status: 'DISPUTE_UNDER_REVIEW', refundStatus: 'EVIDENCE_SUBMITTED' };
        }
        return item;
      }));
    }
  };

  const handleAcceptDispute = () => {
    const conf = window.confirm('Are you sure you want to ACCEPT this dispute? This will forfeit the funds to the cardholder and incur a $15.00 chargeback fee.');
    if (conf) {
      alert('SYSTEM TRANSACTION: Dispute accepted. Ledger accounts adjusted.');
      if (selectedDisputeId) {
        setRefundsAndDisputes(prev => prev.map(item => {
          if (item.id === selectedDisputeId) {
            return { ...item, status: 'DISPUTE_LOST', refundStatus: 'CHARGEBACK_ENFORCED' };
          }
          return item;
        }));
      }
    }
  };

  return (
    <div className="flex flex-col w-full text-foreground bg-background select-text">
      {/* STATUS STRIP */}
      <div className="w-full bg-muted/60 border-b border-border px-4 py-2 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-success animate-pulse shrink-0"></span>
          <span className="font-medium text-[11px] text-muted-foreground">Refunds &amp; Dispute Center</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="font-medium">Gateway: <span className="text-success font-semibold">Connected</span></span>
          <span className="font-medium hidden sm:inline">Dispute Ratio: <span className="text-success font-semibold tabular-nums">0.12%</span> <span className="text-muted-foreground/60">(Good)</span></span>
        </div>
      </div>

      {/* SUB NAVIGATION TABS */}
      <PageTabs
        activeId={activeTab}
        onSelect={(id) => setActiveTab(id as typeof activeTab)}
        tabs={[
          { id: 'disputes', label: 'Refunds & Disputes Active', count: 2 },
          { id: 'pending', label: 'Pending Approval' },
          { id: 'credit', label: 'Store Credit Issued' },
        ]}
      />

      {/* KPI TILES */}
      <div className="p-6 border-b border-border">
        <KpiTiles
          tiles={[
            {
              label: 'Active Disputes Outstanding',
              value: '$395.00',
              caption: 'Total disputed amount awaiting resolution',
              tone: 'destructive',
            },
            {
              label: 'Dispute Win Ratio (MTD)',
              value: '84.2%',
              caption: 'Cases won in merchant favor this month',
              tone: 'success',
            },
            {
              label: 'Total Stripe Chargeback Fees',
              value: '$30.00',
              caption: 'Acquirer processing fees for active disputes',
              tone: 'warning',
            },
            {
              label: 'Refund Policy',
              value: 'Strict',
              caption: 'No refund on no-shows under 24h — stated reservation terms',
              tone: 'primary',
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
                placeholder="Search dispute ID, customer, acquirer ARN..."
                type="text"
              />
            </div>
            <FilterSelect
              aria-label="Filter by dispute stage"
              value={stageFilter}
              onChange={(v) => setStageFilter(v)}
            >
              <option>All Chargebacks &amp; Inquiries</option>
              <option>Rebuttal Pending (Evidence Needed)</option>
              <option>Under Cognizant Jurisdiction</option>
              <option>Closed / Settled</option>
            </FilterSelect>
          </div>
          <div>
            <button
              onClick={() => {
                setShowIssueModal(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3.5 text-[13px] font-medium shadow-card transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <span>Initiate Internal Refund</span>
            </button>
          </div>
        </div>
      </div>

      {/* TWO-COLUMN LAYOUT: WORKLIST & DISPUTE RESOLVER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:divide-x divide-border">
        {/* LEFT COL: MASTER WORKLIST REGISTRY (5 COLS) */}
        <div className="lg:col-span-5 bg-background p-4">
          <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
            <div className="bg-muted/40 border-b border-border px-4 py-2.5 flex items-center justify-between">
              <span className="font-medium text-[11px] text-muted-foreground uppercase tracking-wider">Active Queue</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground border border-border">FIFO Order</span>
            </div>
            <div className="divide-y divide-border max-h-[600px] overflow-y-auto custom-scrollbar">
              {filteredItems.map((item) => {
                const isSelected = selectedDisputeId === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedDisputeId(item.id)}
                    className={cn(
                      "p-4 cursor-pointer transition-colors flex flex-col justify-between",
                      isSelected
                        ? "bg-primary/5 border-l-2 border-l-primary"
                        : "hover:bg-accent/50 border-l-2 border-l-transparent",
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[12px] font-semibold tabular-nums text-foreground">{item.id}</span>
                      <span className={cn(
                        "inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider",
                        item.status === 'REFUNDED'
                          ? "bg-muted text-muted-foreground border-border"
                          : item.status === 'DISPUTE_UNDER_REVIEW'
                          ? "bg-warning/10 text-warning border-warning/20 animate-pulse"
                          : "bg-destructive/10 text-destructive border-destructive/20",
                      )}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex justify-between text-[13px] mb-1">
                      <span className="font-medium text-foreground">{item.customer}</span>
                      <span className="font-semibold tabular-nums text-foreground">${item.amount.toFixed(2)}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">{item.service}</p>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-3 pt-2 border-t border-dashed border-border">
                      <span>Disp Date: <span className="tabular-nums">{item.disputeDate}</span></span>
                      <span>Txn: <span className="tabular-nums">{item.origTxId}</span></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COL: STRIPE GATEWAY DISPUTE REBUTTAL TERMINAL (7 COLS) */}
        <div className="lg:col-span-7 bg-muted/30 p-6">
          {selectedDispute ? (
            <div className="border border-border bg-card p-6 shadow-card-md">
              {/* HEAD */}
              <div className="border-b border-border pb-4 mb-4 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase">STRIPE DISPUTE SYSTEM INTERACTIVE ENGINE</div>
                  <h3 className="text-lg font-semibold tabular-nums mt-1 text-foreground">{selectedDispute.id} - EVIDENCE PACK</h3>
                </div>
                <span className="text-[10px] bg-destructive/10 border border-destructive/20 text-destructive px-2.5 py-1 font-semibold animate-pulse uppercase">
                  REBUTTAL_WINDOW_OPEN
                </span>
              </div>

              {/* DETAILS */}
              <div className="grid grid-cols-2 gap-4 text-[13px] tabular-nums border-b border-border pb-4 mb-4">
                <div className="space-y-2">
                  <p><span className="text-muted-foreground">DISPUTED AMT:</span> <strong className="text-foreground text-sm">${selectedDispute.amount.toFixed(2)} USD</strong></p>
                  <p><span className="text-muted-foreground">REASON CODE:</span> <strong className="text-foreground">{selectedDispute.reasonCode}</strong></p>
                  <p><span className="text-muted-foreground">ORIGINAL TXN:</span> <strong className="text-foreground">{selectedDispute.origTxId} ({selectedDispute.origTxDate})</strong></p>
                </div>
                <div className="space-y-2">
                  <p><span className="text-muted-foreground">CUSTOMER:</span> <strong className="text-foreground">{selectedDispute.customer}</strong></p>
                  <p><span className="text-muted-foreground">ACQUIRER ARN:</span> <strong className="text-foreground select-all">{selectedDispute.acquirerRef}</strong></p>
                  <p><span className="text-muted-foreground">CONTACT:</span> <strong className="text-foreground">{selectedDispute.phone}</strong></p>
                </div>
              </div>

              {/* CORE ACTIONS */}
              <div className="space-y-4">
                <h4 className="text-[12px] font-semibold text-foreground uppercase">STRIPE CHARGEBACK MITIGATION &amp; COMPLIANCE BUNDLE</h4>
                <div className="p-4 border border-border bg-muted/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-foreground uppercase">01. INTAKE REGISTRATION &amp; GPS SERVICE LOG</span>
                    <span className="text-[10px] text-success font-semibold bg-success/10 border border-success/20 px-1">AUTO-BOUND</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    System binds GPS trace coordinates of groomer van arrival, appointment check-in, check-out timestamps and client signature.
                  </p>
                  <div className="text-[10px] tabular-nums font-semibold bg-card border border-border px-2 py-1 flex items-center justify-between text-foreground">
                    <span>GPS_AUDIT_LOG_COORD.JSON // SHAWNEE_OK_UNIT_01</span>
                    <button onClick={() => alert('Viewing bound GPS JSON file...')} className="text-muted-foreground hover:text-foreground hover:underline cursor-pointer">PREVIEW</button>
                  </div>
                </div>

                <div className="p-4 border border-border bg-muted/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-foreground uppercase">02. BEFORE / AFTER PHOTOGRAPHIC EVIDENCE</span>
                    <span className="text-[10px] text-muted-foreground border border-border px-1">OPTIONAL</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    Inject high-resolution visual proof of groom completion to verify matching service standards on the disputed pet.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleUploadEvidence}
                      className="bg-card hover:bg-black hover:text-white text-foreground border border-border px-3 py-1 text-[12px] font-semibold uppercase transition-colors rounded-md cursor-pointer"
                    >
                      CHOOSE FILE TO BIND
                    </button>
                    <span className="text-[11px] text-muted-foreground/70">EXHIBIT_B_BEFORE_AFTER.PNG // COMPLETED_OK</span>
                  </div>
                </div>

                <div className="p-4 border border-border bg-muted/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-foreground uppercase">03. DIGITAL REBATE OR ARBITRATION CONTRACT</span>
                    <span className="text-[10px] text-warning font-semibold bg-warning/10 border border-warning/20 px-1">EVIDENCE_BIND_REQUIRED</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    Bind standard digital client service disclaimer signed during initial reservation flow acknowledging strict late policy.
                  </p>
                  <div className="text-[10px] tabular-nums font-semibold bg-card border border-border px-2 py-1 flex items-center justify-between text-foreground">
                    <span>{selectedDispute.evidenceFile}</span>
                    <span className="text-muted-foreground/70">0.9 MB // VERIFIED_PCI</span>
                  </div>
                </div>

                {/* RESOLUTION BUTTONS */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                  <button
                    onClick={handleAcceptDispute}
                    className="border border-border bg-card hover:bg-destructive/5 hover:text-destructive px-4 py-2.5 text-[12px] uppercase font-semibold tracking-wider transition-colors rounded-md cursor-pointer"
                  >
                    ACCEPT DISPUTE (CONCEDE)
                  </button>
                  <button
                    onClick={handleRebut}
                    className="border border-border bg-primary text-primary-foreground hover:bg-muted/40 hover:text-foreground px-4 py-2.5 text-[12px] uppercase font-semibold tracking-wider transition-colors rounded-md cursor-pointer"
                  >
                    SUBMIT REBUTTAL SYSTEM
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center p-8 border border-dashed border-border">
              <p className="text-[12px] text-muted-foreground uppercase">SELECT A DISPUTE RECORD TO OPEN MITIGATION TERMINAL</p>
            </div>
          )}
        </div>
      </div>

      {/* INTERNAL ISSUE REFUND MODAL */}
      {showIssueModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-none z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-card border border-border">
            <div className="bg-muted/40 border-b border-border p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 font-semibold uppercase">TXN_REVERSAL</span>
                <span className="text-[12px] font-semibold text-foreground">INITIATE LEDGER-REVERSIBLE REFUND</span>
              </div>
              <button 
                onClick={() => setShowIssueModal(false)}
                className="text-[12px] font-semibold text-foreground hover:bg-black hover:text-white px-2 py-0.5 border border-border cursor-pointer"
              >
                [X]
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1 uppercase">TARGET INVOICE / TXN REFERENCE //*</label>
                <input className="w-full bg-card border border-border px-3 py-2 text-[13px] text-foreground focus:outline-none rounded-md" type="text" placeholder="e.g. TXN-901842" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1 uppercase">REFUND REASON CATEGORY //*</label>
                  <select className="w-full bg-card border border-border px-3 py-2 text-[13px] text-foreground focus:outline-none rounded-md">
                    <option>01 // CUSTOMER SATISFACTION REFUND</option>
                    <option>02 // INTENTIONAL RE-SCHEDULING ESCROW</option>
                    <option>03 // PRICING DISCREPANCY ADJUSTMENT</option>
                    <option>04 // DUPLICATE TXN REVERSION</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1 uppercase">REVERSAL AMOUNT ($USD) //*</label>
                  <input className="w-full bg-card border border-border px-3 py-2 text-[13px] text-foreground focus:outline-none rounded-md" type="text" defaultValue="50.00" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1 uppercase">REVERSAL REFUND PAYOUT TYPE //*</label>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold">
                  <button className="border border-border bg-primary text-primary-foreground p-2 text-center cursor-pointer" type="button">CREDIT BACK TO CARD</button>
                  <button className="border border-border bg-card text-foreground p-2 text-center hover:bg-muted/40 cursor-pointer" type="button">CONVERT TO STORE CREDIT</button>
                </div>
              </div>
            </div>
            <div className="p-4 bg-muted/40 border-t border-border flex items-center justify-between">
              <button 
                onClick={() => setShowIssueModal(false)}
                className="border border-border bg-card hover:bg-muted px-4 py-1.5 text-[12px] uppercase tracking-wider rounded-md cursor-pointer"
              >
                ABORT
              </button>
              <button 
                onClick={() => {
                  setShowIssueModal(false);
                  alert('SYSTEM NOTIFICATION: Reversal authorized. Stripe gateway refund pending bank clearance.');
                }}
                className="border border-border bg-primary text-primary-foreground hover:bg-muted hover:text-foreground px-4 py-1.5 text-[12px] uppercase tracking-wider rounded-md cursor-pointer"
              >
                AUTHORIZE REFUND
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
