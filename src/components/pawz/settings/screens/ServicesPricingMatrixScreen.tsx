'use client';

import React, { useState, useEffect } from 'react';
import { DollarSign, Tag, Clock, Plus, Save, CheckCircle2, Percent, Scissors } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SystemSettings } from '@/lib/settings-types';

interface ScreenProps {
  onNavigateScreen?: (screenId: string) => void;
  selectedLocation?: string;
  onSelectLocation?: (loc: string) => void;
  systemSettings?: SystemSettings;
  saveSettingsToDb?: (updates: Partial<SystemSettings>) => void;
}

interface ServiceItem {
  id: string;
  name: string;
  category: string;
  price: number;
  duration: number;
  description: string;
}

export const ServicesPricingMatrixScreen: React.FC<ScreenProps> = ({
  systemSettings,
  saveSettingsToDb,
}) => {
  const [form, setForm] = useState<Record<string, any>>({});
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAddService, setShowAddService] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [services, setServices] = useState<ServiceItem[]>([
    { id: '1', name: 'Full Groom — Small', category: 'Full Groom', price: 65, duration: 90, description: 'Bath, blow dry, trim, nails, ears' },
    { id: '2', name: 'Full Groom — Medium', category: 'Full Groom', price: 85, duration: 120, description: 'Bath, blow dry, trim, nails, ears' },
    { id: '3', name: 'Full Groom — Large', category: 'Full Groom', price: 95, duration: 150, description: 'Bath, blow dry, trim, nails, ears' },
    { id: '4', name: 'Bath & Brush — Small', category: 'Bath & Brush', price: 35, duration: 45, description: 'Bath, blow dry, brush out' },
    { id: '5', name: 'Bath & Brush — Medium', category: 'Bath & Brush', price: 45, duration: 60, description: 'Bath, blow dry, brush out' },
    { id: '6', name: 'Nail Trim Only', category: 'Add-on', price: 15, duration: 15, description: 'Nail clipping and filing' },
  ]);

  // New service form state
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Full Groom');
  const [newPrice, setNewPrice] = useState('');
  const [newDuration, setNewDuration] = useState('');
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (systemSettings) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(systemSettings as any);
      setLoading(false);
    }
  }, [systemSettings]);

  const update = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));
  const handleSave = () => { saveSettingsToDb?.(form); setSaved(true); setTimeout(() => setSaved(false), 3000); };

  const handleAddService = () => {
    if (!newName || !newPrice) return;
    setServices(prev => [...prev, { id: `svc-${Date.now()}`, name: newName, category: newCategory, price: parseFloat(newPrice), duration: parseInt(newDuration) || 60, description: newDesc }]);
    setShowAddService(false);
    setNewName(''); setNewPrice(''); setNewDuration(''); setNewDesc('');
  };

  const categories = ['all', 'Full Groom', 'Bath & Brush', 'Add-on', 'A La Carte'];
  const filtered = activeCategory === 'all' ? services : services.filter(s => s.category === activeCategory);

  if (loading) return <div className="p-8 text-center text-muted-foreground text-[13px]">Loading services & pricing...</div>;

  return (
    <div className="p-6 space-y-6 font-bar">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Services & Pricing Matrix</h2>
          <p className="text-[13px] text-muted-foreground mt-1">Core grooming tiers, breed weight surcharges, and recurring membership packages.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowAddService(!showAddService)} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background hover:bg-accent h-9 px-3.5 text-[13px] font-medium cursor-pointer">
            <Plus className="size-4" /> Add New Service
          </button>
          <button onClick={handleSave} className={cn('inline-flex items-center gap-1.5 rounded-md h-9 px-3.5 text-[13px] font-medium shadow-card transition-colors cursor-pointer', saved ? 'bg-success text-success-foreground' : 'bg-primary text-primary-foreground hover:bg-primary/90')}>
            {saved ? (<><CheckCircle2 className="size-4" /> Saved!</>) : (<><Save className="size-4" /> Save</>)}
          </button>
        </div>
      </div>

      {/* Add Service Form */}
      {showAddService && (
        <div className="bg-card border border-border rounded-xl shadow-card p-5 space-y-4">
          <h3 className="text-[15px] font-semibold text-foreground">Add New Service</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[12px] font-medium text-muted-foreground block mb-1">Service Name *</label>
              <div className="relative">
                <Tag className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Full Groom — Extra Large" className="w-full pl-9 pr-3 h-9 bg-background border border-input rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <div>
              <label className="text-[12px] font-medium text-muted-foreground block mb-1">Category</label>
              <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="w-full h-9 bg-background border border-input rounded-md px-3 text-[13px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring">
                <option>Full Groom</option>
                <option>Bath & Brush</option>
                <option>Add-on</option>
                <option>A La Carte</option>
              </select>
            </div>
            <div>
              <label className="text-[12px] font-medium text-muted-foreground block mb-1">Price ($)</label>
              <div className="relative">
                <DollarSign className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="number" step="0.01" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder="125.00" className="w-full pl-7 pr-3 h-9 bg-background border border-input rounded-md text-[13px] tabular-nums focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <div>
              <label className="text-[12px] font-medium text-muted-foreground block mb-1">Duration (minutes)</label>
              <div className="relative">
                <Clock className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="number" value={newDuration} onChange={(e) => setNewDuration(e.target.value)} placeholder="120" className="w-full pl-9 pr-3 h-9 bg-background border border-input rounded-md text-[13px] tabular-nums focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="text-[12px] font-medium text-muted-foreground block mb-1">Description</label>
              <input type="text" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Bath, blow dry, trim, nails, ears" className="w-full h-9 bg-background border border-input rounded-md px-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAddService(false)} className="inline-flex items-center h-9 px-3.5 rounded-md border border-border bg-background hover:bg-accent text-foreground text-[13px] font-medium cursor-pointer">Cancel</button>
            <button onClick={handleAddService} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-[13px] font-medium shadow-card cursor-pointer"><Plus className="size-4" /> Add Service</button>
          </div>
        </div>
      )}

      {/* Category filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {categories.map((cat) => (
          <button key={cat} onClick={() => setActiveCategory(cat)} className={cn('rounded-full px-3 py-1.5 text-[12px] font-medium border cursor-pointer transition-colors capitalize', activeCategory === cat ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-muted-foreground hover:bg-accent')}>{cat === 'all' ? 'All' : cat}</button>
        ))}
      </div>

      {/* Services table */}
      <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
        <table className="w-full text-left text-[13px] text-foreground">
          <thead>
            <tr className="bg-muted/40 border-b border-border text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="p-3 font-semibold">Service</th>
              <th className="p-3 font-semibold">Category</th>
              <th className="p-3 text-right font-semibold">Price</th>
              <th className="p-3 font-semibold">Duration</th>
              <th className="p-3 font-semibold">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((svc) => (
              <tr key={svc.id} className="hover:bg-accent/50 transition-colors">
                <td className="p-3 font-medium text-foreground">{svc.name}</td>
                <td className="p-3"><span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">{svc.category}</span></td>
                <td className="p-3 text-right font-semibold tabular-nums text-primary">${svc.price.toFixed(2)}</td>
                <td className="p-3 text-muted-foreground tabular-nums">{svc.duration} min</td>
                <td className="p-3 text-muted-foreground text-[12px]">{svc.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pricing Policies */}
      <div className="bg-card border border-border rounded-xl shadow-card p-6">
        <h3 className="text-[15px] font-semibold text-foreground mb-4">Services & Pricing Policies</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="text-[12px] font-medium text-muted-foreground block mb-1">Weekend Surcharge ($)</label>
            <div className="relative">
              <DollarSign className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="number" step="0.01" value={form.weekend_surcharge || ''} onChange={(e) => update('weekend_surcharge', parseFloat(e.target.value))} placeholder="10.00" className="w-full pl-7 pr-3 h-9 bg-background border border-input rounded-md text-[13px] tabular-nums focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Additional fee for Saturday/Sunday appointments</p>
          </div>
          <div>
            <label className="text-[12px] font-medium text-muted-foreground block mb-1">Severe Matting Fee ($)</label>
            <div className="relative">
              <DollarSign className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="number" step="0.01" value={form.matting_fee || ''} onChange={(e) => update('matting_fee', parseFloat(e.target.value))} placeholder="25.00" className="w-full pl-7 pr-3 h-9 bg-background border border-input rounded-md text-[13px] tabular-nums focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Charged for severely matted coats requiring extra time</p>
          </div>
          <div>
            <label className="text-[12px] font-medium text-muted-foreground block mb-1">Senior Pet Surcharge (%)</label>
            <div className="relative">
              <Percent className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="number" step="0.1" value={form.senior_surcharge_percent || ''} onChange={(e) => update('senior_surcharge_percent', parseFloat(e.target.value))} placeholder="10.0" className="w-full pl-9 pr-3 h-9 bg-background border border-input rounded-md text-[13px] tabular-nums focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Special handling surcharge for senior pets (10yr+)</p>
          </div>
        </div>
      </div>
    </div>
  );
};
