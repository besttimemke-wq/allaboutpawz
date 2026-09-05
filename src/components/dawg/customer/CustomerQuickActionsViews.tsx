'use client';

import React, { useState } from 'react';
import { CustomerFullProfile, CustomerPetDetail } from '@/lib/dawg-types';
import {
  Calendar,
  Clock,
  Check,
  ChevronRight,
  Plus,
  Sparkles,
  Upload,
  MoreHorizontal,
  ArrowRight,
  Phone,
  Mail,
  X,
  FileText,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';
import Image from 'next/image';

interface CustomerQuickActionsProps {
  customer: CustomerFullProfile;
  onCancel: () => void;
  onSuccess: (message: string, data?: any) => void;
  onOpenManageVaccines?: (pet: CustomerPetDetail) => void;
  onOpenAddPetModal?: () => void;
}

/* =========================================================================
 * 1. TAKE PAYMENT QUICK ACTION
 * ========================================================================= */
export const QuickActionTakePaymentView: React.FC<CustomerQuickActionsProps> = ({
  customer,
  onCancel,
  onSuccess,
}) => {
  const [paymentTarget, setPaymentTarget] = useState<'appointment' | 'invoice' | 'custom'>('appointment');
  const [selectedInvoice, setSelectedInvoice] = useState('INV-2025-089');
  const [customAmount, setCustomAmount] = useState('50.00');
  const [paymentMethod, setPaymentMethod] = useState<'visa_4242' | 'mc_5555' | 'new_card'>('visa_4242');
  const [amountPaid, setAmountPaid] = useState('108.25');
  const [isProcessing, setIsProcessing] = useState(false);

  // Dynamic calculations based on selection
  let subtotal = 100.0;
  let taxRate = 0.0825;

  if (paymentTarget === 'invoice') {
    subtotal = 95.0;
  } else if (paymentTarget === 'custom') {
    subtotal = parseFloat(customAmount) || 0;
  }

  const tax = Number((subtotal * taxRate).toFixed(2));
  const total = Number((subtotal + tax).toFixed(2));
  const numericPaid = parseFloat(amountPaid) || 0;
  const balanceDue = Math.max(0, total - numericPaid);

  const handleProcessPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      onSuccess(`Payment of $${numericPaid.toFixed(2)} processed successfully for ${customer.name}. Receipt sent to ${customer.email}.`, {
        type: 'payment',
        amount: numericPaid,
        method: paymentMethod === 'visa_4242' ? 'Visa •••• 4242' : 'Mastercard •••• 5555',
      });
    }, 600);
  };

  return (
    <div className="flex-1 flex flex-col px-6 sm:px-8 py-6  w-full">
      {/* Customer Context Header */}
      <header className="mb-6">
        {/* Breadcrumbs */}
        <nav className="flex items-center text-xs font-medium text-slate-400 space-x-2 mb-2">
          <button onClick={onCancel} className="hover:text-slate-600 transition-colors cursor-pointer">
            Customers
          </button>
          <span>&gt;</span>
          <button onClick={onCancel} className="text-slate-600 hover:text-indigo-600 font-medium transition-colors cursor-pointer">
            {customer.name}
          </button>
          <span>&gt;</span>
          <span className="text-indigo-600 font-semibold">Take Payment</span>
        </nav>

        {/* Customer Profile Title Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4">
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{customer.name}</h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              Active Customer
            </span>
          </div>

          {/* Contact Details */}
          <div className="flex items-center space-x-4 text-xs text-slate-500 mt-2 sm:mt-0 sm:pl-4 sm:border-l sm:border-slate-200">
            <div className="flex items-center space-x-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>{customer.phone}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>{customer.email}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Payment Form Card */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col flex-1">
        {/* Card Title */}
        <div className="border-b border-slate-100 pb-4 mb-6">
          <h2 className="text-base font-semibold text-slate-800">Take Payment</h2>
        </div>

        {/* Content Grid: Left Form & Right Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-8">
          {/* LEFT COLUMN: Payment For & Payment Method */}
          <div className="lg:col-span-7 space-y-6">
            {/* Group 1: Payment For */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2.5">
                Payment For
              </label>
              <div className="space-y-2.5">
                {/* Option 1: Appointment */}
                <label
                  className={`relative flex items-start p-3.5 rounded-lg border transition-colors cursor-pointer ${
                    paymentTarget === 'appointment'
                      ? 'border-indigo-300 bg-indigo-50/20'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment_target"
                    value="appointment"
                    checked={paymentTarget === 'appointment'}
                    onChange={() => {
                      setPaymentTarget('appointment');
                      setAmountPaid('108.25');
                    }}
                    className="mt-1 h-4 w-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                  />
                  <div className="ml-3 flex-1 flex justify-between items-start">
                    <div>
                      <div className="text-sm font-semibold text-slate-800">Appointment</div>
                      <div className="text-xs text-slate-500 mt-0.5">Buddy • Full Groom</div>
                      <div className="text-xs text-slate-400 mt-0.5">May 16, 2025 at 10:30 AM</div>
                    </div>
                    <span className="text-sm font-semibold text-slate-800">$85.00</span>
                  </div>
                </label>

                {/* Option 2: Invoice */}
                <label
                  className={`relative flex items-start p-3.5 rounded-lg border transition-colors cursor-pointer ${
                    paymentTarget === 'invoice'
                      ? 'border-indigo-300 bg-indigo-50/20'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment_target"
                    value="invoice"
                    checked={paymentTarget === 'invoice'}
                    onChange={() => {
                      setPaymentTarget('invoice');
                      setAmountPaid('102.84');
                    }}
                    className="mt-1 h-4 w-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                  />
                  <div className="ml-3 flex-1">
                    <div className="text-sm font-medium text-slate-700">Invoice</div>
                    <div className="text-xs text-slate-400 mt-0.5">Select an invoice</div>
                    {paymentTarget === 'invoice' && (
                      <select
                        value={selectedInvoice}
                        onChange={(e) => setSelectedInvoice(e.target.value)}
                        className="mt-2 text-xs w-full rounded-md border-slate-300 py-1.5 px-2 bg-white"
                      >
                        <option value="INV-2025-089">INV-2025-089 (May 2, 2025) - $95.00</option>
                        <option value="INV-2025-064">INV-2025-064 (Apr 12, 2025) - $70.00</option>
                      </select>
                    )}
                  </div>
                </label>

                {/* Option 3: Custom Amount */}
                <label
                  className={`relative flex items-start p-3.5 rounded-lg border transition-colors cursor-pointer ${
                    paymentTarget === 'custom'
                      ? 'border-indigo-300 bg-indigo-50/20'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment_target"
                    value="custom"
                    checked={paymentTarget === 'custom'}
                    onChange={() => {
                      setPaymentTarget('custom');
                      setAmountPaid('54.13');
                    }}
                    className="mt-1 h-4 w-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                  />
                  <div className="ml-3 flex-1">
                    <div className="text-sm font-medium text-slate-700">Custom Amount</div>
                    <div className="text-xs text-slate-400 mt-0.5">Enter custom amount</div>
                    {paymentTarget === 'custom' && (
                      <div className="mt-2 flex items-center max-w-xs">
                        <span className="text-xs text-slate-500 mr-2">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={customAmount}
                          onChange={(e) => {
                            setCustomAmount(e.target.value);
                            const amt = parseFloat(e.target.value) || 0;
                            const t = amt * 1.0825;
                            setAmountPaid(t.toFixed(2));
                          }}
                          className="w-full text-xs rounded-md border-slate-300 py-1.5 px-2 text-slate-800"
                          placeholder="0.00"
                        />
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>

            {/* Group 2: Payment Method */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2.5">
                Payment Method
              </label>
              <div className="space-y-2.5">
                {/* Method 1: Visa 4242 */}
                <label
                  className={`relative flex items-center justify-between p-3.5 rounded-lg border transition-colors cursor-pointer ${
                    paymentMethod === 'visa_4242'
                      ? 'border-indigo-300 bg-indigo-50/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="payment_method"
                      value="visa_4242"
                      checked={paymentMethod === 'visa_4242'}
                      onChange={() => setPaymentMethod('visa_4242')}
                      className="h-4 w-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                    />
                    {/* Visa Icon Badge */}
                    <div className="w-10 h-6 bg-[#1A1F71] rounded flex items-center justify-center text-white text-[10px] font-extrabold italic tracking-tight shrink-0 shadow-sm">
                      VISA
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-800">Visa •••• 4242</div>
                      <div className="text-[11px] text-slate-400">Expires 04/27</div>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Default
                  </span>
                </label>

                {/* Method 2: Mastercard 5555 */}
                <label
                  className={`relative flex items-center justify-between p-3.5 rounded-lg border transition-colors cursor-pointer ${
                    paymentMethod === 'mc_5555'
                      ? 'border-indigo-300 bg-indigo-50/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="payment_method"
                      value="mc_5555"
                      checked={paymentMethod === 'mc_5555'}
                      onChange={() => setPaymentMethod('mc_5555')}
                      className="h-4 w-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                    />
                    {/* Mastercard Icon Badge */}
                    <div className="w-10 h-6 bg-slate-900 rounded flex items-center justify-center relative overflow-hidden shrink-0 shadow-sm">
                      <div className="w-3.5 h-3.5 bg-red-500 rounded-full opacity-90 -mr-1.5"></div>
                      <div className="w-3.5 h-3.5 bg-amber-400 rounded-full opacity-90"></div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-800">Mastercard •••• 5555</div>
                      <div className="text-[11px] text-slate-400">Expires 09/26</div>
                    </div>
                  </div>
                </label>

                {/* Add New Payment Method Trigger */}
                <button
                  type="button"
                  onClick={() => alert('Add New Payment Method: Enter card details')}
                  className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-700 pt-1 transition-colors cursor-pointer"
                >
                  <span className="mr-1 text-sm leading-none">+</span> Add New Payment Method
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Order Summary & Balance */}
          <div className="lg:col-span-5 bg-slate-50/70 border border-slate-100 rounded-xl p-5">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-4">
              Order Summary
            </h3>

            {/* Line Items */}
            <div className="space-y-2.5 text-xs pb-4 border-b border-slate-200">
              <div className="flex justify-between text-slate-600">
                <span>{paymentTarget === 'appointment' ? 'Full Groom' : paymentTarget === 'invoice' ? 'Grooming Services (Invoice)' : 'Custom Service'}</span>
                <span className="font-medium text-slate-800">${paymentTarget === 'appointment' ? '85.00' : subtotal.toFixed(2)}</span>
              </div>
              {paymentTarget === 'appointment' && (
                <div>
                  <div className="text-slate-400 text-[11px]">Add-ons</div>
                  <div className="flex justify-between text-slate-600 pl-2 mt-0.5">
                    <span>Blueberry Facial</span>
                    <span className="font-medium text-slate-800">$15.00</span>
                  </div>
                </div>
              )}
            </div>

            {/* Subtotal & Tax Calculation */}
            <div className="space-y-2 text-xs py-3 border-b border-slate-200">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-medium text-slate-800">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Tax (8.25%)</span>
                <span className="font-medium text-slate-800">${tax.toFixed(2)}</span>
              </div>
            </div>

            {/* Total */}
            <div className="flex justify-between items-center py-4 border-b border-slate-200">
              <span className="text-sm font-semibold text-slate-800">Total</span>
              <span className="text-base font-bold text-slate-900">${total.toFixed(2)}</span>
            </div>

            {/* Amount Paid Input Field */}
            <div className="pt-4 pb-3">
              <label className="block text-xs font-medium text-slate-600 mb-1.5" htmlFor="amount-paid">
                Amount Paid
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="text-slate-400 sm:text-xs">$</span>
                </div>
                <input
                  type="text"
                  id="amount-paid"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  className="block w-full rounded-md border-slate-300 pl-7 pr-3 py-1.5 text-xs text-right font-medium text-slate-800 focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Balance Due */}
            <div className="flex justify-between items-center text-xs pt-1 text-slate-600">
              <span className="font-medium">Balance Due</span>
              <span className="font-semibold text-slate-900">${balanceDue.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleProcessPayment}
            disabled={isProcessing}
            className="px-6 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition-colors cursor-pointer flex items-center gap-2"
          >
            {isProcessing ? 'Processing...' : `Process Payment $${numericPaid.toFixed(2)}`}
          </button>
        </div>
      </section>
    </div>
  );
};

/* =========================================================================
 * 2. NEW APPOINTMENT QUICK ACTION
 * ========================================================================= */
export const QuickActionNewAppointmentView: React.FC<CustomerQuickActionsProps> = ({
  customer,
  onCancel,
  onSuccess,
  onOpenAddPetModal,
}) => {
  const [selectedPetName, setSelectedPetName] = useState<string>('Buddy');
  const [service, setService] = useState('Full Groom');
  const [duration, setDuration] = useState('2.5 hrs');
  const [price, setPrice] = useState('$85.00');
  const [date, setDate] = useState('05/16/2025');
  const [time, setTime] = useState('10:30 AM');
  const [groomer, setGroomer] = useState('with Sarah M.');
  const [location, setLocation] = useState('Main Location');
  const [notes, setNotes] = useState('');
  const [showAddons, setShowAddons] = useState(false);
  const [selectedAddons, setSelectedAddons] = useState<string[]>(['Blueberry Facial']);

  const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const s = e.target.value;
    setService(s);
    if (s === 'Full Groom') {
      setDuration('2.5 hrs');
      setPrice('$85.00');
    } else if (s === 'Bath & Brush') {
      setDuration('1.5 hrs');
      setPrice('$55.00');
    } else if (s === 'Puppy Trim') {
      setDuration('1.0 hr');
      setPrice('$45.00');
    } else if (s === 'De-Shedding Treatment') {
      setDuration('2.0 hrs');
      setPrice('$75.00');
    }
  };

  const handleToggleAddon = (addon: string) => {
    setSelectedAddons(prev =>
      prev.includes(addon) ? prev.filter(a => a !== addon) : [...prev, addon]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSuccess(`Appointment booked for ${selectedPetName} on ${date} at ${time} (${service})!`, {
      type: 'appointment',
      pet: selectedPetName,
      service,
      date,
      time,
      groomer: groomer.replace('with ', ''),
      location,
      notes,
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto px-6 sm:px-8 py-6 max-w-5xl mx-auto w-full">
      {/* Top Breadcrumbs and Customer Info Banner */}
      <header className="mb-6">
        <nav className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-2">
          <button onClick={onCancel} className="hover:text-slate-600 transition-colors cursor-pointer">
            Customers
          </button>
          <span>›</span>
          <button onClick={onCancel} className="text-slate-600 hover:text-indigo-600 font-medium transition-colors cursor-pointer">
            {customer.name}
          </button>
          <span>›</span>
          <span className="text-indigo-600 font-semibold">New Appointment</span>
        </nav>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{customer.name}</h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              Active Customer
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-500 font-normal">
            <div className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>{customer.phone}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>{customer.email}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Appointment Form Container */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden p-6 sm:p-7">
        <div className="mb-6">
          <h2 className="text-base font-semibold text-slate-900">New Appointment</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* STEP 1: Select Pet */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              1. Select Pet
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Pet 1: Buddy */}
              <div
                onClick={() => setSelectedPetName('Buddy')}
                className={`relative rounded-xl p-3.5 flex items-center gap-3.5 cursor-pointer transition-all ${
                  selectedPetName === 'Buddy'
                    ? 'border-2 border-indigo-600 bg-indigo-50/20 shadow-xs ring-2 ring-indigo-600/10'
                    : 'border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/40'
                }`}
              >
                <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-indigo-200 shrink-0">
                  <Image
                    src="https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=150&q=80"
                    alt="Buddy"
                    fill
                    className="object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900 leading-tight">Buddy</h3>
                  <p className="text-xs text-slate-500 truncate mt-0.5">Golden Retriever • Male</p>
                  <p className="text-xs text-slate-400">4 yrs • 72 lbs</p>
                  <div className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                    <Check className="w-3 h-3 text-emerald-500 stroke-[2.5]" />
                    <span>Up to date</span>
                  </div>
                </div>
              </div>

              {/* Pet 2: Luna */}
              <div
                onClick={() => setSelectedPetName('Luna')}
                className={`relative rounded-xl p-3.5 flex items-center gap-3.5 cursor-pointer transition-all ${
                  selectedPetName === 'Luna'
                    ? 'border-2 border-indigo-600 bg-indigo-50/20 shadow-xs ring-2 ring-indigo-600/10'
                    : 'border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/40'
                }`}
              >
                <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                  <Image
                    src="https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=150&q=80"
                    alt="Luna"
                    fill
                    className="object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900 leading-tight">Luna</h3>
                  <p className="text-xs text-slate-500 truncate mt-0.5">Poodle • Female</p>
                  <p className="text-xs text-slate-400">2 yrs • 18 lbs</p>
                  <div className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                    <Check className="w-3 h-3 text-emerald-500 stroke-[2.5]" />
                    <span>Up to date</span>
                  </div>
                </div>
              </div>

              {/* Add New Pet Card */}
              <div
                onClick={onOpenAddPetModal}
                className="border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/20 rounded-xl p-3.5 flex flex-col items-center justify-center cursor-pointer text-indigo-600 transition-all min-h-[96px]"
              >
                <Plus className="w-5 h-5 mb-1 stroke-2" />
                <span className="text-xs font-medium">Add New Pet</span>
              </div>
            </div>
          </div>

          {/* STEP 2: Select Service */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              2. Select Service
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
              <div className="sm:col-span-6">
                <label className="block text-xs text-slate-500 mb-1" htmlFor="service-select">
                  Service
                </label>
                <select
                  id="service-select"
                  value={service}
                  onChange={handleServiceChange}
                  className="w-full text-xs rounded-lg border-slate-200 py-2.5 pl-3 pr-8 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white font-medium text-slate-800"
                >
                  <option>Full Groom</option>
                  <option>Bath &amp; Brush</option>
                  <option>Puppy Trim</option>
                  <option>De-Shedding Treatment</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs text-slate-500 mb-1" htmlFor="duration-select">
                  Duration
                </label>
                <select
                  id="duration-select"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full text-xs rounded-lg border-slate-200 py-2.5 pl-3 pr-8 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white font-medium text-slate-800"
                >
                  <option>1.0 hr</option>
                  <option>1.5 hrs</option>
                  <option>2.0 hrs</option>
                  <option>2.5 hrs</option>
                  <option>3.0 hrs</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs text-slate-500 mb-1" htmlFor="price-input">
                  Price
                </label>
                <input
                  id="price-input"
                  type="text"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full text-xs rounded-lg border-slate-200 py-2.5 px-3 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white font-medium text-slate-800"
                />
              </div>
            </div>

            {/* Add-ons Toggle */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowAddons(!showAddons)}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 cursor-pointer"
              >
                <span>+</span> Add-ons / Extras
              </button>

              {showAddons && (
                <div className="mt-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap gap-2 text-xs">
                  {[
                    { name: 'Blueberry Facial', cost: '+$15' },
                    { name: 'Teeth Brushing', cost: '+$10' },
                    { name: 'De-Shedding Mud Bath', cost: '+$25' },
                    { name: 'Nail Grinding', cost: '+$12' },
                  ].map(addon => {
                    const isSelected = selectedAddons.includes(addon.name);
                    return (
                      <button
                        key={addon.name}
                        type="button"
                        onClick={() => handleToggleAddon(addon.name)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {addon.name} <span className="opacity-80">({addon.cost})</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* STEP 3: Date & Time */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                3. Date &amp; Time
              </label>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium mr-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Available</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-4">
                <div className="relative">
                  <input
                    type="text"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full text-xs rounded-lg border-slate-200 py-2.5 px-3 pr-9 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-800 font-medium bg-white"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                    <Calendar className="w-4 h-4 stroke-2" />
                  </div>
                </div>
              </div>

              <div className="sm:col-span-4">
                <div className="relative">
                  <input
                    type="text"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full text-xs rounded-lg border-slate-200 py-2.5 px-3 pr-9 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-800 font-medium bg-white"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div className="sm:col-span-4">
                <div className="relative">
                  <select
                    value={groomer}
                    onChange={(e) => setGroomer(e.target.value)}
                    className="w-full text-xs rounded-lg border-slate-200 py-2.5 pl-3 pr-8 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white font-medium text-slate-800"
                  >
                    <option>with Sarah M.</option>
                    <option>with Alex K.</option>
                    <option>with Jessica L.</option>
                    <option>with Any Available</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 4: Appointment Details */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              4. Appointment Details
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-4">
                <label className="block text-xs text-slate-500 mb-1" htmlFor="location-select">
                  Location
                </label>
                <select
                  id="location-select"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full text-xs rounded-lg border-slate-200 py-2.5 pl-3 pr-8 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white font-medium text-slate-800"
                >
                  <option>Main Location</option>
                  <option>North Branch</option>
                  <option>Mobile Van 1</option>
                </select>
              </div>

              <div className="sm:col-span-8">
                <label className="block text-xs text-slate-500 mb-1" htmlFor="appointment-notes">
                  Notes (optional)
                </label>
                <textarea
                  id="appointment-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this appointment..."
                  className="w-full text-xs rounded-lg border-slate-200 p-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-800 placeholder-slate-400 bg-white"
                ></textarea>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              Review Appointment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* =========================================================================
 * 3. ADD PET QUICK ACTION
 * ========================================================================= */
export const QuickActionAddPetView: React.FC<CustomerQuickActionsProps> = ({
  customer,
  onCancel,
  onSuccess,
  onOpenManageVaccines,
}) => {
  const [petName, setPetName] = useState('Max');
  const [species, setSpecies] = useState('Dog');
  const [breed, setBreed] = useState('Goldendoodle');
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');
  const [dob, setDob] = useState('03/15/2023');
  const [color, setColor] = useState('Apricot');
  const [microchip, setMicrochip] = useState('985 141 000 123 456');

  const [allergies, setAllergies] = useState('None');
  const [medicalConditions, setMedicalConditions] = useState('None');
  const [medications, setMedications] = useState('None');
  const [behaviorNotes, setBehaviorNotes] = useState('Friendly and playful. Gets excited around other dogs.');
  const [vaccineStatus, setVaccineStatus] = useState<'Up to date' | 'Expiring Soon' | 'Expired'>('Up to date');
  const [preferredService, setPreferredService] = useState('Full Groom');
  const [preferredGroomer, setPreferredGroomer] = useState('No Preference');
  const [generalNotes, setGeneralNotes] = useState('Likes blueberry facial!');

  const handleSavePet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!petName.trim()) {
      alert('Please enter a pet name');
      return;
    }

    const newPetDetail: CustomerPetDetail = {
      id: `pet-${Date.now()}`,
      name: petName,
      breed,
      gender,
      age: '2 yrs',
      birthDate: dob,
      weight: '35 lbs',
      imageUrl:
        species === 'Dog'
          ? 'https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?auto=format&fit=crop&w=300&q=80'
          : 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=300&q=80',
      vaccinationsStatus: vaccineStatus,
      lastGroomDate: 'None',
      nextApptDate: 'None',
      nextApptType: preferredService,
      medicalAlert: medicalConditions !== 'None' ? medicalConditions : undefined,
    };

    onSuccess(`Successfully added ${petName} (${breed}) to ${customer.name}'s household!`, {
      type: 'add_pet',
      pet: newPetDetail,
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto px-6 sm:px-8 py-6 max-w-6xl mx-auto w-full">
      {/* Breadcrumb & Header */}
      <header className="space-y-1 mb-5">
        <nav className="flex items-center text-xs text-slate-500 font-medium space-x-1.5 mb-1">
          <button onClick={onCancel} className="hover:text-slate-700 cursor-pointer">
            Customers
          </button>
          <span>›</span>
          <button onClick={onCancel} className="text-slate-800 hover:text-indigo-600 font-medium cursor-pointer">
            {customer.name}
          </button>
          <span>›</span>
          <span className="text-indigo-600 font-semibold">Add Pet</span>
        </nav>

        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">{customer.name}</h1>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            Active Customer
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-500 pt-0.5">
          <span className="flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-slate-400 stroke-2" />
            {customer.phone}
          </span>
          <span className="flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-slate-400 stroke-2" />
            {customer.email}
          </span>
        </div>
      </header>

      {/* Add Pet Form Card */}
      <section className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Add Pet</h2>
        </div>

        <form onSubmit={handleSavePet} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* LEFT COLUMN: Pet Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-800 tracking-tight">Pet Information</h3>

              {/* Photo Upload Field */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Photo</label>
                <div className="border-2 border-dashed border-slate-200 hover:border-indigo-300 rounded-lg p-5 flex flex-col items-center justify-center bg-slate-50/40 cursor-pointer transition">
                  <span className="text-xs font-medium text-indigo-600 hover:underline">Upload Photo</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">JPG, PNG up to 5MB</p>
                </div>
              </div>

              {/* Pet Name */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="pet-name">
                  Pet Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="pet-name"
                  type="text"
                  value={petName}
                  onChange={(e) => setPetName(e.target.value)}
                  className="w-full text-xs rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2 px-3 text-slate-800"
                  required
                />
              </div>

              {/* Species */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="species">
                  Species <span className="text-red-500">*</span>
                </label>
                <select
                  id="species"
                  value={species}
                  onChange={(e) => setSpecies(e.target.value)}
                  className="w-full text-xs rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2 px-3 text-slate-800 bg-white"
                >
                  <option>Dog</option>
                  <option>Cat</option>
                  <option>Other</option>
                </select>
              </div>

              {/* Breed */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="breed">
                  Breed <span className="text-red-500">*</span>
                </label>
                <input
                  id="breed"
                  type="text"
                  value={breed}
                  onChange={(e) => setBreed(e.target.value)}
                  className="w-full text-xs rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2 px-3 text-slate-800"
                  required
                />
              </div>

              {/* Gender */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="gender">
                  Gender <span className="text-red-500">*</span>
                </label>
                <select
                  id="gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value as 'Male' | 'Female')}
                  className="w-full text-xs rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2 px-3 text-slate-800 bg-white"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="dob">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <div className="relative rounded-md shadow-sm">
                  <input
                    id="dob"
                    type="text"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full text-xs rounded-md border-slate-300 pr-9 focus:border-indigo-500 focus:ring-indigo-500 py-2 px-3 text-slate-800"
                  />
                  <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400">
                    <Calendar className="w-4 h-4 stroke-2" />
                  </div>
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="color">
                  Color
                </label>
                <input
                  id="color"
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full text-xs rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2 px-3 text-slate-800"
                />
              </div>

              {/* Microchip Number */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="microchip">
                  Microchip Number
                </label>
                <input
                  id="microchip"
                  type="text"
                  value={microchip}
                  onChange={(e) => setMicrochip(e.target.value)}
                  className="w-full text-xs rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2 px-3 text-slate-800"
                />
              </div>
            </div>

            {/* RIGHT COLUMN: Health & Safety */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-800 tracking-tight">Health &amp; Safety</h3>

              {/* Allergies */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="allergies">
                  Allergies
                </label>
                <input
                  id="allergies"
                  type="text"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  className="w-full text-xs rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2 px-3 text-slate-800"
                />
              </div>

              {/* Medical Conditions */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="medical-conditions">
                  Medical Conditions
                </label>
                <input
                  id="medical-conditions"
                  type="text"
                  value={medicalConditions}
                  onChange={(e) => setMedicalConditions(e.target.value)}
                  className="w-full text-xs rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2 px-3 text-slate-800"
                />
              </div>

              {/* Medications */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="medications">
                  Medications
                </label>
                <input
                  id="medications"
                  type="text"
                  value={medications}
                  onChange={(e) => setMedications(e.target.value)}
                  className="w-full text-xs rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2 px-3 text-slate-800"
                />
              </div>

              {/* Behavior Notes */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="behavior-notes">
                  Behavior Notes
                </label>
                <textarea
                  id="behavior-notes"
                  rows={2}
                  value={behaviorNotes}
                  onChange={(e) => setBehaviorNotes(e.target.value)}
                  className="w-full text-xs rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2 px-3 text-slate-800"
                />
              </div>

              {/* Vaccination Status */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Vaccination Status</label>
                <div className="flex items-center justify-between gap-3">
                  <select
                    value={vaccineStatus}
                    onChange={(e) => setVaccineStatus(e.target.value as 'Up to date' | 'Expiring Soon' | 'Expired')}
                    className="flex-1 text-xs rounded-md border-slate-300 bg-white py-1.5 px-3 font-medium text-emerald-700"
                  >
                    <option value="Up to date">Up to date</option>
                    <option value="Expiring Soon">Expiring Soon</option>
                    <option value="Expired">Expired</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      if (customer.pets[0] && onOpenManageVaccines) {
                        onOpenManageVaccines(customer.pets[0]);
                      }
                    }}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline whitespace-nowrap cursor-pointer"
                  >
                    Manage Vaccines
                  </button>
                </div>
              </div>

              {/* Sub-section: Preferences */}
              <div className="pt-2">
                <h4 className="text-xs font-semibold text-slate-800 tracking-tight mb-2">Preferences</h4>

                <div className="mb-3">
                  <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="preferred-services">
                    Preferred Services
                  </label>
                  <select
                    id="preferred-services"
                    value={preferredService}
                    onChange={(e) => setPreferredService(e.target.value)}
                    className="w-full text-xs rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2 px-3 text-slate-800 bg-white"
                  >
                    <option>Full Groom</option>
                    <option>Bath &amp; Brush</option>
                    <option>Puppy Trim</option>
                  </select>
                </div>

                <div className="mb-3">
                  <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="preferred-groomer">
                    Preferred Groomer
                  </label>
                  <select
                    id="preferred-groomer"
                    value={preferredGroomer}
                    onChange={(e) => setPreferredGroomer(e.target.value)}
                    className="w-full text-xs rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2 px-3 text-slate-800 bg-white"
                  >
                    <option>No Preference</option>
                    <option>Sarah M.</option>
                    <option>Jessica T.</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="general-notes">
                    Notes
                  </label>
                  <input
                    id="general-notes"
                    type="text"
                    value={generalNotes}
                    onChange={(e) => setGeneralNotes(e.target.value)}
                    className="w-full text-xs rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2 px-3 text-slate-800"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition cursor-pointer"
            >
              Save Pet
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

/* =========================================================================
 * 4. SEND MESSAGE QUICK ACTION
 * ========================================================================= */
export const QuickActionSendMessageView: React.FC<CustomerQuickActionsProps> = ({
  customer,
  onCancel,
  onSuccess,
}) => {
  const [toPhone, setToPhone] = useState(true);
  const [toEmail, setToEmail] = useState(true);
  const [toBuddy, setToBuddy] = useState(false);
  const [toLuna, setToLuna] = useState(false);

  const [channel, setChannel] = useState<'SMS' | 'Email'>('SMS');
  const [message, setMessage] = useState(
    "Hi Sarah! This is a reminder of Buddy's upcoming appointment on May 16, 2025 at 10:30 AM for a Full Groom.\n\nWe look forward to seeing you!"
  );
  const [template, setTemplate] = useState('Appointment Reminder');

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const t = e.target.value;
    setTemplate(t);
    if (t === 'Appointment Reminder') {
      setMessage("Hi Sarah! This is a reminder of Buddy's upcoming appointment on May 16, 2025 at 10:30 AM for a Full Groom.\n\nWe look forward to seeing you!");
    } else if (t === 'Vaccine Due Notice') {
      setMessage("Hi Sarah! This is a friendly reminder that Buddy's Rabies and DHPP vaccination records are due for renewal soon. Please upload your updated certificates at your earliest convenience!");
    } else if (t === 'Pickup Ready') {
      setMessage("Great news! Buddy is all done with their spa day and ready for pickup. See you soon!");
    } else if (t === 'Custom Follow-up') {
      setMessage("Hi Sarah! How is Buddy feeling after today's groom? Let us know if you need anything!");
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    onSuccess(`Message sent via ${channel} to ${customer.name}!`, {
      type: 'message',
      channel,
      text: message,
      recipients: [
        toPhone && customer.phone,
        toEmail && customer.email,
        toBuddy && 'Buddy (SMS)',
        toLuna && 'Luna (SMS)',
      ].filter(Boolean),
    });
  };

  return (
    <div className="flex-1 flex flex-col p-6 md:p-8 lg:p-10  w-full">
      {/* Header */}
      <header className="mb-6">
        <nav className="flex items-center space-x-2 text-xs font-medium text-slate-500 mb-2">
          <button onClick={onCancel} className="hover:text-slate-700 cursor-pointer">
            Customers
          </button>
          <span>›</span>
          <button onClick={onCancel} className="text-slate-700 hover:text-indigo-600 font-medium cursor-pointer">
            {customer.name}
          </button>
          <span>›</span>
          <span className="text-indigo-600 font-semibold">Send Message</span>
        </nav>

        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{customer.name}</h1>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            Active Customer
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-5 mt-2 text-xs text-slate-500 font-normal">
          <div className="flex items-center space-x-1.5">
            <Phone className="w-3.5 h-3.5 text-slate-400" />
            <span>{customer.phone}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            <span>{customer.email}</span>
          </div>
        </div>
      </header>

      {/* Send Message Card */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Send Message</h2>
        </div>

        <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
          {/* LEFT COLUMN: Recipient Selection */}
          <div className="lg:col-span-4 flex flex-col space-y-4">
            <label className="block text-xs font-semibold text-slate-700 tracking-wide uppercase">
              To
            </label>
            <div className="space-y-3">
              {/* Option 1: Sarah Johnson Phone */}
              <label className="relative flex items-start p-3.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 cursor-pointer transition">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    checked={toPhone}
                    onChange={(e) => setToPhone(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition"
                  />
                </div>
                <div className="ml-3 text-sm leading-5">
                  <div className="font-medium text-slate-800">{customer.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{customer.phone}</div>
                </div>
              </label>

              {/* Option 2: Email */}
              <label className="relative flex items-start p-3.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 cursor-pointer transition">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    checked={toEmail}
                    onChange={(e) => setToEmail(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition"
                  />
                </div>
                <div className="ml-3 text-sm leading-5">
                  <div className="font-medium text-slate-800">Email</div>
                  <div className="text-xs text-slate-500 mt-0.5">{customer.email}</div>
                </div>
              </label>

              {/* Option 3: Buddy (SMS) */}
              <label className="relative flex items-start p-3.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 cursor-pointer transition">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    checked={toBuddy}
                    onChange={(e) => setToBuddy(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition"
                  />
                </div>
                <div className="ml-3 text-sm leading-5">
                  <div className="font-medium text-slate-800">Buddy (SMS)</div>
                  <div className="text-xs text-slate-500 mt-0.5">(Pet Owner: {customer.name})</div>
                </div>
              </label>

              {/* Option 4: Luna (SMS) */}
              <label className="relative flex items-start p-3.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 cursor-pointer transition">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    checked={toLuna}
                    onChange={(e) => setToLuna(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition"
                  />
                </div>
                <div className="ml-3 text-sm leading-5">
                  <div className="font-medium text-slate-800">Luna (SMS)</div>
                  <div className="text-xs text-slate-500 mt-0.5">(Pet Owner: {customer.name})</div>
                </div>
              </label>
            </div>
          </div>

          {/* RIGHT COLUMN: Message Composition */}
          <div className="lg:col-span-8 flex flex-col space-y-5">
            {/* Channel Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 tracking-wide uppercase mb-3">
                Message
              </label>
              <div className="inline-flex p-1 bg-slate-100 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setChannel('SMS')}
                  className={`px-5 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
                    channel === 'SMS'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  SMS
                </button>
                <button
                  type="button"
                  onClick={() => setChannel('Email')}
                  className={`px-5 py-1.5 text-xs font-medium rounded-md transition cursor-pointer ${
                    channel === 'Email'
                      ? 'bg-white text-indigo-600 shadow-sm font-semibold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Email
                </button>
              </div>
            </div>

            {/* Textarea */}
            <div className="relative flex-1 flex flex-col min-h-[190px]">
              <textarea
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full h-full p-4 text-sm text-slate-800 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition resize-none leading-relaxed"
              ></textarea>
              <div className="absolute bottom-3 right-3.5 flex items-center space-x-1.5 text-slate-400 pointer-events-none select-none">
                <Sparkles className="w-4 h-4 stroke-[1.75]" />
                <span className="text-xs font-medium text-slate-400 tracking-tight">
                  {message.length}/160
                </span>
              </div>
            </div>

            {/* Templates Selector */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Templates</label>
              <div className="relative max-w-sm">
                <select
                  value={template}
                  onChange={handleTemplateChange}
                  className="w-full text-xs font-normal text-slate-800 bg-white border border-slate-200 rounded-lg py-2.5 pl-3 pr-10 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition"
                >
                  <option>Appointment Reminder</option>
                  <option>Vaccine Due Notice</option>
                  <option>Pickup Ready</option>
                  <option>Custom Follow-up</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <footer className="px-6 py-4 bg-white border-t border-slate-100 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 rounded-lg shadow-sm transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSendMessage}
            className="px-6 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-sm transition cursor-pointer"
          >
            Send Message
          </button>
        </footer>
      </section>
    </div>
  );
};

/* =========================================================================
 * 5. UPDATE DOCUMENTS QUICK ACTION
 * ========================================================================= */
export const QuickActionUpdateDocumentsView: React.FC<CustomerQuickActionsProps> = ({
  customer,
  onCancel,
  onSuccess,
}) => {
  const [docSubTab, setDocSubTab] = useState<'existing' | 'upload'>('existing');
  const [docName, setDocName] = useState('Rabies Certificate Renewal');
  const [docPet, setDocPet] = useState('Buddy');
  const [docType, setDocType] = useState('Vaccination');
  const [docExpires, setDocExpires] = useState('05/02/2027');

  const [docsList, setDocsList] = useState([
    {
      id: 'doc-1',
      name: 'Rabies Certificate',
      pet: 'Buddy',
      type: 'Vaccination',
      uploaded: 'May 2, 2024',
      expires: 'May 2, 2026',
      status: 'Valid',
      badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200/70',
    },
    {
      id: 'doc-2',
      name: 'DHPP Vaccine',
      pet: 'Buddy',
      type: 'Vaccination',
      uploaded: 'May 2, 2024',
      expires: 'May 2, 2026',
      status: 'Valid',
      badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200/70',
    },
    {
      id: 'doc-3',
      name: 'Bordetella Vaccine',
      pet: 'Buddy',
      type: 'Vaccination',
      uploaded: 'May 2, 2024',
      expires: 'May 2, 2026',
      status: 'Valid',
      badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200/70',
    },
    {
      id: 'doc-4',
      name: 'Grooming Waiver',
      pet: 'Household',
      type: 'Waiver',
      uploaded: 'Apr 12, 2025',
      expires: '—',
      status: 'On File',
      badgeClass: 'bg-blue-50 text-blue-700 border border-blue-200/70',
    },
    {
      id: 'doc-5',
      name: 'Photo Release Form',
      pet: 'Household',
      type: 'Release Form',
      uploaded: 'Apr 12, 2025',
      expires: '—',
      status: 'On File',
      badgeClass: 'bg-blue-50 text-blue-700 border border-blue-200/70',
    },
  ]);

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newDoc = {
      id: `doc-${Date.now()}`,
      name: docName,
      pet: docPet,
      type: docType,
      uploaded: 'Today',
      expires: docExpires,
      status: 'Valid',
      badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200/70',
    };
    setDocsList(prev => [newDoc, ...prev]);
    setDocSubTab('existing');
    onSuccess(`Uploaded "${docName}" for ${docPet}. Document verified and saved.`);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto px-6 py-6 md:px-10 lg:px-12  w-full">
      {/* Header Section */}
      <header className="mb-6">
        <div className="flex items-center space-x-2 text-xs font-medium text-slate-400 mb-2">
          <button onClick={onCancel} className="hover:text-slate-600 transition-colors cursor-pointer">
            Customers
          </button>
          <span className="text-slate-300">›</span>
          <button onClick={onCancel} className="text-slate-600 hover:text-indigo-600 font-medium transition-colors cursor-pointer">
            {customer.name}
          </button>
          <span className="text-slate-300">›</span>
          <span className="text-indigo-600 font-semibold">Update Documents</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{customer.name}</h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                Active Customer
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-5 mt-1.5 text-xs text-slate-500">
              <div className="flex items-center space-x-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{customer.phone}</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{customer.email}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Update Documents Card */}
      <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col mb-8">
        {/* Card Title & Sub-tabs */}
        <div className="p-6 pb-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Update Documents</h2>

          <div className="inline-flex p-1 bg-slate-100 rounded-xl space-x-1" role="tablist">
            <button
              onClick={() => setDocSubTab('existing')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                docSubTab === 'existing'
                  ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              Existing Documents
            </button>
            <button
              onClick={() => setDocSubTab('upload')}
              className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                docSubTab === 'upload'
                  ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              Upload New Document
            </button>
          </div>
        </div>

        {docSubTab === 'existing' ? (
          <>
            {/* Document Records Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-6" scope="col">Document</th>
                    <th className="py-3 px-4" scope="col">Pet</th>
                    <th className="py-3 px-4" scope="col">Type</th>
                    <th className="py-3 px-4" scope="col">Uploaded</th>
                    <th className="py-3 px-4" scope="col">Expires</th>
                    <th className="py-3 px-4" scope="col">Status</th>
                    <th className="py-3 px-6 text-right" scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {docsList.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-6 text-slate-900 font-semibold">{doc.name}</td>
                      <td className="py-3.5 px-4 text-slate-600">{doc.pet}</td>
                      <td className="py-3.5 px-4 text-slate-500">{doc.type}</td>
                      <td className="py-3.5 px-4 text-slate-500">{doc.uploaded}</td>
                      <td className="py-3.5 px-4 text-slate-500">{doc.expires}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${doc.badgeClass}`}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <button
                          type="button"
                          onClick={() => alert(`Options for ${doc.name}`)}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="More options"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Document Reminders Footer Box */}
            <div className="m-6 p-4 rounded-xl bg-slate-50 border border-slate-200/70 flex flex-col space-y-1">
              <h3 className="text-xs font-semibold text-slate-900">Document Reminders</h3>
              <p className="text-xs text-slate-600">Buddy has 2 documents expiring within 30 days.</p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => alert('Filtering expiring documents...')}
                  className="inline-flex items-center space-x-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer"
                >
                  <span>View Expiring Documents</span>
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Upload New Document Form */
          <form onSubmit={handleUploadSubmit} className="p-6 space-y-4">
            <div className="border-2 border-dashed border-indigo-200 bg-indigo-50/20 rounded-xl p-8 flex flex-col items-center justify-center text-center">
              <Upload className="w-8 h-8 text-indigo-600 mb-2" />
              <div className="text-sm font-semibold text-slate-800">Drag &amp; Drop certificate or waiver PDF/JPG</div>
              <div className="text-xs text-slate-500 mt-1">or click to browse your device (Max 15MB)</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Document Name *</label>
                <input
                  type="text"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className="w-full text-xs rounded-lg border-slate-200 p-2.5 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Target Pet *</label>
                <select
                  value={docPet}
                  onChange={(e) => setDocPet(e.target.value)}
                  className="w-full text-xs rounded-lg border-slate-200 p-2.5 bg-white"
                >
                  <option value="Buddy">Buddy (Pet)</option>
                  <option value="Luna">Luna (Pet)</option>
                  <option value="Household">Household (All Pets)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Document Type *</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full text-xs rounded-lg border-slate-200 p-2.5 bg-white"
                >
                  <option value="Vaccination">Vaccination Record</option>
                  <option value="Waiver">Grooming Waiver</option>
                  <option value="Release Form">Photo Release</option>
                  <option value="Veterinary Note">Veterinary Note</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Expiration Date</label>
                <input
                  type="text"
                  value={docExpires}
                  onChange={(e) => setDocExpires(e.target.value)}
                  className="w-full text-xs rounded-lg border-slate-200 p-2.5 bg-white"
                  placeholder="MM/DD/YYYY"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDocSubTab('existing')}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
              >
                Upload &amp; Verify Document
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
};

/* =========================================================================
 * 6. ADD NOTE QUICK ACTION
 * ========================================================================= */
export const QuickActionAddNoteView: React.FC<CustomerQuickActionsProps> = ({
  customer,
  onCancel,
  onSuccess,
}) => {
  const [noteFor, setNoteFor] = useState(`${customer.name} (Customer)`);
  const [relatedTo, setRelatedTo] = useState('General');
  const [noteType, setNoteType] = useState('General Note');
  const [noteBody, setNoteBody] = useState(
    'Customer called to ask about deodorizing add-on. Recommended for Buddy due to sensitive skin. Will add to next appointment.'
  );
  const [visibility, setVisibility] = useState<'private' | 'customer'>('private');

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteBody.trim()) return;

    onSuccess(`Note added to ${customer.name}'s profile (${visibility === 'private' ? 'Internal Only' : 'Visible to Customer'})!`, {
      type: 'note',
      noteFor,
      relatedTo,
      noteType,
      description: noteBody,
      visibility,
    });
  };

  return (
    <div className="flex-1 flex flex-col p-6 sm:p-8 max-w-6xl mx-auto w-full">
      {/* Header */}
      <header className="mb-5">
        <nav aria-label="Breadcrumb" className="flex items-center space-x-1.5 text-xs text-slate-400 font-medium mb-1.5">
          <button onClick={onCancel} className="hover:text-slate-600 transition cursor-pointer">
            Customers
          </button>
          <span>›</span>
          <button onClick={onCancel} className="text-slate-600 hover:text-indigo-600 font-medium cursor-pointer">
            {customer.name}
          </button>
          <span>›</span>
          <span className="text-indigo-600 font-semibold">Add Note</span>
        </nav>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{customer.name}</h1>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            Active Customer
          </span>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-5 text-xs text-slate-500 font-normal">
          <div className="flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-slate-400 stroke-2" />
            <span>{customer.phone}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-slate-400 stroke-2" />
            <span>{customer.email}</span>
          </div>
        </div>
      </header>

      {/* Add Note Card */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-1">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Add Note</h2>
        </div>

        <form onSubmit={handleSaveNote} className="p-6 space-y-6">
          {/* Note Details Group */}
          <fieldset className="space-y-4">
            <legend className="text-xs font-semibold text-slate-800 tracking-wide uppercase">
              Note Details
            </legend>

            {/* Dropdown Row 1: Note For & Related To */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Note For */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5" htmlFor="note-for">
                  Note For <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="note-for"
                    value={noteFor}
                    onChange={(e) => setNoteFor(e.target.value)}
                    className="w-full text-xs rounded-lg border-slate-300 text-slate-800 bg-white py-2 pl-3 pr-8 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option>{customer.name} (Customer)</option>
                    <option>Buddy (Pet)</option>
                    <option>Luna (Pet)</option>
                  </select>
                </div>
              </div>

              {/* Related To */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5" htmlFor="related-to">
                  Related To
                </label>
                <div className="relative">
                  <select
                    id="related-to"
                    value={relatedTo}
                    onChange={(e) => setRelatedTo(e.target.value)}
                    className="w-full text-xs rounded-lg border-slate-300 text-slate-800 bg-white py-2 pl-3 pr-8 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option>General</option>
                    <option>Appointment #4821</option>
                    <option>Grooming Preferences</option>
                    <option>Medical &amp; Allergies</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Note Type */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5" htmlFor="note-type">
                Note Type
              </label>
              <div className="relative">
                <select
                  id="note-type"
                  value={noteType}
                  onChange={(e) => setNoteType(e.target.value)}
                  className="w-full text-xs rounded-lg border-slate-300 text-slate-800 bg-white py-2 pl-3 pr-8 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  <option>General Note</option>
                  <option>Behavioral Note</option>
                  <option>Special Instructions</option>
                  <option>Staff Alert</option>
                </select>
              </div>
            </div>

            {/* Note Content Area */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5" htmlFor="note-body">
                Note <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="note-body"
                rows={4}
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                className="w-full text-xs text-slate-800 rounded-lg border-slate-300 shadow-sm p-3 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 leading-relaxed resize-y bg-white"
                required
              ></textarea>
              <div className="mt-1 flex justify-end">
                <span className="text-[11px] text-slate-400 font-mono">{noteBody.length}/2000</span>
              </div>
            </div>
          </fieldset>

          {/* Visibility Section */}
          <fieldset className="pt-1">
            <legend className="text-xs font-semibold text-slate-800 tracking-wide uppercase mb-2.5">
              Visibility
            </legend>
            <div className="flex items-center gap-6">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="radio"
                  name="visibility"
                  value="private"
                  checked={visibility === 'private'}
                  onChange={() => setVisibility('private')}
                  className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500 focus:ring-offset-0"
                />
                <span className="text-xs text-slate-700">Private (Internal Only)</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="radio"
                  name="visibility"
                  value="customer"
                  checked={visibility === 'customer'}
                  onChange={() => setVisibility('customer')}
                  className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500 focus:ring-offset-0"
                />
                <span className="text-xs text-slate-700">Visible to Customer</span>
              </label>
            </div>
          </fieldset>

          {/* Actions Bar */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition cursor-pointer font-semibold tracking-wide"
            >
              Save Note
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
