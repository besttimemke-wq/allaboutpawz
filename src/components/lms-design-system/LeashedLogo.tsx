'use client';

import React from 'react';

interface LeashedLogoProps {
  variant?: 'light' | 'dark' | 'cream' | 'current';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showWordmark?: boolean;
  showTagline?: boolean;
}

export function LeashedLogo({
  variant = 'light',
  size = 'md',
  className = '',
  showWordmark = true,
  showTagline = false,
}: LeashedLogoProps) {
  // Height mappings for exact, crisp layout placement
  const heights = {
    xs: 26,
    sm: 34,
    md: 44,
    lg: 54,
    xl: 68,
  }[size];

  // Pick the transparent public asset based on the background variant
  // 'light' and 'cream' are used on dark surfaces -> use white transparent PNG
  // 'dark' is used on light surfaces -> use black transparent PNG
  const logoSrc = (variant === 'light' || variant === 'cream') 
    ? '/leashed-logo-white.png' 
    : '/leashed-logo.png';

  const subtextColor = variant === 'dark' ? 'text-[#526458]' : 'text-[#c6d7cc]';

  return (
    <div className={`inline-flex flex-col select-none ${className}`}>
      <img
        src={logoSrc}
        alt="LEASHED Academy"
        style={{
          height: `${heights}px`,
          width: 'auto',
          objectFit: 'contain',
        }}
        className="transition-transform duration-200 hover:scale-[1.02] block max-w-full"
        loading="eager"
      />

      {showTagline && showWordmark && (
        <span
          className={`font-sans font-bold uppercase tracking-[0.22em] text-[9px] mt-1 pl-1 ${subtextColor}`}
        >
          VOCATIONAL ACADEMY
        </span>
      )}
    </div>
  );
}
