'use client';

import React, { useState } from 'react';
import { AuthUser, UserRole } from '@/lib/dawg-types';
import { DEMO_AUTH_USERS } from '@/lib/dawg-mock-data';

interface LandingLoginViewProps {
  onLogin: (user: AuthUser, initialSection?: string) => void;
}

type PortalType = 'staff' | 'client';
type StaffRoleKey = 'Administrator' | 'Manager' | 'Front Desk' | 'Groomer' | 'Marketing';

interface RoleOption {
  key: StaffRoleKey;
  label: string;
  desc: string;
  icon: (colorClass: string) => React.ReactNode;
  defaultEmail: string;
  userRole: UserRole;
  displayName: string;
}

const STAFF_ROLES: RoleOption[] = [
  {
    key: 'Administrator',
    label: 'Administrator',
    desc: 'Full system access & salon control',
    defaultEmail: 'admin@test.com',
    userRole: 'admin',
    displayName: 'Admin User',
    icon: (colorClass) => (
      <svg className={`w-5 h-5 ${colorClass}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: 'Manager',
    label: 'Manager',
    desc: 'Manage salon operations & staff',
    defaultEmail: 'manager@test.com',
    userRole: 'admin',
    displayName: 'Marcus Vance',
    icon: (colorClass) => (
      <svg className={`w-5 h-5 ${colorClass}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: 'Front Desk',
    label: 'Front Desk',
    desc: 'Check-ins, appointments & payments',
    defaultEmail: 'reception@test.com',
    userRole: 'admin',
    displayName: 'Elena Rostova',
    icon: (colorClass) => (
      <svg className={`w-5 h-5 ${colorClass}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: 'Groomer',
    label: 'Groomer Station',
    desc: 'Active dog queue, timer & notes',
    defaultEmail: 'groomer@test.com',
    userRole: 'groomer',
    displayName: 'Sarah M.',
    icon: (colorClass) => (
      <svg className={`w-5 h-5 ${colorClass}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.828 2.829a4 4 0 11-5.657-5.657l2.828-2.828m0 0a4 4 0 115.657 5.656L9 12" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: 'Marketing',
    label: 'Marketing',
    desc: 'Promotions, VIP perks & SMS',
    defaultEmail: 'marketing@test.com',
    userRole: 'admin',
    displayName: 'Jordan Hayes',
    icon: (colorClass) => (
      <svg className={`w-5 h-5 ${colorClass}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export const LandingLoginView: React.FC<LandingLoginViewProps> = ({ onLogin }) => {
  // Portal Mode: 'client' (Pet Parent) vs 'staff'
  const [portalType, setPortalType] = useState<PortalType>('client');

  // Staff role selection
  const [selectedStaffRole, setSelectedStaffRole] = useState<StaffRoleKey>('Administrator');
  
  // Credentials
  const [email, setEmail] = useState('sarah.johnson@example.com');
  const [password, setPassword] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [trustDevice, setTrustDevice] = useState(true);
  const [footerModal, setFooterModal] = useState<string | null>(null);

  // Switch between Pet Parent and Staff
  const handlePortalSwitch = (type: PortalType) => {
    setPortalType(type);
    if (type === 'client') {
      setEmail('sarah.johnson@example.com');
    } else {
      const activeRole = STAFF_ROLES.find((r) => r.key === selectedStaffRole) || STAFF_ROLES[0];
      setEmail(activeRole.defaultEmail);
    }
  };

  const handleStaffRoleSelect = (roleItem: RoleOption) => {
    setSelectedStaffRole(roleItem.key);
    setEmail(roleItem.defaultEmail);
  };

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();

    if (portalType === 'client') {
      // Pet Parent Login
      onLogin({
        id: 'usr-client-1',
        name: 'Sarah Johnson',
        email: email || 'sarah.johnson@example.com',
        role: 'customer',
        avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCNIEpDScyL977tdc-rLYh4_ksq466XZ7OpRPQzY-1HWlRGcv3nDVmyz5hiik8a4BztgOlDE8mwAglsQF7nec16VqxecRAG2BROmD6CQ6akSNSwZjZXabjJAu0lTMjgw8Z5m7gcOPZDP7UlqFU_sNGVJCwd5fNw_Mye6SCB9_SIBuisfYgH-Ry8BYMEIB0B4Fh8D_upZhRp5MafgvVz1iXHsTvXy1oA1byvfOqrP_Xg3cYGC-rQ-oye',
      });
    } else {
      // Staff Login
      const currentRoleConfig = STAFF_ROLES.find((r) => r.key === selectedStaffRole) || STAFF_ROLES[0];
      const isGroomer = selectedStaffRole === 'Groomer' || email.toLowerCase().includes('groomer');

      if (isGroomer) {
        onLogin({
          id: 'usr-groomer-1',
          name: 'Sarah M.',
          email: email || 'groomer@test.com',
          role: 'groomer',
          avatarUrl: DEMO_AUTH_USERS[1].avatarUrl,
          stationName: 'Station #3 (Spa Suite)',
        });
      } else {
        onLogin(
          {
            id: 'usr-admin-1',
            name: currentRoleConfig.displayName,
            email: email || 'admin@test.com',
            role: 'admin',
            avatarUrl: DEMO_AUTH_USERS[0].avatarUrl,
            stationName: 'Central Management',
          },
          'appointments'
        );
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row text-slate-800 antialiased selection:bg-gold/20 selection:text-gold-deep bg-[#f8f9fc]">
      <div className="w-full flex flex-col lg:flex-row flex-grow min-h-screen">
        {/* ================= LEFT POSTER COLUMN ================= */}
        <aside className="w-full lg:w-[480px] xl:w-[520px] flex-shrink-0 relative overflow-hidden min-h-[480px] lg:min-h-screen bg-gradient-to-b from-cream via-cream-deep to-cream flex flex-col justify-between p-8 sm:p-10 lg:p-12 border-b lg:border-b-0 lg:border-r border-gold/20">
          {/* Top Brand & Value Props in 100% Crisp Vector Code */}
          <div className="space-y-8 my-auto">
            {/* Logo */}
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-gold-deep flex items-center justify-center text-white shadow-lg shadow-gold/40">
                <svg className="w-8 h-8 fill-white" viewBox="0 0 24 24">
                  <path d="M12 2C11.17 2 10.5 2.67 10.5 3.5C10.5 4.33 11.17 5 12 5C12.83 5 13.5 4.33 13.5 3.5C13.5 2.67 12.83 2 12 2ZM8 4.5C7.17 4.5 6.5 5.17 6.5 6C6.5 6.83 7.17 7.5 8 7.5C8.83 7.5 9.5 6.83 9.5 6C9.5 5.17 8.83 4.5 8 4.5ZM16 4.5C15.17 4.5 14.5 5.17 14.5 6C14.5 6.83 15.17 7.5 16 7.5C16.83 7.5 17.5 6.83 17.5 6C17.5 5.17 16.83 4.5 16 4.5ZM5.5 8.5C4.67 8.5 4 9.17 4 10C4 10.83 4.67 11.5 5.5 11.5C6.33 11.5 7 10.83 7 10C7 9.17 6.33 8.5 5.5 8.5ZM18.5 8.5C17.67 8.5 17 9.17 17 10C17 10.83 17.67 11.5 18.5 11.5C19.33 11.5 20 10.83 20 10C20 9.17 19.33 8.5 18.5 8.5ZM12 7C9.5 7 7 9.5 7 12.5C7 15 8.5 17.5 10 19C10.5 19.5 11.2 20 12 20C12.8 20 13.5 19.5 14 19C15.5 17.5 17 15 17 12.5C17 9.5 14.5 7 12 7Z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">
                  All About <br />
                  <span className="text-gold-deep">Pawz</span>
                </h1>
                <span className="inline-block mt-1.5 text-xs font-extrabold text-gold-deep tracking-widest uppercase">
                  Salon &amp; Pet Parent Platform
                </span>
              </div>
            </div>

            {/* Headline */}
            <div className="text-center max-w-sm mx-auto">
              <h2 className="text-base sm:text-lg font-bold text-slate-700 leading-snug">
                {portalType === 'client'
                  ? 'Your Pet Parent Dashboard for Seamless Grooming, Live Status & Easy Booking'
                  : 'The Complete All-in-One Salon Operating System for Groomers & Staff'}
              </h2>
            </div>

            {/* Feature Bullets */}
            <div className="space-y-3.5 max-w-sm mx-auto pt-1">
              {portalType === 'client' ? (
                <>
                  <div className="flex items-start gap-3.5 bg-white/80 p-3.5 rounded-2xl border border-slate-200/60 shadow-2xs">
                    <div className="w-9 h-9 rounded-xl bg-cream-deep text-gold-deep flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 stroke-current" fill="none" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 leading-tight">Live Groom Progress</h3>
                      <p className="text-[11px] text-slate-500 leading-normal mt-0.5">
                        Track checked-in, in-bath, styling, and ready for pickup in real-time.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5 bg-white/80 p-3.5 rounded-2xl border border-slate-200/60 shadow-2xs">
                    <div className="w-9 h-9 rounded-xl bg-cream-deep text-gold-deep flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 stroke-current" fill="none" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 leading-tight">My Pets &amp; Vaccines</h3>
                      <p className="text-[11px] text-slate-500 leading-normal mt-0.5">
                        Manage Buddy &amp; Luna&apos;s rabies certificates and grooming history.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5 bg-white/80 p-3.5 rounded-2xl border border-slate-200/60 shadow-2xs">
                    <div className="w-9 h-9 rounded-xl bg-cream-deep text-gold-deep flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 stroke-current" fill="none" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 leading-tight">Fast Stripe Checkout</h3>
                      <p className="text-[11px] text-slate-500 leading-normal mt-0.5">
                        Save cards securely, tip your groomer, and view receipts on demand.
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3.5 bg-white/80 p-3.5 rounded-2xl border border-slate-200/60 shadow-2xs">
                    <div className="w-9 h-9 rounded-xl bg-cream-deep text-gold-deep flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 stroke-current" fill="none" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 leading-tight">Secure Salon OS</h3>
                      <p className="text-[11px] text-slate-500 leading-normal mt-0.5">
                        Enterprise role management for groomers, bathers, and managers.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5 bg-white/80 p-3.5 rounded-2xl border border-slate-200/60 shadow-2xs">
                    <div className="w-9 h-9 rounded-xl bg-cream-deep text-gold-deep flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 stroke-current" fill="none" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.828 2.829a4 4 0 11-5.657-5.657l2.828-2.828m0 0a4 4 0 115.657 5.656L9 12" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 leading-tight">Groomer Workstation</h3>
                      <p className="text-[11px] text-slate-500 leading-normal mt-0.5">
                        Dedicated queue with breed notes, temperament alerts, and timers.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Bottom Trust Badge */}
          <div className="pt-6 border-t border-slate-200/60 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 border border-slate-200/80 text-[11px] font-medium text-slate-600 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>All About Pawz • Frisco &amp; Main Salon</span>
            </div>
          </div>
        </aside>

        {/* ================= RIGHT FORM COLUMN ================= */}
        <main className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16">
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-[840px] bg-white rounded-3xl p-8 sm:p-12 shadow-[0_10px_35px_-4px_rgba(0,0,0,0.04)] border border-slate-100">
              
              {/* TOP ROLE SWITCHER TABS: Pet Parent vs Staff */}
              <div className="flex justify-center mb-8">
                <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center gap-1.5 border border-slate-200/80 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => handlePortalSwitch('client')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer ${
                      portalType === 'client'
                        ? 'bg-gold-deep text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <span>🐾</span>
                    <span>Pet Parent Portal</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePortalSwitch('staff')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer ${
                      portalType === 'staff'
                        ? 'bg-gold-deep text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <span>💼</span>
                    <span>Salon Staff &amp; Groomers</span>
                  </button>
                </div>
              </div>

              {/* Header Title */}
              <div className="text-center mb-6">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-1.5">
                  {portalType === 'client' ? 'Welcome Pet Parent!' : 'Staff Command Portal'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  {portalType === 'client'
                    ? 'Sign in to view Buddy & Luna, track grooming in real-time, and manage payments.'
                    : 'Select your salon role to launch your active workstation.'}
                </p>
              </div>

              {/* Form */}
              <form className="space-y-4" onSubmit={handleSignIn}>
                {/* Email Address */}
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5" htmlFor="email">
                    {portalType === 'client' ? 'Pet Parent Email' : 'Staff Email Address'}
                  </label>
                  <div className="relative rounded-lg shadow-2xs">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                        />
                      </svg>
                    </div>
                    <input
                      className="block w-full rounded-lg border border-slate-200 pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-gold-deep focus:ring-1 focus:ring-gold-deep focus:outline-none transition-colors"
                      id="email"
                      name="email"
                      placeholder={portalType === 'client' ? 'sarah.johnson@example.com' : 'Enter your staff email'}
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5" htmlFor="password">
                    Password
                  </label>
                  <div className="relative rounded-lg shadow-2xs">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                        />
                      </svg>
                    </div>
                    <input
                      className="block w-full rounded-lg border border-slate-200 pl-10 pr-10 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-gold-deep focus:ring-1 focus:ring-gold-deep focus:outline-none transition-colors"
                      id="password"
                      name="password"
                      placeholder="Enter your password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      aria-label="Toggle password visibility"
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                        />
                        <path
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      className="w-4 h-4 rounded border-slate-300 text-gold-deep focus:ring-gold-deep focus:ring-offset-0 transition cursor-pointer"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span className="text-slate-600 font-medium">Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => alert('Password reset link sent to ' + (email || 'your email'))}
                    className="font-medium text-gold-deep hover:text-gold-deep hover:underline cursor-pointer"
                  >
                    Forgot your password?
                  </button>
                </div>

                {/* Staff Role Cards: ONLY shown when Staff tab is active */}
                {portalType === 'staff' && (
                  <div className="pt-2">
                    <span className="block text-xs font-semibold text-slate-800 mb-2.5">
                      Select Your Staff Role
                    </span>
                    <div
                      aria-label="Select User Role"
                      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
                      role="radiogroup"
                    >
                      {STAFF_ROLES.map((role) => {
                        const isSelected = selectedStaffRole === role.key;
                        return (
                          <div
                            key={role.key}
                            aria-checked={isSelected}
                            onClick={() => handleStaffRoleSelect(role)}
                            className={`relative flex flex-col items-center text-center p-3 sm:p-3.5 rounded-xl cursor-pointer transition-all ${
                              role.key === 'Marketing' ? 'col-span-2 sm:col-span-1' : ''
                            } ${
                              isSelected
                                ? 'border-2 border-gold-deep bg-gold/10 shadow-2xs'
                                : 'border border-slate-200 bg-white hover:border-slate-300'
                            }`}
                            role="radio"
                            tabIndex={0}
                          >
                            {isSelected && (
                              <div className="absolute top-2 right-2 w-3.5 h-3.5 rounded-full border border-gold-deep flex items-center justify-center">
                                <span className="w-1.5 h-1.5 bg-gold-deep rounded-full" />
                              </div>
                            )}

                            <div className="w-8 h-8 mb-2 flex items-center justify-center text-gold-deep">
                              {role.icon('text-gold-deep')}
                            </div>

                            <h5 className="text-xs font-bold text-slate-900 mb-1 leading-tight">
                              {role.label}
                            </h5>
                            <p className="text-[10px] leading-tight text-slate-500">
                              {role.desc}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Trust Device Checkbox */}
                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs">
                    <input
                      className="w-4 h-4 rounded border-slate-300 text-gold-deep focus:ring-gold-deep focus:ring-offset-0 transition cursor-pointer"
                      type="checkbox"
                      checked={trustDevice}
                      onChange={(e) => setTrustDevice(e.target.checked)}
                    />
                    <span className="text-slate-600 font-medium">Trust this device for 30 days</span>
                  </label>
                </div>

                {/* Submit Sign In Button */}
                <div className="pt-1">
                  <button
                    className="w-full bg-gold-deep hover:bg-ink active:bg-ink text-white font-semibold py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-2 transition duration-150 shadow-2xs cursor-pointer"
                    type="submit"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      />
                    </svg>
                    <span>
                      {portalType === 'client' ? 'Sign In as Pet Parent' : `Sign In as ${selectedStaffRole}`}
                    </span>
                  </button>
                </div>

                {/* Divider */}
                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-white px-3 text-slate-400">or</span>
                  </div>
                </div>

                {/* Quick Google Sign In */}
                <div>
                  <button
                    onClick={handleSignIn}
                    className="w-full border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-semibold py-2.5 px-4 rounded-xl text-sm flex items-center justify-center gap-3 transition duration-150 shadow-2xs cursor-pointer"
                    type="button"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.28 14.27a7.15 7.15 0 010-4.54V6.58H1.25a11.98 11.98 0 000 10.84l4.03-3.15z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.93 6.72-4.93z"
                        fill="#EA4335"
                      />
                    </svg>
                    <span>Sign in with Google</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Footer */}
          <footer className="w-full max-w-[840px] mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
            <div>
              <p>© 2025 All About Pawz. All rights reserved.</p>
            </div>
            <div className="flex items-center gap-4 sm:gap-6">
              <button
                onClick={() => setFooterModal('Privacy Policy')}
                className="hover:text-slate-800 transition-colors cursor-pointer"
              >
                Privacy Policy
              </button>
              <span className="text-slate-300">|</span>
              <button
                onClick={() => setFooterModal('Terms of Service')}
                className="hover:text-slate-800 transition-colors cursor-pointer"
              >
                Terms of Service
              </button>
              <span className="text-slate-300">|</span>
              <button
                onClick={() => setFooterModal('Help Center')}
                className="hover:text-slate-800 transition-colors cursor-pointer"
              >
                Help Center
              </button>
            </div>
          </footer>
        </main>
      </div>

      {/* Footer Modal dialog */}
      {footerModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">{footerModal}</h3>
              <button
                onClick={() => setFooterModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              All About Pawz enforces strict data privacy, veterinary vaccine tracking, and Stripe-certified payment tokenization for all salon operations.
            </p>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setFooterModal(null)}
                className="px-4 py-1.5 bg-gold-deep hover:bg-ink text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
