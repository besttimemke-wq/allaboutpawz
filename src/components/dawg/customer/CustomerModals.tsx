'use client';

import React, { useState } from 'react';
import { CustomerFullProfile, CustomerPetDetail, CustomerAppointmentItem } from '@/lib/dawg-types';
import {
  X,
  Pencil,
  Plus,
  Trash2,
  Calendar,
  Clock,
  Scissors,
  CheckCircle,
  AlertCircle,
  Camera,
  FileText,
  DollarSign,
  Download,
  CreditCard,
  ShieldCheck,
  Send,
  Sparkles,
  RefreshCw,
  Mail,
  MessageSquare,
  History,
  Tag,
  UserCheck,
  Printer,
  ChevronRight,
} from 'lucide-react';
import Image from 'next/image';

/* -------------------------------------------------------------
 * 1. EDIT PET MODAL
 * ----------------------------------------------------------- */
export const EditPetModal: React.FC<{
  pet: CustomerPetDetail;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedPet: CustomerPetDetail) => void;
}> = ({ pet, isOpen, onClose, onSave }) => {
  const [name, setName] = useState(pet.name);
  const [breed, setBreed] = useState(pet.breed);
  const [gender, setGender] = useState(pet.gender);
  const [birthDate, setBirthDate] = useState(pet.birthDate || '');
  const [weight, setWeight] = useState(pet.weight || '');
  const [medicalAlert, setMedicalAlert] = useState(pet.medicalAlert || '');
  const [vaccinationsStatus, setVaccinationsStatus] = useState<'Up to date' | 'Expiring Soon' | 'Expired'>(
    (pet.vaccinationsStatus as 'Up to date' | 'Expiring Soon' | 'Expired') || 'Up to date'
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...pet,
      name,
      breed,
      gender,
      birthDate,
      weight,
      medicalAlert,
      vaccinationsStatus,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">Edit Pet Profile – {pet.name}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Pet Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Breed</label>
              <input
                type="text"
                required
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as 'Male' | 'Female')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-indigo-500"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Birth Date</label>
              <input
                type="text"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Weight</label>
              <input
                type="text"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Vaccination Status</label>
            <select
              value={vaccinationsStatus}
              onChange={(e) => setVaccinationsStatus(e.target.value as 'Up to date' | 'Expiring Soon' | 'Expired')}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-indigo-500"
            >
              <option value="Up to date">Up to date</option>
              <option value="Expiring Soon">Expiring Soon (30 Days)</option>
              <option value="Expired">Expired</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Health, Allergies &amp; Care Notes</label>
            <input
              type="text"
              value={medicalAlert}
              onChange={(e) => setMedicalAlert(e.target.value)}
              placeholder="e.g. Sensitive skin, hip dysplasia, no chicken treats"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-xs cursor-pointer"
            >
              Save Pet Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
 * 2. MANAGE VACCINES MODAL
 * ----------------------------------------------------------- */
export const ManageVaccinesModal: React.FC<{
  pet: CustomerPetDetail;
  isOpen: boolean;
  onClose: () => void;
  onSave: (records: { name: string; expiry: string; status: string }[]) => void;
}> = ({ pet, isOpen, onClose, onSave }) => {
  const [vaccines, setVaccines] = useState([
    { name: 'Rabies (3-Year)', expiry: 'May 2, 2026', status: 'Valid', clinic: 'Frisco Paws Vet' },
    { name: 'DHPP / Distemper', expiry: 'May 2, 2026', status: 'Valid', clinic: 'Frisco Paws Vet' },
    { name: 'Bordetella (Kennel Cough)', expiry: 'Nov 2, 2025', status: 'Valid', clinic: 'Frisco Paws Vet' },
    { name: 'Canine Influenza (H3N2/H3N8)', expiry: 'Aug 14, 2025', status: 'Valid', clinic: 'Frisco Paws Vet' },
  ]);
  const [newVacName, setNewVacName] = useState('');
  const [newVacExpiry, setNewVacExpiry] = useState('');

  if (!isOpen) return null;

  const handleAddVaccine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVacName || !newVacExpiry) return;
    setVaccines(prev => [
      ...prev,
      { name: newVacName, expiry: newVacExpiry, status: 'Valid', clinic: 'Self Reported' },
    ]);
    setNewVacName('');
    setNewVacExpiry('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-sm">Manage Vaccines – {pet.name}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {vaccines.map((v, i) => (
              <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800">{v.name}</div>
                  <div className="text-slate-400 text-[11px]">Expires: {v.expiry} • {v.clinic}</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {v.status}
                </span>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddVaccine} className="pt-3 border-t border-slate-100 space-y-3">
            <div className="font-semibold text-slate-700 text-xs">Add / Update Vaccine Record</div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Vaccine Name (e.g. Lyme)"
                value={newVacName}
                onChange={(e) => setNewVacName(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
              <input
                type="text"
                placeholder="Expiry Date (e.g. May 2026)"
                value={newVacExpiry}
                onChange={(e) => setNewVacExpiry(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Record</span>
            </button>
          </form>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <button
              onClick={() => {
                onSave(vaccines);
                onClose();
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl cursor-pointer"
            >
              Save Vaccine Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
 * 3. RESCHEDULE APPOINTMENT MODAL
 * ----------------------------------------------------------- */
export const RescheduleModal: React.FC<{
  appointment: any;
  isOpen: boolean;
  onClose: () => void;
  onReschedule: (newDate: string, newTime: string) => void;
}> = ({ appointment, isOpen, onClose, onReschedule }) => {
  const [date, setDate] = useState('2025-05-24');
  const [time, setTime] = useState('09:30 AM');

  if (!isOpen || !appointment) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">Reschedule – {appointment.pet}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-indigo-900">
            <div className="font-bold">{appointment.service}</div>
            <div className="text-[11px] text-indigo-700">Current Slot: {appointment.date} at {appointment.time} ({appointment.groomer})</div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Select New Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Select Time Slot</label>
            <select
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
            >
              <option value="08:30 AM">08:30 AM (Available with Sarah M.)</option>
              <option value="09:30 AM">09:30 AM (Available with Mike R.)</option>
              <option value="11:00 AM">11:00 AM (Available with Jessica L.)</option>
              <option value="01:30 PM">01:30 PM (Available with Sarah M.)</option>
              <option value="03:00 PM">03:00 PM (Available with Mike R.)</option>
            </select>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onReschedule(date, time);
                onClose();
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl cursor-pointer shadow-xs"
            >
              Confirm Reschedule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
 * 4. ADD-ON / SERVICE UPDATE MODAL
 * ----------------------------------------------------------- */
export const AddonServiceModal: React.FC<{
  appointment: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (addons: string[]) => void;
}> = ({ appointment, isOpen, onClose, onUpdate }) => {
  const [selectedAddons, setSelectedAddons] = useState<string[]>([
    'Blueberry Facial ($20)',
    'Teeth Brushing & Polish ($15)',
  ]);

  const addonOptions = [
    { name: 'Blueberry Facial ($20)', price: 20 },
    { name: 'Teeth Brushing & Polish ($15)', price: 15 },
    { name: 'De-Shedding Furminator Treatment ($25)', price: 25 },
    { name: 'Oatmeal & Aloe Soothing Soak ($15)', price: 15 },
    { name: 'Paw Pad Balm & Dremel Filing ($20)', price: 20 },
    { name: 'Flea & Tick Botanical Dip ($30)', price: 30 },
  ];

  if (!isOpen || !appointment) return null;

  const toggleAddon = (name: string) => {
    setSelectedAddons(prev =>
      prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-slate-900 text-sm">Add-on / Service Update – {appointment.pet}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <div className="font-semibold text-slate-700">Select Add-on Upgrades for Grooming Session:</div>
          <div className="space-y-2">
            {addonOptions.map((opt) => {
              const isChecked = selectedAddons.includes(opt.name);
              return (
                <div
                  key={opt.name}
                  onClick={() => toggleAddon(opt.name)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                    isChecked
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>{opt.name}</span>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                    className="accent-indigo-600 w-4 h-4"
                  />
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onUpdate(selectedAddons);
                onClose();
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl cursor-pointer shadow-xs"
            >
              Apply Updates
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
 * 5. VIEW APPOINTMENT DETAILS MODAL
 * ----------------------------------------------------------- */
export const AppointmentDetailsModal: React.FC<{
  appointment: any;
  isOpen: boolean;
  onClose: () => void;
}> = ({ appointment, isOpen, onClose }) => {
  if (!isOpen || !appointment) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">Appointment Details – #{appointment.id}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <div className="text-base font-bold text-slate-900">{appointment.pet}</div>
              <div className="text-slate-500">{appointment.service}</div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {appointment.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-slate-700">
            <div className="p-3 border border-slate-100 rounded-xl bg-slate-50/50">
              <span className="text-slate-400 block text-[11px]">Date &amp; Time</span>
              <span className="font-semibold">{appointment.date} at {appointment.time}</span>
            </div>
            <div className="p-3 border border-slate-100 rounded-xl bg-slate-50/50">
              <span className="text-slate-400 block text-[11px]">Estimated Duration</span>
              <span className="font-semibold">{appointment.duration}</span>
            </div>
            <div className="p-3 border border-slate-100 rounded-xl bg-slate-50/50">
              <span className="text-slate-400 block text-[11px]">Assigned Groomer</span>
              <span className="font-semibold">{appointment.groomer}</span>
            </div>
            <div className="p-3 border border-slate-100 rounded-xl bg-slate-50/50">
              <span className="text-slate-400 block text-[11px]">Location</span>
              <span className="font-semibold">{appointment.location}</span>
            </div>
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900">
            <div className="font-bold flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>Grooming Intake Instructions:</span>
            </div>
            <p className="text-[11px] mt-1 text-amber-800">
              Hand-scissored rounded teddy face, 5/8&quot; comb on body, sensitive hypoallergenic shampoo. Brush teeth and clip nails short.
            </p>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-xl cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
 * 6. VIEW GROOMING RECORD MODAL
 * ----------------------------------------------------------- */
export const ViewGroomingRecordModal: React.FC<{
  record: any;
  isOpen: boolean;
  onClose: () => void;
}> = ({ record, isOpen, onClose }) => {
  if (!isOpen || !record) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">Grooming Record – {record.pet} ({record.date})</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="text-[10px] text-slate-400 font-medium uppercase">Service</div>
              <div className="font-bold text-slate-800 mt-0.5">{record.service}</div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="text-[10px] text-slate-400 font-medium uppercase">Groomer</div>
              <div className="font-bold text-slate-800 mt-0.5">{record.groomer}</div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="text-[10px] text-slate-400 font-medium uppercase">Duration</div>
              <div className="font-bold text-slate-800 mt-0.5">{record.duration}</div>
            </div>
          </div>

          <div className="space-y-2 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-700">
            <div className="font-bold text-slate-900 text-xs">Technical Grooming Specifications:</div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>• <strong>Blade Used:</strong> #7F Body / #10 Sanitary</div>
              <div>• <strong>Comb Attachment:</strong> 1/2&quot; Guard Comb</div>
              <div>• <strong>Ear Style:</strong> Rounded / Plucked &amp; Flushed</div>
              <div>• <strong>Tail Style:</strong> Natural plume / Scissored</div>
              <div>• <strong>Shampoo:</strong> Hypoallergenic Oatmeal</div>
              <div>• <strong>Behavior:</strong> Very cooperative, loves dryer</div>
            </div>
          </div>

          <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-indigo-900">
            <span className="font-bold block">Groomer Clinical Note:</span>
            <p className="mt-1 text-slate-700 text-[11px]">{record.notes}</p>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-xl cursor-pointer"
            >
              Close Record
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
 * 7. VIEW PHOTOS MODAL
 * ----------------------------------------------------------- */
export const ViewPhotosModal: React.FC<{
  petName: string;
  isOpen: boolean;
  onClose: () => void;
}> = ({ petName, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">Grooming Photos – {petName}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-700">Before Session</div>
              <div className="relative h-56 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                <Image
                  src="https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=600&q=80"
                  alt="Before groom"
                  fill
                  className="object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className="text-[11px] text-slate-400 block">Intake Check-in • Light shedding coat</span>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-700">After Full Groom</div>
              <div className="relative h-56 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                <Image
                  src="https://images.unsplash.com/photo-1576201836106-db1758fd1c97?auto=format&fit=crop&w=600&q=80"
                  alt="After groom"
                  fill
                  className="object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className="text-[11px] text-slate-400 block">Finished Result • Fresh bandana &amp; gloss spray</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
            <span className="text-slate-500 text-xs">Session Date: Apr 20, 2025</span>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-xl cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
 * 8. RECOMMEND NEXT VISIT MODAL
 * ----------------------------------------------------------- */
export const RecommendNextVisitModal: React.FC<{
  petName: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (interval: string, date: string) => void;
}> = ({ petName, isOpen, onClose, onSave }) => {
  const [weeks, setWeeks] = useState('4 Weeks (May 18, 2025)');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">Recommend Next Visit – {petName}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Recommended Rebook Interval</label>
            <select
              value={weeks}
              onChange={(e) => setWeeks(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
            >
              <option value="4 Weeks (May 18, 2025)">4 Weeks – Ideal for Poodles &amp; Doodles</option>
              <option value="6 Weeks (Jun 1, 2025)">6 Weeks – Standard Maintenance</option>
              <option value="8 Weeks (Jun 15, 2025)">8 Weeks – Bath &amp; De-shed interval</option>
            </select>
          </div>

          <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-indigo-900 text-[11px]">
            We will automatically send an automated SMS re-booking reminder to the client 1 week prior to this recommended return date.
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 border rounded-xl text-slate-600">Cancel</button>
            <button
              onClick={() => {
                onSave(weeks, 'May 18, 2025');
                onClose();
              }}
              className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-xl cursor-pointer"
            >
              Set Recommendation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
 * 9. INVOICE MODAL
 * ----------------------------------------------------------- */
export const InvoiceModal: React.FC<{
  payment: any;
  isOpen: boolean;
  onClose: () => void;
}> = ({ payment, isOpen, onClose }) => {
  if (!isOpen || !payment) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">Invoice INV-10482</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <div className="flex justify-between items-start border-b border-slate-100 pb-3">
            <div>
              <div className="font-bold text-slate-900 text-base">All About Pawz Grooming</div>
              <div className="text-slate-400 text-[11px]">1234 Maple Drive, Frisco, TX</div>
            </div>
            <div className="text-right">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                PAID IN FULL
              </span>
              <div className="text-slate-400 text-[11px] mt-1">{payment.date}</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="font-semibold text-slate-700">Line Items:</div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between">
                <span>{payment.description}</span>
                <span className="font-semibold">${(payment.amount * 0.85).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>Sales Tax (8.25%)</span>
                <span>${(payment.amount * 0.05).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>Groomer Gratuity / Tip</span>
                <span>${(payment.amount * 0.10).toFixed(2)}</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-900 text-sm">
                <span>Total Paid</span>
                <span className="text-indigo-600">${payment.amount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="text-slate-400 text-[11px]">
            Paid with Visa ending in 4242 &bull; Auth #TX-99214
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              onClick={() => {
                window.print();
              }}
              className="px-4 py-2 border rounded-xl font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button onClick={onClose} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-xl cursor-pointer">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
 * 10. REFUND MODAL
 * ----------------------------------------------------------- */
export const RefundModal: React.FC<{
  payment: any;
  isOpen: boolean;
  onClose: () => void;
  onConfirmRefund: (amount: number, reason: string) => void;
}> = ({ payment, isOpen, onClose, onConfirmRefund }) => {
  const [refundAmount, setRefundAmount] = useState(payment ? payment.amount : 0);
  const [reason, setReason] = useState('Customer Request / Satisfaction Guarantee');

  if (!isOpen || !payment) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-rose-600" />
            <h3 className="font-bold text-slate-900 text-sm">Issue Refund</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-900">
            Original Transaction: <strong>${payment.amount.toFixed(2)}</strong> ({payment.description}) on {payment.date}
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Refund Amount ($)</label>
            <input
              type="number"
              step="0.01"
              value={refundAmount}
              onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Reason for Refund</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
            >
              <option>Customer Request / Satisfaction Guarantee</option>
              <option>Appointment Rescheduled / Cancelled</option>
              <option>Overcharge Correction</option>
              <option>Service Discount Adjustment</option>
            </select>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 border rounded-xl text-slate-600">Cancel</button>
            <button
              onClick={() => {
                onConfirmRefund(refundAmount, reason);
                onClose();
              }}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl cursor-pointer shadow-xs"
            >
              Process ${refundAmount.toFixed(2)} Refund
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
 * 11. AUDIT LOG MODAL
 * ----------------------------------------------------------- */
export const AuditLogModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const logs = [
    { timestamp: 'May 9, 2025 10:30 AM', actor: 'Sarah Jenkins (Manager)', action: 'Updated customer phone and address' },
    { timestamp: 'May 2, 2025 02:15 PM', actor: 'Mike R. (Groomer)', action: 'Added clinical grooming notes for Buddy' },
    { timestamp: 'Apr 18, 2025 09:05 AM', actor: 'Stripe Gateway (System)', action: 'Processed card payment of $25.00 deposit' },
    { timestamp: 'Apr 12, 2025 11:20 AM', actor: 'Sarah Jenkins (Manager)', action: 'Verified Rabies vaccination document' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">Customer Record Audit Log</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-3 text-xs max-h-80 overflow-y-auto">
          {logs.map((log, i) => (
            <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>{log.timestamp}</span>
                <span className="font-semibold text-indigo-600">{log.actor}</span>
              </div>
              <div className="font-medium text-slate-800">{log.action}</div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-100 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-xl cursor-pointer">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
 * 12. CAMPAIGN / MARKETING MODAL
 * ----------------------------------------------------------- */
export const CampaignModal: React.FC<{
  customerName: string;
  isOpen: boolean;
  onClose: () => void;
  onAssign: (campaignName: string) => void;
}> = ({ customerName, isOpen, onClose, onAssign }) => {
  const [campaign, setCampaign] = useState('VIP Pawz Loyalty Club');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">Add to Marketing Campaign</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Select Marketing Segment / Campaign</label>
            <select
              value={campaign}
              onChange={(e) => setCampaign(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
            >
              <option value="VIP Pawz Loyalty Club">VIP Pawz Loyalty Club (10% discounts)</option>
              <option value="Summer De-Shed Promotion">Summer De-Shed Promotion</option>
              <option value="Puppy First-Year Milestone Sequence">Puppy First-Year Milestone Sequence</option>
              <option value="Re-engagement &amp; Win-back">Re-engagement &amp; Win-back</option>
            </select>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 border rounded-xl text-slate-600">Cancel</button>
            <button
              onClick={() => {
                onAssign(campaign);
                onClose();
              }}
              className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-xl cursor-pointer"
            >
              Add {customerName}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
 * 13. OPT IN/OUT COMMUNICATION PREFERENCES MODAL
 * ----------------------------------------------------------- */
export const OptInOutModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (prefs: { sms: boolean; email: boolean; marketing: boolean }) => void;
}> = ({ isOpen, onClose, onSave }) => {
  const [sms, setSms] = useState(true);
  const [email, setEmail] = useState(true);
  const [marketing, setMarketing] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">Communication Preferences</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-3 text-xs">
          <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
            <div>
              <div className="font-bold text-slate-900">SMS Appointment Reminders</div>
              <div className="text-slate-400 text-[11px]">Automated 24h &amp; 2h text messages</div>
            </div>
            <input
              type="checkbox"
              checked={sms}
              onChange={(e) => setSms(e.target.checked)}
              className="accent-indigo-600 w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
            <div>
              <div className="font-bold text-slate-900">Email Invoices &amp; Receipts</div>
              <div className="text-slate-400 text-[11px]">Digital copy sent upon checkout</div>
            </div>
            <input
              type="checkbox"
              checked={email}
              onChange={(e) => setEmail(e.target.checked)}
              className="accent-indigo-600 w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
            <div>
              <div className="font-bold text-slate-900">Promotions &amp; Seasonal Offers</div>
              <div className="text-slate-400 text-[11px]">Monthly newsletters and holiday discounts</div>
            </div>
            <input
              type="checkbox"
              checked={marketing}
              onChange={(e) => setMarketing(e.target.checked)}
              className="accent-indigo-600 w-4 h-4"
            />
          </label>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 border rounded-xl text-slate-600">Cancel</button>
            <button
              onClick={() => {
                onSave({ sms, email, marketing });
                onClose();
              }}
              className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-xl cursor-pointer"
            >
              Save Preferences
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
