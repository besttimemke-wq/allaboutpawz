'use client';

import React from 'react';
import Link from 'next/link';
import { PawPrint, AlertCircle, ShieldCheck, Scissors, GraduationCap, Monitor } from 'lucide-react';

// ============================================================================
// Shared presentational shell for the five bifurcated auth pages.
// Each page passes its own branding/copy; the shell carries zero
// role-branching logic.
// ============================================================================

export type AuthPortalKind = 'customer' | 'groomer' | 'frontdesk' | 'admin' | 'lms';

const BRANDING: Record<AuthPortalKind, { eyebrow: string; title: string; subtitle: string; icon: React.ElementType }> = {
  customer: {
    eyebrow: 'PET PARENT PORTAL',
    title: 'Welcome back',
    subtitle: 'Sign in to book appointments, manage your pets, and view billing.',
    icon: PawPrint,
  },
  groomer: {
    eyebrow: 'GROOMER STATION',
    title: 'Groomer sign-in',
    subtitle: 'Your station schedule, assigned appointments, and style records.',
    icon: Scissors,
  },
  frontdesk: {
    eyebrow: 'FRONT DESK',
    title: 'Front desk sign-in',
    subtitle: 'Intake, concierge, and station operations for front desk staff.',
    icon: Monitor,
  },
  admin: {
    eyebrow: 'ADMIN CONSOLE',
    title: 'Admin sign-in',
    subtitle: 'Internal management console. Authorized personnel only.',
    icon: ShieldCheck,
  },
  lms: {
    eyebrow: 'LEARNING CENTER',
    title: 'Continue learning',
    subtitle: 'Training courses and learning paths for the All About Pawz team.',
    icon: GraduationCap,
  },
};

interface AuthPageShellProps {
  portal: AuthPortalKind;
  error?: string | null;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export const AuthPageShell: React.FC<AuthPageShellProps> = ({ portal, error, footer, children }) => {
  const brand = BRANDING[portal];
  const Icon = brand.icon;

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-secondary px-4 py-10">
      <div className="w-full max-w-[400px]">
        {/* Brand */}
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-card-md">
            <Icon className="h-6 w-6" />
          </div>
          <p className="font-bar text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {brand.eyebrow}
          </p>
          <h1 className="mt-1.5 text-[26px] font-semibold tracking-[-0.01em] text-foreground">{brand.title}</h1>
          <p className="mx-auto mt-2 max-w-[300px] text-[13px] leading-relaxed text-muted-foreground">{brand.subtitle}</p>
        </div>

        {/* Card */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-card-md sm:p-7">
          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-[12.5px] leading-relaxed text-destructive"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {children}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-[12px] text-muted-foreground">
          {footer || (
            <span>
              <Link href="/" className="font-medium text-foreground underline underline-offset-2 hover:text-primary transition">
                allaboutpawz.com
              </Link>
              {' · '}
              <span>All About Pawz</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
