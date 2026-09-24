'use client';

import React, { useState } from 'react';
import { 
  Sliders, 
  MapPin, 
  ShieldCheck, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  FileText, 
  Download, 
  Printer, 
  Lock, 
  Save, 
  Settings,
  HelpCircle,
  History,
  FileCheck
} from 'lucide-react';

interface ScreenProps {
  onNavigateScreen?: (screenId: string) => void;
  selectedLocation?: string;
  onSelectLocation?: (loc: string) => void;
  systemSettings?: any;
  saveSettingsToDb?: (updates: any) => Promise<void>;
}

export const PaymentsTaxLegalScreen: React.FC<ScreenProps> = ({
  onNavigateScreen,
  selectedLocation,
  onSelectLocation,
  systemSettings,
  saveSettingsToDb,
}) => {
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
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

      {/* SUB-NAV / PATH BANNER */}
      <div className="px-6 py-2 border-b border-border bg-muted/30 flex items-center justify-between text-[13px] tabular-nums">
        <div className="flex items-center gap-2">
          <span className="font-semibold">ADMIN SETTINGS</span>
          <span className="text-muted-foreground/70">&gt;&gt;</span>
          <span className="bg-primary text-primary-foreground px-2 py-0.5">ORGANIZATION &amp; MULTI-LOCATION MANAGEMENT</span>
          <span className="text-muted-foreground/70">{"//"}</span>
          <span className="border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase">RESTRICTED // ADMIN PERMISSION REQUIRED</span>
          <span className="text-muted-foreground/70">{"//"}</span>
          <span className="text-muted-foreground">STATION_ID: HQ-OPS-ROOT</span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => showToast('ADD NEW LOCATION INITIALIZED')}
            className="border border-border bg-card px-2.5 py-1 hover:bg-black hover:text-white font-semibold text-[13px] uppercase flex items-center gap-1.5 cursor-pointer"
          >
            <span>+ ADD NEW LOCATION</span>
          </button>
          <button 
            onClick={async () => {
              if (saveSettingsToDb) {
                await saveSettingsToDb({
                  payment_processing_mode: 'production',
                });
              }
              showToast('LEGAL & TAX CONFIGURATION COMMITTED TO CLUSTER & PERSISTED');
            }}
            className="bg-primary text-primary-foreground px-3 py-1 hover:bg-muted font-semibold text-[13px] uppercase flex items-center gap-1.5 cursor-pointer"
          >
            <span>[SAVE CONFIG CHANGES]</span>
          </button>
        </div>
      </div>

      {/* PAGE TITLE & SUMMARY HEADER */}
      <div className="p-6 border-b border-border">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="text-[13px] tabular-nums uppercase text-muted-foreground tracking-wider">BUSINESS PROFILE // ENTITY STRUCTURE // MULTI-UNIT SYNC</div>
            <h2 className="text-2xl font-semibold uppercase tracking-tight mt-1">ORGANIZATION, MULTI-LOCATION &amp; BRAND SETTINGS</h2>
            <p className="text-[13px] tabular-nums text-muted-foreground mt-1 max-w-3xl">
              Configure enterprise brand identities, manage multi-facility tax &amp; merchant bindings, configure physical salon operating hours, and govern global salon holidays across North Texas facilities.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="border border-border p-2.5 bg-muted/30 text-right min-w-[120px]">
              <div className="text-[10px] tabular-nums text-muted-foreground uppercase">ACTIVE LOCATIONS</div>
              <div className="text-xl font-semibold tabular-nums">03 SALONS</div>
            </div>
            <div className="border border-border p-2.5 bg-muted/30 text-right min-w-[120px]">
              <div className="text-[10px] tabular-nums text-muted-foreground uppercase">ACTIVE STAFF</div>
              <div className="text-xl font-semibold tabular-nums">24 TEAM</div>
            </div>
            <div className="border border-border p-2.5 bg-muted/30 text-right min-w-[140px]">
              <div className="text-[10px] tabular-nums text-muted-foreground uppercase">ENTERPRISE ENTITY</div>
              <div className="text-sm font-semibold tabular-nums truncate">All About Pawz Holdings</div>
            </div>
          </div>
        </div>

        {/* OPERATIONS INNER TABS */}
        <div className="flex items-center gap-1 mt-6 border-b border-border -mb-6">
          <button onClick={() => onNavigateScreen?.('org-multiloc')} className="px-4 py-2 bg-muted/40 hover:bg-muted text-foreground tabular-nums text-[13px] font-semibold border-t border-l border-r border-border uppercase cursor-pointer">
            LOCATIONS &amp; SALONS (3)
          </button>
          <button onClick={() => onNavigateScreen?.('org-brand')} className="px-4 py-2 bg-muted/40 hover:bg-muted text-foreground tabular-nums text-[13px] font-semibold border-t border-l border-r border-border uppercase cursor-pointer">
            BRAND &amp; VISUAL IDENTITY
          </button>
          <button onClick={() => onNavigateScreen?.('booking-rules')} className="px-4 py-2 bg-muted/40 hover:bg-muted text-foreground tabular-nums text-[13px] font-semibold border-t border-l border-r border-border uppercase cursor-pointer">
            OPERATING &amp; HOLIDAY HOURS
          </button>
          <button onClick={() => onNavigateScreen?.('org-social')} className="px-4 py-2 bg-muted/40 hover:bg-muted text-foreground tabular-nums text-[13px] font-semibold border-t border-l border-r border-border uppercase cursor-pointer">
            SOCIAL LINKS &amp; DIRECTORIES
          </button>
          <button onClick={() => {}} className="px-4 py-2 bg-primary text-primary-foreground tabular-nums text-[13px] font-semibold border-t border-l border-r border-border uppercase cursor-pointer">
            ■ TAX &amp; LEGAL ENTITY
          </button>
        </div>
      </div>

      {/* MAIN CONFIGURATION GRID */}
      <div className="p-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* COLUMN 1 & 2 */}
        <div className="xl:col-span-2 space-y-6">
          {/* SECTION A */}
          <div className="border-2 border-border p-5 bg-card">
            <div className="flex items-start justify-between border-b border-border pb-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 bg-primary text-primary-foreground tabular-nums font-semibold flex items-center justify-center text-[13px]">A</div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-base uppercase">SECTION A: CORPORATE LEGAL ENTITY &amp; REGISTRATION</h3>
                    <span className="bg-primary text-primary-foreground tabular-nums text-[10px] px-1.5 py-0.2 font-semibold uppercase">VERIFIED ENTITY</span>
                  </div>
                  <div className="text-[13px] tabular-nums text-muted-foreground">TX SOS FILE: 0804921940 // REGISTRATION STATUS: ACTIVE GOOD STANDING</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => showToast('SOS DIGITAL CERTIFICATE EXPORTED')} className="border border-border px-2 py-1 text-[13px] tabular-nums font-semibold hover:bg-muted/40 uppercase cursor-pointer">[EXPORT SOS CERT]</button>
                <button onClick={() => showToast('LEGAL ENTITY REVISION ACTIVE')} className="bg-primary text-primary-foreground px-2 py-1 text-[13px] tabular-nums font-semibold hover:bg-muted uppercase cursor-pointer">[EDIT FILING]</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px] tabular-nums">
              <div className="space-y-1">
                <span className="text-muted-foreground uppercase text-[10px] block">LEGAL BUSINESS NAME</span>
                <p className="font-semibold text-sm">All About Pawz Holdings LLC</p>
                <p className="text-muted-foreground">dba All About Pawz</p>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground uppercase text-[10px] block">ENTITY STRUCTURE</span>
                <p className="font-semibold">DOMESTIC LIMITED LIABILITY COMPANY</p>
                <p className="text-muted-foreground">Texas SOS File #0804921940 // Formation: 2021</p>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground uppercase text-[10px] block">FEDERAL TAX IDENTIFIER (EIN)</span>
                <p className="font-semibold text-sm">XX-XXX9812</p>
                <p className="text-muted-foreground">[VERIFIED IRS FORM SS-4 ON FILE]</p>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground uppercase text-[10px] block">REGISTERED AGENT &amp; LEGAL ADDRESS</span>
                <p className="font-semibold">1234 MAPLE DRIVE</p>
                <p className="">FRISCO, TX 75034</p>
                <p className="text-muted-foreground">COUNTY: COLLIN // ZONE 1 HQ</p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border bg-muted/30 p-3 tabular-nums text-[13px]">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold uppercase text-[11px] flex items-center gap-2">
                  <span className="w-2 h-2 bg-black inline-block"></span>
                  COMMERCIAL GENERAL LIABILITY &amp; GROOMING BAILMENT INSURANCE
                </span>
                <span className="bg-primary text-primary-foreground text-[9px] px-1.5 py-0.5 font-semibold uppercase">STATUS: CURRENT</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px]">
                <div>
                  <span className="text-muted-foreground block text-[9px] uppercase">UNDERWRITER / POLICY #</span>
                  <span className="font-semibold">Lloyd&apos;s Underwriters #POL-VET-88390</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[9px] uppercase">COVERAGE LIMITS</span>
                  <span className="font-semibold">$2,000,000 Agg / $1,000,000 Occ</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[9px] uppercase">POLICY EXPIRATION</span>
                  <span className="font-semibold">Jan 15, 2026 (Auto-Renew)</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION B */}
          <div className="border-2 border-border p-5 bg-card">
            <div className="flex items-start justify-between border-b border-border pb-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 bg-primary text-primary-foreground tabular-nums font-semibold flex items-center justify-center text-[13px]">B</div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-base uppercase">SECTION B: MULTI-JURISDICTION SALES TAX ENGINE</h3>
                    <span className="border border-border tabular-nums text-[10px] px-1.5 py-0.2 uppercase bg-muted/40">TX COMPTROLLER</span>
                  </div>
                  <div className="text-[13px] tabular-nums text-muted-foreground">SALES &amp; USE TAX PERMIT: #32084918231 // FILING FREQUENCY: MONTHLY ELECTRONIC (EDI)</div>
                </div>
              </div>
              <button onClick={() => showToast('RE-VALIDATED NEXUS WITH TEXAS STATE COMPTROLLER')} className="border border-border px-2 py-1 text-[13px] tabular-nums font-semibold hover:bg-muted/40 uppercase cursor-pointer">[RE-VALIDATE NEXUS]</button>
            </div>

            <div className="mb-4">
              <div className="text-[13px] tabular-nums uppercase text-muted-foreground mb-2 font-semibold">TAX NEXUS BY OPERATING FACILITY</div>
              <div className="border border-border divide-y divide-border tabular-nums text-[13px]">
                <div className="p-2.5 bg-muted/40 font-semibold grid grid-cols-12 gap-2 text-[10px] uppercase">
                  <div className="col-span-4">FACILITY &amp; JURISDICTION</div>
                  <div className="col-span-2 text-right">STATE</div>
                  <div className="col-span-2 text-right">COUNTY</div>
                  <div className="col-span-2 text-right">CITY / SP DIST</div>
                  <div className="col-span-2 text-right text-right">TOTAL RATE</div>
                </div>
                <div className="p-2.5 bg-card grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-4 font-semibold">FRISCO MAIN HQ<span className="block text-[10px] text-muted-foreground font-normal">COLLIN COUNTY</span></div>
                  <div className="col-span-2 text-right">6.25%</div>
                  <div className="col-span-2 text-right">0.00%</div>
                  <div className="col-span-2 text-right">2.00% (Frisco)</div>
                  <div className="col-span-2 text-right font-semibold flex items-center justify-end gap-1.5"><span>8.25%</span><span className="text-[9px] bg-primary text-primary-foreground px-1 py-0.2">ACTIVE</span></div>
                </div>
                <div className="p-2.5 bg-card grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-4 font-semibold">PLANO WEST BRANCH<span className="block text-[10px] text-muted-foreground font-normal">DALLAS / COLLIN COUNTY</span></div>
                  <div className="col-span-2 text-right">6.25%</div>
                  <div className="col-span-2 text-right">0.00%</div>
                  <div className="col-span-2 text-right">2.00% (Plano)</div>
                  <div className="col-span-2 text-right font-semibold flex items-center justify-end gap-1.5"><span>8.25%</span><span className="text-[9px] bg-primary text-primary-foreground px-1 py-0.2">ACTIVE</span></div>
                </div>
                <div className="p-2.5 bg-card grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-4 font-semibold">MOBILE VAN FLEET<span className="block text-[10px] text-muted-foreground font-normal">DESTINATION SOURCED</span></div>
                  <div className="col-span-2 text-right">6.25%</div>
                  <div className="col-span-2 text-right">0.00%</div>
                  <div className="col-span-2 text-right">Dynamic / ZIP</div>
                  <div className="col-span-2 text-right font-semibold flex items-center justify-end gap-1.5"><span>8.25%*</span><span className="text-[9px] bg-muted border border-border px-1 py-0.2">GEO</span></div>
                </div>
              </div>
            </div>

            <div className="border border-border p-3 bg-muted/30 tabular-nums text-[13px]">
              <div className="font-semibold uppercase text-[11px] mb-2">SERVICE &amp; MERCHANDISE TAX EXEMPTION RULES</div>
              <div className="space-y-2 text-muted-foreground text-[11px]">
                <div className="flex items-start justify-between border-b border-border pb-1">
                  <span>• GROOMING LABOR &amp; STYLING SERVICES</span>
                  <span className="font-semibold text-foreground">TAXABLE (Texas Admin Code Rule §3.356 Pet Care)</span>
                </div>
                <div className="flex items-start justify-between border-b border-border pb-1">
                  <span>• RETAIL GOODS (SHAMPOOS, LEASHES, SUPPLEMENTS)</span>
                  <span className="font-semibold text-foreground">TAXABLE 8.25% Standard Tangible Personal Property</span>
                </div>
                <div className="flex items-start justify-between">
                  <span>• VETERINARY PRESCRIBED MEDICATED DIPS</span>
                  <span className="font-semibold text-foreground">TAX-EXEMPT (Requires uploaded Vet Rx on record)</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION C */}
          <div className="border-2 border-border p-5 bg-card">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 bg-primary text-primary-foreground tabular-nums font-semibold flex items-center justify-center text-[13px]">C</div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-base uppercase">SECTION C: STATUTORY WAIVERS, SIGN-OFFS &amp; VACCINE ENFORCEMENT</h3>
                    <span className="bg-primary text-primary-foreground tabular-nums text-[10px] px-1.5 py-0.2 font-semibold uppercase">COMPLIANCE MANDATE</span>
                  </div>
                  <div className="text-[13px] tabular-nums text-muted-foreground">TX HEALTH &amp; SAFETY CODE CH. 826 // DIGITAL SIGNATURE RETENTION GOVERNANCE</div>
                </div>
              </div>
              <button onClick={() => showToast('WAIVER WORDING UPDATE WIZARD ACTIVE')} className="bg-primary text-primary-foreground px-3 py-1 text-[13px] tabular-nums font-semibold hover:bg-muted uppercase cursor-pointer">[UPDATE WAIVER TEMPLATE]</button>
            </div>

            <div className="space-y-3 tabular-nums text-[13px]">
              <div className="border border-border p-3 bg-muted/30">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold uppercase text-foreground text-[11px]">TEXAS HEALTH &amp; SAFETY CODE CHAPTER 826 MANDATE</span>
                  <span className="bg-primary text-primary-foreground px-1.5 py-0.5 text-[9px] font-semibold uppercase">STRICT ENFORCEMENT</span>
                </div>
                <p className="text-muted-foreground text-[11px]">Mandatory rabies vaccination compliance verification required prior to check-in for all canines over 16 weeks of age. Unvaccinated intake is strictly blocked in calendar register.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="border border-border p-3 bg-card space-y-1">
                  <span className="text-muted-foreground uppercase text-[10px] block">DIGITAL LIABILITY WAIVER VERSION</span>
                  <p className="font-semibold text-sm">V4.2-REV2025</p>
                  <p className="text-muted-foreground text-[11px]">Covers matted coat release, senior pet stress protocol, and emergency vet care authorization up to $1,500.</p>
                </div>
                <div className="border border-border p-3 bg-card space-y-1">
                  <span className="text-muted-foreground uppercase text-[10px] block">SIGNATURE ENCRYPTION &amp; RETENTION</span>
                  <p className="font-semibold text-sm">7 YEARS VAULT RETENTION</p>
                  <p className="text-muted-foreground text-[11px]">Encrypted in Supabase cold storage bucket (<code className="bg-muted/40 px-1">legal_waivers_vault</code>) with immutable SHA-256 signatures.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* COLUMN 3 */}
        <div className="space-y-6">
          {/* Tax Calendar */}
          <div className="border-2 border-border p-4 bg-card">
            <div className="flex items-center justify-between border-b border-border pb-2 mb-3">
              <h4 className="font-semibold text-[13px] uppercase tabular-nums tracking-wider">TAX FILING CALENDAR</h4>
              <span className="text-[10px] tabular-nums bg-muted/40 border border-border px-1">YEAR 2025</span>
            </div>
            
            <div className="space-y-2 tabular-nums text-[13px]">
              <div className="border border-border p-2.5 bg-muted/30 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-[13px] text-foreground">TX COMPTROLLER 01-2025</div>
                  <div className="text-[10px] text-muted-foreground">DUE: FEB 20, 2025 // EDI #TX-8821</div>
                </div>
                <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 font-semibold">FILED</span>
              </div>
              
              <div className="border border-border p-2.5 bg-muted/30 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-[13px] text-foreground">TX COMPTROLLER 02-2025</div>
                  <div className="text-[10px] text-muted-foreground">DUE: MAR 20, 2025 // EDI PENDING</div>
                </div>
                <span className="border border-border text-[10px] px-1.5 py-0.5 font-semibold uppercase bg-card">UPCOMING</span>
              </div>

              <div className="border border-border p-2.5 bg-muted/30 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-[13px] text-foreground">IRS 941 (Q1 PAYROLL TAX)</div>
                  <div className="text-[10px] text-muted-foreground">DUE: APR 30, 2025 // EFTPS</div>
                </div>
                <span className="border border-border text-[10px] px-1.5 py-0.5 font-semibold uppercase bg-card">SCHEDULED</span>
              </div>
            </div>
          </div>

          {/* Audit & Compliance */}
          <div className="border-2 border-border p-4 bg-card">
            <div className="flex items-center justify-between border-b border-border pb-2 mb-3">
              <h4 className="font-semibold text-[13px] uppercase tabular-nums tracking-wider">AUDIT LOG &amp; COMPLIANCE</h4>
              <span className="text-[10px] tabular-nums text-muted-foreground">IMMUTABLE</span>
            </div>
            
            <div className="space-y-2 tabular-nums text-[13px]">
              <div className="p-2 border border-border bg-muted/30">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground"><span>2025-02-14 09:12 CST</span><span>SYS_ADMIN</span></div>
                <div className="font-semibold mt-1 text-[11px] text-foreground">Rabies verification enforced on 18 check-ins</div>
              </div>
              <div className="p-2 border border-border bg-muted/30">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground"><span>2025-02-10 14:30 CST</span><span>SYS_ADMIN</span></div>
                <div className="font-semibold mt-1 text-[11px] text-foreground">Waiver version updated to V4.2-REV2025</div>
              </div>
              <div className="p-2 border border-border bg-muted/30">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground"><span>2025-01-15 11:04 CST</span><span>AUTO_SYNC</span></div>
                <div className="font-semibold mt-1 text-[11px] text-foreground">Lloyd&apos;s Policy #POL-VET-88390 renewed</div>
              </div>
            </div>
          </div>

          {/* Export Dossier */}
          <div className="border-2 border-border p-4 bg-muted/30">
            <div className="flex items-center justify-between border-b border-border pb-2 mb-3">
              <h4 className="font-semibold text-[13px] uppercase tabular-nums tracking-wider">EXPORT LEGAL DOSSIER</h4>
              <span className="text-[10px] tabular-nums text-muted-foreground">SECURE ARCHIVE</span>
            </div>
            <p className="text-[13px] tabular-nums text-muted-foreground mb-3">Download complete corporate binder including IRS SS-4, Texas SOS filing certificates, and insurance binders.</p>
            <button 
              onClick={() => showToast('EXPORTING DOSSIER BINDER .ZIP')}
              className="w-full bg-primary text-primary-foreground py-2 text-[13px] tabular-nums uppercase font-semibold hover:bg-muted cursor-pointer"
            >
              [DOWNLOAD LEGAL BINDER .ZIP]
            </button>
          </div>
        </div>

      </div>

      {/* BOTTOM TELEMETRY FOOTER BAR */}
      <div className="mt-auto  border-border bg-muted/30 px-6 py-2.5 flex items-center justify-between text-[13px] tabular-nums">
        <div className="flex items-center gap-4 text-muted-foreground">
          <span className="">HOST: US-CENTRAL-NODE-01</span>
          <span className="">{"//"}</span>
          <span className="">LATENCY: 12ms</span>
          <span className="">{"//"}</span>
          <span className="">MULTI_LOC_STATUS: PASS (ALL NODES HEALTHY)</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground">DB: SUPABASE_POSTGRES_CORE</span>
          <span className="bg-primary text-primary-foreground px-2 py-0.5 font-semibold">[V2.4 COMMIT]</span>
        </div>
      </div>
    </div>
  );
};
