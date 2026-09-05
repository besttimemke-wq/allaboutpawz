'use client';

import React, { useState } from 'react';
import { Customer, CustomerFullProfile } from '@/lib/dawg-types';
import { CustomerDetailsView } from './CustomerDetailsView';
import { SARAH_JOHNSON_PROFILE } from '@/lib/dawg-mock-data';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  Dog,
  DollarSign,
  Calendar,
  UserCheck,
  ChevronRight,
  Eye,
  SlidersHorizontal,
  Download,
  Filter,
  Sparkles,
  ArrowRight,
  List,
  LayoutGrid,
  ShieldCheck,
  Award
} from 'lucide-react';

interface CustomersViewProps {
  customers: Customer[];
  onAddCustomer: () => void;
  onOpenNewAppointment?: () => void;
  onOpenAddPet?: () => void;
  onOpenTakePayment?: () => void;
  onOpenIntake?: () => void;
}

type CustomerTab = 'all' | 'active' | 'vip' | 'new' | 'rebook';

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  onAddCustomer,
  onOpenNewAppointment,
  onOpenAddPet,
  onOpenTakePayment,
  onOpenIntake,
}) => {
  // Default to the dedicated Customer Landing Directory
  const [viewMode, setViewMode] = useState<'directory' | 'detail'>('directory');
  const [selectedProfile, setSelectedProfile] = useState<CustomerFullProfile>(SARAH_JOHNSON_PROFILE);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<CustomerTab>('all');
  const [displayLayout, setDisplayLayout] = useState<'grid' | 'table'>('grid');

  const filtered = customers.filter((c) => {
    // 1. Tab filter
    if (activeTab === 'vip' && c.totalSpent < 400) return false;
    if (activeTab === 'rebook' && !c.lastVisit.includes('Apr') && !c.lastVisit.includes('Jan')) return false;

    // 2. Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = c.name.toLowerCase().includes(q);
      const matchEmail = c.email.toLowerCase().includes(q);
      const matchPhone = c.phone.includes(q);
      const matchPet = c.pets.some((p) => p.toLowerCase().includes(q));
      if (!matchName && !matchEmail && !matchPhone && !matchPet) return false;
    }

    return true;
  });

  const handleSelectCustomer = (cust: Customer) => {
    // If it's Sarah Johnson, use the rich profile, otherwise generate dynamic profile
    if (cust.name === 'Sarah Johnson' || cust.id === 'cust-1') {
      setSelectedProfile(SARAH_JOHNSON_PROFILE);
    } else {
      setSelectedProfile({
        id: cust.id,
        name: cust.name,
        status: 'Active Customer',
        phone: cust.phone,
        email: cust.email,
        address: '742 Evergreen Terrace, Frisco, TX 75034',
        lifetimeValue: cust.totalSpent + 150,
        totalSpent: cust.totalSpent,
        outstandingBalance: 0.0,
        loyaltyPoints: Math.floor(cust.totalSpent / 5),
        customerSince: 'Jan 15, 2024',
        defaultPaymentMethod: {
          cardBrand: 'VISA',
          last4: '4242',
          expires: '06/27',
        },
        pets: cust.pets.map((p, i) => ({
          id: `pet-${i}`,
          name: p.replace(/\s*\([^)]*\)/, ''),
          breed: p.includes('(') ? p.replace(/.*\(([^)]+)\).*/, '$1') : (i === 0 ? 'Golden Retriever' : 'Poodle'),
          gender: i === 0 ? 'Male' : 'Female',
          age: `${i + 2} yrs`,
          birthDate: 'Mar 14, 2021',
          weight: i === 0 ? '55 lbs' : '22 lbs',
          imageUrl:
            i === 0
              ? 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=400&q=80'
              : 'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?auto=format&fit=crop&w=400&q=80',
          isPrimary: i === 0,
          vaccinationsStatus: 'Up to date',
          medicalAlert: i === 0 ? 'No Known Allergies' : 'Sensitive Skin',
          lastGroomDate: cust.lastVisit,
          nextApptDate: 'Jun 12, 2025',
          nextApptType: 'Full Groom',
        })),
        upcomingAppointments: SARAH_JOHNSON_PROFILE.upcomingAppointments,
        paymentHistory: SARAH_JOHNSON_PROFILE.paymentHistory,
        recentActivity: SARAH_JOHNSON_PROFILE.recentActivity,
        communication: SARAH_JOHNSON_PROFILE.communication,
      });
    }
    setViewMode('detail');
  };

  if (viewMode === 'detail') {
    return (
      <div className="space-y-4">
        {/* Quick Directory Switcher Bar */}
        <div className="px-4 sm:px-8 pt-4 flex items-center justify-between">
          <button
            onClick={() => setViewMode('directory')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" />
            <span>&larr; Switch to All Customers Directory ({customers.length})</span>
          </button>

          <div className="text-[11px] text-slate-400 font-medium">
            Viewing Profile: <strong className="text-slate-700">{selectedProfile.name}</strong>
          </div>
        </div>

        {/* The Exact Spec Customer Details View */}
        <CustomerDetailsView
          customerProfile={selectedProfile}
          onBackToDirectory={() => setViewMode('directory')}
          onOpenNewAppointment={onOpenNewAppointment}
          onOpenAddPet={onOpenAddPet}
          onOpenTakePayment={onOpenTakePayment}
          onOpenIntake={onOpenIntake}
        />
      </div>
    );
  }

  // Dedicated Customer Landing Directory View
  const totalRevenue = customers.reduce((acc, c) => acc + (c.totalSpent || 0), 0);
  const totalPets = customers.reduce((acc, c) => acc + (c.pets ? c.pets.length : 1), 0);

  return (
    <div className="p-4 sm:p-8 space-y-6  font-sans">
      {/* 1. Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Customer Directory</span>
                <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-xs font-bold">
                  {customers.length} Clients
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage client profiles, pet family relationships, vaccination histories, and lifetime grooming activity.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => alert('Exporting customer database CSV...')}
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={onAddCustomer}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Customer</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Metrics Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500">Total Clients</p>
            <p className="text-lg font-bold text-slate-900">{customers.length}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Dog className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500">Registered Pets</p>
            <p className="text-lg font-bold text-slate-900">{totalPets} Pets</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500">Total Revenue</p>
            <p className="text-lg font-bold text-slate-900">${totalRevenue.toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500">Avg Client Spend</p>
            <p className="text-lg font-bold text-slate-900">
              ${(customers.length > 0 ? totalRevenue / customers.length : 0).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Search, Filter Tabs & Layout Switcher */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Segment Tabs */}
          <div className="flex space-x-1.5 p-1 bg-slate-100 rounded-xl text-xs font-semibold text-slate-600 overflow-x-auto custom-scrollbar">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'all' ? 'bg-white text-indigo-600 shadow-2xs' : 'hover:text-slate-900'
              }`}
            >
              All Clients ({customers.length})
            </button>
            <button
              onClick={() => setActiveTab('vip')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'vip' ? 'bg-white text-indigo-600 shadow-2xs' : 'hover:text-slate-900'
              }`}
            >
              VIP Tier ($400+)
            </button>
            <button
              onClick={() => setActiveTab('rebook')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'rebook' ? 'bg-white text-indigo-600 shadow-2xs' : 'hover:text-slate-900'
              }`}
            >
              Needs Rebooking
            </button>
          </div>

          {/* Search Bar & View Mode Toggle */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, phone, pet..."
                className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 shrink-0">
              <button
                type="button"
                title="Grid View"
                onClick={() => setDisplayLayout('grid')}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  displayLayout === 'grid' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                title="Table View"
                onClick={() => setDisplayLayout('table')}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  displayLayout === 'table' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Directory Content Grid or Table */}
      {displayLayout === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.length === 0 ? (
            <div className="col-span-full bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
              <p className="font-semibold text-sm">No customers found</p>
              <p className="text-xs mt-1">Try clearing your search query or switching filters.</p>
            </div>
          ) : (
            filtered.map((cust) => (
              <div
                key={cust.id}
                onClick={() => handleSelectCustomer(cust)}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-indigo-400 hover:shadow-md transition-all space-y-3.5 cursor-pointer group flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                        <span>{cust.name}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-500 transition-transform group-hover:translate-x-0.5" />
                      </h3>
                      <p className="text-[11px] text-indigo-600 font-medium mt-0.5">
                        Preferred Groomer: {cust.preferredGroomer}
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                      ${cust.totalSpent.toFixed(2)} spent
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{cust.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{cust.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Last visit: {cust.lastVisit}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex flex-wrap gap-1.5">
                    {cust.pets.map((p, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-[10px] font-medium flex items-center gap-1"
                      >
                        <Dog className="w-3 h-3 text-amber-600" />
                        <span>{p}</span>
                      </span>
                    ))}
                  </div>

                  <span className="text-[11px] font-semibold text-indigo-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                    <span>View Profile</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Table Layout */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-500">
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Contact Info</th>
                  <th className="py-3 px-4">Pets</th>
                  <th className="py-3 px-4">Preferred Groomer</th>
                  <th className="py-3 px-4">Last Visit</th>
                  <th className="py-3 px-4">Total Spent</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filtered.map((cust) => (
                  <tr
                    key={cust.id}
                    onClick={() => handleSelectCustomer(cust)}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 whitespace-nowrap font-bold text-slate-900">
                      {cust.name}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                      <div>{cust.email}</div>
                      <div className="text-[11px] text-slate-400">{cust.phone}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {cust.pets.map((p, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded text-[10px] font-medium"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                      {cust.preferredGroomer}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                      {cust.lastVisit}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-bold text-emerald-600">
                      ${cust.totalSpent.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-right text-indigo-600 font-semibold">
                      View Profile &rarr;
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
