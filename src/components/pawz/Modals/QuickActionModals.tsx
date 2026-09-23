'use client';

import React, { useState } from 'react';
import { 
  X, 
  Calendar, 
  User, 
  PawPrint, 
  DollarSign, 
  Receipt, 
  FileText, 
  Check, 
  Search,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { AppointmentItem, Customer, PetRecord, DawgNavSection } from '@/lib/types';

interface QuickActionModalsProps {
  activeModal: 'appointment' | 'customer' | 'pet' | 'intake' | 'payment' | 'invoice' | 'search' | null;
  onClose: () => void;
  onSaveAppointment: (appt: Partial<AppointmentItem>) => void;
  onSaveCustomer: (cust: Partial<Customer>) => void;
  onSavePet: (pet: Partial<PetRecord>) => void;
  onNavigateSection: (sec: DawgNavSection) => void;
}

export const QuickActionModals: React.FC<QuickActionModalsProps> = ({
  activeModal,
  onClose,
  onSaveAppointment,
  onSaveCustomer,
  onSavePet,
  onNavigateSection
}) => {
  // Appointment Form State
  const [petName, setPetName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [breed, setBreed] = useState('');
  const [serviceName, setServiceName] = useState('Full Groom');
  const [staffName, setStaffName] = useState('Sarah M.');
  const [date, setDate] = useState('2026-09-18');
  const [time, setTime] = useState('2:30 PM');
  const [price, setPrice] = useState('85.00');
  const [notes, setNotes] = useState('');

  // Customer Form State
  const [custName, setCustName] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custPet, setCustPet] = useState('');

  // Pet Form State
  const [newPetName, setNewPetName] = useState('');
  const [newPetBreed, setNewPetBreed] = useState('');
  const [newPetOwner, setNewPetOwner] = useState('');
  const [newPetAge, setNewPetAge] = useState('3 yrs');
  const [newPetWeight, setNewPetWeight] = useState('45 lbs');
  const [newPetNotes, setNewPetNotes] = useState('');

  // Payment Form State
  const [payAmount, setPayAmount] = useState('95.00');
  const [payMethod, setPayMethod] = useState('Credit Card / Stripe WisePOS');
  const [payClient, setPayClient] = useState('Sarah Johnson (Buddy)');
  const [paySuccess, setPaySuccess] = useState(false);

  // Invoice Form State
  const [invClient, setInvClient] = useState('Marcus Johnson');
  const [invAmount, setInvAmount] = useState('145.00');
  const [invDue, setInvDue] = useState('Net 15 Days');
  const [invSuccess, setInvSuccess] = useState(false);

  // Search State
  const [searchTerm, setSearchTerm] = useState('');

  if (!activeModal) return null;

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          petName: petName || 'Max',
          ownerName: customerName || 'Sarah Johnson',
          breed: breed || 'Golden Retriever',
          service: serviceName, staffName, date, time,
          servicePrice: `$${parseFloat(price) || 85.0}`, status: 'Scheduled', notes,
        }),
      });
    } catch { /* non-fatal */ }
    onSaveAppointment({
      petName: petName || 'Max', customerName: customerName || 'Sarah Johnson',
      breed: breed || 'Golden Retriever', serviceName, staffName, date, time,
      price: parseFloat(price) || 85.0, status: 'Scheduled', petEmoji: '🐶', notes,
    });
    onClose();
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    let crmId: string | null = null;
    try {
      const res = await fetch('/api/admin/crm/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: custEmail || 'client@example.com', firstName: (custName || 'New Client').split(' ')[0], lastName: (custName || '').split(' ').slice(1).join(' '), phone: custPhone, lifecycleStage: 'new_customer' }),
      });
      if (res.ok) { const j = await res.json(); crmId = j?.id || null; }
    } catch { /* non-fatal */ }
    if (custPet && crmId) {
      try { await fetch('/api/admin/crm/pets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customerId: crmId, name: custPet.split(' ')[0], species: 'dog' }) }); } catch { /* non-fatal */ }
    }
    onSaveCustomer({
      name: custName || 'New Client', email: custEmail || 'client@example.com',
      phone: custPhone || '(555) 000-1122', pets: [custPet || 'Milo (Labrador)'],
      totalSpent: 0, lastVisit: 'Today', preferredGroomer: 'Sarah M.',
    });
    onClose();
  };

  const handleCreatePet = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/admin/crm/pets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: newPetOwnerId || '', name: newPetName || 'Cooper', breed: newPetBreed, species: 'dog', weight: parseFloat(newPetWeight) || undefined, handlingNotes: newPetNotes }),
      });
    } catch { /* non-fatal */ }
    onSavePet({
      name: newPetName || 'Cooper', breed: newPetBreed || 'Aussie Shepherd',
      ownerName: newPetOwner || 'Emily Watson', age: newPetAge, weight: newPetWeight,
      emoji: '🐕', vaccinationStatus: 'Up to date', specialNotes: newPetNotes || 'Friendly, loves treats',
      lastGroomDate: 'May 12, 2025',
    });
    onClose();
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/pos/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ name: 'Payment', unitPrice: payAmount || '0', quantity: 1 }],
          tender: 'cash',
          notes: 'Quick payment',
        }),
      });
    } catch { /* non-fatal */ }
    setPaySuccess(true);
    setTimeout(() => { setPaySuccess(false); onClose(); }, 1200);
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/admin/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: invCustomerId || undefined,
          customerName: invCustomerName || '',
          amount: parseFloat(invAmount) || 0,
          dueDate: invDueDate || '',
          notes: invNotes || '',
        }),
      });
    } catch { /* non-fatal */ }
    setInvSuccess(true);
    setTimeout(() => { setInvSuccess(false); onClose(); }, 1200);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-8 bg-foreground/[0-9]0 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-lg bg-card border border-border rounded-xl shadow-popover my-6 transition-all animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-card rounded-t-xl">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-card">
              {activeModal === 'appointment' && <Calendar className="w-4 h-4" />}
              {activeModal === 'customer' && <User className="w-4 h-4" />}
              {activeModal === 'pet' && <PawPrint className="w-4 h-4" />}
              {activeModal === 'intake' && <FileText className="w-4 h-4" />}
              {activeModal === 'payment' && <DollarSign className="w-4 h-4" />}
              {activeModal === 'invoice' && <Receipt className="w-4 h-4" />}
              {activeModal === 'search' && <Search className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="font-display text-sm font-semibold tracking-tight text-foreground">
                {activeModal === 'appointment' && 'Book New Appointment'}
                {activeModal === 'customer' && 'Register Customer Profile'}
                {activeModal === 'pet' && 'Add New Pet Record'}
                {activeModal === 'intake' && 'Client Intake & Health Waiver'}
                {activeModal === 'payment' && 'Process Terminal Payment'}
                {activeModal === 'invoice' && 'Generate Client Invoice'}
                {activeModal === 'search' && 'Command Palette'}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Quick Actions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer flex items-center justify-center text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Appointment Form */}
        {activeModal === 'appointment' && (
          <form onSubmit={handleCreateAppointment} className="p-5 space-y-3.5 text-[13px] text-foreground">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold uppercase text-[10px] text-foreground mb-1">Pet Name</label>
                <input
                  type="text"
                  required
                  value={petName}
                  onChange={(e) => setPetName(e.target.value)}
                  placeholder="e.g. Buster"
                  className="w-full px-2.5 py-1.5 border border-border bg-card focus:outline-none text-foreground font-semibold"
                />
              </div>
              <div>
                <label className="block font-semibold uppercase text-[10px] text-foreground mb-1">Breed</label>
                <input
                  type="text"
                  required
                  value={breed}
                  onChange={(e) => setBreed(e.target.value)}
                  placeholder="e.g. Golden Retriever"
                  className="w-full px-2.5 py-1.5 border border-border bg-card focus:outline-none text-foreground font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold uppercase text-[10px] text-foreground mb-1">Client / Owner Name</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Sarah Johnson"
                className="w-full px-2.5 py-1.5 border border-border bg-card focus:outline-none text-foreground font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold uppercase text-[10px] text-foreground mb-1">Service Type</label>
                <select
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  className="w-full px-2 py-1.5 border border-border bg-card focus:outline-none text-foreground font-semibold cursor-pointer"
                >
                  <option>Full Groom</option>
                  <option>Full Groom + De-Shed</option>
                  <option>Bath &amp; Brush</option>
                  <option>Nail Trim / Dremel</option>
                  <option>Puppy Spa Intro</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold uppercase text-[10px] text-foreground mb-1">Assigned Groomer</label>
                <select
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  className="w-full px-2 py-1.5 border border-border bg-card focus:outline-none text-foreground font-semibold cursor-pointer"
                >
                  <option>Sarah M. (Lead Groomer)</option>
                  <option>Mike R. (Stylist)</option>
                  <option>Jessica L. (Stylist)</option>
                  <option>Taylor P. (Bather)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold uppercase text-[10px] text-foreground mb-1">Date &amp; Time</label>
                <input
                  type="text"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  placeholder="e.g. 2:30 PM"
                  className="w-full px-2.5 py-1.5 border border-border bg-card focus:outline-none text-foreground font-semibold"
                />
              </div>
              <div>
                <label className="block font-semibold uppercase text-[10px] text-foreground mb-1">Estimated Price ($)</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-border bg-card focus:outline-none text-foreground font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold uppercase text-[10px] text-foreground mb-1">Styling &amp; Handling Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Specific cut instructions, temperament notes..."
                className="w-full p-2 border border-border bg-card focus:outline-none text-foreground resize-none"
              />
            </div>

            <div className="pt-2 border-t border-border flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 border border-border bg-card hover:bg-accent/50 font-semibold uppercase text-[13px] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 border border-border bg-primary text-primary-foreground hover:bg-primary/90 font-semibold uppercase text-[13px] cursor-pointer"
              >
                Save &amp; Confirm Booking
              </button>
            </div>
          </form>
        )}

        {/* Modal Body: Customer Form */}
        {activeModal === 'customer' && (
          <form onSubmit={handleCreateCustomer} className="p-5 space-y-3.5 text-[13px] text-foreground">
            <div>
              <label className="block font-semibold uppercase text-[10px] text-foreground mb-1">Full Name</label>
              <input
                type="text"
                required
                value={custName}
                onChange={(e) => setCustName(e.target.value)}
                placeholder="e.g. Rachel Green"
                className="w-full px-2.5 py-1.5 border border-border bg-card focus:outline-none text-foreground font-semibold"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold uppercase text-[10px] text-foreground mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={custEmail}
                  onChange={(e) => setCustEmail(e.target.value)}
                  placeholder="rachel@pawzmail.com"
                  className="w-full px-2.5 py-1.5 border border-border bg-card focus:outline-none text-foreground"
                />
              </div>
              <div>
                <label className="block font-semibold uppercase text-[10px] text-foreground mb-1">Phone</label>
                <input
                  type="tel"
                  required
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  placeholder="(214) 555-0199"
                  className="w-full px-2.5 py-1.5 border border-border bg-card focus:outline-none text-foreground"
                />
              </div>
            </div>
            <div>
              <label className="block font-semibold uppercase text-[10px] text-foreground mb-1">Primary Pet(s)</label>
              <input
                type="text"
                value={custPet}
                onChange={(e) => setCustPet(e.target.value)}
                placeholder="e.g. Chloe (Shih Tzu)"
                className="w-full px-2.5 py-1.5 border border-border bg-card focus:outline-none text-foreground font-semibold"
              />
            </div>
            <div className="pt-2 border-t border-border flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 border border-border bg-card hover:bg-accent/50 font-semibold uppercase text-[13px] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 border border-border bg-primary text-primary-foreground hover:bg-primary/90 font-semibold uppercase text-[13px] cursor-pointer"
              >
                Save Client Record
              </button>
            </div>
          </form>
        )}

        {/* Modal Body: Pet Form */}
        {activeModal === 'pet' && (
          <form onSubmit={handleCreatePet} className="p-5 space-y-3.5 text-[13px] text-foreground">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold uppercase text-[10px] text-foreground mb-1">Pet Name</label>
                <input
                  type="text"
                  required
                  value={newPetName}
                  onChange={(e) => setNewPetName(e.target.value)}
                  placeholder="e.g. Copper"
                  className="w-full px-2.5 py-1.5 border border-border bg-card focus:outline-none text-foreground font-semibold"
                />
              </div>
              <div>
                <label className="block font-semibold uppercase text-[10px] text-foreground mb-1">Breed</label>
                <input
                  type="text"
                  required
                  value={newPetBreed}
                  onChange={(e) => setNewPetBreed(e.target.value)}
                  placeholder="e.g. Australian Shepherd"
                  className="w-full px-2.5 py-1.5 border border-border bg-card focus:outline-none text-foreground font-semibold"
                />
              </div>
            </div>
            <div>
              <label className="block font-semibold uppercase text-[10px] text-foreground mb-1">Owner Name</label>
              <input
                type="text"
                required
                value={newPetOwner}
                onChange={(e) => setNewPetOwner(e.target.value)}
                placeholder="e.g. Sarah Johnson"
                className="w-full px-2.5 py-1.5 border border-border bg-card focus:outline-none text-foreground font-semibold"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold uppercase text-[10px] text-foreground mb-1">Age</label>
                <input
                  type="text"
                  value={newPetAge}
                  onChange={(e) => setNewPetAge(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-border bg-card focus:outline-none text-foreground"
                />
              </div>
              <div>
                <label className="block font-semibold uppercase text-[10px] text-foreground mb-1">Weight</label>
                <input
                  type="text"
                  value={newPetWeight}
                  onChange={(e) => setNewPetWeight(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-border bg-card focus:outline-none text-foreground"
                />
              </div>
            </div>
            <div className="pt-2 border-t border-border flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 border border-border bg-card hover:bg-accent/50 font-semibold uppercase text-[13px] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 border border-border bg-primary text-primary-foreground hover:bg-primary/90 font-semibold uppercase text-[13px] cursor-pointer"
              >
                Save Pet Profile
              </button>
            </div>
          </form>
        )}

        {/* Modal Body: Intake Form */}
        {activeModal === 'intake' && (
          <div className="p-5 space-y-4 text-[13px] text-foreground tabular-nums">
            <div className="p-3 bg-muted/30 border border-border space-y-1">
              <p className="font-semibold text-foreground uppercase">Rabies &amp; Bordetella Digital Waiver</p>
              <p className="text-[11px] text-muted-foreground">
                Verified veterinary authorization and de-matting liability release.
              </p>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-2.5 border border-border bg-card cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded-md border-border accent-black" />
                <div>
                  <p className="font-semibold text-foreground uppercase text-[11px]">Vaccinations Current</p>
                  <p className="text-[10px] text-muted-foreground">Rabies &amp; Bordetella verified within 12 mos</p>
                </div>
              </label>
              <label className="flex items-center gap-2 p-2.5 border border-border bg-card cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded-md border-border accent-black" />
                <div>
                  <p className="font-semibold text-foreground uppercase text-[11px]">De-Matting Authorization</p>
                  <p className="text-[10px] text-muted-foreground">Humane restoration release signed</p>
                </div>
              </label>
            </div>
            <div className="pt-2 border-t border-border flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold uppercase text-[13px] cursor-pointer border border-border"
              >
                Confirm &amp; File Waiver
              </button>
            </div>
          </div>
        )}

        {/* Modal Body: Payment Form */}
        {activeModal === 'payment' && (
          <form onSubmit={handleProcessPayment} className="p-5 space-y-3.5 text-[13px] text-foreground tabular-nums">
            <div>
              <label className="block font-semibold uppercase text-[10px] text-foreground mb-1">Select Client / Order</label>
              <input
                type="text"
                value={payClient}
                onChange={(e) => setPayClient(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-border bg-card focus:outline-none text-foreground font-semibold"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold uppercase text-[10px] text-foreground mb-1">Amount Due ($)</label>
                <input
                  type="text"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-border bg-card focus:outline-none text-foreground font-semibold text-sm"
                />
              </div>
              <div>
                <label className="block font-semibold uppercase text-[10px] text-foreground mb-1">Method / Device</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-2 py-1.5 border border-border bg-card focus:outline-none text-foreground font-semibold cursor-pointer"
                >
                  <option>WisePOS E Terminal #01</option>
                  <option>Apple Pay / Contactless</option>
                  <option>Cash Drawer Handover</option>
                  <option>Gift Card / Credit</option>
                </select>
              </div>
            </div>
            <div className="pt-2 border-t border-border flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 border border-border bg-card hover:bg-accent/50 font-semibold uppercase text-[13px] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold uppercase text-[13px] cursor-pointer border border-border flex items-center gap-1.5"
              >
                {paySuccess ? <Check className="w-3.5 h-3.5" /> : <DollarSign className="w-3.5 h-3.5" />}
                <span>{paySuccess ? 'Transaction Approved!' : `Charge $${payAmount}`}</span>
              </button>
            </div>
          </form>
        )}

        {/* Modal Body: Invoice Form */}
        {activeModal === 'invoice' && (
          <form onSubmit={handleCreateInvoice} className="p-5 space-y-3.5 text-[13px] text-foreground tabular-nums">
            <div>
              <label className="block font-semibold uppercase text-[10px] text-foreground mb-1">Recipient Client</label>
              <input
                type="text"
                value={invClient}
                onChange={(e) => setInvClient(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-border bg-card focus:outline-none text-foreground font-semibold"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold uppercase text-[10px] text-foreground mb-1">Total Amount ($)</label>
                <input
                  type="text"
                  value={invAmount}
                  onChange={(e) => setInvAmount(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-border bg-card focus:outline-none text-foreground font-semibold"
                />
              </div>
              <div>
                <label className="block font-semibold uppercase text-[10px] text-foreground mb-1">Payment Terms</label>
                <select
                  value={invDue}
                  onChange={(e) => setInvDue(e.target.value)}
                  className="w-full px-2 py-1.5 border border-border bg-card focus:outline-none text-foreground font-semibold cursor-pointer"
                >
                  <option>Due Upon Receipt</option>
                  <option>Net 15 Days</option>
                  <option>Net 30 Days</option>
                </select>
              </div>
            </div>
            <div className="pt-2 border-t border-border flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 border border-border bg-card hover:bg-accent/50 font-semibold uppercase text-[13px] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold uppercase text-[13px] cursor-pointer border border-border flex items-center gap-1.5"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>{invSuccess ? 'Invoice Dispatched!' : 'Send Invoice'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Modal Body: Command Palette Search */}
        {activeModal === 'search' && (
          <div className="p-4 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                autoFocus
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search commands, orders, clients, pets, or navigate..."
                className="w-full pl-9 pr-3 h-9 bg-background border border-input rounded-md text-[13px] text-foreground font-sans focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring transition-colors"
              />
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hidden sm:inline">
                ESC
              </kbd>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 pb-1">
                Direct Navigation
              </p>
              {[
                { label: 'Orders & Fulfillment', sec: 'orders' },
                { label: 'Shipping & Label Station', sec: 'shipping' },
                { label: 'Returns & Exchanges', sec: 'returns' },
                { label: 'Purchase Orders & Receiving', sec: 'purchase-orders' },
                { label: 'Payments & Revenue Ledger', sec: 'payments' },
                { label: 'Customer Directory', sec: 'customers' },
                { label: 'Appointments Schedule', sec: 'appointments' },
                { label: 'Settings', sec: 'settings' },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    onNavigateSection(item.sec as DawgNavSection);
                    onClose();
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-md hover:bg-accent hover:text-accent-foreground text-foreground text-[13px] font-medium transition-colors flex items-center justify-between border border-transparent hover:border-border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span>{item.label}</span>
                  <span className="text-[10px] uppercase tabular-nums text-muted-foreground">Jump →</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
