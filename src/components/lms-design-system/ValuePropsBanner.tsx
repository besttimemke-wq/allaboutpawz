'use client';

import React from 'react';
import { GraduationCap, ShieldCheck, Users, Laptop } from 'lucide-react';

export function ValuePropsBanner() {
  const items = [
    {
      id: 'hands-on',
      icon: (
        // Custom clean paw print SVG
        <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="15.5" r="3.5" />
          <circle cx="6.5" cy="10" r="2" />
          <circle cx="10" cy="6.5" r="2" />
          <circle cx="14" cy="6.5" r="2" />
          <circle cx="17.5" cy="10" r="2" />
        </svg>
      ),
      title: 'Hands-On Training',
      description: 'Real pets. Real skills.',
    },
    {
      id: 'expert-instructors',
      icon: <GraduationCap className="w-6 h-6 text-white" strokeWidth={1.8} />,
      title: 'Expert Instructors',
      description: 'Industry professionals with real-world experience.',
    },
    {
      id: 'industry-credentials',
      icon: <ShieldCheck className="w-6 h-6 text-white" strokeWidth={1.8} />,
      title: 'Industry Credentials',
      description: 'Earn recognized certifications.',
    },
    {
      id: 'career-support',
      icon: <Users className="w-6 h-6 text-white" strokeWidth={1.8} />,
      title: 'Career Support',
      description: 'Job placement, resume help, & ongoing guidance.',
    },
    {
      id: 'flexible-learning',
      icon: <Laptop className="w-6 h-6 text-white" strokeWidth={1.8} />,
      title: 'Flexible Learning',
      description: 'Online + in-person options to fit your life.',
    },
  ];

  return (
    <section className="w-full bg-[#1b2921] border-y border-[#263a2f] text-white">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 divide-y sm:divide-y-0 lg:divide-x divide-[#2a3e32]/60">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col items-center text-center px-4 py-5 sm:py-4 transition-all duration-200 hover:bg-[#203127]/50 rounded-lg"
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3 text-white">
                {item.icon}
              </div>
              <h4 className="font-sans font-semibold text-white text-base tracking-tight mb-1.5">
                {item.title}
              </h4>
              <p className="text-xs leading-relaxed text-[#b4c4bb] max-w-[210px]">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
