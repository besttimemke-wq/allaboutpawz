'use client';

import React from 'react';
import { SERVICES_CATALOG } from '@/lib/dawg-mock-data';
import { Sparkles, Clock, DollarSign, Plus } from 'lucide-react';

export const ServicesView: React.FC = () => {
  return (
    <div className="p-4 sm:p-6 space-y-6 ">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <span>Grooming Services & Pricing Menu</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure service durations, breed-size pricing tiers, and a la carte spa add-ons.
          </p>
        </div>

        <button className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs">
          <Plus className="w-4 h-4" />
          <span>Add New Service</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {SERVICES_CATALOG.map((srv) => (
          <div key={srv.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                  {srv.category}
                </span>
                <span className="text-base font-extrabold text-slate-900">
                  ${srv.price.toFixed(2)}
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-sm">{srv.name}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{srv.description}</p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{srv.durationMinutes} mins</span>
              </span>
              <button className="text-indigo-600 hover:text-indigo-700 font-semibold text-xs">
                Edit Pricing
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
