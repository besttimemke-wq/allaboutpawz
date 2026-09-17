'use client';

import React, { useState } from 'react';
import { DawgNavSection } from '@/lib/types';

interface TaxesViewProps {
  onNavigateSection?: (section: DawgNavSection) => void;
}

export const TaxesView: React.FC<TaxesViewProps> = ({ onNavigateSection }) => {
  const [taxRules, setTaxRules] = useState([
    {
      id: 'TAX-001',
      jurisdiction: 'Oklahoma Tax Commission',
      type: 'STATE_SALES_TAX',
      stateCode: 'OK',
      rate: 4.5,
      code: 'SYS_TAX_OK_01',
      class: 'GROOM_SERVICES_ONLY',
      autoCalc: true,
    },
    {
      id: 'TAX-002',
      jurisdiction: 'Cleveland County',
      type: 'COUNTY_SALES_TAX',
      stateCode: 'OK // CLEV',
      rate: 1.25,
      code: 'SYS_TAX_OK_CLEV',
      class: 'RETAIL_GOODS_ONLY',
      autoCalc: true,
    },
    {
      id: 'TAX-003',
      jurisdiction: 'Norman Municipality',
      type: 'CITY_SALES_TAX',
      stateCode: 'OK // NORMAN',
      rate: 2.0,
      code: 'SYS_TAX_OK_NORMAN',
      class: 'ALL_SALES',
      autoCalc: true,
    }
  ]);

  const [newRule, setNewRule] = useState({
    jurisdiction: '',
    type: 'STATE_SALES_TAX',
    stateCode: '',
    rate: '4.5',
    code: '',
    class: 'ALL_SALES'
  });

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRule.jurisdiction || !newRule.stateCode) {
      alert('Please fill out all mandatory tax jurisdiction fields.');
      return;
    }
    const rVal = parseFloat(newRule.rate) || 0;
    const newRuleId = `TAX-00${taxRules.length + 1}`;
    setTaxRules(prev => [
      ...prev,
      {
        id: newRuleId,
        jurisdiction: newRule.jurisdiction,
        type: newRule.type,
        stateCode: newRule.stateCode.toUpperCase(),
        rate: rVal,
        code: newRule.code || `SYS_TAX_GEN_10${taxRules.length + 1}`,
        class: newRule.class,
        autoCalc: true
      }
    ]);
    setNewRule({
      jurisdiction: '',
      type: 'STATE_SALES_TAX',
      stateCode: '',
      rate: '4.5',
      code: '',
      class: 'ALL_SALES'
    });
    alert('Success: Tax jurisdiction rule active.');
  };

  const handleDeleteRule = (id: string) => {
    if (window.confirm(`Are you sure you want to delete tax rule ${id}?`)) {
      setTaxRules(prev => prev.filter(r => r.id !== id));
    }
  };

  return (
    <div className="flex flex-col w-full text-foreground bg-card select-text">
      {/* SYSTEM CONTEXT STRIP */}
      <div className="w-full bg-muted/40 border-b border-border px-4 py-2 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-black inline-block"></span>
          <span className="font-medium text-[11px] text-muted-foreground">
            Taxes &amp; Jurisdictions
          </span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground text-muted-foreground">
          <span>TAX_NEXUS_VERIFIED: ACTIVE (3 JURISDICTIONS)</span>
        </div>
      </div>

      {/* TOP SUMMARY STRIP */}
      <div className="p-6 border-b border-border">
        <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">Taxes &amp; Rules</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5 max-w-3xl">
          Configure real-time tax rules, jurisdiction bindings, and state/county/city nexus rules. Automatically integrated into final customer invoice checkout.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-border">
        {/* LEFT COMPONENT: TAX RULE REGISTRY (8 COLS) */}
        <div className="lg:col-span-8 p-6 space-y-6">
          <div className="border border-border">
            <div className="bg-muted/40 border-b border-border px-4 py-2 flex items-center justify-between">
              <span className="text-[12px] font-semibold text-foreground uppercase">ACTIVE TAX RULES &amp; JURISDICTIONS</span>
              <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 font-semibold uppercase">NEXUS_SYNC_PASS</span>
            </div>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-[13px] text-foreground border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/30 font-semibold">
                    <th className="p-3 border-r border-border uppercase">ID</th>
                    <th className="p-3 border-r border-border uppercase">JURISDICTION</th>
                    <th className="p-3 border-r border-border uppercase">TAX TYPE</th>
                    <th className="p-3 border-r border-border uppercase">STATE / PROV</th>
                    <th className="p-3 border-r border-border uppercase text-right">FLAT RATE</th>
                    <th className="p-3 border-r border-border uppercase">TAX CODE</th>
                    <th className="p-3 border-r border-border uppercase">CLASSIFICATION</th>
                    <th className="p-3 border-r border-border text-center uppercase">AUTO_CALC</th>
                    <th className="p-3 text-center uppercase">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {taxRules.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 border-r border-border font-semibold text-foreground">{r.id}</td>
                      <td className="p-3 border-r border-border font-semibold">{r.jurisdiction}</td>
                      <td className="p-3 border-r border-border text-muted-foreground">{r.type.replace(/_/g, ' ')}</td>
                      <td className="p-3 border-r border-border font-semibold">{r.stateCode}</td>
                      <td className="p-3 border-r border-border text-right font-semibold">{r.rate.toFixed(2)}%</td>
                      <td className="p-3 border-r border-border text-muted-foreground/70 font-semibold">{r.code}</td>
                      <td className="p-3 border-r border-border font-semibold text-muted-foreground">{r.class.replace(/_/g, ' ')}</td>
                      <td className="p-3 border-r border-border text-center">
                        <span className="text-[10px] bg-muted/40 border border-border text-foreground px-1 py-0.2">
                          {r.autoCalc ? 'YES' : 'NO'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleDeleteRule(r.id)}
                          className="bg-card hover:bg-black hover:text-white text-foreground border border-border px-2 py-0.5 text-[11px] text-muted-foreground font-semibold transition-colors cursor-pointer"
                        >
                          DELETE
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-3 bg-muted/40 border-t border-border text-[10px] tabular-nums text-muted-foreground uppercase">
              AUTO-TAX SERVICE LAYER BOUND TO ZIP CODE DATABASE GEOLOCATION FOR MOBILE SALON OPERATIONS.
            </div>
          </div>

          {/* LOWER FORMULA CRITERIA */}
          <div className="border border-border p-4 bg-muted/30 space-y-4">
            <h4 className="text-[12px] font-semibold text-foreground uppercase">ADVANCED REVENUE CALCULATION CRITERIA RULES</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px] tabular-nums">
              <label className="flex items-start gap-3 p-3 bg-card border border-border cursor-pointer select-none">
                <input defaultChecked className="w-4 h-4 rounded-md accent-black border border-border mt-0.5 cursor-pointer" type="checkbox" />
                <div>
                  <strong className="block text-foreground font-semibold">Enforce Holiday Peak Surcharge Taxing</strong>
                  <span className="text-[10px] text-muted-foreground/70 block mt-0.5">
                    Automatically enforce taxation overrides on special booking peak surcharges during seasonal high-volume slots.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 bg-card border border-border cursor-pointer select-none">
                <input defaultChecked className="w-4 h-4 rounded-md accent-black border border-border mt-0.5 cursor-pointer" type="checkbox" />
                <div>
                  <strong className="block text-foreground font-semibold">Automated State Nexus Threshold Triggers</strong>
                  <span className="text-[10px] text-muted-foreground/70 block mt-0.5">
                    Trigger strict general ledger notification block when grooming services in bordering counties cross physical nexus thresholds.
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* RIGHT COMPONENT: ADD JURISDICTION CARD (4 COLS) */}
        <div className="lg:col-span-4 p-6 bg-muted/30">
          <form onSubmit={handleAddRule} className="border border-border bg-card p-6 shadow-card-md space-y-4">
            <div className="border-b border-border pb-3">
              <span className="text-[10px] text-muted-foreground/70 uppercase">RULE BIND ENGINE // CONFIG</span>
              <h3 className="text-sm font-semibold tabular-nums mt-0.5 text-foreground">ADD NEW TAX JURISDICTION</h3>
            </div>

            <div className="space-y-3 text-[12px]">
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1 uppercase">JURISDICTION LEGAL AUTHORITY //*</label>
                <input
                  required
                  value={newRule.jurisdiction}
                  onChange={(e) => setNewRule(prev => ({ ...prev, jurisdiction: e.target.value }))}
                  className="w-full bg-card border border-border px-3 py-2 text-[13px] text-foreground focus:outline-none rounded-md placeholder:text-muted-foreground/50"
                  placeholder="e.g. Cleveland County Treasurer"
                  type="text"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-muted-foreground mb-1 uppercase">STATE / ZIP PROV //*</label>
                  <input
                    required
                    value={newRule.stateCode}
                    onChange={(e) => setNewRule(prev => ({ ...prev, stateCode: e.target.value }))}
                    className="w-full bg-card border border-border px-3 py-2 text-[13px] text-foreground focus:outline-none rounded-md placeholder:text-muted-foreground/50"
                    placeholder="e.g. OK"
                    type="text"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground mb-1 uppercase">FLAT RATE % //*</label>
                  <input
                    required
                    value={newRule.rate}
                    onChange={(e) => setNewRule(prev => ({ ...prev, rate: e.target.value }))}
                    className="w-full bg-card border border-border px-3 py-2 text-[13px] text-foreground focus:outline-none rounded-md placeholder:text-muted-foreground/50"
                    placeholder="e.g. 2.0"
                    type="text"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-muted-foreground mb-1 uppercase">SYSTEM TAX CODE</label>
                  <input
                    value={newRule.code}
                    onChange={(e) => setNewRule(prev => ({ ...prev, code: e.target.value }))}
                    className="w-full bg-card border border-border px-3 py-2 text-[13px] text-foreground focus:outline-none rounded-md placeholder:text-muted-foreground/50"
                    placeholder="e.g. SYS_TAX_OK"
                    type="text"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground mb-1 uppercase">CLASSIFICATION</label>
                  <select
                    value={newRule.class}
                    onChange={(e) => setNewRule(prev => ({ ...prev, class: e.target.value }))}
                    className="w-full bg-card border border-border px-2 py-2 text-[13px] text-foreground focus:outline-none rounded-md cursor-pointer"
                  >
                    <option value="ALL_SALES">ALL SALES</option>
                    <option value="GROOM_SERVICES_ONLY">GROOM SERVICES ONLY</option>
                    <option value="RETAIL_GOODS_ONLY">RETAIL GOODS ONLY</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-muted-foreground mb-1 uppercase">TAX TYPE CATEGORY //*</label>
                <select
                  value={newRule.type}
                  onChange={(e) => setNewRule(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full bg-card border border-border px-2 py-2 text-[13px] text-foreground focus:outline-none rounded-md cursor-pointer"
                >
                  <option value="STATE_SALES_TAX">STATE SALES TAX</option>
                  <option value="COUNTY_SALES_TAX">COUNTY SALES TAX</option>
                  <option value="CITY_SALES_TAX">CITY SALES TAX</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 border border-border px-4 py-2.5 text-[12px] uppercase font-semibold tracking-wider transition-colors cursor-pointer rounded-md"
              >
                AUTHORIZE TAX NEXUS RULE
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
