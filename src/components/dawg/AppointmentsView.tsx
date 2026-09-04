'use client';

import React, { useState, useRef } from 'react';
import { AppointmentItem, AppointmentStatus } from '@/lib/dawg-types';
import { RICH_APPOINTMENTS_DATA } from '@/lib/appointments-rich-data';
import { FullCalendarView } from './FullCalendarView';
import { KanbanView } from './KanbanView';
import { HourlyTimelineView } from './HourlyTimelineView';
import { AppointmentActionMenu } from './AppointmentActionMenu';
import { ActionsReferenceGuideModal } from './ActionsReferenceGuideModal';
import { StatusLegendModal } from './StatusLegendModal';
import { AppointmentTaskModals, AppointmentActionType } from './AppointmentTaskModals';
import { 
  Calendar as CalendarIcon, 
  Search, 
  Filter, 
  Plus, 
  RotateCw, 
  List, 
  LayoutGrid, 
  Columns,
  Clock,
  Download, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  MoreHorizontal,
  Info,
  CheckCircle2,
  X
} from 'lucide-react';

interface AppointmentsViewProps {
  appointments?: AppointmentItem[];
  onAddAppointment?: () => void;
  onUpdateStatus?: (id: string, newStatus: AppointmentItem['status']) => void;
}

type HorizonTab = 
  | 'All Appointments' 
  | 'Today' 
  | 'Tomorrow' 
  | 'This Week' 
  | 'Next 7 Days' 
  | 'This Month' 
  | 'Waitlist' 
  | 'Past' 
  | 'Canceled';

type ViewMode = 'list' | 'kanban' | 'timeline' | 'calendar' | 'grid';

