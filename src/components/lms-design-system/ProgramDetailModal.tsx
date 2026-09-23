'use client';

import React from 'react';
import Image from 'next/image';
import { ProgramItem } from './ProgramCard';
import { Button } from './Button';
import { X, CheckCircle2, Clock, Calendar, Award, ShieldCheck } from 'lucide-react';

interface ProgramDetailModalProps {
  program: ProgramItem | null;
  onClose: () => void;
  onEnroll?: (program: ProgramItem) => void;
}

export function ProgramDetailModal({
  program,
  onClose,
  onEnroll,
}: ProgramDetailModalProps) {
  if (!program) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#fdfbf7] rounded-2xl overflow-hidden shadow-2xl border border-[#ded9cb] max-h-[90vh] flex flex-col">
        {/* Header Image */}
        <div className="relative h-48 sm:h-56 w-full bg-[#1b2921] shrink-0">
          <Image
            src={program.imageSrc}
            alt={program.imageAlt}
            fill
            className="object-cover object-center"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
          
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Program Header */}
          <div className="absolute bottom-4 left-6 right-6 text-white">
            <span className="text-[10px] uppercase font-extrabold tracking-widest text-[#d9b589] bg-[#1a2920]/80 px-2.5 py-1 rounded-full border border-[#d9b589]/30">
              OFFICIAL CERTIFICATION PROGRAM
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold mt-2 text-white">
              {program.title}
            </h2>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
          {/* Fast Stats Bar */}
          <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-[#f2ece2] border border-[#ded6c5]">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#1a2920]" />
              <div>
                <span className="text-[10px] text-[#6b7b71] uppercase font-bold block">Duration</span>
                <span className="text-xs font-bold text-[#141b16]">{program.duration}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 border-l border-[#ded6c5] pl-3">
              <Clock className="w-4 h-4 text-[#1a2920]" />
              <div>
                <span className="text-[10px] text-[#6b7b71] uppercase font-bold block">Training</span>
                <span className="text-xs font-bold text-[#141b16]">{program.hours}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 border-l border-[#ded6c5] pl-3">
              <Award className="w-4 h-4 text-[#1a2920]" />
              <div>
                <span className="text-[10px] text-[#6b7b71] uppercase font-bold block">Credential</span>
                <span className="text-xs font-bold text-[#141b16]">Accredited</span>
              </div>
            </div>
          </div>

          {/* Overview */}
          <div>
            <h4 className="font-sans font-bold text-sm text-[#141b16] uppercase tracking-wider mb-2">
              Program Overview
            </h4>
            <p className="text-sm text-[#4d5c52] leading-relaxed">
              {program.tagline || 'Experience comprehensive animal handling and career mastery led by licensed practitioners. Gain hands-on clinic hours, animal psychology insights, and business management acumen.'}
            </p>
          </div>

          {/* Core Curriculum Pillars */}
          <div>
            <h4 className="font-sans font-bold text-sm text-[#141b16] uppercase tracking-wider mb-3">
              Core Skills &amp; Competencies
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                'Practical Handling & Animal Psychology',
                'Advanced Equipment Operation & Hygiene',
                'Health Screening & Emergency First Aid',
                'Client Communications & Booking Workflows',
                'State & National Licensing Compliance',
                'Direct Employer Job Placement Network',
              ].map((skill, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-[#38463d]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1b2921] shrink-0" />
                  <span>{skill}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Value Guarantee */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[#eaf2ec] border border-[#cde0d2] text-[#1b4329]">
            <ShieldCheck className="w-5 h-5 shrink-0" />
            <p className="text-xs leading-snug">
              <strong>Guaranteed Internship Hours:</strong> Includes guaranteed clinical shadowing with vetted partner facilities.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-6 bg-[#f7f3eb] border-t border-[#e6decb] flex items-center justify-between gap-4">
          <button
            onClick={onClose}
            className="text-xs font-semibold text-[#66756b] hover:text-[#141b16] px-3 py-2"
          >
            Close
          </button>
          <div className="flex items-center gap-3">
            <Button
              variant="primary-sand"
              size="md"
              withArrow
              onClick={() => onEnroll?.(program)}
            >
              Apply for This Program
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
