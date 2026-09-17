'use client';

import React from 'react';
import { GroomingRecord } from '@/lib/types';
import { Check } from 'lucide-react';

interface GroomingRecordsViewProps {
  records: GroomingRecord[];
}

export const GroomingRecordsView: React.FC<GroomingRecordsViewProps> = ({ records }) => {
  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto text-foreground bg-card min-h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 border border-border">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <span>Grooming Records &amp; Style Notes</span>
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            Archived haircut specifications, blade lengths, shampoo formulas, and completed receipts.
          </p>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-card border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px] text-foreground">
            <thead className="bg-muted/30 border-b border-border text-foreground font-semibold uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4 border-r border-border">Date</th>
                <th className="py-3 px-4 border-r border-border">Pet &amp; Breed</th>
                <th className="py-3 px-4 border-r border-border">Service</th>
                <th className="py-3 px-4 border-r border-border">Groomer</th>
                <th className="py-3 px-4 border-r border-border">Cut &amp; Blade Notes</th>
                <th className="py-3 px-4 border-r border-border">Amount</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {records.map((rec) => (
                <tr key={rec.id} className="hover:bg-accent/50 transition-colors">
                  <td className="py-3.5 px-4 font-semibold tabular-nums text-foreground whitespace-nowrap border-r border-border">
                    {rec.date}
                  </td>
                  <td className="py-3.5 px-4 border-r border-border">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{rec.petEmoji}</span>
                      <div>
                        <p className="font-semibold text-foreground uppercase">{rec.petName}</p>
                        <p className="text-[10px] text-muted-foreground">{rec.breed}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-semibold uppercase text-foreground border-r border-border">
                    {rec.serviceName}
                  </td>
                  <td className="py-3.5 px-4 text-foreground border-r border-border">
                    {rec.groomer}
                  </td>
                  <td className="py-3.5 px-4 text-foreground max-w-xs border-r border-border">
                    <p className="font-medium text-foreground">{rec.cutDetails}</p>
                    {rec.coatCondition && (
                      <p className="text-[10px] text-muted-foreground italic mt-0.5">{rec.coatCondition}</p>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-semibold tabular-nums text-foreground border-r border-border">
                    ${rec.amount.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 border border-border text-[10px] font-semibold bg-primary text-primary-foreground uppercase tabular-nums">
                      <Check className="w-3 h-3" />
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
