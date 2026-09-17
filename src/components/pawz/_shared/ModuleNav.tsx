'use client';

import {
  LayoutGrid, Users, PawPrint, Calendar, FileText, CalendarRange,
  Tag, CalendarClock, Receipt, FileSearch, Package, Truck,
  ArrowDownLeft, Inbox, BookOpen, CreditCard, Coins, RotateCcw,
  Gift, Scale, BarChart3, Terminal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DawgNavSection } from '@/lib/types';

const moduleGroups: Record<string, { id: DawgNavSection; label: string; icon: React.ElementType }[]> = {
  CRM: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'pets', label: 'Pets', icon: PawPrint },
    { id: 'appointments', label: 'Appointments', icon: Calendar },
    { id: 'grooming-records', label: 'Grooming', icon: FileText },
    { id: 'calendar', label: 'Calendar', icon: CalendarRange },
    { id: 'services', label: 'Services', icon: Tag },
    { id: 'staff', label: 'Staff', icon: Users },
    { id: 'schedule', label: 'Schedule', icon: CalendarClock },
  ],
  ORDERS: [
    { id: 'orders', label: 'Orders', icon: Receipt },
    { id: 'order-details', label: 'Details', icon: FileSearch },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'shipping', label: 'Shipping', icon: Truck },
    { id: 'returns', label: 'Returns', icon: ArrowDownLeft },
    { id: 'purchase-orders', label: 'POs', icon: Inbox },
  ],
  ACCOUNTING: [
    { id: 'books', label: 'Books', icon: BookOpen },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'deposits', label: 'Deposits', icon: Coins },
    { id: 'refunds', label: 'Refunds', icon: RotateCcw },
    { id: 'gift-cards', label: 'Gift Cards', icon: Gift },
    { id: 'payroll', label: 'Payroll', icon: Users },
    { id: 'taxes', label: 'Taxes', icon: Scale },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'stripe-connections', label: 'Stripe', icon: Terminal },
  ],
};

export function ModuleNav({
  activeSection,
  onNavigate,
}: {
  activeSection: DawgNavSection;
  onNavigate: (section: DawgNavSection) => void;
}) {
  const activeModule = Object.entries(moduleGroups).find(([, items]) =>
    items.some((item) => item.id === activeSection)
  );
  if (!activeModule) return null;
  const items = activeModule[1];

  return (
    <nav className="flex items-center gap-1 px-4 py-1.5 border-b border-border bg-card overflow-x-auto custom-scrollbar">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeSection === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            title={item.label}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-2.5 h-7 text-[12px] font-medium transition-colors cursor-pointer whitespace-nowrap',
              isActive
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="size-3.5 shrink-0" />
            <span className="hidden sm:inline">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
