'use client';

import React, { useState } from 'react';

interface ScreenProps {
  onNavigateScreen?: (screenId: string) => void;
  selectedLocation?: string;
  onSelectLocation?: (loc: string) => void;
}

export const CmsWizardThemeScreen: React.FC<ScreenProps> = ({
  onNavigateScreen,
}) => {
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [heroHeadline, setHeroHeadline] = useState('Premier Canine Styling, Luxury Spa & Wellness Retreat');
  const [heroSubheadline, setHeroSubheadline] = useState('Bespoke grooming experiences tailored to your dog’s unique breed, coat texture, and temperament.');
  const [bookingHeadline, setBookingHeadline] = useState('RESERVE A GROOMING SESSION');
  const [accentColor, setAccentColor] = useState('#000000');
  const [showReviews, setShowReviews] = useState(true);
  const [showPricingEstimate, setShowPricingEstimate] = useState(true);
  const [showVaccineNotice, setShowVaccineNotice] = useState(true);
  const [saving, setSaving] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      showToast('CMS & BOOKING WIZARD TEMPLATE DEPLOYED TO EDGE CDN');
    }, 600);
  };

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
            <span className="tabular-nums text-[11px] uppercase tracking-wider text-foreground font-semibold">MODULE // CMS &amp; WEBSITE</span>
          </div>
          <nav className="flex items-center text-[13px] tabular-nums">
            {[
              { label: 'Overview', id: 'overview' },
              { label: 'Organization', id: 'org-multiloc' },
              { label: 'Customer Portal', id: 'customer-portal' },
              { label: '■ Website & Booking Wizard', id: 'cms-wizard', active: true },
              { label: 'Social & Directories', id: 'org-social' },
              { label: 'Services Matrix', id: 'services-pricing' },
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
                SEC:08 // CONTENT MANAGEMENT SYSTEM
              </span>
              <span className="text-[10px] tabular-nums text-muted-foreground uppercase">
                EMBEDDABLE WIZARD // MICRO-SITE GENERATOR // HERO LAYOUTS
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-semibold uppercase tracking-tight font-sans text-foreground mt-1">
              Public Website, Booking Wizard &amp; Theme Engine
            </h1>
            <p className="text-[13px] tabular-nums text-muted-foreground">
              Customize public web copy, booking wizard steps, embed code generation, and typography tokens.
            </p>
          </div>

          <div className="flex items-center gap-2 tabular-nums text-[13px]">
            <button
              onClick={() => showToast('PREVIEWING CLIENT BOOKING WIZARD IN MODAL')}
              className="h-8 px-3 border border-border bg-card uppercase font-semibold hover:bg-muted/40 cursor-pointer"
            >
              👁 Live Preview
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="h-8 px-4 bg-primary text-primary-foreground border border-border uppercase font-semibold hover:bg-muted cursor-pointer"
            >
              {saving ? 'DEPLOYING...' : '[PUBLISH LIVE CHANGES]'}
            </button>
          </div>
        </div>
      </div>

      {/* MAIN SPLIT: CONFIGURATION (LEFT 7 COLS) & LIVE PREVIEW CANVAS (RIGHT 5 COLS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 bg-black gap-px border-b border-border">
        {/* LEFT 7 COLS: CMS CONFIGURATION */}
        <div className="lg:col-span-7 bg-card p-5 space-y-6 tabular-nums text-[13px]">
          {/* SECTION 1: PUBLIC HOMEPAGE HERO */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="font-semibold text-foreground uppercase">01 // PUBLIC HOMEPAGE HERO CONTENT</span>
              <span className="text-[10px] text-muted-foreground">HEADLINE / VALUE PROP</span>
            </div>
            <div>
              <label className="text-muted-foreground uppercase text-[10px] block mb-1">HERO MAIN HEADLINE</label>
              <input
                value={heroHeadline}
                onChange={(e) => setHeroHeadline(e.target.value)}
                className="w-full border border-border p-2 font-semibold bg-muted/30 focus:bg-card focus:outline-none text-[13px]"
                type="text"
              />
            </div>
            <div>
              <label className="text-muted-foreground uppercase text-[10px] block mb-1">HERO SUBHEADING / MISSION</label>
              <textarea
                value={heroSubheadline}
                onChange={(e) => setHeroSubheadline(e.target.value)}
                className="w-full border border-border p-2 bg-muted/30 focus:bg-card focus:outline-none text-[13px]"
                rows={2}
              />
            </div>
          </div>

          {/* SECTION 2: BOOKING WIZARD STEP CONFIGURATION */}
          <div className="space-y-3 pt-3 border-t border-border">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="font-semibold text-foreground uppercase">02 // CLIENT BOOKING WIZARD SEQUENCING</span>
              <span className="text-[9px] border border-border px-1.5 py-0.2 bg-primary text-primary-foreground font-semibold">5 STEPS</span>
            </div>
            <div>
              <label className="text-muted-foreground uppercase text-[10px] block mb-1">WIZARD TITLE HEADER</label>
              <input
                value={bookingHeadline}
                onChange={(e) => setBookingHeadline(e.target.value)}
                className="w-full border border-border p-2 font-semibold bg-muted/30 focus:bg-card focus:outline-none text-[13px]"
                type="text"
              />
            </div>

            {/* Steps Sequence Cards */}
            <div className="space-y-2">
              {[
                { step: 'STEP 1', name: 'Location Selection', desc: 'Client selects physical salon branch or mobile dispatch zone', req: 'LOCKED' },
                { step: 'STEP 2', name: 'Pet Information & Size Tier', desc: 'Breed lookup, weight bracket, coat condition & temper evaluation', req: 'LOCKED' },
                { step: 'STEP 3', name: 'Service Tier & Add-On Selection', desc: 'Dynamic price estimation based on pet criteria matrix', req: 'LOCKED' },
                { step: 'STEP 4', name: 'Date, Time & Groomer Preference', desc: 'Live calendar sync with sanitization buffer calculations', req: 'LOCKED' },
                { step: 'STEP 5', name: 'Deposit Settlement & Health Waiver', desc: 'Rabies validation + Stripe card on file verification', req: 'LOCKED' },
              ].map((s) => (
                <div key={s.step} className="border border-border p-2.5 bg-muted/30 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-primary text-primary-foreground text-[9px] px-1.5 py-0.2 font-semibold">{s.step}</span>
                      <span className="font-semibold text-[13px]">{s.name}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{s.desc}</div>
                  </div>
                  <span className="border border-border bg-card text-[9px] px-2 py-0.5 font-semibold">{s.req}</span>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 3: DISPLAY TOGGLES */}
          <div className="space-y-3 pt-3 border-t border-border">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="font-semibold text-foreground uppercase">03 // WIZARD DISPLAY MODULES</span>
              <span className="text-[10px] text-muted-foreground">OPT-IN MODULES</span>
            </div>

            <div className="space-y-2">
              <label className="flex items-center justify-between p-2 border border-border cursor-pointer bg-card">
                <div>
                  <div className="font-semibold">Show Verified Customer Reviews</div>
                  <div className="text-[10px] text-muted-foreground">Render 5-star Google / Yelp badge in booking footer</div>
                </div>
                <input
                  type="checkbox"
                  checked={showReviews}
                  onChange={(e) => setShowReviews(e.target.checked)}
                  className="w-4 h-4 rounded-md accent-black cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2 border border-border cursor-pointer bg-card">
                <div>
                  <div className="font-semibold">Live Transparent Price Breakdown</div>
                  <div className="text-[10px] text-muted-foreground">Display itemized base rate + size fee before final checkout step</div>
                </div>
                <input
                  type="checkbox"
                  checked={showPricingEstimate}
                  onChange={(e) => setShowPricingEstimate(e.target.checked)}
                  className="w-4 h-4 rounded-md accent-black cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2 border border-border cursor-pointer bg-card">
                <div>
                  <div className="font-semibold">Mandatory Texas Rabies Notice Banner</div>
                  <div className="text-[10px] text-muted-foreground">Display statutory notice that expired vaccine pets cannot enter premises</div>
                </div>
                <input
                  type="checkbox"
                  checked={showVaccineNotice}
                  onChange={(e) => setShowVaccineNotice(e.target.checked)}
                  className="w-4 h-4 rounded-md accent-black cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* EMBED WIDGET CODE SNIPPET */}
          <div className="pt-3 border-t border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold uppercase">EMBEDDABLE IFRAME / SCRIPT TAG</span>
              <button
                onClick={() => showToast('SNIPPET COPIED TO SYSTEM CLIPBOARD')}
                className="px-2 py-0.5 border border-border text-[9px] uppercase font-semibold hover:bg-black hover:text-white cursor-pointer"
              >
                Copy HTML Code
              </button>
            </div>
            <div className="bg-primary text-primary-foreground p-2.5 tabular-nums text-[10px] overflow-x-auto select-all">
              {`<iframe src="https://booking.allaboutpawz.com/embed" width="100%" height="700" frameborder="0" style="border:1px solid #000;"></iframe>`}
            </div>
          </div>
        </div>

        {/* RIGHT 5 COLS: INTERACTIVE MOCK PREVIEW */}
        <div className="lg:col-span-5 bg-muted/40 p-5 flex flex-col justify-between tabular-nums text-[13px]">
          <div>
            <div className="flex items-center justify-between border-b border-border pb-2 mb-4">
              <span className="font-semibold uppercase text-foreground">LIVE SIMULATOR // WIZARD UI</span>
              <span className="bg-primary text-primary-foreground px-1.5 py-0.2 text-[9px] font-semibold">CLIENT VIEW</span>
            </div>

            {/* Mock Phone / Container Preview */}
            <div className="border-2-black bg-card p-4 shadow-none space-y-4">
              {/* Mock Header */}
              <div className="border-b border-border pb-3 text-center">
                <div className="w-10 h-10 bg-primary text-primary-foreground mx-auto flex items-center justify-center font-semibold text-lg mb-1">
                  🐾
                </div>
                <div className="font-sans font-semibold uppercase tracking-tight text-sm text-foreground">
                  ALL ABOUT PAWZ
                </div>
                <div className="text-[9px] text-muted-foreground uppercase mt-0.5 tracking-wider">
                  CANINE SPA &amp; BOUTIQUE
                </div>
              </div>

              {/* Mock Banner */}
              {showVaccineNotice && (
                <div className="border border-border p-1.5 bg-muted/40 text-center text-[9px] font-semibold uppercase text-foreground">
                  ⚠️ NOTICE: Proof of current Rabies vaccination mandatory at check-in
                </div>
              )}

              {/* Mock Step Indicator */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-muted-foreground uppercase">
                  <span>STEP 1 OF 5</span>
                  <span>LOCATION SELECT</span>
                </div>
                <div className="w-full bg-muted h-1.5">
                  <div className="bg-black h-full w-1/5"></div>
                </div>
              </div>

              {/* Mock Step Content */}
              <div className="space-y-2">
                <div className="font-sans font-semibold uppercase text-[13px] text-foreground">
                  {bookingHeadline}
                </div>
                <div className="text-[11px] text-muted-foreground font-sans">
                  Select your preferred salon facility or mobile grooming unit:
                </div>

                <div className="space-y-1.5">
                  <div className="border border-border p-2 bg-muted/30 flex items-center justify-between cursor-pointer">
                    <div>
                      <div className="font-semibold text-[13px]">Frisco Main Salon (HQ)</div>
                      <div className="text-[10px] text-muted-foreground">8811 Preston Road, Frisco TX</div>
                    </div>
                    <span className="bg-primary text-primary-foreground text-[9px] px-1.5 py-0.5 font-semibold">SELECT</span>
                  </div>
                  <div className="border border-border p-2 bg-card flex items-center justify-between cursor-pointer">
                    <div>
                      <div className="font-semibold text-[13px]">Plano West Facility</div>
                      <div className="text-[10px] text-muted-foreground">6200 Coit Rd, Plano TX</div>
                    </div>
                    <span className="border border-border text-[9px] px-1.5 py-0.5 font-semibold">CHOOSE</span>
                  </div>
                </div>
              </div>

              {/* Mock Price / Review Footer */}
              {showReviews && (
                <div className="pt-3 border-t border-border text-center text-[10px] text-muted-foreground">
                  ★★★★★ 4.9/5 Rating across 420+ Dallas Pet Owners
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 p-2.5 border border-border bg-card text-[10px] text-muted-foreground">
            ENGINE STATUS: Auto-compiled with Tailwind utility tokens. No CDN hydration lag.
          </div>
        </div>
      </div>
    </div>
  );
};
