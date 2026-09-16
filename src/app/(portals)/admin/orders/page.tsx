'use client';
import { useRouter } from 'next/navigation';
import { OrdersView } from '@/components/pawz/financial/OrdersView';
import type { DawgNavSection } from '@/lib/types';
export default function OrdersPage() {
  const router = useRouter();
  const navigate = (s: DawgNavSection) => router.push(`/admin/${s === 'dashboard' ? 'dashboard' : s}`);
  return <OrdersView onNavigateSection={navigate} onOpenOrderDetails={() => navigate('order-details')} />;
}
