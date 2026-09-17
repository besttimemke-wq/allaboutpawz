'use client';

import { useAppStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { CustomersView } from '@/components/pawz/CustomersView';
import type { DawgNavSection } from '@/lib/types';

export default function CustomersPage() {
  const router = useRouter();
  const { customers, setActiveModal } = useAppStore();

  const navigate = (section: DawgNavSection) => {
    router.push(`/admin/${section === 'dashboard' ? 'dashboard' : section}`);
  };

  return (
    <CustomersView
      customers={customers}
      onAddCustomer={() => setActiveModal('customer')}
      onOpenNewAppointment={() => setActiveModal('appointment')}
      onOpenAddPet={() => setActiveModal('pet')}
      onOpenTakePayment={() => setActiveModal('payment')}
      onOpenIntake={() => setActiveModal('intake')}
    />
  );
}
