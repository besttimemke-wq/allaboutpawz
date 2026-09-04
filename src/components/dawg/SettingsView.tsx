'use client';

import React, { useState } from 'react';
import { LocationItem, DawgNavSection } from '@/lib/dawg-types';
import {
  Search,
  Bell,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  LayoutGrid,
  Building2,
  Users,
  Calendar,
  Tag,
  CreditCard,
  Globe,
  UserCheck,
  MessageSquare,
  Package,
  BarChart3,
  Sliders,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  X,
  Sparkles
} from 'lucide-react';
import { AdminOverviewTab } from './settings/AdminOverviewTab';
import { OrganizationTab } from './settings/OrganizationTab';
import { UsersAccessTab } from './settings/UsersAccessTab';
import { BookingOperationsTab } from './settings/BookingOperationsTab';
import { PaymentsTab } from './settings/PaymentsTab';
import { WebsiteTab } from './settings/WebsiteTab';
import {
  ServicesPricingTab,
  CustomerPortalTab,
  CommunicationsTab,
  InventoryTab,
  ReportsTab,
  SystemTab,
} from './settings/OtherSettingsTabs';

interface SettingsViewProps {
  locations: LocationItem[];
  selectedLocation: string;
  onSelectLocation: (locName: string) => void;
  onAddLocation: (newLoc: Partial<LocationItem>) => void;
  onDeleteLocation?: (id: string) => void;
  onNavigateSection?: (section: DawgNavSection) => void;
  onOpenQuickAction?: (action: 'appointment' | 'customer' | 'pet' | 'payment' | 'invoice') => void;
  initialTab?: string;
}

export type SettingsTabId =
  | 'overview'
  | 'organization'
  | 'users'
  | 'booking'
  | 'services'
  | 'payments'
  | 'website'
  | 'portal'
  | 'communications'
  | 'inventory'
  | 'reports'
  | 'system';

