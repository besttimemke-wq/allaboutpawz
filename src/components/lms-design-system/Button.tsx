'use client';

import React from 'react';
import { ArrowRight } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary-sand' | 'secondary-dark' | 'outline-dark' | 'ghost-link' | 'circle-action';
  size?: 'sm' | 'md' | 'lg';
  withArrow?: boolean;
  children?: React.ReactNode;
  icon?: React.ReactNode;
}

export function Button({
  variant = 'primary-sand',
  size = 'md',
  withArrow = false,
  children,
  icon,
  className = '',
  ...props
}: ButtonProps) {
  // Base classes
  const baseClasses =
    'inline-flex items-center justify-center font-sans font-medium transition-all duration-200 select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d9b589] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  // Variant classes
  const variantClasses = {
    'primary-sand':
      'bg-[#d9b589] text-[#16140e] hover:bg-[#cca272] active:bg-[#be9464] shadow-sm hover:shadow-md hover:translate-y-[-1px] rounded-full',
    'secondary-dark':
      'bg-[#1f3025] text-white hover:bg-[#17251d] active:bg-[#111c15] shadow-sm hover:shadow-md rounded-full border border-[#2d4233]',
    'outline-dark':
      'bg-[#18231c]/90 backdrop-blur-sm text-white hover:bg-[#223326] active:bg-[#121c15] border border-[#3b4d3f] rounded-full shadow-sm',
    'ghost-link':
      'text-[#161c18] hover:text-[#0b100c] underline underline-offset-4 decoration-[#161c18]/40 hover:decoration-[#161c18] font-semibold p-0 !h-auto',
    'circle-action':
      'bg-[#2d3d32] text-white hover:bg-[#1c2720] rounded-full shadow-sm hover:scale-105 active:scale-95',
  }[variant];

  // Size classes
  const sizeClasses = {
    sm: 'text-xs px-4 py-2 gap-1.5',
    md: 'text-sm px-6 py-3 gap-2',
    lg: 'text-base px-7 py-3.5 gap-2.5',
  }[size];

  if (variant === 'circle-action') {
    return (
      <button
        className={`${baseClasses} ${variantClasses} w-9 h-9 p-0 flex items-center justify-center shrink-0 ${className}`}
        {...props}
      >
        {icon || <ArrowRight className="w-4 h-4 text-white" />}
      </button>
    );
  }

  if (variant === 'ghost-link') {
    return (
      <button
        className={`${baseClasses} ${variantClasses} ${className}`}
        {...props}
      >
        <span>{children}</span>
        {withArrow && <ArrowRight className="w-4 h-4 ml-1.5 transition-transform group-hover:translate-x-1" />}
      </button>
    );
  }

  return (
    <button
      className={`${baseClasses} ${variantClasses} ${sizeClasses} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
      {withArrow && (
        <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1 shrink-0" />
      )}
    </button>
  );
}
