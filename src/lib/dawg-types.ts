export type DawgNavSection = 
  | 'dashboard'
  | 'customers'
  | 'pets'
  | 'appointments'
  | 'grooming-records'
  | 'calendar'
  | 'services'
  | 'payments'
  | 'invoices'
  | 'deposits'
  | 'refunds'
  | 'gift-cards'
  | 'documents'
  | 'communications'
  | 'marketing'
  | 'staff'
  | 'schedule'
  | 'payroll'
  | 'inventory'
  | 'reports'
  | 'settings';

export interface KPIMetric {
  id: string;
  label: string;
  value: string;
  change: string;
  period: string;
  isPositive: boolean;
  iconName: 'calendar' | 'currency-dollar' | 'user-plus' | 'paw-print' | 'arrows-clockwise';
  colorTheme: 'purple' | 'emerald' | 'blue' | 'amber' | 'rose';
}

export type AppointmentStatus =
  | 'Scheduled'
  | 'Confirmed'
  | 'Checked In'
  | 'In Progress'
  | 'Completed'
  | 'Canceled'
  | 'Cancelled'
  | 'No Show'
  | 'Waitlisted';

export interface AppointmentItem {
  id: string;
  date?: string; // e.g. '2025-05-16' or 'May 16, 2025'
  time?: string; // e.g. '8:30 AM' or '8:30 AM (2.5 hrs)'
  duration?: string; // e.g. '2.5 hrs'
  customerName?: string;
  customerInitials?: string;
  customerAvatar?: string;
  petName: string;
  breed: string;
  petEmoji: string;
  petAvatar?: string;
  serviceName: string;
  staffName?: string;
  staffInitials?: string;
  staffAvatar?: string;
  location?: string;
  status: AppointmentStatus;
  price?: number;
  paymentStatus?: 'Deposit Paid' | 'Paid in Full' | 'Unpaid' | '—';
  depositAmount?: number;
  notes?: string;
  cancellationReason?: string;
  canceledAt?: string;
  preferredDate?: string;
  addedOn?: string;
}

export type SlotStatus = 'booked' | 'available' | 'break' | 'blocked';

export interface StaffScheduleItem {
  id: string;
  name: string;
  role: 'Groomer' | 'Bather' | 'Stylist' | 'Assistant';
  initials: string;
  slots: SlotStatus[];
  appointmentsCount: number;
  phone?: string;
  commissionRate?: number;
}

export interface FunnelStage {
  stage: string;
  count: number;
  subtext: string;
  conversionPercent?: string;
  bgClass: string;
  textClass: string;
}

export interface GroomingRecord {
  id: string;
  petName: string;
  breed: string;
  petEmoji: string;
  date: string;
  serviceName: string;
  groomer: string;
  amount: number;
  status: 'Paid' | 'Unpaid' | 'Pending';
  cutDetails?: string;
  coatCondition?: string;
}

export interface AlertNotification {
  id: string;
  title: string;
  description: string;
  count: number;
  type: 'vaccination' | 'document' | 'birthday' | 'inventory';
  iconName: 'first-aid' | 'file-text' | 'cake' | 'package';
  bgIconColor: string;
  badgeBg: string;
  badgeText: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  pets: string[];
  totalSpent: number;
  lastVisit: string;
  preferredGroomer?: string;
  notes?: string;
  avatarUrl?: string;
}

export interface PetRecord {
  id: string;
  name: string;
  breed: string;
  age: string;
  weight: string;
  ownerName: string;
  emoji: string;
  vaccinationStatus: 'Up to date' | 'Expiring Soon' | 'Expired';
  specialNotes?: string;
  lastGroomDate?: string;
  preferredGroomer?: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  category: 'Full Groom' | 'Bath & Brush' | 'Deluxe Spa' | 'Add-on' | 'A La Carte' | string;
  durationMinutes: number;
  price: number;
  description: string;
  active?: boolean;
}

export interface ProductItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  stock?: number;
  minStock?: number;
  inStock?: number;
  reorderPoint?: number;
  price: number;
  supplier?: string;
  [key: string]: any;
}

export interface LocationItem {
  id: string;
  name: string;
  type: string;
  address: string;
  cityStateZip: string;
  phone: string;
  email: string;
  manager: string;
  status: 'Active' | 'Under Maintenance' | 'Opening Soon';
  stationCount: number;
  operatingHours: string;
  isDefault: boolean;
}

export type UserRole = 'admin' | 'groomer' | 'customer';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  stationName?: string;
}

export interface CustomerFullProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  status?: string;
  memberSince?: string;
  customerSince?: string;
  avatarUrl?: string;
  vipStatus?: string;
  totalSpent: number;
  lifetimeValue?: number;
  outstandingBalance?: number;
  totalVisits?: number;
  loyaltyPoints?: number;
  preferredContact?: string;
  notes?: string;
  communicationOptIn?: {
    sms: boolean;
    email: boolean;
    marketing: boolean;
  };
  pets: any[];
  paymentMethods?: Array<{
    id: string;
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
    isDefault: boolean;
  }>;
  defaultPaymentMethod?: {
    cardBrand: string;
    last4: string;
    expires: string;
  };
  paymentHistory?: any[];
  recentActivity?: any[];
  communication?: any;
  upcomingAppointments?: any[];
}

export interface CustomerPetDetail {
  id: string;
  name: string;
  breed: string;
  age: string;
  weight: string;
  gender: string;
  birthDate?: string;
  isPrimary?: boolean;
  isSpayedNeutered?: boolean;
  color?: string;
  microchipNumber?: string;
  allergies?: string[];
  medicalAlerts?: string[];
  medicalAlert?: string;
  vaccinationsStatus?: string;
  behaviorFlags?: string[];
  preferredGroomer?: string;
  groomingFrequencyWeeks?: number;
  lastGroomDate?: string;
  nextApptDate?: string;
  nextApptType?: string;
  vaccines?: {
    rabies: { status: 'Up to date' | 'Expiring Soon' | 'Expired'; expires: string };
    dhpp: { status: 'Up to date' | 'Expiring Soon' | 'Expired'; expires: string };
    bordetella: { status: 'Up to date' | 'Expiring Soon' | 'Expired'; expires: string };
  };
  photoUrl?: string;
  imageUrl?: string;
}

export interface CustomerAppointmentItem {
  id: string;
  date: string;
  time: string;
  petName: string;
  service: string;
  groomer: string;
  amount: number;
  status: 'Completed' | 'Upcoming' | 'Canceled' | 'In Progress' | 'Checked In' | 'No Show';
  deposit?: number;
  addons?: string[];
}

export interface GroomerAppointmentItem {
  id: string;
  time: string;
  duration?: string;
  petName: string;
  breed: string;
  age?: string;
  weight?: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string;
  serviceName?: string;
  serviceType?: string;
  durationMinutes?: number;
  status: 'Scheduled' | 'Checked In' | 'In Service' | 'In Bath' | 'On Table' | 'Blow Drying' | 'Styling' | 'Ready for Pickup' | 'Completed';
  price?: number;
  coatType?: string;
  temperament?: string;
  specialHandlingNotes?: string;
  bladeGuide?: string;
  photoUrl?: string;
  petImage?: string;
  allergies?: string;
  healthAlert?: string;
  stationName?: string;
  lastGroomDate?: string;
  instructions?: string;
  notes?: string;
  ownerNotes?: string;
  internalNotes?: string[];
  addons?: Array<{ name: string; price: number }>;
  [key: string]: any;
}
