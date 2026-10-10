'use client';

import React from 'react';
import Image from 'next/image';
import { GuidePageData } from '@/lib/seopages/types';

interface HeroBannerProps {
  data: GuidePageData;
  onBookClick?: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ data, onBookClick }) => {
  return (
    <section className="my-6 lg:my-8">
      {/* Amazon-styled Hero Banner Container (100% Square, No Rounded Edges) */}
      <div className="bg-[#F4F1EA] border border-stone-300/80 rounded-none p-8 sm:p-12 lg:p-16 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
        
        {/* Left Editorial Text Column */}
        <div className="lg:col-span-7 flex flex-col items-start">
          
          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-[54px] font-extrabold text-stone-950 tracking-tight leading-[1.08] mb-5 text-balance">
            {data.heroTitle}
          </h1>

          {/* Subheadline */}
          <p className="text-base sm:text-lg lg:text-xl text-stone-700 leading-relaxed mb-8 max-w-2xl font-normal">
            {data.heroSubheadline}
          </p>

          {/* Action Button (Square) */}
          <div className="mb-4">
            <button
              onClick={onBookClick}
              className="px-8 py-4 bg-[#FF6200] hover:bg-[#E65800] active:scale-[0.98] text-white text-base sm:text-lg font-bold transition-all shadow-sm hover:shadow-md cursor-pointer inline-flex items-center justify-center rounded-none"
            >
              {data.heroCtaText}
            </button>
          </div>

          {/* Footnote with Asterisk */}
          <p className="text-xs text-stone-500 font-medium">
            {data.heroFootnote}
          </p>

        </div>

        {/* Right Media Column */}
        <div className="lg:col-span-5 relative">
          <div className="relative overflow-hidden shadow-md aspect-4/3 sm:aspect-16/10 lg:aspect-4/3 bg-stone-200 rounded-none border border-stone-300">
            <Image
              src={data.heroImageUrl}
              alt={data.heroImageAlt}
              fill
              className="object-cover rounded-none"
              sizes="(max-width: 1024px) 100vw, 40vw"
              priority
              referrerPolicy="no-referrer"
            />
            
          </div>
        </div>

      </div>
    </section>
  );
};
