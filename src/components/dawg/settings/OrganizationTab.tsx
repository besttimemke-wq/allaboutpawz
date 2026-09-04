'use client';

import React, { useState } from 'react';
import { LocationItem } from '@/lib/dawg-types';
import { 
  Building2, 
  MapPin, 
  Plus, 
  Phone, 
  Mail, 
  Clock, 
  User, 
  Trash2, 
  Store, 
  Truck, 
  CheckCircle2, 
  Globe, 
  Sparkles, 
  Calendar,
  X
} from 'lucide-react';

interface OrganizationTabProps {
  locations: LocationItem[];
  selectedLocation: string;
  onSelectLocation: (locName: string) => void;
  onAddLocation: (newLoc: Partial<LocationItem>) => void;
  onDeleteLocation?: (id: string) => void;
}

export const OrganizationTab: React.FC<OrganizationTabProps> = ({
  locations,
  selectedLocation,
  onSelectLocation,
  onAddLocation,
  onDeleteLocation,
}) => {
  const [subSection, setSubSection] = useState<'profile' | 'locations' | 'brand' | 'hours' | 'holidays'>('profile');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Business Profile Form State
  const [businessName, setBusinessName] = useState('All About the Dawg');
  const [tagline, setTagline] = useState('Luxury pet grooming with love and care.');
  const [phone, setPhone] = useState('(214) 555-0198');
  const [email, setEmail] = useState('info@allaboutthedawg.com');
  const [website, setWebsite] = useState('https://www.allaboutthedawg.com');
  const [address, setAddress] = useState('1234 Maple Drive, Frisco, TX 75034');
  const [taxEin, setTaxEin] = useState('XX-XXXX789');
  const [timezone, setTimezone] = useState('America/Chicago (Central Time)');
  const [isSaved, setIsSaved] = useState(false);

  // Location Form State
  const [newLocName, setNewLocName] = useState('');
  const [newLocType, setNewLocType] = useState<LocationItem['type']>('Main Location');
  const [newLocAddress, setNewLocAddress] = useState('');
  const [newLocCity, setNewLocCity] = useState('Frisco, TX 75034');
  const [newLocPhone, setNewLocPhone] = useState('(214) 555-0100');
  const [newLocManager, setNewLocManager] = useState('Lead Groomer');
  const [newLocStations, setNewLocStations] = useState(4);
  const [newLocHours, setNewLocHours] = useState('Mon-Sat: 8:00 AM – 6:00 PM');

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleCreateLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocName.trim()) return;

    onAddLocation({
      name: newLocName.startsWith('All About the Dawg') ? newLocName : `All About the Dawg – ${newLocName}`,
      type: newLocType,
      address: newLocAddress || '100 Main St',
      cityStateZip: newLocCity,
      phone: newLocPhone,
      email: 'contact@allaboutthedawg.com',
      manager: newLocManager,
      stationCount: Number(newLocStations) || 4,
      operatingHours: newLocHours,
      status: 'Active',
      isDefault: locations.length === 0,
    });

    setIsAddModalOpen(false);
    setNewLocName('');
    setNewLocAddress('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-600 uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" />
            <span>Organization &amp; Brand Settings</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Organization Settings</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage company profile, multi-unit salon locations, operating hours, and brand identity.
          </p>
        </div>

        {subSection === 'locations' && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add New Location</span>
          </button>
        )}
      </div>

      {isSaved && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Organization settings saved successfully!</span>
        </div>
      )}

      {/* Sub navigation */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-medium overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setSubSection('profile')}
          className={`pb-3 flex items-center gap-2 transition-colors border-b-2 cursor-pointer ${
            subSection === 'profile'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Business Profile</span>
        </button>

        <button
          onClick={() => setSubSection('locations')}
          className={`pb-3 flex items-center gap-2 transition-colors border-b-2 cursor-pointer ${
            subSection === 'locations'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Locations &amp; Branches ({locations.length})</span>
        </button>

        <button
          onClick={() => setSubSection('brand')}
          className={`pb-3 flex items-center gap-2 transition-colors border-b-2 cursor-pointer ${
            subSection === 'brand'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Brand &amp; Identity</span>
        </button>

        <button
          onClick={() => setSubSection('hours')}
          className={`pb-3 flex items-center gap-2 transition-colors border-b-2 cursor-pointer ${
            subSection === 'hours'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Opening Hours</span>
        </button>

        <button
          onClick={() => setSubSection('holidays')}
          className={`pb-3 flex items-center gap-2 transition-colors border-b-2 cursor-pointer ${
            subSection === 'holidays'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Holiday Blackouts</span>
        </button>
      </div>

      {/* Sub Section 1: Business Profile */}
      {subSection === 'profile' && (
        <form onSubmit={handleSaveProfile} className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-5 text-xs">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center text-sm">
              AD
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Legal Business Profile</h3>
              <p className="text-slate-500 text-[11px]">Official contact details, primary business entity, and tax information.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Company / Brand Name</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Tagline / Motto</label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Central Phone Line</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Official Business Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-slate-700 font-semibold mb-1">Primary Headquarters Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Website URL</label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Operating Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option>America/Chicago (Central Time)</option>
                <option>America/New_York (Eastern Time)</option>
                <option>America/Denver (Mountain Time)</option>
                <option>America/Los_Angeles (Pacific Time)</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl cursor-pointer shadow-xs"
            >
              Save Profile Changes
            </button>
          </div>
        </form>
      )}

      {/* Sub Section 2: Locations & Branches */}
      {subSection === 'locations' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {locations.map((loc) => {
              const isSelected = selectedLocation === loc.name;
              return (
                <div
                  key={loc.id}
                  className={`bg-white rounded-2xl p-5 border transition-all shadow-2xs flex flex-col justify-between relative ${
                    isSelected ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-indigo-200'
                  }`}
                >
                  <div className="space-y-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 ${
                            loc.type === 'Mobile Van'
                              ? 'bg-amber-600'
                              : loc.type === 'Luxury Spa'
                              ? 'bg-purple-600'
                              : 'bg-indigo-600'
                          }`}
                        >
                          {loc.type === 'Mobile Van' ? <Truck className="w-5 h-5" /> : <Store className="w-5 h-5" />}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm leading-tight">{loc.name}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                              {loc.type}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {loc.status}
                            </span>
                          </div>
                        </div>
                      </div>

                      {isSelected && (
                        <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-200">
                          Active Branch
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                      <div className="flex items-start gap-2.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-slate-800">{loc.address}</p>
                          <p className="text-slate-400 text-[11px]">{loc.cityStateZip}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{loc.phone}</span>
                      </div>

                      <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>Manager: <strong>{loc.manager}</strong></span>
                        </span>
                        <span className="font-semibold text-slate-700">{loc.stationCount} Grooming Stations</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => onSelectLocation(loc.name)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {isSelected ? 'Current Active Workspace' : 'Switch Workspace'}
                    </button>

                    {onDeleteLocation && locations.length > 1 && (
                      <button
                        onClick={() => onDeleteLocation(loc.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Location"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Add Location Card */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-slate-50/70 border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-3 transition-all cursor-pointer min-h-[220px]"
            >
              <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Add Salon or Mobile Van</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-[220px]">
                  Scale operations with new salon locations or mobile grooming vehicles.
                </p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Sub Section 3: Brand & Identity */}
      {subSection === 'brand' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-5 text-xs">
          <h3 className="font-bold text-slate-900 text-sm">Visual Identity &amp; Colors</h3>
          <p className="text-slate-500 text-[11px]">Colors used on the public booking page, customer portal, and email notifications.</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl border border-slate-200 space-y-2">
              <span className="font-semibold text-slate-700">Primary Brand Color</span>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 border border-slate-200 shadow-xs" />
                <span className="font-mono text-slate-600">#4f46e5</span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 space-y-2">
              <span className="font-semibold text-slate-700">Accent Hue</span>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-600 border border-slate-200 shadow-xs" />
                <span className="font-mono text-slate-600">#9333ea</span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 space-y-2">
              <span className="font-semibold text-slate-700">Canvas Tint</span>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#f8faff] border border-slate-200 shadow-xs" />
                <span className="font-mono text-slate-600">#f8faff</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub Section 4: Opening Hours */}
      {subSection === 'hours' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4 text-xs">
          <h3 className="font-bold text-slate-900 text-sm">Weekly Salon Operating Hours</h3>
          <p className="text-slate-500 text-[11px]">Define standard appointment booking windows for groomers and bathers.</p>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
              <div key={day} className="flex items-center justify-between p-3 hover:bg-slate-50/50">
                <span className="font-bold text-slate-800 w-28">{day}</span>
                <div className="flex items-center gap-3">
                  {day === 'Sunday' ? (
                    <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg font-semibold text-[11px]">
                      Closed for Deep Cleaning
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-semibold text-[11px]">
                      8:00 AM – 6:00 PM
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub Section 5: Holiday Blackouts */}
      {subSection === 'holidays' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4 text-xs">
          <h3 className="font-bold text-slate-900 text-sm">Holiday Blackout Calendar</h3>
          <p className="text-slate-500 text-[11px]">Automatic closure dates where the online scheduler prevents bookings.</p>

          <div className="space-y-2">
            {[
              { name: 'Memorial Day', date: 'May 26, 2025', status: 'Closed' },
              { name: 'Independence Day', date: 'July 4, 2025', status: 'Closed' },
              { name: 'Labor Day', date: 'September 1, 2025', status: 'Closed' },
              { name: 'Thanksgiving Day', date: 'November 27, 2025', status: 'Closed' },
              { name: 'Christmas Day', date: 'December 25, 2025', status: 'Closed' },
            ].map((hol) => (
              <div key={hol.name} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                <div>
                  <p className="font-bold text-slate-800">{hol.name}</p>
                  <p className="text-slate-500 text-[11px]">{hol.date}</p>
                </div>
                <span className="px-2.5 py-1 bg-rose-50 text-rose-700 font-semibold text-[10px] rounded-md border border-rose-200">
                  {hol.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Add Location */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Add Salon Location / Van</h3>
                  <p className="text-[11px] text-slate-500">Configure a new grooming facility or mobile van</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLocation} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Branch Name</label>
                <input
                  type="text"
                  required
                  value={newLocName}
                  onChange={(e) => setNewLocName(e.target.value)}
                  placeholder="e.g. Westside Spa or Mobile Van #2"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Location Type</label>
                <select
                  value={newLocType}
                  onChange={(e) => setNewLocType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="Main Location">Main Salon Location</option>
                  <option value="Luxury Spa">Luxury Boutique Spa</option>
                  <option value="Mobile Van">Mobile Grooming Van</option>
                  <option value="Express Station">Express Bath Station</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Street Address</label>
                <input
                  type="text"
                  value={newLocAddress}
                  onChange={(e) => setNewLocAddress(e.target.value)}
                  placeholder="e.g. 8800 Park Boulevard"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Lead Manager</label>
                  <input
                    type="text"
                    value={newLocManager}
                    onChange={(e) => setNewLocManager(e.target.value)}
                    placeholder="e.g. Marcus V."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Grooming Stations</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={newLocStations}
                    onChange={(e) => setNewLocStations(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-200 rounded-xl text-slate-600 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl cursor-pointer shadow-xs"
                >
                  Create Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
