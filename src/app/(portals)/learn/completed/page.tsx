'use client';
import { PortalSectionPlaceholder } from '@/components/pawz/_shared/PortalSectionPlaceholder';
import { CheckCircle2 } from 'lucide-react';
export default function Page() {
  return (
    <PortalSectionPlaceholder
      portal="Learning Center"
      section="Completed"
      title="Completed"
      description="A full history of every module you've finished — revisit any lesson or re-watch a video."
      icon={CheckCircle2}
      ctaLabel="Back to dashboard"
      onCta={() => (window.location.href = '/learn/dashboard')}
    />
  );
}
