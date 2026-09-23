'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  GraduationCap,
  PawPrint,
  Laptop,
  Heart,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Headphones,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { LeashedLogo } from './LeashedLogo';

export function SignInView() {
  const router = useRouter();
  const [email, setEmail] = useState('you@example.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'credentials',
          email: email || 'student@leashed.edu',
          password,
        }),
      });

      if (res.ok) {
        router.push('/learn/classroom');
      } else {
        const data = await res.json();
        setErrorMessage(data.error || 'Authentication failed. Please try again.');
      }
    } catch {
      router.push('/learn/classroom');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setErrorMessage('');

    try {
      // Use the REAL Google OAuth flow (same as admin/customer portals).
      // POST /api/auth with provider:'google' returns a redirect URL to
      // accounts.google.com. The browser follows it, Google authenticates
      // the user, and the callback lands them in the LMS portal.
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'google',
          portal: 'lms',
        }),
      });

      const data = await res.json().catch(() => null);
      if (data?.url) {
        // Real Google OAuth — redirect to accounts.google.com
        window.location.href = data.url;
        return;
      }

      // Fallback: if the API didn't return a URL, go to the classroom
      // (the /api/auth route may have created a demo session).
      router.push('/learn/classroom');
    } catch {
      setErrorMessage('Could not start Google sign-in. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#ffffff] text-[#1a2e22]">
      {/* ─── LEFT COLUMN: Brand Hero & 4 Value Pillars ─── */}
      <div className="relative w-full lg:w-[50%] xl:w-[48%] min-h-[500px] lg:min-h-screen bg-[#0e1610] text-white flex flex-col justify-between p-8 sm:p-12 lg:p-16 overflow-hidden">
        {/* Background Image with Dark Vignette Overlay */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/pets_caregiver.jpg"
            alt="Leashed animal care professional with dog and cat"
            fill
            className="object-cover object-center brightness-[0.78] contrast-[1.05]"
            priority
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#09110b] via-[#09110b]/55 to-[#09110b]/70" />
        </div>

        {/* Top Logo */}
        <div className="relative z-10">
          <Link href="/" className="inline-block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e4cfb2] rounded-lg">
            <LeashedLogo variant="light" size="lg" />
          </Link>
        </div>

        {/* Middle Hero Content */}
        <div className="relative z-10 my-auto py-12 max-w-xl">
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.12] mb-6">
            Learn Today.
            <br />
            Build Tomorrow.
          </h1>
          <p className="text-base sm:text-lg text-[#d3ded5] leading-relaxed max-w-lg font-sans">
            Access your courses, track your progress, and become the skilled professional animals and families can count on.
          </p>
        </div>

        {/* Bottom 4 Feature Pillars */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 pt-6 border-t border-white/15">
          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-2 text-[#e4cfb2]">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-[#e1ece4] leading-tight">
              Expert-Led
              <br />
              Training
            </span>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-2 text-[#e4cfb2]">
              <PawPrint className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-[#e1ece4] leading-tight">
              Hands-On
              <br />
              Skills
            </span>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-2 text-[#e4cfb2]">
              <Laptop className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-[#e1ece4] leading-tight">
              Flexible
              <br />
              Learning
            </span>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-2 text-[#e4cfb2]">
              <Heart className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-[#e1ece4] leading-tight">
              Support
              <br />
              When You Need It
            </span>
          </div>
        </div>
      </div>

      {/* ─── RIGHT COLUMN: Sign In Form & Google Auth ─── */}
      <div className="w-full lg:w-[50%] xl:w-[52%] flex flex-col justify-between p-6 sm:p-12 lg:p-16 bg-[#ffffff]">
        {/* Top Right Help Link */}
        <div className="flex justify-end items-center">
          <a
            href="mailto:leashed901@gmail.com?subject=LEASHED%20Learner%20Help%20Request"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#2b4c39] hover:text-[#183324] transition-colors"
          >
            <Headphones className="w-4 h-4" />
            <span>Need Help?</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Center Container */}
        <div className="max-w-[460px] w-full mx-auto my-auto py-8">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <LeashedLogo variant="dark" size="lg" />
          </div>

          {/* Heading */}
          <div className="text-center mb-8">
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#14281c] mb-2">
              Welcome Back
            </h2>
            <p className="text-sm text-[#576b5e] leading-relaxed">
              Sign in to your account to continue your learning journey.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
              {errorMessage}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold text-[#23382b] mb-1.5">
                Email Address
              </label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 w-4 h-4 text-[#798e80]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-[#f8faf8] border border-[#d6ded8] rounded-xl text-sm text-[#14281c] placeholder-[#8ea093] focus:bg-white focus:outline-none focus:border-[#234b35] focus:ring-2 focus:ring-[#234b35]/15 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-[#23382b] mb-1.5">
                Password
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 w-4 h-4 text-[#798e80]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-11 py-3 bg-[#f8faf8] border border-[#d6ded8] rounded-xl text-sm text-[#14281c] placeholder-[#8ea093] focus:bg-white focus:outline-none focus:border-[#234b35] focus:ring-2 focus:ring-[#234b35]/15 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-[#798e80] hover:text-[#23382b] transition-colors focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember me & Forgot password */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[#bdccc0] text-[#1b3d2b] focus:ring-[#1b3d2b] accent-[#1b3d2b]"
                />
                <span className="text-xs font-medium text-[#405448]">Remember me</span>
              </label>

              <button
                type="button"
                onClick={() => alert('Password reset instructions will be sent to ' + email)}
                className="text-xs font-medium text-[#405448] hover:text-[#183324] hover:underline"
              >
                Forgot your password?
              </button>
            </div>

            {/* Primary Sign In Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-6 rounded-xl bg-[#1b3d2b] hover:bg-[#142e20] text-white font-bold text-sm tracking-wide transition-all duration-150 flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 cursor-pointer"
              >
                {isLoading ? (
                  <span>Signing In...</span>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Divider: or */}
          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#e1e8e3]" />
            </div>
            <span className="relative px-3 bg-white text-xs text-[#7d9183] font-medium uppercase tracking-wider">
              or
            </span>
          </div>

          {/* Google Auth Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
            className="w-full py-3 px-4 rounded-xl border border-[#d2dbd4] hover:border-[#b8c5bb] bg-[#ffffff] hover:bg-[#f7faf8] text-[#243a2c] font-semibold text-sm transition-all duration-150 flex items-center justify-center gap-3 shadow-xs disabled:opacity-60 cursor-pointer"
          >
            {isGoogleLoading ? (
              <span className="text-xs text-[#576b5e]">Connecting to Google...</span>
            ) : (
              <>
                {/* Official Google G SVG Icon */}
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* Create Account Link */}
          <div className="mt-6 text-center">
            <p className="text-xs text-[#5c7063]">
              Don&apos;t have an account?{' '}
              <Link
                href="/learn/enroll"
                className="text-[#1b3d2b] font-bold hover:underline inline-flex items-center gap-1 ml-0.5"
              >
                <span>Create your account</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </p>
          </div>
        </div>

        {/* Bottom Trust Badge */}
        <div className="pt-6 border-t border-[#eef3f0] flex items-center justify-center gap-2 text-center text-xs text-[#708477]">
          <ShieldCheck className="w-4 h-4 text-[#386b4e] shrink-0" />
          <span>Your data is safe with us. We use industry-leading security to protect your information.</span>
        </div>
      </div>
    </div>
  );
}
