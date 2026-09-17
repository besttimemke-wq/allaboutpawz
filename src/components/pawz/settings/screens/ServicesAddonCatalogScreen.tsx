'use client';

import React, { useState } from 'react';

interface ScreenProps {
  systemSettings?: any;
  saveSettingsToDb?: (updates: any) => void;
  onNavigateScreen?: (screenId: string) => void;
  selectedLocation?: string;
  onSelectLocation?: (loc: string) => void;
}

export const ServicesAddonCatalogScreen: React.FC<ScreenProps> = ({
  onNavigateScreen,
}) => {
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const catalogItems = [
    { code: 'SVC-FG01', type: 'CORE SERVICE', name: 'Full Canine Styling & Bath', price: '$75.00', time: '90m', cat: 'GROOMING' },
    { code: 'SVC-BB02', type: 'CORE SERVICE', name: 'Hydro-Surge Bath & Brush', price: '$45.00', time: '45m', cat: 'BATH' },
    { code: 'SVC-DSP03', type: 'CORE SERVICE', name: 'Deluxe Holistic Spa Experience', price: '$95.00', time: '105m', cat: 'SPA' },
    { code: 'ADD-BLUE01', type: 'ADD-ON SPA', name: 'Organic Blueberry Facial Scrub', price: '$15.00', time: '+10m', cat: 'SPA' },
    { code: 'ADD-PAW02', type: 'ADD-ON SPA', name: 'Deep Moisture Paw Pad Wax', price: '$12.00', time: '+5m', cat: 'SPA' },
    { code: 'ADD-TEETH03', type: 'ADD-ON HYGIENE', name: 'Enzymatic Toothbrushing & Foam', price: '$14.00', time: '+10m', cat: 'HYGIENE' },
    { code: 'ADD-DESHED04', type: 'ADD-ON SERVICE', name: 'Undercoat Carding & Deshedding', price: '$25.00', time: '+20m', cat: 'GROOMING' },
    { code: 'ADD-FLEA05', type: 'ADD-ON MEDICATED', name: 'Botanical Flea & Tick Soak', price: '$28.00', time: '+20m', cat: 'MEDICATED' },
  ];

  const filteredItems = selectedCategory === 'ALL'
    ? catalogItems
    : catalogItems.filter((i) => i.cat === selectedCategory);

  return (
    <div className="w-full bg-card text-foreground font-sans antialiased text-[13px]">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-3 border border-white z-50 flex items-center gap-3 tabular-nums text-[13px] shadow-2xl">
          <span className="w-2 h-2 bg-card animate-pulse"></span>
          <span className="uppercase font-semibold tracking-wider">{toastMsg}</span>
          <button onClick={() => setToastMsg(null)} className="ml-2 text-white hover:opacity-70 cursor-pointer">✕</button>
        </div>
      )}

      {/* SUB-NAV STRIP */}
      <div className="w-full bg-card border-b border-border overflow-x-auto select-none">
        <div className="flex items-center min-w-max">
          <div className="px-3 py-2 bg-muted/40 border-r border-border flex items-center gap-2">
            <span className="w-2 h-2 bg-black"></span>
            <span className="tabular-nums text-[11px] uppercase tracking-wider text-foreground font-semibold">MODULE // CATALOG &amp; ADD-ONS</span>
          </div>
          <nav className="flex items-center text-[13px] tabular-nums">
            {[
              { label: 'Overview', id: 'overview' },
              { label: 'Pricing Matrix', id: 'services-pricing' },
              { label: '■ Catalog & Add-On Editor', id: 'services-catalog', active: true },
              { label: 'Booking Operations', id: 'booking-ops' },
              { label: 'Inventory SKU', id: 'oms-add-product' },
            ].map((tab) => (
              <button
                key={tab.label}
                onClick={() => onNavigateScreen?.(tab.id)}
                className={`px-3 py-2 border-r border-border/30 tabular-nums text-[13px] cursor-pointer transition-none flex items-center gap-1.5 ${
                  tab.active ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:bg-black hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* HEADER SECTION */}
      <div className="p-4 lg:p-6 border-b border-border">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] tabular-nums uppercase tracking-wider px-2 py-0.5 border border-border bg-primary text-primary-foreground font-semibold">
                SEC:14 // SERVICE MASTER DEFINITION
              </span>
              <span className="text-[10px] tabular-nums text-muted-foreground uppercase">
                TREATMENTS // ADD-ON SKUS // TIME DURATION OFFSETS
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-semibold uppercase tracking-tight font-sans text-foreground mt-1">
              Service Master Catalog &amp; Add-On Treatment Editor
            </h1>
            <p className="text-[13px] tabular-nums text-muted-foreground">
              Create and manage grooming services, luxury spa treatments, pricing overrides, and automated duration extensions.
            </p>
          </div>

          <div className="flex items-center gap-2 tabular-nums text-[13px]">
            <button
              onClick={() => showToast('NEW SERVICE MODAL OPEN')}
              className="h-8 px-4 bg-primary text-primary-foreground border border-border uppercase font-semibold hover:bg-muted cursor-pointer"
            >
              + Create Service / Add-On
            </button>
          </div>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="p-3 bg-muted/30 border-b border-border flex flex-wrap items-center justify-between gap-2 tabular-nums text-[13px] select-none">
        <div className="flex items-center gap-1 overflow-x-auto">
          {['ALL', 'GROOMING', 'BATH', 'SPA', 'HYGIENE', 'MEDICATED'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 border border-border uppercase font-semibold text-[10px] cursor-pointer ${
                selectedCategory === cat ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground hover:bg-muted'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="text-[10px] text-muted-foreground">SHOWING {filteredItems.length} ITEMS</div>
      </div>

      {/* CATALOG GRID */}
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 tabular-nums text-[13px]">
        {filteredItems.map((item) => (
          <div key={item.code} className="border-2-black bg-card p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-[10px]">{item.code}</span>
                <span className="bg-primary text-primary-foreground text-[9px] px-1.5 py-0.2 font-semibold uppercase">{item.type}</span>
              </div>
              <div className="font-sans font-semibold text-sm text-foreground mt-2 leading-tight">{item.name}</div>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between">
              <div className="flex items-baseline gap-2">
                <span className="font-sans font-semibold text-base">{item.price}</span>
                <span className="text-[10px] text-muted-foreground">{item.time}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => showToast(`EDITING ${item.name}`)}
                  className="px-2 py-1 border border-border text-[9px] uppercase font-semibold hover:bg-black hover:text-white cursor-pointer"
                >
                  Edit
                </button>
                <button
                  onClick={() => onNavigateScreen?.('services-pricing')}
                  className="px-2 py-1 border border-border text-[9px] uppercase font-semibold hover:bg-black hover:text-white cursor-pointer"
                >
                  Matrix
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
