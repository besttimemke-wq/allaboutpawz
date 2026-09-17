'use client';
import { useRouter } from 'next/navigation';
import { InvoicesView } from '@/components/pawz/financial/InvoicesView';
import type { DawgNavSection } from '@/lib/types';
export default function InvoicesPage() {
  const router = useRouter();
  const navigate = (s: DawgNavSection) => router.push(`/admin/${s === 'dashboard' ? 'dashboard' : s}`);
  return <InvoicesView onNavigateSection={navigate} />;
}
