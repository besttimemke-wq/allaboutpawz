'use client';

import React, { useState } from 'react';
import { GroomingRecord } from '@/lib/dawg-types';
import { Scissors, Search, Plus, Calendar, DollarSign, CheckCircle2, User } from 'lucide-react';

interface GroomingRecordsViewProps {
  records: GroomingRecord[];
}

export const GroomingRecordsView: React.FC<GroomingRecordsViewProps> = ({ records }) => {
  const [search, setSearch] = useState('');

  const filtered = records.filter(r =>
    r.petName.toLowerCase().includes(search.toLowerCase()) ||
    r.breed.toLowerCase().includes(search.toLowerCase()) ||
    r.groomer.toLowerCase().includes(search.toLowerCase()) ||
    r.serviceName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 ">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Scissors className="w-5 h-5 text-indigo-600" />
            <span>Grooming Records & Style Notes</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Archived haircut specifications, blade lengths, shampoo formulas, and completed receipts.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search records..."
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Pet & Breed</th>
                <th className="py-3 px-4">Service</th>
                <th className="py-3 px-4">Groomer</th>
                <th className="py-3 px-4">Cut & Blade Notes</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-700 whitespace-nowrap">
                    {rec.date}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{rec.petEmoji}</span>
                      <div>
                        <p className="font-bold text-slate-900">{rec.petName}</p>
                        <p className="text-[10px] text-slate-400">{rec.breed}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-800">
                    {rec.serviceName}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">
                    {rec.groomer}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 max-w-xs">
                    <p className="font-medium text-slate-800">{rec.cutDetails}</p>
                    {rec.coatCondition && (
                      <p className="text-[10px] text-slate-400 italic mt-0.5">{rec.coatCondition}</p>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    ${rec.amount.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>{rec.status}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
