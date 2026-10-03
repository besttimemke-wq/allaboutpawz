'use client';

import { useAppStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { CustomersView } from '@/components/pawz/CustomersView';
import { useCustomers } from '@/hooks/useQueries';
import type { DawgNavSection } from '@/lib/types';

// Map the API response shape to the shape CustomersView expects
function mapApiCustomer(c: any) {
  return {
    id: c.id,
    name: c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.email || '—',
    email: c.email || '',
    phone: c.phone || '',
    pets: (c.pets || []).map((p: any) => `${p.name || '—'} (${p.breed || p.species || ''})`),
    totalSpent: c.lifetimeValue || 0,
    lastVisit: c.lastVisitAt
      ? new Date(c.lastVisitAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '—',
    preferredGroomer: '—',
    lifetimeValue: c.lifetimeValue || 0,
    outstandingBalance: c.outstandingBalance || 0,
    lifecycleStage: c.lifecycleStage || 'new_lead',
    lifecycleStatus: c.lifecycleStatus || 'healthy',
    customerSince: c.customerSince || '',
    petCount: c.petCount || 0,
    isActive: c.isActive ?? true,
    tags: c.tags || [],
  };
}

export default function CustomersPage() {
  const router = useRouter();
  const { customers: mockCustomers, setActiveModal } = useAppStore();

  // TanStack Query — replaces useState + useEffect + fetch
  const { data, isLoading } = useCustomers(200);

  // Use API data if available, fall back to mock data for unauthenticated sessions
  const customers = (data?.customers?.length ?? 0) > 0
    ? data!.customers.map(mapApiCustomer)
    : mockCustomers;

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
