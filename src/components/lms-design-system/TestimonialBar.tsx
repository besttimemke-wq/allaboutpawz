'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function TestimonialBar() {
  return (
    <section className="relative w-full overflow-hidden bg-[#121914] text-white py-14 sm:py-16">
      {/* Background Panorama */}
      <Image
        src="/images/mountain_sunset.jpg"
        alt="Mountain sunset panorama"
        fill
        sizes="100vw"
        className="object-cover object-center opacity-40 brightness-75"
        referrerPolicy="no-referrer"
      />
      
      {/* Dark gradient backdrop to ensure high contrast */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#111813]/90 via-[#131d16]/75 to-[#111813]/90 backdrop-blur-[1px]" />

      <div className="relative max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 text-center lg:text-left">
          {/* Quote */}
          <div className="max-w-3xl">
            <blockquote className="font-serif italic text-lg sm:text-2xl text-[#f3efe8] leading-relaxed tracking-tight mb-3 font-normal">
              &ldquo;LEASHED gave me the skills and confidence to turn my passion for animals into a career. The support and training are unmatched.&rdquo;
            </blockquote>
            <cite className="not-italic font-sans text-xs sm:text-sm font-semibold uppercase tracking-[0.14em] text-[#d4ded7]">
              — SARAH M. <span className="text-[#84968c] mx-2">|</span> PPC GRADUATE
            </cite>
          </div>

          {/* Action Button */}
          <div className="shrink-0">
            <Link
              href="/learn/enroll"
              className="inline-flex items-center justify-center gap-2 font-sans font-semibold rounded-full transition-all duration-200 focus:outline-none border border-[#43594b] hover:border-[#678572] bg-white/5 hover:bg-white/10 text-white px-6 py-3 text-xs sm:text-sm tracking-wide"
            >
              <span>Start Your Journey</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
