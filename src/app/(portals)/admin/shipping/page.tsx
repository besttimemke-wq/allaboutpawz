'use client';
import { useRouter } from 'next/navigation';
import { ShippingStationView } from '@/components/pawz/financial/ShippingStationView';
import type { DawgNavSection } from '@/lib/types';
export default function ShippingPage() {
  const router = useRouter();
  const navigate = (s: DawgNavSection) => router.push(`/admin/${s === 'dashboard' ? 'dashboard' : s}`);
  return <ShippingStationView onNavigateSection={navigate} />;
}
