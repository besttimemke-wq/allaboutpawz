'use client';
import { useRouter } from 'next/navigation';
import { ReturnsView } from '@/components/pawz/financial/ReturnsView';
import type { DawgNavSection } from '@/lib/types';
export default function ReturnsPage() {
  const router = useRouter();
  const navigate = (s: DawgNavSection) => router.push(`/admin/${s === 'dashboard' ? 'dashboard' : s}`);
  return <ReturnsView onNavigateSection={navigate} />;
}
