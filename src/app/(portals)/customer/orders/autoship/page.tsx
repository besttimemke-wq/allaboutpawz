'use client';

// Autoship — My Orders tree (spec §7.3: benefit cards + SHOP NOW).
import { Repeat, Percent, Truck, CalendarClock, Star } from 'lucide-react';
import { PortalEmptyState } from '@/components/pawz/PortalEmptyState';

const BENEFITS = [
  { icon: Percent, title: '5% Off on All Your Orders' },
  { icon: Truck, title: 'Free Shipping over $39' },
  { icon: CalendarClock, title: 'Custom Delivery' },
  { icon: Star, title: 'Priority Access' },
];

export default function AutoshipPage() {
  return (
    <PortalEmptyState
      icon={Repeat}
      title="No Autoship Orders Yet!"
      description="Never run out of your pet's food or supplies again — schedule repeat deliveries and save."
      cta={{ label: 'Shop Now', href: '/shop' }}
    >
      <div className="mt-10 grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {BENEFITS.map((b) => (
          <div
            key={b.title}
            className="flex flex-col items-center gap-2 rounded-lg border border-ink/10 bg-cream/60 px-3 py-5 text-center"
          >
            <b.icon className="h-5 w-5 text-gold-deep" aria-hidden="true" />
            <p className="text-[12.5px] font-semibold leading-snug text-ink">{b.title}</p>
          </div>
        ))}
      </div>
    </PortalEmptyState>
  );
}
