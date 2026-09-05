'use client';

import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Search, 
  Bell, 
  ChevronDown, 
  Menu,
  Check,
  AlertCircle,
  FileText,
  Clock,
  Cake
} from 'lucide-react';
import { ALERTS_LIST } from '@/lib/mock-data';
import { AuthUser } from '@/lib/dawg-types';

interface HeaderProps {
  onOpenMobileMenu: () => void;
  onOpenSearch: () => void;
  currentDate: string;
  onChangeDate: (date: string) => void;
  onNavigateSection: (sec: any) => void;
  onSwitchToGroomer?: () => void;
  onSignOut?: () => void;
  currentUser?: AuthUser;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileMenu,
  onOpenSearch,
  currentDate,
  onChangeDate,
  onNavigateSection,
  onSwitchToGroomer,
  onSignOut,
  currentUser
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const dateOptions = [
    'Today (May 12, 2025)',
    'Tomorrow (May 13, 2025)',
    'This Week (May 12 - May 18)',
    'Custom Date Range...',
  ];

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 flex-shrink-0 z-30">
      {/* Title & Greeting + Mobile Menu Trigger */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="p-1.5 -ml-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-1.5">
            <span>Welcome back, Admin!</span>
            <span className="text-base">👋</span>
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-500 hidden xs:block">
            Here&apos;s what&apos;s happening in your business today.
          </p>
        </div>
      </div>

      {/* Right Header Tools */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Date Selector */}
        <div className="relative">
          <button
            onClick={() => setShowDateDropdown(!showDateDropdown)}
            className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <CalendarIcon className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <span className="hidden sm:inline">{currentDate}</span>
            <span className="sm:hidden">May 12</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showDateDropdown && (
            <div className="absolute right-0 mt-1.5 w-56 bg-white border border-slate-200 rounded-xl shadow-lg p-1 z-40">
              {dateOptions.map((opt) => (
                <button
                  key={opt}
                  onClick={() => {
                    if (!opt.includes('Custom')) {
                      onChangeDate(opt.replace('Today (', '').replace(')', ''));
                    }
                    setShowDateDropdown(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded-lg flex items-center justify-between"
                >
                  <span>{opt}</span>
                  {opt.includes(currentDate) && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative w-36 sm:w-56 md:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            onClick={onOpenSearch}
            readOnly
            className="w-full pl-8 pr-12 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all cursor-pointer"
            placeholder="Search..."
            type="text"
          />
          <span 
            onClick={onOpenSearch}
            className="hidden sm:inline absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded cursor-pointer"
          >
            Ctrl + K
          </span>
        </div>

        {/* Notifications button with badge */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Bell className="w-5 h-5 text-slate-600" />
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              8
            </span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-1.5 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 z-40 space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-900">Notifications & Alerts</span>
                <span className="text-[10px] font-semibold text-indigo-600 hover:underline cursor-pointer">
                  Mark all as read
                </span>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
                {ALERTS_LIST.map((alert) => (
                  <div 
                    key={alert.id}
                    onClick={() => {
                      setShowNotifications(false);
                      onNavigateSection(alert.type === 'inventory' ? 'inventory' : 'appointments');
                    }}
                    className="p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors flex items-start gap-2.5"
                  >
                    <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 mt-0.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-xs font-semibold text-slate-800 leading-tight">{alert.title}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{alert.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Branch / Company Avatar */}
        <div className="relative pl-1 sm:pl-2 border-l border-slate-200">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold flex items-center justify-center">
              AP
            </div>
            <div className="text-[11px] leading-tight text-right hidden md:block">
              <p className="font-medium text-slate-700">All About</p>
              <p className="text-slate-400">Pawz</p>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:block" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-40 space-y-1">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-800">{currentUser?.name || 'Admin User'}</p>
                <p className="text-[11px] text-slate-400">{currentUser?.email || 'admin@test.com'}</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-bold">
                  Administrator
                </span>
              </div>

              {onSwitchToGroomer && (
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    onSwitchToGroomer();
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-indigo-700 hover:bg-indigo-50 rounded-xl font-semibold flex items-center justify-between"
                >
                  <span>✂ Groomer Station Portal</span>
                  <span className="text-[10px] bg-indigo-100 px-1.5 py-0.5 rounded-md">Sarah M.</span>
                </button>
              )}

              <button 
                onClick={() => {
                  onNavigateSection('settings');
                  setShowProfileMenu(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded-xl"
              >
                Admin Settings Hub
              </button>
              <button 
                onClick={() => {
                  onNavigateSection('staff');
                  setShowProfileMenu(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded-xl"
              >
                Manage Staff &amp; Roles
              </button>
              <div className="h-px bg-slate-100 my-1" />
              <button 
                onClick={() => {
                  setShowProfileMenu(false);
                  if (onSignOut) onSignOut();
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-xl font-medium cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
