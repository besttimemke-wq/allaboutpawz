'use client';

import React from 'react';
import { DawgNavSection, LocationItem } from '@/lib/dawg-types';
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
  Folder,
  MessageSquare,
  Megaphone,
  Settings,
  MapPin,
  ChevronDown,
  Plus,
  X
} from 'lucide-react';

interface SidebarProps {
  activeSection: DawgNavSection;
  onSelectSection: (section: DawgNavSection) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  selectedLocation: string;
  onSelectLocation: (loc: string) => void;
  locationsList?: LocationItem[];
}

interface NavGroup {
  category?: string;
  items: {
    id: DawgNavSection;
    label: string;
    icon: React.ElementType;
    badge?: string;
  }[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  mobileOpen,
  onCloseMobile,
  selectedLocation,
  onSelectLocation,
  locationsList,
}) => {
  const [showLocationMenu, setShowLocationMenu] = React.useState(false);

  const fallbackLocations = [
    'All About Pawz – Main Location',
    'All About Pawz – Westside Spa',
    'All About Pawz – Mobile Van #1',
  ];

  const displayLocations = locationsList && locationsList.length > 0
    ? locationsList.map(l => l.name)
    : fallbackLocations;

  const navGroups: NavGroup[] = [
    {
      category: 'MAIN',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
        { id: 'customers', label: 'Customers', icon: Users },
        { id: 'appointments', label: 'Appointments', icon: Calendar },
      ],
    },
    {
      category: 'FINANCIAL',
      items: [
        { id: 'payments', label: 'Payments', icon: CreditCard },
        { id: 'invoices', label: 'Invoices', icon: FileText },
        { id: 'deposits', label: 'Deposits', icon: Coins },
        { id: 'refunds', label: 'Refunds', icon: RotateCcw },
        { id: 'gift-cards', label: 'Gift Cards / Credits', icon: Gift },
      ],
    },
    {
      category: 'BUSINESS',
      items: [
        { id: 'services', label: 'Services', icon: Tag },
        { id: 'staff', label: 'Staff', icon: Users },
        { id: 'schedule', label: 'Schedule / Shifts', icon: CalendarClock },
        { id: 'inventory', label: 'Products / Inventory', icon: Package },
        { id: 'reports', label: 'Reports', icon: BarChart3 },
      ],
    },
    {
      category: 'CONTENT',
      items: [
        { id: 'documents', label: 'Documents', icon: Folder },
        { id: 'communications', label: 'Communications', icon: MessageSquare },
        { id: 'marketing', label: 'Marketing / CMS', icon: Megaphone },
      ],
    },
    {
      category: 'ADMIN',
      items: [
        { id: 'settings', label: 'Settings', icon: Settings },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
        />
      )}

      <aside className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col flex-shrink-0 h-full select-none transition-transform duration-200 ease-in-out ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        {/* Brand Logo Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-950 flex items-center justify-center text-white shadow-xs">
              <PawPrint className="w-5 h-5 fill-white" />
            </div>
            <div className="leading-tight">
              <h1 className="font-bold text-slate-900 text-sm tracking-tight">All About</h1>
              <p className="font-extrabold text-indigo-950 text-xs tracking-wide">
                Pawz <span className="text-[10px] font-semibold text-indigo-600 uppercase tracking-widest ml-0.5">OS</span>
              </p>
            </div>
          </div>
          <button 
            onClick={onCloseMobile}
            className="lg:hidden text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100" 
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items List */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-2 text-xs font-medium text-slate-600 custom-scrollbar">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-0.5">
              {group.category && (
                <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {group.category}
                </div>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectSection(item.id);
                      onCloseMobile();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors text-left cursor-pointer ${
                      isActive
                        ? 'bg-[#f0edff] text-[#5b54d6] font-semibold shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-[#6366f1]' : 'text-slate-400'}`} />
                      <span className="truncate text-xs">{item.label}</span>
                    </div>
                    {item.badge && !isActive && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-500 font-medium">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar Bottom Branch Selector & User Card */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/70 space-y-2 flex-shrink-0 relative">
          {/* Location dropdown trigger */}
          <div className="relative">
            <button
              onClick={() => setShowLocationMenu(!showLocationMenu)}
              className="w-full flex items-center justify-between px-3 py-2 bg-white rounded-xl border border-slate-200 text-left hover:border-slate-300 transition-all shadow-2xs"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <MapPin className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                <span className="text-[11px] font-medium text-slate-700 truncate">
                  {selectedLocation}
                </span>
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400 flex-shrink-0" />
            </button>

            {showLocationMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-1.5 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 z-30 space-y-1">
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Select Active Branch
                </div>
                {displayLocations.map((loc) => (
                  <button
                    key={loc}
                    onClick={() => {
                      onSelectLocation(loc);
                      setShowLocationMenu(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] truncate transition-colors cursor-pointer ${
                      selectedLocation === loc ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {loc}
                  </button>
                ))}
                <div className="border-t border-slate-100 pt-1 mt-1">
                  <button
                    onClick={() => {
                      setShowLocationMenu(false);
                      onSelectSection('settings');
                    }}
                    className="w-full text-left px-2 py-1.5 rounded-lg text-[10px] font-semibold text-indigo-600 hover:bg-indigo-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Manage / Add Locations</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Admin profile bar */}
          <div className="flex items-center justify-between px-2 py-1.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                AP
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800 leading-tight">Admin User</p>
                <p className="text-[10px] text-slate-400 leading-tight">Administrator</p>
              </div>
            </div>
            <button 
              onClick={() => onSelectSection('settings')}
              title="Admin Settings"
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
