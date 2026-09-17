'use client';

import React, { useState } from 'react';
import { 
  Truck, 
  Search, 
  Printer, 
  Scale, 
  Box, 
  FileText, 
  CheckCircle2, 
  DollarSign, 
  Sparkles,
  Barcode
} from 'lucide-react';
import { DawgNavSection } from '@/lib/types';

interface ShippingStationViewProps {
  onNavigateSection?: (section: DawgNavSection) => void;
}

export const ShippingStationView: React.FC<ShippingStationViewProps> = ({ onNavigateSection }) => {
  const [selectedCarrier, setSelectedCarrier] = useState('usps-ground');
  const [weight, setWeight] = useState(1.50);
  const [boxPreset, setBoxPreset] = useState<'small' | 'med' | 'padded' | 'custom'>('small');
  const [sigRequired, setSigRequired] = useState(false);
  const [printedNotice, setPrintedNotice] = useState(false);

  const rates = [
    {
      id: 'usps-ground',
      carrier: 'USPS Ground Advantage™',
      badge: 'RECOMMENDED',
      delivery: 'Est. Delivery: Wednesday, May 14 (2–3 days)',
      price: 8.50,
      retail: 10.20,
      tracking: '9400 1118 9956 2837 0124 92',
    },
    {
      id: 'ups-ground',
      carrier: 'UPS Ground®',
      badge: 'INSURED',
      delivery: 'Est. Delivery: Wednesday, May 14 (End of Day)',
      price: 10.45,
      retail: 13.00,
      tracking: '1Z 999 999 03 1234 5678',
    },
    {
      id: 'usps-priority',
      carrier: 'USPS Priority Mail®',
      badge: 'FASTEST FLAT',
      delivery: 'Est. Delivery: Tuesday, May 13 (1–2 days)',
      price: 12.20,
      retail: 15.50,
      tracking: '9205 5000 0000 0000 0000 00',
    },
    {
      id: 'ups-2day',
      carrier: 'UPS 2nd Day Air®',
      badge: 'EXPEDITED',
      delivery: 'Guaranteed: Wednesday, May 14 by 12:00 PM',
      price: 18.90,
      retail: 24.00,
      tracking: '1Z 999 999 02 8847 1122',
    },
  ];

  const currentRate = rates.find(r => r.id === selectedCarrier) || rates[0];
  const totalPrice = (currentRate.price + (sigRequired ? 3.50 : 0)).toFixed(2);

  const handleBuyAndPrint = () => {
    setPrintedNotice(true);
    setTimeout(() => setPrintedNotice(false), 3500);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto text-foreground bg-card min-h-full">
      {/* Top Station Header */}
      <div className="border border-border bg-card p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-3">
          <div>
            <div className="flex items-center gap-2 text-[10px] tabular-nums uppercase tracking-wider text-muted-foreground">
              <span className="bg-primary text-primary-foreground px-1.5 py-0.5 font-semibold">PACK &amp; SHIP STATION</span>
              <span>•</span>
              <span className="text-foreground font-semibold">ROLLO-USB4 &amp; SCALE CONNECTED</span>
            </div>
            <h1 className="text-2xl font-semibold uppercase tracking-tight text-foreground mt-1">
              Shipping &amp; Label Printing Station
            </h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              Configure package dimensions, compare live commercial rates, and print 4x6 thermal labels.
            </p>
          </div>

          <div className="flex items-center border border-border divide-x divide-border text-[13px] tabular-nums">
            <div className="p-2.5 bg-card text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Queue</p>
              <p className="font-semibold text-foreground">12 Ready</p>
            </div>
            <div className="p-2.5 bg-card text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Thermal</p>
              <p className="font-semibold text-foreground">Rollo 203 DPI</p>
            </div>
            <div className="p-2.5 bg-card text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Scale</p>
              <p className="font-semibold text-foreground">Online (COM3)</p>
            </div>
          </div>
        </div>

        {/* Order Selector */}
        <div className="mt-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-[13px] tabular-nums">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="font-semibold text-foreground">DISPATCH:</span>
            <select className="h-8 px-2 border border-border bg-card font-semibold uppercase focus:outline-none w-full sm:w-96 cursor-pointer">
              <option>#ORD-2025-1048 — Sarah Johnson (Frisco, TX) • 3 items • 1.50 lbs</option>
              <option>#ORD-2025-1044 — Jessica Ramirez (Plano, TX) • 4 items • 3.80 lbs</option>
              <option>#ORD-2025-1040 — Kevin Vance (Dallas, TX) • 2 items • 9.40 lbs</option>
            </select>
          </div>

          <button 
            onClick={() => onNavigateSection?.('orders')}
            className="px-3 py-1.5 border border-border bg-card hover:bg-accent/50 font-semibold uppercase text-[13px] cursor-pointer"
          >
            Back to Orders
          </button>
        </div>
      </div>

      {/* Main 2-Column Pack Bench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Scale & Carrier Engine (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          {/* Destination Summary */}
          <div className="border border-border bg-card p-4 space-y-2 text-[13px]">
            <div className="flex items-center justify-between border-b border-border pb-2 tabular-nums">
              <span className="font-semibold uppercase text-[10px] text-muted-foreground">Destination: USPS CASS Certified</span>
              <span className="font-semibold text-foreground flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                DPV MATCH 100%
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="font-semibold text-sm uppercase text-foreground">Sarah Johnson</p>
                <p className="tabular-nums text-foreground">1234 Maple Drive<br />Frisco, TX 75034-4921</p>
              </div>
              <div className="border-l border-border pl-3 text-[12px] text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground uppercase text-[10px]">Package Items:</p>
                <p>• 2x Blueberry Facial Wash (16 oz)</p>
                <p>• 1x De-shedding Rake (5 oz)</p>
                <p>• 1x Hemp Treats (3 oz)</p>
              </div>
            </div>
          </div>

          {/* Scale & Dimensions */}
          <div className="border border-border bg-card p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2 text-[12px]">
              <span className="font-semibold uppercase text-[10px] text-muted-foreground">Package Weight &amp; Scale</span>
              <span className="font-semibold text-foreground">SCALE: LIVE</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="border border-border p-3 bg-muted/30 flex items-center justify-between">
                <div>
                  <p className="text-[10px] tabular-nums text-muted-foreground uppercase font-semibold">DIGITAL SCALE</p>
                  <p className="text-3xl font-semibold tabular-nums text-foreground">{weight.toFixed(2)} <span className="text-sm font-normal">LBS</span></p>
                </div>
                <button 
                  onClick={() => setWeight(0.00)}
                  className="px-2 py-1 border border-border bg-card text-[10px] tabular-nums font-semibold uppercase hover:bg-black hover:text-white transition-colors cursor-pointer"
                >
                  Tare
                </button>
              </div>

              <div className="space-y-1.5 text-[12px]">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Presets:</p>
                <div className="grid grid-cols-3 gap-1">
                  <button 
                    onClick={() => setWeight(0.75)} 
                    className="p-1 border border-border bg-card hover:bg-accent/50 text-[10px] font-semibold"
                  >
                    0.75#
                  </button>
                  <button 
                    onClick={() => setWeight(1.50)} 
                    className="p-1 border border-border bg-primary text-primary-foreground text-[10px] font-semibold"
                  >
                    1.50#
                  </button>
                  <button 
                    onClick={() => setWeight(3.80)} 
                    className="p-1 border border-border bg-card hover:bg-accent/50 text-[10px] font-semibold"
                  >
                    3.80#
                  </button>
                </div>
              </div>
            </div>

            {/* Box Presets */}
            <div className="space-y-1.5 text-[12px]">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Preset Box Size:</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'small', label: 'Small Box', dims: '8 x 6 x 4 in' },
                  { id: 'med', label: 'Med Box', dims: '12 x 9 x 6 in' },
                  { id: 'padded', label: 'Padded Mailer', dims: '10 x 7 x 1 in' },
                ].map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setBoxPreset(b.id as any)}
                    className={`p-2 border border-border text-left cursor-pointer transition-colors ${
                      boxPreset === b.id ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground hover:bg-accent/50'
                    }`}
                  >
                    <p className="font-semibold uppercase text-[11px]">{b.label}</p>
                    <p className="text-[10px]">{b.dims}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live Commercial Rates */}
          <div className="border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2 text-[12px]">
              <span className="font-semibold uppercase text-[10px] text-muted-foreground">Live Carrier Rates</span>
              <span className="font-semibold text-foreground">COMMERCIAL PLUS</span>
            </div>

            <div className="space-y-2">
              {rates.map((r) => (
                <div
                  key={r.id}
                  onClick={() => setSelectedCarrier(r.id)}
                  className={`border p-3 flex items-center justify-between cursor-pointer transition-all ${
                    selectedCarrier === r.id
                      ? 'border border-border bg-muted/30 shadow-card'
                      : 'border-border bg-background hover:bg-accent/50'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[13px] uppercase text-foreground">{r.carrier}</span>
                      <span className="px-1.5 py-0.2 border border-border text-[9px] tabular-nums font-semibold bg-card text-foreground">
                        {r.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground tabular-nums">{r.delivery}</p>
                  </div>
                  <div className="text-right tabular-nums">
                    <p className="text-base font-semibold text-foreground">${r.price.toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground/70 line-through">${r.retail.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Endorsement options */}
            <div className="pt-2 border-t border-border flex items-center justify-between text-[13px] tabular-nums">
              <label className="flex items-center gap-2 cursor-pointer font-semibold">
                <input 
                  type="checkbox"
                  checked={sigRequired}
                  onChange={(e) => setSigRequired(e.target.checked)}
                  className="rounded-md border-border accent-primary"
                />
                <span>Adult Signature Required (+$3.50)</span>
              </label>
              <span className="text-muted-foreground">Includes $100 Carrier Ins.</span>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleBuyAndPrint}
            className="w-full h-12 bg-black hover:bg-muted text-white font-semibold text-sm uppercase tracking-wider flex items-center justify-center gap-2 border border-border cursor-pointer transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Buy &amp; Print Label (${totalPrice})</span>
          </button>
        </div>

        {/* Right Column: 4x6 Thermal Label Visual Raster (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="border border-border bg-card p-3 flex items-center justify-between text-[12px]">
            <span className="font-semibold uppercase text-foreground">Live Raster Preview // 4&quot; × 6&quot; Thermal</span>
            <span className="px-2 py-0.5 border border-border bg-muted/40 text-[10px]">203 DPI · 1:1 SCALE</span>
          </div>

          {/* 4x6 Thermal Label Container */}
          <div className="border border-border bg-card p-5 max-w-md mx-auto shadow-md tabular-nums text-foreground space-y-3">
            {/* Header / Postage stamp */}
            <div className="border-b-4 border-border pb-2 flex items-start justify-between">
              <div>
                <p className="text-3xl font-semibold leading-none">P</p>
                <p className="text-[9px] uppercase font-semibold leading-tight mt-1">
                  U.S. POSTAGE PAID<br />
                  FRISCO TX<br />
                  PERMIT NO. 448
                </p>
              </div>
              <div className="text-right">
                <span className="border border-border px-2 py-0.5 font-semibold text-[13px] uppercase inline-block">
                  {currentRate.carrier}
                </span>
                <p className="text-[10px] font-semibold mt-1">COMMERCIAL PLUS</p>
                <p className="text-[10px] font-semibold">ZONE 2 • {weight.toFixed(2)} LBS</p>
              </div>
            </div>

            {/* Return Address & 2D Matrix */}
            <div className=" border-border pb-2 text-[10px] uppercase space-y-0.5">
              <p className="font-semibold">SHIP FROM:</p>
              <p className="font-semibold">ALL ABOUT PAWZ - MAIN SALON</p>
              <p>7820 MAIN STREET, SUITE 104</p>
              <p>FRISCO TX 75034-4001</p>
            </div>

            {/* Ship To Recipient */}
            <div className="border-b-4 border-border pb-3 pt-1 space-y-1">
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">SHIP TO:</p>
              <p className="text-base font-semibold uppercase leading-none">SARAH JOHNSON</p>
              <p className="text-sm font-semibold uppercase leading-tight">1234 MAPLE DRIVE</p>
              <p className="text-base font-semibold uppercase tracking-wide">FRISCO TX 75034-4921</p>
            </div>

            {/* Barcode representation */}
            <div className="py-2  border-border text-center space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider">USPS TRACKING # eVS</p>
              
              {/* Simulated high contrast barcode strip */}
              <div className="h-14 bg-black flex items-center justify-between px-1 py-0.5">
                {Array.from({ length: 48 }).map((_, i) => (
                  <span 
                    key={i} 
                    className={`h-full inline-block ${i % 3 === 0 ? 'bg-card w-1.5' : i % 2 === 0 ? 'bg-black w-1' : 'bg-card w-0.5'}`} 
                  />
                ))}
              </div>

              <p className="text-[13px] font-semibold tracking-wider">{currentRate.tracking}</p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-[9px] pt-1 uppercase font-semibold">
              <span className="border border-border px-1 py-0.5">★ FRAGILE // PET CARE LIQUIDS ★</span>
              <span>PKG 1 OF 1</span>
            </div>
          </div>

          {/* Quick Hardware Actions */}
          <div className="grid grid-cols-3 gap-2">
            <button 
              onClick={handleBuyAndPrint}
              className="p-2 border border-border bg-primary text-primary-foreground hover:bg-primary/90 text-[13px] font-semibold uppercase text-center cursor-pointer"
            >
              Print 4x6
            </button>
            <button 
              onClick={() => alert('Downloaded PDF')}
              className="p-2 border border-border bg-card hover:bg-accent/50 text-[13px] font-semibold uppercase text-center cursor-pointer"
            >
              Download PDF
            </button>
            <button 
              onClick={() => alert('Tracking SMS sent to customer')}
              className="p-2 border border-border bg-card hover:bg-accent/50 text-[13px] font-semibold uppercase text-center cursor-pointer"
            >
              SMS Tracking
            </button>
          </div>

          {printedNotice && (
            <div className="p-3 border border-border bg-primary text-primary-foreground text-[13px] tabular-nums flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>Label successfully spooled to Rollo Direct Thermal!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
