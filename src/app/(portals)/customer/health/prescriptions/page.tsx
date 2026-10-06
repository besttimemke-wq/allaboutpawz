'use client';

// My Prescriptions — My Pet Health tree.
import { Pill } from 'lucide-react';
import { PortalEmptyState } from '@/components/pawz/PortalEmptyState';

export default function PrescriptionsPage() {
  return (
    <PortalEmptyState
      icon={Pill}
      title="My Prescriptions"
      description="Prescriptions and preventives your vet has on file — ready when your groomer needs them."
      cta={{ label: 'Contact Us', href: '/contact' }}
    />
  );
}
