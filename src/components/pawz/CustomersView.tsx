'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Customer, CustomerFullProfile } from '@/lib/types';
import { CustomerDetailsView } from './CustomerDetailsView';
import { SARAH_JOHNSON_PROFILE } from '@/lib/dawg-mock-data';
import { QuickActionsModal, UnifiedQuickActionType } from './QuickActionsModal';
import {
  QuickActionTakePaymentView,
  QuickActionNewAppointmentView,
  QuickActionAddPetView,
  QuickActionSendMessageView,
  QuickActionUpdateDocumentsView,
  QuickActionAddNoteView,
} from './customer/CustomerQuickActionsViews';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  Dog,
  Calendar,
  DollarSign,
  ChevronDown,
  X,
  CreditCard,
  MessageSquare,
  FileText,
  FileCheck,
  CalendarPlus,
  Scissors,
  ArrowRight,
  Filter,
  Check,
  MoreHorizontal,
  Pencil,
  AlertTriangle,
  Clock,
  Sparkles,
  ChevronRight,
  SlidersHorizontal,
  Bookmark,
  Zap,
  CheckCircle2,
  ShieldCheck,
  Activity,
  AlertCircle,
  RotateCw,
  User,
  PawPrint,
  MoreVertical,
} from 'lucide-react';
import { PageHeader, PageTabs, PageToolbar, FilterSelect } from './_shared/PageHeader';
import { cn } from '@/lib/utils';

interface CustomersViewProps {
  customers: Customer[];
  onAddCustomer: () => void;
  onOpenNewAppointment?: () => void;
  onOpenAddPet?: () => void;
  onOpenTakePayment?: () => void;
  onOpenIntake?: () => void;
}

export type FilterTab = 
  | 'all' 
  | 'active' 
  | 'new' 
  | 'returning' 
  | 'inactive' 
  | 'followup' 
  | 'upcoming' 
  | 'outstanding';

export interface ExtendedCustomerRecord extends Omit<Customer, 'totalSpent' | 'lastVisit'> {
  totalSpent?: number;
  lastVisit?: string;
  avatarUrl?: string;
  initials?: string;
  petPhotos?: string[];
  petDetails?: any[];
  isLiveDb?: boolean;
  petCount?: number;
  lastService?: string;
  nextAppointment?: string;
  nextApptTime?: string;
  lifetimeValue?: number;
  balance?: number;
  statusText?: 'Active' | 'Inactive' | 'Pending';
  customerType?: string;
  preferredContact?: string;
  program?: string;
  referredBy?: string;
  notes?: string;
  address?: string;
  customerSince?: string;
  totalSpentVal?: number;
  loyaltyPoints?: number;
  cardBrand?: string;
  cardLast4?: string;
  cardExpiry?: string;
  // Specific tab extra metadata
  inactiveDuration?: string;
  followupReason?: string;
  followupUrgency?: 'amber' | 'rose';
  assignedStaff?: string;
}

