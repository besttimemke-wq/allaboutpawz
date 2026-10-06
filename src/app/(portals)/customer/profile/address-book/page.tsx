'use client';

// Address Book — My Profile tree.
import { House } from 'lucide-react';
import { PortalEmptyState } from '@/components/pawz/PortalEmptyState';

export default function AddressBookPage() {
  return (
    <PortalEmptyState
      icon={House}
      title="Address Book"
      description="Where your shop orders ship — set your delivery address at boutique checkout."
      cta={{ label: 'Shop the Boutique', href: '/shop' }}
    />
  );
}
