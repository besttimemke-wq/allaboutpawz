'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from './Button';
import { X, CheckCircle } from 'lucide-react';
import { ProgramItem } from './ProgramCard';

interface EnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProgram?: ProgramItem | null;
  initialProgramId?: string;
}

export function EnrollmentModal({
  isOpen,
  onClose,
  selectedProgram,
  initialProgramId,
}: EnrollmentModalProps) {
  const getDefaultProgramName = () => {
    if (selectedProgram?.title) return selectedProgram.title;
    if (initialProgramId === 'ppc') return 'Professional Pet Care & Business Ownership (52 Weeks)';
    if (initialProgramId === 'cat') return 'Professional Cat Groomer (24 Weeks)';
    if (initialProgramId === 'aca') return 'Dog Bather / Animal Care Assistant (35 Weeks)';
    if (initialProgramId === 'pps') return 'Professional Pet Sitter [SIT] (16 Weeks)';
    if (initialProgramId === 'pdt') return 'Professional Dog Trainer Certification (39 Weeks)';
    return 'Intensive Professional Dog Groomer (16-44 Weeks)';
  };

  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    program: getDefaultProgramName(),
    experience: 'Beginner / Career Starter',
    startDate: 'Next Available Cohort',
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#fdfbf7] rounded-2xl overflow-hidden shadow-2xl border border-[#dfd8c8] max-h-[92vh] flex flex-col">
        {/* Modal Top Bar */}
        <div className="bg-[#131b15] text-white px-6 py-5 flex items-center justify-between border-b border-[#233328]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[#d9b589] text-[#131b15] flex items-center justify-center font-bold text-xs">
              
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-white">Start Your Pet Care Career</h3>
              <p className="text-[11px] text-[#cbd5ce]">LEASHED Admissions &amp; Program Advisor</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#a5b6ab] hover:text-white rounded-md"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 sm:p-7 overflow-y-auto">
          {submitted ? (
            <div className="py-8 text-center flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-[#1b2921] text-[#d9b589] flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h4 className="font-serif text-2xl font-bold text-[#141b16] mb-2">
                Application Received!
              </h4>
              <p className="text-sm text-[#526257] max-w-sm mb-6 leading-relaxed">
                Thank you, <strong>{formData.name || 'Friend'}</strong>. An admissions advisor will contact you at <strong>{formData.email || 'your email'}</strong> within 24 hours. You can also complete your learner onboarding profile now to access the classroom portal.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
                <Link
                  href="/learn/enroll"
                  onClick={() => {
                    setSubmitted(false);
                    onClose();
                  }}
                  className="flex-1 text-center py-2.5 px-4 rounded-xl bg-[#234937] hover:bg-[#1a382a] text-white text-xs font-bold transition-colors shadow-sm"
                >
                  Start Learner Onboarding →
                </Link>
                <Button
                  variant="outline-dark"
                  size="md"
                  onClick={() => {
                    setSubmitted(false);
                    onClose();
                  }}
                  className="flex-1 justify-center text-xs"
                >
                  Back to Courses
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#3f4d44] mb-1.5">
                  Selected Program
                </label>
                <select
                  value={formData.program}
                  onChange={(e) => setFormData({ ...formData, program: e.target.value })}
                  className="w-full bg-white border border-[#d6cfbe] rounded-lg px-3.5 py-2.5 text-sm text-[#141b16] focus:outline-none focus:ring-2 focus:ring-[#d9b589]"
                >
                  <option>Intensive Professional Dog Groomer (16-44 Weeks)</option>
                  <option>Professional Pet Care &amp; Business Ownership (52 Weeks)</option>
                  <option>Professional Cat Groomer (24 Weeks)</option>
                  <option>Dog Bather / Animal Care Assistant (35 Weeks)</option>
                  <option>Professional Pet Sitter [SIT] (16 Weeks)</option>
                  <option>Professional Dog Trainer Certification (39 Weeks)</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#3f4d44] mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Jane Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-white border border-[#d6cfbe] rounded-lg px-3.5 py-2.5 text-sm text-[#141b16] focus:outline-none focus:ring-2 focus:ring-[#d9b589]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#3f4d44] mb-1.5">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="(555) 000-0000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-white border border-[#d6cfbe] rounded-lg px-3.5 py-2.5 text-sm text-[#141b16] focus:outline-none focus:ring-2 focus:ring-[#d9b589]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#3f4d44] mb-1.5">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="jane@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-white border border-[#d6cfbe] rounded-lg px-3.5 py-2.5 text-sm text-[#141b16] focus:outline-none focus:ring-2 focus:ring-[#d9b589]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#3f4d44] mb-1.5">
                    Animal Experience
                  </label>
                  <select
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    className="w-full bg-white border border-[#d6cfbe] rounded-lg px-3.5 py-2.5 text-sm text-[#141b16] focus:outline-none focus:ring-2 focus:ring-[#d9b589]"
                  >
                    <option>Beginner / Career Starter</option>
                    <option>Pet Owner / Volunteer</option>
                    <option>Shelter or Kennel Worker</option>
                    <option>Bather / Grooming Assistant</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#3f4d44] mb-1.5">
                    Preferred Start Date
                  </label>
                  <select
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full bg-white border border-[#d6cfbe] rounded-lg px-3.5 py-2.5 text-sm text-[#141b16] focus:outline-none focus:ring-2 focus:ring-[#d9b589]"
                  >
                    <option>Next Available Cohort</option>
                    <option>Spring Term</option>
                    <option>Summer Intensive</option>
                    <option>Fall Term</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="primary-sand"
                  size="lg"
                  withArrow
                  className="w-full justify-center !py-3 font-bold text-sm"
                  type="submit"
                >
                  Submit Application &amp; View Syllabus
                </Button>
              </div>

              <p className="text-[11px] text-center text-[#78887e] pt-1">
                No fee required to apply. Accredited certification recognized nationwide.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