const EXTENDED_MOCK_CUSTOMERS: ExtendedCustomerRecord[] = [
  // 1. Sarah Johnson (Active / Selected Profile)
  {
    id: 'cust-1',
    name: 'Sarah Johnson',
    initials: 'SJ',
    email: 'sarah.johnson@email.com',
    phone: '(214) 555-0198',
    address: '1234 Maple Drive, Frisco, TX 75034',
    pets: ['Bella (Golden Retriever)', 'Charlie (Mini Poodle)'],
    petCount: 2,
    petPhotos: [
      'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=200&q=80',
      'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?auto=format&fit=crop&w=200&q=80',
    ],
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
    preferredGroomer: 'Sarah M.',
    lastVisit: 'May 2, 2025',
    lastService: 'Full Groom',
    nextAppointment: 'May 16, 2025',
    nextApptTime: '10:30 AM',
    totalSpent: 1095.50,
    lifetimeValue: 1245.50,
    balance: 0.00,
    statusText: 'Active',
    customerType: 'Regular',
    preferredContact: 'Email, Text',
    program: 'Morning',
    referredBy: 'Google Search',
    notes: 'Loyal customer. Prefers mornings.',
    customerSince: 'Apr 12, 2023',
    loyaltyPoints: 245,
    cardBrand: 'VISA',
    cardLast4: '4242',
    cardExpiry: '04/27',
    assignedStaff: 'Sarah M.',
  },
  // 2. Mike Ross
  {
    id: 'cust-2',
    name: 'Mike Ross',
    initials: 'MR',
    email: 'mike.ross@email.com',
    phone: '(469) 555-0167',
    address: '884 Preston Rd, Frisco, TX 75034',
    pets: ['Rocky (German Shepherd)'],
    petCount: 1,
    petPhotos: [
      'https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?auto=format&fit=crop&w=200&q=80'
    ],
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    preferredGroomer: 'Marcus V.',
    lastVisit: 'Apr 19, 2025',
    lastService: 'Bath & Brush',
    nextAppointment: 'May 17, 2025',
    nextApptTime: '10:00 AM',
    totalSpent: 665.00,
    lifetimeValue: 665.00,
    balance: 0.00,
    statusText: 'Active',
    customerType: 'VIP',
    preferredContact: 'SMS',
    program: 'Weekend',
    referredBy: 'Instagram',
    notes: 'Rocky requires double de-shedding shampoo.',
    customerSince: 'Nov 04, 2023',
    loyaltyPoints: 180,
    cardBrand: 'MC',
    cardLast4: '8812',
    cardExpiry: '11/26',
    assignedStaff: 'Marcus V.',
  },
  // 3. Emily Davis
  {
    id: 'cust-3',
    name: 'Emily Davis',
    initials: 'ED',
    email: 'emily.davis@email.com',
    phone: '(972) 555-0144',
    address: '402 Legacy Dr, Frisco, TX 75034',
    pets: ['Daisy (Bichon)', 'Coco (Shih Tzu)'],
    petCount: 2,
    petPhotos: [
      'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=200&q=80',
      'https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?auto=format&fit=crop&w=200&q=80'
    ],
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    preferredGroomer: 'Sarah M.',
    lastVisit: 'Apr 18, 2025',
    lastService: 'Bath & Brush',
    nextAppointment: 'May 20, 2025',
    nextApptTime: '12:30 PM',
    totalSpent: 2315.75,
    lifetimeValue: 2340.75,
    balance: 25.00,
    statusText: 'Active',
    customerType: 'Multi-Pet VIP',
    preferredContact: 'Phone, Text',
    program: 'Bi-Weekly',
    referredBy: 'Friend Referral',
    notes: 'Gentle hand scissoring for Daisy.',
    customerSince: 'Jun 22, 2022',
    loyaltyPoints: 520,
    cardBrand: 'VISA',
    cardLast4: '1098',
    cardExpiry: '09/28',
    assignedStaff: 'Sarah M.',
  },
  // 4. David Wilson
  {
    id: 'cust-4',
    name: 'David Wilson',
    initials: 'DW',
    email: 'david.wilson@email.com',
    phone: '(214) 555-0112',
    address: '512 Main St, Frisco, TX 75034',
    pets: ['Zeus (Husky)'],
    petCount: 1,
    petPhotos: [
      'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?auto=format&fit=crop&w=200&q=80'
    ],
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    preferredGroomer: 'Alex D.',
    lastVisit: 'Apr 15, 2025',
    lastService: 'Full Groom',
    nextAppointment: 'May 18, 2025',
    nextApptTime: '2:30 PM',
    totalSpent: 590.00,
    lifetimeValue: 590.00,
    balance: 0.00,
    statusText: 'Active',
    customerType: 'Regular',
    preferredContact: 'Email',
    program: 'Monthly',
    referredBy: 'Google Maps',
    notes: 'Sensitive around paws.',
    customerSince: 'Jan 10, 2024',
    loyaltyPoints: 110,
    cardBrand: 'AMEX',
    cardLast4: '3004',
    cardExpiry: '01/27',
    assignedStaff: 'Alex D.',
  },
  // 5. Jennifer Lee
  {
    id: 'cust-5',
    name: 'Jennifer Lee',
    initials: 'JL',
    email: 'jennifer.lee@email.com',
    phone: '(469) 555-0130',
    address: '920 Eldorado Pkwy, Frisco, TX 75034',
    pets: ['Milo (Frenchie)'],
    petCount: 1,
    petPhotos: [
      'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=200&q=80'
    ],
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    preferredGroomer: 'Sarah M.',
    lastVisit: 'Apr 10, 2025',
    lastService: 'Deluxe Spa',
    nextAppointment: 'May 21, 2025',
    nextApptTime: '4:00 PM',
    totalSpent: 1105.00,
    lifetimeValue: 1105.00,
    balance: 0.00,
    statusText: 'Active',
    customerType: 'Regular',
    preferredContact: 'Text',
    program: 'Express Spa',
    referredBy: 'TikTok',
    notes: 'Ear cleansing drops requested.',
    customerSince: 'Aug 18, 2023',
    loyaltyPoints: 220,
    cardBrand: 'VISA',
    cardLast4: '7721',
    cardExpiry: '03/26',
    assignedStaff: 'Sarah M.',
  },

  // ---------------- NEW CUSTOMERS (New Tab) ----------------
  {
    id: 'cust-new-1',
    name: 'Olivia Martinez',
    initials: 'OM',
    email: 'olivia.martinez@email.com',
    phone: '(214) 555-0112',
    address: '102 Main St, Frisco, TX',
    pets: ['Bentley (Golden Doodle)'],
    petCount: 1,
    lastVisit: '— First Visit Pending',
    nextAppointment: 'May 24, 2025',
    nextApptTime: '11:00 AM',
    totalSpent: 0.00,
    lifetimeValue: 0.00,
    balance: 0.00,
    statusText: 'Active',
    customerType: 'New Customer',
    customerSince: 'May 01, 2025',
  },
  {
    id: 'cust-new-2',
    name: 'Brandon Taylor',
    initials: 'BT',
    email: 'brandon.taylor@email.com',
    phone: '(214) 555-0130',
    address: '404 Oak Ln, Frisco, TX',
    pets: ['Ziggy (Shih Tzu)'],
    petCount: 1,
    lastVisit: '— First Visit Pending',
    nextAppointment: 'May 25, 2025',
    nextApptTime: '1:30 PM',
    totalSpent: 0.00,
    lifetimeValue: 0.00,
    balance: 0.00,
    statusText: 'Active',
    customerType: 'New Customer',
    customerSince: 'May 02, 2025',
  },
  {
    id: 'cust-new-3',
    name: 'Amanda White',
    initials: 'AW',
    email: 'amanda.white@email.com',
    phone: '(469) 555-0126',
    address: '770 Cedar Ave, Frisco, TX',
    pets: ['Penny (Poodle)', 'Ollie (Cavapoo)'],
    petCount: 2,
    lastVisit: '— First Visit Pending',
    nextAppointment: 'May 26, 2025',
    nextApptTime: '9:00 AM',
    totalSpent: 0.00,
    lifetimeValue: 0.00,
    balance: 0.00,
    statusText: 'Active',
    customerType: 'New Customer',
    customerSince: 'May 03, 2025',
  },
  {
    id: 'cust-new-4',
    name: 'Kevin Carter',
    initials: 'KC',
    email: 'kevin.carter@email.com',
    phone: '(972) 555-0158',
    address: '891 Elm St, Frisco, TX',
    pets: ['Rocco (Bulldog)'],
    petCount: 1,
    lastVisit: '— First Visit Pending',
    nextAppointment: 'May 27, 2025',
    nextApptTime: '2:00 PM',
    totalSpent: 0.00,
    lifetimeValue: 0.00,
    balance: 0.00,
    statusText: 'Active',
    customerType: 'New Customer',
    customerSince: 'May 04, 2025',
  },
  {
    id: 'cust-new-5',
    name: 'Rachel Green',
    initials: 'RG',
    email: 'rachel.green@email.com',
    phone: '(972) 555-0169',
    address: '522 Pine Blvd, Frisco, TX',
    pets: ['Sunny (Maltese)'],
    petCount: 1,
    lastVisit: '— First Visit Pending',
    nextAppointment: 'May 30, 2025',
    nextApptTime: '10:30 AM',
    totalSpent: 0.00,
    lifetimeValue: 0.00,
    balance: 0.00,
    statusText: 'Active',
    customerType: 'New Customer',
    customerSince: 'May 05, 2025',
  },

  // ---------------- RETURNING CUSTOMERS (Returning Tab) ----------------
  {
    id: 'cust-ret-1',
    name: 'Laura Bennett',
    initials: 'LB',
    email: 'laura.bennett@example.com',
    phone: '(214) 555-0132',
    pets: ['Oliver (Cockapoo)', 'Archie (Terrier)'],
    petCount: 2,
    lastVisit: 'Apr 22, 2025',
    lastService: 'Full Groom',
    nextAppointment: 'May 15, 2025',
    nextApptTime: '11:00 AM',
    totalSpent: 1780.00,
    lifetimeValue: 1780.00,
    balance: 0.00,
    statusText: 'Active',
    customerType: 'Regular',
  },
  {
    id: 'cust-ret-2',
    name: 'Ryan Thompson',
    initials: 'RT',
    email: 'ryan.thompson@email.com',
    phone: '(972) 555-0180',
    pets: ['Dexter (Beagle)'],
    petCount: 1,
    lastVisit: 'Apr 16, 2025',
    lastService: 'Bath & Brush',
    nextAppointment: 'May 16, 2025',
    nextApptTime: '2:30 PM',
    totalSpent: 975.00,
    lifetimeValue: 975.00,
    balance: 0.00,
    statusText: 'Active',
    customerType: 'Regular',
  },
  {
    id: 'cust-ret-3',
    name: 'Nicole Anderson',
    initials: 'NA',
    email: 'nicole.anderson@example.com',
    phone: '(469) 555-0141',
    pets: ['Thor (Rottweiler)', 'Loki (Husky)'],
    petCount: 2,
    lastVisit: 'Apr 12, 2025',
    lastService: 'Deluxe Spa',
    nextAppointment: 'May 19, 2025',
    nextApptTime: '9:00 AM',
    totalSpent: 2115.25,
    lifetimeValue: 2115.25,
    balance: 15.00,
    statusText: 'Active',
    customerType: 'VIP',
  },
  {
    id: 'cust-ret-4',
    name: 'Zachary Martin',
    initials: 'ZM',
    email: 'zachary.martin@example.com',
    phone: '(214) 555-0192',
    pets: ['Sammy (Golden Retriever)'],
    petCount: 1,
    lastVisit: 'Apr 8, 2025',
    lastService: 'Full Groom',
    nextAppointment: 'May 21, 2025',
    nextApptTime: '12:00 PM',
    totalSpent: 650.00,
    lifetimeValue: 650.00,
    balance: 0.00,
    statusText: 'Active',
    customerType: 'Regular',
  },
  {
    id: 'cust-ret-5',
    name: 'Jessica Parker',
    initials: 'JP',
    email: 'jessica.parker@email.com',
    phone: '(972) 555-0120',
    pets: ['Hazel (Dachshund)'],
    petCount: 1,
    lastVisit: 'Apr 5, 2025',
    lastService: 'Bath & Brush',
    nextAppointment: 'May 22, 2025',
    nextApptTime: '3:30 PM',
    totalSpent: 430.00,
    lifetimeValue: 430.00,
    balance: 0.00,
    statusText: 'Active',
    customerType: 'Regular',
  },

  // ---------------- INACTIVE CUSTOMERS (Inactive Tab) ----------------
  {
    id: 'cust-inact-1',
    name: 'Matthew Harris',
    initials: 'MH',
    email: 'mharris@email.com',
    phone: '(214) 555-0193',
    pets: ['Winston (Bulldog)'],
    petCount: 1,
    lastVisit: 'Nov 18, 2024',
    lastService: 'Full Groom',
    inactiveDuration: '6+ months ago',
    nextAppointment: '—',
    totalSpent: 420.00,
    lifetimeValue: 420.00,
    balance: 0.00,
    statusText: 'Inactive',
  },
  {
    id: 'cust-inact-2',
    name: 'Samantha Brown',
    initials: 'SB',
    email: 'samantha.brown@email.com',
    phone: '(972) 555-0118',
    pets: ['Mocha (Labradoodle)'],
    petCount: 1,
    lastVisit: 'Oct 5, 2024',
    lastService: 'Bath & Brush',
    inactiveDuration: '7+ months ago',
    nextAppointment: '—',
    totalSpent: 310.00,
    lifetimeValue: 310.00,
    balance: 0.00,
    statusText: 'Inactive',
  },
  {
    id: 'cust-inact-3',
    name: 'Daniel Garcia',
    initials: 'DG',
    email: 'daniel.garcia@email.com',
    phone: '(469) 555-0187',
    pets: ['Duke (German Shepherd)', 'Baron (Shepherd)'],
    petCount: 2,
    lastVisit: 'Sep 28, 2024',
    lastService: 'Full Groom',
    inactiveDuration: '8+ months ago',
    nextAppointment: '—',
    totalSpent: 715.00,
    lifetimeValue: 715.00,
    balance: 0.00,
    statusText: 'Inactive',
  },
  {
    id: 'cust-inact-4',
    name: 'Melissa Clark',
    initials: 'MC',
    email: 'melissa.clark@email.com',
    phone: '(972) 555-0103',
    pets: ['Gigi (Bichon)'],
    petCount: 1,
    lastVisit: 'Aug 21, 2024',
    lastService: 'Deluxe Spa',
    inactiveDuration: '9+ months ago',
    nextAppointment: '—',
    totalSpent: 1050.00,
    lifetimeValue: 1050.00,
    balance: 5.00,
    statusText: 'Inactive',
  },
  {
    id: 'cust-inact-5',
    name: 'Brian Lee',
    initials: 'BL',
    email: 'brian.lee@email.com',
    phone: '(214) 555-0144',
    pets: ['Scout (Terrier)'],
    petCount: 1,
    lastVisit: 'Jul 15, 2024',
    lastService: 'Bath & Brush',
    inactiveDuration: '10+ months ago',
    nextAppointment: '—',
    totalSpent: 265.00,
    lifetimeValue: 265.00,
    balance: 0.00,
    statusText: 'Inactive',
  },

  // ---------------- NEEDS FOLLOW-UP (Needs Follow-up Tab) ----------------
  {
    id: 'cust-fol-1',
    name: 'Angela Johnson',
    initials: 'AJ',
    email: 'angela.johnson@email.com',
    phone: '(214) 555-0132',
    pets: ['Jax (Pitbull Mix)'],
    petCount: 1,
    lastVisit: 'Mar 14, 2025',
    lastService: 'Full Groom',
    nextAppointment: '—',
    followupReason: 'No recent appt',
    followupUrgency: 'amber',
    balance: 0.00,
    statusText: 'Active',
  },
  {
    id: 'cust-fol-2',
    name: 'Thomas Miller',
    initials: 'TM',
    email: 'thomas.miller@email.com',
    phone: '(972) 555-0147',
    pets: ['Barnaby (Basset Hound)'],
    petCount: 1,
    lastVisit: 'Mar 2, 2025',
    lastService: 'Bath & Brush',
    nextAppointment: '—',
    followupReason: 'Overdue by 45+ days',
    followupUrgency: 'rose',
    balance: 0.00,
    statusText: 'Active',
  },
  {
    id: 'cust-fol-3',
    name: 'Brittany Lopez',
    initials: 'BL',
    email: 'brittany.lopez@email.com',
    phone: '(469) 555-0181',
    pets: ['Chico (Chihuahua)', 'Peanut (Yorkie)'],
    petCount: 2,
    lastVisit: 'Feb 21, 2025',
    lastService: 'Full Groom',
    nextAppointment: '—',
    followupReason: 'No recent appt',
    followupUrgency: 'amber',
    balance: 15.00,
    statusText: 'Active',
  },
  {
    id: 'cust-fol-4',
    name: 'Kevin Young',
    initials: 'KY',
    email: 'kevin.young@email.com',
    phone: '(214) 555-0159',
    pets: ['Chester (Golden Retriever)'],
    petCount: 1,
    lastVisit: 'Feb 10, 2025',
    lastService: 'Deluxe Spa',
    nextAppointment: '—',
    followupReason: 'Overdue by 30+ days',
    followupUrgency: 'amber',
    balance: 0.00,
    statusText: 'Active',
  },
  {
    id: 'cust-fol-5',
    name: 'Monica Patel',
    initials: 'MP',
    email: 'monica.patel@email.com',
    phone: '(972) 555-0173',
    pets: ['Simba (Pomeranian)'],
    petCount: 1,
    lastVisit: 'Jan 28, 2025',
    lastService: 'Bath & Brush',
    nextAppointment: '—',
    followupReason: 'No recent appt',
    followupUrgency: 'amber',
    balance: 0.00,
    statusText: 'Active',
  },

  // ---------------- UPCOMING (Upcoming Tab) ----------------
  {
    id: 'cust-up-1',
    name: 'Ashley Rivera',
    initials: 'AR',
    email: 'ashley.rivera@gmail.com',
    phone: '(214) 555-0193',
    pets: ['Brodie (Aussie)'],
    petCount: 1,
    lastVisit: 'Apr 02, 2025',
    lastService: 'Full Groom',
    nextAppointment: 'May 14, 2025',
    nextApptTime: '9:00 AM',
    assignedStaff: 'Jessica',
    totalSpent: 350.00,
    lifetimeValue: 350.00,
    balance: 0.00,
    statusText: 'Active',
  },
  {
    id: 'cust-up-2',
    name: 'Daniel Kim',
    initials: 'DK',
    email: 'daniel.kim@gmail.com',
    phone: '(972) 555-0187',
    pets: ['Kona (Corgi)'],
    petCount: 1,
    lastVisit: 'Apr 14, 2025',
    lastService: 'Bath & Brush',
    nextAppointment: 'May 14, 2025',
    nextApptTime: '11:30 AM',
    assignedStaff: 'Michael',
    totalSpent: 420.00,
    lifetimeValue: 420.00,
    balance: 0.00,
    statusText: 'Active',
  },
  {
    id: 'cust-up-3',
    name: 'Lauren Mitchell',
    initials: 'LM',
    email: 'lauren.mitchell@gmail.com',
    phone: '(972) 555-0161',
    pets: ['Bailey (Labrador)', 'Finn (Doodle)'],
    petCount: 2,
    lastVisit: 'Apr 11, 2025',
    lastService: 'Deluxe Spa',
    nextAppointment: 'May 14, 2025',
    nextApptTime: '2:00 PM',
    assignedStaff: 'Jessica',
    totalSpent: 890.00,
    lifetimeValue: 910.00,
    balance: 20.00,
    statusText: 'Active',
  },
  {
    id: 'cust-up-4',
    name: 'Chris Evans',
    initials: 'CE',
    email: 'chris.evans@gmail.com',
    phone: '(469) 555-0177',
    pets: ['Dodger (Boxer Mix)'],
    petCount: 1,
    lastVisit: 'Apr 05, 2025',
    lastService: 'Full Groom',
    nextAppointment: 'May 15, 2025',
    nextApptTime: '10:00 AM',
    assignedStaff: 'Sarah',
    totalSpent: 620.00,
    lifetimeValue: 620.00,
    balance: 0.00,
    statusText: 'Active',
  },
  {
    id: 'cust-up-5',
    name: 'Megan Scott',
    initials: 'MS',
    email: 'megan.scott@gmail.com',
    phone: '(972) 555-0183',
    pets: ['Gus (Frenchie)'],
    petCount: 1,
    lastVisit: 'Apr 08, 2025',
    lastService: 'Bath & Brush',
    nextAppointment: 'May 16, 2025',
    nextApptTime: '1:00 PM',
    assignedStaff: 'Michael',
    totalSpent: 510.00,
    lifetimeValue: 510.00,
    balance: 0.00,
    statusText: 'Active',
  },
];

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  onAddCustomer,
  onOpenNewAppointment,
  onOpenAddPet,
  onOpenTakePayment,
  onOpenIntake,
}) => {
  // Navigation State: Directory landing vs. Full profile view
  const [viewMode, setViewMode] = useState<'directory' | 'detail'>('directory');
  const [selectedProfile, setSelectedProfile] = useState<CustomerFullProfile>(SARAH_JOHNSON_PROFILE);
  
  // Quick View Rail (Right side drawer) - Closed by default on entry
  const [selectedCustomerForRail, setSelectedCustomerForRail] = useState<ExtendedCustomerRecord | null>(null);
  const [isRailOpen, setIsRailOpen] = useState(false);
  const [railActiveTab, setRailActiveTab] = useState<'overview' | 'pets' | 'appointments' | 'history' | 'payments'>('overview');

  // Unified Global Quick Actions Modal State
  const [isQuickActionsModalOpen, setIsQuickActionsModalOpen] = useState(false);
  const [activeQuickActionSubView, setActiveQuickActionSubView] = useState<
    'new-appointment' | 'add-pet' | 'take-payment' | 'send-message' | 'add-note' | 'update-documents' | null
  >(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Live Supabase Customers State
  const [liveDbCustomers, setLiveDbCustomers] = useState<ExtendedCustomerRecord[]>([]);
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [newCustForm, setNewCustForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: 'Memphis',
    state: 'TN',
    postalCode: '38141',
    petName: '',
    petBreed: 'Yorkshire Terrier',
    petWeight: '12 lbs',
    petGender: 'Male',
    petNotes: '',
  });

  const fetchLiveCustomers = () => {
    fetch('/api/customers')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.customers || !Array.isArray(data.customers) || data.customers.length === 0) return;
        const mapped: ExtendedCustomerRecord[] = data.customers.map((c: any) => {
          const petNames = c.pets || [];
          const petDetails = c.petDetails || [];
          return {
            id: c.id,
            name: c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.email || 'Customer',
            initials: (c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'CU').substring(0, 2).toUpperCase(),
            email: c.email || '',
            phone: c.phone || '—',
            address: c.address ? `${c.address}${c.city ? `, ${c.city}` : ''}${c.state ? `, ${c.state}` : ''} ${c.postalCode || ''}` : 'Memphis, TN',
            pets: petNames.length > 0 ? petNames : (petDetails.length > 0 ? petDetails.map((d: any) => d.name) : ['No pets registered yet']),
            petCount: petDetails.length || petNames.length,
            petPhotos: petDetails.map((d: any) => d.photoUrl).filter(Boolean),
            petDetails: petDetails,
            avatarUrl: c.avatarUrl || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80`,
            preferredGroomer: c.preferredGroomer || 'Sarah Mitchell',
            lastVisit: c.lastVisit || 'No visits yet',
            lastService: c.lastService || 'Full Groom',
            nextAppointment: c.nextAppointment || undefined,
            nextApptTime: c.nextApptTime || undefined,
            totalSpent: c.totalSpent || 0,
            lifetimeValue: c.totalSpent || 0,
            balance: 0,
            statusText: c.customerStatus === 'ACTIVE' ? 'Active' : (c.customerStatus || 'Active'),
            customerType: 'VIP Member',
            preferredContact: 'Text / Email',
            program: 'Regular Grooming',
            referredBy: 'Client Referral',
            notes: c.notes || '',
            customerSince: c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '2026',
            loyaltyPoints: Math.floor((c.totalSpent || 0) / 2),
            cardBrand: 'VISA',
            cardLast4: '4242',
            cardExpiry: '12/28',
            assignedStaff: 'Sarah Mitchell',
            isLiveDb: true,
          };
        });
        setLiveDbCustomers(mapped);
      })
      .catch((err) => {
        console.log('Using local cached customer profiles:', err);
      });
  };

  React.useEffect(() => {
    let isMounted = true;
    fetch('/api/customers')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted || !data?.customers || !Array.isArray(data.customers) || data.customers.length === 0) return;
        const mapped: ExtendedCustomerRecord[] = data.customers.map((c: any) => {
          const petNames = c.pets || [];
          const petDetails = c.petDetails || [];
          return {
            id: c.id,
            name: c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.email || 'Customer',
            initials: (c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'CU').substring(0, 2).toUpperCase(),
            email: c.email || '',
            phone: c.phone || '—',
            address: c.address ? `${c.address}${c.city ? `, ${c.city}` : ''}${c.state ? `, ${c.state}` : ''} ${c.postalCode || ''}` : 'Memphis, TN',
            pets: petNames.length > 0 ? petNames : (petDetails.length > 0 ? petDetails.map((d: any) => d.name) : ['No pets registered yet']),
            petCount: petDetails.length || petNames.length,
            petPhotos: petDetails.map((d: any) => d.photoUrl).filter(Boolean),
            petDetails: petDetails,
            avatarUrl: c.avatarUrl || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80`,
            preferredGroomer: c.preferredGroomer || 'Sarah Mitchell',
            lastVisit: c.lastVisit || 'No visits yet',
            lastService: c.lastService || 'Full Groom',
            nextAppointment: c.nextAppointment || undefined,
            nextApptTime: c.nextApptTime || undefined,
            totalSpent: c.totalSpent || 0,
            lifetimeValue: c.totalSpent || 0,
            balance: 0,
            statusText: c.customerStatus === 'ACTIVE' ? 'Active' : (c.customerStatus || 'Active'),
            customerType: 'VIP Member',
            preferredContact: 'Text / Email',
            program: 'Regular Grooming',
            referredBy: 'Client Referral',
            notes: c.notes || '',
            customerSince: c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '2026',
            loyaltyPoints: Math.floor((c.totalSpent || 0) / 2),
            cardBrand: 'VISA',
            cardLast4: '4242',
            cardExpiry: '12/28',
            assignedStaff: 'Sarah Mitchell',
            isLiveDb: true,
          };
        });
        if (isMounted) {
          setLiveDbCustomers(mapped);
        }
      })
      .catch((err) => {
        console.log('Using local cached customer profiles:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Directory filter states
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('active');
  const [locationFilter, setLocationFilter] = useState('All Locations');
  const [typeFilter, setTypeFilter] = useState('All Customer Types');
  const [staffFilter, setStaffFilter] = useState('All Staff');

  // Real-time Supabase search querying
  React.useEffect(() => {
    if (!search.trim()) return;
    const timer = setTimeout(() => {
      fetch(`/api/customers?search=${encodeURIComponent(search.trim())}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!data?.customers || !Array.isArray(data.customers) || data.customers.length === 0) return;
          const mapped: ExtendedCustomerRecord[] = data.customers.map((c: any) => {
            const petNames = c.pets || [];
            const petDetails = c.petDetails || [];
            return {
              id: c.id,
              name: c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.email || 'Customer',
              initials: (c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'CU').substring(0, 2).toUpperCase(),
              email: c.email || '',
              phone: c.phone || '—',
              address: c.address ? `${c.address}${c.city ? `, ${c.city}` : ''}${c.state ? `, ${c.state}` : ''} ${c.postalCode || ''}` : 'Memphis, TN',
              pets: petNames.length > 0 ? petNames : (petDetails.length > 0 ? petDetails.map((d: any) => d.name) : ['No pets registered yet']),
              petCount: petDetails.length || petNames.length,
              petPhotos: petDetails.map((d: any) => d.photoUrl).filter(Boolean),
              petDetails: petDetails,
              avatarUrl: c.avatarUrl || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80`,
              preferredGroomer: c.preferredGroomer || 'Sarah Mitchell',
              lastVisit: c.lastVisit || 'No visits yet',
              lastService: c.lastService || 'Full Groom',
              nextAppointment: c.nextAppointment || undefined,
              nextApptTime: c.nextApptTime || undefined,
              totalSpent: c.totalSpent || 0,
              lifetimeValue: c.totalSpent || 0,
              balance: 0,
              statusText: c.customerStatus === 'ACTIVE' ? 'Active' : (c.customerStatus || 'Active'),
              customerType: 'VIP Member',
              preferredContact: 'Text / Email',
              program: 'Regular Grooming',
              referredBy: 'Client Referral',
              notes: c.notes || '',
              customerSince: c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '2026',
              loyaltyPoints: Math.floor((c.totalSpent || 0) / 2),
              cardBrand: 'VISA',
              cardLast4: '4242',
              cardExpiry: '12/28',
              assignedStaff: 'Sarah Mitchell',
              isLiveDb: true,
            };
          });
          setLiveDbCustomers((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const newFound = mapped.filter((m) => !existingIds.has(m.id));
            return [...newFound, ...prev];
          });
        })
        .catch(console.error);
    }, 250);

    return () => clearTimeout(timer);
  }, [search]);

  // Merge live Supabase customers with rich design presets (avoiding duplicate emails)
  const allList: ExtendedCustomerRecord[] = React.useMemo(() => {
    if (liveDbCustomers.length === 0) return EXTENDED_MOCK_CUSTOMERS;
    const liveEmails = new Set(liveDbCustomers.map(c => c.email.toLowerCase()));
    const nonDuplicatedMock = EXTENDED_MOCK_CUSTOMERS.filter(m => !liveEmails.has(m.email.toLowerCase()));
    return [...liveDbCustomers, ...nonDuplicatedMock];
  }, [liveDbCustomers]);

  // Dynamic calculated metrics across all customers
  const metrics = React.useMemo(() => {
    const total = allList.length;
    const active = allList.filter((c) => c.statusText === 'Active' || c.isLiveDb).length;
    const newCount = allList.filter((c) => c.id.startsWith('cust-new-') || c.customerSince?.includes('2026') || c.customerSince?.includes('2025')).length;
    const returning = allList.filter((c) => (c.lifetimeValue || 0) >= 400 || c.id.startsWith('cust-ret-')).length;
    const inactive = allList.filter((c) => c.statusText === 'Inactive' || c.id.startsWith('cust-inact-')).length;
    const followup = allList.filter((c) => !!c.followupReason || c.id.startsWith('cust-fol-')).length;
    const upcoming = allList.filter((c) => (c.nextAppointment && c.nextAppointment !== '—') || c.id.startsWith('cust-up-')).length;
    return { total, active, newCount, returning, inactive, followup, upcoming };
  }, [allList]);

  // Handle saving new customer to Supabase and updating state
  const handleSaveNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustForm.firstName.trim() || !newCustForm.email.trim()) {
      showToast('First name and email are required');
      return;
    }
    setIsSavingCustomer(true);
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: newCustForm.firstName.trim(),
          lastName: newCustForm.lastName.trim(),
          email: newCustForm.email.trim(),
          phone: newCustForm.phone.trim(),
          address: newCustForm.address.trim(),
          city: newCustForm.city.trim(),
          state: newCustForm.state.trim(),
          postalCode: newCustForm.postalCode.trim(),
        }),
      });
      const data = await res.json();
      const custId = data?.customer?.id || `cust-db-${Date.now()}`;

      // If pet name was entered, persist to /api/dogs
      let dogPhoto = 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=400&q=80';
      if (newCustForm.petName.trim()) {
        const dogRes = await fetch('/api/dogs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId: custId,
            name: newCustForm.petName.trim(),
            breed: newCustForm.petBreed.trim() || 'Mixed Breed',
            weight: newCustForm.petWeight,
            sex: newCustForm.petGender,
            notes: newCustForm.petNotes,
          }),
        });
        const dogData = await dogRes.json();
        if (dogData?.photoUrl) dogPhoto = dogData.photoUrl;
      }

      const createdRecord: ExtendedCustomerRecord = {
        id: custId,
        name: `${newCustForm.firstName} ${newCustForm.lastName}`.trim(),
        initials: `${newCustForm.firstName.substring(0, 1)}${newCustForm.lastName.substring(0, 1)}`.toUpperCase(),
        email: newCustForm.email.trim(),
        phone: newCustForm.phone.trim() || '—',
        address: `${newCustForm.address.trim()}, ${newCustForm.city.trim()}, ${newCustForm.state.trim()} ${newCustForm.postalCode.trim()}`,
        pets: newCustForm.petName.trim() ? [`${newCustForm.petName.trim()} (${newCustForm.petBreed.trim() || 'Dog'})`] : ['No pets registered'],
        petCount: newCustForm.petName.trim() ? 1 : 0,
        petPhotos: [dogPhoto],
        petDetails: newCustForm.petName.trim() ? [{
          id: `dog-${Date.now()}`,
          name: newCustForm.petName.trim(),
          breed: newCustForm.petBreed.trim(),
          weight: newCustForm.petWeight,
          sex: newCustForm.petGender,
          photoUrl: dogPhoto,
          specialHandling: newCustForm.petNotes,
        }] : [],
        avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80`,
        preferredGroomer: 'Sarah Mitchell',
        lastVisit: 'First Visit Pending',
        lastService: 'Full Groom',
        totalSpent: 0,
        lifetimeValue: 0,
        balance: 0,
        statusText: 'Active',
        customerType: 'New Client',
        preferredContact: 'Text / Email',
        customerSince: 'Today',
        isLiveDb: true,
        cardBrand: 'VISA',
        cardLast4: '4242',
        cardExpiry: '12/28',
        assignedStaff: 'Sarah Mitchell',
      };

      setLiveDbCustomers((prev) => [createdRecord, ...prev]);
      setSelectedCustomerForRail(createdRecord);
      setIsRailOpen(true);
      setIsNewCustomerModalOpen(false);
      showToast(`✓ Customer ${createdRecord.name} & pet saved to Supabase!`);
      setNewCustForm({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        city: 'Memphis',
        state: 'TN',
        postalCode: '38141',
        petName: '',
        petBreed: 'Yorkshire Terrier',
        petWeight: '12 lbs',
        petGender: 'Male',
        petNotes: '',
      });
    } catch (err: any) {
      showToast(`Error saving customer: ${err.message}`);
    } finally {
      setIsSavingCustomer(false);
    }
  };

  const filtered = allList.filter((c) => {
    // 1. Search query filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = c.name?.toLowerCase().includes(q);
      const matchEmail = c.email?.toLowerCase().includes(q);
      const matchPhone = c.phone?.includes(q);
      const matchAddress = c.address?.toLowerCase().includes(q);
      const matchPet = c.pets?.some((p) => p.toLowerCase().includes(q));
      if (!matchName && !matchEmail && !matchPhone && !matchAddress && !matchPet) return false;
    }

    // 2. Tab filters
    if (activeTab === 'all') {
      return true;
    }
    if (activeTab === 'active') {
      return (c.statusText === 'Active' || c.isLiveDb) && !c.id.startsWith('cust-fol-') && !c.id.startsWith('cust-up-');
    }
    if (activeTab === 'new') {
      return c.id.startsWith('cust-new-') || c.lastVisit?.includes('First Visit') || c.customerSince?.includes('2026') || c.customerSince?.includes('2025');
    }
    if (activeTab === 'returning') {
      return c.id.startsWith('cust-ret-') || (c.lifetimeValue || 0) >= 400;
    }
    if (activeTab === 'inactive') {
      return c.statusText === 'Inactive' || c.id.startsWith('cust-inact-');
    }
    if (activeTab === 'followup') {
      return c.id.startsWith('cust-fol-') || !!c.followupReason;
    }
    if (activeTab === 'upcoming') {
      return c.id.startsWith('cust-up-') || (c.nextAppointment && c.nextAppointment !== '—');
    }
    if (activeTab === 'outstanding') {
      return (c.balance || 0) > 0;
    }

    return true;
  });

  // Open Full Profile View
  const handleOpenFullProfile = (cust: ExtendedCustomerRecord) => {
    if (cust.id === 'cust-1' && !cust.isLiveDb) {
      setSelectedProfile(SARAH_JOHNSON_PROFILE);
    } else {
      const customerPets = (cust.petDetails && cust.petDetails.length > 0)
        ? cust.petDetails.map((d: any, i: number) => ({
            id: d.id || `pet-${i}`,
            name: d.name || 'Pet',
            breed: d.breed || d.breedName || 'Yorkshire Terrier',
            gender: (d.sex || 'Female') as 'Male' | 'Female',
            age: d.age || '2 yrs',
            birthDate: d.birthDate || 'Mar 14, 2024',
            weight: d.weight || d.weightLbs || '7 lbs',
            imageUrl: d.photoUrl || (cust.petPhotos && cust.petPhotos[i]) || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=400&q=80',
            isPrimary: i === 0,
            vaccinationsStatus: 'Up to date',
            medicalAlert: d.specialHandling || 'No Known Allergies',
            lastGroomDate: cust.lastVisit || 'Sep 10, 2026',
            nextApptDate: cust.nextAppointment && cust.nextAppointment !== '—' ? cust.nextAppointment : 'Sep 18, 2026',
            nextApptType: cust.lastService || 'Bath & Brush',
          }))
        : cust.pets.map((p, i) => ({
            id: `pet-${i}`,
            name: p.replace(/\s*\([^)]*\)/, ''),
            breed: p.includes('(') ? p.replace(/.*\(([^)]+)\).*/, '$1') : (i === 0 ? 'Golden Retriever' : 'Poodle'),
            gender: (i === 0 ? 'Male' : 'Female') as 'Male' | 'Female',
            age: `${i + 2} yrs`,
            birthDate: 'Mar 14, 2024',
            weight: i === 0 ? '55 lbs' : '22 lbs',
            imageUrl: cust.petPhotos && cust.petPhotos[i] ? cust.petPhotos[i] : 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=400&q=80',
            isPrimary: i === 0,
            vaccinationsStatus: 'Up to date',
            medicalAlert: i === 0 ? 'No Known Allergies' : 'Sensitive Skin',
            lastGroomDate: cust.lastVisit || 'Aug 20, 2026',
            nextApptDate: cust.nextAppointment && cust.nextAppointment !== '—' ? cust.nextAppointment : 'Sep 18, 2026',
            nextApptType: cust.lastService || 'Full Groom',
          }));

      setSelectedProfile({
        id: cust.id,
        name: cust.name,
        status: (cust.statusText === 'Active' ? 'Active Customer' : 'Inactive Customer'),
        phone: cust.phone,
        email: cust.email,
        address: cust.address || '4746 Barkshire Dr, Memphis, Tennessee 38141',
        lifetimeValue: cust.lifetimeValue || cust.totalSpent || 95,
        totalSpent: cust.totalSpent || 95,
        outstandingBalance: cust.balance || 0.0,
        loyaltyPoints: cust.loyaltyPoints || Math.floor((cust.totalSpent || 95) / 5),
        customerSince: cust.customerSince || 'Sep 2026',
        defaultPaymentMethod: {
          cardBrand: cust.cardBrand || 'VISA',
          last4: cust.cardLast4 || '4242',
          expires: cust.cardExpiry || '12/28',
        },
        pets: customerPets,
        upcomingAppointments: [
          {
            id: 'appt-supa-1',
            date: cust.nextAppointment || 'Sep 18, 2026',
            time: cust.nextApptTime || '1:30 PM',
            service: cust.lastService || 'Bath & Brush',
            petName: customerPets[0]?.name || 'RANDY',
            groomer: cust.preferredGroomer || 'Sarah Mitchell',
            price: 95.0,
            status: 'Confirmed',
          }
        ],
        paymentHistory: [
          {
            id: 'pay-supa-1',
            invoiceNumber: 'INV-2026-001',
            date: 'Sep 10, 2026',
            amount: 95.0,
            method: 'Visa •••• 4242',
            status: 'Paid',
            service: 'Bath & Brush',
            petName: customerPets[0]?.name || 'RANDY',
          }
        ],
        recentActivity: [
          {
            id: 'act-1',
            type: 'appointment',
            title: 'Appointment Booked',
            description: `Scheduled Bath & Brush for ${customerPets[0]?.name || 'Pet'}`,
            timestamp: 'Recent',
          }
        ],
        communication: [
          {
            id: 'comm-1',
            type: 'sms',
            sender: 'Sarah Mitchell',
            recipient: cust.name,
            timestamp: 'Today 10:15 AM',
            content: `Hi ${cust.name.split(' ')[0]}, looking forward to seeing ${customerPets[0]?.name || 'your pup'} for grooming!`,
            direction: 'outbound',
          }
        ],
      });
    }
    setViewMode('detail');
  };

  // Click on row selects the customer into the Quick View Rail
  const handleRowClick = (cust: ExtendedCustomerRecord) => {
    setSelectedCustomerForRail(cust);
    setIsRailOpen(true);
  };

  // Handler for actions from the Unified Quick Actions Modal
  const handleUnifiedQuickAction = (action: UnifiedQuickActionType) => {
    setIsQuickActionsModalOpen(false);
    if (action === 'new-appointment') {
      setActiveQuickActionSubView('new-appointment');
    } else if (action === 'add-pet') {
      setActiveQuickActionSubView('add-pet');
    } else if (action === 'take-payment') {
      setActiveQuickActionSubView('take-payment');
    } else if (action === 'send-message') {
      setActiveQuickActionSubView('send-message');
    } else if (action === 'add-note') {
      setActiveQuickActionSubView('add-note');
    } else if (action === 'update-documents') {
      setActiveQuickActionSubView('update-documents');
    } else if (action === 'view-customer') {
      if (selectedCustomerForRail) {
        handleOpenFullProfile(selectedCustomerForRail);
      } else {
        handleOpenFullProfile(EXTENDED_MOCK_CUSTOMERS[0]);
      }
    } else if (action === 'call-customer') {
      const targetPhone = selectedCustomerForRail?.phone || '(214) 555-0198';
      showToast(`Initiating direct call to ${targetPhone}...`);
    } else if (action === 'create-invoice') {
      showToast('Billing invoice drafted and ready for review.');
    } else if (action === 'issue-refund') {
      showToast('Opening refund & chargeback portal...');
    } else if (action === 'payment-history') {
      showToast('Loading full ledger and receipts history...');
    } else if (action === 'add-custom-action') {
      showToast('Custom quick action wizard opened.');
    } else if (action === 'waitlist') {
      showToast('Customer queued on opening waitlist.');
    } else if (action === 'confirm-appointment') {
      showToast('Appointment confirmation sent to customer.');
    } else if (action === 'send-reminder') {
      showToast('SMS & email reminders dispatched.');
    } else if (action === 'follow-up') {
      showToast('Post-groom follow up logged.');
    } else {
      showToast(`Action "${action}" processed successfully.`);
    }
  };

  // Dedicated Active Quick Action Sub-Views
  if (activeQuickActionSubView) {
    const activeCustProfile = selectedCustomerForRail
      ? {
          id: selectedCustomerForRail.id,
          name: selectedCustomerForRail.name,
          email: selectedCustomerForRail.email,
          phone: selectedCustomerForRail.phone,
          status: 'Active Customer',
          address: selectedCustomerForRail.address || '1234 Maple Drive, Frisco, TX 75034',
          lifetimeValue: selectedCustomerForRail.lifetimeValue || 1245.50,
          totalSpent: selectedCustomerForRail.totalSpent || 1095.50,
          outstandingBalance: selectedCustomerForRail.balance || 0.0,
          loyaltyPoints: selectedCustomerForRail.loyaltyPoints || 245,
          customerSince: selectedCustomerForRail.customerSince || 'Apr 12, 2023',
          defaultPaymentMethod: {
            cardBrand: selectedCustomerForRail.cardBrand || 'VISA',
            last4: selectedCustomerForRail.cardLast4 || '4242',
            expires: selectedCustomerForRail.cardExpiry || '04/27',
          },
          pets: SARAH_JOHNSON_PROFILE.pets,
          upcomingAppointments: SARAH_JOHNSON_PROFILE.upcomingAppointments,
          paymentHistory: SARAH_JOHNSON_PROFILE.paymentHistory,
          recentActivity: SARAH_JOHNSON_PROFILE.recentActivity,
          communication: SARAH_JOHNSON_PROFILE.communication,
        }
      : SARAH_JOHNSON_PROFILE;

    return (
      <div className="flex-1 flex flex-col min-h-screen bg-muted/40">
        {toastMessage && (
          <div className="fixed top-4 right-4 z-50 bg-card text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2.5 text-[13px] font-semibold animate-in fade-in slide-in-from-top-3">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <span>{toastMessage}</span>
          </div>
        )}

        {activeQuickActionSubView === 'take-payment' && (
          <QuickActionTakePaymentView
            customer={activeCustProfile}
            onCancel={() => setActiveQuickActionSubView(null)}
            onSuccess={(msg) => {
              setActiveQuickActionSubView(null);
              showToast(msg);
            }}
          />
        )}

        {activeQuickActionSubView === 'new-appointment' && (
          <QuickActionNewAppointmentView
            customer={activeCustProfile}
            onCancel={() => setActiveQuickActionSubView(null)}
            onSuccess={(msg) => {
              setActiveQuickActionSubView(null);
              showToast(msg);
            }}
          />
        )}

        {activeQuickActionSubView === 'add-pet' && (
          <QuickActionAddPetView
            customer={activeCustProfile}
            onCancel={() => setActiveQuickActionSubView(null)}
            onSuccess={(msg) => {
              setActiveQuickActionSubView(null);
              showToast(msg);
            }}
          />
        )}

        {activeQuickActionSubView === 'send-message' && (
          <QuickActionSendMessageView
            customer={activeCustProfile}
            onCancel={() => setActiveQuickActionSubView(null)}
            onSuccess={(msg) => {
              setActiveQuickActionSubView(null);
              showToast(msg);
            }}
          />
        )}

        {activeQuickActionSubView === 'add-note' && (
          <QuickActionAddNoteView
            customer={activeCustProfile}
            onCancel={() => setActiveQuickActionSubView(null)}
            onSuccess={(msg) => {
              setActiveQuickActionSubView(null);
              showToast(msg);
            }}
          />
        )}

        {activeQuickActionSubView === 'update-documents' && (
          <QuickActionUpdateDocumentsView
            customer={activeCustProfile}
            onCancel={() => setActiveQuickActionSubView(null)}
            onSuccess={(msg) => {
              setActiveQuickActionSubView(null);
              showToast(msg);
            }}
          />
        )}
      </div>
    );
  }

  // If in full profile mode, render existing CustomerDetailsView
  if (viewMode === 'detail') {
    return (
      <div className="space-y-4">
        <div className="px-4 sm:px-8 pt-4 flex items-center justify-between">
          <button
            onClick={() => setViewMode('directory')}
            className="text-[13px] font-semibold text-primary hover:text-primary flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" />
            <span>&larr; Back to Customer Directory</span>
          </button>

          <div className="text-[11px] text-muted-foreground/70 font-medium">
            Viewing Profile: <strong className="text-foreground">{selectedProfile.name}</strong>
          </div>
        </div>

        <CustomerDetailsView
          customerProfile={selectedProfile}
          onBackToDirectory={() => setViewMode('directory')}
          onOpenNewAppointment={() => setActiveQuickActionSubView('new-appointment')}
          onOpenAddPet={() => setActiveQuickActionSubView('add-pet')}
          onOpenTakePayment={() => setActiveQuickActionSubView('take-payment')}
          onOpenIntake={onOpenIntake}
        />
      </div>
    );
  }

  const activeCustomer = selectedCustomerForRail || EXTENDED_MOCK_CUSTOMERS[0];

  return (
    <div className="flex h-full min-h-[calc(100vh-56px)] overflow-hidden bg-background text-foreground antialiased font-sans text-[13px]">
      {/* Toast banner */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-card text-foreground px-4 py-2.5 border border-border rounded-md shadow-popover flex items-center gap-2.5 text-[13px] font-medium animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-success" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Global Quick Actions Modal */}
      <QuickActionsModal
        isOpen={isQuickActionsModalOpen}
        onClose={() => setIsQuickActionsModalOpen(false)}
        onSelectAction={handleUnifiedQuickAction}
        customer={activeCustomer ? {
          ...SARAH_JOHNSON_PROFILE,
          name: activeCustomer.name,
          email: activeCustomer.email,
          phone: activeCustomer.phone,
        } : null}
      />

      {/* ================= CENTER CUSTOMER MANAGEMENT DIRECTORY ================= */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto bg-background custom-scrollbar">

        {/* Page header — polished enterprise chrome */}
        <PageHeader
          contextLabel="Customers"
          statusItems={[
            { label: "Total:", value: `${metrics.total.toLocaleString()}` },
            { label: "Active:", value: `${metrics.active.toLocaleString()}`, tone: "success" },
            { label: "At Risk:", value: `${metrics.followup.toLocaleString()}`, tone: "warning" },
          ]}
          title="Customers"
          badge={`${metrics.total.toLocaleString()} Total`}
          description="Manage client profiles, pet records, visit history, and outstanding balances across all locations."
          actions={
            <>
              <button
                type="button"
                onClick={() => {
                  fetchLiveCustomers();
                  showToast('Refreshed customer directory from Supabase.');
                }}
                className="size-9 rounded-md border border-border bg-background hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                title="Refresh Customer Directory"
                aria-label="Refresh customers"
              >
                <RotateCw className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsQuickActionsModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 text-[12px] font-medium text-foreground transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Zap className="size-3.5 text-quick" />
                <span>Quick Actions</span>
              </button>
              <button
                onClick={() => {
                  if (onOpenNewAppointment) {
                    onOpenNewAppointment();
                  } else {
                    setActiveQuickActionSubView('new-appointment');
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 text-[12px] font-medium text-foreground transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                type="button"
              >
                <CalendarPlus className="size-3.5" />
                <span>Book Appointment</span>
              </button>
              <button
                onClick={() => setIsNewCustomerModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3.5 text-[13px] font-medium shadow-card transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                type="button"
              >
                <Plus className="size-4" />
                <span>New Customer</span>
              </button>
            </>
          }
        />

        {/* Content Container */}
        <div className="p-6 space-y-6">

          {/* 1. KPI Tiles Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            {/* Total Customers */}
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={cn(
                "p-4 rounded-xl border flex flex-col justify-between bg-card text-left transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                activeTab === 'all'
                  ? "border-primary shadow-card-md ring-1 ring-primary/20"
                  : "border-border shadow-card hover:-translate-y-0.5 hover:shadow-card-md hover:border-primary/30",
              )}
            >
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Total Customers</span>
              </div>
              <div className="text-2xl font-display font-semibold tracking-tight tabular-nums text-foreground mt-2">{metrics.total.toLocaleString()}</div>
            </button>

            {/* Active Customers */}
            <button
              type="button"
              onClick={() => setActiveTab('active')}
              className={cn(
                "p-4 rounded-xl border flex flex-col justify-between bg-card text-left transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                activeTab === 'active'
                  ? "border-primary shadow-card-md ring-1 ring-primary/20"
                  : "border-border shadow-card hover:-translate-y-0.5 hover:shadow-card-md hover:border-primary/30",
              )}
            >
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Active Customers</span>
              </div>
              <div className="text-2xl font-display font-semibold tracking-tight tabular-nums text-foreground mt-2">{metrics.active.toLocaleString()}</div>
            </button>

            {/* New This Month */}
            <button
              type="button"
              onClick={() => setActiveTab('new')}
              className={cn(
                "p-4 rounded-xl border flex flex-col justify-between bg-card text-left transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                activeTab === 'new'
                  ? "border-primary shadow-card-md ring-1 ring-primary/20"
                  : "border-border shadow-card hover:-translate-y-0.5 hover:shadow-card-md hover:border-primary/30",
              )}
            >
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider">New Customers</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-quick/10 text-quick text-[10px] font-semibold border border-quick/20">+42</span>
              </div>
              <div className="text-2xl font-display font-semibold tracking-tight tabular-nums text-foreground mt-2">{metrics.newCount.toLocaleString()}</div>
            </button>

            {/* Upcoming Appointments */}
            <button
              type="button"
              onClick={() => setActiveTab('upcoming')}
              className={cn(
                "p-4 rounded-xl border flex flex-col justify-between bg-card text-left transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                activeTab === 'upcoming'
                  ? "border-primary shadow-card-md ring-1 ring-primary/20"
                  : "border-border shadow-card hover:-translate-y-0.5 hover:shadow-card-md hover:border-primary/30",
              )}
            >
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Upcoming Appts</span>
              </div>
              <div className="text-2xl font-display font-semibold tracking-tight tabular-nums text-foreground mt-2">{metrics.upcoming.toLocaleString()}</div>
            </button>

            {/* Outstanding Balance */}
            <button
              type="button"
              onClick={() => setActiveTab('outstanding')}
              className={cn(
                "p-4 rounded-xl border flex flex-col justify-between bg-card text-left transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                activeTab === 'outstanding'
                  ? "border-primary shadow-card-md ring-1 ring-primary/20"
                  : "border-border shadow-card hover:-translate-y-0.5 hover:shadow-card-md hover:border-primary/30",
              )}
            >
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Outstanding Bal.</span>
              </div>
              <div className="text-2xl font-display font-semibold tracking-tight tabular-nums text-warning mt-2">$2,450.25</div>
            </button>

            {/* At Risk */}
            <button
              type="button"
              onClick={() => setActiveTab('followup')}
              className={cn(
                "p-4 rounded-xl border flex flex-col justify-between bg-card text-left transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                activeTab === 'followup'
                  ? "border-primary shadow-card-md ring-1 ring-primary/20"
                  : "border-border shadow-card hover:-translate-y-0.5 hover:shadow-card-md hover:border-primary/30",
              )}
            >
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider">At Risk</span>
              </div>
              <div className="text-2xl font-display font-semibold tracking-tight tabular-nums text-destructive mt-2">{metrics.followup.toLocaleString()}</div>
            </button>
          </div>

          {/* 2. Filters & Navigation Tabs Container */}
          <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
            {/* Views Tab List */}
            <div className="border-b border-border flex flex-wrap items-center justify-between px-3 pt-1">
              <div className="flex flex-wrap items-center gap-1 text-[13px] whitespace-nowrap">
                {([
                  { id: 'all', label: 'All Customers' },
                  { id: 'active', label: 'Active' },
                  { id: 'new', label: 'New', count: 42 },
                  { id: 'returning', label: 'Returning' },
                  { id: 'inactive', label: 'Inactive' },
                  { id: 'followup', label: 'Needs Follow-up', count: 37 },
                  { id: 'upcoming', label: 'Upcoming' },
                ] as Array<{ id: typeof activeTab; label: string; count?: number }>).map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "px-3.5 py-2.5 transition-colors cursor-pointer  -mb-px font-medium flex items-center gap-1.5",
                        isActive
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50",
                      )}
                    >
                      <span>{tab.label}</span>
                      {tab.count !== undefined && (
                        <span className="inline-flex items-center justify-center min-w-5 h-4 px-1 rounded-full bg-muted text-muted-foreground text-[10px] font-semibold border border-border">
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => showToast('View configuration saved to preferences.')}
                className="h-8 px-3 rounded-md border border-border bg-background hover:bg-accent hover:text-accent-foreground text-foreground text-[12px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 my-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Bookmark className="size-3.5" />
                <span>Save View</span>
              </button>
            </div>

            {/* Secondary Filters Row */}
            <div className="p-3 bg-background flex flex-wrap items-center justify-between gap-3 border-b border-border">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Location Filter */}
                <FilterSelect
                  aria-label="Filter by location"
                  value={locationFilter}
                  onChange={(v) => setLocationFilter(v)}
                >
                  <option>All Locations</option>
                  <option>Frisco Main</option>
                  <option>Plano North</option>
                </FilterSelect>

                {/* Customer Types Filter */}
                <FilterSelect
                  aria-label="Filter by customer type"
                  value={typeFilter}
                  onChange={(v) => setTypeFilter(v)}
                >
                  <option>All Customer Types</option>
                  <option>Regular</option>
                  <option>VIP</option>
                  <option>New Customer</option>
                </FilterSelect>

                {/* Staff Filter */}
                <FilterSelect
                  aria-label="Filter by staff"
                  value={staffFilter}
                  onChange={(v) => setStaffFilter(v)}
                >
                  <option>All Staff</option>
                  <option>Sarah M.</option>
                  <option>Jessica</option>
                  <option>Michael</option>
                </FilterSelect>

                {/* More Filters */}
                <button
                  onClick={() => showToast('Filters refreshed.')}
                  className="h-8 inline-flex items-center rounded-md border border-border bg-background hover:bg-accent hover:text-accent-foreground text-foreground text-[12px] font-medium px-3 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <SlidersHorizontal className="size-3.5 mr-1.5" />
                  <span>More Filters</span>
                </button>
              </div>
            </div>

            {/* Table Header Subtitle */}
            <div className="px-4 py-2.5 bg-muted/40 flex items-center justify-between text-[12px] font-medium text-muted-foreground border-b border-border">
              <span>
                {activeTab === 'active' && '1,102 Active Customers'}
                {activeTab === 'new' && '42 New Customers This Month'}
                {activeTab === 'returning' && '318 Returning Customers'}
                {activeTab === 'inactive' && '163 Inactive Customers'}
                {activeTab === 'followup' && '37 Customers Need Follow-up'}
                {activeTab === 'upcoming' && '66 Upcoming Appointments'}
                {activeTab === 'all' && `${filtered.length} Customers Available`}
              </span>
              <span className="text-[11px] text-muted-foreground/80">
                {activeTab === 'upcoming' ? 'Sorted by date ascending' : 'Sorted by recent activity'}
              </span>
            </div>

            {/* 3. Customers Table with Specialized Tab Columns */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-muted/40 text-muted-foreground font-semibold uppercase text-[11px] tracking-wider border-b border-border">
                  <tr>
                    <th className="py-3 px-4 font-semibold" scope="col">Customer</th>
                    <th className="py-3 px-3 text-center font-semibold" scope="col">Pets</th>

                    {activeTab === 'upcoming' ? (
                      <>
                        <th className="py-3 px-4 font-semibold" scope="col">Next Appointment</th>
                        <th className="py-3 px-4 font-semibold" scope="col">Service</th>
                        <th className="py-3 px-4 font-semibold" scope="col">Staff</th>
                      </>
                    ) : activeTab === 'followup' ? (
                      <>
                        <th className="py-3 px-4 font-semibold" scope="col">Last Visit</th>
                        <th className="py-3 px-4 font-semibold" scope="col">Next Appointment</th>
                        <th className="py-3 px-4 font-semibold" scope="col">Reason</th>
                      </>
                    ) : (
                      <>
                        <th className="py-3 px-4 font-semibold" scope="col">Last Visit</th>
                        <th className="py-3 px-4 font-semibold" scope="col">Next Appointment</th>
                        <th className="py-3 px-4 font-semibold" scope="col">Lifetime Value</th>
                      </>
                    )}

                    <th className="py-3 px-4 text-right font-semibold" scope="col">Balance</th>
                    <th className="py-3 px-3 text-right font-semibold" scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-normal">
                  {filtered.map((cust) => {
                    const isSelected = selectedCustomerForRail?.id === cust.id;
                    return (
                      <tr
                        key={cust.id}
                        onClick={() => handleRowClick(cust)}
                        className={`transition cursor-pointer ${
                          isSelected
                            ? 'bg-foreground/[0-9] hover:bg-foreground/[0-9]0 border-l-4 border-l-black'
                            : 'hover:bg-accent/50'
                        }`}
                      >
                        {/* Customer Info */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {cust.avatarUrl ? (
                              <div className="relative w-8 h-8 border border-border bg-background shrink-0 overflow-hidden">
                                <Image
                                  src={cust.avatarUrl}
                                  alt={cust.name}
                                  fill
                                  className="object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            ) : (
                              <div className="w-8 h-8 border border-border bg-primary text-primary-foreground font-semibold flex items-center justify-center text-[13px] shrink-0">
                                {cust.initials || cust.name.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-foreground hover:underline text-[13px] tracking-tight">
                                {cust.name}
                              </div>
                              <div className="text-[11px] text-muted-foreground tabular-nums">{cust.phone}</div>
                              <div className="text-[10px] text-muted-foreground truncate">{cust.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Pets */}
                        <td className="py-3 px-3 text-center font-semibold text-foreground tabular-nums">
                          {cust.petCount || cust.pets.length}
                        </td>

                        {/* Middle Columns based on activeTab */}
                        {activeTab === 'upcoming' ? (
                          <>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-foreground">{cust.nextAppointment}</div>
                              <div className="text-[10px] text-muted-foreground tabular-nums">{cust.nextApptTime || '9:00 AM'}</div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-medium text-foreground">{cust.lastService || 'Full Groom'}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-foreground font-medium">{cust.assignedStaff || cust.preferredGroomer || 'Sarah'}</span>
                            </td>
                          </>
                        ) : activeTab === 'followup' ? (
                          <>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-foreground">{cust.lastVisit}</div>
                              <div className="text-[10px] text-muted-foreground">{cust.lastService || 'Full Groom'}</div>
                            </td>
                            <td className="py-3 px-4 text-muted-foreground/70">
                              {cust.nextAppointment && cust.nextAppointment !== '—' ? cust.nextAppointment : '—'}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span className="text-foreground text-[11px] font-medium">{cust.followupReason || 'No recent appt'}</span>
                                <span className={`inline-flex items-center px-1.5 py-0.5 border border-border text-[9px] font-semibold uppercase tracking-wider ${
                                  cust.followupUrgency === 'rose'
                                    ? 'bg-destructive/5 text-destructive'
                                    : 'bg-warning/10 text-warning'
                                }`}>
                                  Follow-up
                                </span>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-3 px-4">
                              {activeTab === 'new' ? (
                                <span className="text-muted-foreground/70 italic">— First Visit Pending</span>
                              ) : (
                                <>
                                  <div className="font-semibold text-foreground">{cust.lastVisit}</div>
                                  <div className="text-[10px] text-muted-foreground">{cust.lastService || 'Full Groom'}</div>
                                  {cust.inactiveDuration && (
                                    <div className="text-[10px] text-destructive font-semibold">{cust.inactiveDuration}</div>
                                  )}
                                </>
                              )}
                            </td>

                            <td className="py-3 px-4">
                              {cust.nextAppointment && cust.nextAppointment !== '—' ? (
                                <>
                                  <div className="font-semibold text-foreground">{cust.nextAppointment}</div>
                                  <div className="text-[10px] text-muted-foreground tabular-nums">{cust.nextApptTime || '10:30 AM'}</div>
                                </>
                              ) : (
                                <div>
                                  <span className="text-muted-foreground/70">—</span>
                                  {activeTab === 'inactive' && (
                                    <div className="text-[10px] text-muted-foreground/70">No Upcoming</div>
                                  )}
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-4 tabular-nums font-semibold text-foreground">
                              ${cust.lifetimeValue ? cust.lifetimeValue.toFixed(2) : (cust.totalSpent || 0).toFixed(2)}
                            </td>
                          </>
                        )}

                        {/* Balance */}
                        <td className="py-3 px-4 text-right tabular-nums font-semibold">
                          {(cust.balance || 0) > 0 ? (
                            <span className="inline-block px-1.5 py-0.5 border border-border bg-warning/10 text-warning">${cust.balance?.toFixed(2)}</span>
                          ) : (
                            <span className="inline-block px-1.5 py-0.5 border border-border bg-background text-foreground">$0.00</span>
                          )}
                        </td>

                        {/* 3-Dots Quick Actions Trigger */}
                        <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCustomerForRail(cust);
                              setIsQuickActionsModalOpen(true);
                            }}
                            className="w-7 h-7 border border-border flex items-center justify-center hover:bg-black hover:text-white transition-colors text-foreground cursor-pointer ml-auto"
                            title="Quick Actions"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination / Table footer */}
            <div className="p-3 border-t border-border bg-background flex flex-col sm:flex-row items-center justify-between gap-3 text-[13px]">
              <div className="text-muted-foreground tabular-nums text-[11px]">
                Showing 1 to {Math.min(filtered.length, 10)} of {filtered.length} entries
              </div>
              <div className="flex items-center gap-1">
                <button className="px-2.5 py-1 border border-border text-foreground hover:bg-black hover:text-white uppercase font-semibold text-[11px] transition-colors cursor-pointer">
                  Prev
                </button>
                <button className="w-7 h-7 border border-border bg-primary text-primary-foreground font-semibold text-[13px] flex items-center justify-center cursor-pointer">
                  1
                </button>
                <button className="w-7 h-7 border border-border text-foreground hover:bg-accent/50 font-semibold text-[13px] flex items-center justify-center cursor-pointer">
                  2
                </button>
                <button className="w-7 h-7 border border-border text-foreground hover:bg-accent/50 font-semibold text-[13px] flex items-center justify-center cursor-pointer">
                  3
                </button>
                <button className="px-2.5 py-1 border border-border text-foreground hover:bg-black hover:text-white uppercase font-semibold text-[11px] transition-colors cursor-pointer">
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= RIGHT PERSISTENT CUSTOMER QUICK VIEW DRAWER ================= */}
      {isRailOpen && activeCustomer && (
        <aside className="w-[390px] bg-card border-l border-border flex flex-col shrink-0 overflow-y-auto z-10 custom-scrollbar shadow-2xl">
          {/* Header with Name, Status, and PROMINENT TOP CTA */}
          <div className="p-5 pb-4 border-b border-border bg-background">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-foreground uppercase tracking-tight leading-tight">{activeCustomer.name}</h3>
                  <span className="inline-flex items-center px-1.5 py-0.5 border border-border text-[9px] font-semibold uppercase tracking-wider bg-card text-foreground">
                    Active
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
                  Customer Since {activeCustomer.customerSince || 'Apr 12, 2023'}
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {/* Prominent Top Full Profile CTA */}
                <button
                  type="button"
                  onClick={() => handleOpenFullProfile(activeCustomer)}
                  className="h-8 px-3 bg-black hover:bg-muted text-white text-[13px] font-semibold uppercase tracking-wider border border-border inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Open Full Customer Profile"
                >
                  <span>Full Profile</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsRailOpen(false)}
                  className="w-8 h-8 border border-border flex items-center justify-center hover:bg-black hover:text-white transition-colors text-foreground cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Contact & Primary Profile Information */}
          <div className="p-5 border-b border-border space-y-4 bg-card">
            <div className="flex items-start gap-3">
              {activeCustomer.avatarUrl ? (
                <div className="relative w-12 h-12 border border-border shrink-0 overflow-hidden bg-card">
                  <Image
                    src={activeCustomer.avatarUrl}
                    alt={activeCustomer.name}
                    fill
                    className="object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 border border-border bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center shrink-0">
                  {activeCustomer.initials || 'SJ'}
                </div>
              )}

              <div className="space-y-1 text-[13px]">
                <div className="flex items-center gap-1.5 text-foreground">
                  <Mail className="w-3.5 h-3.5 text-foreground shrink-0" />
                  <span className="font-semibold">{activeCustomer.email}</span>
                </div>
                <div className="flex items-center gap-1.5 text-foreground">
                  <Phone className="w-3.5 h-3.5 text-foreground shrink-0" />
                  <span className="font-semibold tabular-nums">{activeCustomer.phone}</span>
                </div>
                <div className="flex items-start gap-1.5 text-foreground">
                  <MapPin className="w-3.5 h-3.5 text-foreground shrink-0 mt-0.5" />
                  <div>
                    {activeCustomer.address || '1234 Maple Drive'}
                    <br />
                    <span className="text-[11px] text-muted-foreground">Frisco, TX 75034</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Registered Pets Quick Glance */}
            <div className="pt-3 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  🐾 Registered Pets ({activeCustomer.pets.length})
                </span>
                <button
                  type="button"
                  onClick={() => setActiveQuickActionSubView('add-pet')}
                  className="text-[11px] font-semibold text-foreground uppercase hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add Pet
                </button>
              </div>
              <div className="space-y-1.5">
                {activeCustomer.pets.map((pet, idx) => {
                  const petDisplay = typeof pet === 'string' ? pet : (pet as any)?.name || 'Pet';
                  return (
                    <div key={idx} className="flex items-center justify-between p-2 bg-card border border-border text-[13px]">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">🐾</span>
                        <span className="font-semibold text-foreground">{petDisplay}</span>
                      </div>
                      <span className="text-[10px] bg-card border border-border text-foreground font-semibold uppercase px-1.5 py-0.5">
                        Active
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Account Snapshot Metrics */}
          <div className="p-5 border-b border-border bg-background">
            <h4 className="text-[13px] font-semibold uppercase tracking-wider text-foreground mb-2.5">Account Snapshot</h4>

            <div className="grid grid-cols-3 gap-2 text-center bg-card p-2.5 border border-border">
              <div>
                <span className="text-[9px] uppercase font-semibold text-muted-foreground block">Total Spent</span>
                <span className="text-[13px] font-semibold text-foreground tabular-nums mt-0.5 block">
                  ${activeCustomer.totalSpent ? activeCustomer.totalSpent.toFixed(2) : (activeCustomer.lifetimeValue ? activeCustomer.lifetimeValue.toFixed(2) : '1,095.50')}
                </span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-semibold text-muted-foreground block">Balance</span>
                <span className={`text-[13px] font-semibold tabular-nums mt-0.5 block ${
                  (activeCustomer.balance || 0) > 0 ? 'text-warning' : 'text-foreground'
                }`}>
                  ${(activeCustomer.balance || 0).toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-semibold text-muted-foreground block">Loyalty</span>
                <span className="text-[13px] font-semibold text-foreground tabular-nums mt-0.5 block">
                  {activeCustomer.loyaltyPoints || 245} pts
                </span>
              </div>
            </div>

            {/* Next / Last visit banner */}
            <div className="mt-3 flex items-center justify-between text-[13px] p-2.5 bg-card border border-border">
              <div>
                <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Next Appointment</span>
                <span className="font-semibold text-foreground">
                  {activeCustomer.nextAppointment && activeCustomer.nextAppointment !== '—' ? activeCustomer.nextAppointment : 'None scheduled'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Last Visit</span>
                <span className="font-semibold text-foreground">{activeCustomer.lastVisit || 'No visits yet'}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions Shortcuts */}
          <div className="p-5 flex-1 bg-card space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[13px] font-semibold uppercase tracking-wider text-foreground">Quick Actions</h4>
              <button
                type="button"
                onClick={() => setIsQuickActionsModalOpen(true)}
                className="text-[11px] text-foreground font-semibold uppercase hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Zap className="w-3 h-3 text-foreground" />
                <span>All Actions</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* 1. New Appointment */}
              <button
                type="button"
                onClick={() => setActiveQuickActionSubView('new-appointment')}
                className="flex items-center gap-2 p-2 border border-border text-[13px] font-medium uppercase tracking-wider text-muted-foreground hover:bg-black hover:text-white transition-colors text-left cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>Book Appt</span>
              </button>

              {/* 2. Add Pet */}
              <button
                type="button"
                onClick={() => setActiveQuickActionSubView('add-pet')}
                className="flex items-center gap-2 p-2 border border-border text-[13px] font-medium uppercase tracking-wider text-muted-foreground hover:bg-black hover:text-white transition-colors text-left cursor-pointer"
              >
                <PawPrint className="w-3.5 h-3.5 shrink-0" />
                <span>Add Pet</span>
              </button>

              {/* 3. Take Payment */}
              <button
                type="button"
                onClick={() => setActiveQuickActionSubView('take-payment')}
                className="flex items-center gap-2 p-2 border border-border text-[13px] font-medium uppercase tracking-wider text-muted-foreground hover:bg-black hover:text-white transition-colors text-left cursor-pointer"
              >
                <DollarSign className="w-3.5 h-3.5 shrink-0" />
                <span>Take Payment</span>
              </button>

              {/* 4. Send Message */}
              <button
                type="button"
                onClick={() => setActiveQuickActionSubView('send-message')}
                className="flex items-center gap-2 p-2 border border-border text-[13px] font-medium uppercase tracking-wider text-muted-foreground hover:bg-black hover:text-white transition-colors text-left cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                <span>Send Message</span>
              </button>

              {/* 5. Add Note */}
              <button
                type="button"
                onClick={() => setActiveQuickActionSubView('add-note')}
                className="flex items-center gap-2 p-2 border border-border text-[13px] font-medium uppercase tracking-wider text-muted-foreground hover:bg-black hover:text-white transition-colors text-left cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span>Add Note</span>
              </button>

              {/* 6. Update Documents */}
              <button
                type="button"
                onClick={() => setActiveQuickActionSubView('update-documents')}
                className="flex items-center gap-2 p-2 border border-border text-[13px] font-medium uppercase tracking-wider text-muted-foreground hover:bg-black hover:text-white transition-colors text-left cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Documents</span>
              </button>
            </div>
          </div>

          {/* Prominent Bottom See More CTA */}
          <div className="p-4 bg-card border-t border-border mt-auto sticky bottom-0">
            <button
              type="button"
              onClick={() => handleOpenFullProfile(activeCustomer)}
              className="w-full h-10 bg-black hover:bg-muted text-white font-semibold uppercase tracking-wider text-[13px] border border-border flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span>See More in Full Customer Profile</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </aside>
      )}

      {/* ================= NEW CUSTOMER & PET CREATION MODAL ================= */}
      {isNewCustomerModalOpen && (
        <div className="fixed inset-0 bg-foreground/[0-9]0 z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-card max-w-xl w-full border-2 border-border overflow-hidden my-8 shadow-2xl">
            {/* Header */}
            <div className="px-6 py-4 bg-card border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 border border-border bg-primary text-primary-foreground flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display text-base font-semibold tracking-tight text-foreground">Add New Customer</h3>
                  <p className="text-[13px] text-muted-foreground">Saves directly to Supabase cloud database</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewCustomerModalOpen(false)}
                className="w-8 h-8 border border-border flex items-center justify-center hover:bg-black hover:text-white transition-colors text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveNewCustomer} className="p-6 space-y-4 text-[13px] bg-card">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium uppercase tracking-wider text-muted-foreground mb-1">
                    First Name <span className="text-foreground font-semibold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newCustForm.firstName}
                    onChange={(e) => setNewCustForm({ ...newCustForm, firstName: e.target.value })}
                    placeholder="e.g. Marcus"
                    className="w-full px-3 py-2 bg-card border border-border focus:outline-none focus:ring-1 focus:ring-black text-foreground"
                  />
                </div>
                <div>
                  <label className="block font-medium uppercase tracking-wider text-muted-foreground mb-1">
                    Last Name <span className="text-foreground font-semibold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newCustForm.lastName}
                    onChange={(e) => setNewCustForm({ ...newCustForm, lastName: e.target.value })}
                    placeholder="e.g. Vance"
                    className="w-full px-3 py-2 bg-card border border-border focus:outline-none focus:ring-1 focus:ring-black text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium uppercase tracking-wider text-muted-foreground mb-1">
                    Email Address <span className="text-foreground font-semibold">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={newCustForm.email}
                    onChange={(e) => setNewCustForm({ ...newCustForm, email: e.target.value })}
                    placeholder="customer@example.com"
                    className="w-full px-3 py-2 bg-card border border-border focus:outline-none focus:ring-1 focus:ring-black text-foreground"
                  />
                </div>
                <div>
                  <label className="block font-medium uppercase tracking-wider text-muted-foreground mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={newCustForm.phone}
                    onChange={(e) => setNewCustForm({ ...newCustForm, phone: e.target.value })}
                    placeholder="(901) 555-0199"
                    className="w-full px-3 py-2 bg-card border border-border focus:outline-none focus:ring-1 focus:ring-black text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-medium uppercase tracking-wider text-muted-foreground mb-1">Street Address</label>
                  <input
                    type="text"
                    value={newCustForm.address}
                    onChange={(e) => setNewCustForm({ ...newCustForm, address: e.target.value })}
                    placeholder="4746 Barkshire Dr"
                    className="w-full px-3 py-2 bg-card border border-border focus:outline-none focus:ring-1 focus:ring-black text-foreground"
                  />
                </div>
                <div>
                  <label className="block font-medium uppercase tracking-wider text-muted-foreground mb-1">City / State</label>
                  <input
                    type="text"
                    value={newCustForm.city}
                    onChange={(e) => setNewCustForm({ ...newCustForm, city: e.target.value })}
                    placeholder="Memphis, TN"
                    className="w-full px-3 py-2 bg-card border border-border focus:outline-none focus:ring-1 focus:ring-black text-foreground"
                  />
                </div>
              </div>

              {/* Pet Details Section */}
              <div className="p-4 bg-card border border-border space-y-3 mt-3">
                <div className="flex items-center gap-1.5 font-semibold uppercase tracking-wider text-foreground text-[13px]">
                  <PawPrint className="w-4 h-4 text-foreground" />
                  <span>Pet Information (Optional)</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium uppercase tracking-wider text-muted-foreground mb-1">Pet Name</label>
                    <input
                      type="text"
                      value={newCustForm.petName}
                      onChange={(e) => setNewCustForm({ ...newCustForm, petName: e.target.value })}
                      placeholder="e.g. Randy"
                      className="w-full px-3 py-2 bg-card border border-border focus:outline-none focus:ring-1 focus:ring-black text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block font-medium uppercase tracking-wider text-muted-foreground mb-1">Breed</label>
                    <input
                      type="text"
                      value={newCustForm.petBreed}
                      onChange={(e) => setNewCustForm({ ...newCustForm, petBreed: e.target.value })}
                      placeholder="e.g. Yorkshire Terrier"
                      className="w-full px-3 py-2 bg-card border border-border focus:outline-none focus:ring-1 focus:ring-black text-foreground"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium uppercase tracking-wider text-muted-foreground mb-1">Weight</label>
                    <input
                      type="text"
                      value={newCustForm.petWeight}
                      onChange={(e) => setNewCustForm({ ...newCustForm, petWeight: e.target.value })}
                      placeholder="e.g. 12 lbs"
                      className="w-full px-3 py-2 bg-card border border-border focus:outline-none focus:ring-1 focus:ring-black text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block font-medium uppercase tracking-wider text-muted-foreground mb-1">Gender</label>
                    <select
                      value={newCustForm.petGender}
                      onChange={(e) => setNewCustForm({ ...newCustForm, petGender: e.target.value })}
                      className="w-full px-3 py-2 bg-card border border-border focus:outline-none focus:ring-1 focus:ring-black text-foreground font-semibold uppercase tracking-wider"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-medium uppercase tracking-wider text-muted-foreground mb-1">Grooming Notes & Special Handling</label>
                  <textarea
                    rows={2}
                    value={newCustForm.petNotes}
                    onChange={(e) => setNewCustForm({ ...newCustForm, petNotes: e.target.value })}
                    placeholder="Sensitive skin, gentle on paws, favorite treats..."
                    className="w-full px-3 py-2 bg-card border border-border focus:outline-none focus:ring-1 focus:ring-black text-foreground placeholder-gray-400"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsNewCustomerModalOpen(false)}
                  className="px-4 py-2 text-[13px] font-medium uppercase tracking-wider text-muted-foreground border border-border bg-background hover:bg-accent/50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCustomer}
                  className="px-5 py-2 text-[13px] font-semibold uppercase tracking-wider text-white bg-black hover:bg-muted border border-border transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isSavingCustomer ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving to Supabase...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Save Customer &amp; Pet</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
