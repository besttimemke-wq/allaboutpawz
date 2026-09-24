'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LeashedLogo } from './LeashedLogo';
import { Search, X, Lock, ArrowRight, UserCheck } from 'lucide-react';

export const ROUTE_MAP: Record<string, string> = {
  Courses: '/',
  Enroll: '/enroll',
};

interface NavbarProps {
  activeNav?: string;
  onSearchClick?: () => void;
}

export function Navbar({
  onSearchClick,
}: NavbarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState('leashed901@gmail.com');
  const [loginLoading, setLoginLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail }),
      });
      router.push('/learn/classroom');
    } catch {
      router.push('/learn/classroom');
    } finally {
      setLoginLoading(false);
      setLoginModalOpen(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'google', email: 'google.learner@leashed.edu' }),
      });
      router.push('/learn/classroom');
    } catch {
      router.push('/learn/classroom');
    } finally {
      setGoogleLoading(false);
      setLoginModalOpen(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-[#131b15] border-b border-[#223026]/80 text-white select-none">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Brand Logo - Navigates Home (Courses) */}
          <Link
            href="/"
            className="focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9b589] rounded-lg shrink-0"
            aria-label="Leashed Academy Home"
          >
            <LeashedLogo variant="light" size="md" />
          </Link>

          {/* Right Header Navigation: Log In & Get Started */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Search Trigger or Input */}
            {searchOpen ? (
              <div className="relative flex items-center animate-in fade-in zoom-in-95 duration-150">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search courses..."
                  autoFocus
                  className="bg-[#1e2a21] border border-[#334637] text-white text-xs rounded-full pl-3 pr-8 py-2 w-40 sm:w-56 focus:outline-none focus:border-[#d9b589]"
                />
                <button
                  onClick={() => {
                    setSearchOpen(false);
                    setSearchQuery('');
                  }}
                  className="absolute right-2.5 text-[#a1b3a6] hover:text-white"
                  aria-label="Close search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setSearchOpen(true);
                  onSearchClick?.();
                }}
                className="p-2 text-[#bcc9c0] hover:text-white transition-colors rounded-full hover:bg-[#1f2c22] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9b589]"
                aria-label="Search courses"
              >
                <Search className="w-4 h-4" />
              </button>
            )}

            {/* Log In Link -> /sign-in */}
            <Link
              href="/learn/sign-in"
              className="text-[#d5e0d8] hover:text-white font-medium text-xs sm:text-sm px-3.5 py-2 rounded-full hover:bg-white/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9b589]"
              aria-label="Learner Sign In"
            >
              Sign In
            </Link>

            {/* Get Started / Enroll CTA Button */}
            <Link
              href="/learn/enroll"
              className="inline-flex items-center justify-center font-sans font-semibold rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9b589] bg-[#e4cfb2] hover:bg-[#ebd9c1] text-[#141b16] px-5 sm:px-6 py-2 sm:py-2.5 text-xs font-bold tracking-wide shadow-sm"
              aria-label="Get Started with Enrollment"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Enrolled Learner Log In Modal */}
      {loginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#18231c] text-white border border-[#2b3c2f] rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative animate-in zoom-in-95 duration-150">
            <button
              onClick={() => setLoginModalOpen(false)}
              aria-label="Close login modal"
              className="absolute top-4 right-4 text-[#8ea093] hover:text-white text-xl font-bold w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              ×
            </button>

            <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-[#d9b589] uppercase mb-2">
              <Lock className="w-3.5 h-3.5" />
              <span>Learner Portal</span>
            </div>

            <h2 className="font-serif text-2xl font-bold text-white mb-2">
              Welcome Back
            </h2>
            <p className="text-xs text-[#a9baa9] leading-relaxed mb-6">
              Sign in to your account to continue your learning journey.
            </p>

            {/* Google Sign-in in modal */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="w-full py-2.5 px-4 mb-4 rounded-xl bg-white hover:bg-gray-100 text-[#1f2937] font-semibold text-xs transition-all duration-150 flex items-center justify-center gap-2.5 shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="relative my-4 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#2d3f32]" />
              </div>
              <span className="relative px-2 bg-[#18231c] text-[10px] text-[#788e7f] font-bold uppercase tracking-wider">
                or
              </span>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#c4d4c8] mb-1.5">
                  Student Email or Learner ID
                </label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-[#111913] border border-[#2d3f32] focus:border-[#d9b589] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#55695a] focus:outline-none transition-colors"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full py-3 px-6 rounded-xl bg-[#e4cfb2] hover:bg-[#ebd9c1] text-[#141b16] font-bold text-sm transition-all duration-150 flex items-center justify-center gap-2 shadow-sm disabled:opacity-60"
                >
                  {loginLoading ? (
                    <span>Entering Classroom...</span>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4" />
                      <span>Log In to Classroom</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6 pt-4 border-t border-[#243328] text-center">
              <p className="text-xs text-[#8ea093]">
                New student?{' '}
                <Link
                  href="/learn/enroll"
                  onClick={() => setLoginModalOpen(false)}
                  className="text-[#d9b589] hover:underline font-semibold inline-flex items-center gap-1"
                >
                  <span>Start the 8-step enrollment process</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
