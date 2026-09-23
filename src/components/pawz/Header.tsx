'use client';

import React from 'react';
import {
  Bell,
  Calendar,
  ChevronDown,
  LayoutGrid,
  LogOut,
  MapPin,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  PawPrint,
  Plus,
  Scissors,
  Search,
  Settings,
  UserCog,
  Users,
} from 'lucide-react';
import { AuthUser, DawgNavSection } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';

interface HeaderProps {
  onOpenMobileMenu?: () => void;
  onOpenSearch?: () => void;
  currentDate?: string;
  onChangeDate?: (date: string) => void;
  onNavigateSection?: (section: DawgNavSection) => void;
  activeSection?: DawgNavSection;
  isSidebarCollapsed?: boolean;
  onToggleSidebarCollapse?: () => void;
  onOpenQuickAction?: (
    action: 'appointment' | 'customer' | 'pet' | 'intake' | 'payment' | 'invoice'
  ) => void;
  onSwitchToGroomer?: () => void;
  onSwitchToCustomer?: () => void;
  onSignOut?: () => void;
  currentUser?: AuthUser | null;
  selectedLocation?: string;
  onSelectLocation?: (loc: string) => void;
  locationsList?: string[];
  /** Render the admin OS pillar pills (CRM / Orders / Accounting). Only the
   *  admin OS shows these — customer, groomer, front desk and LMS portals
   *  pass false so business nav never leaks into their chrome. */
  showPillars?: boolean;
}

type PillarType = 'CRM' | 'ORDERS' | 'ACCOUNTING' | 'POS' | 'LEARN';

