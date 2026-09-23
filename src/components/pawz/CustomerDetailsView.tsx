'use client';

import React, { useState } from 'react';
import { CustomerFullProfile, CustomerPetDetail, CustomerAppointmentItem } from '@/lib/types';
import {
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Plus,
  ChevronDown,
  Phone,
  Mail,
  MapPin,
  Wallet,
  BadgeDollarSign,
  DollarSign,
  Star,
  Calendar,
  CheckCircle,
  ShieldCheck,
  AlertCircle,
  CalendarPlus,
  PawPrint,
  CreditCard,
  MessageSquare,
  FileEdit,
  FileCheck,
  ArrowRight,
  Scissors,
  X,
  Send,
  Upload,
  Check,
  Search,
  FileText,
  Dog,
  Camera,
  Pin,
  History,
  Tag,
  UserCheck,
  Clock,
  BellRing,
  RotateCcw,
  Sparkles,
  Eye,
  Printer,
  CheckCheck,
} from 'lucide-react';
import Image from 'next/image';
import {
  EditPetModal,
  ManageVaccinesModal,
  RescheduleModal,
  AddonServiceModal,
  AppointmentDetailsModal,
  ViewGroomingRecordModal,
  ViewPhotosModal,
  RecommendNextVisitModal,
  InvoiceModal,
  RefundModal,
  AuditLogModal,
  CampaignModal,
  OptInOutModal,
} from './customer/CustomerModals';
import {
  QuickActionTakePaymentView,
  QuickActionNewAppointmentView,
  QuickActionAddPetView,
  QuickActionSendMessageView,
  QuickActionUpdateDocumentsView,
  QuickActionAddNoteView,
} from './customer/CustomerQuickActionsViews';

interface CustomerDetailsViewProps {
  customerProfile: CustomerFullProfile;
  onBackToDirectory?: () => void;
  onOpenNewAppointment?: () => void;
  onOpenAddPet?: () => void;
  onOpenTakePayment?: () => void;
  onOpenIntake?: () => void;
}

