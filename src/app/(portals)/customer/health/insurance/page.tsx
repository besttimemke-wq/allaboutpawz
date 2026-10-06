'use client';

// Insurance — My Pet Health tree.
import { ShieldCheck } from 'lucide-react';
import { PortalEmptyState } from '@/components/pawz/PortalEmptyState';

export default function InsurancePage() {
  return (
    <PortalEmptyState
      icon={ShieldCheck}
      title="Insurance"
      description="Pet insurance info for peace of mind during every groom."
      cta={{ label: 'Learn More', href: '/contact' }}
    />
  );
}
