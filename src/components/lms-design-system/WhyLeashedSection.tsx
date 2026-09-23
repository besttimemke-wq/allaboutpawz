'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Check, ArrowRight } from 'lucide-react';

export function WhyLeashedSection() {
  const checkItems = [
    {
      title: 'Flexible Learning Options',
      description: 'Fit your goals and schedule.',
    },
    {
      title: 'Comprehensive Curriculum',
      description: 'Taught by industry experts.',
    },
    {
      title: 'Real-World Experience',
      description: 'Work with real animals, in real settings.',
    },
    {
      title: 'Career Placement Support',
      description: 'Get connected with employers.',
    },
    {
      title: 'Lifetime Access to Resources',
      description: 'Continue learning, anytime.',
    },
  ];

  return (
    <section id="why-leashed-section" className="w-full bg-[#fdfbf7] py-14 sm:py-20 border-b border-[#eeebe3]">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Pet Portrait with Calligraphic Quote */}
          <div className="lg:col-span-5 relative rounded-2xl overflow-hidden shadow-lg aspect-[4/3] sm:aspect-[14/11] bg-[#221e1a]">
            <Image
              src="/images/pets_caregiver.jpg"
              alt="Australian Shepherd dog and tabby cat looking at camera"
              fill
              sizes="(max-width: 1024px) 100vw, 42vw"
              className="object-cover object-center brightness-95 contrast-105"
              referrerPolicy="no-referrer"
            />
            {/* Dark gradient overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-tr from-black/70 via-black/30 to-transparent" />

            {/* Handwritten overlay calligraphy */}
            <div className="absolute top-6 left-6 max-w-[260px] sm:max-w-[300px] z-10 select-none">
              <p className="font-script text-[2rem] sm:text-[2.35rem] leading-[1.05] text-[#fbebd0] tracking-wide transform -rotate-3 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                Every animal deserves a great caregiver.
              </p>
              {/* Subtle curved underline vector */}
              <svg className="w-28 sm:w-36 h-4 text-[#ebd4b0] mt-1 -rotate-3" viewBox="0 0 140 12" fill="none">
                <path d="M2 9C35 4 85 3 138 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Right Column: Split into Content and Features Checklist */}
          <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Sub-column 1: Narrative & CTA */}
            <div className="md:col-span-7 flex flex-col items-start pr-0 md:pr-4">
              <span className="font-sans text-[0.72rem] font-extrabold uppercase tracking-[0.16em] text-[#718077] mb-2.5">
                WHY LEASHED?
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl text-[#141b16] font-bold tracking-tight leading-[1.18] mb-4">
                More Than a Program.
                <span className="block mt-1">It&apos;s a Launchpad.</span>
              </h2>
              <p className="text-sm sm:text-[0.93rem] text-[#4d5c52] leading-relaxed mb-8">
                LEASHED isn&apos;t just about education — it&apos;s about creating opportunities. Our programs are built to give you the practical skills, professional credentials, and ongoing support you need to build a career you love.
              </p>
              <Link
                href="/learn/enroll"
                className="inline-flex items-center justify-center gap-2 font-sans font-semibold rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9b589] bg-[#d9b589] text-[#141b16] hover:bg-[#e4c69e] active:bg-[#c9a579] px-6 py-3 text-xs sm:text-sm tracking-wide shadow-sm"
              >
                <span>Enroll in LEASHED</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Sub-column 2: Checklist */}
            <div className="md:col-span-5 flex flex-col gap-4 sm:gap-5 border-t md:border-t-0 md:border-l border-[#e9e5dc] pt-6 md:pt-1 md:pl-6">
              {checkItems.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 group">
                  <div className="w-5 h-5 rounded-full bg-[#1b2921] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  </div>
                  <div className="flex flex-col">
                    <h4 className="font-sans font-bold text-[#141b16] text-[0.88rem] leading-snug">
                      {item.title}
                    </h4>
                    <p className="text-xs text-[#6e7d73] leading-relaxed mt-0.5">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
