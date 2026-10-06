'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/auth/client';

// ============================================================================
// /auth/set-password — the second half of every Supabase auth email link.
// An invited user (account created by the owner in Supabase) lands here with
// a live session and no password; a reset user lands here to choose a new
// one. Both set the password, then continue to the portal the server
// resolved for them (?next=).
// ============================================================================

function SetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next') || '/customer/dashboard';
  const next =
    nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/customer/dashboard';

  const supabase = createClient();

  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [accountEmail, setAccountEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // If we landed here from a recovery/invite email, the URL has a
        // ?code= parameter (PKCE flow). Exchange it for a session FIRST so
        // the user can then set their password.
        const code = searchParams.get('code');
        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        }
        const { data } = await supabase.auth.getSession();
        if (!cancelled) {
          setHasSession(Boolean(data?.session));
          setAccountEmail(data?.session?.user?.email || '');
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Choose a password with at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message || 'Could not save the password. Please try again.');
        setSubmitting(false);
        return;
      }
      setDone(true);
      // Give the confirmation a beat, then continue to the portal.
      setTimeout(() => router.replace(next), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the password. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-slate-800 antialiased bg-[#f8f9fc] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center space-y-3 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gold-deep flex items-center justify-center text-white shadow-lg shadow-gold/40">
            <svg className="w-8 h-8 fill-white" viewBox="0 0 24 24">
              <path d="M12 2C11.17 2 10.5 2.67 10.5 3.5C10.5 4.33 11.17 5 12 5C12.83 5 13.5 4.33 13.5 3.5C13.5 2.67 12.83 2 12 2ZM8 4.5C7.17 4.5 6.5 5.17 6.5 6C6.5 6.83 7.17 7.5 8 7.5C8.83 7.5 9.5 6.83 9.5 6C9.5 5.17 8.83 4.5 8 4.5ZM16 4.5C15.17 4.5 14.5 5.17 14.5 6C14.5 6.83 15.17 7.5 16 7.5C16.83 7.5 17.5 6.83 17.5 6C17.5 5.17 16.83 4.5 16 4.5ZM5.5 8.5C4.67 8.5 4 9.17 4 10C4 10.83 4.67 11.5 5.5 11.5C6.33 11.5 7 10.83 7 10C7 9.17 6.33 8.5 5.5 8.5ZM18.5 8.5C17.67 8.5 17 9.17 17 10C17 10.83 17.67 11.5 18.5 11.5C19.33 11.5 20 10.83 20 10C20 9.17 19.33 8.5 18.5 8.5ZM12 7C9.5 7 7 9.5 7 12.5C7 15 8.5 17.5 10 19C10.5 19.5 11.2 20 12 20C12.8 20 13.5 19.5 14 19C15.5 17.5 17 15 17 12.5C17 9.5 14.5 7 12 7Z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
              All About <span className="text-gold-deep">Pawz</span>
            </h1>
            <span className="inline-block mt-1.5 text-xs font-extrabold text-gold-deep tracking-widest uppercase">
              Salon &amp; Pet Parent Platform
            </span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-[0_10px_35px_-4px_rgba(0,0,0,0.04)] border border-slate-100">
          {checking ? (
            <p className="text-center text-sm text-slate-500 py-6">Checking your sign-in link…</p>
          ) : !hasSession ? (
            <div className="space-y-4 text-center">
              <h2 className="text-xl font-bold text-slate-900">This link has expired</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Sign-in links can only be used once and expire after an hour. Ask for a new
                invitation or reset your password again from the sign-in page.
              </p>
              <Link
                href="/access-customer"
                className="inline-block px-5 py-2.5 bg-gold-deep hover:bg-ink text-white rounded-xl text-sm font-semibold transition"
              >
                Back to sign-in
              </Link>
            </div>
          ) : done ? (
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-900">Password saved</h2>
              <p className="text-xs text-slate-500">Taking you to your portal…</p>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-1.5">
                  Set your password
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  {accountEmail ? (
                    <>
                      Signing in as <span className="font-semibold text-slate-700">{accountEmail}</span>.
                      Choose a password to finish.
                    </>
                  ) : (
                    'Choose a password to finish signing in.'
                  )}
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 leading-relaxed"
                >
                  <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5" htmlFor="new-password">
                    New password
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
                      id="new-password"
                      name="new-password"
                      placeholder="At least 8 characters"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      autoComplete="new-password"
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
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

                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5" htmlFor="confirm-password">
                    Confirm password
                  </label>
                  <div className="relative rounded-lg shadow-2xs">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                        />
                      </svg>
                    </div>
                    <input
                      className="block w-full rounded-lg border border-slate-200 pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-gold-deep focus:ring-1 focus:ring-gold-deep focus:outline-none transition-colors"
                      id="confirm-password"
                      name="confirm-password"
                      placeholder="Re-enter your password"
                      type={showPassword ? 'text' : 'password'}
                      value={confirm}
                      autoComplete="new-password"
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                      minLength={8}
                    />
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    className="w-full bg-gold-deep hover:bg-ink active:bg-ink text-white font-semibold py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-2 transition duration-150 shadow-2xs cursor-pointer disabled:opacity-60"
                    type="submit"
                    disabled={submitting}
                  >
                    <span>{submitting ? 'Saving…' : 'Save password & continue'}</span>
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-[10px] text-slate-400">
          © 2025 All About Pawz. All rights reserved.
        </p>
      </div>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense>
      <SetPasswordContent />
    </Suspense>
  );
}
