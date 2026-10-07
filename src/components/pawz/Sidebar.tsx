'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DawgNavSection, LocationItem } from '@/lib/types';
import {
  PawPrint,
  LayoutGrid,
  Users,
  Calendar,
  CreditCard,
  Repeat,
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
  MessageSquare,
  Scissors,
  ClipboardCheck,
  Phone,
  GraduationCap,
  Library,
  PlayCircle,
  Award,
  FolderOpen,
  UserCheck,
  Heart,
  Stethoscope,
  Pill,
  Building2,
  ShieldCheck,
  House,
  Bell,
  BellRing,
  LifeBuoy,
  LogOut,
  CalendarPlus,
  Store,
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
//   customer   — PET PARENT: the owner's exact My Account tree (My Orders /
//                My Appointments / Learn Courses / My Pet Health / My Profile /
//                Need Help? / Sign Out). Route-driven: every item is a <Link>,
//                active state comes from usePathname — NOT the section store —
//                so direct visits, back/forward and in-page links all highlight
//                correctly. Admin/groomer/frontdesk keep the section-id store
//                mechanism unchanged.
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
  /** Customer variant only: fires the pinned Sign Out button (POST logout,
   * then redirect). Other variants ignore it. */
  onSignOut?: () => void;
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
  /** Section-id nav groups (admin/groomer/frontdesk/lms). The customer
   * variant navigates by route instead — see CUSTOMER_NAV below. */
  groups?: NavGroup[];
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
      {
        category: 'POS',
        categoryDefaultSection: 'pos',
        items: [
          { id: 'pos', label: 'Cloud Register', icon: CreditCard },
          { id: 'subscriptions', label: 'Subscriptions', icon: Repeat },
        ],
      },
    ],
  },

  customer: {
    // The customer rail is the owner's exact My Account tree, rendered as
    // <Link> rows (route-driven) — see CUSTOMER_NAV. No section-id groups.
    subtitle: 'Pet Parent Portal',
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

// ----------------------------------------------------------------------------
// CUSTOMER_NAV — the owner's exact My Account menu tree (verbatim, in order).
// Enterprise pattern: group headers as muted uppercase labels (never
// collapsible — children always visible), children as indented rows with
// icons, standalone items (Learn Courses, Need Help?) as top-level rows.
// Every row navigates by ROUTE (next/link); the active row is derived from
// usePathname, so the rail is correct on direct visits, back/forward, and
// in-page links alike — not just on sidebar clicks.
// ----------------------------------------------------------------------------

interface CustomerNavItem {
  label: string;
  icon: React.ElementType;
  href: string;
}

interface CustomerNavBlock {
  /** Muted uppercase group header. Omitted for standalone top-level items. */
  category?: string;
  items: CustomerNavItem[];
}

const CUSTOMER_NAV: CustomerNavBlock[] = [
  // The two tenets the portal owes every signed-in visitor: a way BACK to
  // the public site (shop/services) and a way to start the NEXT booking —
  // both pinned at the very top of the rail, above everything else.
  {
    items: [
      { label: 'Book a New Appointment', icon: CalendarPlus, href: '/book/appointment' },
      { label: 'Back to the Shop', icon: Store, href: '/shop' },
    ],
  },
  {
    items: [{ label: 'Notifications', icon: BellRing, href: '/customer/notifications' }],
  },
  {
    category: 'My Orders',
    items: [
      { label: 'Order History', icon: Receipt, href: '/customer/orders' },
      { label: 'Buy Again', icon: RotateCcw, href: '/customer/orders/buy-again' },
      { label: 'Wish List', icon: Heart, href: '/customer/orders/wish-list' },
      { label: 'Autoship', icon: Repeat, href: '/customer/orders/autoship' },
      { label: 'Subscriptions', icon: CalendarClock, href: '/customer/orders/subscriptions' },
      { label: 'Perks Dashboard', icon: Gift, href: '/customer/orders/perks' },
    ],
  },
  {
    category: 'My Appointments',
    items: [
      { label: 'Grooming Appointments', icon: Calendar, href: '/customer/appointments' },
      { label: 'Vet Appointments', icon: Stethoscope, href: '/customer/appointments/vet' },
    ],
  },
  {
    items: [{ label: 'Learn Courses', icon: GraduationCap, href: '/customer/learn' }],
  },
  {
    category: 'My Pet Health',
    items: [
      { label: 'Records', icon: FileText, href: '/customer/health/records' },
      { label: 'My Prescriptions', icon: Pill, href: '/customer/health/prescriptions' },
      { label: 'My Vet', icon: Building2, href: '/customer/health/my-vet' },
      { label: 'Insurance', icon: ShieldCheck, href: '/customer/health/insurance' },
    ],
  },
  {
    category: 'My Profile',
    items: [
      { label: 'My Pets', icon: PawPrint, href: '/customer/pets' },
      { label: 'Payment Methods', icon: CreditCard, href: '/customer/profile/payment-methods' },
      { label: 'Address Book', icon: House, href: '/customer/profile/address-book' },
      { label: 'Communication Preferences', icon: Bell, href: '/customer/profile/communication-preferences' },
    ],
  },
  {
    items: [{ label: 'Need Help?', icon: LifeBuoy, href: '/customer/help' }],
  },
];

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
  onSignOut,
}) => {
  const pathname = usePathname();
  const [showLocationMenu, setShowLocationMenu] = React.useState(false);
  // Collapsible category state — each parent (CRM / ORDERS / ACCOUNTING / …)
  // can be expanded/collapsed so the sidebar never runs off the bottom.
  // Default: all expanded. When collapsed, only the header shows.
  const [collapsedCategories, setCollapsedCategories] = React.useState<Set<string>>(new Set());

  const toggleCategory = (category: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

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
  const navGroups = config.groups ?? [];

  const navButtonClass = (isActive: boolean) =>
    cn(
      'group/item relative w-full flex items-center rounded-md text-[13px] leading-none transition-colors duration-150 cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar',
      isCollapsed ? 'justify-center p-2.5' : 'gap-2.5 px-3 py-2',
      isActive
        ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
        : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
    );

  // Customer rows are <Link>s — same visual language as navButtonClass, with
  // an extra indent for children under a group header (the enterprise
  // parent/child pattern: header label + indented child rows).
  const customerLinkClass = (isActive: boolean, isChild: boolean) =>
    cn(
      'group/item relative flex w-full items-center rounded-md text-[13px] leading-none transition-colors duration-150 cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar',
      isCollapsed ? 'justify-center p-2.5' : 'gap-2.5 px-3 py-2',
      !isCollapsed && isChild && 'pl-9',
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

          {/* Navigation — variant decides the mechanism.
              customer: the owner's exact My Account tree as ROUTE <Link>s
              (active state from usePathname; group headers are labels,
              children always visible and indented).
              admin/groomer/frontdesk/lms: the section-id groups exactly as
              before — collapsible categories, store-driven active state. */}
          <nav className="custom-scrollbar flex-1 overflow-y-auto py-2 text-sidebar-foreground">
            {variant === 'customer'
              ? CUSTOMER_NAV.map((block, bIdx) => {
                  const isChild = Boolean(block.category);
                  return (
                    <div key={bIdx} className="space-y-0.5">
                      {block.category && !isCollapsed && (
                        <div className="px-3 pt-3 pb-1">
                          <p className="font-bar text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/50">
                            {block.category}
                          </p>
                        </div>
                      )}
                      {isCollapsed && bIdx > 0 && (
                        <div className="divider-hair mx-3 my-2 h-px" />
                      )}
                      <ul className="space-y-0.5 px-2">
                        {block.items.map((item) => {
                          const Icon = item.icon;
                          const isActive = pathname === item.href;

                          const link = (
                            <Link
                              href={item.href}
                              onClick={onCloseMobile}
                              aria-current={isActive ? 'page' : undefined}
                              className={customerLinkClass(isActive, isChild)}
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
                            </Link>
                          );

                          return (
                            <li key={item.href} className="relative">
                              {isCollapsed ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                                  <TooltipContent side="right" sideOffset={8}>
                                    {item.label}
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                link
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })
              : navGroups.map((group, gIdx) => {
              const isCatCollapsed = group.category ? collapsedCategories.has(group.category) : false;
              return (
              <div key={gIdx} className="space-y-0.5">
                {group.category && !isCollapsed && (
                  <div className="px-3 pt-3 pb-1">
                    <button
                      onClick={() => toggleCategory(group.category!)}
                      className="flex w-full items-center justify-between font-bar text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/50 transition-colors hover:text-sidebar-foreground/80 cursor-pointer text-left"
                    >
                      <span>{group.category}</span>
                      <ChevronDown
                        className={cn(
                          'h-3 w-3 transition-transform duration-200 text-sidebar-foreground/40',
                          isCatCollapsed && '-rotate-90',
                        )}
                        strokeWidth={2.5}
                      />
                    </button>
                  </div>
                )}
                {isCollapsed && gIdx > 0 && (
                  <div className="divider-hair mx-3 my-2 h-px" />
                )}
                {!isCatCollapsed && (
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
                )}
              </div>
              );
            })}
          </nav>

          {/* Customer variant only: Sign Out pinned at the bottom of the
              rail (the drawer pattern the owner specified). Fires the
              layout's sign-out handler — POST /api/auth/logout, clear the
              store, redirect home. */}
          {variant === 'customer' && onSignOut && (
            <div className="flex-shrink-0 border-t border-sidebar-border px-2 py-2.5">
              {isCollapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={onSignOut}
                      aria-label="Sign Out"
                      className={navButtonClass(false)}
                    >
                      <LogOut className="h-4 w-4 shrink-0 text-sidebar-foreground/70" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    Sign Out
                  </TooltipContent>
                </Tooltip>
              ) : (
                <button
                  type="button"
                  onClick={onSignOut}
                  className={navButtonClass(false)}
                >
                  <LogOut className="h-4 w-4 shrink-0 text-sidebar-foreground/70 group-hover/item:text-sidebar-accent-foreground" />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          )}
        </aside>
      </TooltipProvider>
    </>
  );
};
