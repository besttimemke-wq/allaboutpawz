'use client';

import React from 'react';
import { X, Star, Quote } from 'lucide-react';
import { Button } from './Button';

interface StoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnroll?: () => void;
}

export function StoriesModal({ isOpen, onClose, onEnroll }: StoriesModalProps) {
  if (!isOpen) return null;

  const stories = [
    {
      name: 'Sarah M.',
      program: 'Professional Pet Care & Business Ownership (PPC)',
      quote:
        'LEASHED gave me the skills and confidence to turn my passion for animals into a career. The support and training are unmatched. Within 6 months of graduating, I opened my own luxury grooming studio with a 3-month waitlist.',
      stats: 'Business Owner &bull; $140k Annual Gross',
    },
    {
      name: 'Marcus T.',
      program: 'Intensive Professional Dog Groomer',
      quote:
        'The hands-on hours were what made the difference. By the time I sat for my state credentials, I had already handled over 180 dogs of varying temperaments and coat types.',
      stats: 'Lead Groomer at Alpine K9 &bull; Certified Master Bather',
    },
    {
      name: 'Elena R.',
      program: 'Professional Cat Groomer',
      quote:
        'Feline grooming is a specialized discipline with huge unmet demand. The fear-free low stress handling I learned at LEASHED transformed how I work with anxious cats.',
      stats: 'Independent Specialist &bull; Fear-Free Certified',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#fdfbf7] rounded-2xl overflow-hidden shadow-2xl border border-[#ded9cb] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#131b15] text-white px-6 py-5 flex items-center justify-between border-b border-[#233328]">
          <div className="flex items-center gap-2.5">
            <Quote className="w-5 h-5 text-[#d9b589]" />
            <h3 className="font-serif text-xl font-bold text-white">Graduate Success Stories</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#a5b6ab] hover:text-white rounded-md"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stories list */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-5">
          {stories.map((story, idx) => (
            <div
              key={idx}
              className="p-5 rounded-xl bg-white border border-[#e5e0d3] shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-sans font-bold text-base text-[#141b16]">{story.name}</h4>
                  <span className="text-xs font-medium text-[#718076]">{story.program}</span>
                </div>
                <div className="flex text-[#d9b589]">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-current" />
                  ))}
                </div>
              </div>
              <p className="font-serif italic text-sm text-[#38463d] leading-relaxed">
                &ldquo;{story.quote}&rdquo;
              </p>
              <div
                className="text-[11px] font-semibold text-[#1a2920] bg-[#f2ede4] px-3 py-1 rounded-md inline-block"
                dangerouslySetInnerHTML={{ __html: story.stats }}
              />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-5 bg-[#f6f2ea] border-t border-[#ded6c5] flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-xs font-semibold text-[#66756b] hover:text-[#141b16]"
          >
            Close
          </button>
          <Button
            variant="primary-sand"
            size="sm"
            withArrow
            onClick={() => {
              onClose();
              onEnroll?.();
            }}
          >
            Start Your Journey
          </Button>
        </div>
      </div>
    </div>
  );
}
