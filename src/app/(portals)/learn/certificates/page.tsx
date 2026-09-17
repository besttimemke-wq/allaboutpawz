'use client';
import { PortalSectionPlaceholder } from '@/components/pawz/_shared/PortalSectionPlaceholder';
import { Award } from 'lucide-react';
export default function Page() {
  return (
    <PortalSectionPlaceholder
      portal="Learning Center"
      section="Certificates"
      title="Certificates"
      description="Every certificate you've earned, downloadable as a PDF and shareable to LinkedIn."
      icon={Award}
      ctaLabel="Back to dashboard"
      onCta={() => (window.location.href = '/learn/dashboard')}
    />
  );
}