interface SubRouteItem {
  id: DawgNavSection;
  label: string;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileMenu,
  onOpenSearch,
  currentDate = 'May 16, 2025',
  onNavigateSection = () => {},
  activeSection = 'dashboard',
  isSidebarCollapsed = false,
  onToggleSidebarCollapse,
  onOpenQuickAction,
  onSwitchToGroomer,
  onSwitchToCustomer,
  onSignOut,
  currentUser,
  selectedLocation,
  onSelectLocation,
  locationsList,
  showPillars = true,
}) => {
  const getPillarFromSection = (section: DawgNavSection): PillarType => {
    switch (section) {
      case 'dashboard':
      case 'customers':
      case 'pets':
      case 'appointments':
      case 'grooming-records':
      case 'calendar':
      case 'services':
      case 'staff':
      case 'schedule':
        return 'CRM';
      case 'orders':
      case 'order-details':
      case 'inventory':
      case 'shipping':
      case 'returns':
      case 'purchase-orders':
        return 'ORDERS';
      case 'books':
      case 'invoices':
      case 'payments':
      case 'deposits':
      case 'refunds':
      case 'gift-cards':
      case 'payroll':
      case 'taxes':
      case 'reports':
      case 'financial-settings':
      case 'stripe-connections':
        return 'ACCOUNTING';
      case 'pos':
      case 'subscriptions':
        return 'POS';
      default:
        return 'LEARN';
    }
  };

  const activePillar = getPillarFromSection(activeSection);

  const subRoutesByPillar: Record<PillarType, SubRouteItem[]> = {
    CRM: [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'customers', label: 'Customers' },
      { id: 'pets', label: 'Pets & Patients' },
      { id: 'appointments', label: 'Appointments' },
      { id: 'grooming-records', label: 'Grooming Records' },
      { id: 'calendar', label: 'Calendar' },
      { id: 'services', label: 'Services' },
      { id: 'staff', label: 'Staff' },
      { id: 'schedule', label: 'Shifts' },
    ],
    ORDERS: [
      { id: 'orders', label: 'Orders & POS' },
      { id: 'order-details', label: 'Order Details' },
      { id: 'inventory', label: 'Inventory' },
      { id: 'shipping', label: 'Shipping' },
      { id: 'returns', label: 'Returns' },
      { id: 'purchase-orders', label: 'Purchase Orders' },
    ],
    ACCOUNTING: [
      { id: 'books', label: 'Books & Records' },
      { id: 'invoices', label: 'Invoices' },
      { id: 'payments', label: 'Payments' },
      { id: 'deposits', label: 'Deposits' },
      { id: 'refunds', label: 'Refunds' },
      { id: 'gift-cards', label: 'Gift Cards' },
      { id: 'payroll', label: 'Payroll' },
      { id: 'taxes', label: 'Taxes' },
      { id: 'reports', label: 'Reports' },
      { id: 'financial-settings', label: 'Financial Settings' },
      { id: 'stripe-connections', label: 'Stripe' },
    ],
    POS: [
      { id: 'pos', label: 'Register' },
      { id: 'subscriptions', label: 'Subscriptions' },
    ],
    LEARN: [
      { id: 'dashboard', label: 'Academy Home' },
    ],
  };

  const pillarDefaultSection: Record<PillarType, DawgNavSection> = {
    CRM: 'dashboard',
    ORDERS: 'orders',
    ACCOUNTING: 'books',
    POS: 'pos',
    LEARN: 'dashboard',
  };

  const pillars: { id: PillarType; label: string }[] = [
    { id: 'CRM', label: 'CRM' },
    { id: 'ORDERS', label: 'Orders' },
    { id: 'ACCOUNTING', label: 'Accounting' },
    { id: 'POS', label: 'POS' },
    { id: 'LEARN', label: 'Learn' },
  ];

  const activeSubRoute = subRoutesByPillar[activePillar]?.find(
    (r) => r.id === activeSection
  );
  const breadcrumbLabel =
    activeSubRoute?.label ??
    pillars.find((p) => p.id === activePillar)?.label ??
    'Dashboard';

  const initials = currentUser?.name
    ? currentUser.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  const roleLabel = currentUser?.role
    ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)
    : 'User';

  const iconButtonClass =
    'rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground h-9 w-9 flex items-center justify-center transition-colors duration-150 text-topbar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-topbar';

  return (
    <header className="sticky top-0 z-30 flex-shrink-0 select-none bg-topbar text-topbar-foreground">
      {/* Top bar — global utilities only (no duplicate brand, no page CTAs) */}
      <div className="h-14 px-3 sm:px-4 flex items-center justify-between gap-2">
        {/* Left: mobile menu + sidebar toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenMobileMenu}
            aria-label="Open menu"
            className={cn('lg:hidden', iconButtonClass)}
          >
            <Menu className="size-5" />
          </button>

          <button
            onClick={onToggleSidebarCollapse}
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn('hidden lg:flex', iconButtonClass)}
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </button>

          {/* Active pillar label only (no duplicate brand logo/text) */}
          <span className="hidden sm:inline text-[13px] font-medium text-topbar-foreground/80 ml-2">
            {activePillar}
          </span>
        </div>

        {/* Right: search, date, user */}
        <div className="flex items-center gap-2">
          {/* Search trigger — desktop */}
          <button
            onClick={onOpenSearch}
            className="hidden sm:flex items-center gap-2 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 text-[13px] text-muted-foreground transition-colors duration-150 w-56 max-w-[14rem] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Search className="size-4 shrink-0" />
            <span className="flex-1 text-left">Search</span>
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              ⌘K
            </kbd>
          </button>

          {/* Search trigger — mobile */}
          <button
            onClick={onOpenSearch}
            aria-label="Search"
            className={cn('sm:hidden', iconButtonClass)}
          >
            <Search className="size-4" />
          </button>

          {/* Date display */}
          <div className="hidden md:flex items-center gap-1.5 rounded-md border border-input bg-background hover:bg-accent h-9 px-3 text-[13px] text-foreground transition-colors duration-150">
            <Calendar className="size-3.5 text-muted-foreground" />
            <span className="text-[13px]">{currentDate}</span>
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </div>

          <Separator orientation="vertical" className="h-6 hidden sm:block" />

          {/* User menu */}
          {currentUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full hover:bg-sidebar-accent hover:text-sidebar-accent-foreground h-9 pr-2 pl-1 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-topbar">
                  <Avatar className="size-7 ring-1 ring-border">
                    {currentUser.avatarUrl ? (
                      <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                    ) : null}
                    <AvatarFallback className="text-primary text-[11px] font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline text-[13px] font-medium text-topbar-foreground">
                    {currentUser.name}
                  </span>
                  <ChevronDown className="hidden md:inline size-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="flex flex-col gap-0.5 px-2 py-1.5">
                  <span className="text-[13px] font-semibold text-foreground">
                    {currentUser.name}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-normal">
                    {currentUser.email}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mt-0.5">
                    {roleLabel}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {/* Switch Locations */}
                {locationsList && locationsList.length > 0 && (
                  <>
                    <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1.5">
                      <MapPin className="size-3 inline mr-1" />
                      {selectedLocation || 'Select Location'}
                    </DropdownMenuLabel>
                    {locationsList.map((loc) => (
                      <DropdownMenuItem
                        key={loc}
                        onClick={() => onSelectLocation?.(loc)}
                        className={cn(
                          'cursor-pointer text-[13px] truncate',
                          selectedLocation === loc && 'text-primary font-medium'
                        )}
                      >
                        {loc}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem
                  onClick={() => onNavigateSection('settings')}
                  className="cursor-pointer text-[13px]"
                >
                  <Settings className="size-4" />
                  Admin Settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onNavigateSection('settings')}
                  className="cursor-pointer text-[13px]"
                >
                  <UserCog className="size-4" />
                  Personal Settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer text-[13px]"
                >
                  <Bell className="size-4" />
                  Notifications
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onSignOut}
                  variant="destructive"
                  className="cursor-pointer text-[13px]"
                >
                  <LogOut className="size-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={onSwitchToCustomer}
                className="rounded-md border border-border bg-background hover:bg-accent h-9 px-3 text-[13px] text-foreground transition-colors duration-150"
              >
                Customer
              </button>
              <button
                onClick={onSwitchToGroomer}
                className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3 text-[13px] font-medium shadow-card transition-colors duration-150"
              >
                Groomer
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sub-nav — admin OS pillar pills only. Non-admin portals render no
          pill row at all (dedicated portal identity — no business nav). */}
      {showPillars && (
        <div className="h-10 px-3 sm:px-4 flex items-center gap-1 overflow-x-auto custom-scrollbar bg-topbar text-topbar-foreground">
          {pillars.map((pillar) => {
            const isSelected = activePillar === pillar.id;
            return (
              <button
                key={pillar.id}
                onClick={() => onNavigateSection(pillarDefaultSection[pillar.id])}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors duration-150 cursor-pointer',
                  isSelected
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-topbar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
                )}
              >
                {pillar.label}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
