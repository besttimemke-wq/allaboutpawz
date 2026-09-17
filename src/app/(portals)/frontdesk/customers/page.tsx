'use client';
import { PortalSectionPlaceholder } from '@/components/pawz/_shared/PortalSectionPlaceholder';
import { Users } from 'lucide-react';
export default function Page() {
  return (
    <PortalSectionPlaceholder
      portal="Front Desk"
      section="Customers"
      title="Customers"
      description="Find and edit customer records, view a customer's linked salon and order history, and manage contact details."
      icon={Users}
      ctaLabel="Back to dashboard"
      onCta={() => (window.location.href = '/frontdesk/dashboard')}
    />
  );
}
