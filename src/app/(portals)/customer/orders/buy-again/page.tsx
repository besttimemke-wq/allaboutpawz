'use client';

// Buy Again — My Orders tree (spec §7.3): reorder favorites.
import { RotateCcw } from 'lucide-react';
import { PortalEmptyState } from '@/components/pawz/PortalEmptyState';

export default function BuyAgainPage() {
  return (
    <PortalEmptyState
      icon={RotateCcw}
      title="Buy Again"
      description="You can quickly reorder your favorite items from your Buy Again. Every item you've ever purchased will appear here."
      cta={{ label: 'Shop Now', href: '/shop' }}
    />
  );
}
