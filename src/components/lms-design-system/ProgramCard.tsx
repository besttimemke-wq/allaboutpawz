'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Scissors, Heart, Briefcase, ArrowRight } from 'lucide-react';

export type ProgramIconType = 'scissors' | 'heart' | 'cat' | 'briefcase';

export interface ProgramItem {
  id: string;
  title: string;
  duration: string;
  hours: string;
  imageSrc: string;
  imageAlt: string;
  iconType: ProgramIconType;
  tagline?: string;
  href?: string;
}

interface ProgramCardProps {
  program: ProgramItem;
  onSelect?: (program: ProgramItem) => void;
}

export function ProgramCard({ program, onSelect }: ProgramCardProps) {
  const targetHref = program.href || `/training/${program.id}`;

  const renderIcon = (type: ProgramIconType) => {
    switch (type) {
      case 'scissors':
        return <Scissors className="w-4 h-4 text-[#1a2920]" strokeWidth={2.2} />;
      case 'heart':
        return <Heart className="w-4 h-4 text-[#1a2920]" strokeWidth={2.2} fill="#1a2920" fillOpacity={0.15} />;
      case 'briefcase':
        return <Briefcase className="w-4 h-4 text-[#1a2920]" strokeWidth={2.2} />;
      case 'cat':
        return (
          // Cat silhouette vector
          <svg className="w-4 h-4 text-[#1a2920]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5c-4 0-7 2.5-7 6.5 0 3 1.5 5 4 6 1 .5 2 .5 3 .5s2 0 3-.5c2.5-1 4-3 4-6 0-4-3-6.5-7-6.5z" />
            <path d="M5 10L3 3l6.5 3" />
            <path d="M19 10l2-7-6.5 3" />
            <circle cx="9" cy="11.5" r="0.75" fill="currentColor" />
            <circle cx="15" cy="11.5" r="0.75" fill="currentColor" />
            <path d="M12 14v1" />
          </svg>
        );
      default:
        return <Scissors className="w-4 h-4 text-[#1a2920]" />;
    }
  };

  return (
    <Link
      href={targetHref}
      onClick={() => onSelect?.(program)}
      className="group relative flex flex-col bg-white rounded-xl overflow-hidden shadow-[0_4px_20px_-2px_rgba(22,28,24,0.06)] hover:shadow-[0_12px_28px_-4px_rgba(22,28,24,0.12)] transition-all duration-300 border border-[#eeebe3] hover:border-[#dfdacd] cursor-pointer block"
    >
      {/* Card Image Container */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#e8e4db]">
        <Image
          src={program.imageSrc}
          alt={program.imageAlt}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-60" />
      </div>

      {/* Floating Badge on boundary */}
      <div className="relative px-5 pt-0">
        <div className="-mt-5 mb-4 inline-flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-md border border-[#eeebe3] z-10 transition-transform duration-300 group-hover:scale-110">
          {renderIcon(program.iconType)}
        </div>

        {/* Program Title */}
        <h3 className="font-sans font-bold text-[#141b16] text-[1.05rem] leading-snug tracking-tight min-h-[3rem] line-clamp-2 group-hover:text-[#2d3d32] transition-colors">
          {program.title}
        </h3>

        {/* Card Footer: Metadata & Action button */}
        <div className="mt-3 pt-3 pb-5 flex items-center justify-between border-t border-[#f2efe8]">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[#738278]">
            <span>{program.duration}</span>
            <span className="text-[#c1cbc5]">|</span>
            <span>{program.hours}</span>
          </div>

          <div className="w-8 h-8 rounded-full bg-[#2d3d32] text-white flex items-center justify-center transition-all duration-200 group-hover:bg-[#1a2920] group-hover:scale-110 shrink-0 shadow-sm">
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>
    </Link>
  );
}
