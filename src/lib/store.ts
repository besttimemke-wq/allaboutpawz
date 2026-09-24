import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AuthUser,
  AppointmentItem,
  Customer,
  PetRecord,
  StaffScheduleItem,
  GroomingRecord,
  LocationItem,
  DawgNavSection,
} from '@/lib/types';
import {
  KPI_METRICS,
  STAFF_SCHEDULES,
  BOOKING_FUNNEL,
  GROOMING_RECORDS,
  ALERTS_LIST,
  INITIAL_CUSTOMERS,
  INITIAL_PETS,
  INITIAL_LOCATIONS,
} from '@/lib/dawg-mock-data';
import { RICH_APPOINTMENTS_DATA } from '@/lib/appointments-rich-data';

interface AppState {
  // Auth
  currentUser: AuthUser | null;
  setUser: (user: AuthUser | null) => void;

  // Navigation
  activeSection: DawgNavSection;
  setActiveSection: (section: DawgNavSection) => void;

  // UI state
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // Location
  selectedLocation: string;
  setSelectedLocation: (loc: string) => void;
  locations: LocationItem[];
  addLocation: (loc: LocationItem) => void;
  deleteLocation: (id: string) => void;

  // Data
  appointments: AppointmentItem[];
  setAppointments: (fn: (prev: AppointmentItem[]) => AppointmentItem[]) => void;
  customers: Customer[];
  setCustomers: (fn: (prev: Customer[]) => Customer[]) => void;
  pets: PetRecord[];
  setPets: (fn: (prev: PetRecord[]) => PetRecord[]) => void;
  staffSchedules: StaffScheduleItem[];
  groomingRecords: GroomingRecord[];

  // Modal state
  activeModal: 'appointment' | 'customer' | 'pet' | 'intake' | 'payment' | 'invoice' | 'search' | null;
  setActiveModal: (modal: AppState['activeModal']) => void;

  // Static data (read-only exports)
  metrics: typeof KPI_METRICS;
  bookingFunnel: typeof BOOKING_FUNNEL;
  alerts: typeof ALERTS_LIST;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Auth
      currentUser: null,
      setUser: (user) => set({ currentUser: user }),

      // Navigation
      activeSection: 'dashboard',
      setActiveSection: (section) => set({ activeSection: section }),

      // UI state
      mobileOpen: false,
      setMobileOpen: (open) => set({ mobileOpen: open }),
      isSidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ isSidebarCollapsed: !s.isSidebarCollapsed })),

      // Location
      selectedLocation: 'All About Pawz – Main Location',
      setSelectedLocation: (loc) => set({ selectedLocation: loc }),
      locations: INITIAL_LOCATIONS,
      addLocation: (loc) => set((s) => ({ locations: [...s.locations, loc] })),
      deleteLocation: (id) => set((s) => ({ locations: s.locations.filter((l) => l.id !== id) })),

      // Data
      appointments: RICH_APPOINTMENTS_DATA,
      setAppointments: (fn) => set((s) => ({ appointments: fn(s.appointments) })),
      customers: INITIAL_CUSTOMERS,
      setCustomers: (fn) => set((s) => ({ customers: fn(s.customers) })),
      pets: INITIAL_PETS,
      setPets: (fn) => set((s) => ({ pets: fn(s.pets) })),
      staffSchedules: STAFF_SCHEDULES,
      groomingRecords: GROOMING_RECORDS,

      // Modal state
      activeModal: null,
      setActiveModal: (modal) => set({ activeModal: modal }),

      // Static data
      metrics: KPI_METRICS,
      bookingFunnel: BOOKING_FUNNEL,
      alerts: ALERTS_LIST,
    }),
    {
      name: 'pawz-portal-store',
      // Only persist auth + UI state, not data arrays
      partialize: (s) => ({
        currentUser: s.currentUser,
        isSidebarCollapsed: s.isSidebarCollapsed,
        selectedLocation: s.selectedLocation,
      }),
    },
  ),
);
