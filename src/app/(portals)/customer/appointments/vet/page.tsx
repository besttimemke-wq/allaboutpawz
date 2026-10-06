'use client';

// Vet Appointments — My Appointments tree.
import { Stethoscope } from 'lucide-react';
import { PortalEmptyState } from '@/components/pawz/PortalEmptyState';

export default function VetAppointmentsPage() {
  return (
    <PortalEmptyState
      icon={Stethoscope}
      title="Vet Appointments"
      description="Your veterinary appointments will appear here. Ask our front desk about our vet partners."
      cta={{ label: 'Call (901) 722-1114', href: 'tel:+19017221114' }}
    />
  );
}
