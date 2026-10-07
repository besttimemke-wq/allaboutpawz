'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  Calendar,
  CalendarDays,
  ChevronDown,
  LayoutGrid,
  LogOut,
  Mail,
  MapPin,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  PawPrint,
  Phone,
  Plus,
  Scissors,
  Search,
  Settings,
  UserCog,
  Users,
} from 'lucide-react';
import { AuthUser, DawgNavSection } from '@/lib/types';
import { cn } from '@/lib/utils';
import { NAV } from '@/components/site/nav';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

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
   *  admin OS shows these — customer, groomer, seller and LMS portals
   *  pass false so business nav never leaks into their chrome. */
  showPillars?: boolean;
  /** Show the MAIN SITE navigation hamburger — the public site's nav
   *  (Home / Services / Shop / Book / …) in a drawer. A customer inside
   *  My Account keeps full visibility of the main site: book again, shop,
   *  explore — without leaving the portal. */
  showSiteNav?: boolean;
  /** Optional element rendered in the top-bar's right cluster (before the
   *  user menu) — the customer portal mounts its notification bell here.
   *  Nothing else changes for portals that pass nothing. */
  rightSlot?: React.ReactNode;
}

type PillarType = 'CRM' | 'ORDERS' | 'ACCOUNTING' | 'LEARN' | 'POS';

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
  showSiteNav = false,
  rightSlot,
}) => {
  const [siteNavOpen, setSiteNavOpen] = useState(false);
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
      case 'products':
      case 'categories':
      case 'brands':
      case 'filters':
      case 'promotions':
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
      { id: 'inventory', label: 'Products & Inventory' },
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
    LEARN: [
      { id: 'dashboard', label: 'Academy Home' },
    ],
    POS: [
      { id: 'pos', label: 'Register' },
      { id: 'subscriptions', label: 'Subscriptions' },
    ],
  };

  const pillarDefaultSection: Record<PillarType, DawgNavSection> = {
    CRM: 'dashboard',
    ORDERS: 'orders',
    ACCOUNTING: 'books',
    LEARN: 'dashboard',
    POS: 'pos',
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
        {/* Left: main-site nav + mobile menu + sidebar toggle */}
        <div className="flex items-center gap-2">
          {/* MAIN SITE navigation — the public site's nav in a drawer, so a
              customer inside My Account keeps visibility of the main site. */}
          {showSiteNav && (
            <button
              onClick={() => setSiteNavOpen(true)}
              aria-label="Open main site menu"
              aria-haspopup="dialog"
              className={cn(iconButtonClass, 'gap-2 px-2.5')}
            >
              <Menu className="size-5" />
              <span className="hidden text-[11px] font-semibold uppercase tracking-[0.08em] sm:inline">
                Menu
              </span>
            </button>
          )}

          <button
            onClick={onOpenMobileMenu}
            aria-label="Open my account menu"
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

          {/* Active pillar label — admin OS identity only (CRM / ORDERS /
              ACCOUNTING). Customer and other non-admin portals show nothing
              here: a pet parent never sees "CRM" in their top bar. */}
          {showPillars && (
            <span className="hidden sm:inline text-[13px] font-medium text-topbar-foreground/80 ml-2">
              {activePillar}
            </span>
          )}
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

          {/* Date dropdown — real calendar popover. Selecting a date
              navigates to /admin/calendar with that date focused. */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="hidden md:flex items-center gap-1.5 rounded-md border border-input bg-background hover:bg-accent h-9 px-3 text-[13px] text-foreground transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Pick a date"
                title="Pick a date"
              >
                <Calendar className="size-3.5 text-muted-foreground" />
                <span className="text-[13px]">{currentDate}</span>
                <ChevronDown className="size-3.5 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent
                mode="single"
                selected={new Date()}
                onSelect={(date) => {
                  if (date) {
                    // Navigate to the calendar page with the selected date.
                    onNavigateSection('calendar');
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Separator orientation="vertical" className="h-6 hidden sm:block" />

          {/* Portal slot (e.g. the customer portal's notification bell) —
              rendered before the user menu so it sits with the utilities. */}
          {rightSlot}

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
          pill row at all (dedicated portal identity — no business nav).
          White background with gray pills. Row sits below the top bar,
          pills aligned RIGHT (under the search/date/user cluster above). */}
      {showPillars && (
        <div className="h-10 px-3 sm:px-4 flex items-center justify-end gap-1 overflow-x-auto custom-scrollbar bg-background border-b border-border">
          {pillars.map((pillar) => {
            const isSelected = activePillar === pillar.id;
            // LEARN pill navigates to /learn (the academy) — it's a separate
            // app surface, not an admin sub-section.
            const handleClick = () => {
              if (pillar.id === 'LEARN') {
                window.location.href = '/learn';
              } else {
                onNavigateSection(pillarDefaultSection[pillar.id]);
              }
            };
            return (
              <button
                key={pillar.id}
                onClick={handleClick}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors duration-150 cursor-pointer',
                  isSelected
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                )}
              >
                {pillar.label}
              </button>
            );
          })}
        </div>
      )}

      {/* MAIN SITE navigation drawer — the public site's nav (Home / About /
          Services / Shop / Book / …), the BOOK APPOINTMENT shortcut, and the
          salon's real contact facts, in the salon's cream/ink/gold language
          so it reads as the main site. Rendered for portals that pass
          showSiteNav (the customer portal — My Account keeps visibility of
          the main navigation). */}
      {showSiteNav && (
        <Sheet open={siteNavOpen} onOpenChange={setSiteNavOpen}>
          <SheetContent
            side="left"
            className="flex w-full flex-col border-r border-gold/30 bg-cream p-0 sm:max-w-[320px]"
          >
            <SheetHeader className="border-b border-gold/25 bg-white px-6 pb-4 pt-6 text-left">
              <SheetTitle className="flex items-center gap-2 font-display text-[15px] tracking-[0.1em] text-ink">
                <PawPrint className="h-4 w-4 text-gold-deep" aria-hidden="true" />
                ALL ABOUT PAWZ
              </SheetTitle>
              <SheetDescription className="text-[11px] text-ink-soft">
                The main site — book a groom, shop, and explore.
              </SheetDescription>
              <Link
                href="/book/appointment"
                onClick={() => setSiteNavOpen(false)}
                className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-md bg-ink px-4 text-[10.5px] font-bold tracking-[0.14em] text-cream transition-colors hover:bg-gold-deep"
              >
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                BOOK APPOINTMENT
              </Link>
            </SheetHeader>
            <nav aria-label="Main site" className="custom-scrollbar flex-1 overflow-y-auto px-6 py-5">
              <ul className="space-y-[9px]">
                {NAV.map((item) => (
                  <li key={item.to}>
                    <Link
                      href={item.to}
                      onClick={() => setSiteNavOpen(false)}
                      className="group relative flex items-center gap-3"
                    >
                      <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border border-gold/45 bg-cream text-[9px] font-bold text-gold-deep transition-colors group-hover:border-gold-deep group-hover:bg-gold-deep group-hover:text-cream">
                        {item.n}
                      </span>
                      <span className="text-[10.5px] font-bold tracking-[0.13em] text-ink-soft transition-colors group-hover:text-gold-deep">
                        {item.label}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-6 space-y-2.5 border-t border-gold/25 pt-5 text-[10.5px] leading-[1.55] text-ink-soft">
                <p className="flex gap-2.5">
                  <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-deep" aria-hidden="true" />
                  901-722-1114
                </p>
                <p className="flex gap-2.5">
                  <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-deep" aria-hidden="true" />
                  booking@aapawz.com
                </p>
              </div>
            </nav>
            <div className="border-t border-gold/25 bg-white px-6 py-4">
              <Link
                href="/customer/dashboard"
                onClick={() => setSiteNavOpen(false)}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-md border border-ink/15 text-[10.5px] font-bold tracking-[0.14em] text-ink-soft transition-colors hover:border-gold-deep/50 hover:text-gold-deep"
              >
                <LayoutGrid className="h-4 w-4" aria-hidden="true" />
                BACK TO MY ACCOUNT
              </Link>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </header>
  );
};
