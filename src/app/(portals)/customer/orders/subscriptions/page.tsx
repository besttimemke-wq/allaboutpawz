'use client';

// Subscriptions — My Orders tree: recurring grooming plans + product subs.
import { CalendarClock } from 'lucide-react';
import { PortalEmptyState } from '@/components/pawz/PortalEmptyState';

export default function SubscriptionsPage() {
  return (
    <PortalEmptyState
      icon={CalendarClock}
      title="Subscriptions"
      description="Manage your recurring grooming plans and product subscriptions in one place."
      cta={{ label: 'Book a Recurring Groom', href: '/book/appointment' }}
    />
  );
}
