'use client';

import React, { useState } from 'react';
import { DawgNavSection } from '@/lib/types';
import { PageTabs, KpiTiles, FilterSelect, DataTable } from '../_shared/PageHeader';
import { cn } from '@/lib/utils';

interface GiftCardsViewProps {
  onNavigateSection?: (section: DawgNavSection) => void;
}

export const GiftCardsView: React.FC<GiftCardsViewProps> = ({ onNavigateSection }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'all' | 'digital' | 'physical' | 'credit' | 'depleted'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [codeLookup, setCodeLookup] = useState('');

  const initialGiftCards = [
    {
      id: 'GC-PAWZ-8812-X',
      recipient: 'Arthur Pendragon',
      purchaser: 'Gwen Pendragon (POS REG_01)',
      initialVal: 150.00,
      balance: 112.50,
      issueDate: '2025-04-12',
      lastUsed: '2025-05-10',
      type: 'PHYSICAL_NFC',
      status: 'ACTIVE_ISSUED',
      pciToken: 'TOK: NFC_RAW_9920148102'
    },
    {
      id: 'GC-PAWZ-9401-E',
      recipient: 'Morgana Le Fay',
      purchaser: 'Self-Purchase (Online Checkout)',
      initialVal: 200.00,
      balance: 200.00,
      issueDate: '2025-05-09',
      lastUsed: 'NEVER_REDEEMED',
      type: 'DIGITAL_WALLET',
      status: 'ACTIVE_ISSUED',
      pciToken: 'TOK: DIG_WALLET_33402091'
    },
    {
      id: 'SC-CRED-0142-S',
      recipient: 'Lancelot du Lac',
      purchaser: 'Store Credit Refund (INV-4109)',
      initialVal: 75.00,
      balance: 75.00,
      issueDate: '2025-05-01',
      lastUsed: 'NEVER_REDEEMED',
      type: 'STORE_CREDIT',
      status: 'STORE_CREDIT_ACTIVE',
      pciToken: 'TOK: STORE_CR_88120349'
    },
    {
      id: 'GC-PAWZ-7721-D',
      recipient: 'Gawain Knight',
      purchaser: 'Promo Campaign: spring2025',
      initialVal: 50.00,
      balance: 0.00,
      issueDate: '2025-03-20',
      lastUsed: '2025-05-02',
      type: 'DIGITAL_WALLET',
      status: 'DEPLETED_ARCHIVE',
      pciToken: 'TOK: PROMO_CAM_11048291'
    }
  ];

  const [giftCards, setGiftCards] = useState(initialGiftCards);

  const filteredCards = giftCards.filter((card) => {
    // Tab filtering
    if (activeTab === 'digital' && card.type !== 'DIGITAL_WALLET') return false;
    if (activeTab === 'physical' && card.type !== 'PHYSICAL_NFC') return false;
    if (activeTab === 'credit' && card.type !== 'STORE_CREDIT') return false;
    if (activeTab === 'depleted' && card.balance > 0) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        card.id.toLowerCase().includes(q) ||
        card.recipient.toLowerCase().includes(q) ||
        card.purchaser.toLowerCase().includes(q) ||
        card.type.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const handleNFCVerify = () => {
    setCodeLookup('GC-PAWZ-8812-X');
    alert('SYSTEM TERMINAL: Simulating physical USB NFC scanner connection... Scanning token "GC-PAWZ-8812-X"... CARD VERIFIED!');
  };

  const handleManualVerify = () => {
    if (!codeLookup.trim()) {
      alert('Please enter a card code or click Simulate USB Scanner.');
      return;
    }
    const found = giftCards.find(c => c.id.toLowerCase().includes(codeLookup.toLowerCase().trim()));
    if (found) {
      alert(`CARD ACTIVE: Found code ${found.id} belonging to ${found.recipient} with current balance of $${found.balance.toFixed(2)}.`);
    } else {
      alert('CARD NOT FOUND: Specified code is not indexed in active ledger registry.');
    }
  };

  return (
    <div className="flex flex-col w-full text-foreground bg-background select-text">
      {/* STATUS STRIP */}
      <div className="w-full bg-muted/60 border-b border-border px-4 py-2 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-success animate-pulse shrink-0"></span>
          <span className="font-medium text-[11px] text-muted-foreground">Gift Cards &amp; Store Credits</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="font-medium">Hardware: <span className="text-success font-semibold">NFC USB Station 01</span> <span className="text-muted-foreground/60">(Online)</span></span>
        </div>
      </div>

      {/* SUB NAVIGATION TABS */}
      <PageTabs
        activeId={activeTab}
        onSelect={(id) => setActiveTab(id as typeof activeTab)}
        tabs={[
          { id: 'all', label: 'Gift Cards Dashboard' },
          { id: 'physical', label: 'Physical NFC/Barcode Cards' },
          { id: 'digital', label: 'Digital Wallet Cards' },
          { id: 'credit', label: 'Store Credits Outstanding' },
          { id: 'depleted', label: 'Depleted Archive' },
        ]}
      />

      {/* KPI TILES */}
      <div className="p-6 border-b border-border">
        <KpiTiles
          tiles={[
            {
              label: 'Unredeemed Liability Ledger',
              value: '$12,450.00',
              caption: 'Total outstanding balance across all active cards',
              tone: 'primary',
            },
            {
              label: 'Total Distributed Cards',
              value: '342',
              caption: 'Active cards in circulation across all types',
              tone: 'default',
            },
            {
              label: 'Mean Redemption Amount',
              value: '$78.50',
              caption: 'Average card value at time of redemption',
              tone: 'default',
            },
            {
              label: 'Spring Promo Campaign',
              value: '15% Match',
              caption: 'Bonus allocation promotion enabled',
              tone: 'success',
            },
          ]}
        />
      </div>

      {/* TWO-COLUMN LAYOUT: CARDS REGISTRY & HARDWARE SCANNER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:divide-x divide-border">
        {/* LEFT COL: CARDS REGISTRY & WORKLIST TABLE (8 COLS) */}
        <div className="lg:col-span-8 p-4 bg-background">
          {/* FILTER BAR */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-border rounded-xl shadow-card p-3 mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <svg className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.39l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
                </svg>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search card ID, recipient, purchaser..."
                  className="bg-background border border-input rounded-md pl-8 pr-3 h-8 text-[12px] text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring transition-colors w-64 max-w-full"
                  type="text"
                />
              </div>
            </div>
            <span className="text-[12px] font-medium text-muted-foreground">
              {filteredCards.length} of {giftCards.length} cards
            </span>
          </div>

          {/* DATA TABLE — using the shared DataTable component */}
          <DataTable
            columns={[
              { header: 'Card / Recipient ID' },
              { header: 'Recipient & Sender' },
              { header: 'Initial Value', align: 'right' },
              { header: 'Balance Outstanding', align: 'right' },
              { header: 'Issued' },
              { header: 'Last Used' },
              { header: 'Card Type' },
              { header: 'Actions', align: 'center' },
            ]}
            headerBar={
              <>
                <span className="font-medium text-[11px] text-muted-foreground uppercase tracking-wider">Gift Cards &amp; Credit Financial Register</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-success/10 text-success border border-success/20">Synchronized</span>
              </>
            }
            footerBar={
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-muted-foreground">
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
            }
            hasRows={filteredCards.length > 0}
            emptyState={
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-[14px] font-medium text-foreground">No cards found</p>
                <p className="text-[12px] text-muted-foreground mt-1">Try adjusting your search.</p>
              </div>
            }
          >
            {filteredCards.map((card) => (
              <tr key={card.id} className="hover:bg-accent/50 transition-colors">
                <td className="p-3 border-r border-border font-semibold tabular-nums text-foreground">{card.id}</td>
                <td className="p-3 border-r border-border">
                  <div className="font-medium text-foreground">{card.recipient}</div>
                  <div className="text-[10px] text-muted-foreground">{card.purchaser}</div>
                </td>
                <td className="p-3 border-r border-border text-right font-semibold tabular-nums text-foreground">${card.initialVal.toFixed(2)}</td>
                <td className="p-3 border-r border-border text-right font-semibold tabular-nums text-primary">${card.balance.toFixed(2)}</td>
                <td className="p-3 border-r border-border text-muted-foreground tabular-nums">{card.issueDate}</td>
                <td className="p-3 border-r border-border text-muted-foreground tabular-nums">{card.lastUsed}</td>
                <td className="p-3 border-r border-border">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground border border-border capitalize">
                    {card.type}
                  </span>
                </td>
                <td className="p-3 text-center">
                  <select
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'DECREMENT_BAL') {
                        const promptVal = prompt(`Decrement balance of card ${card.id} (Current: $${card.balance.toFixed(2)}). Enter decrement amount ($USD):`);
                        if (promptVal) {
                          const num = parseFloat(promptVal);
                          if (!isNaN(num) && num > 0 && num <= card.balance) {
                            setGiftCards(prev => prev.map(c => c.id === card.id ? { ...c, balance: c.balance - num, lastUsed: 'TODAY' } : c));
                            alert(`Ledger balance adjusted! Decremented card by $${num.toFixed(2)}.`);
                          } else {
                            alert('Invalid entry amount.');
                          }
                        }
                      } else if (val === 'VOID_CARD') {
                        if (window.confirm(`Are you sure you want to VOID and render depleted the card ${card.id}?`)) {
                          setGiftCards(prev => prev.map(c => c.id === card.id ? { ...c, balance: 0, status: 'VOIDED' } : c));
                          alert('Card successfully voided.');
                        }
                      }
                    }}
                    className="bg-background text-foreground border border-input hover:border-primary/40 rounded-md h-7 px-2 text-[11px] font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Actions for card ${card.id}`}
                  >
                    <option>Action: Select</option>
                    <option value="DECREMENT_BAL">Decrement Balance</option>
                    <option value="VOID_CARD">Void Card</option>
                  </select>
                </td>
              </tr>
            ))}
          </DataTable>
        </div>

        {/* RIGHT COL: HARDWARE SCANNER INTEGRATION & DEPLOYMENT TERMINAL (4 COLS) */}
        <div className="lg:col-span-4 p-6 bg-muted/30">
          <div className="border border-border bg-card p-6 shadow-card-md space-y-6">
            <div className="border-b border-border pb-4">
              <div className="text-[11px] text-muted-foreground uppercase">HARDWARE STACKS // NFC TERMINAL COM_01</div>
              <h3 className="text-md font-semibold tabular-nums mt-1 text-foreground">NFC PHYSICAL INTERACTIVE SCANNER</h3>
            </div>

            <div className="p-4 bg-muted/40 border border-border flex flex-col items-center justify-center text-center py-8">
              <span className="w-12 h-12 rounded-full border-4 border-border border-t-transparent animate-spin mb-4"></span>
              <p className="text-[12px] text-foreground font-semibold uppercase tracking-wider">WAITING FOR USB HARDWARE PIN / LINK...</p>
              <p className="text-[11px] text-muted-foreground/70 mt-1 uppercase">OR CONNECT TO DESKTOP KEYBOARD CHROME SCANNER</p>
            </div>

            <div className="space-y-4">
              <button
                onClick={handleNFCVerify}
                className="w-full bg-card hover:bg-muted/40 text-foreground border border-border px-4 py-2.5 text-[12px] uppercase font-semibold tracking-wider transition-colors rounded-md cursor-pointer"
              >
                SIMULATE PHYSICAL CARD NFC SWIPE
              </button>

              <div className="relative">
                <label className="block text-[11px] text-muted-foreground mb-1 uppercase">MANUAL COUPON / CARD CARDCODE INPUT</label>
                <div className="flex">
                  <input
                    value={codeLookup}
                    onChange={(e) => setCodeLookup(e.target.value)}
                    className="flex-1 bg-card border border-border  px-3 py-2 text-[13px] text-foreground focus:outline-none rounded-md"
                    placeholder="e.g. GC-PAWZ-8812-X"
                    type="text"
                  />
                  <button
                    onClick={handleManualVerify}
                    className="bg-black hover:bg-muted text-white border border-border px-4 text-[12px] uppercase font-semibold tracking-wider transition-colors rounded-md cursor-pointer"
                  >
                    VERIFY Code
                  </button>
                </div>
              </div>

              <div className="p-3 bg-muted/30 border border-border text-[11px] text-foreground">
                RULE: Digital wallet cards generate temporary PCI secure tokens that rotate every 60 seconds for anti-clone security.
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <button
                onClick={() => setShowIssueModal(true)}
                className="w-full bg-black hover:bg-muted text-white border border-border px-4 py-3 text-[12px] uppercase font-semibold tracking-wider transition-colors rounded-md cursor-pointer"
              >
                + ISSUE NEW GIFT CARD OR VOUCHER
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ISSUE NEW CARD MODAL */}
      {showIssueModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-none z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-card border border-border">
            <div className="bg-muted/40 border-b border-border p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium text-[9px] bg-primary text-primary-foreground px-1.5 py-0.5 uppercase">Issuance Portal</span>
                <span className="font-display text-[13px] font-semibold tracking-tight text-foreground">Initiate Valuation Bundle</span>
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
                <label className="block text-[11px] text-muted-foreground mb-1 uppercase">RECIPIENT LEGAL NAME //*</label>
                <input className="w-full bg-card border border-border px-3 py-2 text-[13px] text-foreground focus:outline-none rounded-md" type="text" placeholder="e.g. John Doe" id="recip-name" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1 uppercase">CARD START VALUE ($USD) //*</label>
                  <input className="w-full bg-card border border-border px-3 py-2 text-[13px] text-foreground focus:outline-none rounded-md" type="text" defaultValue="100.00" id="card-start-val" />
                </div>
                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1 uppercase">SELECT CAMPAIGN TYPE //*</label>
                  <select className="w-full bg-card border border-border px-3 py-2 text-[13px] text-foreground focus:outline-none rounded-md" id="card-campaign">
                    <option>01 // STANDARD PURCHASED CASH DESK</option>
                    <option>02 // SPRING PROMO 15% VALUE ADD</option>
                    <option>03 // STRIPE DISPUTE SETTLEMENT OFFER</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1 uppercase">CARD DELIVER INSTRUMENT //*</label>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold">
                  <button className="border border-border bg-primary text-primary-foreground p-2 text-center cursor-pointer" type="button">GENERATE WALLET DEPL-LINK (SMS/EMAIL)</button>
                  <button className="border border-border bg-card text-foreground p-2 text-center hover:bg-muted/40 cursor-pointer" type="button">WRITE PHYSICAL NFC TAG TERMINAL</button>
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
                  const rName = (document.getElementById('recip-name') as HTMLInputElement)?.value || 'New Recipient';
                  const sVal = parseFloat((document.getElementById('card-start-val') as HTMLInputElement)?.value) || 100.00;
                  const newCardId = `GC-PAWZ-${Math.floor(1000 + Math.random() * 9000)}-M`;
                  setGiftCards(prev => [
                    {
                      id: newCardId,
                      recipient: rName,
                      purchaser: 'Cashier Issue (POS REG_01)',
                      initialVal: sVal,
                      balance: sVal,
                      issueDate: '2025-05-12',
                      lastUsed: 'NEVER_REDEEMED',
                      type: 'PHYSICAL_NFC',
                      status: 'ACTIVE_ISSUED',
                      pciToken: 'TOK: MANUAL_ISS_88301'
                    },
                    ...prev
                  ]);
                  setShowIssueModal(false);
                  alert(`SUCCESS: Created gift card ${newCardId} for ${rName} with balance of $${sVal.toFixed(2)}.`);
                }}
                className="border border-border bg-primary text-primary-foreground hover:bg-muted hover:text-foreground px-4 py-1.5 text-[12px] uppercase tracking-wider rounded-md cursor-pointer"
              >
                AUTHORIZE ISSUANCE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
