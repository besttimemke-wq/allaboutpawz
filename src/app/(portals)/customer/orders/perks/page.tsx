'use client';

// Perks Dashboard — My Orders tree (spec §7.3: points card + offers).
import { useState } from 'react';
import { Gift, Sparkles } from 'lucide-react';
import { PortalEmptyState } from '@/components/pawz/PortalEmptyState';

export default function PerksPage() {
  const [activated, setActivated] = useState(false);
  return (
    <PortalEmptyState
      icon={Gift}
      title="Pawz Perks"
      description="Earn 1 point for every dollar on grooms and shop orders — points turn into Pawz Cash."
      cta={{ label: 'Earn Points — Book a Groom', href: '/book/appointment' }}
    >
      <div className="mt-8 w-full rounded-lg border border-ink/10 bg-cream/60 px-5 py-4 text-center">
        <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-soft">
          0 points · Pawz Perks Member
        </p>
      </div>
      <p className="mt-10 w-full text-left text-[12px] font-bold uppercase tracking-[0.12em] text-ink-soft">
        Offers for you
      </p>
      <div className="mt-3 flex w-full flex-col gap-3">
        <div className="flex items-center justify-between gap-4 rounded-lg border border-ink/10 bg-white px-4 py-4">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-gold-deep" aria-hidden="true" />
            <div>
              <p className="text-[14px] font-semibold text-ink">Book 7 grooms and get the 8th free!</p>
              <p className="mt-0.5 text-[12.5px] text-ink-soft">Expires 10/6/27</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActivated(true)}
            disabled={activated}
            className={
              'h-9 shrink-0 rounded-md px-4 text-[11px] font-bold uppercase tracking-[0.1em] transition-colors ' +
              (activated
                ? 'bg-emerald-600 text-white'
                : 'bg-gold-deep text-ink hover:bg-gold')
            }
          >
            {activated ? 'Activated' : 'Activate'}
          </button>
        </div>
      </div>
    </PortalEmptyState>
  );
}