export const AppointmentsView: React.FC<AppointmentsViewProps> = ({
  appointments: initialPropAppointments,
  onAddAppointment: propOnAddAppointment,
  onUpdateStatus: propOnUpdateStatus,
}) => {
  const nextIdRef = useRef(1000);

  // State for appointments
  const [appointmentsList, setAppointmentsList] = useState<AppointmentItem[]>(
    initialPropAppointments && initialPropAppointments.length > 0 
      ? initialPropAppointments 
      : RICH_APPOINTMENTS_DATA
  );

  // Navigation Horizon Tabs matching designs
  const [activeTab, setActiveTab] = useState<HorizonTab>('All Appointments');
  
  // View mode switcher: List vs Kanban vs Timeline vs Calendar vs Grid
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const handleTabChange = (tab: HorizonTab) => {
    setActiveTab(tab);
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
  };

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('All Locations');
  const [groomerFilter, setGroomerFilter] = useState('All Groomers');
  const [serviceFilter, setServiceFilter] = useState('All Services');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [sortBy] = useState('Date & Time');

  // Active row dropdown state
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);

  // Modals & Tasks
  const [showStatusLegend, setShowStatusLegend] = useState(false);
  const [activeTaskAction, setActiveTaskAction] = useState<AppointmentActionType | null>(null);
  const [activeTaskAppointment, setActiveTaskAppointment] = useState<AppointmentItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showActionGuide, setShowActionGuide] = useState(false);
  const [selectedAppointmentForDetails, setSelectedAppointmentForDetails] = useState<AppointmentItem | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const getAvatarBg = (initials?: string) => {
    if (!initials) return 'bg-amber-100 text-amber-800';
    if (initials === 'KM' || initials === 'AC') return 'bg-cyan-100 text-cyan-800';
    if (initials === 'DJ' || initials === 'BT') return 'bg-blue-100 text-blue-800';
    if (initials === 'SP' || initials === 'NH') return 'bg-purple-100 text-purple-800';
    if (initials === 'MB' || initials === 'PA') return 'bg-amber-100 text-amber-800';
    if (initials === 'JC' || initials === 'EM') return 'bg-rose-100 text-rose-800';
    if (initials === 'LW') return 'bg-teal-100 text-teal-800';
    if (initials === 'AG') return 'bg-emerald-100 text-emerald-800';
    if (initials === 'TA') return 'bg-indigo-100 text-indigo-800';
    if (initials === 'RG') return 'bg-pink-100 text-pink-800';
    return 'bg-amber-100 text-amber-800';
  };

  const getCanceledAvatarBg = (initials?: string) => {
    if (!initials) return 'bg-slate-100 text-slate-700';
    if (initials === 'PA') return 'bg-amber-100 text-amber-800';
    if (initials === 'AC') return 'bg-cyan-100 text-cyan-800';
    if (initials === 'BT') return 'bg-blue-100 text-blue-800';
    if (initials === 'NH') return 'bg-purple-100 text-purple-800';
    if (initials === 'EM') return 'bg-slate-200 text-slate-800';
    return 'bg-slate-100 text-slate-700';
  };

  const getStaffBadgeBg = (initials?: string) => {
    if (!initials) return 'bg-indigo-100 text-indigo-700';
    if (initials.includes('J') || initials === 'JL') return 'bg-purple-100 text-purple-700';
    if (initials.includes('M') || initials === 'MR') return 'bg-cyan-100 text-cyan-800';
    return 'bg-indigo-100 text-indigo-700';
  };

  const getStatusBadgeStyle = (status: AppointmentStatus) => {
    switch (status) {
      case 'Checked In':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'In Progress':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Confirmed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Completed':
        return 'bg-teal-50 text-teal-800 border-teal-200';
      case 'Canceled':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'No Show':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'Waitlisted':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'Scheduled':
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const formatDateHeader = (dateStr?: string, tab?: HorizonTab) => {
    if (!dateStr) return 'May 16, 2025';
    if (tab === 'Next 7 Days') {
      if (dateStr === '2025-05-18') return 'Sun, May 18, 2025';
      if (dateStr === '2025-05-19') return 'Mon, May 19, 2025';
      if (dateStr === '2025-05-20') return 'Tue, May 20, 2025';
      if (dateStr === '2025-05-21') return 'Wed, May 21, 2025';
      if (dateStr === '2025-05-22') return 'Thu, May 22, 2025';
      if (dateStr === '2025-05-23') return 'Fri, May 23, 2025';
    }
    if (dateStr === '2025-05-16') return 'May 16, 2025';
    if (dateStr === '2025-05-17') return 'May 17, 2025';
    if (dateStr === '2025-05-15') return 'May 15, 2025';
    if (dateStr === '2025-05-14') return 'May 14, 2025';
    if (dateStr === '2025-05-13') return 'May 13, 2025';
    if (dateStr === '2025-05-12') return 'May 12, 2025';
    return dateStr;
  };

  // Filter logic based on active horizon tab
  const filteredAppointments = appointmentsList.filter((item) => {
    // 1. Tab filter
    if (activeTab === 'Today') {
      const isToday =
        item.date === '2025-05-16' ||
        ['appt-101', 'appt-102', 'appt-103', 'appt-104', 'appt-105', 'appt-106'].includes(item.id);
      if (!isToday) return false;
    } else if (activeTab === 'Tomorrow') {
      const isTomorrow =
        item.date === '2025-05-17' ||
        ['appt-107', 'appt-108', 'appt-109', 'appt-110', 'appt-111'].includes(item.id);
      if (!isTomorrow) return false;
    } else if (activeTab === 'Next 7 Days') {
      const isNext7 =
        ['appt-113', 'appt-114', 'appt-115', 'appt-116', 'appt-117', 'appt-112'].includes(item.id) ||
        (item.date && item.date >= '2025-05-18' && item.date <= '2025-05-24' && item.status !== 'Completed' && item.status !== 'Canceled');
      if (!isNext7) return false;
    } else if (activeTab === 'This Week') {
      const isThisWeek =
        ['appt-101', 'appt-102', 'appt-103', 'appt-104', 'appt-105', 'appt-106', 'appt-107', 'appt-108', 'appt-110', 'appt-111', 'appt-112', 'appt-113', 'appt-114', 'appt-115', 'appt-116', 'appt-117'].includes(item.id) ||
        (item.date && item.date >= '2025-05-16' && item.date <= '2025-05-23' && item.status !== 'Completed' && item.status !== 'Canceled' && item.status !== 'Waitlisted');
      if (!isThisWeek) return false;
    } else if (activeTab === 'This Month') {
      const isThisMonth =
        (item.date && item.date.startsWith('2025-05') && item.status !== 'Canceled') ||
        (!item.id.includes('canc') && !item.id.includes('wait'));
      if (!isThisMonth) return false;
    } else if (activeTab === 'Waitlist') {
      const isWaitlist =
        item.status === 'Waitlisted' ||
        item.id.startsWith('appt-wait') ||
        item.id === 'appt-109';
      if (!isWaitlist) return false;
    } else if (activeTab === 'Past') {
      const isPast =
        item.status === 'Completed' ||
        item.id.startsWith('appt-past') ||
        (item.date && item.date < '2025-05-16' && item.status !== 'Canceled');
      if (!isPast) return false;
    } else if (activeTab === 'Canceled') {
      const isCanceled =
        item.status === 'Canceled' ||
        item.status === 'No Show' ||
        item.id.startsWith('appt-canc');
      if (!isCanceled) return false;
    }

    // 2. Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchPet = item.petName.toLowerCase().includes(q);
      const matchCustomer = item.customerName?.toLowerCase().includes(q);
      const matchService = item.serviceName.toLowerCase().includes(q);
      const matchGroomer = item.staffName?.toLowerCase().includes(q);
      if (!matchPet && !matchCustomer && !matchService && !matchGroomer) return false;
    }

    // 3. Dropdown filters
    if (activeTab !== 'Waitlist' && activeTab !== 'Canceled') {
      if (groomerFilter !== 'All Groomers' && item.staffName && !item.staffName.includes(groomerFilter)) {
        return false;
      }
      if (serviceFilter !== 'All Services' && !item.serviceName.includes(serviceFilter)) {
        return false;
      }
      if (statusFilter !== 'All Statuses' && item.status !== statusFilter) {
        return false;
      }
      if (locationFilter !== 'All Locations' && item.location && !item.location.includes(locationFilter)) {
        return false;
      }
    }

    return true;
  });

  const updateAppointmentStatus = (id: string, newStatus: AppointmentStatus) => {
    setAppointmentsList((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
    );
    if (propOnUpdateStatus) {
      propOnUpdateStatus(id, newStatus as any);
    }
  };

  // Action Menu Dispatcher
  const handleActionClick = (actionKey: string, appt: AppointmentItem) => {
    setActiveActionMenuId(null);
    if (actionKey === 'check-in') {
      updateAppointmentStatus(appt.id, 'Checked In');
      showToast(`✓ ${appt.petName} checked in successfully!`);
    } else if (actionKey === 'mark-in-progress') {
      updateAppointmentStatus(appt.id, 'In Progress');
      showToast(`⏱ Grooming marked in progress for ${appt.petName}.`);
    } else if (actionKey === 'mark-complete') {
      updateAppointmentStatus(appt.id, 'Completed');
      showToast(`🎉 Appointment completed for ${appt.petName}! Ready for pickup.`);
    } else if (actionKey === 'duplicate') {
      nextIdRef.current += 1;
      const copy: AppointmentItem = {
        ...appt,
        id: `appt-dup-${nextIdRef.current}`,
        time: '10:00 AM',
        status: 'Scheduled',
      };
      setAppointmentsList((prev) => [copy, ...prev]);
      showToast(`Duplicated appointment for ${appt.petName}.`);
    } else if (actionKey === 'add-waitlist') {
      updateAppointmentStatus(appt.id, 'Waitlisted');
      showToast(`Added ${appt.petName} to waitlist queue.`);
    } else {
      // Direct task modal handlers: view-details, edit, reschedule, add-on, take-payment, send-message, add-note, print-sheet, print-invoice, cancel, no-show, delete
      setActiveTaskAppointment(appt);
      setActiveTaskAction(actionKey as AppointmentActionType);
    }
  };

  const handleAddNewAppointment = (prefilledDate?: string, time?: string, groomer?: string, status?: AppointmentStatus) => {
    if (propOnAddAppointment) {
      propOnAddAppointment();
      return;
    }
    nextIdRef.current += 1;
    const newAppt: AppointmentItem = {
      id: `appt-new-${nextIdRef.current}`,
      date: prefilledDate ? prefilledDate.split('T')[0] : '2025-05-16',
      time: time || '9:00 AM',
      duration: '2.5 hrs',
      customerName: 'New Client',
      customerInitials: 'NC',
      petName: 'Bella',
      breed: 'Poodle',
      petEmoji: '🐩',
      serviceName: 'Full Groom',
      staffName: groomer || 'Sarah M.',
      staffInitials: groomer ? groomer[0] : 'SM',
      location: 'Main Location',
      status: status || 'Scheduled',
      price: 85.0,
      paymentStatus: 'Deposit Paid',
      depositAmount: 25.0,
      notes: 'New intake appointment.',
    };
    setAppointmentsList([newAppt, ...appointmentsList]);
    showToast(`New appointment booked for ${newAppt.petName}!`);
  };

  const hasActiveFilters = 
    locationFilter !== 'All Locations' || 
    groomerFilter !== 'All Groomers' || 
    serviceFilter !== 'All Services' || 
    statusFilter !== 'All Statuses' || 
    searchQuery.trim().length > 0;

  const resetFilters = () => {
    setLocationFilter('All Locations');
    setGroomerFilter('All Groomers');
    setServiceFilter('All Services');
    setStatusFilter('All Statuses');
    setSearchQuery('');
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 font-sans">
      {/* Toast banner */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Top Header matching Screen 1, 2, 3 + Upgraded Header Navigation */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 sm:px-8 flex items-center justify-between flex-shrink-0 gap-4">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-tight">Appointments</h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                {filteredAppointments.length} Active
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">Full-width schedule management with collision-free hourly timeline &amp; Kanban</p>
          </div>
        </div>

        {/* Header Controls: Search + View Switcher + Actions */}
        <div className="flex items-center gap-2.5 flex-wrap justify-end">
          {/* Global Search */}
          <div className="relative w-44 md:w-60">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search pets, parents, groomers..."
              className="w-full pl-8 pr-10 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all shadow-2xs"
            />
            <span className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
              <kbd className="text-[9px] font-semibold text-slate-400 bg-white border border-slate-200 px-1 py-0.5 rounded">⌘K</kbd>
            </span>
          </div>

          {/* VIEW SWITCHER MOVED UP TO HEADER FOR FULL-WIDTH CANVAS */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/90 shadow-2xs">
            <button
              type="button"
              onClick={() => handleViewModeChange('list')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-indigo-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
              title="Table View with Row Actions"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Table</span>
            </button>

            <button
              type="button"
              onClick={() => handleViewModeChange('kanban')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-white text-indigo-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
              title="Kanban Board View by Stage"
            >
              <Columns className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Kanban</span>
            </button>

            <button
              type="button"
              onClick={() => handleViewModeChange('timeline')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === 'timeline'
                  ? 'bg-white text-indigo-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
              title="Collision-Free Hourly Timeline by Groomer"
            >
              <Clock className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Hourly</span>
            </button>

            <button
              type="button"
              onClick={() => handleViewModeChange('calendar')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === 'calendar'
                  ? 'bg-white text-indigo-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
              title="FullCalendar Day/Week/Month"
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Calendar</span>
            </button>

            <button
              type="button"
              onClick={() => handleViewModeChange('grid')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-indigo-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Grid</span>
            </button>
          </div>

          <button
            onClick={() => showToast('Exporting appointment schedule CSV...')}
            className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export</span>
          </button>

          <div className="inline-flex rounded-xl shadow-2xs overflow-hidden bg-indigo-600 hover:bg-indigo-700 text-white transition-colors">
            <button
              onClick={() => handleAddNewAppointment()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Book Appointment</span>
            </button>
            <span className="w-px bg-indigo-700/60 my-1" />
            <button 
              onClick={() => handleAddNewAppointment()}
              className="px-2 py-1.5 hover:bg-indigo-700 cursor-pointer"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Horizon Filter Tabs matching all reference images */}
      <div className="bg-white border-b border-slate-200 px-6 sm:px-8 flex-shrink-0">
        <nav className="flex space-x-6 overflow-x-auto text-xs font-medium custom-scrollbar">
          {[
            'All Appointments',
            'Calendar',
            'Today',
            'Tomorrow',
            'This Week',
            'Next 7 Days',
            'This Month',
            'Waitlist',
            'Past',
            'Canceled',
          ].map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab as HorizonTab)}
              className={`pb-3 pt-2.5 whitespace-nowrap transition-colors border-b-2 cursor-pointer ${
                activeTab === tab
                  ? 'border-indigo-600 text-indigo-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Workspace Area (100% Full Width) */}
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 flex flex-col overflow-y-auto px-6 sm:px-8 py-4 space-y-3.5">
          {/* Secondary Pure Filters Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 flex-shrink-0 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center gap-2 flex-1 max-w-5xl flex-wrap">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1 mr-1">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                Filters:
              </span>

              {/* Location Select */}
              <div className="relative">
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="appearance-none bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 pr-7 text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option>All Locations</option>
                  <option>Main Location</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2 pointer-events-none" />
              </div>

              {/* Groomer Select */}
              <div className="relative">
                <select
                  value={groomerFilter}
                  onChange={(e) => setGroomerFilter(e.target.value)}
                  className="appearance-none bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 pr-7 text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option>All Groomers</option>
                  <option>Sarah M.</option>
                  <option>Mike R.</option>
                  <option>Jessica L.</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2 pointer-events-none" />
              </div>

              {/* Service Select */}
              <div className="relative">
                <select
                  value={serviceFilter}
                  onChange={(e) => setServiceFilter(e.target.value)}
                  className="appearance-none bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 pr-7 text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option>All Services</option>
                  <option>Full Groom</option>
                  <option>Bath &amp; Brush</option>
                  <option>Deluxe Spa</option>
                  <option>Nail Trim</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2 pointer-events-none" />
              </div>

              {/* Status Select */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 pr-7 text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option>All Statuses</option>
                  <option>Scheduled</option>
                  <option>Confirmed</option>
                  <option>Checked In</option>
                  <option>In Progress</option>
                  <option>Completed</option>
                  <option>Waitlisted</option>
                  <option>Canceled</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2 pointer-events-none" />
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Reset Filters</span>
                </button>
              )}
            </div>

            {/* Status Legend Modal Trigger */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowStatusLegend(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition cursor-pointer"
              >
                <Info className="w-3.5 h-3.5 text-indigo-600" />
                <span>Status Legend</span>
              </button>
            </div>
          </div>

          {/* Section Counter */}
          <div className="flex items-center justify-between text-xs px-1 flex-shrink-0">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <span>
                {filteredAppointments.length}{' '}
                {activeTab === 'Waitlist'
                  ? 'Pets on Waitlist'
                  : activeTab === 'Past'
                  ? 'Past Appointments'
                  : activeTab === 'Canceled'
                  ? 'Canceled Appointments'
                  : activeTab === 'Tomorrow'
                  ? 'Appointments Tomorrow'
                  : activeTab === 'Next 7 Days'
                  ? 'Appointments Next 7 Days'
                  : activeTab === 'Today'
                  ? 'Appointments Today'
                  : activeTab === 'This Week'
                  ? 'Appointments This Week'
                  : activeTab === 'This Month'
                  ? 'Appointments This Month'
                  : 'Appointments'}
              </span>
              <button 
                onClick={() => showToast('Refreshing appointment list...')}
                className="p-1 hover:bg-slate-200/60 rounded-md text-slate-400 hover:text-slate-600 transition cursor-pointer"
                title="Refresh"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {viewMode === 'list' && (
              <div className="flex items-center gap-1.5 text-slate-500">
                <span>Sort by:</span>
                <span className="font-semibold text-slate-700">{sortBy}</span>
              </div>
            )}
          </div>

          {/* Main View Mode Switch: Calendar / Kanban / Timeline / Grid / List */}
          {viewMode === 'calendar' ? (
            /* FullCalendar Interactive Engine */
            <FullCalendarView
              appointments={appointmentsList}
              onSelectAppointment={(appt) => handleActionClick('view-details', appt)}
              onAddAppointment={(dateStr) => handleAddNewAppointment(dateStr)}
            />
          ) : viewMode === 'kanban' ? (
            /* Kanban Board by Stage */
            <KanbanView
              appointments={filteredAppointments}
              onSelectAppointment={(appt) => handleActionClick('view-details', appt)}
              onUpdateStatus={updateAppointmentStatus}
              onAddAppointment={(status) => handleAddNewAppointment(undefined, undefined, undefined, status)}
              onActionClick={handleActionClick}
            />
          ) : viewMode === 'timeline' ? (
            /* Hourly Timeline by Groomer (Collision-Free) */
            <HourlyTimelineView
              appointments={filteredAppointments}
              onSelectAppointment={(appt) => handleActionClick('view-details', appt)}
              onAddAppointment={(date, time, groomer) => handleAddNewAppointment(date, time, groomer)}
              onUpdateStatus={updateAppointmentStatus}
              onActionClick={handleActionClick}
            />
          ) : viewMode === 'grid' ? (
            /* Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredAppointments.map((appt) => (
                <div
                  key={appt.id}
                  onClick={() => handleActionClick('view-details', appt)}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3 relative hover:border-indigo-200 hover:shadow-md transition cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center font-bold text-amber-800">
                        {appt.petEmoji}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs">{appt.customerName || 'Pet Parent'}</h4>
                        <p className="text-[11px] text-slate-500 font-medium">{appt.petName} • {appt.breed}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      appt.status === 'Checked In'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : appt.status === 'In Progress'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : appt.status === 'Confirmed'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : appt.status === 'Completed'
                        ? 'bg-teal-50 text-teal-800 border-teal-200'
                        : appt.status === 'Canceled'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : appt.status === 'Waitlisted'
                        ? 'bg-orange-50 text-orange-700 border-orange-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {appt.status}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl text-[11px] space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Service:</span>
                      <span className="font-semibold text-slate-800">{appt.serviceName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Time:</span>
                      <span className="font-semibold text-slate-800">{appt.time}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Groomer:</span>
                      <span className="font-semibold text-slate-800">{appt.staffName || 'Unassigned'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Price:</span>
                      <span className="font-bold text-emerald-600">${appt.price?.toFixed(2) || '85.00'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => setSelectedAppointmentForDetails(appt)}
                      className="text-xs text-indigo-600 font-semibold hover:underline cursor-pointer"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => setActiveActionMenuId(activeActionMenuId === appt.id ? null : appt.id)}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>

                  {activeActionMenuId === appt.id && (
                    <AppointmentActionMenu
                      appointment={appt}
                      onClose={() => setActiveActionMenuId(null)}
                      onAction={handleActionClick}
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* Standard Full-Feature Appointments Table matching Screens 1, 2, 3, 4, 5, 8 */
            <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-visible">
              <div className="overflow-x-auto">
                {activeTab === 'Canceled' ? (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-500">
                        <th className="py-3 px-4 font-semibold">Date &amp; Time</th>
                        <th className="py-3 px-4 font-semibold">Customer / Pet</th>
                        <th className="py-3 px-4 font-semibold">Service</th>
                        <th className="py-3 px-4 font-semibold">Groomer</th>
                        <th className="py-3 px-4 font-semibold">Cancellation Reason</th>
                        <th className="py-3 px-4 font-semibold">Canceled At</th>
                        <th className="py-3 px-4 font-semibold">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                      {filteredAppointments.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400">
                            <p className="font-semibold text-sm">No canceled appointments</p>
                            <p className="text-xs mt-1">Try clearing filters or search query.</p>
                          </td>
                        </tr>
                      ) : (
                        filteredAppointments.map((appt) => (
                          <tr key={appt.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-900">
                              {formatDateHeader(appt.date, activeTab)}{' '}
                              <span className="text-slate-400 font-normal text-[11px]">{appt.time || '9:00 AM'}</span>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-6 h-6 rounded-full ${getCanceledAvatarBg(appt.customerInitials)} font-bold flex items-center justify-center text-[10px] shrink-0`}>
                                  {appt.customerInitials || 'PA'}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-medium text-slate-900 leading-tight">{appt.customerName}</span>
                                  <span className="text-[10px] text-slate-400 leading-tight">{appt.petName}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap text-slate-700 font-medium">{appt.serviceName}</td>
                            <td className="py-3.5 px-4 whitespace-nowrap text-slate-700">{appt.staffName || 'Sarah M.'}</td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                                appt.cancellationReason === 'Canceled by Salon'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : appt.cancellationReason === 'No Show' || appt.status === 'No Show'
                                  ? 'bg-slate-100 text-slate-700 border border-slate-300'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}>
                                {appt.cancellationReason || (appt.status === 'No Show' ? 'No Show' : 'Canceled by Customer')}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 text-[11px]">{appt.canceledAt || 'May 13, 2025 2:30 PM'}</td>
                            <td className="py-3.5 px-4 text-slate-500 text-[11px]">{appt.notes || '—'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                ) : activeTab === 'Waitlist' ? (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-500">
                        <th className="py-3.5 px-5 font-semibold">Customer / Pet</th>
                        <th className="py-3.5 px-4 font-semibold">Service</th>
                        <th className="py-3.5 px-4 font-semibold">Preferred Date</th>
                        <th className="py-3.5 px-4 font-semibold">Notes</th>
                        <th className="py-3.5 px-4 font-semibold">Added On</th>
                        <th className="py-3.5 px-4 text-right font-semibold">Row Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                      {filteredAppointments.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400">
                            <p className="font-semibold text-sm">No pets on waitlist</p>
                            <p className="text-xs mt-1">Try clearing filters or search query.</p>
                          </td>
                        </tr>
                      ) : (
                        filteredAppointments.map((appt) => (
                          <tr key={appt.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-5 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center shrink-0 text-slate-600 font-medium text-xs">
                                  {appt.petAvatar ? (
                                    <img alt={appt.petName} className="w-full h-full object-cover" src={appt.petAvatar} />
                                  ) : (
                                    <span>{appt.customerInitials || appt.petEmoji}</span>
                                  )}
                                </div>
                                <div>
                                  <div className="font-semibold text-slate-900 leading-tight">{appt.customerName}</div>
                                  <div className="text-[11px] text-slate-500 leading-tight">{appt.petName}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-800">{appt.serviceName}</td>
                            <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">{appt.preferredDate || 'Anytime'}</td>
                            <td className="py-3.5 px-4 text-slate-500">{appt.notes || '—'}</td>
                            <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">{appt.addedOn || 'May 16, 2025'}</td>
                            <td className="py-3.5 px-4 whitespace-nowrap text-right text-slate-400 relative">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleAddNewAppointment(undefined, undefined, undefined, 'Scheduled')}
                                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-semibold text-[11px] transition cursor-pointer"
                                >
                                  Book Slot
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleActionClick('view-details', appt)}
                                  className="text-[11px] text-slate-500 hover:text-indigo-600 font-semibold px-2 py-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                                >
                                  Details
                                </button>
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={() => setActiveActionMenuId(activeActionMenuId === appt.id ? null : appt.id)}
                                    className={`p-1.5 rounded-lg transition cursor-pointer ${
                                      activeActionMenuId === appt.id
                                        ? 'bg-indigo-50 text-indigo-600'
                                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                                    }`}
                                  >
                                    <MoreHorizontal className="w-4 h-4" />
                                  </button>
                                  {activeActionMenuId === appt.id && (
                                    <AppointmentActionMenu
                                      appointment={appt}
                                      onClose={() => setActiveActionMenuId(null)}
                                      onAction={handleActionClick}
                                    />
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-500">
                        <th className="py-3 px-4 font-semibold">Date &amp; Time</th>
                        <th className="py-3 px-4 font-semibold">Customer / Pet</th>
                        <th className="py-3 px-4 font-semibold">Service</th>
                        <th className="py-3 px-4 font-semibold">Groomer</th>
                        <th className="py-3 px-4 font-semibold">Location</th>
                        <th className="py-3 px-4 font-semibold">Status</th>
                        <th className="py-3 px-4 font-semibold">Payment</th>
                        <th className="py-3 px-4 text-right font-semibold">Assigned Row Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                      {filteredAppointments.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-400">
                            <p className="font-semibold text-sm">No appointments found</p>
                            <p className="text-xs mt-1">Try clearing filters or search query.</p>
                          </td>
                        </tr>
                      ) : (
                        filteredAppointments.map((appt) => (
                          <tr key={appt.id} className="hover:bg-slate-50/70 transition-colors relative">
                            {/* Date & Time */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="font-semibold text-slate-800">
                                {formatDateHeader(appt.date, activeTab)}
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                {appt.time} {appt.duration && `(${appt.duration})`}
                              </div>
                            </td>

                            {/* Customer / Pet */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-2.5">
                                {appt.petAvatar ? (
                                  <img
                                    src={appt.petAvatar}
                                    alt={appt.petName}
                                    className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0"
                                  />
                                ) : (
                                  <div className={`w-7 h-7 rounded-full ${getAvatarBg(appt.customerInitials)} font-bold flex items-center justify-center text-xs shrink-0`}>
                                    {appt.customerInitials || appt.petEmoji}
                                  </div>
                                )}
                                <div>
                                  <div className="font-semibold text-slate-800 leading-tight">
                                    {appt.customerName || 'Sarah Johnson'}
                                  </div>
                                  <div className="text-[11px] text-slate-400 leading-tight">
                                    {appt.petName}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Service */}
                            <td className="py-3 px-4 font-medium whitespace-nowrap text-slate-800">
                              {appt.serviceName}
                            </td>

                            {/* Groomer */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                {appt.staffAvatar ? (
                                  <img
                                    src={appt.staffAvatar}
                                    alt={appt.staffName || 'Groomer'}
                                    className="w-6 h-6 rounded-full object-cover shrink-0"
                                  />
                                ) : (
                                  <div className={`w-5 h-5 rounded-full ${getStaffBadgeBg(appt.staffInitials || appt.staffName)} text-[9px] font-bold flex items-center justify-center shrink-0`}>
                                    {appt.staffInitials || (appt.staffName ? appt.staffName[0] : 'SM')}
                                  </div>
                                )}
                                <span className="text-slate-600 font-medium">
                                  {appt.staffName || 'Sarah M.'}
                                </span>
                              </div>
                            </td>

                            {/* Location */}
                            <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                              {appt.location || 'Main Location'}
                            </td>

                            {/* Status Badge */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadgeStyle(appt.status)}`}>
                                {appt.status}
                              </span>
                            </td>

                            {/* Payment */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              {appt.paymentStatus === '—' ? (
                                <span className="text-slate-400 font-medium">—</span>
                              ) : (
                                <>
                                  <div className="text-[10px] text-slate-400 leading-none mb-1">
                                    {appt.paymentStatus || 'Deposit Paid'}
                                  </div>
                                  <div className="font-bold text-emerald-600 text-xs">
                                    ${appt.depositAmount ? appt.depositAmount.toFixed(2) : appt.price ? appt.price.toFixed(2) : '25.00'}
                                  </div>
                                </>
                              )}
                            </td>

                            {/* Actions with assigned row-level buttons */}
                            <td className="py-3 px-4 text-right whitespace-nowrap relative">
                              <div className="flex items-center justify-end gap-1.5">
                                {appt.status === 'Scheduled' && (
                                  <button
                                    type="button"
                                    onClick={() => updateAppointmentStatus(appt.id, 'Confirmed')}
                                    className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-semibold text-[11px] transition cursor-pointer"
                                  >
                                    Confirm
                                  </button>
                                )}
                                {appt.status === 'Confirmed' && (
                                  <button
                                    type="button"
                                    onClick={() => updateAppointmentStatus(appt.id, 'Checked In')}
                                    className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg font-semibold text-[11px] transition cursor-pointer"
                                  >
                                    Check In
                                  </button>
                                )}
                                {appt.status === 'Checked In' && (
                                  <button
                                    type="button"
                                    onClick={() => updateAppointmentStatus(appt.id, 'In Progress')}
                                    className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg font-semibold text-[11px] transition cursor-pointer"
                                  >
                                    Start Groom
                                  </button>
                                )}
                                {appt.status === 'In Progress' && (
                                  <button
                                    type="button"
                                    onClick={() => updateAppointmentStatus(appt.id, 'Completed')}
                                    className="px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg font-semibold text-[11px] transition cursor-pointer"
                                  >
                                    Complete
                                  </button>
                                )}
                                {appt.status === 'Completed' && (
                                  <button
                                    type="button"
                                    onClick={() => handleActionClick('invoice', appt)}
                                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-[11px] transition cursor-pointer"
                                  >
                                    Invoice
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => setSelectedAppointmentForDetails(appt)}
                                  className="text-[11px] text-slate-500 hover:text-indigo-600 font-semibold px-2 py-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                                >
                                  Details
                                </button>

                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={() => setActiveActionMenuId(activeActionMenuId === appt.id ? null : appt.id)}
                                    className={`p-1.5 rounded-lg transition cursor-pointer ${
                                      activeActionMenuId === appt.id
                                        ? 'bg-indigo-50 text-indigo-600'
                                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                                    }`}
                                  >
                                    <MoreHorizontal className="w-4 h-4" />
                                  </button>

                                  {/* Dropdown Action Overlay Menu matching Screen 2 */}
                                  {activeActionMenuId === appt.id && (
                                    <AppointmentActionMenu
                                      appointment={appt}
                                      onClose={() => setActiveActionMenuId(null)}
                                      onAction={handleActionClick}
                                    />
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Table Pagination Footer matching design */}
              <div className="px-4 py-3 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span>Show</span>
                  <div className="relative">
                    <select className="appearance-none bg-slate-50 border border-slate-200 rounded-lg pl-2.5 pr-7 py-1 text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer">
                      <option>25</option>
                      <option>50</option>
                      <option>100</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2 pointer-events-none" />
                  </div>
                  <span>per page</span>
                </div>

                <div className="flex items-center gap-1">
                  <button className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-40" disabled>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">1</button>
                  <button className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-600 font-medium flex items-center justify-center text-xs cursor-pointer">2</button>
                  <button className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-600 font-medium flex items-center justify-center text-xs cursor-pointer">3</button>
                  <button className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-600 font-medium flex items-center justify-center text-xs cursor-pointer">4</button>
                  <button className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-slate-500 font-medium">
                  1 – {filteredAppointments.length} of {appointmentsList.length} appointments
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modals & Dialogs */}
      {showStatusLegend && (
        <StatusLegendModal onClose={() => setShowStatusLegend(false)} />
      )}

      {showActionGuide && (
        <ActionsReferenceGuideModal onClose={() => setShowActionGuide(false)} />
      )}

      {/* Appointment Detail Modal */}
      {selectedAppointmentForDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-xl font-bold">
                  {selectedAppointmentForDetails.petEmoji}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{selectedAppointmentForDetails.petName}</h3>
                  <p className="text-xs text-slate-500">{selectedAppointmentForDetails.breed} • Owner: {selectedAppointmentForDetails.customerName || 'Sarah Johnson'}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAppointmentForDetails(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl">
                <div>
                  <span className="text-slate-400 text-[11px] block">Service</span>
                  <span className="font-semibold text-slate-800">{selectedAppointmentForDetails.serviceName}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Assigned Groomer</span>
                  <span className="font-semibold text-slate-800">{selectedAppointmentForDetails.staffName || 'Sarah M.'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Scheduled Time</span>
                  <span className="font-semibold text-slate-800">{selectedAppointmentForDetails.time} ({selectedAppointmentForDetails.duration || '2.5 hrs'})</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Price &amp; Deposit</span>
                  <span className="font-bold text-emerald-600">${selectedAppointmentForDetails.price?.toFixed(2) || '85.00'}</span>
                </div>
              </div>

              {selectedAppointmentForDetails.notes && (
                <div className="p-3 bg-indigo-50/60 rounded-xl text-indigo-900 border border-indigo-100/60">
                  <span className="font-bold block text-[11px]">Special Instructions:</span>
                  <p className="text-xs mt-0.5">{selectedAppointmentForDetails.notes}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  updateAppointmentStatus(selectedAppointmentForDetails.id, 'Checked In');
                  setSelectedAppointmentForDetails(null);
                  showToast(`${selectedAppointmentForDetails.petName} checked in!`);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition cursor-pointer"
              >
                Check In Pet
              </button>
              <button
                onClick={() => setSelectedAppointmentForDetails(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
