'use client';

import React from 'react';
import { DawgNavSection, LocationItem } from '@/lib/types';
import {
  PawPrint,
  LayoutGrid,
  Users,
  Calendar,
  CreditCard,
  FileText,
  Coins,
  RotateCcw,
  Gift,
  Tag,
  CalendarClock,
  Package,
  BarChart3,
  Settings,
  ChevronDown,
  Plus,
  X,
  Receipt,
  FileSearch,
  Truck,
  ArrowDownLeft,
  Inbox,
  Terminal,
  BookOpen,
  Scale,
  CalendarRange,
  ShoppingBag,
  MessageSquare,
  Scissors,
  ClipboardCheck,
  Phone,
  PhoneCall,
  GraduationCap,
  Library,
  PlayCircle,
  Award,
  FolderOpen,
  UserCheck,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// ============================================================================
// Portal-aware Sidebar.
//
// Each of the five doors gets its OWN sidebar identity — no shared "Service
// Portal" label and no admin business nav bleeding into the customer or
// groomer rail. The variant decides which nav groups render and the brand
// subtitle shown in the header.
//
//   admin      — the full OS: CRM / ORDERS / ACCOUNTING (the only place these
//                sections belong — groomers and customers never see them)
//   customer   — PET PARENT: dashboard, appointments, my pets, my orders,
//                billing, messages
//   groomer    — GROOMER STATION: station dashboard, assigned appointments,
//                shifts, handling notes, style records
//   frontdesk  — FRONT DESK: desk dashboard, check-in, today's appointments,
//                customers, pets, quick POS, schedule, phone messages
//   lms        — LEARNING CENTER: my learning, catalog, in progress,
//                completed, certificates, resources
// ============================================================================

export type SidebarVariant = 'admin' | 'customer' | 'groomer' | 'frontdesk' | 'lms';

interface SidebarProps {
  activeSection: DawgNavSection;
  onSelectSection: (section: DawgNavSection) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  selectedLocation: string;
  onSelectLocation: (loc: string) => void;
  locationsList?: LocationItem[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  /** Which door's sidebar to render. Defaults to 'admin' for backward compat. */
  variant?: SidebarVariant;
}

interface NavGroup {
  category?: string;
  categoryDefaultSection?: DawgNavSection;
  items: {
    id: DawgNavSection;
    label: string;
    icon: React.ElementType;
    badge?: string;
  }[];
}

interface VariantConfig {
  /** Brand subtitle shown under "All About Pawz" in the sidebar header. */
  subtitle: string;
  groups: NavGroup[];
}

const VARIANT_CONFIG: Record<SidebarVariant, VariantConfig> = {
  admin: {
    subtitle: 'Admin OS',
    groups: [
      {
        category: 'CRM',
        categoryDefaultSection: 'dashboard',
        items: [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
          { id: 'customers', label: 'Customers', icon: Users },
          { id: 'pets', label: 'Pets & Patients', icon: PawPrint },
          { id: 'appointments', label: 'Appointments', icon: Calendar },
          { id: 'grooming-records', label: 'Grooming Records', icon: FileText },
          { id: 'calendar', label: 'Full Calendar', icon: CalendarRange },
          { id: 'services', label: 'Services & Pricing', icon: Tag },
          { id: 'staff', label: 'Staff & Groomers', icon: Users },
          { id: 'schedule', label: 'Schedule & Shifts', icon: CalendarClock },
        ],
      },
      {
        category: 'ORDERS',
        categoryDefaultSection: 'orders',
        items: [
          { id: 'orders', label: 'Orders & POS', icon: Receipt },
          { id: 'order-details', label: 'Order Details', icon: FileSearch },
          { id: 'inventory', label: 'Products & Inventory', icon: Package },
          { id: 'shipping', label: 'Shipping Station', icon: Truck },
          { id: 'returns', label: 'Returns & RMA', icon: ArrowDownLeft },
          { id: 'purchase-orders', label: 'Purchase Orders', icon: Inbox },
        ],
      },
      {
        category: 'ACCOUNTING',
        categoryDefaultSection: 'books',
        items: [
          { id: 'books', label: 'Books & Records', icon: BookOpen },
          { id: 'invoices', label: 'Invoices & Sales', icon: FileText },
          { id: 'payments', label: 'Payments & Register', icon: CreditCard },
          { id: 'deposits', label: 'Deposits & Escrow', icon: Coins },
          { id: 'refunds', label: 'Refunds & Disputes', icon: RotateCcw },
          { id: 'gift-cards', label: 'Gift Cards & Credits', icon: Gift },
          { id: 'payroll', label: 'Payroll & Commissions', icon: Users },
          { id: 'taxes', label: 'Taxes & Compliance', icon: Scale },
          { id: 'reports', label: 'Financial Reports', icon: BarChart3 },
          { id: 'financial-settings', label: 'Financial Settings', icon: Settings },
          { id: 'stripe-connections', label: 'Stripe Connections', icon: Terminal },
        ],
      },
    ],
  },

  customer: {
    subtitle: 'Pet Parent Portal',
    groups: [
      {
        category: 'PET PARENT',
        categoryDefaultSection: 'dashboard',
        items: [
          { id: 'dashboard', label: 'Parent Dashboard', icon: LayoutGrid },
          { id: 'appointments', label: 'Appointments', icon: Calendar },
          { id: 'pets', label: 'My Pets', icon: PawPrint },
          { id: 'orders', label: 'My Orders', icon: ShoppingBag },
          { id: 'invoices', label: 'Billing & Invoices', icon: FileText },
          { id: 'messages', label: 'Messages', icon: MessageSquare },
        ],
      },
    ],
  },

  groomer: {
    subtitle: 'Groomer Station',
    groups: [
      {
        category: 'GROOMER STATION',
        categoryDefaultSection: 'dashboard',
        items: [
          { id: 'dashboard', label: 'Station Dashboard', icon: LayoutGrid },
          { id: 'appointments', label: 'Assigned Appointments', icon: Calendar },
          { id: 'schedule', label: 'My Shifts', icon: CalendarClock },
          { id: 'grooming-records', label: 'Handling Notes', icon: FileText },
          { id: 'pets', label: 'Style Records', icon: Scissors },
        ],
      },
    ],
  },

  frontdesk: {
    subtitle: 'Front Desk',
    groups: [
      {
        category: 'FRONT DESK',
        categoryDefaultSection: 'dashboard',
        items: [
          { id: 'dashboard', label: 'Desk Dashboard', icon: LayoutGrid },
          { id: 'check-in', label: 'Check-In / Walk-In', icon: UserCheck },
          { id: 'appointments', label: "Today's Appointments", icon: ClipboardCheck },
          { id: 'customers', label: 'Customers', icon: Users },
          { id: 'pets', label: 'Pets & Patients', icon: PawPrint },
          { id: 'orders', label: 'Quick POS', icon: Receipt },
          { id: 'schedule', label: 'Schedule & Shifts', icon: CalendarClock },
          { id: 'phone-messages', label: 'Phone Messages', icon: Phone },
        ],
      },
    ],
  },

  lms: {
    subtitle: 'Learning Center',
    groups: [
      {
        category: 'LEARN',
        categoryDefaultSection: 'my-learning',
        items: [
          { id: 'my-learning', label: 'My Learning', icon: GraduationCap },
          { id: 'course-catalog', label: 'Course Catalog', icon: Library },
          { id: 'in-progress', label: 'In Progress', icon: PlayCircle },
          { id: 'completed', label: 'Completed', icon: Award },
          { id: 'certificates', label: 'Certificates', icon: Award },
          { id: 'resources', label: 'Resources', icon: FolderOpen },
        ],
      },
    ],
  },
};

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  mobileOpen,
  onCloseMobile,
  selectedLocation,
  onSelectLocation,
  locationsList,
  isCollapsed = false,
  onToggleCollapse,
  variant = 'admin',
}) => {
  const [showLocationMenu, setShowLocationMenu] = React.useState(false);

  const fallbackLocations = [
    'All About Pawz – Main Location',
    'All About Pawz – Westside Spa',
    'All About Pawz – Mobile Van #1',
  ];

  const displayLocations =
    locationsList && locationsList.length > 0
      ? locationsList.map((l) => l.name)
      : fallbackLocations;

  const config = VARIANT_CONFIG[variant];
  const navGroups = config.groups;

  const navButtonClass = (isActive: boolean) =>
    cn(
      'group/item relative w-full flex items-center rounded-md text-[13px] leading-none transition-colors duration-150 cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar',
      isCollapsed ? 'justify-center p-2.5' : 'gap-2.5 px-3 py-2',
      isActive
        ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
        : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
    );

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-foreground/[0-9]0 backdrop-blur-xs lg:hidden"
        />
      )}

      <TooltipProvider delayDuration={150}>
        <aside
          className={cn(
            'fixed top-0 bottom-0 left-0 z-50 flex flex-col flex-shrink-0 h-screen overflow-hidden select-none bg-sidebar text-sidebar-foreground transition-[width,transform] duration-200 ease-in-out',
            mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0',
            isCollapsed ? 'lg:w-16' : 'lg:w-64'
          )}
        >
          {/* Brand Header — sticky at top. Subtitle is per-variant so each
              door has its own identity (not the generic "Service Portal"). */}
          <div
            className={cn(
              'sticky top-0 z-10 flex items-center justify-between flex-shrink-0 bg-sidebar/95 backdrop-blur-sm',
              isCollapsed ? 'flex-col gap-2 p-3' : 'p-3.5'
            )}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="size-4 text-brand-foreground">
                <PawPrint className="h-4 w-4" />
              </div>
              {!isCollapsed && (
                <div className="min-w-0">
                  <h1 className="truncate font-bar text-sm font-semibold leading-none tracking-tight text-sidebar-foreground">
                    All About Pawz
                  </h1>
                  <p className="mt-1 text-[10px] font-medium text-sidebar-foreground/60">
                    {config.subtitle}
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={onCloseMobile}
              type="button"
              aria-label="Close Mobile Navigation"
              className="lg:hidden inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Navigation Groups List — only the current variant's groups.
              This is the actual fix: customer and groomer never see CRM /
              ORDERS / ACCOUNTING nav. */}
          <nav className="custom-scrollbar flex-1 overflow-y-hidden py-2 text-sidebar-foreground">
            {navGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-0.5">
                {group.category && !isCollapsed && (
                  <div className="px-3 pt-3 pb-1">
                    <button
                      onClick={() => {
                        if (group.categoryDefaultSection) {
                          onSelectSection(group.categoryDefaultSection);
                          onCloseMobile();
                        }
                      }}
                      className="font-bar text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/50 transition-colors hover:text-sidebar-foreground/80 cursor-pointer text-left"
                    >
                      {group.category}
                    </button>
                  </div>
                )}
                {isCollapsed && gIdx > 0 && (
                  <div className="divider-hair mx-3 my-2 h-px" />
                )}
                <ul className="space-y-0.5 px-2">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeSection === item.id;

                    const button = (
                      <button
                        onClick={() => {
                          onSelectSection(item.id);
                          onCloseMobile();
                        }}
                        className={navButtonClass(isActive)}
                      >
                        <Icon
                          className={cn(
                            'h-4 w-4 shrink-0 transition-colors duration-150',
                            isActive
                              ? 'text-sidebar-accent-foreground'
                              : 'text-sidebar-foreground/70 group-hover/item:text-sidebar-accent-foreground'
                          )}
                        />
                        {!isCollapsed && (
                          <span className="truncate">{item.label}</span>
                        )}
                        {!isCollapsed && item.badge && !isActive && (
                          <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );

                    return (
                      <li key={item.id} className="relative">
                        {isCollapsed ? (
                          <Tooltip>
                            <TooltipTrigger asChild>{button}</TooltipTrigger>
                            <TooltipContent side="right" sideOffset={8}>
                              {item.label}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          button
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </aside>
      </TooltipProvider>
    </>
  );
};
