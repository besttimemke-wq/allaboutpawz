'use client';

// My Vet — My Pet Health tree. The emergency vet contact is captured per pet
// in the pet form (and the booking pre check-in) — this page links there.
import { Building2 } from 'lucide-react';
import { PortalEmptyState } from '@/components/pawz/PortalEmptyState';

export default function MyVetPage() {
  return (
    <PortalEmptyState
      icon={Building2}
      title="My Vet"
      description="Your primary veterinary clinic — so we can act fast in an emergency. Vet contact is saved on each pet's profile."
      cta={{ label: 'Update My Pets', href: '/customer/pets' }}
    />
  );
}
