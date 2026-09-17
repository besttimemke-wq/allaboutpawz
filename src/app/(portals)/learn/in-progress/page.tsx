'use client';
import { PortalSectionPlaceholder } from '@/components/pawz/_shared/PortalSectionPlaceholder';
import { PlayCircle } from 'lucide-react';
export default function Page() {
  return (
    <PortalSectionPlaceholder
      portal="Learning Center"
      section="In Progress"
      title="In Progress"
      description="Pick up any module you've started but not finished. Progress bars show exactly where you left off."
      icon={PlayCircle}
      ctaLabel="Back to dashboard"
      onCta={() => (window.location.href = '/learn/dashboard')}
    />
  );
}
