'use client';
import { PortalSectionPlaceholder } from '@/components/pawz/_shared/PortalSectionPlaceholder';
import { Phone } from 'lucide-react';
export default function Page() {
  return (
    <PortalSectionPlaceholder
      portal="Front Desk"
      section="Messages"
      title="Phone Messages"
      description="Log every voicemail and message with caller, time, note, and disposition. Forward to a groomer or admin in one tap."
      icon={Phone}
      ctaLabel="Back to dashboard"
      onCta={() => (window.location.href = '/frontdesk/dashboard')}
    />
  );
}
