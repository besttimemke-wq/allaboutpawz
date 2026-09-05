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
  Clock, 
  Scissors, 
  Sparkles,
  Search
} from 'lucide-react';
import { AppointmentItem, Customer, PetRecord, DawgNavSection } from '@/lib/dawg-types';

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
  // Appointment form state
  const [petName, setPetName] = useState('');
  const [breed, setBreed] = useState('');
  const [serviceName, setServiceName] = useState('Full Groom');
  const [staffName, setStaffName] = useState('Sarah M.');
  const [time, setTime] = useState('2:00 PM');
  const [price, setPrice] = useState('85.00');
  const [notes, setNotes] = useState('');

  // Customer form state
  const [custName, setCustName] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custPet, setCustPet] = useState('');

  // Pet form state
  const [newPetName, setNewPetName] = useState('');
  const [newPetBreed, setNewPetBreed] = useState('');
  const [newPetOwner, setNewPetOwner] = useState('');
  const [newPetAge, setNewPetAge] = useState('3 yrs');
  const [newPetWeight, setNewPetWeight] = useState('45 lbs');
  const [newPetNotes, setNewPetNotes] = useState('');

  // Payment form state
  const [payAmount, setPayAmount] = useState('95.00');
  const [payMethod, setPayMethod] = useState('Credit Card / Stripe');
  const [payClient, setPayClient] = useState('Emily Watson (Buddy)');
  const [paySuccess, setPaySuccess] = useState(false);

  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  if (!activeModal) return null;

  const handleCreateAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveAppointment({
      petName: petName || 'Max',
      breed: breed || 'Golden Retriever',
      serviceName,
      staffName,
      time,
      price: parseFloat(price) || 85.0,
      status: 'Scheduled',
      petEmoji: '🐶',
      notes,
    });
    onClose();
  };

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveCustomer({
      name: custName || 'New Client',
      email: custEmail || 'client@example.com',
      phone: custPhone || '(555) 000-1122',
      pets: [custPet || 'Milo (Labrador)'],
      totalSpent: 0,
      lastVisit: 'Today',
      preferredGroomer: 'Sarah M.',
    });
    onClose();
  };

  const handleCreatePet = (e: React.FormEvent) => {
    e.preventDefault();
    onSavePet({
      name: newPetName || 'Cooper',
      breed: newPetBreed || 'Aussie Shepherd',
      ownerName: newPetOwner || 'Emily Watson',
      age: newPetAge,
      weight: newPetWeight,
      emoji: '🐕',
      vaccinationStatus: 'Up to date',
      specialNotes: newPetNotes || 'Friendly, loves treats',
      lastGroomDate: 'May 12, 2025',
    });
    onClose();
  };

  const handleProcessPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setPaySuccess(true);
    setTimeout(() => {
      setPaySuccess(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div 
        className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden my-6 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
              {activeModal === 'appointment' && <Calendar className="w-5 h-5" />}
              {activeModal === 'customer' && <User className="w-5 h-5" />}
              {activeModal === 'pet' && <PawPrint className="w-5 h-5" />}
              {activeModal === 'intake' && <FileText className="w-5 h-5" />}
              {activeModal === 'payment' && <DollarSign className="w-5 h-5" />}
              {activeModal === 'invoice' && <Receipt className="w-5 h-5" />}
              {activeModal === 'search' && <Search className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {activeModal === 'appointment' && 'Book New Appointment'}
                {activeModal === 'customer' && 'Add Customer Profile'}
                {activeModal === 'pet' && 'Add New Pet'}
                {activeModal === 'intake' && 'Client Intake & Health Waiver'}
                {activeModal === 'payment' && 'Process Grooming Payment'}
                {activeModal === 'invoice' && 'Generate Invoice'}
                {activeModal === 'search' && 'Quick Search (Ctrl+K)'}
              </h2>
              <p className="text-xs text-slate-500">
                All About Pawz OS • Main Location
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Appointment Form */}
        {activeModal === 'appointment' && (
          <form onSubmit={handleCreateAppointment} className="p-6 space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Pet Name</label>
                <input
                  type="text"
                  required
                  value={petName}
                  onChange={(e) => setPetName(e.target.value)}
                  placeholder="e.g. Buster"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Breed</label>
                <input
                  type="text"
                  required
                  value={breed}
                  onChange={(e) => setBreed(e.target.value)}
                  placeholder="e.g. Labradoodle"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Service Type</label>
                <select
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 bg-white"
                >
                  <option>Full Groom</option>
                  <option>Full Groom + Add-ons</option>
                  <option>Bath & Brush</option>
                  <option>Nail Trim</option>
                  <option>De-shedding Treatment</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Assigned Groomer</label>
                <select
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 bg-white"
                >
                  <option>Sarah M. (Groomer)</option>
                  <option>Mike R. (Groomer)</option>
                  <option>Jessica L. (Groomer)</option>
                  <option>Taylor P. (Bather)</option>
                  <option>Alex D. (Bather)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Time Slot</label>
                <input
                  type="text"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  placeholder="e.g. 2:30 PM"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Estimated Price ($)</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Styling / Health Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Special shampoo requests, blade instructions, behavioral notes..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors shadow-2xs"
              >
                Confirm Appointment
              </button>
            </div>
          </form>
        )}

        {/* Modal Body: Customer Form */}
        {activeModal === 'customer' && (
          <form onSubmit={handleCreateCustomer} className="p-6 space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Full Name</label>
              <input
                type="text"
                required
                value={custName}
                onChange={(e) => setCustName(e.target.value)}
                placeholder="e.g. Jessica Alba"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={custEmail}
                  onChange={(e) => setCustEmail(e.target.value)}
                  placeholder="jessica@example.com"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  placeholder="(555) 888-9900"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800"
                />
              </div>
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Primary Pet (Name & Breed)</label>
              <input
                type="text"
                value={custPet}
                onChange={(e) => setCustPet(e.target.value)}
                placeholder="e.g. Rocky (Golden Retriever)"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800"
              />
            </div>
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors shadow-2xs"
              >
                Save Customer
              </button>
            </div>
          </form>
        )}

        {/* Modal Body: Add Pet */}
        {activeModal === 'pet' && (
          <form onSubmit={handleCreatePet} className="p-6 space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Pet Name</label>
                <input
                  type="text"
                  required
                  value={newPetName}
                  onChange={(e) => setNewPetName(e.target.value)}
                  placeholder="e.g. Teddy"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Breed</label>
                <input
                  type="text"
                  required
                  value={newPetBreed}
                  onChange={(e) => setNewPetBreed(e.target.value)}
                  placeholder="e.g. Bernedoodle"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Age</label>
                <input
                  type="text"
                  value={newPetAge}
                  onChange={(e) => setNewPetAge(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none text-slate-800"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Weight</label>
                <input
                  type="text"
                  value={newPetWeight}
                  onChange={(e) => setNewPetWeight(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none text-slate-800"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Owner Name</label>
                <input
                  type="text"
                  value={newPetOwner}
                  onChange={(e) => setNewPetOwner(e.target.value)}
                  placeholder="Emily Watson"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none text-slate-800"
                />
              </div>
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Behavior & Health Notes</label>
              <textarea
                value={newPetNotes}
                onChange={(e) => setNewPetNotes(e.target.value)}
                rows={2}
                placeholder="Nervous with dryers, loves peanut butter lick mats..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800"
              />
            </div>
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors shadow-2xs"
              >
                Save Pet Record
              </button>
            </div>
          </form>
        )}

        {/* Modal Body: Intake Form */}
        {activeModal === 'intake' && (
          <div className="p-6 space-y-4 text-xs">
            <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-2xl space-y-1 text-slate-700">
              <p className="font-bold text-indigo-950">Rabies & Bordetella Digital Verification</p>
              <p className="text-[11px] text-slate-500">
                All About Pawz OS automatically scans veterinary records and requests digital e-signatures for matting waivers.
              </p>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 p-3 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4 accent-indigo-600" />
                <div>
                  <p className="font-semibold text-slate-800">Vaccinations Verified</p>
                  <p className="text-[10px] text-slate-400">Rabies, DHPP, and Bordetella current within 12 months</p>
                </div>
              </label>

              <label className="flex items-center gap-2 p-3 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4 accent-indigo-600" />
                <div>
                  <p className="font-semibold text-slate-800">De-matting & Shave Down Authorization</p>
                  <p className="text-[10px] text-slate-400">Customer agrees to humane coat restoration if severely pelted</p>
                </div>
              </label>

              <label className="flex items-center gap-2 p-3 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4 accent-indigo-600" />
                <div>
                  <p className="font-semibold text-slate-800">Veterinary Emergency Release</p>
                  <p className="text-[10px] text-slate-400">Authorization for immediate medical transport if required</p>
                </div>
              </label>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors shadow-2xs"
              >
                Complete Digital Intake
              </button>
            </div>
          </div>
        )}

        {/* Modal Body: Payment */}
        {activeModal === 'payment' && (
          <form onSubmit={handleProcessPayment} className="p-6 space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Select Client / Pet</label>
              <input
                type="text"
                value={payClient}
                onChange={(e) => setPayClient(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none text-slate-800"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Amount Due ($)</label>
                <input
                  type="text"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none text-slate-800 font-bold text-sm"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none text-slate-800 bg-white"
                >
                  <option>Credit Card / Terminal</option>
                  <option>Apple Pay / Contactless</option>
                  <option>Cash</option>
                  <option>Package Credits</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors shadow-2xs flex items-center gap-1.5"
              >
                {paySuccess ? <Check className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
                <span>{paySuccess ? 'Payment Approved!' : `Charge $${payAmount}`}</span>
              </button>
            </div>
          </form>
        )}

        {/* Modal Body: Search */}
        {activeModal === 'search' && (
          <div className="p-5 space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-indigo-600" />
              <input
                autoFocus
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search appointments, dogs, customers, inventory..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>

            <div className="space-y-1 text-xs">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
                Quick Navigation Shortcuts
              </p>
              {[
                { label: "Today's Appointments", sec: 'appointments' },
                { label: 'Customer Directory', sec: 'customers' },
                { label: 'Pet Profiles & Vaccinations', sec: 'pets' },
                { label: 'Recent Grooming Cut Records', sec: 'grooming-records' },
                { label: 'Staff Capacity Matrix', sec: 'schedule' },
                { label: 'Salon Supply Inventory', sec: 'inventory' },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    onNavigateSection(item.sec as DawgNavSection);
                    onClose();
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-medium transition-colors flex items-center justify-between"
                >
                  <span>{item.label}</span>
                  <span className="text-[10px] text-slate-400">Go to section</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
