'use client';

import React, { useState } from 'react';
import { 
  PawPrint, 
  Calendar as CalendarIcon, 
  Users, 
  Scissors, 
  Package, 
  Folder, 
  MessageSquare, 
  Clock, 
  Star, 
  ChevronRight, 
  Check, 
  Plus, 
  AlertCircle, 
  CheckCircle2, 
  Camera, 
  PenTool, 
  FileText, 
  Phone, 
  Mail, 
  ChevronDown, 
  Bell, 
  Menu, 
  X,
  Sparkles,
  ShieldCheck,
  Award,
  LogOut,
  UserCheck
} from 'lucide-react';
import { GroomerAppointmentItem, AuthUser } from '@/lib/dawg-types';
import { INITIAL_GROOMER_APPOINTMENTS } from '@/lib/dawg-mock-data';

interface GroomerPortalViewProps {
  currentUser: AuthUser;
  onSwitchToAdmin: () => void;
  onSignOut: () => void;
}

export const GroomerPortalView: React.FC<GroomerPortalViewProps> = ({
  currentUser,
  onSwitchToAdmin,
  onSignOut,
}) => {
  // Navigation & UI state
  const [activeSubTab, setActiveSubTab] = useState('Dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isClockedIn, setIsClockedIn] = useState(true);
  const [clockInTime, setClockInTime] = useState('7:58 AM');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [selectedDate, setSelectedDate] = useState('May 12, 2025');
  const [showDateDropdown, setShowDateDropdown] = useState(false);

  // Appointments & active pet state
  const [appointments, setAppointments] = useState<GroomerAppointmentItem[]>(INITIAL_GROOMER_APPOINTMENTS);
  const [selectedPetId, setSelectedPetId] = useState<string>('g-appt-1');

  // Quick Action Modal states
  const [activeQuickActionModal, setActiveQuickActionModal] = useState<
    'service' | 'note' | 'photo' | 'incident' | 'signature' | 'message' | 'timeoff' | 'editNotes' | null
  >(null);
  const [modalSuccessMessage, setModalSuccessMessage] = useState('');

  // Selected pet details
  const activePet = appointments.find(a => a.id === selectedPetId) || appointments[0];

  // Advance appointment stage
  const handleAdvanceStatus = (apptId: string) => {
    setAppointments(prev =>
      prev.map(item => {
        if (item.id === apptId) {
          let nextStatus: GroomerAppointmentItem['status'] = item.status;
          if (item.status === 'Scheduled') nextStatus = 'Checked In';
          else if (item.status === 'Checked In') nextStatus = 'In Service';
          else if (item.status === 'In Service') nextStatus = 'Ready for Pickup';
          else if (item.status === 'Ready for Pickup') nextStatus = 'Completed';
          return { ...item, status: nextStatus };
        }
        return item;
      })
    );
  };

  // Status badge styling helper
  const getStatusBadge = (status: GroomerAppointmentItem['status']) => {
    switch (status) {
      case 'Checked In':
        return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'In Service':
        return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      case 'Ready for Pickup':
        return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'Completed':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-500 border-slate-200';
    }
  };

  // Stepper calculations for active pet
  const getStepperIndex = (status: GroomerAppointmentItem['status']) => {
    switch (status) {
      case 'Scheduled': return 0;
      case 'Checked In': return 1;
      case 'In Service': return 2;
      case 'Ready for Pickup': return 3;
      case 'Completed': return 4;
      default: return 0;
    }
  };

  const currentStep = getStepperIndex(activePet.status);

  // Trigger modal helper
  const openModal = (type: typeof activeQuickActionModal) => {
    setActiveQuickActionModal(type);
    setModalSuccessMessage('');
  };

  return (
    <div className="min-h-screen bg-[#f8faff] text-slate-800 antialiased flex overflow-hidden font-sans">
      {/* ================= 1. MOBILE BACKDROP ================= */}
      {mobileSidebarOpen && (
        <div 
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* ================= 2. GROOMER LEFT SIDEBAR ================= */}
      <aside className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-100 flex flex-col justify-between shrink-0 min-h-screen py-5 px-4 h-screen overflow-y-auto custom-scrollbar transition-transform duration-200 ease-in-out ${
        mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="space-y-6">
          {/* Brand Logo Header */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs shadow-indigo-200">
                <PawPrint className="w-5 h-5 fill-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-900 leading-tight">All About<br/>the Dawg</h1>
                <span className="text-[10px] tracking-wider font-semibold text-slate-400 uppercase">OS</span>
              </div>
            </div>
            <button 
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {/* Groomer Portal Group (Active Accordion) */}
            <div className="space-y-1">
              <button 
                type="button"
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50/60 rounded-lg group"
              >
                <span className="flex items-center gap-2.5">
                  <Scissors className="w-4 h-4 text-indigo-600" />
                  <span>Groomer Portal</span>
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
              </button>

              {/* Submenu */}
              <div className="pl-8 pr-2 py-1 space-y-1 text-xs">
                {[
                  'Dashboard',
                  'My Schedule',
                  "Today's Appointments",
                  'Check-in / Check-out',
                  'Notes & Incidents',
                  'My Performance',
                ].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setActiveSubTab(item)}
                    className={`block w-full text-left py-1.5 px-2.5 rounded-md transition-colors cursor-pointer ${
                      activeSubTab === item
                        ? 'font-medium text-indigo-700 bg-indigo-50'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {/* Primary App Sections */}
            <div className="pt-2 space-y-0.5 text-xs font-medium text-slate-600">
              <button 
                type="button"
                onClick={() => setActiveSubTab('Calendar')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors text-left"
              >
                <CalendarIcon className="w-4 h-4 text-slate-400" />
                <span>Calendar</span>
              </button>
              <button 
                type="button"
                onClick={() => setActiveSubTab('Pets')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors text-left"
              >
                <PawPrint className="w-4 h-4 text-slate-400" />
                <span>Pets</span>
              </button>
              <button 
                type="button"
                onClick={() => setActiveSubTab('Customers')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors text-left"
              >
                <Users className="w-4 h-4 text-slate-400" />
                <span>Customers</span>
              </button>
              <button 
                type="button"
                onClick={() => setActiveSubTab('Services')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors text-left"
              >
                <Scissors className="w-4 h-4 text-slate-400" />
                <span>Services</span>
              </button>
              <button 
                type="button"
                onClick={() => setActiveSubTab('Products')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors text-left"
              >
                <span className="flex items-center gap-3">
                  <Package className="w-4 h-4 text-slate-400" />
                  <span>Products</span>
                </span>
                <span className="bg-indigo-50 text-indigo-600 text-[11px] font-bold px-1.5 py-0.5 rounded-full">2</span>
              </button>
              <button 
                type="button"
                onClick={() => setActiveSubTab('Documents')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors text-left"
              >
                <Folder className="w-4 h-4 text-slate-400" />
                <span>Documents</span>
              </button>
              <button 
                type="button"
                onClick={() => setActiveSubTab('Messages')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors text-left"
              >
                <span className="flex items-center gap-3">
                  <MessageSquare className="w-4 h-4 text-slate-400" />
                  <span>Messages</span>
                </span>
                <span className="bg-red-50 text-red-500 text-[11px] font-bold px-1.5 py-0.5 rounded-full">3</span>
              </button>
              <button 
                type="button"
                onClick={() => setActiveSubTab('Team Chat')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors text-left"
              >
                <Users className="w-4 h-4 text-slate-400" />
                <span>Team Chat</span>
              </button>
              <button 
                type="button"
                onClick={() => setActiveSubTab('Training')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors text-left"
              >
                <Award className="w-4 h-4 text-slate-400" />
                <span>Training &amp; Resources</span>
              </button>
            </div>
          </nav>
        </div>

        {/* Bottom Clocked-in Card */}
        <div className="mt-8 pt-4 border-t border-slate-100">
          <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${
                isClockedIn ? 'bg-emerald-500 ring-4 ring-emerald-100 animate-pulse' : 'bg-slate-400'
              }`} />
              <div>
                <div className="text-xs font-bold text-slate-800 leading-tight">
                  {isClockedIn ? 'Clocked In' : 'Clocked Out'}
                </div>
                <div className="text-[11px] text-slate-400">
                  {isClockedIn ? `Since ${clockInTime}` : 'Shift Ended'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (isClockedIn) {
                  setIsClockedIn(false);
                } else {
                  setIsClockedIn(true);
                  setClockInTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                }
              }}
              className="w-full py-1.5 text-xs font-semibold text-indigo-600 bg-white border border-indigo-200 rounded-lg shadow-2xs hover:bg-indigo-50 transition-colors cursor-pointer"
            >
              {isClockedIn ? 'Clock Out' : 'Clock In Now'}
            </button>
          </div>
        </div>
      </aside>

      {/* ================= 3. MAIN CONTENT AREA ================= */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto h-screen custom-scrollbar">
        {/* TopBar Header */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMobileSidebarOpen(true)}
              className="p-1.5 -ml-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Good morning, {currentUser.name || 'Sarah'}!</span> <span>🐾</span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">Here&apos;s your day at a glance.</p>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            {/* Date Selector Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDateDropdown(!showDateDropdown)}
                className="flex items-center gap-2 bg-white border border-slate-200 px-3.5 py-1.5 rounded-lg shadow-2xs cursor-pointer hover:border-slate-300 transition-colors"
              >
                <CalendarIcon className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-medium text-slate-700">{selectedDate}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
              </button>

              {showDateDropdown && (
                <div className="absolute right-0 mt-1.5 w-52 bg-white border border-slate-200 rounded-xl shadow-lg p-1 z-30 space-y-1">
                  {['May 12, 2025 (Today)', 'May 13, 2025 (Tomorrow)', 'May 14, 2025'].map((d) => (
                    <button
                      key={d}
                      onClick={() => {
                        setSelectedDate(d.split(' ')[0] + ' ' + d.split(' ')[1] + ' ' + d.split(' ')[2]);
                        setShowDateDropdown(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded-lg flex items-center justify-between"
                    >
                      <span>{d}</span>
                      {d.includes(selectedDate) && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button 
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-slate-400 hover:text-slate-600 bg-white border border-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  3
                </span>
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 z-40 space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-900">Station Alerts</span>
                    <span className="text-[10px] font-semibold text-indigo-600 hover:underline cursor-pointer">
                      Mark all read
                    </span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="p-2 rounded-xl bg-indigo-50/50 border border-indigo-100/60">
                      <p className="font-semibold text-slate-800">Buddy arrived & checked in</p>
                      <p className="text-[10px] text-slate-500">Ready at grooming table 3</p>
                    </div>
                    <div className="p-2 rounded-xl bg-amber-50/50 border border-amber-100/60">
                      <p className="font-semibold text-slate-800">Charlie needs wrinkle balm</p>
                      <p className="text-[10px] text-slate-500">Scheduled for 12:30 PM</p>
                    </div>
                    <div className="p-2 rounded-xl bg-emerald-50/50 border border-emerald-100/60">
                      <p className="font-semibold text-slate-800">Time-off Approved (May 24)</p>
                      <p className="text-[10px] text-slate-500">Approved by Admin User</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Pill */}
            <div className="relative">
              <button 
                type="button"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2.5 pl-2 hover:opacity-90 transition-opacity cursor-pointer"
              >
                <img 
                  alt={currentUser.name} 
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-100" 
                  src={currentUser.avatarUrl || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80"}
                />
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold text-slate-800 leading-tight">{currentUser.name}</div>
                  <div className="text-[10px] font-medium text-slate-400">Groomer</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-40 space-y-1">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-800">{currentUser.name}</p>
                    <p className="text-[11px] text-slate-400">{currentUser.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold">
                      {currentUser.stationName || 'Station #3'}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onSwitchToAdmin();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-50 rounded-xl transition-colors cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    <span>Switch to Admin OS</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onSignOut();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-red-600" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Top 5 Metric KPI Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Metric 1 */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-indigo-600 flex items-center justify-center shrink-0">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] font-medium text-slate-400">Today&apos;s Appointments</div>
                <div className="text-2xl font-bold text-slate-900 leading-tight mt-0.5">7</div>
              </div>
            </div>
            <button 
              onClick={() => setActiveSubTab("Today's Appointments")}
              className="mt-4 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group text-left cursor-pointer"
            >
              <span>View full schedule</span>
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </button>
          </div>

          {/* Metric 2 */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <span className="text-lg font-bold">$</span>
              </div>
              <div>
                <div className="text-[11px] font-medium text-slate-400">Est. Tips Today</div>
                <div className="text-2xl font-bold text-slate-900 leading-tight mt-0.5">$96.00</div>
              </div>
            </div>
            <button 
              onClick={() => setActiveSubTab('My Performance')}
              className="mt-4 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group text-left cursor-pointer"
            >
              <span>View payouts</span>
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </button>
          </div>

          {/* Metric 3 */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] font-medium text-slate-400">Hours Scheduled</div>
                <div className="text-2xl font-bold text-slate-900 leading-tight mt-0.5">7h 30m</div>
              </div>
            </div>
            <button 
              onClick={() => setActiveSubTab('My Schedule')}
              className="mt-4 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group text-left cursor-pointer"
            >
              <span>View schedule</span>
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </button>
          </div>

          {/* Metric 4 */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-500 flex items-center justify-center shrink-0">
                <PawPrint className="w-5 h-5 fill-current" />
              </div>
              <div>
                <div className="text-[11px] font-medium text-slate-400">Pets Groomed (Week)</div>
                <div className="text-2xl font-bold text-slate-900 leading-tight mt-0.5">18</div>
              </div>
            </div>
            <button 
              onClick={() => setActiveSubTab('My Performance')}
              className="mt-4 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group text-left cursor-pointer"
            >
              <span>View this week</span>
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </button>
          </div>

          {/* Metric 5 */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pink-50 text-rose-500 flex items-center justify-center shrink-0">
                <Star className="w-5 h-5 fill-current" />
              </div>
              <div>
                <div className="text-[11px] font-medium text-slate-400">Rating (30 Days)</div>
                <div className="text-2xl font-bold text-slate-900 leading-tight mt-0.5">5.0</div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1.5">
              <div className="flex text-rose-500 text-xs">★★★★★</div>
              <span className="text-[11px] font-medium text-slate-400">12 reviews</span>
            </div>
          </div>
        </section>

        {/* ================= 3-COLUMN MAIN CONTENT GRID ================= */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* COLUMN 1: Today's Appointments List (4 Cols) */}
          <section className="xl:col-span-4 bg-white border border-slate-100 rounded-2xl p-5 shadow-2xs flex flex-col justify-between min-h-[580px]">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-50 mb-3">
                <h2 className="text-sm font-bold text-slate-900">Today&apos;s Appointments</h2>
                <span className="text-[11px] font-semibold text-slate-400">7 scheduled</span>
              </div>

              {/* Appointments List */}
              <div className="divide-y divide-slate-50 text-xs">
                {appointments.map((appt) => {
                  const isSelected = appt.id === selectedPetId;
                  return (
                    <div
                      key={appt.id}
                      onClick={() => setSelectedPetId(appt.id)}
                      className={`py-2.5 flex items-center justify-between -mx-2 px-2.5 rounded-xl transition-all cursor-pointer group ${
                        isSelected 
                          ? 'bg-indigo-50/80 ring-1 ring-indigo-200 shadow-2xs' 
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-14 shrink-0">
                          <div className={`font-bold text-[11px] ${isSelected ? 'text-indigo-700' : 'text-indigo-600'}`}>
                            {appt.time}
                          </div>
                          <div className="text-[10px] text-slate-400">({appt.duration})</div>
                        </div>
                        <img 
                          alt={appt.petName} 
                          className="w-8 h-8 rounded-full object-cover border border-slate-100 shrink-0" 
                          src={appt.petImage} 
                        />
                        <div className="min-w-0 truncate">
                          <div className="font-bold text-slate-800 flex items-center gap-1.5 truncate">
                            <span>{appt.petName}</span>
                            <span className="font-normal text-slate-400 text-[11px] truncate">{appt.breed}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {appt.serviceType} • <span className="text-slate-500">{appt.ownerName}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadge(appt.status)}`}>
                          {appt.status}
                        </span>
                        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? 'text-indigo-600 translate-x-0.5' : 'text-slate-300'}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <button 
              onClick={() => setActiveSubTab("Today's Appointments")}
              className="mt-4 pt-3 border-t border-slate-50 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group text-left cursor-pointer"
            >
              <span>View full schedule</span>
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </button>
          </section>

          {/* COLUMN 2: Current Pet Details (4 Cols) */}
          <section className="xl:col-span-4 bg-white border border-slate-100 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">Current Pet: {activePet.petName}</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusBadge(activePet.status)}`}>
                {activePet.status}
              </span>
            </div>

            {/* Pet Profile Card */}
            <div className="flex items-start gap-4">
              <img 
                alt={activePet.petName} 
                className="w-20 h-20 rounded-xl object-cover border border-slate-100 shadow-2xs shrink-0" 
                src={activePet.petImage} 
              />
              <div className="text-xs space-y-1 min-w-0">
                <div className="font-bold text-slate-900 text-sm">
                  {activePet.breed} <span className="font-normal text-slate-500 text-xs">• {activePet.age} • {activePet.weight}</span>
                </div>
                <div className="text-slate-500"><span className="font-medium text-slate-700">Owner:</span> {activePet.ownerName}</div>
                <div className="text-slate-600 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" />
                  <span>{activePet.ownerPhone || '(214) 555-0198'}</span>
                </div>
                <div className="text-indigo-600 hover:underline cursor-pointer flex items-center gap-1">
                  <Mail className="w-3 h-3 text-indigo-400" />
                  <span className="truncate">{activePet.ownerEmail || 'owner@email.com'}</span>
                </div>
              </div>
            </div>

            {/* Mini Specs Grid */}
            <div className="grid grid-cols-3 gap-2 bg-slate-50/70 p-2.5 rounded-xl text-center border border-slate-100/60">
              <div>
                <div className="text-[10px] text-slate-400 font-medium flex items-center justify-center gap-1">
                  <AlertCircle className="w-3 h-3 text-slate-400" />
                  Allergies
                </div>
                <div className="text-xs font-semibold text-slate-700 mt-0.5 truncate">{activePet.allergies || 'None'}</div>
              </div>
              <div className="border-x border-slate-200/60">
                <div className="text-[10px] text-slate-400 font-medium">Temperament</div>
                <div className="text-xs font-semibold text-slate-700 mt-0.5">{activePet.temperament || 'Friendly'}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-medium">Last Groom</div>
                <div className="text-xs font-semibold text-slate-700 mt-0.5">{activePet.lastGroomDate || 'Apr 14, 2025'}</div>
              </div>
            </div>

            {/* Today's Service Pricing */}
            <div className="space-y-1.5 pt-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Today&apos;s Service</div>
              <div className="flex items-baseline justify-between">
                <div className="text-xs font-bold text-slate-900">{activePet.serviceType || activePet.serviceName || 'Full Groom'}</div>
                <div className="text-xs font-bold text-slate-900">${(activePet.price ?? 85).toFixed(2)}</div>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">Includes: Bath, Blow Dry, Haircut, Nail Trim, Ear Cleaning</p>
              
              {activePet.addons && activePet.addons.length > 0 && (
                <div className="pt-2">
                  <div className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider">Add-ons</div>
                  {activePet.addons.map((add, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs mt-0.5">
                      <span className="text-slate-600">{add.name}</span>
                      <span className="font-medium text-slate-800">${add.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes from Owner (Blue Box) */}
            <div className="bg-indigo-50/50 border border-indigo-100/70 rounded-xl p-3 text-xs space-y-1">
              <div className="font-bold text-slate-800 text-[11px]">Notes from Owner</div>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                {activePet.ownerNotes || 'Please keep the coat neat and teddy style. Take your time with nails.'}
              </p>
            </div>

            {/* Internal Pet Notes */}
            <div className="space-y-2 pt-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-[11px]">Pet Notes (Internal)</span>
                <button 
                  onClick={() => openModal('editNotes')}
                  className="text-indigo-600 hover:text-indigo-700 font-semibold text-[11px] cursor-pointer"
                >
                  Edit
                </button>
              </div>
              <ul className="text-[11px] text-slate-600 space-y-1">
                {(activePet.internalNotes || [
                  'Loves peanut butter treats',
                  'Nervous with nail trims – go slow',
                  'Prefers warm water',
                  'Last incident: None'
                ]).map((note, idx) => (
                  <li key={idx} className="flex items-center gap-1.5">• {note}</li>
                ))}
              </ul>
            </div>
          </section>

          {/* COLUMN 3: Workflow, Quick Actions & Progress (4 Cols) */}
          <div className="xl:col-span-4 space-y-4">
            {/* Workflow Card */}
            <section className="bg-white border border-slate-100 rounded-2xl p-5 shadow-2xs space-y-4">
              <h2 className="text-sm font-bold text-slate-900">Appointment Workflow</h2>

              {/* Connected Nodes Step Indicator */}
              <div className="relative flex items-center justify-between px-1 pt-2">
                {/* Background Line */}
                <div className="absolute left-6 right-6 top-5 h-0.5 bg-slate-100 -z-0" />
                {/* Active Fill Line */}
                <div 
                  className="absolute left-6 top-5 h-0.5 bg-indigo-600 -z-0 transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, currentStep * 25))}%` }}
                />

                {/* Steps */}
                {[
                  { label: 'Scheduled', icon: Check },
                  { label: 'Checked In', icon: Check },
                  { label: 'In Service', icon: Scissors },
                  { label: 'Ready', icon: Package },
                  { label: 'Completed', icon: Check },
                ].map((step, idx) => {
                  const isDone = idx <= currentStep;
                  const isCurrent = idx === currentStep;
                  const StepIcon = step.icon;

                  return (
                    <div key={step.label} className="flex flex-col items-center gap-1.5 z-10">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all ${
                        isDone 
                          ? 'bg-indigo-600 text-white shadow-2xs' 
                          : 'bg-white border-2 border-slate-200 text-slate-400'
                      } ${isCurrent ? 'ring-4 ring-indigo-50 ring-offset-1' : ''}`}>
                        <StepIcon className="w-3.5 h-3.5" />
                      </div>
                      <span className={`text-[10px] font-medium ${
                        isCurrent ? 'text-indigo-700 font-bold' : isDone ? 'text-slate-700 font-semibold' : 'text-slate-400'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Status & CTA */}
              <div className="pt-2">
                <div className="text-xs font-bold text-slate-900">{activePet.status}</div>
                <div className="text-[11px] text-slate-400">
                  {activePet.startTime ? `Started at ${activePet.startTime}` : 'Ready at grooming station'}
                </div>
                
                <button 
                  type="button"
                  onClick={() => handleAdvanceStatus(activePet.id)}
                  className="mt-3 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold rounded-xl shadow-xs shadow-indigo-200 transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  {activePet.status === 'Scheduled' && <span>Mark as Checked In</span>}
                  {activePet.status === 'Checked In' && <span>Start Grooming (In Service)</span>}
                  {activePet.status === 'In Service' && <span>Mark as Ready for Pickup</span>}
                  {activePet.status === 'Ready for Pickup' && <span>Complete &amp; Check Out</span>}
                  {activePet.status === 'Completed' && <span>Service Completed ✓</span>}
                </button>
              </div>
            </section>

            {/* Quick Actions Card (2x3 Grid) */}
            <section className="bg-white border border-slate-100 rounded-2xl p-5 shadow-2xs space-y-3">
              <h2 className="text-sm font-bold text-slate-900">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button 
                  onClick={() => openModal('service')}
                  className="flex items-center gap-2 p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 transition-colors text-left cursor-pointer group"
                >
                  <Plus className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="text-[11px] font-medium leading-tight">Add Service / Add-on</span>
                </button>
                <button 
                  onClick={() => openModal('note')}
                  className="flex items-center gap-2 p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 transition-colors text-left cursor-pointer group"
                >
                  <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="text-[11px] font-medium leading-tight">Add Note</span>
                </button>
                <button 
                  onClick={() => openModal('photo')}
                  className="flex items-center gap-2 p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 transition-colors text-left cursor-pointer group"
                >
                  <Camera className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="text-[11px] font-medium leading-tight">Take Photo</span>
                </button>
                <button 
                  onClick={() => openModal('incident')}
                  className="flex items-center gap-2 p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 transition-colors text-left cursor-pointer group"
                >
                  <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="text-[11px] font-medium leading-tight">Record Incident</span>
                </button>
                <button 
                  onClick={() => openModal('signature')}
                  className="flex items-center gap-2 p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 transition-colors text-left cursor-pointer group"
                >
                  <PenTool className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="text-[11px] font-medium leading-tight">Request Signature</span>
                </button>
                <button 
                  onClick={() => openModal('message')}
                  className="flex items-center gap-2 p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 transition-colors text-left cursor-pointer group"
                >
                  <MessageSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="text-[11px] font-medium leading-tight">Message Owner</span>
                </button>
              </div>
            </section>

            {/* Today's Progress Card with Donut Chart */}
            <section className="bg-white border border-slate-100 rounded-2xl p-5 shadow-2xs space-y-3">
              <h2 className="text-sm font-bold text-slate-900">Today&apos;s Progress</h2>
              <div className="flex items-center gap-6">
                {/* Radial Donut SVG */}
                <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                  <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" fill="none" r="14.5" stroke="#e2e8f0" strokeWidth="3" />
                    <circle cx="18" cy="18" fill="none" r="14.5" stroke="#10b981" strokeDasharray="38, 100" strokeLinecap="round" strokeWidth="3" />
                    <circle cx="18" cy="18" fill="none" r="14.5" stroke="#6366f1" strokeDasharray="24, 100" strokeDashoffset="-42" strokeLinecap="round" strokeWidth="3" />
                    <circle cx="18" cy="18" fill="none" r="14.5" stroke="#f59e0b" strokeDasharray="14, 100" strokeDashoffset="-68" strokeLinecap="round" strokeWidth="3" />
                  </svg>
                  <div className="absolute text-center">
                    <div className="text-sm font-bold text-slate-800">3 / 7</div>
                    <div className="text-[9px] text-slate-400 font-medium">Completed</div>
                  </div>
                </div>

                {/* Legend */}
                <div className="space-y-1.5 text-xs flex-1">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Completed
                    </span>
                    <span className="font-bold text-slate-700 text-[11px]">3</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      In Service
                    </span>
                    <span className="font-bold text-slate-700 text-[11px]">2</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Ready for Pickup
                    </span>
                    <span className="font-bold text-slate-700 text-[11px]">1</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                      <span className="w-2 h-2 rounded-full bg-slate-300" />
                      Scheduled
                    </span>
                    <span className="font-bold text-slate-700 text-[11px]">1</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setActiveSubTab('My Performance')}
                className="pt-2 block text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 group text-left cursor-pointer"
              >
                <span>View My Performance</span>
                <span className="group-hover:translate-x-0.5 transition-transform inline-block ml-1">→</span>
              </button>
            </section>
          </div>
        </div>

        {/* ================= BOTTOM ROW CARDS (3 COLUMNS) ================= */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Card 1: Recent Notes */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Recent Notes</h3>
              <div className="space-y-3 divide-y divide-slate-50 text-xs">
                {/* Note 1 */}
                <div className="pt-2 first:pt-0 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img 
                        alt="Buddy" 
                        className="w-5 h-5 rounded-full object-cover" 
                        src="https://images.unsplash.com/photo-1552053831-71594a27632d?w=100&auto=format&fit=crop&q=80" 
                      />
                      <span className="font-bold text-slate-800 text-[11px]">Buddy <span className="font-normal text-slate-400">• 4/14/25</span></span>
                    </div>
                    <span className="text-[10px] text-slate-400">Sarah M.</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Did great today! Coat in great condition. Owner rebooked for 5/26.
                  </p>
                </div>

                {/* Note 2 */}
                <div className="pt-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img 
                        alt="Luna" 
                        className="w-5 h-5 rounded-full object-cover" 
                        src="https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=100&auto=format&fit=crop&q=80" 
                      />
                      <span className="font-bold text-slate-800 text-[11px]">Luna <span className="font-normal text-slate-400">• 5/1/25</span></span>
                    </div>
                    <span className="text-[10px] text-slate-400">Mike R.</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    A little matted behind ears. Used de-mat spray. Very sweet girl.
                  </p>
                </div>
              </div>
            </div>

            <button 
              onClick={() => openModal('note')}
              className="mt-4 pt-2 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group text-left cursor-pointer"
            >
              <span>+ Add new grooming note</span>
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </button>
          </div>

          {/* Card 2: Incidents (30 Days) */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Incidents (30 Days)</h3>
              <div className="py-6 flex flex-col items-center justify-center text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Check className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold text-slate-800">No incidents reported</div>
                <p className="text-[11px] text-slate-400 max-w-[200px]">Great job! Keep up the excellent work.</p>
              </div>
            </div>

            <button 
              onClick={() => openModal('incident')}
              className="pt-2 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group text-left cursor-pointer"
            >
              <span>Record inspection / incident</span>
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </button>
          </div>

          {/* Card 3: Upcoming Time Off */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Upcoming Time Off</h3>
              <div className="mt-4 flex items-center justify-between p-3 bg-slate-50/70 border border-slate-100/80 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white border border-slate-100 text-slate-500 shadow-2xs">
                    <CalendarIcon className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="text-xs">
                    <div className="font-bold text-slate-800 leading-tight">May 24, 2025</div>
                    <div className="text-[11px] text-slate-400">All day</div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
                  Approved
                </span>
              </div>
            </div>

            <div className="mt-5 pt-2 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">1 pending approval</span>
              <button 
                onClick={() => openModal('timeoff')}
                className="px-3 py-1.5 border border-indigo-200 hover:bg-indigo-50 text-indigo-600 text-[11px] font-semibold rounded-lg transition-colors shadow-2xs cursor-pointer"
              >
                Request Time Off
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ================= QUICK ACTION INTERACTIVE MODALS ================= */}
      {activeQuickActionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 capitalize">
                {activeQuickActionModal === 'service' && 'Add Service or Add-on'}
                {activeQuickActionModal === 'note' && 'Add Grooming Note'}
                {activeQuickActionModal === 'photo' && 'Upload Before / After Photo'}
                {activeQuickActionModal === 'incident' && 'Record Incident / Health Flag'}
                {activeQuickActionModal === 'signature' && 'Request Owner Signature'}
                {activeQuickActionModal === 'message' && `Message Owner (${activePet.ownerName})`}
                {activeQuickActionModal === 'timeoff' && 'Submit Time-Off Request'}
                {activeQuickActionModal === 'editNotes' && 'Edit Internal Pet Notes'}
              </h3>
              <button
                onClick={() => setActiveQuickActionModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalSuccessMessage ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold text-center space-y-1">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                <p>{modalSuccessMessage}</p>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                {activeQuickActionModal === 'service' && (
                  <div className="space-y-2">
                    <label className="font-semibold text-slate-700">Select Add-on</label>
                    <select className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                      <option>Blueberry Facial (+$15.00)</option>
                      <option>Teeth Brushing &amp; Breath Spray (+$12.00)</option>
                      <option>Nail Dremel Grind (+$15.00)</option>
                      <option>De-shedding Treatment (+$25.00)</option>
                      <option>Flea &amp; Tick Shampoo (+$18.00)</option>
                    </select>
                  </div>
                )}

                {activeQuickActionModal === 'note' && (
                  <div className="space-y-2">
                    <label className="font-semibold text-slate-700">Grooming Observation Note</label>
                    <textarea 
                      rows={3} 
                      placeholder="e.g., Coat was brushed out smoothly. Recommending 4-week return for hygiene trim."
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                )}

                {activeQuickActionModal === 'photo' && (
                  <div className="space-y-3 text-center p-6 border-2 border-dashed border-indigo-200 rounded-2xl bg-indigo-50/30">
                    <Camera className="w-8 h-8 text-indigo-500 mx-auto" />
                    <p className="font-semibold text-slate-800">Drag &amp; Drop or Browse Photo</p>
                    <p className="text-[11px] text-slate-400">Add to Buddy&apos;s digital portfolio &amp; report card</p>
                  </div>
                )}

                {activeQuickActionModal === 'incident' && (
                  <div className="space-y-2">
                    <label className="font-semibold text-slate-700">Incident Severity / Category</label>
                    <select className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                      <option>Minor Skin Tag Noticed</option>
                      <option>Ear Canal Redness / Irritation</option>
                      <option>Severe Matting Under Collar</option>
                      <option>Minor Quicking / Bleed (Styptic applied)</option>
                    </select>
                    <textarea 
                      rows={2}
                      placeholder="Description of area and client notification notes..."
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                )}

                {activeQuickActionModal === 'signature' && (
                  <div className="space-y-2">
                    <p className="text-slate-600">Client pickup waiver &amp; satisfaction confirmation:</p>
                    <div className="h-24 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400 text-xs">
                      Sign here on tablet or mobile device
                    </div>
                  </div>
                )}

                {activeQuickActionModal === 'message' && (
                  <div className="space-y-2">
                    <label className="font-semibold text-slate-700">Send Direct SMS to {activePet.ownerPhone || '(214) 555-0198'}</label>
                    <textarea 
                      rows={3} 
                      defaultValue={`Hi ${activePet.ownerName}, ${activePet.petName} is doing great and is now ready for pickup at Station #3! 🐾`}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                )}

                {activeQuickActionModal === 'timeoff' && (
                  <div className="space-y-2">
                    <label className="font-semibold text-slate-700">Select Date Range</label>
                    <input type="date" defaultValue="2025-06-01" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
                    <label className="font-semibold text-slate-700 pt-1 block">Reason (Optional)</label>
                    <input type="text" placeholder="Vacation / Personal day" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
                  </div>
                )}

                {activeQuickActionModal === 'editNotes' && (
                  <div className="space-y-2">
                    <label className="font-semibold text-slate-700">Internal Salon Pet Notes (Buddy)</label>
                    <textarea 
                      rows={4} 
                      defaultValue="• Loves peanut butter treats&#10;• Nervous with nail trims – go slow&#10;• Prefers warm water&#10;• Last incident: None"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setActiveQuickActionModal(null)}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setModalSuccessMessage('Action saved and synced successfully!');
                      setTimeout(() => {
                        setActiveQuickActionModal(null);
                        setModalSuccessMessage('');
                      }, 1000);
                    }}
                    className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs cursor-pointer"
                  >
                    Save &amp; Update
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
