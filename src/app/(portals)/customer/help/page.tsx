'use client';

// Need Help? — the tree's help entry.
import { LifeBuoy, Mail, Phone } from 'lucide-react';
import { PortalEmptyState } from '@/components/pawz/PortalEmptyState';

export default function NeedHelpPage() {
  return (
    <PortalEmptyState
      icon={LifeBuoy}
      title="Need Help?"
      description="Our front desk answers questions about appointments, deposits, and your pet's visit."
    >
      <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
        <a
          href="tel:+19017221114"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-ink px-7 text-[12.5px] font-bold uppercase tracking-[0.1em] text-cream transition-colors hover:bg-gold-deep"
        >
          <Phone className="h-4 w-4" aria-hidden="true" /> Call (901) 722-1114
        </a>
        <a
          href="mailto:booking@aapawz.com"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-7 text-[12.5px] font-bold uppercase tracking-[0.1em] text-ink transition-colors hover:border-ink"
        >
          <Mail className="h-4 w-4" aria-hidden="true" /> Email Us
        </a>
      </div>
    </PortalEmptyState>
  );
}
