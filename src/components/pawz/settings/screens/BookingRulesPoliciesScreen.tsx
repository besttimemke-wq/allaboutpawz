'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Calendar, Save, CheckCircle2, Plus, Trash2, CalendarX } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SystemSettings } from '@/lib/settings-types';

interface ScreenProps {
  onNavigateScreen?: (screenId: string) => void;
  selectedLocation?: string;
  onSelectLocation?: (loc: string) => void;
  systemSettings?: SystemSettings;
  saveSettingsToDb?: (updates: Partial<SystemSettings>) => void;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const BookingRulesPoliciesScreen: React.FC<ScreenProps> = ({
  systemSettings,
  saveSettingsToDb,
}) => {
  const [form, setForm] = useState<Record<string, any>>({});
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState<Record<string, { open: string; close: string; closed: boolean }>>(
    DAYS.reduce((acc, day) => ({ ...acc, [day]: { open: '09:00', close: '17:00', closed: day === 'Sunday' } }), {})
  );
  const [holidays, setHolidays] = useState<{ date: string; name: string }[]>([]);

  useEffect(() => {
     
    if (systemSettings) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(systemSettings as any);
      setLoading(false);
    }
  }, [systemSettings]);

  const update = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));
  const handleSave = () => { saveSettingsToDb?.(form); setSaved(true); setTimeout(() => setSaved(false), 3000); };

  if (loading) return <div className="p-8 text-center text-muted-foreground text-[13px]">Loading operating hours...</div>;

  return (
    <div className="p-6 space-y-6 font-bar">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Business & Holiday Hours</h2>
          <p className="text-[13px] text-muted-foreground mt-1">Weekly salon operating hours, weekend blocks, and annual holiday blackout calendar.</p>
        </div>
        <button onClick={handleSave} className={cn('inline-flex items-center gap-1.5 rounded-md h-9 px-3.5 text-[13px] font-medium shadow-card transition-colors cursor-pointer', saved ? 'bg-success text-success-foreground' : 'bg-primary text-primary-foreground hover:bg-primary/90')}>
          {saved ? (<><CheckCircle2 className="size-4" /> Saved!</>) : (<><Save className="size-4" /> Save Changes</>)}
        </button>
      </div>

      {/* Weekly Operating Hours */}
      <div className="bg-card border border-border rounded-xl shadow-card p-6">
        <h3 className="text-[15px] font-semibold text-foreground mb-4">Weekly Operating Hours</h3>
        <div className="space-y-3">
          {DAYS.map((day) => (
            <div key={day} className="flex items-center gap-4 py-2 border-b border-border last:border-0">
              <div className="w-28">
                <span className="text-[13px] font-medium text-foreground">{day}</span>
              </div>
              <button
                type="button"
                onClick={() => setHours(prev => ({ ...prev, [day]: { ...prev[day], closed: !prev[day].closed } }))}
                className={cn('inline-flex items-center justify-center h-7 px-2 rounded-md border text-[12px] font-medium cursor-pointer transition-colors', hours[day].closed ? 'bg-muted text-muted-foreground border-border' : 'bg-success/10 text-success border-success/20')}
              >
                {hours[day].closed ? 'Closed' : 'Open'}
              </button>
              {!hours[day].closed && (
                <div className="flex items-center gap-2">
                  <Clock className="size-3.5 text-muted-foreground" />
                  <input type="time" value={hours[day].open} onChange={(e) => setHours(prev => ({ ...prev, [day]: { ...prev[day], open: e.target.value } }))} className="h-8 bg-background border border-input rounded-md px-2 text-[13px] tabular-nums focus:outline-none focus:ring-2 focus:ring-ring" />
                  <span className="text-[13px] text-muted-foreground">to</span>
                  <input type="time" value={hours[day].close} onChange={(e) => setHours(prev => ({ ...prev, [day]: { ...prev[day], close: e.target.value } }))} className="h-8 bg-background border border-input rounded-md px-2 text-[13px] tabular-nums focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Holiday Blackouts */}
      <div className="bg-card border border-border rounded-xl shadow-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-semibold text-foreground">Holiday Blackout Calendar</h3>
          <button onClick={() => setHolidays(prev => [...prev, { date: '', name: '' }])} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background hover:bg-accent h-8 px-3 text-[12px] font-medium cursor-pointer">
            <Plus className="size-3.5" /> Add Holiday
          </button>
        </div>
        {holidays.length === 0 ? (
          <p className="text-[13px] text-muted-foreground py-4 text-center">No holiday blackouts configured.</p>
        ) : (
          <div className="space-y-2">
            {holidays.map((holiday, idx) => (
              <div key={idx} className="flex items-center gap-3 py-2">
                <CalendarX className="size-4 text-warning shrink-0" />
                <input type="date" value={holiday.date} onChange={(e) => setHolidays(prev => prev.map((h, i) => i === idx ? { ...h, date: e.target.value } : h))} className="h-8 bg-background border border-input rounded-md px-2 text-[13px] tabular-nums focus:outline-none focus:ring-2 focus:ring-ring" />
                <input type="text" value={holiday.name} onChange={(e) => setHolidays(prev => prev.map((h, i) => i === idx ? { ...h, name: e.target.value } : h))} placeholder="Holiday name" className="flex-1 h-8 bg-background border border-input rounded-md px-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-ring" />
                <button onClick={() => setHolidays(prev => prev.filter((_, i) => i !== idx))} className="inline-flex items-center justify-center size-7 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive cursor-pointer">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Online Self-Booking */}
      <div className="bg-card border border-border rounded-xl shadow-card p-6">
        <h3 className="text-[15px] font-semibold text-foreground mb-4">Online Self-Booking</h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-[13px] font-medium text-foreground">Allow Customer Self-Booking</span>
            <button type="button" onClick={() => update('portal_allow_self_cancel', !form.portal_allow_self_cancel)} className={cn('relative inline-flex h-5 w-9 items-center rounded-full transition-colors', form.portal_allow_self_cancel ? 'bg-primary' : 'bg-muted')}>
              <span className={cn('inline-block size-3.5 rounded-full bg-white transition-transform', form.portal_allow_self_cancel ? 'translate-x-4' : 'translate-x-1')} />
            </button>
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-[13px] font-medium text-foreground">Allow Customer Self-Cancel</span>
            <button type="button" onClick={() => update('portal_allow_self_cancel', !form.portal_allow_self_cancel)} className={cn('relative inline-flex h-5 w-9 items-center rounded-full transition-colors', form.portal_allow_self_cancel ? 'bg-primary' : 'bg-muted')}>
              <span className={cn('inline-block size-3.5 rounded-full bg-white transition-transform', form.portal_allow_self_cancel ? 'translate-x-4' : 'translate-x-1')} />
            </button>
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-[13px] font-medium text-foreground">Allow Customer Self-Reschedule</span>
            <button type="button" onClick={() => update('portal_allow_self_reschedule', !form.portal_allow_self_reschedule)} className={cn('relative inline-flex h-5 w-9 items-center rounded-full transition-colors', form.portal_allow_self_reschedule ? 'bg-primary' : 'bg-muted')}>
              <span className={cn('inline-block size-3.5 rounded-full bg-white transition-transform', form.portal_allow_self_reschedule ? 'translate-x-4' : 'translate-x-1')} />
            </button>
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-[13px] font-medium text-foreground">Show Pricing Upfront</span>
            <button type="button" onClick={() => update('portal_show_pricing_upfront', !form.portal_show_pricing_upfront)} className={cn('relative inline-flex h-5 w-9 items-center rounded-full transition-colors', form.portal_show_pricing_upfront ? 'bg-primary' : 'bg-muted')}>
              <span className={cn('inline-block size-3.5 rounded-full bg-white transition-transform', form.portal_show_pricing_upfront ? 'translate-x-4' : 'translate-x-1')} />
            </button>
          </label>
        </div>
      </div>
    </div>
  );
};
