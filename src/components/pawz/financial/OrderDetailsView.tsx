'use client';

import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Printer, 
  Truck, 
  Mail, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Send,
  AlertCircle
} from 'lucide-react';
import { DawgNavSection } from '@/lib/types';

interface OrderDetailsViewProps {
  onNavigateSection?: (section: DawgNavSection) => void;
}

export const OrderDetailsView: React.FC<OrderDetailsViewProps> = ({ onNavigateSection }) => {
  const [message, setMessage] = useState('');
  const [sentNotice, setSentNotice] = useState(false);

  const handleSend = () => {
    if (!message.trim()) return;
    setSentNotice(true);
    setTimeout(() => {
      setMessage('');
      setSentNotice(false);
    }, 2500);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto text-foreground bg-card min-h-full">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border border-border p-4 bg-card gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] tabular-nums uppercase tracking-wider text-muted-foreground">
            <button 
              onClick={() => onNavigateSection?.('orders')}
              className="hover:underline flex items-center gap-1 text-foreground font-semibold cursor-pointer"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>ORDERS</span>
            </button>
            <span>{'//'}</span>
            <span className="text-foreground font-semibold">#ORD-2025-1048</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <h1 className="text-xl font-semibold uppercase text-foreground">Order #ORD-2025-1048</h1>
            <span className="px-2 py-0.5 border border-border bg-primary text-primary-foreground text-[11px] font-medium uppercase text-muted-foreground">
              PAID
            </span>
            <span className="px-2 py-0.5 border border-border bg-card text-foreground text-[11px] font-medium uppercase text-muted-foreground">
              READY TO SHIP - USPS
            </span>
          </div>
          <p className="text-[11px] tabular-nums text-muted-foreground mt-1">
            PLACED: MAY 12, 2025 · 10:14 AM EDT · CHANNEL: PET PARENT PORTAL
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => window.print()}
            className="px-3 py-1.5 border border-border bg-card hover:bg-accent/50 font-semibold text-[13px] uppercase flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Packing Slip</span>
          </button>
          <button 
            onClick={() => onNavigateSection?.('shipping')}
            className="px-3 py-1.5 border border-border bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-[13px] uppercase flex items-center gap-1.5 cursor-pointer"
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Shipping Label</span>
          </button>
          <button 
            onClick={() => alert('Dispatching customer SMS & email update...')}
            className="px-3 py-1.5 border border-border bg-card hover:bg-accent/50 font-semibold text-[13px] uppercase flex items-center gap-1.5 cursor-pointer"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Resend Alert</span>
          </button>
        </div>
      </div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Allocated Line Items */}
          <div className="border border-border bg-card">
            <div className="p-3.5 border-b border-border flex items-center justify-between bg-muted/30">
              <h2 className="font-semibold uppercase text-[13px] text-foreground">Allocated Line Items (3 Items · 4 Units)</h2>
              <span className="text-[10px] tabular-nums text-foreground font-semibold">BIN ALLOCATED 100%</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px] border-collapse tabular-nums">
                <thead>
                  <tr className="bg-card border-b border-border text-[11px] uppercase font-semibold text-muted-foreground">
                    <th className="p-3 border-r border-border w-10 text-center">#</th>
                    <th className="p-3 border-r border-border">Product Details</th>
                    <th className="p-3 border-r border-border text-center">Qty</th>
                    <th className="p-3 border-r border-border text-right">Unit</th>
                    <th className="p-3 border-r border-border text-right">Total</th>
                    <th className="p-3 text-right">Fulfillment Bin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-[13px]">
                  <tr className="hover:bg-accent/50">
                    <td className="p-3 text-center border-r border-border text-muted-foreground/70">01</td>
                    <td className="p-3 border-r border-border">
                      <p className="font-semibold font-sans text-foreground">Organic Blueberry Facial Foam Wash (8 oz)</p>
                      <p className="text-[10px] text-muted-foreground">SKU: AAP-SHP-001 · Pawz Botanicals</p>
                    </td>
                    <td className="p-3 text-center border-r border-border font-semibold">2</td>
                    <td className="p-3 text-right border-r border-border">$24.00</td>
                    <td className="p-3 text-right border-r border-border font-semibold">$48.00</td>
                    <td className="p-3 text-right">
                      <span className="px-1.5 py-0.5 border border-border bg-muted/40 text-[10px] font-semibold">
                        BIN B-04
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-accent/50">
                    <td className="p-3 text-center border-r border-border text-muted-foreground/70">02</td>
                    <td className="p-3 border-r border-border">
                      <p className="font-semibold font-sans text-foreground">Professional Undercoat De-shedding Rake</p>
                      <p className="text-[10px] text-muted-foreground">SKU: AAP-TLS-014 · GroomPro Elite</p>
                    </td>
                    <td className="p-3 text-center border-r border-border font-semibold">1</td>
                    <td className="p-3 text-right border-r border-border">$32.50</td>
                    <td className="p-3 text-right border-r border-border font-semibold">$32.50</td>
                    <td className="p-3 text-right">
                      <span className="px-1.5 py-0.5 border border-border bg-muted/40 text-[10px] font-semibold">
                        BIN T-12
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-accent/50">
                    <td className="p-3 text-center border-r border-border text-muted-foreground/70">03</td>
                    <td className="p-3 border-r border-border">
                      <p className="font-semibold font-sans text-foreground">Natural Calming Hemp Treats (30 count)</p>
                      <p className="text-[10px] text-muted-foreground">SKU: AAP-TRT-008 · BarkBites</p>
                    </td>
                    <td className="p-3 text-center border-r border-border font-semibold">1</td>
                    <td className="p-3 text-right border-r border-border">$18.00</td>
                    <td className="p-3 text-right border-r border-border font-semibold">$18.00</td>
                    <td className="p-3 text-right">
                      <span className="px-1.5 py-0.5 border border-border bg-muted/40 text-[10px] font-semibold">
                        BIN F-02
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Financial Ledger Settlement */}
            <div className="border-t border-border grid grid-cols-1 md:grid-cols-2 bg-card">
              <div className="p-4 border-b md: md:border-r border-border space-y-2">
                <p className="font-semibold text-[10px] uppercase tracking-wider text-muted-foreground tabular-nums">Payment Ledger Settlement</p>
                <div className="flex items-center gap-2 text-[12px]">
                  <CreditCard className="w-4 h-4 text-foreground" />
                  <span className="font-semibold text-foreground">Visa ending 4242</span>
                  <span className="px-1 py-0.2 border border-border text-[10px] uppercase font-semibold">AUTH #TXN-908122</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Processed via Stripe Elements. Net settled to salon checking account.
                </p>
              </div>

              <div className="p-4 space-y-1.5 text-[12px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Line Items Subtotal:</span>
                  <span className="font-semibold text-foreground">$98.50</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping (USPS Ground):</span>
                  <span className="font-semibold text-foreground">$8.50</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sales Tax (TX 8.25%):</span>
                  <span className="font-semibold text-foreground">$8.13</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between font-semibold text-sm text-foreground">
                  <span>TOTAL CAPTURED:</span>
                  <span>$115.13</span>
                </div>
              </div>
            </div>
          </div>

          {/* Fulfillment Progress & Audit Trail */}
          <div className="border border-border bg-card p-4 space-y-4">
            <h3 className="font-semibold uppercase text-[13px] text-foreground">Fulfillment Progress &amp; Audit Trail</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[12px]">
              <div className="border border-border p-2 bg-primary text-primary-foreground">
                <p className="text-[10px] font-semibold uppercase text-muted-foreground/50">01. Placed</p>
                <p className="font-semibold mt-0.5">10:14 AM</p>
              </div>
              <div className="border border-border p-2 bg-primary text-primary-foreground">
                <p className="text-[10px] font-semibold uppercase text-muted-foreground/50">02. Paid</p>
                <p className="font-semibold mt-0.5">10:15 AM</p>
              </div>
              <div className="border border-border p-2 bg-muted/40 text-foreground">
                <p className="text-[10px] font-semibold uppercase text-foreground">03. Packed</p>
                <p className="font-semibold mt-0.5">11:30 AM</p>
              </div>
              <div className="border border-dashed border-border p-2 bg-card text-muted-foreground">
                <p className="text-[10px] font-semibold uppercase">04. Pickup</p>
                <p className="font-semibold mt-0.5">16:30 Cutoff</p>
              </div>
            </div>

            <div className="border-t border-border pt-3 space-y-2 text-[13px] tabular-nums">
              <div className="flex items-center justify-between text-foreground">
                <span>• Thermal Label 4x6 Spooled to Rollo-USB4</span>
                <span className="text-[10px] text-muted-foreground">11:30:12 AM</span>
              </div>
              <div className="flex items-center justify-between text-foreground">
                <span>• Barcode Verified Picked from Bins B-04, T-12, F-02</span>
                <span className="text-[10px] text-muted-foreground">11:28:44 AM</span>
              </div>
              <div className="flex items-center justify-between text-foreground">
                <span>• Card Captured $115.13 via Stripe</span>
                <span className="text-[10px] text-muted-foreground">10:15:02 AM</span>
              </div>
            </div>
          </div>

          {/* Quick Dispatch Note */}
          <div className="border border-border bg-card p-4 space-y-3">
            <h3 className="font-semibold uppercase text-[13px] text-foreground">Dispatch Customer Note</h3>
            <div className="flex gap-2">
              <button 
                onClick={() => setMessage('Hi Sarah! Your All About Pawz order #ORD-2025-1048 is packed and scheduled for USPS departure today.')}
                className="px-2 py-1 border border-border bg-muted/30 text-[10px] font-semibold uppercase hover:bg-black hover:text-white transition-colors cursor-pointer"
              >
                Preset: Ready
              </button>
              <button 
                onClick={() => setMessage('Hi Sarah, tracking #9400111899562837012492 is active for your package delivery!')}
                className="px-2 py-1 border border-border bg-muted/30 text-[10px] font-semibold uppercase hover:bg-black hover:text-white transition-colors cursor-pointer"
              >
                Preset: Tracking
              </button>
            </div>
            <textarea 
              rows={2}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type message to Sarah Johnson..."
              className="w-full p-2 text-[13px] border border-border focus:outline-none resize-none tabular-nums"
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground tabular-nums">SMS to (214) 555-0198 + Email copy</span>
              <button 
                onClick={handleSend}
                className="px-3 py-1.5 bg-primary text-primary-foreground text-[13px] font-semibold uppercase flex items-center gap-1 cursor-pointer"
              >
                <Send className="w-3 h-3" />
                <span>Dispatch</span>
              </button>
            </div>
            {sentNotice && (
              <p className="text-[13px] font-semibold text-foreground tabular-nums">✓ Dispatch note logged and sent!</p>
            )}
          </div>
        </div>

        {/* Right Column (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Customer Profile */}
          <div className="border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="font-semibold uppercase text-[13px] text-foreground">Customer Profile</h3>
              <span className="px-1.5 py-0.2 border border-border bg-primary text-primary-foreground text-[10px] font-semibold">VIP 2</span>
            </div>
            <div>
              <p className="text-base font-semibold text-foreground uppercase">Sarah Johnson</p>
              <p className="text-[10px] tabular-nums text-muted-foreground">Account: #AAP-CUS-0894</p>
            </div>
            <div className="p-2 border border-border bg-muted/30 text-[13px] tabular-nums space-y-1">
              <p className="font-semibold text-foreground">Registered Pets:</p>
              <p>• Buddy (Golden Retriever)</p>
              <p>• Luna (French Bulldog)</p>
            </div>
            <div className="text-[13px] tabular-nums space-y-1 text-foreground">
              <p>Tel: +1 (214) 555-0198</p>
              <p>Email: sarah.j@pawzmail.com</p>
              <p>Lifetime Value: $1,245.50 (18 Orders)</p>
            </div>
          </div>

          {/* Shipping & Parcel Details */}
          <div className="border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="font-semibold uppercase text-[13px] text-foreground">Shipping Specs</h3>
              <span className="text-[10px] tabular-nums text-foreground font-semibold">USPS 4X6</span>
            </div>
            <div className="p-2 border border-border bg-muted/30 text-[13px] tabular-nums">
              <p className="font-semibold text-foreground uppercase">Sarah Johnson</p>
              <p>1234 Maple Drive</p>
              <p>Frisco, TX 75034-4921</p>
            </div>
            <div className="text-[13px] tabular-nums space-y-1">
              <p className="text-muted-foreground uppercase text-[10px]">Service:</p>
              <p className="font-semibold text-foreground">USPS Ground Advantage (Commercial)</p>
              <p className="text-muted-foreground uppercase text-[10px] mt-2">Tracking #:</p>
              <p className="font-semibold text-foreground bg-muted/40 p-1 border border-border select-all">
                9400 1118 9956 2837 0124 92
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
