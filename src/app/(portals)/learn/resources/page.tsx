'use client';
import { PortalSectionPlaceholder } from '@/components/pawz/_shared/PortalSectionPlaceholder';
import { FolderOpen } from 'lucide-react';
export default function Page() {
  return (
    <PortalSectionPlaceholder
      portal="Learning Center"
      section="Resources"
      title="Resources"
      description="Reference material, downloadable checklists, breed guides, and links to external reading."
      icon={FolderOpen}
      ctaLabel="Back to dashboard"
      onCta={() => (window.location.href = '/learn/dashboard')}
    />
  );
}
