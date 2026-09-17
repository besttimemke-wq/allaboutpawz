'use client';
import { PortalSectionPlaceholder } from '@/components/pawz/_shared/PortalSectionPlaceholder';
import { UserCheck } from 'lucide-react';
export default function Page() {
  return (
    <PortalSectionPlaceholder
      portal="Front Desk"
      section="Check-In"
      title="Walk-In Check-In"
      description="Capture walk-in arrivals, attach a pet to an owner, and queue the pet for the next available groomer."
      icon={UserCheck}
      ctaLabel="Back to dashboard"
      onCta={() => (window.location.href = '/frontdesk/dashboard')}
    />
  );
}
