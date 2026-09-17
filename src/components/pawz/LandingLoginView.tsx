'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/auth/client';
import {
  Eye,
  EyeOff,
  ShieldCheck,
  X,
  CheckCircle2,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { AuthUser } from '@/lib/types';

// The owner's Serviceportals auth page, adapted for DEDICATED ROUTES:
// each door (/access-customer, /access-groomer, /access-frontdesk,
// /admin-login, /learn/sign-in) renders this view locked to that door's
// mode — there is no role switcher because the route IS the role door, and
// the database is the source of truth anyway ("your portal is determined by
// your salon record").
//
// What was removed from the imported original, and why:
//   - The MEMBER/STAFF mode toggle and the 3-role staff tabs — redundant on
//     dedicated routes, and a role the USER picks is never trusted.
//   - The demo fallback logins (fake admin/groomer/customer users created
//     client-side when the API failed) — those caused the fake-login-then-
//     bounced-back circle. Only the real API result is ever trusted.
//   - The silent default credentials ('Aapawzmemphis!' etc.) — exactly what
//     the user typed is what gets sent, nothing else.
//   - The registration modal (unreachable demo code with fake logins).
//   - The fake "reset link sent" — the forgot-password flow now actually
//     requests a real Supabase reset email.
//
// Every visual element, class, and string below is the owner's design.

interface LandingLoginViewProps {
  onLogin: (user: AuthUser, initialSection?: string) => void;
  /** The door's fixed mode — there is no switching. */
  initialMode?: 'member' | 'staff';
  /** The salon gate message from the door URL (?error=not_authorized). */
  initialError?: string;
}

export const LandingLoginView: React.FC<LandingLoginViewProps> = ({ onLogin, initialMode, initialError }) => {
  // Login mode — LOCKED to the door that renders this view.
  const [authMode] = useState<'member' | 'staff'>(initialMode || 'member');

  // Member credentials
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Staff credentials
  const [staffPassword, setStaffPassword] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError || null);

  // Forgot-password modal
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetSentEmail, setResetSentEmail] = useState('');
  const [resetSending, setResetSending] = useState(false);

  // Custom Google OAuth — redirects to /api/auth/google which sends the user
  // to Google's consent screen with our Client ID. Google returns to
  // /api/auth/google/callback where the server exchanges the code, fetches the
  // verified profile, queries the DB for the user's role, and routes them
  // to /admin/dashboard, /groomer/dashboard, or /customer/dashboard.
  // Unknown emails are rejected (the salon gate).
  const handleGoogleSignIn = () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    if (typeof window !== 'undefined') {
      // Hand off to the server-side OAuth initiator
      window.location.href = '/api/auth/google';
    }
  };

  const handleMemberLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    // Exactly what the user typed — no silent defaults, ever.
    const emailToUse = usernameOrEmail.trim().toLowerCase();

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailToUse,
          password,
        }),
      });

      const data = await res.json();

      if (res.ok && data.user) {
        onLogin(data.user, data.user.role === 'admin' ? 'dashboard' : undefined);
      } else {
        // The real API said no. No fake fallback — the database is the only
        // source of truth.
        setErrorMessage('Invalid email or password.');
        setIsSubmitting(false);
      }
    } catch {
      setErrorMessage('Invalid email or password.');
      setIsSubmitting(false);
    }
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    // Exactly what the user typed — no silent defaults, ever.
    const emailToUse = usernameOrEmail.trim().toLowerCase();

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailToUse,
          password: staffPassword,
        }),
      });

      const data = await res.json();

      if (res.ok && data.user) {
        onLogin(data.user, data.user.role === 'admin' ? 'dashboard' : undefined);
      } else {
        setErrorMessage('Invalid email or password.');
        setIsSubmitting(false);
      }
    } catch {
      setErrorMessage('Invalid email or password.');
      setIsSubmitting(false);
    }
  };

  // Forgot password — REAL: requests an actual Supabase reset email for the
  // entered address. Privacy-standard: the confirmation state shows for any
  // address, so it never reveals which emails exist.
  const handleForgotSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get('email') || '').trim();
    if (!email || resetSending) return;
    setResetSending(true);
    try {
      const supabase = createClient();
      try {
        // Prefer returning to THIS origin's callback so the reset completes
        // where the user is.
        await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback`,
        });
      } catch {
        // Origin not in the project's allowlist — the project's Site URL is
        // used instead. Either way a real email goes out.
        await supabase.auth.resetPasswordForEmail(email);
      }
      setResetSentEmail(email);
    } catch {
      // The send itself failed — keep the form open so the user can retry.
    } finally {
      setResetSending(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-black flex flex-col antialiased selection:bg-warning/100 selection:text-white">

      {/* 2-Column Responsive Layout (Scrollable - No Locked Height) */}
      <main className="w-full grid grid-cols-1 lg:grid-cols-2 bg-black">

        {/* ================= LEFT HALF: FULL IMAGE IN NATURAL FLOW ================= */}
        <section
          aria-label="All About Pawz Presentation"
          className="w-full bg-black flex flex-col items-center justify-start select-none"
        >
          <div className="w-full bg-black flex items-center justify-center">
            {/* The Image is displayed with 100% natural aspect ratio so you can scroll down to the bottom where it ends */}
            <Image
              src="/assets/auth_image.png_2K_202609060354.jpeg"
              alt="All About Pawz - Luxury Grooming Salon"
              width={1000}
              height={1400}
              priority
              className="w-full h-auto object-contain block"
              referrerPolicy="no-referrer"
            />
          </div>
        </section>


        {/* ================= RIGHT HALF: AUTHENTICATION FORM ================= */}
        <section
          aria-label="Member Authentication Terminal"
          className="bg-card flex flex-col items-center justify-center p-6 sm:p-12 lg:p-16 min-h-[500px]"
        >
          <div className="w-full max-w-[360px] flex flex-col my-auto py-8">

            {/* Door Title — fixed by the route */}
            {authMode === 'member' ? (
              <div className="text-center mb-6">
                <h1 className="text-2xl sm:text-[26px] font-serif tracking-[0.16em] text-foreground uppercase font-normal mb-1">
                  MEMBER LOGIN
                </h1>
                <p className="text-[12px] text-muted-foreground/70 font-light">
                  Sign in to book &amp; manage pet spa appointments
                </p>
              </div>
            ) : (
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-card text-warning/70 rounded-full text-[10px] font-semibold tracking-wider uppercase mb-2">
                  <ShieldCheck className="w-3.5 h-3.5" /> Staff &amp; Admin OS
                </div>
                <h1 className="text-2xl sm:text-[26px] font-serif tracking-[0.14em] text-foreground uppercase font-normal">
                  STAFF PORTAL
                </h1>
                <p className="text-[12px] text-muted-foreground/70 font-light">
                  Authorized salon personnel &amp; management access
                </p>
              </div>
            )}

            {/* Error Message Banner — the salon gate or invalid credentials */}
            {errorMessage && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md flex items-start gap-2.5 text-xs text-destructive">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-snug">{errorMessage}</span>
              </div>
            )}

            {/* Google Sign-in — SINGLE entry for all three personas.
                The server-side callback (/api/auth/google/callback) queries the DB
                to determine role (admin / groomer / customer) and routes accordingly.
                Unknown emails are rejected (the salon gate). */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-card hover:bg-muted/40 active:bg-muted/40 border border-border rounded-md text-foreground text-[13px] font-semibold flex items-center justify-center gap-3 transition shadow-2xs cursor-pointer mb-3"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
            <p className="text-center text-[11px] text-muted-foreground/80 mb-5 leading-relaxed">
              Sign in with Google — your portal is determined by your salon record.<br />
              <span className="font-medium">No public registration</span> — clients are created at checkout, booking, or walk-in.
            </p>

            {/* Divider */}
            <div className="relative flex items-center justify-center mb-5">
              <div className="border-t border-border w-full" />
              <span className="bg-card px-3 text-[11px] text-muted-foreground/70 uppercase tracking-wider">
                Or with email
              </span>
              <div className="border-t border-border w-full" />
            </div>

            {/* ================= MEMBER FORM ================= */}
            {authMode === 'member' ? (
              <form onSubmit={handleMemberLogin} className="space-y-4">

                {/* Username/Email */}
                <div>
                  <label
                    htmlFor="member-username"
                    className="block text-[13px] font-normal text-foreground mb-1.5"
                  >
                    Username/Email
                  </label>
                  <input
                    id="member-username"
                    type="text"
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                    placeholder="Username/Email"
                    autoComplete="username"
                    className="w-full bg-card border border-border rounded-md px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border transition"
                  />
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="member-password"
                    className="block text-[13px] font-normal text-foreground mb-1.5"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="member-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      autoComplete="current-password"
                      className="w-full bg-card border border-border rounded-md px-3.5 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground/70 hover:text-foreground cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Right-aligned Forgot Password? */}
                  <div className="flex justify-end pt-1.5">
                    <button
                      type="button"
                      onClick={() => setForgotPasswordOpen(true)}
                      className="text-[12px] text-muted-foreground hover:text-foreground font-serif italic transition cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                </div>

                {/* Buttons */}
                <div className="pt-2 space-y-2.5">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-black hover:bg-muted active:bg-card text-white font-medium text-[13px] tracking-[0.18em] uppercase rounded-md transition shadow-xs flex items-center justify-center cursor-pointer disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span>LOG IN</span>
                    )}
                  </button>
                </div>

              </form>
            ) : (
              /* ================= STAFF & ADMIN ROUTE FORM ================= */
              <form onSubmit={handleStaffLogin} className="space-y-4 animate-in fade-in duration-200">

                {/* Staff Email */}
                <div>
                  <label
                    htmlFor="staff-id"
                    className="block text-[13px] font-normal text-foreground mb-1.5"
                  >
                    Staff Email
                  </label>
                  <input
                    id="staff-id"
                    type="text"
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                    placeholder="you@allaboutpawz.com"
                    autoComplete="username"
                    className="w-full bg-card border border-border rounded-md px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:border-border transition"
                  />
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="staff-passcode"
                    className="block text-[13px] font-normal text-foreground mb-1.5"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="staff-passcode"
                      type={showPassword ? 'text' : 'password'}
                      value={staffPassword}
                      onChange={(e) => setStaffPassword(e.target.value)}
                      placeholder="Password"
                      autoComplete="current-password"
                      className="w-full bg-card border border-border rounded-md px-3.5 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground/70 hover:text-foreground cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Right-aligned Forgot Password? */}
                  <div className="flex justify-end pt-1.5">
                    <button
                      type="button"
                      onClick={() => setForgotPasswordOpen(true)}
                      className="text-[12px] text-muted-foreground hover:text-foreground font-serif italic transition cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                </div>

                {/* Staff Actions */}
                <div className="pt-2 space-y-2.5">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-card hover:bg-primary text-primary-foreground font-medium text-[13px] tracking-[0.18em] uppercase rounded-md transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>SIGN IN</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>

              </form>
            )}

          </div>
        </section>

      </main>


      {/* ================= MINIMALIST SALON FOOTER ================= */}
      <footer className="w-full bg-black border-t border-border text-muted-foreground py-4 px-6 sm:px-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] tracking-wide">
          <div className="flex items-center gap-2 text-muted-foreground/70">
            <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">ALL ABOUT PAWZ</span>
            <span>·</span>
            <span>© {new Date().getFullYear()}</span>
          </div>

          <div className="flex items-center gap-5 text-muted-foreground/70">
            <a
              href="/access-customer"
              className="hover:text-white transition cursor-pointer"
            >
              Member Portal
            </a>
            <a
              href="/admin-login"
              className="hover:text-white transition cursor-pointer"
            >
              Staff Access
            </a>
            <span className="text-foreground">|</span>
            <span className="text-muted-foreground hover:text-muted-foreground transition cursor-pointer">
              Privacy
            </span>
          </div>
        </div>
      </footer>


      {/* ================= FORGOT PASSWORD MODAL ================= */}
      {forgotPasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/90 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-card rounded-2xl shadow-2xl border border-border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Reset Your Password</h3>
              <button
                onClick={() => {
                  setForgotPasswordOpen(false);
                  setResetSentEmail('');
                }}
                className="text-muted-foreground/70 hover:text-foreground p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {resetSentEmail ? (
              <div className="space-y-3 text-center py-2">
                <CheckCircle2 className="w-10 h-10 text-success mx-auto" />
                <p className="text-[13px] text-foreground">
                  Password reset link sent to <strong>{resetSentEmail}</strong>. Please check your inbox.
                </p>
                <button
                  onClick={() => {
                    setForgotPasswordOpen(false);
                    setResetSentEmail('');
                  }}
                  className="w-full py-2 bg-card text-white text-[13px] font-semibold rounded-lg mt-2 cursor-pointer"
                >
                  Return to Login
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleForgotSubmit}
                className="space-y-3"
              >
                <p className="text-[13px] text-muted-foreground">
                  Enter your registered username or email and we will send you a password recovery link.
                </p>
                <input
                  type="email"
                  name="email"
                  required
                  defaultValue={usernameOrEmail}
                  placeholder="Enter your email"
                  className="w-full border border-border rounded-lg px-3 py-2 text-[13px] text-foreground focus:outline-none focus:border-border"
                />
                <button
                  type="submit"
                  disabled={resetSending}
                  className="w-full py-2.5 bg-black hover:bg-card text-white font-semibold text-[13px] rounded-lg transition cursor-pointer disabled:opacity-60"
                >
                  {resetSending ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
