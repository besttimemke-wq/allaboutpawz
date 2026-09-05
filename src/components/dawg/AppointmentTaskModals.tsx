'use client';

import React, { useState } from 'react';
import { 
  X, 
  Eye, 
  Edit3, 
  Calendar as CalendarIcon, 
  Sparkles, 
  Check, 
  Clock, 
  CheckCircle2, 
  CreditCard, 
  Send, 
  FileText, 
  Printer, 
  Receipt, 
  Copy, 
  XCircle, 
  UserMinus, 
  Trash2, 
  Phone, 
  Mail, 
  User, 
  DollarSign, 
  AlertCircle, 
  ShieldCheck, 
  MessageSquare,
  Scissors,
  CheckSquare
} from 'lucide-react';
import { AppointmentItem, AppointmentStatus } from '@/lib/dawg-types';

export type AppointmentActionType = 
  | 'view-details'
  | 'edit'
  | 'reschedule'
  | 'add-on'
  | 'check-in'
  | 'mark-in-progress'
  | 'mark-complete'
  | 'take-payment'
  | 'send-message'
  | 'add-note'
  | 'print-sheet'
  | 'print-invoice'
  | 'duplicate'
  | 'cancel'
  | 'no-show'
  | 'delete';

interface AppointmentTaskModalsProps {
  actionType: AppointmentActionType | null;
  appointment: AppointmentItem | null;
  onClose: () => void;
  onUpdateAppointment: (updated: AppointmentItem) => void;
  onDeleteAppointment: (id: string) => void;
  onDuplicateAppointment: (appt: AppointmentItem) => void;
  onShowToast: (msg: string) => void;
}

const AVAILABLE_ADDONS = [
  { id: 'blueberry-facial', name: 'Blueberry Facial & Tear Stain Treatment', price: 15.0, icon: '🫐' },
  { id: 'paw-butter', name: 'Paw Butter & Pad Restoration', price: 10.0, icon: '🐾' },
  { id: 'teeth-cleaning', name: 'Ultrasonic Teeth Brushing & Mint Breath', price: 18.0, icon: '🪥' },
  { id: 'flea-tick', name: 'Medicated Flea & Tick Soak', price: 25.0, icon: '🛁' },
  { id: 'deshedding', name: 'FURminator De-Shedding & Undercoat Blowout', price: 30.0, icon: '✨' },
  { id: 'nail-grind', name: 'Dremel Nail Grinding & Polish', price: 15.0, icon: '💅' },
  { id: 'specialty-cologne', name: 'Hypoallergenic Spa Cologne & Bandana', price: 8.0, icon: '🎀' },
];

