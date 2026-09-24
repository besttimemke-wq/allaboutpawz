'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative w-full overflow-hidden bg-[#141c16] text-white min-h-[560px] sm:min-h-[640px] lg:min-h-[680px] flex items-center">
      {/* High Quality Hero Photography */}
      <div className="absolute inset-0 w-full h-full">
        <Image
          src="/images/hero_trainer.jpg"
          alt="Professional dog trainer with happy golden retriever in mountain landscape"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[center_35%] lg:object-right-top brightness-90 contrast-[1.03]"
          referrerPolicy="no-referrer"
        />
        {/* Subtle Dark Vignette and Gradient Overlay for Text Legibility */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#111813]/95 via-[#111813]/80 to-transparent lg:via-[#111813]/60 lg:to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#111813] via-transparent to-black/30 lg:hidden" />
      </div>

      {/* Hero Content Container */}
      <div className="relative max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 z-10">
        <div className="flex flex-col lg:flex-row items-start justify-between gap-10">
          {/* Main Typography Block */}
          <div className="max-w-2xl">
            {/* Eyebrow */}
            <span className="inline-block font-sans text-xs sm:text-[0.8rem] font-extrabold uppercase tracking-[0.2em] text-[#d0ded5] mb-3 sm:mb-4 drop-shadow-sm">
              PROFESSIONAL PET CARE EDUCATION
            </span>

            {/* Display Heading */}
            <h1 className="font-serif text-4xl sm:text-6xl lg:text-[4.25rem] font-bold text-white tracking-tight leading-[1.08] mb-5 sm:mb-6 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
              Real Skills.
              <span className="block mt-1">Meaningful Careers.</span>
            </h1>

            {/* Body Copy */}
            <p className="font-sans text-sm sm:text-base lg:text-[1.05rem] text-[#d6e3db] leading-relaxed max-w-xl mb-8 drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]">
              LEASHED provides industry-leading education and training for those who want to turn their love for animals into a professional career. Whether you&apos;re just starting or looking to grow, we give you the skills, confidence, and support to succeed.
            </p>

            {/* CTA Button */}
            <Link
              href="/learn/enroll"
              className="inline-flex items-center justify-center gap-2 font-sans font-semibold rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9b589] bg-[#d9b589] text-[#141b16] hover:bg-[#e4c69e] active:bg-[#c9a579] px-7 py-3.5 text-sm sm:text-base tracking-wide shadow-lg"
            >
              <span>Get Started &amp; Enroll</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Top-Right Script Callout */}
          <div className="self-end lg:self-start lg:mr-0 mt-4 lg:mt-2 select-none">
            <div className="font-script text-2xl sm:text-3xl lg:text-[2.25rem] leading-[1.15] text-[#f7eedf] tracking-wide transform -rotate-3 lg:-rotate-6 text-right drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]">
              <span>Better Care.</span>
              <br />
              <span className="text-[#ecd7b6]">Stronger Skills.</span>
              <br />
              <span>Brighter Futures.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
