'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/auth/client';

// ============================================================================
// /auth/callback — the landing route for every Supabase auth email link
// (invitation, email confirmation, password reset).
//
// Email links arrive in two shapes, and this page handles both:
//
//   1. ?code=…            — PKCE links initiated from a browser session
//                           (the "Forgot your password?" flow on a door).
//                           The verifier lives in a cookie, so the SERVER
//                           exchanges the code (via /api/auth/email-link).
//
//   2. #access_token=…    — links generated from the Supabase dashboard
//                           ("Invite user" / "Send password reset") carry the
//                           tokens directly in the URL hash. A server route
//                           can never see a hash, so the page installs the
//                           session client-side first, then asks the server
//                           to finalize.
//
// In both cases the server then resolves who landed (single source of
// truth), issues the portal session cookie, and tells this page where to
// go next: /auth/set-password, then the user's portal.
// ============================================================================

type Phase = 'working' | 'error';

export default function AuthCallbackPage() {
  const router = useRouter();
  const started = useRef(false);
  const [phase, setPhase] = useState<Phase>('working');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return; // strict double-invoke guard
    started.current = true;

    (async () => {
      try {
        const supabase = createClient();

        // --- Hash tokens (dashboard-generated invite / reset links) ---
        const hash = window.location.hash.startsWith('#')
          ? window.location.hash.slice(1)
          : '';
        if (hash) {
          const hashParams = new URLSearchParams(hash);
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          if (accessToken && refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (sessionError) {
              setPhase('error');
              setMessage('This sign-in link is invalid or has expired. Please try again.');
              return;
            }
            // Scrub the tokens from the address bar.
            window.history.replaceState(null, '', window.location.pathname);
          }
        }

        // --- Ask the server to finalize (code exchange when ?code= is
        //     present; otherwise it reads the session just installed) ---
        const code = new URLSearchParams(window.location.search).get('code');
        const res = await fetch(
          code ? `/api/auth/email-link?code=${encodeURIComponent(code)}` : '/api/auth/email-link',
          { method: 'POST' },
        );
        const data = await res.json().catch(() => ({}));

        if (res.ok && data?.next && typeof data.next === 'string') {
          router.replace(data.next);
          return;
        }

        setPhase('error');
        setMessage(
          data?.error ||
            'This sign-in link is invalid or has expired. Please try again.',
        );
      } catch (err) {
        setPhase('error');
        setMessage('Could not complete sign-in from this link. Please try again.');
      }
    })();
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-slate-800 antialiased bg-[#f8f9fc] px-4 py-10">
      <div className="w-full max-w-md text-center">
        <div className="flex flex-col items-center space-y-3 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gold-deep flex items-center justify-center text-white shadow-lg shadow-gold/40">
            <svg className="w-8 h-8 fill-white" viewBox="0 0 24 24">
              <path d="M12 2C11.17 2 10.5 2.67 10.5 3.5C10.5 4.33 11.17 5 12 5C12.83 5 13.5 4.33 13.5 3.5C13.5 2.67 12.83 2 12 2ZM8 4.5C7.17 4.5 6.5 5.17 6.5 6C6.5 6.83 7.17 7.5 8 7.5C8.83 7.5 9.5 6.83 9.5 6C9.5 5.17 8.83 4.5 8 4.5ZM16 4.5C15.17 4.5 14.5 5.17 14.5 6C14.5 6.83 15.17 7.5 16 7.5C16.83 7.5 17.5 6.83 17.5 6C17.5 5.17 16.83 4.5 16 4.5ZM5.5 8.5C4.67 8.5 4 9.17 4 10C4 10.83 4.67 11.5 5.5 11.5C6.33 11.5 7 10.83 7 10C7 9.17 6.33 8.5 5.5 8.5ZM18.5 8.5C17.67 8.5 17 9.17 17 10C17 10.83 17.67 11.5 18.5 11.5C19.33 11.5 20 10.83 20 10C20 9.17 19.33 8.5 18.5 8.5ZM12 7C9.5 7 7 9.5 7 12.5C7 15 8.5 17.5 10 19C10.5 19.5 11.2 20 12 20C12.8 20 13.5 19.5 14 19C15.5 17.5 17 15 17 12.5C17 9.5 14.5 7 12 7Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
            All About <span className="text-gold-deep">Pawz</span>
          </h1>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-[0_10px_35px_-4px_rgba(0,0,0,0.04)] border border-slate-100 space-y-4">
          {phase === 'working' ? (
            <>
              <div
                className="w-8 h-8 mx-auto rounded-full border-2 border-slate-200 border-t-gold-deep animate-spin"
                role="status"
                aria-label="Signing in"
              />
              <p className="text-sm text-slate-500">Completing sign-in…</p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-slate-900">This link didn&apos;t work</h2>
              <p className="text-xs text-slate-500 leading-relaxed">{message}</p>
              <Link
                href="/access-customer"
                className="inline-block px-5 py-2.5 bg-gold-deep hover:bg-ink text-white rounded-xl text-sm font-semibold transition"
              >
                Back to sign-in
              </Link>
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
