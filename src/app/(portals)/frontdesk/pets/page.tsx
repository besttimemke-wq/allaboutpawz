'use client';
import { PortalSectionPlaceholder } from '@/components/pawz/_shared/PortalSectionPlaceholder';
import { PawPrint } from 'lucide-react';
export default function Page() {
  return (
    <PortalSectionPlaceholder
      portal="Front Desk"
      section="Pets"
      title="Pets & Patients"
      description="Look up pets by name or owner, update breed and weight, and upload or review shot records and vet contact info."
      icon={PawPrint}
      ctaLabel="Back to dashboard"
      onCta={() => (window.location.href = '/frontdesk/dashboard')}
    />
  );
}
