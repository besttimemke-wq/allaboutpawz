'use client';
import { PortalSectionPlaceholder } from '@/components/pawz/_shared/PortalSectionPlaceholder';
import { Library } from 'lucide-react';
export default function Page() {
  return (
    <PortalSectionPlaceholder
      portal="Learning Center"
      section="Catalog"
      title="Course Catalog"
      description="Browse every available module. Filter by category, audience, duration, and skill level."
      icon={Library}
      ctaLabel="Back to dashboard"
      onCta={() => (window.location.href = '/learn/dashboard')}
    />
  );
}
