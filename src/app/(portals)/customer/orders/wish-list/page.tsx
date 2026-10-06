'use client';

// Wish List — My Orders tree (spec §7.3).
import { Heart } from 'lucide-react';
import { PortalEmptyState } from '@/components/pawz/PortalEmptyState';

export default function WishListPage() {
  return (
    <PortalEmptyState
      icon={Heart}
      title="My Wish List"
      description="Save the products your pup loves so they're one tap away."
      cta={{ label: 'Browse the Shop', href: '/shop' }}
    />
  );
}
