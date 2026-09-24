'use client';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { PaymentsView } from '@/components/pawz/financial/PaymentsView';
import type { DawgNavSection } from '@/lib/types';
export default function PaymentsPage() {
  const router = useRouter();
  const { setActiveModal } = useAppStore();
  const navigate = (s: DawgNavSection) => router.push(`/admin/${s === 'dashboard' ? 'dashboard' : s}`);
  return <PaymentsView onNavigateSection={navigate} onOpenQuickPayment={() => setActiveModal('payment')} />;
}