export const AppointmentTaskModals: React.FC<AppointmentTaskModalsProps> = ({
  actionType,
  appointment,
  onClose,
  onUpdateAppointment,
  onDeleteAppointment,
  onDuplicateAppointment,
  onShowToast,
}) => {
  if (!actionType || !appointment) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden my-4 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {actionType === 'view-details' && (
          <ViewDetailsModalContent 
            appointment={appointment} 
            onClose={onClose}
            onUpdate={onUpdateAppointment}
            onShowToast={onShowToast}
          />
        )}

        {actionType === 'edit' && (
          <EditAppointmentModalContent 
            appointment={appointment} 
            onClose={onClose}
            onUpdate={onUpdateAppointment}
            onShowToast={onShowToast}
          />
        )}

        {actionType === 'reschedule' && (
          <RescheduleModalContent 
            appointment={appointment} 
            onClose={onClose}
            onUpdate={onUpdateAppointment}
            onShowToast={onShowToast}
          />
        )}

        {actionType === 'add-on' && (
          <AddonServiceModalContent 
            appointment={appointment} 
            onClose={onClose}
            onUpdate={onUpdateAppointment}
            onShowToast={onShowToast}
          />
        )}

        {actionType === 'take-payment' && (
          <TakePaymentModalContent 
            appointment={appointment} 
            onClose={onClose}
            onUpdate={onUpdateAppointment}
            onShowToast={onShowToast}
          />
        )}

        {actionType === 'send-message' && (
          <SendMessageModalContent 
            appointment={appointment} 
            onClose={onClose}
            onUpdate={onUpdateAppointment}
            onShowToast={onShowToast}
          />
        )}

        {actionType === 'add-note' && (
          <AddNoteModalContent 
            appointment={appointment} 
            onClose={onClose}
            onUpdate={onUpdateAppointment}
            onShowToast={onShowToast}
          />
        )}

        {actionType === 'print-sheet' && (
          <PrintCheckoutSheetModalContent 
            appointment={appointment} 
            onClose={onClose}
          />
        )}

        {actionType === 'print-invoice' && (
          <PrintInvoiceModalContent 
            appointment={appointment} 
            onClose={onClose}
          />
        )}

        {actionType === 'cancel' && (
          <CancelAppointmentModalContent 
            appointment={appointment} 
            onClose={onClose}
            onUpdate={onUpdateAppointment}
            onShowToast={onShowToast}
          />
        )}

        {actionType === 'no-show' && (
          <NoShowModalContent 
            appointment={appointment} 
            onClose={onClose}
            onUpdate={onUpdateAppointment}
            onShowToast={onShowToast}
          />
        )}

        {actionType === 'delete' && (
          <DeleteConfirmationModalContent 
            appointment={appointment} 
            onClose={onClose}
            onDelete={onDeleteAppointment}
            onShowToast={onShowToast}
          />
        )}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
   1. VIEW DETAILS MODAL CONTENT
-------------------------------------------------------------- */
const ViewDetailsModalContent: React.FC<{
  appointment: AppointmentItem;
  onClose: () => void;
  onUpdate: (appt: AppointmentItem) => void;
  onShowToast: (msg: string) => void;
}> = ({ appointment, onClose, onUpdate, onShowToast }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'history'>('overview');

  const handleQuickStatusChange = (newStatus: AppointmentStatus) => {
    onUpdate({
      ...appointment,
      status: newStatus,
    });
    onShowToast(`Status updated to "${newStatus}" for ${appointment.petName}`);
  };

  return (
    <div>
      {/* Header */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-2xl font-bold shadow-2xs">
            {appointment.petEmoji || '🐕'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">{appointment.petName}</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                {appointment.breed}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Owner: <span className="font-semibold text-slate-700">{appointment.customerName || 'Pet Parent'}</span> • ID: <span className="font-mono">{appointment.id}</span>
            </p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 px-5 text-xs font-semibold text-slate-500">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-2.5 px-3 border-b-2 cursor-pointer ${
            activeTab === 'overview' ? 'border-indigo-600 text-indigo-600' : 'border-transparent hover:text-slate-800'
          }`}
        >
          Appointment Overview
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`py-2.5 px-3 border-b-2 cursor-pointer ${
            activeTab === 'notes' ? 'border-indigo-600 text-indigo-600' : 'border-transparent hover:text-slate-800'
          }`}
        >
          Grooming Notes &amp; Flags
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`py-2.5 px-3 border-b-2 cursor-pointer ${
            activeTab === 'history' ? 'border-indigo-600 text-indigo-600' : 'border-transparent hover:text-slate-800'
          }`}
        >
          Service Timeline
        </button>
      </div>

      {/* Body */}
      <div className="p-6 space-y-4 text-xs max-h-[65vh] overflow-y-auto custom-scrollbar">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Status & Quick Action Pipeline */}
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Current Status:</span>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                  {appointment.status}
                </span>
              </div>
              <div className="flex items-center gap-1.5 pt-1 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => handleQuickStatusChange('Checked In')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                    appointment.status === 'Checked In'
                      ? 'bg-amber-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  ✓ Check In
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickStatusChange('In Progress')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                    appointment.status === 'In Progress'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  ⏱ In Progress
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickStatusChange('Completed')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                    appointment.status === 'Completed'
                      ? 'bg-teal-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  🎉 Complete
                </button>
              </div>
            </div>

            {/* Grid Information */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white border border-slate-200 rounded-2xl space-y-1">
                <span className="text-[11px] text-slate-400 font-medium">Scheduled Time</span>
                <p className="font-bold text-slate-800 text-sm">{appointment.time}</p>
                <p className="text-[11px] text-slate-500">{appointment.date || 'May 16, 2025'} ({appointment.duration || '2.5 hrs'})</p>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-2xl space-y-1">
                <span className="text-[11px] text-slate-400 font-medium">Assigned Groomer</span>
                <p className="font-bold text-slate-800 text-sm">{appointment.staffName || 'Sarah M.'}</p>
                <p className="text-[11px] text-slate-500">{appointment.location || 'Main Location'}</p>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-2xl space-y-1">
                <span className="text-[11px] text-slate-400 font-medium">Primary Service</span>
                <p className="font-bold text-slate-800 text-sm">{appointment.serviceName}</p>
                <p className="text-[11px] text-slate-500">{appointment.serviceCategory || 'Full Grooming Package'}</p>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-2xl space-y-1">
                <span className="text-[11px] text-slate-400 font-medium">Price &amp; Payment</span>
                <p className="font-bold text-emerald-600 text-sm">${appointment.price?.toFixed(2) || '85.00'}</p>
                <p className="text-[11px] text-slate-500">Deposit: ${appointment.depositAmount?.toFixed(2) || '25.00'} ({appointment.paymentStatus || 'Deposit Paid'})</p>
              </div>
            </div>

            {/* Contact Information */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Customer Contact</span>
                <span className="font-bold text-slate-800">{appointment.customerName || 'Pet Parent'}</span>
                <span className="text-slate-500 text-xs ml-2">📱 {appointment.customerPhone || '(555) 349-2810'}</span>
              </div>
              <span className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-lg border border-emerald-100">
                Rabies Verified ✓
              </span>
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="space-y-3">
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl">
              <span className="font-bold text-amber-900 block text-xs">Styling &amp; Handling Notes:</span>
              <p className="text-xs text-amber-800 mt-1">
                {appointment.notes || '1/2 inch guard on body, teddy bear round head, clip nails short, hypoallergenic shampoo only.'}
              </p>
            </div>
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
              <span className="font-bold text-slate-800 block text-xs">Behavioral &amp; Health Flags:</span>
              <ul className="list-disc pl-4 text-xs text-slate-600 space-y-1">
                <li>Sensitive ears — clean gently with warm organic solution.</li>
                <li>Loves salmon crunch treats during blow dry.</li>
                <li>Vaccinations on file valid until October 2025.</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-3 text-xs">
            <div className="border-l-2 border-indigo-200 pl-3.5 space-y-3">
              <div>
                <span className="text-[10px] text-slate-400 font-mono">Today, 8:45 AM</span>
                <p className="font-semibold text-slate-800">Appointment scheduled &amp; deposit authorized ($25.00)</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-mono">May 10, 2025</span>
                <p className="font-semibold text-slate-800">SMS reminder delivered to customer</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-mono">April 12, 2025</span>
                <p className="font-semibold text-slate-800">Previous visit: Deluxe Spa ($95.00) completed by Sarah M.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
        <span className="text-xs text-slate-400 font-mono">Ref: {appointment.id}</span>
        <button
          onClick={onClose}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-2xs"
        >
          Close File
        </button>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
   2. EDIT APPOINTMENT MODAL CONTENT
-------------------------------------------------------------- */
const EditAppointmentModalContent: React.FC<{
  appointment: AppointmentItem;
  onClose: () => void;
  onUpdate: (appt: AppointmentItem) => void;
  onShowToast: (msg: string) => void;
}> = ({ appointment, onClose, onUpdate, onShowToast }) => {
  const [petName, setPetName] = useState(appointment.petName || '');
  const [breed, setBreed] = useState(appointment.breed || '');
  const [customerName, setCustomerName] = useState(appointment.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(appointment.customerPhone || '(555) 349-2810');
  const [serviceName, setServiceName] = useState(appointment.serviceName || 'Full Groom');
  const [staffName, setStaffName] = useState(appointment.staffName || 'Sarah M.');
  const [time, setTime] = useState(appointment.time || '9:00 AM');
  const [duration, setDuration] = useState(appointment.duration || '2.5 hrs');
  const [price, setPrice] = useState(appointment.price?.toString() || '85.00');
  const [notes, setNotes] = useState(appointment.notes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: AppointmentItem = {
      ...appointment,
      petName,
      breed,
      customerName,
      customerPhone,
      serviceName,
      staffName,
      time,
      duration,
      price: parseFloat(price) || 85.0,
      notes,
    };
    onUpdate(updated);
    onShowToast(`Updated appointment details for ${petName}`);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
            <Edit3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Edit Appointment</h2>
            <p className="text-xs text-slate-500">Update pet, schedule, service, and pricing details</p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 space-y-4 text-xs max-h-[65vh] overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Pet Name</label>
            <input
              type="text"
              required
              value={petName}
              onChange={(e) => setPetName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Breed</label>
            <input
              type="text"
              required
              value={breed}
              onChange={(e) => setBreed(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Customer / Owner</label>
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Contact Phone</label>
            <input
              type="text"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Service</label>
            <select
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
            >
              <option>Full Groom</option>
              <option>Deluxe Spa</option>
              <option>Bath & Brush</option>
              <option>Nail Trim</option>
              <option>Puppy Intro Groom</option>
              <option>Deshedding Treatment</option>
            </select>
          </div>
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Groomer</label>
            <select
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
            >
              <option>Sarah M.</option>
              <option>Mike R.</option>
              <option>Jessica L.</option>
              <option>Taylor P.</option>
              <option>Alex D.</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Time Slot</label>
            <input
              type="text"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Duration</label>
            <input
              type="text"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Price ($)</label>
            <input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold text-slate-900"
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-700 font-semibold mb-1">Grooming Notes &amp; Requests</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-2xs cursor-pointer transition"
        >
          Save Changes
        </button>
      </div>
    </form>
  );
};

/* -------------------------------------------------------------
   3. RESCHEDULE MODAL CONTENT
-------------------------------------------------------------- */
const RescheduleModalContent: React.FC<{
  appointment: AppointmentItem;
  onClose: () => void;
  onUpdate: (appt: AppointmentItem) => void;
  onShowToast: (msg: string) => void;
}> = ({ appointment, onClose, onUpdate, onShowToast }) => {
  const [selectedDate, setSelectedDate] = useState(appointment.date || '2025-05-18');
  const [selectedTime, setSelectedTime] = useState(appointment.time || '10:30 AM');
  const [selectedGroomer, setSelectedGroomer] = useState(appointment.staffName || 'Sarah M.');
  const [notifyCustomer, setNotifyCustomer] = useState(true);

  const timeSlots = [
    '8:30 AM', '9:00 AM', '10:00 AM', '10:30 AM', 
    '11:30 AM', '1:00 PM', '2:00 PM', '2:30 PM', '3:30 PM', '4:00 PM'
  ];

  const handleReschedule = () => {
    onUpdate({
      ...appointment,
      date: selectedDate,
      time: selectedTime,
      staffName: selectedGroomer,
      status: 'Scheduled',
    });
    onShowToast(`Rescheduled ${appointment.petName} to ${selectedDate} at ${selectedTime}${notifyCustomer ? ' (SMS confirmation queued)' : ''}`);
    onClose();
  };

  return (
    <div>
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Reschedule Appointment</h2>
            <p className="text-xs text-slate-500">Pick a new date, time slot, and groomer for {appointment.petName}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 space-y-4 text-xs max-h-[65vh] overflow-y-auto custom-scrollbar">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Currently Scheduled:</span>
            <span className="font-bold text-slate-800">{appointment.date || 'May 16, 2025'} at {appointment.time}</span>
          </div>
          <span className="text-xs px-2 py-0.5 bg-slate-200 text-slate-700 font-semibold rounded-lg">
            {appointment.staffName || 'Sarah M.'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">New Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Assigned Groomer</label>
            <select
              value={selectedGroomer}
              onChange={(e) => setSelectedGroomer(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
            >
              <option>Sarah M.</option>
              <option>Mike R.</option>
              <option>Jessica L.</option>
              <option>Taylor P.</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-slate-700 font-semibold mb-1.5">Available Time Slots</label>
          <div className="grid grid-cols-5 gap-2">
            {timeSlots.map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => setSelectedTime(slot)}
                className={`py-2 px-1 text-center rounded-xl font-semibold transition cursor-pointer text-xs ${
                  selectedTime === slot
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {slot}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl cursor-pointer">
          <input
            type="checkbox"
            checked={notifyCustomer}
            onChange={(e) => setNotifyCustomer(e.target.checked)}
            className="w-4 h-4 accent-indigo-600"
          />
          <div>
            <span className="font-semibold text-slate-800">Send Reschedule SMS &amp; Email Notice</span>
            <p className="text-[11px] text-slate-500">Automatically dispatches update to {appointment.customerName || 'customer'}</p>
          </div>
        </label>
      </div>

      <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleReschedule}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-2xs cursor-pointer transition"
        >
          Confirm Reschedule
        </button>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
   4. ADD-ON / SERVICE UPDATE MODAL CONTENT
-------------------------------------------------------------- */
const AddonServiceModalContent: React.FC<{
  appointment: AppointmentItem;
  onClose: () => void;
  onUpdate: (appt: AppointmentItem) => void;
  onShowToast: (msg: string) => void;
}> = ({ appointment, onClose, onUpdate, onShowToast }) => {
  const [selectedAddons, setSelectedAddons] = useState<string[]>([
    'blueberry-facial'
  ]);
  const basePrice = 85.0;

  const toggleAddon = (id: string) => {
    setSelectedAddons((prev) => 
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const addonsTotal = selectedAddons.reduce((sum, id) => {
    const addon = AVAILABLE_ADDONS.find((a) => a.id === id);
    return sum + (addon ? addon.price : 0);
  }, 0);

  const finalTotal = basePrice + addonsTotal;

  const handleSave = () => {
    onUpdate({
      ...appointment,
      price: finalTotal,
      notes: `${appointment.notes || ''} [Add-ons: ${selectedAddons.join(', ')}]`,
    });
    onShowToast(`Services & Add-ons updated for ${appointment.petName} ($${finalTotal.toFixed(2)})`);
    onClose();
  };

  return (
    <div>
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Add-on / Service Upgrades</h2>
            <p className="text-xs text-slate-500">Select premium spa treatments &amp; services for {appointment.petName}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 space-y-4 text-xs max-h-[60vh] overflow-y-auto custom-scrollbar">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Base Grooming Package:</span>
            <span className="font-bold text-slate-800">{appointment.serviceName}</span>
          </div>
          <span className="font-bold text-slate-900 text-sm">${basePrice.toFixed(2)}</span>
        </div>

        <div className="space-y-2">
          <span className="font-bold text-slate-700 block text-xs">Select Spa Add-ons:</span>
          {AVAILABLE_ADDONS.map((addon) => {
            const isChecked = selectedAddons.includes(addon.id);
            return (
              <div
                key={addon.id}
                onClick={() => toggleAddon(addon.id)}
                className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                  isChecked
                    ? 'bg-purple-50/70 border-purple-200 text-purple-950'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{addon.icon}</span>
                  <div>
                    <span className="font-semibold block text-xs">{addon.name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-xs text-slate-900">+${addon.price.toFixed(2)}</span>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                    className="w-4 h-4 accent-purple-600 pointer-events-none"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div>
          <span className="text-[11px] text-slate-400 block">Total Appointment Value:</span>
          <span className="text-base font-extrabold text-purple-700">${finalTotal.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-2xs cursor-pointer transition"
          >
            Apply Services
          </button>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
   5. TAKE PAYMENT MODAL CONTENT
-------------------------------------------------------------- */
const TakePaymentModalContent: React.FC<{
  appointment: AppointmentItem;
  onClose: () => void;
  onUpdate: (appt: AppointmentItem) => void;
  onShowToast: (msg: string) => void;
}> = ({ appointment, onClose, onUpdate, onShowToast }) => {
  const servicePrice = appointment.price || 85.0;
  const depositPaid = appointment.depositAmount || 25.0;
  const [tipPercentage, setTipPercentage] = useState<number>(20);
  const [customTip, setCustomTip] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash' | 'contactless' | 'giftcard'>('card');
  const [isProcessing, setIsProcessing] = useState(false);

  const subtotalBalance = Math.max(0, servicePrice - depositPaid);
  const tipAmount = customTip !== '' 
    ? (parseFloat(customTip) || 0) 
    : (servicePrice * tipPercentage) / 100;
  const finalAmountDue = subtotalBalance + tipAmount;

  const handleCharge = () => {
    setIsProcessing(true);
    setTimeout(() => {
      onUpdate({
        ...appointment,
        paymentStatus: 'Paid in Full',
        status: appointment.status === 'Scheduled' ? 'Confirmed' : appointment.status,
      });
      setIsProcessing(false);
      onShowToast(`Processed $${finalAmountDue.toFixed(2)} payment for ${appointment.petName} via ${paymentMethod.toUpperCase()}!`);
      onClose();
    }, 900);
  };

  return (
    <div>
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Checkout &amp; Take Payment</h2>
            <p className="text-xs text-slate-500">Process balance for {appointment.petName} ({appointment.customerName || 'Client'})</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 space-y-4 text-xs max-h-[65vh] overflow-y-auto custom-scrollbar">
        {/* Invoice Summary Box */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
          <div className="flex justify-between text-slate-600">
            <span>{appointment.serviceName} Base Price</span>
            <span className="font-semibold text-slate-900">${servicePrice.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-emerald-600">
            <span>Deposit Already Paid (Online)</span>
            <span className="font-semibold">-${depositPaid.toFixed(2)}</span>
          </div>
          <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-800">
            <span>Balance Remaining</span>
            <span>${subtotalBalance.toFixed(2)}</span>
          </div>
        </div>

        {/* Tip Selector */}
        <div>
          <label className="block text-slate-700 font-semibold mb-2">Add Groomer Tip</label>
          <div className="grid grid-cols-4 gap-2">
            {[15, 20, 25, 0].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => {
                  setTipPercentage(pct);
                  setCustomTip('');
                }}
                className={`py-2 text-center rounded-xl font-bold transition cursor-pointer text-xs ${
                  customTip === '' && tipPercentage === pct
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {pct === 0 ? 'No Tip' : `${pct}% ($${((servicePrice * pct) / 100).toFixed(2)})`}
              </button>
            ))}
          </div>
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-slate-700 font-semibold mb-2">Payment Method</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod('card')}
              className={`p-2.5 rounded-xl border font-semibold flex flex-col items-center gap-1 transition cursor-pointer ${
                paymentMethod === 'card'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Card / Terminal</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('contactless')}
              className={`p-2.5 rounded-xl border font-semibold flex flex-col items-center gap-1 transition cursor-pointer ${
                paymentMethod === 'contactless'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Apple / Google Pay</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('cash')}
              className={`p-2.5 rounded-xl border font-semibold flex flex-col items-center gap-1 transition cursor-pointer ${
                paymentMethod === 'cash'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Cash</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div>
          <span className="text-[11px] text-slate-400 block">Total Due:</span>
          <span className="text-xl font-extrabold text-emerald-700">${finalAmountDue.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleCharge}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-2xs cursor-pointer transition flex items-center gap-2"
          >
            {isProcessing ? 'Processing...' : `Charge $${finalAmountDue.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
   6. SEND MESSAGE MODAL CONTENT
-------------------------------------------------------------- */
const SendMessageModalContent: React.FC<{
  appointment: AppointmentItem;
  onClose: () => void;
  onUpdate: (appt: AppointmentItem) => void;
  onShowToast: (msg: string) => void;
}> = ({ appointment, onClose, onUpdate, onShowToast }) => {
  const [channel, setChannel] = useState<'sms' | 'email'>('sms');
  const [template, setTemplate] = useState('ready-pickup');
  const [messageText, setMessageText] = useState(
    `Hi ${appointment.customerName || 'Pet Parent'}! 🐾 ${appointment.petName} is completely finished and looking fabulous! Ready for pickup at All About Pawz salon.`
  );

  const handleTemplateSelect = (type: string) => {
    setTemplate(type);
    if (type === 'ready-pickup') {
      setMessageText(`Hi ${appointment.customerName || 'Pet Parent'}! 🐾 ${appointment.petName} is finished and looking fabulous! Ready for pickup at All About Pawz salon.`);
    } else if (type === 'reminder') {
      setMessageText(`Reminder: ${appointment.petName}'s grooming appointment is scheduled for ${appointment.date || 'tomorrow'} at ${appointment.time}. Reply C to confirm or call to reschedule.`);
    } else if (type === 'progress') {
      setMessageText(`Quick update: ${appointment.petName} is in the bath with Sarah M. and doing great! We'll text again when drying and scissor work is complete.`);
    }
  };

  const handleSend = () => {
    onShowToast(`Message successfully dispatched to ${appointment.customerName || 'customer'} via ${channel.toUpperCase()}`);
    onClose();
  };

  return (
    <div>
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Send Customer Message</h2>
            <p className="text-xs text-slate-500">Dispatch instant SMS or Email to {appointment.customerName || 'Client'}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 space-y-4 text-xs">
        <div className="flex rounded-xl bg-slate-100 p-1 font-semibold text-slate-600">
          <button
            type="button"
            onClick={() => setChannel('sms')}
            className={`flex-1 py-1.5 rounded-lg transition cursor-pointer text-center ${
              channel === 'sms' ? 'bg-white text-indigo-600 shadow-2xs font-bold' : 'hover:text-slate-900'
            }`}
          >
            📱 SMS Text Message ({appointment.customerPhone || '(555) 349-2810'})
          </button>
          <button
            type="button"
            onClick={() => setChannel('email')}
            className={`flex-1 py-1.5 rounded-lg transition cursor-pointer text-center ${
              channel === 'email' ? 'bg-white text-indigo-600 shadow-2xs font-bold' : 'hover:text-slate-900'
            }`}
          >
            ✉️ Email Notification
          </button>
        </div>

        <div>
          <label className="block text-slate-700 font-semibold mb-1.5">Quick Message Templates</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleTemplateSelect('ready-pickup')}
              className={`p-2 rounded-xl border text-left font-semibold transition cursor-pointer ${
                template === 'ready-pickup' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              🎉 Ready for Pickup
            </button>
            <button
              type="button"
              onClick={() => handleTemplateSelect('reminder')}
              className={`p-2 rounded-xl border text-left font-semibold transition cursor-pointer ${
                template === 'reminder' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              ⏰ Appointment Reminder
            </button>
            <button
              type="button"
              onClick={() => handleTemplateSelect('progress')}
              className={`p-2 rounded-xl border text-left font-semibold transition cursor-pointer ${
                template === 'progress' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              🛁 Bathing in Progress
            </button>
          </div>
        </div>

        <div>
          <label className="block text-slate-700 font-semibold mb-1">Message Content</label>
          <textarea
            rows={4}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
          />
          <div className="flex justify-between text-[11px] text-slate-400 mt-1">
            <span>Standard carrier rates apply</span>
            <span>{messageText.length} characters</span>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSend}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-2xs cursor-pointer transition flex items-center gap-1.5"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send Message</span>
        </button>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
   7. ADD NOTE MODAL CONTENT
-------------------------------------------------------------- */
const AddNoteModalContent: React.FC<{
  appointment: AppointmentItem;
  onClose: () => void;
  onUpdate: (appt: AppointmentItem) => void;
  onShowToast: (msg: string) => void;
}> = ({ appointment, onClose, onUpdate, onShowToast }) => {
  const [noteText, setNoteText] = useState('');
  const [noteType, setNoteType] = useState<'internal' | 'behavioral' | 'medical'>('internal');

  const tags = [
    'Matting behind ears',
    'Nervous with high-velocity dryer',
    'Use hypoallergenic shampoo only',
    'Loves belly rubs & lick mats',
    'Needs 2-person hold for nails',
  ];

  const handleAddTag = (tag: string) => {
    setNoteText((prev) => (prev ? `${prev}, ${tag}` : tag));
  };

  const handleSaveNote = () => {
    if (!noteText.trim()) return;
    const combinedNotes = appointment.notes ? `${appointment.notes} | [${noteType.toUpperCase()}]: ${noteText}` : `[${noteType.toUpperCase()}]: ${noteText}`;
    onUpdate({
      ...appointment,
      notes: combinedNotes,
    });
    onShowToast(`Note saved to ${appointment.petName}'s file`);
    onClose();
  };

  return (
    <div>
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Add File Note</h2>
            <p className="text-xs text-slate-500">Record staff observations, handling flags, or styling details</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 space-y-4 text-xs">
        <div>
          <label className="block text-slate-700 font-semibold mb-1.5">Note Classification</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setNoteType('internal')}
              className={`p-2 rounded-xl border text-center font-semibold transition cursor-pointer ${
                noteType === 'internal' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              📝 Staff / Internal
            </button>
            <button
              type="button"
              onClick={() => setNoteType('behavioral')}
              className={`p-2 rounded-xl border text-center font-semibold transition cursor-pointer ${
                noteType === 'behavioral' ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              ⚠️ Behavioral Flag
            </button>
            <button
              type="button"
              onClick={() => setNoteType('medical')}
              className={`p-2 rounded-xl border text-center font-semibold transition cursor-pointer ${
                noteType === 'medical' ? 'border-rose-500 bg-rose-50 text-rose-800' : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              🩺 Medical / Skin
            </button>
          </div>
        </div>

        <div>
          <label className="block text-slate-700 font-semibold mb-1">Quick Select Tags</label>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleAddTag(tag)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-medium transition cursor-pointer"
              >
                + {tag}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-slate-700 font-semibold mb-1">Note Details</label>
          <textarea
            rows={3}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Type notes regarding coat, blade length, pet temperament, or owner instructions..."
            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
          />
        </div>
      </div>

      <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSaveNote}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-2xs cursor-pointer transition"
        >
          Save Note to File
        </button>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
   8. PRINT CHECKOUT SHEET MODAL CONTENT
-------------------------------------------------------------- */
const PrintCheckoutSheetModalContent: React.FC<{
  appointment: AppointmentItem;
  onClose: () => void;
}> = ({ appointment, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Grooming Intake &amp; Checkout Sheet</h2>
            <p className="text-xs text-slate-500">Printable salon service checklist &amp; kennel card</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 space-y-4 text-xs max-h-[65vh] overflow-y-auto custom-scrollbar">
        {/* Printable Card Area */}
        <div className="p-5 bg-white border-2 border-slate-300 rounded-2xl space-y-4 font-sans text-slate-900">
          <div className="flex justify-between items-start border-b border-slate-200 pb-3">
            <div>
              <h3 className="font-extrabold text-base uppercase tracking-tight">All About Pawz Salon</h3>
              <p className="text-[11px] text-slate-500">Kennel &amp; Service Routing Sheet</p>
            </div>
            <div className="text-right">
              <span className="font-mono text-xs font-bold text-slate-700">{appointment.id}</span>
              <p className="text-[11px] text-slate-500">{appointment.date || 'May 16, 2025'} • {appointment.time}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Pet Name &amp; Breed</span>
              <span className="font-bold text-sm text-slate-900">{appointment.petName} ({appointment.breed})</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Owner &amp; Phone</span>
              <span className="font-semibold text-xs text-slate-800">{appointment.customerName || 'Customer'} • {appointment.customerPhone || '(555) 349-2810'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Assigned Groomer</span>
              <span className="font-semibold text-xs text-slate-800">{appointment.staffName || 'Sarah M.'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Service Package</span>
              <span className="font-semibold text-xs text-slate-800">{appointment.serviceName} (${appointment.price?.toFixed(2)})</span>
            </div>
          </div>

          <div className="space-y-2">
            <span className="font-bold text-xs uppercase tracking-wider text-slate-500 block">Service Stage Checklist</span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {['Pre-Bath Brush Out', 'Warm Hydro-Bath & Shampoo', 'Tearless Facial Scrub', 'High-Velocity Blow Dry', 'Full Coat Scissor / Clip', 'Sanitary & Paw Pad Trim', 'Ear Cleaning & Plucking', 'Dremel Nail Grind'].map((task) => (
                <label key={task} className="flex items-center gap-2 p-2 border border-slate-200 rounded-lg">
                  <div className="w-3.5 h-3.5 border border-slate-400 rounded-sm" />
                  <span>{task}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-200 pt-3 flex justify-between text-[11px] text-slate-500">
            <div>Groomer Initial: __________</div>
            <div>Pickup Checked: __________</div>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
        >
          Close
        </button>
        <button
          type="button"
          onClick={handlePrint}
          className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-2xs cursor-pointer transition flex items-center gap-1.5"
        >
          <Printer className="w-4 h-4" />
          <span>Print Sheet Now</span>
        </button>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
   9. PRINT INVOICE MODAL CONTENT
-------------------------------------------------------------- */
const PrintInvoiceModalContent: React.FC<{
  appointment: AppointmentItem;
  onClose: () => void;
}> = ({ appointment, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const basePrice = appointment.price || 85.0;
  const deposit = appointment.depositAmount || 25.0;
  const tax = basePrice * 0.0825;
  const total = basePrice + tax;

  return (
    <div>
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Invoice &amp; Receipt</h2>
            <p className="text-xs text-slate-500">Itemized bill for {appointment.customerName || 'Client'}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 space-y-4 text-xs max-h-[65vh] overflow-y-auto custom-scrollbar">
        <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-4">
          <div className="flex justify-between items-start border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-base text-indigo-950">ALL ABOUT PAWZ GROOMING</h3>
              <p className="text-[11px] text-slate-500">1042 Commerce Blvd, Suite A</p>
              <p className="text-[11px] text-slate-500">Tax ID: 84-2981042</p>
            </div>
            <div className="text-right">
              <span className="font-bold text-slate-900">INVOICE #{appointment.id.toUpperCase()}</span>
              <p className="text-[11px] text-slate-500">Date: {appointment.date || 'May 16, 2025'}</p>
              <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-[10px]">
                {appointment.paymentStatus || 'Deposit Paid'}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 text-[10px] uppercase">
                  <th className="py-1">Description</th>
                  <th className="py-1 text-right">Qty</th>
                  <th className="py-1 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr>
                  <td className="py-2 font-medium">{appointment.serviceName} ({appointment.petName} - {appointment.breed})</td>
                  <td className="py-2 text-right">1</td>
                  <td className="py-2 text-right font-mono">${basePrice.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="py-2 font-medium">Deposit Applied</td>
                  <td className="py-2 text-right">1</td>
                  <td className="py-2 text-right font-mono text-emerald-600">-${deposit.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-200 pt-3 space-y-1 text-right">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal:</span>
              <span className="font-mono">${(basePrice - deposit).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Sales Tax (8.25%):</span>
              <span className="font-mono">${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-extrabold text-sm text-slate-900 pt-1 border-t border-slate-100">
              <span>Total Remaining:</span>
              <span className="font-mono text-emerald-700">${(basePrice - deposit + tax).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
        >
          Close
        </button>
        <button
          type="button"
          onClick={handlePrint}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-2xs cursor-pointer transition flex items-center gap-1.5"
        >
          <Printer className="w-4 h-4" />
          <span>Print / Save PDF</span>
        </button>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
   10. CANCEL APPOINTMENT MODAL CONTENT
-------------------------------------------------------------- */
const CancelAppointmentModalContent: React.FC<{
  appointment: AppointmentItem;
  onClose: () => void;
  onUpdate: (appt: AppointmentItem) => void;
  onShowToast: (msg: string) => void;
}> = ({ appointment, onClose, onUpdate, onShowToast }) => {
  const [reason, setReason] = useState('Customer Request');
  const [refundDeposit, setRefundDeposit] = useState(false);

  const handleConfirmCancel = () => {
    onUpdate({
      ...appointment,
      status: 'Canceled',
      notes: `${appointment.notes || ''} [Canceled: ${reason}${refundDeposit ? ' - Deposit Refunded' : ''}]`,
    });
    onShowToast(`Appointment for ${appointment.petName} was canceled (${reason})`);
    onClose();
  };

  return (
    <div>
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-rose-50 text-rose-700">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Cancel Appointment</h2>
            <p className="text-xs text-slate-500">Record cancellation for {appointment.petName}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 space-y-4 text-xs">
        <div>
          <label className="block text-slate-700 font-semibold mb-1">Cancellation Reason</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none bg-white text-slate-800"
          >
            <option>Customer Request / Change of Plans</option>
            <option>Pet Illness / Veterinary Quarantine</option>
            <option>Inclement Weather / Emergency</option>
            <option>Salon Staffing / Rescheduled by Salon</option>
            <option>Other</option>
          </select>
        </div>

        <label className="flex items-center gap-2 p-3 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer">
          <input
            type="checkbox"
            checked={refundDeposit}
            onChange={(e) => setRefundDeposit(e.target.checked)}
            className="w-4 h-4 accent-rose-600"
          />
          <div>
            <span className="font-semibold text-slate-800">Refund $25.00 Booking Deposit</span>
            <p className="text-[11px] text-slate-500">Initiates instant credit back to client original payment method</p>
          </div>
        </label>
      </div>

      <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
        >
          Keep Appointment
        </button>
        <button
          type="button"
          onClick={handleConfirmCancel}
          className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-2xs cursor-pointer transition"
        >
          Confirm Cancellation
        </button>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
   11. NO SHOW MODAL CONTENT
-------------------------------------------------------------- */
const NoShowModalContent: React.FC<{
  appointment: AppointmentItem;
  onClose: () => void;
  onUpdate: (appt: AppointmentItem) => void;
  onShowToast: (msg: string) => void;
}> = ({ appointment, onClose, onUpdate, onShowToast }) => {
  const [chargeFee, setChargeFee] = useState(true);

  const handleConfirmNoShow = () => {
    onUpdate({
      ...appointment,
      status: 'No Show',
    });
    onShowToast(`Marked ${appointment.petName} as No Show${chargeFee ? ' and forfeited $25 deposit' : ''}`);
    onClose();
  };

  return (
    <div>
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
            <UserMinus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Mark as No Show</h2>
            <p className="text-xs text-slate-500">Client did not arrive for scheduled slot</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 space-y-4 text-xs">
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
          <p className="font-bold">No-Show Policy Enforcement</p>
          <p className="text-[11px] mt-0.5">
            Marking an appointment as No Show updates customer attendance records and releases the grooming station.
          </p>
        </div>

        <label className="flex items-center gap-2 p-3 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer">
          <input
            type="checkbox"
            checked={chargeFee}
            onChange={(e) => setChargeFee(e.target.checked)}
            className="w-4 h-4 accent-amber-600"
          />
          <div>
            <span className="font-semibold text-slate-800">Forfeit $25.00 Deposit Fee</span>
            <p className="text-[11px] text-slate-500">Deposit will be applied to groomer commission compensation</p>
          </div>
        </label>
      </div>

      <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirmNoShow}
          className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-2xs cursor-pointer transition"
        >
          Confirm No Show
        </button>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
   12. DELETE CONFIRMATION MODAL CONTENT
-------------------------------------------------------------- */
const DeleteConfirmationModalContent: React.FC<{
  appointment: AppointmentItem;
  onClose: () => void;
  onDelete: (id: string) => void;
  onShowToast: (msg: string) => void;
}> = ({ appointment, onClose, onDelete, onShowToast }) => {
  const handleDelete = () => {
    onDelete(appointment.id);
    onShowToast(`Permanently deleted appointment for ${appointment.petName}`);
    onClose();
  };

  return (
    <div>
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-rose-50 text-rose-700">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Delete Appointment</h2>
            <p className="text-xs text-slate-500">Permanent removal confirmation</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 space-y-3 text-xs">
        <p className="text-slate-700 text-sm">
          Are you sure you want to permanently delete the appointment for <strong className="text-slate-900">{appointment.petName}</strong> scheduled on {appointment.date || 'May 16, 2025'} at {appointment.time}?
        </p>
        <p className="text-rose-600 font-semibold text-xs">
          ⚠️ This action is irreversible and will remove all associated station bookings.
        </p>
      </div>

      <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-2xs cursor-pointer transition"
        >
          Delete Appointment
        </button>
      </div>
    </div>
  );
};
