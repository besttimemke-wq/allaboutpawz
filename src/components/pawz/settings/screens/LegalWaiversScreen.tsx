'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Save, CheckCircle2, Plus, Trash2, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SystemSettings } from '@/lib/settings-types';

interface ScreenProps {
  onNavigateScreen?: (screenId: string) => void;
  selectedLocation?: string;
  onSelectLocation?: (loc: string) => void;
  systemSettings?: SystemSettings;
  saveSettingsToDb?: (updates: Partial<SystemSettings>) => void;
}

interface Waiver {
  id: string;
  name: string;
  required: boolean;
  content: string;
}

export const LegalWaiversScreen: React.FC<ScreenProps> = ({
  systemSettings,
  saveSettingsToDb,
}) => {
  const [form, setForm] = useState<Record<string, any>>({});
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [waivers, setWaivers] = useState<Waiver[]>([
    { id: '1', name: 'Pet Grooming Service Agreement', required: true, content: 'Client acknowledges that grooming services involve risks...' },
    { id: '2', name: 'Pet Health & Vaccination Declaration', required: true, content: 'Client confirms pet is current on all required vaccinations...' },
    { id: '3', name: 'Photo & Marketing Release', required: false, content: 'Client grants permission for photos of pet to be used...' },
  ]);
  const [showAddWaiver, setShowAddWaiver] = useState(false);
  const [newWaiverName, setNewWaiverName] = useState('');
  const [newWaiverRequired, setNewWaiverRequired] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (systemSettings) { setForm(systemSettings as any); setLoading(false); }
  }, [systemSettings]);

  const update = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));
  const handleSave = () => { saveSettingsToDb?.(form); setSaved(true); setTimeout(() => setSaved(false), 3000); };

  if (loading) return <div className="p-8 text-center text-muted-foreground text-[13px]">Loading legal & waiver settings...</div>;

  return (
    <div className="p-6 space-y-6 font-bar">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Legal & Waivers</h2>
          <p className="text-[13px] text-muted-foreground mt-1">Manage client agreements, liability waivers, and legal document requirements.</p>
        </div>
        <button onClick={handleSave} className={cn('inline-flex items-center gap-1.5 rounded-md h-9 px-3.5 text-[13px] font-medium shadow-card transition-colors cursor-pointer', saved ? 'bg-success text-success-foreground' : 'bg-primary text-primary-foreground hover:bg-primary/90')}>
          {saved ? (<><CheckCircle2 className="size-4" /> Saved!</>) : (<><Save className="size-4" /> Save</>)}
        </button>
      </div>

      {/* Waivers list */}
      <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
        <div className="bg-muted/40 border-b border-border px-4 py-2.5 flex items-center justify-between">
          <span className="text-[13px] font-medium text-foreground">Required Client Waivers</span>
          <button onClick={() => setShowAddWaiver(!showAddWaiver)} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background hover:bg-accent h-7 px-2.5 text-[12px] font-medium cursor-pointer">
            <Plus className="size-3.5" /> Add Waiver
          </button>
        </div>
        {showAddWaiver && (
          <div className="p-4 border-b border-border space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input type="text" value={newWaiverName} onChange={(e) => setNewWaiverName(e.target.value)} placeholder="Waiver name" className="h-9 bg-background border border-input rounded-md px-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-ring md:col-span-2" />
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={newWaiverRequired} onChange={(e) => setNewWaiverRequired(e.target.checked)} className="size-4 accent-primary" />
                <span className="text-[13px] text-foreground">Required</span>
              </label>
            </div>
            <button onClick={() => { if (newWaiverName) { setWaivers(prev => [...prev, { id: `w-${Date.now()}`, name: newWaiverName, required: newWaiverRequired, content: '' }]); setShowAddWaiver(false); setNewWaiverName(''); } }} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-[13px] font-medium cursor-pointer">
              <Plus className="size-4" /> Add
            </button>
          </div>
        )}
        <div className="divide-y divide-border">
          {waivers.map((waiver) => (
            <div key={waiver.id} className="flex items-center gap-3 p-4 hover:bg-accent/50 transition-colors">
              <FileText className="size-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-foreground">{waiver.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{waiver.content}</p>
              </div>
              <span className={cn('inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase', waiver.required ? 'bg-warning/10 text-warning border-warning/20' : 'bg-muted text-muted-foreground border-border')}>
                {waiver.required ? 'Required' : 'Optional'}
              </span>
              <button onClick={() => setWaivers(prev => prev.filter(w => w.id !== waiver.id))} className="inline-flex items-center justify-center size-7 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive cursor-pointer">
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Legal policies */}
      <div className="bg-card border border-border rounded-xl shadow-card p-6">
        <h3 className="text-[15px] font-semibold text-foreground mb-4">Legal Policies & Configuration</h3>
        <div className="space-y-4">
          <div>
            <label className="text-[12px] font-medium text-muted-foreground block mb-1">Cancellation Policy Text</label>
            <textarea value={form.cancellation_policy_text || ''} onChange={(e) => update('cancellation_policy_text', e.target.value)} placeholder="Cancellations must be made at least 24 hours before the scheduled appointment..." className="w-full h-20 bg-background border border-input rounded-md p-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>
          <div>
            <label className="text-[12px] font-medium text-muted-foreground block mb-1">No-Show Policy Text</label>
            <textarea value={form.no_show_policy_text || ''} onChange={(e) => update('no_show_policy_text', e.target.value)} placeholder="Failure to attend a scheduled appointment without prior cancellation..." className="w-full h-20 bg-background border border-input rounded-md p-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>
          <div>
            <label className="text-[12px] font-medium text-muted-foreground block mb-1">Privacy Policy URL</label>
            <input type="url" value={form.privacy_policy_url || ''} onChange={(e) => update('privacy_policy_url', e.target.value)} placeholder="https://allaboutpawz.com/privacy" className="w-full h-9 bg-background border border-input rounded-md px-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-[12px] font-medium text-muted-foreground block mb-1">Terms of Service URL</label>
            <input type="url" value={form.terms_url || ''} onChange={(e) => update('terms_url', e.target.value)} placeholder="https://allaboutpawz.com/terms" className="w-full h-9 bg-background border border-input rounded-md px-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>
      </div>
    </div>
  );
};
