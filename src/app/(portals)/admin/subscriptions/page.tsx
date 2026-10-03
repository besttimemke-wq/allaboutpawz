'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Repeat, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';

type Plan = {
  id: string;
  code: string;
  name: string;
  description: string;
  billingInterval: string;
  intervalCount: number;
  price: number;
  setupFee: number;
  trialDays: number;
  active: boolean;
};

export default function SubscriptionsPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load subscription plans directly from the API
    fetch('/api/admin/pos')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.catalog) {
          setPlans(d.catalog.filter((c: any) => c.itemType === 'subscription').map((c: any) => ({
            id: c.id, code: c.sku, name: c.name, description: '',
            billingInterval: c.subscriptionPlanInterval || 'month',
            intervalCount: 1, price: c.price, setupFee: 0, trialDays: 0, active: true,
          })));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Repeat className="size-6" />
            Subscriptions
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            Manage recurring billing plans — grooming memberships, supply boxes, wellness plans.
          </p>
        </div>
        <button className="px-4 py-2 bg-ink text-white rounded-lg text-[13px] font-semibold flex items-center gap-2 cursor-pointer">
          <Plus className="size-4" />
          Add Plan
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-[13px]">
          <Loader2 className="size-4 animate-spin" /> Loading plans…
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Repeat className="size-10 mx-auto text-muted-foreground/40" />
          <p className="text-[14px] font-medium text-foreground mt-3">No subscription plans yet</p>
          <p className="text-[13px] text-muted-foreground mt-1">Create your first plan to start recurring billing.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((p) => (
            <div key={p.id} className="bg-card border border-border rounded-xl p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-[15px] font-semibold text-foreground">{p.name}</h3>
                  <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{p.code}</p>
                </div>
                <span className={cn(
                  'text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full',
                  p.active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground',
                )}>
                  {p.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-[24px] font-bold text-foreground">${p.price.toFixed(2)}</span>
                <span className="text-[12px] text-muted-foreground">/{p.billingInterval}</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                {p.setupFee > 0 && <span>Setup: ${p.setupFee.toFixed(2)}</span>}
                {p.trialDays > 0 && <span>{p.trialDays}-day trial</span>}
              </div>
              <div className="flex gap-2 pt-2">
                <button className="flex-1 py-1.5 border border-border rounded-lg text-[12px] font-medium hover:bg-muted cursor-pointer flex items-center justify-center gap-1.5">
                  <Pencil className="size-3" /> Edit
                </button>
                <button className="py-1.5 px-3 border border-border rounded-lg text-[12px] text-destructive hover:bg-destructive/5 cursor-pointer">
                  <Trash2 className="size-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
