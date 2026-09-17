'use client';
import { useRouter } from 'next/navigation';
import { StripeConnectionsView } from '@/components/pawz/financial/StripeConnectionsView';
import type { DawgNavSection } from '@/lib/types';
export default function StripeConnectionsPage() {
  const router = useRouter();
  const navigate = (s: DawgNavSection) => router.push(`/admin/${s === 'dashboard' ? 'dashboard' : s}`);
  return <StripeConnectionsView onNavigateSection={navigate} />;
}
