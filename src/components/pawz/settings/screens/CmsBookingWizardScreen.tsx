'use client';

import React, { useState } from 'react';
import { 
  Sparkles, 
  Settings, 
  Palette, 
  Globe, 
  FileText, 
  RefreshCw, 
  Download, 
  Plus, 
  Image as ImageIcon,
  Lock,
  ChevronRight,
  Eye
} from 'lucide-react';

interface ScreenProps {
  onNavigateScreen?: (screenId: string) => void;
  selectedLocation?: string;
  onSelectLocation?: (loc: string) => void;
  systemSettings?: any;
  saveSettingsToDb?: (updates: any) => Promise<void>;
}

export const CmsBookingWizardScreen: React.FC<ScreenProps> = ({
  onNavigateScreen,
  selectedLocation,
  onSelectLocation,
  systemSettings,
  saveSettingsToDb,
}) => {
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [subdomain, setSubdomain] = useState('frisco');
  const [primaryColor, setPrimaryColor] = useState('#000000');
  const [fontFamily, setFontFamily] = useState('Plus Jakarta Sans');
  const [logoUrl, setLogoUrl] = useState('https://images.unsplash.com/photo-1516738901171-8eb4fc13bd20?w=128&h=128&fit=crop');

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (systemSettings) {
      if (systemSettings.portal_custom_domain) setSubdomain(systemSettings.portal_custom_domain.split('.')[0] || 'frisco');
      if (systemSettings.org_primary_color) setPrimaryColor(systemSettings.org_primary_color);
      if (systemSettings.org_logo_url) setLogoUrl(systemSettings.org_logo_url || logoUrl);
    }
  }, [systemSettings]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const [wizardStages, setWizardStages] = useState([
    { id: 'stage-1', code: 'WIZ_01', title: 'Location Selection', desc: 'Owner chooses physical salon location, distance sorting enabled', required: true, active: true },
    { id: 'stage-2', code: 'WIZ_02', title: 'Breed & Weight Classification', desc: 'Inputs breed metadata and weight to map service mass brackets', required: true, active: true },
    { id: 'stage-3', code: 'WIZ_03', title: 'Service catalog list picker', desc: 'Dynamically filters services based on pet weight mass brackets', required: true, active: true },
    { id: 'stage-4', code: 'WIZ_04', title: 'Upsell Add-ons Drawer', desc: 'Blueberry facials, teeth cleaning, dremel nails upsell items', required: false, active: true },
    { id: 'stage-5', code: 'WIZ_05', title: 'Smart Calendar Slot Booking', desc: 'Assigns optimal salon bay and matching groomer rsvp', required: true, active: true },
    { id: 'stage-6', code: 'WIZ_06', title: 'Interactive Roster Match', desc: 'Match with favorite groomer or pick first available', required: false, active: true },
    { id: 'stage-7', code: 'WIZ_07', title: 'Pet Health & Liability Consent', desc: 'Rabies vaccine compliance statement and liability waivers', required: true, active: true },
    { id: 'stage-8', code: 'WIZ_08', title: 'Stripe Authorized Deposit Checkout', desc: 'Authorize 50% deposit via credit card, Apple Pay, Google Pay', required: true, active: true },
  ]);

  const toggleStageActive = (id: string) => {
    setWizardStages(prev => prev.map(stage => {
      if (stage.id === id) {
        if (stage.required) {
          showToast('CANNOT DISABLE MANDATORY WIZARD STAGE');
          return stage;
        }
        showToast(`MUTATED STAGE VISIBILITY // STATE COMMITTED`);
        return { ...stage, active: !stage.active };
      }
      return stage;
    }));
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

      {/* SECURITY CLEARANCE BAR */}
      <div className="w-full bg-primary text-primary-foreground px-4 py-2 flex flex-wrap items-center justify-between border-b border-border text-[10px] tabular-nums tracking-wider uppercase">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 bg-destructive"></span>
          <span className="text-destructive font-semibold tracking-tight">RESTRICTED CMS DESIGNER</span>
          <span className="text-muted-foreground">{"//"}</span>
          <span className="text-white">AUTH_SCOPE: SUPER_ADMIN_LEVEL_0</span>
          <span className="text-muted-foreground">{"//"}</span>
          <span className="text-muted-foreground/50">NODE: TX-PROD-CMS-01</span>
        </div>
        <div className="flex items-center gap-4 text-[10px] tabular-nums text-muted-foreground/70">
          <span>CMS VERSION: v4.2.1-COMMIT</span>
          <span>DOMAINS REPLICATED: 4 SITES</span>
        </div>
      </div>

      {/* BREADCRUMB & EXECUTIVE TOOLBAR */}
      <div className="w-full bg-card border-b border-border p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 tabular-nums text-[10px] text-muted-foreground">
            <span>ADMIN SETTINGS</span>
            <span className="text-foreground font-semibold">&gt;&gt;</span>
            <span className="text-foreground font-semibold">CMS &amp; BOOKING WIZARD</span>
            <span className="text-foreground font-semibold">&gt;&gt;</span>
            <span className="bg-primary text-primary-foreground px-1 text-[9px] font-semibold">WIZARD DESIGNER</span>
          </div>
          <div className="flex items-baseline gap-2">
            <h1 className="font-semibold text-lg md:text-xl tracking-tight uppercase text-foreground">CMS &amp; CUSTOM BOOKING WIZARD</h1>
            <span className="tabular-nums text-[11px] text-muted-foreground">{"// FLOW DESIGNER"}</span>
          </div>
        </div>
        
        {/* ACTION BUTTONS */}
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => showToast('PREVIEWING DYNAMIC WIZARD IFRAME')}
            className="h-8 px-3 bg-card border border-border text-foreground tabular-nums text-[10px] uppercase hover:bg-black hover:text-white transition-none flex items-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            LIVE PREVIEW IN NEW WINDOW
          </button>
           <button 
            onClick={async () => {
              if (saveSettingsToDb) {
                await saveSettingsToDb({
                  portal_custom_domain: `${subdomain}.allaboutpawz.com`,
                  org_primary_color: primaryColor,
                  org_logo_url: logoUrl,
                });
              }
              showToast('CMS CONTROLS SAVED TO CLOUD CONFIGS & SUPABASE DB');
            }}
            className="h-8 px-3 bg-primary text-primary-foreground border border-border tabular-nums text-[10px] uppercase hover:bg-muted transition-none flex items-center gap-1.5 cursor-pointer"
          >
            SAVE CHANGES
          </button>
        </div>
      </div>

      {/* RESTRICTED SETTINGS SUB-NAV TAB MATRIX */}
      <div className="w-full bg-muted/40 border-b border-border overflow-x-auto">
        <div className="flex items-stretch min-w-max text-[11px] tabular-nums">
          <button onClick={() => onNavigateScreen?.('org-multiloc')} className="px-4 py-2 border-r border-border/20 hover:bg-card text-muted-foreground cursor-pointer">
            01 LOCATIONS &amp; SALONS
          </button>
          <button onClick={() => onNavigateScreen?.('users-staff')} className="px-4 py-2 border-r border-border/20 hover:bg-card text-muted-foreground cursor-pointer">
            02 USERS, STAFF &amp; ROLES
          </button>
          <button onClick={() => onNavigateScreen?.('booking-rules')} className="px-4 py-2 border-r border-border/20 hover:bg-card text-muted-foreground cursor-pointer">
            03 BOOKING RULES &amp; POLICIES
          </button>
          <button onClick={() => onNavigateScreen?.('revenue-stripe')} className="px-4 py-2 border-r border-border/20 hover:bg-card text-muted-foreground cursor-pointer">
            04 REVENUE &amp; STRIPE GATEWAY
          </button>
          <button onClick={() => onNavigateScreen?.('system-telemetry')} className="px-4 py-2 border-r border-border/20 hover:bg-card text-muted-foreground cursor-pointer">
            05 SYSTEM HEALTH &amp; TELEMETRY
          </button>
          <button onClick={() => onNavigateScreen?.('services-pricing')} className="px-4 py-2 border-r border-border/20 hover:bg-card text-muted-foreground cursor-pointer">
            06 SERVICES &amp; PRICING MATRIX
          </button>
          <button onClick={() => onNavigateScreen?.('analytics-reporting')} className="px-4 py-2 border-r border-border/20 hover:bg-card text-muted-foreground cursor-pointer">
            07 ANALYTICS &amp; REPORTING
          </button>
          <div className="px-4 py-2 bg-primary text-primary-foreground border-r border-border flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-card inline-block"></span>
            <span>08 CMS &amp; BOOKING WIZARD</span>
            <span className="text-[9px] px-1 bg-card text-foreground uppercase font-semibold ml-1">[ACTIVE]</span>
          </div>
        </div>
      </div>

      {/* TWO COLUMN WIZARD CONFIGURATION GRID */}
      <div className="p-6 grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* COLUMN 1-7: DYNAMIC FLOW STAGES BUILDER */}
        <div className="xl:col-span-7 bg-card border border-border flex flex-col">
          <div className="px-4 py-2.5 border-b border-border bg-muted/40 flex items-center justify-between tabular-nums">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-foreground" />
              <span className="font-semibold text-[13px] uppercase text-foreground">Booking Wizard Flow Stages</span>
            </div>
            <span className="text-[10px] text-muted-foreground font-semibold">5 Steps</span>
          </div>

          <div className="p-4 bg-muted/30 border-b border-border tabular-nums text-[13px] leading-relaxed text-muted-foreground">
            Control the sequence and availability of active stages inside the booking workflow. Mandatory stages are marked with <span className="bg-primary text-primary-foreground px-1 text-[9px] font-semibold">REQUIRED</span> and cannot be skipped by pet owners.
          </div>

          <div className="divide-y divide-border tabular-nums text-[13px]">
            {wizardStages.map((stage) => (
              <div key={stage.id} className="p-3.5 bg-card hover:bg-muted/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-muted/40 border border-border/20 px-1 py-0.5 text-[9px] font-semibold text-foreground">{stage.code}</span>
                    <span className="font-semibold text-foreground text-[13px] uppercase">{stage.title}</span>
                    {stage.required && (
                      <span className="bg-primary text-primary-foreground px-1.5 py-0.2 text-[9px] font-semibold uppercase">REQUIRED</span>
                    )}
                  </div>
                  <p className="text-muted-foreground font-sans leading-tight">{stage.desc}</p>
                </div>
                
                <div className="flex items-center gap-3 tabular-nums">
                  <button 
                    onClick={() => toggleStageActive(stage.id)}
                    className={`px-3 py-1 text-[13px] font-semibold border transition-colors cursor-pointer ${
                      stage.active 
                        ? 'bg-primary text-primary-foreground border-border hover:bg-muted' 
                        : 'bg-card text-muted-foreground/70 border-border hover:bg-muted/30'
                    }`}
                  >
                    {stage.active ? 'ACTIVE [SHOW]' : 'DISABLED [HIDE]'}
                  </button>
                  <button onClick={() => showToast('STAGE METADATA EDIT ACTIVE')} className="border border-border px-2.5 py-1 text-[13px] hover:bg-muted/40 font-semibold uppercase cursor-pointer">
                    [CONFIG]
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COLUMN 8-12: BRANDING, SUBDOMAIN & COLOR MATRIX CONFIG */}
        <div className="xl:col-span-5 bg-card border border-border flex flex-col">
          <div className="px-4 py-2.5 border-b border-border bg-muted/40 flex items-center justify-between tabular-nums">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-foreground" />
              <span className="font-semibold text-[13px] uppercase text-foreground">Branding &amp; Domain Settings</span>
            </div>
          </div>

          <div className="p-4 space-y-5">
            {/* Subdomain Router Mapping */}
            <div className="space-y-1.5 tabular-nums text-[13px]">
              <label className="block text-[10px] text-muted-foreground uppercase font-semibold">WIZARD SUBDOMAIN HOSTING ROUTER</label>
              <div className="flex items-center">
                <input 
                  type="text" 
                  value={subdomain} 
                  onChange={(e) => { setSubdomain(e.target.value); showToast('SUBDOMAIN PREVIEW MOUNTED'); }}
                  className="flex-1 border-2  border-border p-2 bg-muted/30 focus:outline-none focus:bg-card font-semibold" 
                />
                <span className="border-2 border-border p-2 bg-muted/40 font-semibold tabular-nums text-foreground">.pawzbookings.com</span>
              </div>
              <p className="text-muted-foreground font-sans leading-tight mt-1 text-[11px]">Maps physical location settings to specific booking tunnels. e.g. <code className="bg-muted/40 px-1 font-semibold text-foreground">https://frisco.pawzbookings.com</code></p>
            </div>

            {/* Custom Logo Upload Preview */}
            <div className="space-y-1.5 tabular-nums text-[13px]">
              <label className="block text-[10px] text-muted-foreground uppercase font-semibold">BRAND IDENTITY LOGO MARK</label>
              <div className="border border-border p-3 bg-muted/30 flex items-center gap-4">
                <div className="relative w-14 h-14 bg-card border border-border shrink-0 overflow-hidden flex items-center justify-center">
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                </div>
                <div className="space-y-2 flex-1">
                  <input 
                    type="text" 
                    value={logoUrl} 
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="w-full border border-border p-1 text-[13px] focus:outline-none tabular-nums text-muted-foreground bg-card" 
                    placeholder="Logo URL"
                  />
                  <div className="flex items-center gap-2">
                    <button onClick={() => showToast('UPLOADING AVATAR TO SUPABASE CDN')} className="bg-primary text-primary-foreground px-2.5 py-1 text-[10px] hover:bg-muted font-semibold uppercase cursor-pointer flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" />
                      REPLACE LOGO
                    </button>
                    <button onClick={() => { setLogoUrl(''); showToast('LOGO DELETED'); }} className="border border-border bg-card text-foreground px-2.5 py-1 text-[10px] hover:bg-muted/40 font-semibold uppercase cursor-pointer">REMOVE</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Typography Pairing */}
            <div className="space-y-1.5 tabular-nums text-[13px]">
              <label className="block text-[10px] text-muted-foreground uppercase font-semibold">TYPOGRAPHY PAIRING MODEL</label>
              <select 
                value={fontFamily}
                onChange={(e) => { setFontFamily(e.target.value); showToast(`FONT FAMILY SWITCHED TO ${e.target.value}`); }}
                className="w-full border-2 border-border p-2 bg-card font-semibold focus:outline-none cursor-pointer"
              >
                <option value="Plus Jakarta Sans">Plus Jakarta Sans (SaaS &amp; Product Density)</option>
                <option value="Playfair Display">Playfair Display (Premium Luxury Editorial)</option>
                <option value="Space Grotesk">Space Grotesk (Tech Modernist Monochrome)</option>
                <option value="Inter">Inter UI (Default System Standard)</option>
              </select>
            </div>

            {/* Custom Color Palette */}
            <div className="space-y-1.5 tabular-nums text-[13px]">
              <label className="block text-[10px] text-muted-foreground uppercase font-semibold">BRAND COLOR MATRIX</label>
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-border p-2.5 bg-muted/30 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] text-muted-foreground block uppercase">PRIMARY ACCENT</span>
                    <span className="font-semibold">{primaryColor}</span>
                  </div>
                  <input 
                    type="color" 
                    value={primaryColor} 
                    onChange={(e) => setPrimaryColor(e.target.value)} 
                    className="w-8 h-8 rounded-md border border-border cursor-pointer bg-transparent" 
                  />
                </div>
                <div className="border border-border p-2.5 bg-muted/30 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] text-muted-foreground block uppercase">SECONDARY TEXT</span>
                    <span className="font-semibold">#404040</span>
                  </div>
                  <div className="w-8 h-8 bg-muted border border-border shrink-0"></div>
                </div>
              </div>
            </div>

            {/* Footer Custom Disclaimer */}
            <div className="space-y-1.5 tabular-nums text-[13px] pt-2 border-t border-border/20">
              <label className="block text-[10px] text-muted-foreground uppercase font-semibold">FOOTER CUSTOM COMPLIANCE DISCLAIMER</label>
              <textarea 
                defaultValue="By submitting this booking, you explicitly consent to our Senior Pet Stress Protocol, authorize emergency veterinary care up to $1,500.00, and certify your pet has a valid Rabies vaccine on record."
                className="w-full h-20 border border-border p-2 text-[13px] bg-muted/30 focus:outline-none focus:bg-card text-muted-foreground tabular-nums resize-none leading-relaxed"
              />
              <span className="text-[9px] text-muted-foreground block">Maximum 250 characters. Dynamically rendered on Stage 8 of checkout.</span>
            </div>

          </div>
        </div>

      </div>

      {/* SUPER ADMIN SECURITY LOCK FOOTER / HARDWARE ATTESTATION */}
      <div className="w-full bg-muted/30 border-t border-border border-b border-border p-4 flex flex-col md:flex-row items-center justify-between gap-4 select-none tabular-nums text-[13px]">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-primary text-primary-foreground flex items-center justify-center border border-border font-semibold">
            <Lock className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-[10px] font-semibold text-foreground uppercase">
              <span>SUPER_ADMIN LEVEL 0 // WIZARD SCHEMA ACCESS</span>
              <span className="border border-border px-1.5 bg-card text-[9px] font-semibold">[YUBIKEY_FIDO2_ACTIVE]</span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Changes to booking subdomains, DNS CNAME records, or Stripe deposit webhooks require dual-signature multi-factor ratification.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-[10px] uppercase">AUDIT TRAIL:</span>
          <span className="border border-border bg-card px-2 py-0.5 text-foreground font-semibold tabular-nums">CMS_REF #TX-91029-2025</span>
          <button 
            onClick={() => showToast('SUPER_ADMIN ENCLAVE SESSION TERMINATED')}
            className="h-6 px-3 bg-primary text-primary-foreground text-[10px] uppercase font-semibold hover:bg-muted transition-none cursor-pointer"
          >
            TERMINATE SESSION
          </button>
        </div>
      </div>

      {/* MONOCHROME TERMINAL STATUS LINE */}
      <div className="w-full bg-primary text-primary-foreground px-4 py-1.5 flex items-center justify-between tabular-nums text-[11px]">
        <div className="flex items-center gap-2">
          <span>&gt; CMS_DAEMON: ACTIVE</span>
          <span className="inline-block w-[7px] h-[14px] bg-card animate-pulse"></span>
        </div>
        <div className="flex items-center gap-4 text-muted-foreground/70">
          <span>HOST: CMS-RENDERER</span>
          <span>DOMAINS: 4</span>
          <span>DAWG-OS CMS ENGINE v2.0</span>
        </div>
      </div>
    </div>
  );
};
