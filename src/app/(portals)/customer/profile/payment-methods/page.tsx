'use client';

// Payment Methods — My Profile tree. Cards live in Stripe; billing history
// is the invoices page.
import { CreditCard } from 'lucide-react';
import { PortalEmptyState } from '@/components/pawz/PortalEmptyState';

export default function PaymentMethodsPage() {
  return (
    <PortalEmptyState
      icon={CreditCard}
      title="Payment Methods"
      description="Cards used for deposits, balances, and shop orders are managed securely by Stripe — we never store card numbers."
      cta={{ label: 'View Billing & Invoices', href: '/customer/invoices' }}
    />
  );
}
