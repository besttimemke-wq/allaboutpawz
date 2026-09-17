'use client';
import { PortalSectionPlaceholder } from '@/components/pawz/_shared/PortalSectionPlaceholder';
import { Receipt } from 'lucide-react';
export default function Page() {
  return (
    <PortalSectionPlaceholder
      portal="Front Desk"
      section="Quick POS"
      title="Quick POS"
      description="Ring up retail items, take a card or cash payment, and email or print a receipt without leaving the desk."
      icon={Receipt}
      ctaLabel="Back to dashboard"
      onCta={() => (window.location.href = '/frontdesk/dashboard')}
    />
  );
}
