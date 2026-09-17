'use client';
import { useRouter } from 'next/navigation';
import { GiftCardsView } from '@/components/pawz/financial/GiftCardsView';
import type { DawgNavSection } from '@/lib/types';
export default function GiftCardsPage() {
  const router = useRouter();
  const navigate = (s: DawgNavSection) => router.push(`/admin/${s === 'dashboard' ? 'dashboard' : s}`);
  return <GiftCardsView onNavigateSection={navigate} />;
}