interface TabConfig {
  id: SettingsTabId;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

const TABS: TabConfig[] = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'organization', label: 'Organization', icon: Building2 },
  { id: 'users', label: 'Users & Access', icon: Users, badge: '5' },
  { id: 'booking', label: 'Booking & Operations', icon: Calendar },
  { id: 'services', label: 'Services & Pricing', icon: Tag },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'website', label: 'Website', icon: Globe },
  { id: 'portal', label: 'Customer Portal', icon: UserCheck },
  { id: 'communications', label: 'Communications', icon: MessageSquare },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'system', label: 'System', icon: Sliders },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  locations,
  selectedLocation,
  onSelectLocation,
  onAddLocation,
  onDeleteLocation,
  onNavigateSection,
  onOpenQuickAction,
  initialTab = 'overview',
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTabId>(
    (initialTab as SettingsTabId) || 'overview'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showWebsiteModal, setShowWebsiteModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Quick jump filter for search
  const filteredTabs = searchQuery.trim()
    ? TABS.filter(
        (t) =>
          t.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <div className="min-h-full bg-[#f8faff] text-slate-800 font-sans antialiased pb-12">
      {/* Top Header Bar */}
      <header className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 bg-white/80 backdrop-blur-sm sticky top-0 z-20">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Admin Settings</h1>
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
              Unified OS Control
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your business, website, admin users, permissions, and system settings in one place.
          </p>
        </div>

        {/* Header Right Utilities & Actions */}
        <div className="flex items-center gap-3">
          {/* Search Input with Keyboard Shortcut */}
          <div className="relative w-64 md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search settings (e.g. admin, stripe, hours)..."
              className="w-full pl-9 pr-12 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white"
            />
            <span className="absolute right-2.5 top-2 text-[10px] font-semibold text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-2xs leading-none">
              ⌘K
            </span>

            {/* Quick search dropdown */}
            {searchQuery.trim().length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-50 space-y-1">
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Matching Modules
                </div>
                {filteredTabs.length > 0 ? (
                  filteredTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setSearchQuery('');
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 font-medium flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <tab.icon className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{tab.label}</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-2 text-xs text-slate-400">No matching setting found.</p>
                )}
              </div>
            )}
          </div>

          {/* Notification Bell with Counter */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              title="System Alerts"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white leading-none">
                3
              </span>
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-1.5 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 z-50 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-900">Admin Alerts</span>
                  <span
                    onClick={() => setShowNotifications(false)}
                    className="text-[10px] font-semibold text-indigo-600 hover:underline cursor-pointer"
                  >
                    Close
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-900">
                    <p className="font-bold text-[11px]">Daily Backup Verified</p>
                    <p className="text-[10px] text-emerald-700">All customer &amp; pet files backed up safely.</p>
                  </div>
                  <div className="p-2 rounded-lg bg-indigo-50 text-indigo-900">
                    <p className="font-bold text-[11px]">Stripe Payout Cleared</p>
                    <p className="text-[10px] text-indigo-700">$2,450.00 deposited into business account.</p>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-50 text-amber-900">
                    <p className="font-bold text-[11px]">Admin Seat Invited</p>
                    <p className="text-[10px] text-amber-700">Jordan Hayes pending invite acceptance.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Help Info Icon */}
          <button
            onClick={() => setShowHelpModal(true)}
            className="p-2 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            title="Help Center"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* User Profile Dropdown Pill (Consolidated Admin User Quick Access) */}
          <div
            onClick={() => setActiveTab('users')}
            className="flex items-center gap-2 pl-1 border-l border-slate-200/60 cursor-pointer hover:opacity-80 transition-opacity"
            title="Manage Admin Users"
          >
            <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
              AD
            </div>
            <span className="text-xs font-semibold text-slate-700 hidden lg:inline">Admin User</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </div>

          {/* View Public Website CTA */}
          <button
            onClick={() => setShowWebsiteModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <span>View Public Website</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Sub-Navigation Tabs Bar */}
      <div className="bg-white border-b border-slate-200/80 px-6 overflow-x-auto custom-scrollbar sticky top-[65px] z-10">
        <div className="flex space-x-1 py-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive ? 'bg-indigo-200 text-indigo-800' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Breadcrumb / Section Header for Sub-pages */}
      {activeTab !== 'overview' && (
        <div className="px-6 pt-4 flex items-center gap-2 text-xs text-slate-500">
          <button
            onClick={() => setActiveTab('overview')}
            className="text-indigo-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Overview Hub</span>
          </button>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <span className="font-bold text-slate-800 capitalize">
            {TABS.find((t) => t.id === activeTab)?.label}
          </span>
        </div>
      )}

      {/* Main Container Area */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <AdminOverviewTab
            onSelectTab={(tabId) => setActiveTab(tabId as SettingsTabId)}
            onNavigateSection={onNavigateSection}
            onOpenQuickAction={onOpenQuickAction}
          />
        )}

        {activeTab === 'organization' && (
          <OrganizationTab
            locations={locations}
            selectedLocation={selectedLocation}
            onSelectLocation={onSelectLocation}
            onAddLocation={onAddLocation}
            onDeleteLocation={onDeleteLocation}
          />
        )}

        {activeTab === 'users' && <UsersAccessTab />}

        {activeTab === 'booking' && <BookingOperationsTab />}

        {activeTab === 'services' && <ServicesPricingTab onNavigateSection={onNavigateSection} />}

        {activeTab === 'payments' && <PaymentsTab />}

        {activeTab === 'website' && <WebsiteTab />}

        {activeTab === 'portal' && <CustomerPortalTab />}

        {activeTab === 'communications' && <CommunicationsTab />}

        {activeTab === 'inventory' && <InventoryTab onNavigateSection={onNavigateSection} />}

        {activeTab === 'reports' && <ReportsTab onNavigateSection={onNavigateSection} />}

        {activeTab === 'system' && <SystemTab />}
      </div>

      {/* Modal: Public Website Preview */}
      {showWebsiteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">Public Website &amp; Booking Portal</h3>
              </div>
              <button
                onClick={() => setShowWebsiteModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950 to-slate-900 text-white text-center space-y-3">
              <h2 className="text-xl font-extrabold tracking-tight">All About the Dawg</h2>
              <p className="text-xs text-indigo-200 max-w-md mx-auto">
                Luxury Pet Grooming &amp; Spa · Frisco, Texas · Cage-Free Gentle Care
              </p>
              <div className="pt-2 flex justify-center gap-3">
                <button
                  onClick={() => {
                    setShowWebsiteModal(false);
                    if (onOpenQuickAction) onOpenQuickAction('appointment');
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Book Appointment Now
                </button>
                <button
                  onClick={() => setShowWebsiteModal(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Help Center */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">All About the Dawg OS - Help</h3>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                <p className="font-bold text-slate-800">Need support with Stripe or SMS Gateways?</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Contact our dedicated grooming platform engineer team at <strong>support@allaboutthedawg.com</strong>.
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                <p className="font-bold text-slate-800">Admin User Permissions</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Manage staff roles and granular privileges directly inside the <strong>Users &amp; Access</strong> tab.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 font-semibold rounded-xl text-xs text-slate-700 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
