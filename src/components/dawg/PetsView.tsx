'use client';

import React, { useState } from 'react';
import { PetRecord } from '@/lib/dawg-types';
import { PawPrint, Plus, Search, ShieldCheck, AlertTriangle, User, Calendar, Tag } from 'lucide-react';

interface PetsViewProps {
  pets: PetRecord[];
  onAddPet: () => void;
}

export const PetsView: React.FC<PetsViewProps> = ({ pets, onAddPet }) => {
  const [search, setSearch] = useState('');

  const filtered = pets.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.breed.toLowerCase().includes(search.toLowerCase()) ||
    p.ownerName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 ">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <PawPrint className="w-5 h-5 text-indigo-600" />
            <span>Pets & Grooming Profiles</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Vaccination logs, coat types, behavioral notes, and grooming history.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search pets, breeds..."
              className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            onClick={onAddPet}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Add Pet Profile</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((pet) => (
          <div key={pet.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-indigo-200 transition-all space-y-3.5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-xl font-bold">
                  {pet.emoji}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{pet.name}</h3>
                  <p className="text-[11px] text-slate-500">{pet.breed} • {pet.age} ({pet.weight})</p>
                </div>
              </div>

              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                pet.vaccinationStatus === 'Up to date'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}>
                {pet.vaccinationStatus}
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Owner: <strong className="text-slate-800">{pet.ownerName}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Last Groom: {pet.lastGroomDate}</span>
              </div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px] text-slate-600">
              <p className="font-semibold text-slate-700 mb-0.5">Styling & Medical Notes:</p>
              <p className="italic">{pet.specialNotes}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