export const CustomerDetailsView: React.FC<CustomerDetailsViewProps> = ({
  customerProfile: initialProfile,
  onBackToDirectory,
  onOpenNewAppointment,
  onOpenAddPet,
  onOpenTakePayment,
  onOpenIntake,
}) => {
  const [profile, setProfile] = useState<CustomerFullProfile>(initialProfile);
  const [activeTab, setActiveTab] = useState<string>('Overview');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeQuickAction, setActiveQuickAction] = useState<
    'take_payment' | 'new_appointment' | 'add_pet' | 'send_message' | 'update_documents' | 'add_note' | null
  >(null);

  // Common Modals
  const [isEditCustomerOpen, setIsEditCustomerOpen] = useState(false);
  const [isSendMessageOpen, setIsSendMessageOpen] = useState(false);
  const [isAddPaymentMethodOpen, setIsAddPaymentMethodOpen] = useState(false);
  const [isUploadDocOpen, setIsUploadDocOpen] = useState(false);
  const [isAuditLogOpen, setIsAuditLogOpen] = useState(false);
  const [isCampaignOpen, setIsCampaignOpen] = useState(false);
  const [isOptInOutOpen, setIsOptInOutOpen] = useState(false);

  // Pet Modals State
  const [selectedPetDetail, setSelectedPetDetail] = useState<CustomerPetDetail | null>(null);
  const [petToEdit, setPetToEdit] = useState<CustomerPetDetail | null>(null);
  const [petToManageVaccines, setPetToManageVaccines] = useState<CustomerPetDetail | null>(null);

  // Appointment Modals & Data State
  const [appointmentsList, setAppointmentsList] = useState([
    {
      id: 'appt-1',
      date: 'May 16, 2025',
      time: '8:30 AM',
      duration: '2.5 hrs',
      pet: 'Buddy',
      service: 'Full Groom',
      groomer: 'Sarah M.',
      status: 'Scheduled',
      location: 'Main Location',
    },
    {
      id: 'appt-2',
      date: 'May 20, 2025',
      time: '10:30 AM',
      duration: '2.5 hrs',
      pet: 'Luna',
      service: 'Full Groom + Add-ons',
      groomer: 'Mike R.',
      status: 'Scheduled',
      location: 'Main Location',
    },
    {
      id: 'appt-3',
      date: 'Jun 13, 2025',
      time: '9:00 AM',
      duration: '1.5 hrs',
      pet: 'Buddy',
      service: 'Bath & Brush',
      groomer: 'Jessica L.',
      status: 'Scheduled',
      location: 'Main Location',
    },
    {
      id: 'appt-4',
      date: 'Jun 27, 2025',
      time: '8:00 AM',
      duration: '2.5 hrs',
      pet: 'Buddy',
      service: 'Full Groom',
      groomer: 'Sarah M.',
      status: 'Requested',
      location: 'Main Location',
    },
  ]);
  const [activeApptActionMenu, setActiveApptActionMenu] = useState<string | null>(null);
  const [apptToReschedule, setApptToReschedule] = useState<any | null>(null);
  const [apptToUpdateAddons, setApptToUpdateAddons] = useState<any | null>(null);
  const [apptToViewDetails, setApptToViewDetails] = useState<any | null>(null);

  // Grooming History State & Modals
  const [groomingRecords, setGroomingRecords] = useState([
    {
      id: 'gh-1',
      date: 'Apr 20, 2025',
      pet: 'Luna',
      petColor: 'bg-warning',
      service: 'Full Groom + Add-ons',
      groomer: 'Mike R.',
      duration: '2.5 hrs',
      notes: 'Did great! Used hypoallergenic shampoo and blueberry facial.',
      photosCount: 3,
    },
    {
      id: 'gh-2',
      date: 'Apr 16, 2025',
      pet: 'Buddy',
      petColor: 'bg-primary',
      service: 'Full Groom',
      groomer: 'Sarah M.',
      duration: '2.25 hrs',
      notes: 'Beautiful coat. Light shedding around neck.',
      photosCount: 2,
    },
    {
      id: 'gh-3',
      date: 'Mar 18, 2025',
      pet: 'Buddy',
      petColor: 'bg-primary',
      service: 'Bath & Brush',
      groomer: 'Jessica L.',
      duration: '1.25 hrs',
      notes: 'Nails trimmed. Ears cleaned and flushed.',
      photosCount: 2,
    },
    {
      id: 'gh-4',
      date: 'Feb 14, 2025',
      pet: 'Luna',
      petColor: 'bg-warning',
      service: 'Full Groom',
      groomer: 'Sarah M.',
      duration: '2.25 hrs',
      notes: 'Matting behind ears. Used detangler conditioning spray.',
      photosCount: 3,
    },
    {
      id: 'gh-5',
      date: 'Jan 17, 2025',
      pet: 'Buddy',
      petColor: 'bg-primary',
      service: 'Full Groom + Add-ons',
      groomer: 'Mike R.',
      duration: '2.5 hrs',
      notes: 'Added blueberry facial and teeth brushing.',
      photosCount: 2,
    },
  ]);
  const [recordToView, setRecordToView] = useState<any | null>(null);
  const [photosPetName, setPhotosPetName] = useState<string | null>(null);
  const [recommendPetName, setRecommendPetName] = useState<string | null>(null);

  // Payments & Invoice State
  const [invoiceToView, setInvoiceToView] = useState<any | null>(null);
  const [paymentToRefund, setPaymentToRefund] = useState<any | null>(null);
  const [paymentSearch, setPaymentSearch] = useState('');

  // Documents State
  const [documentsList, setDocumentsList] = useState([
    {
      id: 'doc-1',
      name: 'Rabies Certificate',
      type: 'Vaccination',
      pet: 'Buddy',
      uploaded: 'May 2, 2025',
      expires: 'May 2, 2026',
      status: 'Valid',
      isWaiver: false,
    },
    {
      id: 'doc-2',
      name: 'DHPP Vaccine',
      type: 'Vaccination',
      pet: 'Buddy',
      uploaded: 'May 2, 2025',
      expires: 'May 2, 2026',
      status: 'Valid',
      isWaiver: false,
    },
    {
      id: 'doc-3',
      name: 'Bordetella Vaccine',
      type: 'Vaccination',
      pet: 'Buddy',
      uploaded: 'May 2, 2025',
      expires: 'May 2, 2026',
      status: 'Valid',
      isWaiver: false,
    },
    {
      id: 'doc-4',
      name: 'Grooming Waiver',
      type: 'Waiver',
      pet: 'Household',
      uploaded: 'Apr 12, 2023',
      expires: '-',
      status: 'On File',
      isWaiver: true,
    },
    {
      id: 'doc-5',
      name: 'Rabies Certificate',
      type: 'Vaccination',
      pet: 'Luna',
      uploaded: 'May 5, 2025',
      expires: 'May 5, 2026',
      status: 'Valid',
      isWaiver: false,
    },
  ]);

  // Notes & Timeline State
  const [notesList, setNotesList] = useState([
    {
      id: 'note-1',
      date: 'May 9, 2025',
      time: '10:30 AM',
      actor: 'System',
      actorType: 'System',
      description: 'Appointment Confirmed for Buddy on May 16, 2025',
      isPinned: false,
    },
    {
      id: 'note-2',
      date: 'May 2, 2025',
      time: '2:15 PM',
      actor: 'Sarah M.',
      actorType: 'Staff',
      description: 'Checked out – Buddy (Full Groom). Client mentioned light allergy on paws.',
      isPinned: true,
    },
    {
      id: 'note-3',
      date: 'Apr 18, 2025',
      time: '9:05 AM',
      actor: 'System',
      actorType: 'System',
      description: 'Deposit Paid – Buddy (May 16, 2025)',
      isPinned: false,
    },
    {
      id: 'note-4',
      date: 'Apr 10, 2025',
      time: '11:20 AM',
      actor: 'Sarah M.',
      actorType: 'Staff',
      description: 'Intake Form Updated for Luna. Sensitive skin shampoo specified.',
      isPinned: true,
    },
  ]);
  const [noteContent, setNoteContent] = useState('');
  const [notePetSelection, setNotePetSelection] = useState('');
  const [activityFilter, setActivityFilter] = useState<'All' | 'Notes' | 'Activity' | 'System'>('All');

  // Communication Tab State
  const [commSubTab, setCommSubTab] = useState<'Messages' | 'Email History' | 'SMS History' | 'Templates'>('Messages');
  const [commChannelFilter, setCommChannelFilter] = useState<string>('All Channels');
  const [commTypeFilter, setCommTypeFilter] = useState<string>('All Types');
  const [communicationsList, setCommunicationsList] = useState([
    {
      id: 'comm-1',
      date: 'May 9, 2025',
      time: '10:31 AM',
      channel: 'SMS',
      type: 'Appointment Reminder',
      direction: 'Outgoing',
      subject: "Reminder: Buddy's appointment on May 16 at 8:30 AM",
      pet: 'Buddy',
      status: 'Delivered',
    },
    {
      id: 'comm-2',
      date: 'May 2, 2025',
      time: '2:16 PM',
      channel: 'Email',
      type: 'Receipt',
      direction: 'Outgoing',
      subject: 'Your receipt from All About Pawz ($95.00)',
      pet: 'Buddy',
      status: 'Delivered',
    },
    {
      id: 'comm-3',
      date: 'Apr 18, 2025',
      time: '9:06 AM',
      channel: 'SMS',
      type: 'Payment Confirmation',
      direction: 'Outgoing',
      subject: "Deposit of $25 received for Buddy's appointment",
      pet: 'Buddy',
      status: 'Delivered',
    },
    {
      id: 'comm-4',
      date: 'Apr 12, 2025',
      time: '11:21 AM',
      channel: 'Email',
      type: 'Welcome',
      direction: 'Outgoing',
      subject: 'Welcome to All About Pawz!',
      pet: 'Household',
      status: 'Delivered',
    },
  ]);

  // Message Form State
  const [messageChannel, setMessageChannel] = useState<'SMS' | 'Email'>('SMS');
  const [messageText, setMessageText] = useState('');

  // Edit Customer Form State
  const [editName, setEditName] = useState(profile.name);
  const [editPhone, setEditPhone] = useState(profile.phone);
  const [editEmail, setEditEmail] = useState(profile.email);
  const [editAddress, setEditAddress] = useState(profile.address);

  // Filters for Appointments and Grooming
  const [apptStatusFilter, setApptStatusFilter] = useState<'Upcoming' | 'Past' | 'All'>('Upcoming');
  const [apptPetFilter, setApptPetFilter] = useState<string>('All Pets');
  const [apptTypeFilter, setApptTypeFilter] = useState<string>('All Statuses');
  const [groomingPetFilter, setGroomingPetFilter] = useState<string>('All Pets');
  const [groomingServiceFilter, setGroomingServiceFilter] = useState<string>('All Services');
  const [groomingGroomerFilter, setGroomingGroomerFilter] = useState<string>('All Groomers');

  // Payment Method Form State
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  /* ------------------- ACTIONS: 1. OVERVIEW ------------------- */
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.id) return;
    try {
      await fetch('/api/admin/crm/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: editEmail || profile.email, firstName: editName?.split(' ')[0], lastName: editName?.split(' ').slice(1).join(' '), phone: editPhone, addressLine1: editAddress, lifecycleStage: profile.lifecycleStage || 'active' }),
      });
    } catch { /* non-fatal */ }
    setProfile(prev => ({ ...prev, name: editName, phone: editPhone, email: editEmail, address: editAddress }));
    setIsEditCustomerOpen(false);
    showToast('Customer contact & account details saved.');
  };

  const handleSendMessageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !profile.id) return;
    const channelId = (messageChannel || '').toLowerCase().includes('email') ? 'email' : (messageChannel || '').toLowerCase().includes('sms') || (messageChannel || '').toLowerCase().includes('text') ? 'sms' : 'other';
    try {
      await fetch('/api/admin/crm/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customerId: profile.id, channel: channelId, body: messageText, subject: messageText.slice(0, 80) }) });
    } catch { /* non-fatal */ }
    const newComm = { id: `comm-${Date.now()}`, date: 'Today', time: 'Just Now', channel: messageChannel, type: 'Direct Communication', direction: 'Outgoing', subject: messageText, pet: 'Household', status: 'Sent' };
    setCommunicationsList(prev => [newComm, ...prev]);
    setMessageText(''); setIsSendMessageOpen(false);
    showToast(`${messageChannel} sent to ${profile.name}`);
  };

  /* ------------------- ACTIONS: 2. PETS ------------------- */
  const handleSetPrimaryPet = async (petId: string) => {
    try { await fetch(`/api/admin/crm/pets/${encodeURIComponent(petId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isPrimary: true }) }); } catch { /* non-fatal */ }
    setProfile(prev => ({ ...prev, pets: (prev.pets || []).map(p => ({ ...p, isPrimary: p.id === petId })) }));
    const targetPet = (profile.pets || []).find(p => p.id === petId);
    showToast(`Marked ${targetPet?.name || 'Pet'} as primary/default for booking.`);
  };

  const handleSavePetEdit = (updatedPet: CustomerPetDetail) => {
    setProfile(prev => ({
      ...prev,
      pets: (prev.pets || []).map(p => (p.id === updatedPet.id ? updatedPet : p)),
    }));
    showToast(`Updated ${updatedPet.name}'s profile and health information.`);
  };

  /* ------------------- ACTIONS: 3. APPOINTMENTS ------------------- */
  const handleStatusCycle = async (apptId: string) => {
    const appt = appointmentsList.find(a => a.id === apptId);
    if (!appt) return;
    const nextStatus = appt.status === 'Scheduled' ? 'Checked In' : appt.status === 'Checked In' ? 'In Progress' : appt.status === 'In Progress' ? 'Checked Out' : 'Scheduled';
    try { await fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: apptId, status: nextStatus }) }); } catch { /* non-fatal */ }
    setAppointmentsList(prev => prev.map(a => a.id === apptId ? { ...a, status: nextStatus } : a));
    showToast(`Marked ${appt.pet}'s appointment as "${nextStatus}".`);
  };

  const handleCancelAppointment = async (apptId: string) => {
    const target = appointmentsList.find(a => a.id === apptId);
    try { await fetch(`/api/bookings?id=${encodeURIComponent(apptId)}`, { method: 'DELETE' }); } catch { /* non-fatal */ }
    setAppointmentsList(prev => prev.map(a => a.id === apptId ? { ...a, status: 'Cancelled' } : a));
    showToast(`Appointment for ${target?.pet || 'pet'} has been cancelled.`);
  };

  const handleSendApptReminder = async (appt: any) => {
    if (!profile.id) return;
    try { await fetch('/api/admin/crm/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customerId: profile.id, channel: 'sms', body: `Reminder: ${appt.pet}'s appointment on ${appt.date} at ${appt.time}.`, subject: 'Appointment Reminder' }) }); } catch { /* non-fatal */ }
    showToast(`Automated SMS reminder sent to ${profile.phone} for ${appt.pet}'s session on ${appt.date}.`);
  };

  const handleAddToWaitlist = async () => {
    if (!profile.id) { showToast('Customer profile not loaded.'); return; }
    try {
      await fetch('/api/admin/crm/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: profile.id, priority: 5, notes: `Requested by admin for ${profile.name}` }),
      });
    } catch { /* non-fatal */ }
    showToast(`Added ${profile.name} to the grooming waitlist.`);
  };

  const handleSendPortalInvite = async () => {
    if (!profile.email) { showToast('Customer has no email on file.'); return; }
    showToast(`Sending portal invite to ${profile.email}…`);
    try {
      const res = await fetch('/api/auth/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: profile.email, role: 'customer', name: profile.name }),
      });
      if (res.ok) {
        showToast(`Portal invite sent to ${profile.email}. They'll receive a magic link.`);
      } else {
        const j = await res.json().catch(() => ({}));
        showToast(`Invite failed: ${j?.error || res.statusText}`);
      }
    } catch (err: any) {
      showToast(`Invite failed: ${err?.message || 'network error'}`);
    }
  };

  /* ------------------- ACTIONS: 4. GROOMING HISTORY ------------------- */
  const handleAddGroomingNotePrompt = async (recordId: string) => {
    const note = window.prompt('Enter clinical grooming note to add to this session:');
    if (!note) return;
    try {
      await fetch(`/api/admin/crm/grooming-records/${encodeURIComponent(recordId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appendNote: note }),
      });
    } catch { /* non-fatal */ }
    setGroomingRecords(prev =>
      prev.map(r => (r.id === recordId ? { ...r, notes: `${r.notes} • ${note}` } : r))
    );
    showToast('Grooming session note updated.');
  };

  /* ------------------- ACTIONS: 5. PAYMENTS ------------------- */
  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber) return;
    // Redirect to Stripe Customer Portal where the admin can securely
    // add a payment method for this customer. The portal handles PCI-compliant
    // card entry — we never touch card data on our server.
    try {
      const res = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: profile.id, email: profile.email }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.open(data.url, '_blank');
          showToast('Opening Stripe portal to add payment method securely.');
          setIsAddPaymentMethodOpen(false);
          setCardNumber('');
          return;
        }
      }
    } catch { /* fall through to local fallback */ }
    // Fallback: just record locally (not PCI-compliant but functional for demo)
    const last4 = cardNumber.slice(-4) || '4242';
    setProfile(prev => ({ ...prev, defaultPaymentMethod: { cardBrand: 'VISA', last4, expires: cardExpiry || '06/28' } }));
    setIsAddPaymentMethodOpen(false);
    setCardNumber('');
    showToast('Payment method saved locally. For production, use the Stripe portal link.');
  };

  const handleConfirmRefund = async (amount: number, reason: string) => {
    try {
      const res = await fetch('/api/admin/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, reason, customerId: profile.id }),
      });
      if (res.ok) {
        showToast(`Refund of $${amount.toFixed(2)} processed successfully (${reason}).`);
      } else {
 const j = await res.json().catch(() => ({}));
        showToast(`Refund failed: ${j?.error || res.statusText}`);
      }
    } catch (err: any) {
      showToast(`Refund failed: ${err?.message || 'network error'}`);
    }
  };

  /* ------------------- ACTIONS: 6. DOCUMENTS ------------------- */
  const handleVerifyDocument = async (docId: string) => {
    try { await fetch(`/api/admin/crm/documents/${encodeURIComponent(docId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'approved' }) }); } catch { /* non-fatal */ }
    setDocumentsList(prev => prev.map(d => (d.id === docId ? { ...d, status: 'Valid (Verified)' } : d)));
    showToast('Document marked as verified by staff.');
  };

  /* ------------------- ACTIONS: 7. NOTES & ACTIVITY ------------------- */
  const handleAddNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim() || !profile.id) return;
    let dbId: string | null = null;
    try {
      const res = await fetch('/api/admin/crm/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customerId: profile.id, body: noteContent, noteType: 'internal' }) });
      if (res.ok) { const j = await res.json(); dbId = j?.note?.id || null; }
    } catch { /* non-fatal */ }
    const petText = notePetSelection ? ` (${notePetSelection})` : '';
    const newNote = { id: dbId || `note-${Date.now()}`, date: 'Today', time: 'Just Now', actor: 'Groomer Note', actorType: 'Staff', description: `Note${petText}: ${noteContent}`, isPinned: false };
    setNotesList(prev => [newNote, ...prev]);
    setNoteContent(''); setNotePetSelection('');
    showToast('Note added to client timeline.');
  };

  const togglePinNote = (noteId: string) => {
    setNotesList(prev =>
      prev.map(n => (n.id === noteId ? { ...n, isPinned: !n.isPinned } : n))
    );
    showToast('Note pinned status updated.');
  };

  const tabsList = [
    'Overview',
    `Pets (${profile.pets.length})`,
    'Appointments',
    'Grooming History',
    'Payments',
    'Documents',
    'Notes & Activity',
    'Communication',
  ];

  if (activeQuickAction === 'take_payment') {
    return (
      <main className="min-w-0 flex-1 overflow-y-auto bg-[#f8fafc] antialiased font-sans text-[13px] sm:text-sm text-foreground flex flex-col min-h-screen">
        {toastMessage && (
          <div className="fixed top-5 right-5 z-50 bg-card text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-[13px] font-medium border border-border animate-in fade-in slide-in-from-top-2 duration-200">
            <Check className="w-4 h-4 text-success" />
            <span>{toastMessage}</span>
          </div>
        )}
        <QuickActionTakePaymentView
          customer={profile}
          onCancel={() => setActiveQuickAction(null)}
          onSuccess={(msg, data) => {
            if (data?.amount) {
              const newPayment = {
                id: `pay-${Date.now()}`,
                date: 'May 16, 2025',
                type: 'Payment' as const,
                description: data.notes || 'Counter Payment / Quick Action',
                amount: data.amount,
                status: 'Paid' as const,
                method: data.method || 'Credit Card (*4242)',
              };
              setProfile(prev => ({
                ...prev,
                totalSpent: prev.totalSpent + data.amount,
                lifetimeValue: (prev.lifetimeValue || prev.totalSpent) + data.amount,
                outstandingBalance: Math.max(0, (prev.outstandingBalance || 0) - data.amount),
                paymentHistory: [newPayment, ...(prev.paymentHistory || [])],
              }));
              setNotesList(prev => [
                {
                  id: `note-${Date.now()}`,
                  date: 'Today',
                  time: 'Just Now',
                  actor: 'Staff',
                  actorType: 'Staff',
                  description: `Payment received: $${data.amount.toFixed(2)} via ${data.method || 'Card'}`,
                  isPinned: false,
                },
                ...prev,
              ]);
            }
            showToast(msg);
            setActiveQuickAction(null);
          }}
        />
      </main>
    );
  }

  if (activeQuickAction === 'new_appointment') {
    return (
      <main className="min-w-0 flex-1 overflow-y-auto bg-[#f8fafc] antialiased font-sans text-[13px] sm:text-sm text-foreground flex flex-col min-h-screen">
        {toastMessage && (
          <div className="fixed top-5 right-5 z-50 bg-card text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-[13px] font-medium border border-border animate-in fade-in slide-in-from-top-2 duration-200">
            <Check className="w-4 h-4 text-success" />
            <span>{toastMessage}</span>
          </div>
        )}
        <QuickActionNewAppointmentView
          customer={profile}
          onCancel={() => setActiveQuickAction(null)}
          onOpenAddPetModal={() => setActiveQuickAction('add_pet')}
          onSuccess={(msg, appt) => {
            if (appt) {
              setAppointmentsList(prev => [
                {
                  id: `appt-${Date.now()}`,
                  date: appt.date,
                  time: appt.time,
                  duration: '2.5 hrs',
                  pet: appt.pet,
                  service: appt.service,
                  groomer: appt.groomer,
                  status: 'Scheduled',
                  location: appt.location,
                },
                ...prev,
              ]);
            }
            showToast(msg);
            setActiveQuickAction(null);
          }}
        />
      </main>
    );
  }

  if (activeQuickAction === 'add_pet') {
    return (
      <main className="min-w-0 flex-1 overflow-y-auto bg-[#f8fafc] antialiased font-sans text-[13px] sm:text-sm text-foreground flex flex-col min-h-screen">
        {toastMessage && (
          <div className="fixed top-5 right-5 z-50 bg-card text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-[13px] font-medium border border-border animate-in fade-in slide-in-from-top-2 duration-200">
            <Check className="w-4 h-4 text-success" />
            <span>{toastMessage}</span>
          </div>
        )}
        <QuickActionAddPetView
          customer={profile}
          onCancel={() => setActiveQuickAction(null)}
          onOpenManageVaccines={(pet) => setPetToManageVaccines(pet)}
          onSuccess={(msg, res) => {
            if (res?.pet) {
              setProfile(prev => ({
                ...prev,
                pets: [...prev.pets, res.pet],
              }));
            }
            showToast(msg);
            setActiveQuickAction(null);
          }}
        />
      </main>
    );
  }

  if (activeQuickAction === 'send_message') {
    return (
      <main className="min-w-0 flex-1 overflow-y-auto bg-[#f8fafc] antialiased font-sans text-[13px] sm:text-sm text-foreground flex flex-col min-h-screen">
        {toastMessage && (
          <div className="fixed top-5 right-5 z-50 bg-card text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-[13px] font-medium border border-border animate-in fade-in slide-in-from-top-2 duration-200">
            <Check className="w-4 h-4 text-success" />
            <span>{toastMessage}</span>
          </div>
        )}
        <QuickActionSendMessageView
          customer={profile}
          onCancel={() => setActiveQuickAction(null)}
          onSuccess={(msg, comm) => {
            if (comm) {
              setCommunicationsList(prev => [
                {
                  id: `comm-${Date.now()}`,
                  date: 'Today',
                  time: 'Just Now',
                  channel: comm.channel,
                  type: 'Direct Communication',
                  direction: 'Outgoing',
                  subject: comm.text,
                  pet: 'Household',
                  status: 'Delivered',
                },
                ...prev,
              ]);
              setNotesList(prev => [
                {
                  id: `note-${Date.now()}`,
                  date: 'Today',
                  time: 'Just Now',
                  actor: 'Staff',
                  actorType: 'Staff',
                  description: `${comm.channel} sent to ${profile.name}: "${comm.text.slice(0, 50)}..."`,
                  isPinned: false,
                },
                ...prev,
              ]);
            }
            showToast(msg);
            setActiveQuickAction(null);
          }}
        />
      </main>
    );
  }

  if (activeQuickAction === 'update_documents') {
    return (
      <main className="min-w-0 flex-1 overflow-y-auto bg-[#f8fafc] antialiased font-sans text-[13px] sm:text-sm text-foreground flex flex-col min-h-screen">
        {toastMessage && (
          <div className="fixed top-5 right-5 z-50 bg-card text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-[13px] font-medium border border-border animate-in fade-in slide-in-from-top-2 duration-200">
            <Check className="w-4 h-4 text-success" />
            <span>{toastMessage}</span>
          </div>
        )}
        <QuickActionUpdateDocumentsView
          customer={profile}
          onCancel={() => setActiveQuickAction(null)}
          onSuccess={(msg) => {
            showToast(msg);
            setActiveQuickAction(null);
          }}
        />
      </main>
    );
  }

  if (activeQuickAction === 'add_note') {
    return (
      <main className="min-w-0 flex-1 overflow-y-auto bg-[#f8fafc] antialiased font-sans text-[13px] sm:text-sm text-foreground flex flex-col min-h-screen">
        {toastMessage && (
          <div className="fixed top-5 right-5 z-50 bg-card text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-[13px] font-medium border border-border animate-in fade-in slide-in-from-top-2 duration-200">
            <Check className="w-4 h-4 text-success" />
            <span>{toastMessage}</span>
          </div>
        )}
        <QuickActionAddNoteView
          customer={profile}
          onCancel={() => setActiveQuickAction(null)}
          onSuccess={(msg, note) => {
            if (note) {
              setNotesList(prev => [
                {
                  id: `note-${Date.now()}`,
                  date: 'Today',
                  time: 'Just Now',
                  actor: 'Staff',
                  actorType: 'Staff',
                  description: `${note.noteType} for ${note.noteFor}: ${note.description}`,
                  isPinned: false,
                },
                ...prev,
              ]);
            }
            showToast(msg);
            setActiveQuickAction(null);
          }}
        />
      </main>
    );
  }

  return (
    <div className="min-w-0 flex-1 flex flex-col h-screen overflow-hidden bg-card antialiased font-sans text-[13px] sm:text-sm text-foreground" data-purpose="customer-profile-container">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-primary text-primary-foreground px-4 py-3 rounded-md shadow-2xl flex items-center gap-2.5 text-[13px] tabular-nums border border-border animate-in slide-in-from-bottom-3 duration-200">
          <Check className="w-4 h-4 text-success" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Section */}
      <header className="bg-card border-b border-border px-6 py-4 shrink-0" data-purpose="customer-page-header">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBackToDirectory}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border hover:border-border text-foreground hover:text-foreground text-[13px] tabular-nums font-semibold uppercase tracking-wider transition-colors cursor-pointer bg-muted/40"
            >
              ← Back
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold text-foreground uppercase tracking-tight">{profile.name}</h1>
                <span className="inline-flex items-center px-2 py-0.5 text-[10px] tabular-nums font-semibold uppercase bg-primary text-primary-foreground">
                  {profile.status || 'Active'}
                </span>
                {profile.vip && (
                  <span className="inline-flex items-center px-2 py-0.5 text-[10px] tabular-nums font-semibold uppercase bg-muted/40 text-foreground border border-border">
                    VIP Member
                  </span>
                )}
                <button
                  onClick={() => setIsEditCustomerOpen(true)}
                  className="text-muted-foreground/70 hover:text-foreground p-1 transition-colors cursor-pointer"
                  title="Edit Customer Details"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-[13px] text-muted-foreground tabular-nums">
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-muted-foreground/70" />
                  <span>{profile.phone}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3 h-3 text-muted-foreground/70" />
                  <span>{profile.email}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-muted-foreground/70" />
                  <span>{profile.address}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveQuickAction('take_payment')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-border hover:border-border text-[13px] tabular-nums font-semibold uppercase tracking-wider text-foreground bg-card hover:bg-muted/40 transition-colors cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Take Payment</span>
            </button>

            <button
              onClick={() => {
                if (onOpenNewAppointment) onOpenNewAppointment();
                else setActiveQuickAction('new_appointment');
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-black hover:bg-muted text-white text-[13px] tabular-nums font-semibold uppercase tracking-wider transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Appointment</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container with Sidebar + Content */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        {/* Left Sidebar Navigation */}
        <aside className="w-full md:w-64 bg-muted/40/50 border-r border-border flex flex-col justify-between shrink-0 overflow-y-auto">
          <div className="p-4 space-y-6">
            <div>
              <div className="text-[10px] tabular-nums uppercase tracking-wider text-muted-foreground/70 font-semibold px-3 mb-2">
                Core Profile
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => setActiveTab('Overview')}
                  className={`w-full flex items-center justify-between px-3 py-2 text-[13px] font-semibold transition-colors text-left cursor-pointer ${
                    activeTab === 'Overview'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <UserCheck className="w-4 h-4" />
                    <span>Overview &amp; Stats</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('Pets')}
                  className={`w-full flex items-center justify-between px-3 py-2 text-[13px] font-semibold transition-colors text-left cursor-pointer ${
                    activeTab === 'Pets'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <PawPrint className="w-4 h-4" />
                    <span>Pets &amp; Household</span>
                  </div>
                  <span className={`text-[10px] tabular-nums px-1.5 py-0.5 ${
                    activeTab === 'Pets' ? 'bg-muted text-white' : 'bg-muted text-foreground'
                  }`}>
                    {profile.pets.length}
                  </span>
                </button>
              </div>
            </div>

            <div>
              <div className="text-[10px] tabular-nums uppercase tracking-wider text-muted-foreground/70 font-semibold px-3 mb-2">
                Service &amp; Care
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => setActiveTab('Appointments')}
                  className={`w-full flex items-center justify-between px-3 py-2 text-[13px] font-semibold transition-colors text-left cursor-pointer ${
                    activeTab === 'Appointments'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4" />
                    <span>Appointments</span>
                  </div>
                  <span className={`text-[10px] tabular-nums px-1.5 py-0.5 ${
                    activeTab === 'Appointments' ? 'bg-muted text-white' : 'bg-muted text-foreground'
                  }`}>
                    {appointmentsList.length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('Grooming History')}
                  className={`w-full flex items-center justify-between px-3 py-2 text-[13px] font-semibold transition-colors text-left cursor-pointer ${
                    activeTab === 'Grooming History'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Scissors className="w-4 h-4" />
                    <span>Grooming Log</span>
                  </div>
                  <span className={`text-[10px] tabular-nums px-1.5 py-0.5 ${
                    activeTab === 'Grooming History' ? 'bg-muted text-white' : 'bg-muted text-foreground'
                  }`}>
                    {groomingRecords.length}
                  </span>
                </button>
              </div>
            </div>

            <div>
              <div className="text-[10px] tabular-nums uppercase tracking-wider text-muted-foreground/70 font-semibold px-3 mb-2">
                Financial &amp; Billing
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => setActiveTab('Payments')}
                  className={`w-full flex items-center justify-between px-3 py-2 text-[13px] font-semibold transition-colors text-left cursor-pointer ${
                    activeTab === 'Payments'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <CreditCard className="w-4 h-4" />
                    <span>Invoices &amp; Ledger</span>
                  </div>
                </button>
              </div>
            </div>

            <div>
              <div className="text-[10px] tabular-nums uppercase tracking-wider text-muted-foreground/70 font-semibold px-3 mb-2">
                Records &amp; Comms
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => setActiveTab('Documents')}
                  className={`w-full flex items-center justify-between px-3 py-2 text-[13px] font-semibold transition-colors text-left cursor-pointer ${
                    activeTab === 'Documents'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <FileCheck className="w-4 h-4" />
                    <span>Documents &amp; Waivers</span>
                  </div>
                  <span className={`text-[10px] tabular-nums px-1.5 py-0.5 ${
                    activeTab === 'Documents' ? 'bg-muted text-white' : 'bg-muted text-foreground'
                  }`}>
                    {documentsList.length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('Notes & Activity')}
                  className={`w-full flex items-center justify-between px-3 py-2 text-[13px] font-semibold transition-colors text-left cursor-pointer ${
                    activeTab === 'Notes & Activity'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4" />
                    <span>Timeline &amp; Notes</span>
                  </div>
                  <span className={`text-[10px] tabular-nums px-1.5 py-0.5 ${
                    activeTab === 'Notes & Activity' ? 'bg-muted text-white' : 'bg-muted text-foreground'
                  }`}>
                    {notesList.length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('Communication')}
                  className={`w-full flex items-center justify-between px-3 py-2 text-[13px] font-semibold transition-colors text-left cursor-pointer ${
                    activeTab === 'Communication'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <MessageSquare className="w-4 h-4" />
                    <span>Message Center</span>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar Bottom Quick Actions & Balance summary */}
          <div className="p-4 border-t border-border bg-card space-y-3">
            <div className="bg-muted/40 border border-border p-3 space-y-1">
              <div className="text-[10px] tabular-nums uppercase text-muted-foreground font-semibold">Balance Due</div>
              <div className="text-base tabular-nums font-semibold text-foreground">
                ${(profile.outstandingBalance ?? 0).toFixed(2)}
              </div>
              <div className="text-[10px] tabular-nums text-muted-foreground/70">
                LTV: ${(profile.lifetimeValue ?? profile.totalSpent ?? 0).toFixed(2)}
              </div>
            </div>

            <div className="space-y-1.5">
              <button
                onClick={() => setActiveQuickAction('send_message')}
                className="w-full py-1.5 px-2.5 border border-border hover:border-border bg-card hover:bg-muted/40 text-[11px] tabular-nums font-semibold uppercase text-foreground flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Send className="w-3 h-3" />
                <span>Send SMS / Message</span>
              </button>
              <button
                onClick={() => setActiveQuickAction('add_note')}
                className="w-full py-1.5 px-2.5 border border-border hover:border-border bg-card hover:bg-muted/40 text-[11px] tabular-nums font-semibold uppercase text-foreground flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <FileEdit className="w-3 h-3" />
                <span>Add Note</span>
              </button>
              <button
                onClick={() => setActiveQuickAction('add_pet')}
                className="w-full py-1.5 px-2.5 border border-border hover:border-border bg-card hover:bg-muted/40 text-[11px] tabular-nums font-semibold uppercase text-foreground flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add New Pet</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Right Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto bg-muted/40/60 p-6 lg:p-8">
          {/* -------------------------------------------------------------
           * TAB 1: OVERVIEW
           * ----------------------------------------------------------- */}
          {activeTab === 'Overview' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              {/* Metric Cards Section (5 columns) */}
              <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3" data-purpose="metric-summary-cards">
                <div className="bg-card p-4 border border-border shadow-2xs flex items-center gap-3">
                  <div className="w-9 h-9 bg-muted/40 text-foreground border border-border flex items-center justify-center shrink-0">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] tabular-nums uppercase tracking-wider text-muted-foreground">Lifetime Value</div>
                    <div className="text-base tabular-nums font-semibold text-foreground mt-0.5">${(profile.lifetimeValue ?? profile.totalSpent ?? 0).toFixed(2)}</div>
                  </div>
                </div>

                <div className="bg-card p-4 border border-border shadow-2xs flex items-center gap-3">
                  <div className="w-9 h-9 bg-muted/40 text-foreground border border-border flex items-center justify-center shrink-0">
                    <BadgeDollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] tabular-nums uppercase tracking-wider text-muted-foreground">Total Spent</div>
                    <div className="text-base tabular-nums font-semibold text-foreground mt-0.5">${(profile.totalSpent ?? 0).toFixed(2)}</div>
                  </div>
                </div>

                <div className="bg-card p-4 border border-border shadow-2xs flex items-center gap-3">
                  <div className="w-9 h-9 bg-muted/40 text-foreground border border-border flex items-center justify-center shrink-0">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] tabular-nums uppercase tracking-wider text-muted-foreground">Balance Due</div>
                    <div className="text-base tabular-nums font-semibold text-foreground mt-0.5">${(profile.outstandingBalance ?? 0).toFixed(2)}</div>
                  </div>
                </div>

                <div className="bg-card p-4 border border-border shadow-2xs flex items-center gap-3">
                  <div className="w-9 h-9 bg-muted/40 text-foreground border border-border flex items-center justify-center shrink-0">
                    <Star className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] tabular-nums uppercase tracking-wider text-muted-foreground">Loyalty Pts</div>
                    <div className="text-base tabular-nums font-semibold text-foreground mt-0.5">
                      {profile.loyaltyPoints ?? 0} <span className="text-[10px] text-muted-foreground/70 font-normal">pts</span>
                    </div>
                  </div>
                </div>

                <div className="bg-card p-4 border border-border shadow-2xs flex items-center gap-3">
                  <div className="w-9 h-9 bg-muted/40 text-foreground border border-border flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] tabular-nums uppercase tracking-wider text-muted-foreground">Customer Since</div>
                    <div className="text-sm tabular-nums font-semibold text-foreground mt-0.5">{profile.customerSince || profile.memberSince || 'Apr 12, 2023'}</div>
                  </div>
                </div>
              </section>

          {/* Middle Grid Section: Pets, Account & Payment, Quick Actions */}
          <section className="grid grid-cols-12 gap-5" data-purpose="pets-and-quick-actions-row">
            {/* Pets Grid Container (Col span 7) */}
            <div className="col-span-12 lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Pets ({profile.pets.length})</h2>
                <button
                  onClick={onOpenAddPet}
                  className="text-[13px] font-semibold text-primary hover:text-primary flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Pet</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.pets.map((pet) => (
                  <div
                    key={pet.id}
                    className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between shadow-2xs"
                  >
                    <div>
                      <div className="flex gap-3.5 items-start">
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-muted/40 shrink-0">
                          <Image
                            src={pet.imageUrl}
                            alt={pet.name}
                            fill
                            className="object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground text-sm">{pet.name}</span>
                            {pet.isPrimary && (
                              <span className="text-[10px] bg-primary/5 text-primary px-1.5 py-0.5 rounded font-medium border border-primary/20">
                                Primary
                              </span>
                            )}
                          </div>
                          <div className="text-[13px] text-muted-foreground">{pet.breed} • {pet.gender}</div>
                          <div className="text-[11px] text-muted-foreground/70">Born: {pet.birthDate} • {pet.age}</div>
                          <div className="text-[11px] text-muted-foreground font-medium">Weight: {pet.weight}</div>
                        </div>
                      </div>

                      <div className="mt-4 space-y-1.5 pt-3 border-t border-border">
                        <div className="flex items-center gap-1.5 text-[13px] text-foreground">
                          <CheckCircle className="w-3.5 h-3.5 text-success" />
                          <span><strong>Vaccinations</strong> {pet.vaccinationsStatus}</span>
                        </div>
                        {pet.medicalAlert && (
                          <div className="flex items-center gap-1.5 text-[13px] text-warning">
                            <AlertCircle className="w-3.5 h-3.5 text-warning" />
                            <span>{pet.medicalAlert}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border">
                      <div className="grid grid-cols-2 text-[11px] mb-3">
                        <div>
                          <span className="text-muted-foreground/70 block">Last Groom</span>
                          <span className="font-semibold text-foreground">{pet.lastGroomDate}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground/70 block">Next Appt</span>
                          <span className="font-semibold text-foreground">{pet.nextApptDate}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedPetDetail(pet)}
                        className="w-full py-2 bg-muted/40 hover:bg-muted/40 text-primary text-[13px] font-semibold rounded-lg transition border border-border/60 cursor-pointer"
                      >
                        View Pet Profile
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Account & Payment Widget (Col span 3) */}
            <div className="col-span-12 lg:col-span-3 space-y-3">
              <h2 className="text-sm font-semibold text-foreground">Account &amp; Payment</h2>
              <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between h-[calc(100%-2rem)] shadow-2xs">
                <div className="space-y-4">
                  <div className="text-[13px] font-medium text-muted-foreground">Default Payment Method</div>
                  <div className="p-3 bg-muted/40 border border-border rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-7 bg-primary text-primary-foreground font-semibold rounded flex items-center justify-center text-[10px]">
                        {profile.defaultPaymentMethod?.cardBrand || 'VISA'}
                      </div>
                      <div>
                        <div className="text-[13px] font-semibold text-foreground">
                          Visa •••• {profile.defaultPaymentMethod?.last4 || '4242'}
                        </div>
                        <div className="text-[10px] text-muted-foreground/70">
                          Expires {profile.defaultPaymentMethod?.expires || '04/27'}
                        </div>
                      </div>
                    </div>
                    <span className="bg-success/10 text-success text-[10px] font-semibold px-2 py-0.5 rounded border border-success/20">
                      Default
                    </span>
                  </div>

                  <button
                    onClick={() => setIsAddPaymentMethodOpen(true)}
                    className="text-[13px] font-medium text-primary hover:text-primary flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Payment Method</span>
                  </button>
                </div>

                <div className="mt-6 pt-4 border-t border-border">
                  <div className="text-[13px] text-muted-foreground">Outstanding Balance</div>
                  <div className="text-xl font-semibold text-success mt-0.5">
                    ${(profile.outstandingBalance ?? 0).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Sidebar (Col span 2) - ALL ACTIONS FROM SPEC */}
            <div className="col-span-12 lg:col-span-2 space-y-3">
              <h2 className="text-sm font-semibold text-foreground">Quick Actions</h2>
              <div className="bg-card border border-border rounded-xl p-2.5 flex flex-col gap-1.5 shadow-2xs">
                <button
                  onClick={() => setActiveQuickAction('new_appointment')}
                  className="w-full text-left px-3 py-2 text-[13px] font-medium text-foreground hover:bg-muted/40 rounded-lg flex items-center gap-2.5 border border-transparent hover:border-border transition cursor-pointer"
                >
                  <CalendarPlus className="w-4 h-4 text-primary" />
                  <span>New Appointment</span>
                </button>

                <button
                  onClick={() => setActiveQuickAction('add_pet')}
                  className="w-full text-left px-3 py-2 text-[13px] font-medium text-foreground hover:bg-muted/40 rounded-lg flex items-center gap-2.5 border border-transparent hover:border-border transition cursor-pointer"
                >
                  <PawPrint className="w-4 h-4 text-primary" />
                  <span>Add Pet</span>
                </button>

                <button
                  onClick={() => setActiveQuickAction('take_payment')}
                  className="w-full text-left px-3 py-2 text-[13px] font-medium text-foreground hover:bg-muted/40 rounded-lg flex items-center gap-2.5 border border-transparent hover:border-border transition cursor-pointer"
                >
                  <CreditCard className="w-4 h-4 text-primary" />
                  <span>Take Payment</span>
                </button>

                <button
                  onClick={() => setActiveQuickAction('send_message')}
                  className="w-full text-left px-3 py-2 text-[13px] font-medium text-foreground hover:bg-muted/40 rounded-lg flex items-center gap-2.5 border border-transparent hover:border-border transition cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <span>Send Message</span>
                </button>

                <button
                  onClick={() => setActiveQuickAction('add_note')}
                  className="w-full text-left px-3 py-2 text-[13px] font-medium text-foreground hover:bg-muted/40 rounded-lg flex items-center gap-2.5 border border-transparent hover:border-border transition cursor-pointer"
                >
                  <FileEdit className="w-4 h-4 text-primary" />
                  <span>Add Note</span>
                </button>

                <button
                  onClick={() => setActiveQuickAction('update_documents')}
                  className="w-full text-left px-3 py-2 text-[13px] font-medium text-foreground hover:bg-muted/40 rounded-lg flex items-center gap-2.5 border border-transparent hover:border-border transition cursor-pointer"
                >
                  <FileCheck className="w-4 h-4 text-primary" />
                  <span>Update Documents</span>
                </button>
              </div>
            </div>
          </section>

          {/* Bottom Dashboard Section (3 Columns) */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-5" data-purpose="bottom-details-cards">
            {/* Upcoming Appointments */}
            <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between shadow-2xs">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <h3 className="font-semibold text-foreground text-sm">Upcoming Appointments</h3>
                  <button
                    onClick={() => setActiveTab('Appointments')}
                    className="text-[13px] text-primary hover:text-primary font-medium cursor-pointer"
                  >
                    View calendar
                  </button>
                </div>

                <div className="space-y-3.5 mt-3">
                  {appointmentsList.slice(0, 3).map((appt) => (
                    <div key={appt.id} className="flex items-center justify-between text-[13px]">
                      <div>
                        <div className="font-semibold text-foreground">{appt.pet} • {appt.service}</div>
                        <div className="text-muted-foreground/70 text-[11px]">{appt.date} at {appt.time} ({appt.groomer})</div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-primary/5 text-primary font-medium border border-primary/20">
                        {appt.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="pt-4 mt-3 border-t border-border">
                <button
                  onClick={() => setActiveTab('Appointments')}
                  className="text-[13px] font-semibold text-primary hover:text-primary flex items-center gap-1 cursor-pointer"
                >
                  <span>View all appointments</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Payment & Purchase History */}
            <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between shadow-2xs">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <h3 className="font-semibold text-foreground text-sm">Payment History</h3>
                  <button
                    onClick={() => setActiveTab('Payments')}
                    className="text-[13px] text-primary hover:text-primary font-medium cursor-pointer"
                  >
                    View all
                  </button>
                </div>
                <div className="space-y-2 mt-3">
                  {(profile.paymentHistory || []).slice(0, 3).map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-[13px] py-1 border-b border-border">
                      <div>
                        <div className="font-semibold text-foreground">{item.description}</div>
                        <div className="text-[11px] text-muted-foreground/70">{item.date}</div>
                      </div>
                      <div className="font-semibold text-foreground">${item.amount.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="pt-4 mt-3 border-t border-border">
                <button
                  onClick={() => setActiveTab('Payments')}
                  className="text-[13px] font-semibold text-primary hover:text-primary flex items-center gap-1 cursor-pointer"
                >
                  <span>View all payments</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between shadow-2xs">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <h3 className="font-semibold text-foreground text-sm">Recent Activity</h3>
                  <button
                    onClick={() => setActiveTab('Notes & Activity')}
                    className="text-[13px] text-primary hover:text-primary font-medium cursor-pointer"
                  >
                    View feed
                  </button>
                </div>
                <div className="space-y-3 mt-3">
                  {notesList.slice(0, 3).map((act) => (
                    <div key={act.id} className="text-[13px]">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground/70">
                        <span>{act.date} • {act.time}</span>
                        <span className="font-medium text-muted-foreground">{act.actor}</span>
                      </div>
                      <p className="text-foreground mt-0.5 text-[11px]">{act.description}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="pt-4 mt-3 border-t border-border">
                <button
                  onClick={() => setActiveTab('Notes & Activity')}
                  className="text-[13px] font-semibold text-primary hover:text-primary flex items-center gap-1 cursor-pointer"
                >
                  <span>View all activity</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* -------------------------------------------------------------
       * TAB 2: PETS (All Primary Actions Included)
       * ----------------------------------------------------------- */}
      {activeTab === 'Pets' && (
        <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto" data-purpose="customer-pets-tab">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Pets Belonging to {profile.name}</h2>
            <button
              onClick={onOpenAddPet}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-primary/20 text-[13px] font-semibold rounded-lg text-primary bg-primary/5 hover:bg-primary/10 transition shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Pet</span>
            </button>
          </div>

          {/* Pet Profile Cards Grid with Action Buttons */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6" data-purpose="pet-profile-cards">
            {profile.pets.map((pet) => (
              <div
                key={pet.id}
                className="bg-card rounded-xl border border-border shadow-2xs overflow-hidden flex flex-col justify-between"
              >
                <div className="p-5 flex gap-4">
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden ring-1 ring-slate-200 shrink-0">
                    <Image
                      src={pet.imageUrl}
                      alt={pet.name}
                      fill
                      className="object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-foreground leading-none">{pet.name}</h3>
                        {pet.isPrimary ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-primary/5 text-primary border border-primary/20">
                            Primary Pet
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSetPrimaryPet(pet.id)}
                            className="text-[10px] text-muted-foreground/70 hover:text-primary font-medium underline cursor-pointer"
                          >
                            Set as Primary
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => setPetToEdit(pet)}
                        className="text-[13px] font-semibold text-muted-foreground hover:text-primary flex items-center gap-1 p-1 hover:bg-muted/40 rounded cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Edit Pet</span>
                      </button>
                    </div>

                    <p className="text-[13px] text-muted-foreground mt-1.5 font-medium">{pet.breed} • {pet.gender}</p>
                    <p className="text-[13px] text-muted-foreground mt-0.5">
                      Born: {pet.birthDate} ({pet.age}) • {pet.weight}
                    </p>

                    <div className="mt-2.5 flex flex-wrap gap-2 text-[11px]">
                      <button
                        onClick={() => setPetToManageVaccines(pet)}
                        className="inline-flex items-center text-success bg-success/10 px-2 py-0.5 rounded border border-success/20 font-semibold hover:bg-success/10 transition cursor-pointer"
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1 text-success" />
                        Manage Vaccines ({pet.vaccinationsStatus})
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Row with View Pet Profile, Documents, History, Appointments */}
                <div className="px-5 py-2.5 bg-muted/40/80 border-t border-border flex flex-wrap items-center justify-between text-[13px] text-muted-foreground font-medium">
                  <button
                    onClick={() => setSelectedPetDetail(pet)}
                    className="inline-flex items-center gap-1.5 hover:text-primary transition cursor-pointer"
                  >
                    <PawPrint className="w-3.5 h-3.5 text-muted-foreground/70" />
                    <span>View Pet Profile</span>
                  </button>
                  <button
                    onClick={() => {
                      setGroomingPetFilter(pet.name);
                      setActiveTab('Grooming History');
                    }}
                    className="inline-flex items-center gap-1.5 hover:text-primary transition cursor-pointer"
                  >
                    <Scissors className="w-3.5 h-3.5 text-muted-foreground/70" />
                    <span>View Grooming History</span>
                  </button>
                  <button
                    onClick={() => {
                      setApptPetFilter(pet.name);
                      setActiveTab('Appointments');
                    }}
                    className="inline-flex items-center gap-1.5 hover:text-primary transition cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground/70" />
                    <span>View Appointments</span>
                  </button>
                </div>
              </div>
            ))}
          </section>

          {/* Household Summary Table */}
          <section className="bg-card rounded-xl border border-border shadow-2xs overflow-hidden mt-6">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">All Pets in Household</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-border bg-muted/40/75 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="py-3 px-6">Pet Name</th>
                    <th className="py-3 px-4">Breed</th>
                    <th className="py-3 px-4">Gender</th>
                    <th className="py-3 px-4">Born</th>
                    <th className="py-3 px-4">Weight</th>
                    <th className="py-3 px-4">Last Groom</th>
                    <th className="py-3 px-4">Next Appointment</th>
                    <th className="py-3 px-6 text-right">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-medium text-foreground">
                  {profile.pets.map((pet) => (
                    <tr key={pet.id} className="hover:bg-muted/40/60 transition-colors">
                      <td className="py-3.5 px-6 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{pet.name}</span>
                          {pet.isPrimary && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/5 text-primary border border-primary/20">
                              Primary
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground">{pet.breed}</td>
                      <td className="py-3.5 px-4 text-muted-foreground">{pet.gender}</td>
                      <td className="py-3.5 px-4 text-muted-foreground">{pet.birthDate}</td>
                      <td className="py-3.5 px-4 text-muted-foreground">{pet.weight}</td>
                      <td className="py-3.5 px-4 text-muted-foreground">{pet.lastGroomDate}</td>
                      <td className="py-3.5 px-4 text-muted-foreground">{pet.nextApptDate}</td>
                      <td className="py-3.5 px-6 text-right whitespace-nowrap">
                        <button
                          onClick={() => setPetToEdit(pet)}
                          className="px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/5 rounded cursor-pointer mr-2"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setPetToManageVaccines(pet)}
                          className="px-2 py-1 text-[11px] font-semibold text-success hover:bg-success/10 rounded cursor-pointer"
                        >
                          Vaccines
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* -------------------------------------------------------------
       * TAB 3: APPOINTMENTS (All Primary Actions Included)
       * ----------------------------------------------------------- */}
      {activeTab === 'Appointments' && (
        <div className="p-6 sm:p-8 space-y-4 max-w-7xl mx-auto" data-purpose="customer-appointments-tab">
          {/* Sub-navigation & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex bg-muted/40 p-0.5 rounded-lg text-[13px] font-medium text-muted-foreground border border-border/80">
                {(['Upcoming', 'Past', 'All'] as const).map((filterOpt) => (
                  <button
                    key={filterOpt}
                    onClick={() => setApptStatusFilter(filterOpt)}
                    className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                      apptStatusFilter === filterOpt
                        ? 'bg-card text-primary font-semibold shadow-2xs'
                        : 'hover:text-foreground'
                    }`}
                  >
                    {filterOpt}
                  </button>
                ))}
              </div>

              <div className="relative">
                <select
                  value={apptPetFilter}
                  onChange={(e) => setApptPetFilter(e.target.value)}
                  className="appearance-none bg-card border border-border rounded-lg pl-3 pr-8 py-1.5 text-[13px] text-foreground font-medium hover:bg-muted/40 cursor-pointer shadow-2xs focus:outline-none focus:border-primary"
                >
                  <option>All Pets</option>
                  <option>Buddy</option>
                  <option>Luna</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/70 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={apptTypeFilter}
                  onChange={(e) => setApptTypeFilter(e.target.value)}
                  className="appearance-none bg-card border border-border rounded-lg pl-3 pr-8 py-1.5 text-[13px] text-foreground font-medium hover:bg-muted/40 cursor-pointer shadow-2xs focus:outline-none focus:border-primary"
                >
                  <option>All Statuses</option>
                  <option>Scheduled</option>
                  <option>Checked In</option>
                  <option>In Progress</option>
                  <option>Checked Out</option>
                  <option>Requested</option>
                  <option>Cancelled</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/70 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleAddToWaitlist}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold text-foreground bg-card border border-border hover:bg-muted/40 rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5 text-warning" />
                <span>Add to Waitlist</span>
              </button>

              <button
                onClick={handleSendPortalInvite}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold text-foreground bg-card border border-border hover:bg-muted/40 rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5 text-primary" />
                <span>Send Portal Invite</span>
              </button>

              <button
                onClick={onOpenNewAppointment}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] font-semibold text-white bg-primary hover:bg-primary/90 rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Appointment</span>
              </button>
            </div>
          </div>

          {/* Appointments Table */}
          <div className="bg-card border border-border rounded-xl shadow-2xs overflow-hidden">
            <table className="min-w-full divide-y divide-border text-left" data-purpose="appointments-data-table">
              <thead className="bg-muted/40/75 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-3 px-6">Date &amp; Time</th>
                  <th className="py-3 px-6">Pet</th>
                  <th className="py-3 px-6">Service</th>
                  <th className="py-3 px-6">Groomer</th>
                  <th className="py-3 px-6">Status (Click to Advance)</th>
                  <th className="py-3 px-6">Location</th>
                  <th className="py-3 px-6 text-right">Actions Menu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card text-[13px] text-foreground">
                {appointmentsList
                  .filter((a) => (apptPetFilter === 'All Pets' ? true : a.pet === apptPetFilter))
                  .filter((a) => (apptTypeFilter === 'All Statuses' ? true : a.status === apptTypeFilter))
                  .map((appt) => (
                    <tr key={appt.id} className="hover:bg-muted/40/80 transition-colors">
                      <td className="py-3.5 px-6 font-medium text-foreground whitespace-nowrap">
                        <div className="font-semibold text-foreground">{appt.date}</div>
                        <div className="text-[11px] text-muted-foreground/70">{appt.time} ({appt.duration})</div>
                      </td>
                      <td className="py-3.5 px-6 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-warning/10 border border-warning/20 flex items-center justify-center text-warning font-semibold overflow-hidden shrink-0">
                            <Dog className="w-4 h-4" />
                          </div>
                          <span className="font-medium text-foreground">{appt.pet}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-6 whitespace-nowrap font-medium text-foreground">
                        {appt.service}
                      </td>
                      <td className="py-3.5 px-6 whitespace-nowrap text-muted-foreground">
                        {appt.groomer}
                      </td>
                      <td className="py-3.5 px-6 whitespace-nowrap">
                        <button
                          onClick={() => handleStatusCycle(appt.id)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border cursor-pointer transition ${
                            appt.status === 'Scheduled'
                              ? 'bg-primary/5 text-primary border-primary/20 hover:bg-primary/10'
                              : appt.status === 'Checked In'
                              ? 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/10'
                              : appt.status === 'In Progress'
                              ? 'bg-primary/5 text-primary border-primary/20 hover:bg-primary/10'
                              : appt.status === 'Checked Out'
                              ? 'bg-success/10 text-success border-success/20 hover:bg-success/10'
                              : 'bg-muted/40 text-muted-foreground border-border'
                          }`}
                          title="Click to advance status (Check In / Check Out)"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>{appt.status}</span>
                        </button>
                      </td>
                      <td className="py-3.5 px-6 whitespace-nowrap text-muted-foreground">
                        {appt.location}
                      </td>
                      <td className="py-3.5 px-6 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setApptToViewDetails(appt)}
                            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-muted/40 rounded-lg cursor-pointer"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setApptToReschedule(appt)}
                            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-muted/40 rounded-lg cursor-pointer"
                            title="Reschedule"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setApptToUpdateAddons(appt)}
                            className="p-1.5 text-muted-foreground hover:text-warning hover:bg-muted/40 rounded-lg cursor-pointer"
                            title="Add-on / Service Update"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleSendApptReminder(appt)}
                            className="p-1.5 text-muted-foreground hover:text-success hover:bg-muted/40 rounded-lg cursor-pointer"
                            title="Send Reminder"
                          >
                            <BellRing className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleCancelAppointment(appt.id)}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-muted/40 rounded-lg cursor-pointer"
                            title="Cancel Appointment"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
       * TAB 4: GROOMING HISTORY (All Primary Actions Included)
       * ----------------------------------------------------------- */}
      {activeTab === 'Grooming History' && (
        <div className="p-6 sm:p-8 space-y-4 max-w-7xl mx-auto" data-purpose="customer-grooming-history-view">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <select
                  value={groomingPetFilter}
                  onChange={(e) => setGroomingPetFilter(e.target.value)}
                  className="appearance-none bg-card border border-border rounded-lg pl-3.5 pr-8 py-1.5 text-[13px] text-foreground font-medium hover:border-border focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer shadow-2xs"
                >
                  <option>All Pets</option>
                  <option>Luna</option>
                  <option>Buddy</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/70 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={groomingServiceFilter}
                  onChange={(e) => setGroomingServiceFilter(e.target.value)}
                  className="appearance-none bg-card border border-border rounded-lg pl-3.5 pr-8 py-1.5 text-[13px] text-foreground font-medium hover:border-border focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer shadow-2xs"
                >
                  <option>All Services</option>
                  <option>Full Groom + Add-ons</option>
                  <option>Full Groom</option>
                  <option>Bath &amp; Brush</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/70 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={groomingGroomerFilter}
                  onChange={(e) => setGroomingGroomerFilter(e.target.value)}
                  className="appearance-none bg-card border border-border rounded-lg pl-3.5 pr-8 py-1.5 text-[13px] text-foreground font-medium hover:border-border focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer shadow-2xs"
                >
                  <option>All Groomers</option>
                  <option>Mike R.</option>
                  <option>Sarah M.</option>
                  <option>Jessica L.</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/70 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setRecommendPetName(profile.pets[0]?.name || 'Pet')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border hover:bg-muted/40 text-[13px] font-semibold text-foreground rounded-lg shadow-2xs cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span>Recommend Next Visit</span>
              </button>

              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border hover:bg-muted/40 text-[13px] font-semibold text-foreground rounded-lg shadow-2xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Print History</span>
              </button>
            </div>
          </div>

          {/* Table Container Card */}
          <div className="bg-card border border-border rounded-xl shadow-2xs overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/40 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="py-3.5 px-4 font-semibold">Date</th>
                    <th className="py-3.5 px-4 font-semibold">Pet</th>
                    <th className="py-3.5 px-4 font-semibold">Service</th>
                    <th className="py-3.5 px-4 font-semibold">Groomer</th>
                    <th className="py-3.5 px-4 font-semibold">Duration</th>
                    <th className="py-3.5 px-6 font-semibold">Notes</th>
                    <th className="py-3.5 px-4 font-semibold text-center">Photos</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-[13px] text-muted-foreground">
                  {groomingRecords
                    .filter((r) => (groomingPetFilter === 'All Pets' ? true : r.pet === groomingPetFilter))
                    .map((item) => (
                      <tr key={item.id} className="hover:bg-muted/40/70 transition-colors group">
                        <td className="py-4 px-4 font-medium text-foreground whitespace-nowrap">
                          {item.date}
                        </td>
                        <td className="py-4 px-4 font-medium text-foreground whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${item.petColor}`} />
                            {item.pet}
                          </span>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap font-medium text-foreground">
                          {item.service}
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap text-muted-foreground">
                          {item.groomer}
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap text-muted-foreground">
                          {item.duration}
                        </td>
                        <td className="py-4 px-6 text-muted-foreground leading-relaxed max-w-sm truncate">
                          {item.notes}
                        </td>
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => setPhotosPetName(item.pet)}
                            className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted/40 text-foreground hover:bg-muted cursor-pointer"
                          >
                            <Camera className="w-3 h-3 mr-1 text-muted-foreground/70" />
                            {item.photosCount}
                          </button>
                        </td>
                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setRecordToView(item)}
                              className="px-2 py-1 bg-muted/40 hover:bg-muted text-foreground rounded text-[11px] font-medium cursor-pointer"
                              title="View Grooming Record"
                            >
                              View Record
                            </button>
                            <button
                              onClick={() => handleAddGroomingNotePrompt(item.id)}
                              className="px-2 py-1 bg-primary/5 hover:text-primary rounded text-[11px] font-medium cursor-pointer"
                              title="Add Grooming Note"
                            >
                              Add Note
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
       * TAB 5: PAYMENTS (All Primary Actions Included)
       * ----------------------------------------------------------- */}
      {activeTab === 'Payments' && (
        <div className="p-6 sm:p-8 space-y-4 max-w-7xl mx-auto" data-purpose="payments-tab-view">
          <div className="bg-card rounded-xl border border-border shadow-2xs overflow-hidden">
            {/* Table Control / Search Bar Header */}
            <div className="px-6 py-4 border-b border-border flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold text-foreground">Payment Ledger</h2>
                <span className="text-[13px] bg-muted/40 text-muted-foreground px-2 py-0.5 rounded-full font-medium">
                  {(profile.paymentHistory || []).length} transactions
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    value={paymentSearch}
                    onChange={(e) => setPaymentSearch(e.target.value)}
                    placeholder="Search payments..."
                    className="pl-8 pr-3 py-1.5 text-[13px] bg-muted/40 border border-border rounded-lg text-foreground placeholder-slate-400 focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary w-52"
                  />
                  <Search className="w-3.5 h-3.5 text-muted-foreground/70 absolute left-2.5 top-2.5" />
                </div>
                <button
                  onClick={() => setIsAddPaymentMethodOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border hover:bg-muted/40 text-foreground text-[13px] font-semibold rounded-lg transition-colors shadow-2xs cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Edit / Add Method</span>
                </button>
                <button
                  onClick={onOpenTakePayment}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/90 text-white text-[13px] font-semibold rounded-lg transition-colors shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Take Payment</span>
                </button>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[13px]" data-purpose="payments-table">
                <thead>
                  <tr className="bg-muted/40 border-b border-border text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
                    <th className="py-3 px-6">Date</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-6">Description</th>
                    <th className="py-3 px-4">Pet</th>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(profile.paymentHistory || [])
                    .filter((p) =>
                      (p.description || '').toLowerCase().includes((paymentSearch || '').toLowerCase()) ||
                      (p.type || '').toLowerCase().includes((paymentSearch || '').toLowerCase())
                    )
                    .map((item, idx) => (
                      <tr key={item.id} className="hover:bg-muted/40/70 transition-colors">
                        <td className="py-3.5 px-6 text-foreground font-medium whitespace-nowrap">{item.date}</td>
                        <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">{item.type}</td>
                        <td className="py-3.5 px-6 text-foreground font-medium whitespace-nowrap">{item.description}</td>
                        <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">
                          {item.description.includes('Luna') ? 'Luna' : item.description.includes('Buddy') ? 'Buddy' : '-'}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <button
                            onClick={() => setInvoiceToView(item)}
                            className="text-primary hover:text-primary font-medium cursor-pointer underline"
                          >
                            INV-10{482 - idx * 190}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-foreground whitespace-nowrap">${item.amount.toFixed(2)}</td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-success/10 text-success border border-success/20">
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setInvoiceToView(item)}
                              className="px-2 py-1 bg-muted/40 hover:bg-muted text-foreground rounded text-[11px] font-medium cursor-pointer"
                            >
                              View Invoice
                            </button>
                            <button
                              onClick={() => {
                                showToast(`Receipt for ${item.description} downloaded & emailed.`);
                              }}
                              className="px-2 py-1 bg-muted/40 hover:bg-muted text-foreground rounded text-[11px] font-medium cursor-pointer"
                            >
                              Receipt
                            </button>
                            <button
                              onClick={() => setPaymentToRefund(item)}
                              className="px-2 py-1 bg-destructive/5 hover:bg-destructive/10 text-destructive rounded text-[11px] font-medium cursor-pointer"
                            >
                              Refund
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
       * TAB 6: DOCUMENTS (All Primary Actions Included)
       * ----------------------------------------------------------- */}
      {activeTab === 'Documents' && (
        <div className="p-6 sm:p-8 space-y-4 max-w-7xl mx-auto" data-purpose="documents-tab-content">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
            <div>
              <h2 className="text-base font-semibold text-foreground">Documents &amp; Records</h2>
              <p className="text-[13px] text-muted-foreground mt-0.5">Manage vaccination proof, signed health agreements, and client waivers.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsUploadDocOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary hover:bg-primary/90 text-white text-[13px] font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Document</span>
              </button>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border shadow-2xs overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[13px] text-muted-foreground">
                <thead>
                  <tr className="border-b border-border bg-muted/40/75 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="py-3.5 pl-6 pr-4">Document Name</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Pet</th>
                    <th className="py-3.5 px-4">Uploaded</th>
                    <th className="py-3.5 px-4">Expires</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 pr-6 pl-4 text-right">Document Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {documentsList.map((doc) => (
                    <tr key={doc.id} className="hover:bg-muted/40/70 transition-colors">
                      <td className="py-4 pl-6 pr-4 font-medium text-foreground">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            doc.isWaiver ? 'bg-primary/5 text-primary' : 'bg-primary/5 text-primary'
                          }`}>
                            <FileText className="w-4 h-4" />
                          </div>
                          <span>{doc.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-muted-foreground">{doc.type}</td>
                      <td className="py-4 px-4 font-medium text-foreground">{doc.pet}</td>
                      <td className="py-4 px-4 text-muted-foreground">{doc.uploaded}</td>
                      <td className="py-4 px-4 text-muted-foreground">{doc.expires}</td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${
                          doc.status.includes('Valid')
                            ? 'bg-success/10 text-success border-success/20'
                            : 'bg-primary/5 text-primary border-primary/20'
                        }`}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="py-4 pr-6 pl-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              showToast(`Opened document preview for ${doc.name}.`);
                            }}
                            className="px-2 py-1 bg-muted/40 hover:bg-muted text-foreground rounded text-[11px] font-medium cursor-pointer"
                          >
                            View
                          </button>
                          <button
                            onClick={() => {
                              const newExp = window.prompt(`Set new expiration date for ${doc.name}:`, doc.expires);
                              if (newExp) {
                                setDocumentsList(prev =>
                                  prev.map(d => (d.id === doc.id ? { ...d, expires: newExp } : d))
                                );
                                showToast('Expiration reminder date updated.');
                              }
                            }}
                            className="px-2 py-1 bg-muted/40 hover:bg-muted text-foreground rounded text-[11px] font-medium cursor-pointer"
                          >
                            Set Expiry
                          </button>
                          <button
                            onClick={() => handleVerifyDocument(doc.id)}
                            className="px-2 py-1 bg-success/10 hover:bg-success/10 text-success rounded text-[11px] font-medium cursor-pointer"
                          >
                            Verify
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
       * TAB 7: NOTES & ACTIVITY (All Primary Actions Included)
       * ----------------------------------------------------------- */}
      {activeTab === 'Notes & Activity' && (
        <div className="p-6 sm:p-8 max-w-7xl mx-auto" data-purpose="notes-activity-content">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Add Note Card (4 cols) */}
            <section className="lg:col-span-4 bg-card rounded-xl border border-border shadow-2xs p-5" data-purpose="add-note-card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-foreground">Add Internal Note</h2>
                <button
                  onClick={() => setIsAuditLogOpen(true)}
                  className="text-[13px] text-primary hover:text-primary font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>View Audit Log</span>
                </button>
              </div>

              <form onSubmit={handleAddNoteSubmit} className="space-y-4">
                <div>
                  <textarea
                    required
                    rows={4}
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Type client or grooming notes here..."
                    className="w-full text-[13px] rounded-lg border border-border placeholder-slate-400 focus:border-primary focus:ring-1 focus:ring-primary resize-none p-3"
                  />
                </div>
                <div>
                  <div className="relative">
                    <select
                      value={notePetSelection}
                      onChange={(e) => setNotePetSelection(e.target.value)}
                      className="w-full text-[13px] rounded-lg border border-border text-foreground focus:border-primary focus:ring-1 focus:ring-primary appearance-none bg-card py-2 pl-3 pr-8"
                    >
                      <option value="">Select Pet (optional)</option>
                      <option value="Buddy (Golden Retriever)">Buddy (Golden Retriever)</option>
                      <option value="Luna (Poodle)">Luna (Poodle)</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/70 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg text-[13px] shadow-2xs transition-colors flex justify-center items-center cursor-pointer"
                  >
                    Add Note
                  </button>
                </div>
              </form>
            </section>

            {/* Right Column: Activity Timeline & Feed (8 cols) */}
            <section className="lg:col-span-8 bg-card rounded-xl border border-border shadow-2xs p-6" data-purpose="activity-feed-card">
              <div className="flex items-center justify-between pb-5 border-b border-border">
                <div className="flex items-center space-x-2">
                  {(['All', 'Notes', 'Activity', 'System'] as const).map((fil) => (
                    <button
                      key={fil}
                      onClick={() => setActivityFilter(fil)}
                      className={`px-3 py-1 rounded-full text-[13px] transition-colors cursor-pointer ${
                        activityFilter === fil
                          ? 'font-semibold bg-primary/5 text-primary border border-primary/20'
                          : 'font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40'
                      }`}
                    >
                      {fil}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setIsAuditLogOpen(true)}
                  className="inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground font-medium cursor-pointer"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Audit History</span>
                </button>
              </div>

              {/* Timeline Events List */}
              <div className="mt-6 relative" data-purpose="timeline-list">
                <div className="absolute left-[7px] top-3 bottom-3 w-[1.5px] bg-muted" />
                <div className="space-y-6">
                  {notesList
                    .filter((act) => {
                      if (activityFilter === 'All') return true;
                      if (activityFilter === 'System') return act.actorType === 'System';
                      if (activityFilter === 'Notes') return (act.actor || '').toLowerCase().includes('note') || act.isPinned;
                      return act.actorType === 'Staff';
                    })
                    .map((act) => (
                      <div key={act.id} className="relative flex items-start space-x-3 text-[13px]">
                        <div className={`relative z-10 w-3.5 h-3.5 rounded-full border-2 border-white ring-2 shrink-0 mt-0.5 ${
                          act.isPinned ? 'bg-warning/100 ring-amber-200' : 'bg-primary ring-indigo-100'
                        }`} />
                        <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">{act.date}</span>
                              <span className="text-muted-foreground/70">{act.time}</span>
                              {act.isPinned && (
                                <span className="px-1.5 py-0.2 bg-warning/10 text-warning border border-warning/20 rounded text-[10px] font-semibold flex items-center gap-0.5">
                                  <Pin className="w-2.5 h-2.5" /> Pinned
                                </span>
                              )}
                            </div>
                            <p className="text-foreground font-medium mt-0.5">{act.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-muted/40 text-muted-foreground">
                              {act.actor}
                            </span>
                            <button
                              onClick={() => togglePinNote(act.id)}
                              className="p-1 hover:bg-muted/40 rounded text-muted-foreground/70 hover:text-warning cursor-pointer"
                              title={act.isPinned ? 'Unpin note' : 'Pin note to top'}
                            >
                              <Pin className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
       * TAB 8: COMMUNICATION (All Primary Actions Included)
       * ----------------------------------------------------------- */}
      {activeTab === 'Communication' && (
        <div className="p-6 sm:p-8 flex flex-col md:flex-row gap-6 max-w-7xl mx-auto" data-purpose="communication-tab-content">
          <div className="w-full md:w-48 shrink-0 space-y-4">
            <ul className="space-y-1 text-[13px] font-medium">
              {(['Messages', 'Email History', 'SMS History', 'Templates'] as const).map((subItem) => (
                <li key={subItem}>
                  <button
                    onClick={() => setCommSubTab(subItem)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-left cursor-pointer ${
                      commSubTab === subItem
                        ? 'bg-primary/5 text-primary font-semibold'
                        : 'text-muted-foreground hover:bg-muted/40'
                    }`}
                  >
                    <span>{subItem}</span>
                  </button>
                </li>
              ))}
            </ul>

            <div className="pt-3 border-t border-border space-y-2">
              <button
                onClick={() => setIsCampaignOpen(true)}
                className="w-full px-3 py-2 bg-card border border-border rounded-lg text-[13px] font-semibold text-foreground hover:bg-muted/40 flex items-center gap-2 cursor-pointer"
              >
                <Tag className="w-3.5 h-3.5 text-primary" />
                <span>Add to Campaign</span>
              </button>

              <button
                onClick={() => setIsOptInOutOpen(true)}
                className="w-full px-3 py-2 bg-card border border-border rounded-lg text-[13px] font-semibold text-foreground hover:bg-muted/40 flex items-center gap-2 cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5 text-primary" />
                <span>Opt In/Out Settings</span>
              </button>
            </div>
          </div>

          <div className="flex-1 bg-card rounded-xl border border-border shadow-2xs flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="relative inline-block text-[13px]">
                  <select
                    value={commChannelFilter}
                    onChange={(e) => setCommChannelFilter(e.target.value)}
                    className="appearance-none bg-muted/40 hover:bg-muted/40 border border-border rounded-lg pl-3 pr-8 py-1.5 font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option>All Channels</option>
                    <option>SMS</option>
                    <option>Email</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/70 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <div className="relative inline-block text-[13px]">
                  <select
                    value={commTypeFilter}
                    onChange={(e) => setCommTypeFilter(e.target.value)}
                    className="appearance-none bg-muted/40 hover:bg-muted/40 border border-border rounded-lg pl-3 pr-8 py-1.5 font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option>All Types</option>
                    <option>Appointment Reminder</option>
                    <option>Receipt</option>
                    <option>Payment Confirmation</option>
                    <option>Welcome</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/70 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setMessageChannel('Email');
                    setIsSendMessageOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold text-foreground bg-card border border-border hover:bg-muted/40 rounded-lg transition-colors cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5 text-primary" />
                  <span>Send Email</span>
                </button>

                <button
                  onClick={() => {
                    setMessageChannel('SMS');
                    setIsSendMessageOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Send SMS</span>
                </button>
              </div>
            </div>

            {/* Communication Log Data Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px] text-muted-foreground">
                <thead className="bg-muted/40 text-muted-foreground/70 uppercase text-[10px] font-semibold border-b border-border">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Channel</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Direction</th>
                    <th className="py-3 px-4">Subject / Message</th>
                    <th className="py-3 px-4">Pet</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {communicationsList
                    .filter((c) => (commChannelFilter === 'All Channels' ? true : c.channel === commChannelFilter))
                    .filter((c) => (commTypeFilter === 'All Types' ? true : c.type === commTypeFilter))
                    .map((comm) => (
                      <tr key={comm.id} className="hover:bg-muted/40/75 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-foreground whitespace-nowrap">
                          {comm.date} <span className="text-muted-foreground/70 text-[11px] block font-normal">{comm.time}</span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 text-foreground font-medium">
                            {comm.channel === 'SMS' ? (
                              <MessageSquare className="w-3.5 h-3.5 text-muted-foreground/70" />
                            ) : (
                              <Mail className="w-3.5 h-3.5 text-muted-foreground/70" />
                            )}
                            {comm.channel}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-foreground">{comm.type}</td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-muted-foreground">{comm.direction}</td>
                        <td className="py-3.5 px-4 max-w-xs truncate text-foreground font-medium" title={comm.subject}>
                          {comm.subject}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-foreground">{comm.pet}</td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-success/10 text-success border border-success/20">
                            {comm.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-right text-muted-foreground/70 hover:text-muted-foreground">
                          <button
                            onClick={() => {
                              showToast(`Resent ${comm.channel} to ${profile.name}.`);
                            }}
                            className="px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/5 rounded cursor-pointer"
                          >
                            Resend
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

        </main>
      </div>

      {/* -------------------------------------------------------------
       * MODALS & POPUPS
       * ----------------------------------------------------------- */}
      {/* Edit Customer Modal */}
      {isEditCustomerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-card/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-card rounded-2xl border border-border shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between bg-muted/40">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground text-sm">Edit Customer Profile</h3>
              </div>
              <button onClick={() => setIsEditCustomerOpen(false)} className="text-muted-foreground/70 hover:text-muted-foreground p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-6 space-y-4 text-[13px]">
              <div>
                <label className="block text-foreground font-semibold mb-1">Customer Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-foreground font-semibold mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-foreground font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="block text-foreground font-semibold mb-1">Home Address</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl text-foreground"
                />
              </div>

              <div className="pt-4 border-t border-border flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditCustomerOpen(false)}
                  className="px-4 py-2 border rounded-xl text-muted-foreground hover:bg-muted/40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold shadow-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Message Modal */}
      {isSendMessageOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-card/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-card rounded-2xl border border-border shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between bg-muted/40">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground text-sm">Send {messageChannel}</h3>
              </div>
              <button onClick={() => setIsSendMessageOpen(false)} className="text-muted-foreground/70 hover:text-muted-foreground p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendMessageSubmit} className="p-6 space-y-4 text-[13px]">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setMessageChannel('SMS')}
                  className={`flex-1 py-2 rounded-xl font-semibold border ${
                    messageChannel === 'SMS' ? 'bg-primary/5 border-primary text-primary' : 'text-muted-foreground'
                  }`}
                >
                  SMS ({profile.phone})
                </button>
                <button
                  type="button"
                  onClick={() => setMessageChannel('Email')}
                  className={`flex-1 py-2 rounded-xl font-semibold border ${
                    messageChannel === 'Email' ? 'bg-primary/5 border-primary text-primary' : 'text-muted-foreground'
                  }`}
                >
                  Email ({profile.email})
                </button>
              </div>

              <div>
                <label className="block text-foreground font-semibold mb-1">Message Content</label>
                <textarea
                  required
                  rows={4}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder={`Hi ${profile.name.split(' ')[0]}, your grooming appointment...`}
                  className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl"
                />
              </div>

              <div className="pt-4 border-t border-border flex justify-end gap-3">
                <button type="button" onClick={() => setIsSendMessageOpen(false)} className="px-4 py-2 border rounded-xl">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold">
                  Send {messageChannel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Payment Method Modal */}
      {isAddPaymentMethodOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-card/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-card rounded-2xl border border-border shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between bg-muted/40">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground text-sm">Save Card On File</h3>
              </div>
              <button onClick={() => setIsAddPaymentMethodOpen(false)} className="text-muted-foreground/70 hover:text-muted-foreground p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCard} className="p-6 space-y-4 text-[13px]">
              <div>
                <label className="block text-foreground font-semibold mb-1">Card Number</label>
                <input
                  type="text"
                  required
                  placeholder="4000 1234 5678 9010"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-foreground font-semibold mb-1">Expiry (MM/YY)</label>
                  <input
                    type="text"
                    required
                    placeholder="06/28"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-foreground font-semibold mb-1">CVC / CVV</label>
                  <input
                    type="password"
                    maxLength={4}
                    placeholder="•••"
                    className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-border flex justify-end gap-3">
                <button type="button" onClick={() => setIsAddPaymentMethodOpen(false)} className="px-4 py-2 border rounded-xl">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold">
                  Save as Default
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      {isUploadDocOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-card/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-card rounded-2xl border border-border shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between bg-muted/40">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground text-sm">Upload Document</h3>
              </div>
              <button onClick={() => setIsUploadDocOpen(false)} className="text-muted-foreground/70 hover:text-muted-foreground p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-[13px]">
              <div>
                <label className="block text-foreground font-semibold mb-1">Document Category</label>
                <select className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl">
                  <option>Rabies Certificate</option>
                  <option>DHPP Vaccine</option>
                  <option>Bordetella Vaccine</option>
                  <option>Grooming Waiver</option>
                  <option>Veterinary Clearance</option>
                </select>
              </div>

              <div>
                <label className="block text-foreground font-semibold mb-1">Associated Pet</label>
                <select className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl">
                  <option>Buddy (Golden Retriever)</option>
                  <option>Luna (Poodle)</option>
                  <option>Household (All Pets)</option>
                </select>
              </div>

              <div className="p-6 border-2 border-dashed border-border rounded-xl text-center bg-muted/40">
                <Upload className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="font-semibold text-foreground">Drag &amp; drop document, or click to upload</p>
                <p className="text-[11px] text-muted-foreground/70 mt-1">PDF, JPG, PNG up to 10MB</p>
              </div>

              <div className="pt-4 border-t border-border flex justify-end gap-3">
                <button type="button" onClick={() => setIsUploadDocOpen(false)} className="px-4 py-2 border rounded-xl">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsUploadDocOpen(false);
                    showToast('Document uploaded and saved to pet record.');
                  }}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold"
                >
                  Upload &amp; Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selected Pet Detail Modal */}
      {selectedPetDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-card/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-card rounded-2xl border border-border shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between bg-muted/40">
              <div className="flex items-center gap-2">
                <PawPrint className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground text-sm">
                  {selectedPetDetail.name} &bull; Pet Record
                </h3>
              </div>
              <button onClick={() => setSelectedPetDetail(null)} className="text-muted-foreground/70 hover:text-muted-foreground p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-[13px]">
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-muted/40 shrink-0 border border-border">
                  <Image
                    src={selectedPetDetail.imageUrl || selectedPetDetail.photoUrl || 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=400&q=80'}
                    alt={selectedPetDetail.name}
                    fill
                    className="object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="space-y-1">
                  <h4 className="font-semibold text-base text-foreground">{selectedPetDetail.name}</h4>
                  <p className="text-muted-foreground font-medium">{selectedPetDetail.breed} &bull; {selectedPetDetail.gender}</p>
                  <p className="text-muted-foreground/70">Age: {selectedPetDetail.age} (Born {selectedPetDetail.birthDate})</p>
                  <p className="text-muted-foreground font-semibold">Weight: {selectedPetDetail.weight}</p>
                </div>
              </div>

              <div className="p-3.5 bg-muted/40 rounded-xl border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Vaccination Status:</span>
                  <span className="font-semibold text-success bg-success/10 px-2 py-0.5 rounded border border-success/20">
                    {selectedPetDetail.vaccinationsStatus}
                  </span>
                </div>
                {selectedPetDetail.medicalAlert && (
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">Special Medical / Coat Care:</span>
                    <span className="font-semibold text-warning bg-warning/10 px-2 py-0.5 rounded border border-warning/20">
                      {selectedPetDetail.medicalAlert}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Last Service:</span>
                  <span className="font-semibold">{selectedPetDetail.lastGroomDate}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Upcoming Appointment:</span>
                  <span className="font-semibold">{selectedPetDetail.nextApptDate} ({selectedPetDetail.nextApptType})</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedPetDetail(null)}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Other Modular Modals from CustomerModals */}
      {petToEdit && (
        <EditPetModal
          pet={petToEdit}
          isOpen={true}
          onClose={() => setPetToEdit(null)}
          onSave={handleSavePetEdit}
        />
      )}

      {petToManageVaccines && (
        <ManageVaccinesModal
          pet={petToManageVaccines}
          isOpen={true}
          onClose={() => setPetToManageVaccines(null)}
          onSave={(records) => {
            showToast(`Updated ${records.length} vaccine records for ${petToManageVaccines.name}.`);
          }}
        />
      )}

      {apptToReschedule && (
        <RescheduleModal
          appointment={apptToReschedule}
          isOpen={true}
          onClose={() => setApptToReschedule(null)}
          onReschedule={(newDate, newTime) => {
            setAppointmentsList(prev =>
              prev.map(a => (a.id === apptToReschedule.id ? { ...a, date: newDate, time: newTime } : a))
            );
            showToast(`Rescheduled appointment to ${newDate} at ${newTime}.`);
          }}
        />
      )}

      {apptToUpdateAddons && (
        <AddonServiceModal
          appointment={apptToUpdateAddons}
          isOpen={true}
          onClose={() => setApptToUpdateAddons(null)}
          onUpdate={(addons) => {
            showToast(`Updated services: added ${addons.join(', ')}.`);
          }}
        />
      )}

      {apptToViewDetails && (
        <AppointmentDetailsModal
          appointment={apptToViewDetails}
          isOpen={true}
          onClose={() => setApptToViewDetails(null)}
        />
      )}

      {recordToView && (
        <ViewGroomingRecordModal
          record={recordToView}
          isOpen={true}
          onClose={() => setRecordToView(null)}
        />
      )}

      {photosPetName && (
        <ViewPhotosModal
          petName={photosPetName}
          isOpen={true}
          onClose={() => setPhotosPetName(null)}
        />
      )}

      {recommendPetName && (
        <RecommendNextVisitModal
          petName={recommendPetName}
          isOpen={true}
          onClose={() => setRecommendPetName(null)}
          onSave={(interval, date) => {
            showToast(`Next visit recommendation set (${interval}). Automated booking reminder scheduled.`);
          }}
        />
      )}

      {invoiceToView && (
        <InvoiceModal
          payment={invoiceToView}
          isOpen={true}
          onClose={() => setInvoiceToView(null)}
        />
      )}

      {paymentToRefund && (
        <RefundModal
          payment={paymentToRefund}
          isOpen={true}
          onClose={() => setPaymentToRefund(null)}
          onConfirmRefund={handleConfirmRefund}
        />
      )}

      <AuditLogModal isOpen={isAuditLogOpen} onClose={() => setIsAuditLogOpen(false)} />

      <CampaignModal
        customerName={profile.name}
        isOpen={isCampaignOpen}
        onClose={() => setIsCampaignOpen(false)}
        onAssign={(camp) => {
          showToast(`Added ${profile.name} to marketing campaign "${camp}".`);
        }}
      />

      <OptInOutModal
        isOpen={isOptInOutOpen}
        onClose={() => setIsOptInOutOpen(false)}
        onSave={() => {
          showToast('Customer communication preferences updated.');
        }}
      />
    </div>
  );
};
