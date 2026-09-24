'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, GraduationCap, Clock, Users } from 'lucide-react';

interface LeashedAdvantageSectionProps {
  onExploreAll?: () => void;
}

export function LeashedAdvantageSection({ onExploreAll }: LeashedAdvantageSectionProps) {
  const stats = [
    {
      icon: (
        <svg className="w-6 h-6 text-[#141b16]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="15.5" r="3.5" />
          <circle cx="6.5" cy="10" r="2" />
          <circle cx="10" cy="6.5" r="2" />
          <circle cx="14" cy="6.5" r="2" />
          <circle cx="17.5" cy="10" r="2" />
        </svg>
      ),
      value: '4',
      label: 'Career-Focused Programs',
    },
    {
      icon: <GraduationCap className="w-6 h-6 text-[#141b16]" strokeWidth={1.8} />,
      value: '155',
      label: 'Total Modules (Across All Programs)',
    },
    {
      icon: <Clock className="w-6 h-6 text-[#141b16]" strokeWidth={1.8} />,
      value: '1,112',
      label: 'Total Clock Hours (Program Hours)',
    },
    {
      icon: <Users className="w-6 h-6 text-[#141b16]" strokeWidth={1.8} />,
      value: '100%',
      label: 'Focused on Your Success',
    },
  ];

  return (
    <section className="w-full bg-[#f4eee5] border-b border-[#e6decb]">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-center">
          {/* Left Column: Heading & Narrative */}
          <div className="lg:col-span-4 flex flex-col items-start pr-0 lg:pr-4">
            <span className="font-sans text-[0.72rem] font-extrabold uppercase tracking-[0.16em] text-[#728076] mb-2.5 block">
              THE LEASHED ADVANTAGE
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl text-[#141b16] font-bold tracking-tight leading-[1.18] mb-4">
              Build the Skills.
              <span className="block mt-1">Create the Life You Want.</span>
            </h2>
            <p className="text-sm sm:text-[0.93rem] text-[#4d5c52] leading-relaxed mb-8 max-w-[420px]">
              Our programs give you more than technical skills — they give you confidence, community, and a clear path to a rewarding career in the pet care industry.
            </p>
            <Link
              href="/learn/enroll"
              className="inline-flex items-center justify-center gap-2 font-sans font-semibold rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a2920] bg-[#1a2920] text-white hover:bg-[#25392d] active:bg-[#121c16] px-6 py-3 text-xs sm:text-sm tracking-wide shadow-sm"
            >
              <span>Start Your Enrollment</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Middle Column: Stats Grid with clean vertical dividers */}
          <div className="lg:col-span-4 px-2 sm:px-4 py-6 lg:py-0 border-t lg:border-t-0 lg:border-l lg:border-r border-[#ded6c3]">
            <div className="grid grid-cols-2 gap-y-8 gap-x-4">
              {stats.map((stat, idx) => (
                <div
                  key={idx}
                  className="flex flex-col items-center text-center px-2"
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center mb-2.5 text-[#1a2920]">
                    {stat.icon}
                  </div>
                  <span className="font-sans text-3xl sm:text-4xl font-extrabold tracking-tight text-[#141b16] mb-1">
                    {stat.value}
                  </span>
                  <span className="text-xs font-medium text-[#5f6f65] leading-snug max-w-[140px]">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: High Quality Photo with LEASHED jacket & dog */}
          <div className="lg:col-span-4 relative h-[360px] sm:h-[400px] lg:h-[440px] w-full rounded-2xl overflow-hidden shadow-lg bg-[#243328]">
            <Image
              src="/images/trainer_jacket.jpg"
              alt="Pet trainer wearing LEASHED jacket with loyal dog at sunset"
              fill
              sizes="(max-width: 1024px) 100vw, 33vw"
              className="object-cover object-center brightness-95"
              referrerPolicy="no-referrer"
            />
            {/* Dark gradient shadow */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            
            {/* Embroidered LEASHED Brand Badge in bottom right corner */}
            <div className="absolute bottom-5 right-5 text-center select-none bg-black/65 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 shadow-lg">
              <div className="flex flex-col items-center">
                <svg className="w-7 h-7 text-white mb-1" viewBox="0 0 54 54" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M14 42C10 38 8 32 8 26C8 16 16 8 26 8C33 8 39 12 42 17C43.5 19.5 44 22 44 25C44 26.5 43.5 28 42.5 29.5C41.5 31 40 32 38 32C36.5 32 35.5 31.5 35 30.5C34.5 29.5 34.5 28.5 35 27C35.8 24.5 35 22 33 20.5C31.5 19.5 29.5 19 27.5 19.5C25.5 20 23.5 21.5 22.5 23.5C21 26.5 21 30 22.5 33C23.5 35 25.5 37 28 38.5C31 40.5 34.5 41.5 38 41.5C41 41.5 43.5 40.8 46 39.5" />
                  <circle cx="20" cy="36" r="4.5" strokeWidth="2.5" />
                </svg>
                <span className="font-sans font-extrabold tracking-[0.14em] uppercase text-white text-[11px]">
                  LEASHED
                </span>
                <span className="font-sans font-semibold tracking-[0.18em] uppercase text-[#cbd5ce] text-[7.5px] mt-0.5">
                  SKILLS. CONFIDENCE. CAREER.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
