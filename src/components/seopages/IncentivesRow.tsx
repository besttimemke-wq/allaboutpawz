'use client';

import React from 'react';
import { 
  Megaphone, 
  Building2, 
  Check, 
  ArrowUpRight 
} from 'lucide-react';
import { GuidePageData } from '@/lib/seopages/types';

interface IncentivesRowProps {
  data: GuidePageData;
  onExploreClick?: () => void;
}

export const IncentivesRow: React.FC<IncentivesRowProps> = ({ data, onExploreClick }) => {
  return (
    <section className="my-14 lg:my-20">
      {/* Header (Screenshot 1) */}
      <div className="flex flex-col items-start mb-10">
        
        {/* Section Headline */}
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-stone-950 tracking-tight mb-2">
          {data.incentivesHeadline}
        </h2>

        {/* Subhead with text link */}
        <div className="flex flex-wrap items-center gap-2 text-stone-700 text-base sm:text-lg">
          <span>{data.incentivesSubhead}</span>
          <button
            onClick={onExploreClick}
            className="inline-flex items-center gap-1 font-bold text-stone-950 hover:text-orange-600 transition-colors cursor-pointer rounded-none"
          >
            <span>{data.incentivesLinkText}</span>
            <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

      </div>

      {/* 3 Clean White Cards (All Square Corners) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {data.takeawayCards.map((card, idx) => (
          <div
            key={idx}
            className="bg-white border border-stone-300 p-7 lg:p-8 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between rounded-none"
          >
            <div>
              {/* Minimal Line Icon (Square Container) */}
              <div className="w-12 h-12 flex items-center justify-start mb-6 text-stone-950 rounded-none">
                {idx === 0 && <Building2 className="w-10 h-10 stroke-[1.5]" />}
                {idx === 1 && <Megaphone className="w-10 h-10 stroke-[1.5]" />}
                {idx === 2 && <Check className="w-10 h-10 stroke-[1.5]" />}
              </div>

              {/* Card Title */}
              <h3 className="text-xl font-bold text-stone-950 mb-5 tracking-tight">
                {card.title}
              </h3>

              {/* Checklist Items */}
              <ul className="space-y-4 text-sm text-stone-700 leading-relaxed">
                {card.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-stone-950 stroke-[2.5] shrink-0 mt-0.5" />
                    <span>
                      <strong className="font-bold text-stone-950">
                        {item.highlight}
                      </strong>{' '}
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        ))}
      </div>
    </section>
  );
};
