'use client';
import { PortalSectionPlaceholder } from '@/components/pawz/_shared/PortalSectionPlaceholder';
import { CalendarClock } from 'lucide-react';
export default function Page() {
  return (
    <PortalSectionPlaceholder
      portal="Front Desk"
      section="Schedule"
      title="Schedule & Shifts"
      description="View the weekly groomer shift grid, block off lunch and breaks, and see coverage for each station."
      icon={CalendarClock}
      ctaLabel="Back to dashboard"
      onCta={() => (window.location.href = '/frontdesk/dashboard')}
    />
  );
}
