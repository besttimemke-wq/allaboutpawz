'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ProgramCard, ProgramItem } from './ProgramCard';

interface ProgramsSectionProps {
  onViewAll?: () => void;
  onSelectProgram?: (program: ProgramItem) => void;
}

export const defaultPrograms: ProgramItem[] = [
  {
    id: 'professional-dog-groomer',
    title: 'Intensive Professional Dog Groomer',
    duration: '44 Weeks',
    hours: '1,112 Hours',
    imageSrc: '/images/dog_groomer.jpg',
    imageAlt: 'Professional dog grooming training session with Australian Shepherd',
    iconType: 'scissors',
    tagline: 'Master precision styling, coat care, breed standards, and pet handling.',
    href: '/training/professional-dog-groomer',
  },
  {
    id: 'professional-pet-sitter',
    title: 'Professional Pet Sitter (SIT)',
    duration: '39 Weeks',
    hours: '640 Hours',
    imageSrc: '/images/pet_sitter.jpg',
    imageAlt: 'Pet sitting professional petting golden retriever outdoors',
    iconType: 'heart',
    tagline: 'Comprehensive home care, behavioral evaluation, medication administration, and safety.',
    href: '/training/professional-pet-sitter',
  },
  {
    id: 'professional-cat-groomer',
    title: 'Professional Cat Groomer',
    duration: '24 Weeks',
    hours: '560 Hours',
    imageSrc: '/images/cat_groomer.jpg',
    imageAlt: 'Detailed feline portrait of a healthy tabby cat',
    iconType: 'cat',
    tagline: 'Specialized low-stress feline grooming techniques, sanitary care, and coat maintenance.',
    href: '/training/professional-cat-groomer',
  },
  {
    id: 'pet-care-business-ownership',
    title: 'Professional Pet Care & Business Ownership (PPC)',
    duration: '52 Weeks',
    hours: '1,024 Hours',
    imageSrc: '/images/pet_business.jpg',
    imageAlt: 'Pet business owner walking dogs through scenic city park',
    iconType: 'briefcase',
    tagline: 'Launch and scale a high-revenue pet services company with turnkey operational training.',
    href: '/training/pet-care-business-ownership',
  },
];

export function ProgramsSection({ onSelectProgram }: ProgramsSectionProps) {
  return (
    <section id="programs-section" className="w-full bg-[#fbf9f5] py-14 sm:py-20 border-b border-[#eeebe3]">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-6 items-start">
          {/* Left Column: Heading & Narrative */}
          <div className="lg:col-span-3 flex flex-col items-start pr-2 pt-2">
            <span className="font-sans text-[0.72rem] font-extrabold uppercase tracking-[0.16em] text-[#718077] mb-2.5">
              OUR PROGRAMS
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl text-[#141b16] font-bold tracking-tight leading-[1.18] mb-4">
              Find Your Path in Pet Care.
            </h2>
            <p className="text-sm sm:text-[0.93rem] text-[#4d5c52] leading-relaxed mb-8">
              Whether your passion lies in styling, hands-on care, or launching your own business, LEASHED offers structured, accredited training designed for real career outcomes.
            </p>
            <Link
              href="/learn/enroll"
              className="inline-flex items-center justify-center gap-2 font-sans font-semibold rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a2920] bg-[#1a2920] text-white hover:bg-[#25392d] active:bg-[#121c16] px-6 py-3 text-xs tracking-wide shadow-sm"
            >
              <span>Get Started / Enroll</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Right Column: 4 Program Cards */}
          <div className="lg:col-span-9 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {defaultPrograms.map((program) => (
              <ProgramCard
                key={program.id}
                program={program}
                onSelect={onSelectProgram}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
