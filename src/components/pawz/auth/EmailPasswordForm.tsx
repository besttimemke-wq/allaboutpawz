'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import type { AuthUser } from '@/lib/types';

// ============================================================================
// <EmailPasswordForm /> — dumb, presentational.
// Posts credentials + which door was used to /api/auth/login and follows the
// server's verdict. It contains ZERO role-branching: the server resolves the
// role, validates the door, and returns the destination.
// ============================================================================

interface EmailPasswordFormProps {
  portal: 'customer' | 'groomer' | 'frontdesk' | 'admin' | 'lms';
  redirect?: string;
  submitLabel?: string;
}

interface LoginResponse {
  success?: boolean;
  user?: AuthUser;
  redirectTo?: string;
  error?: string;
}

export const EmailPasswordForm: React.FC<EmailPasswordFormProps> = ({
  portal,
  redirect,
  submitLabel = 'Sign In',
}) => {
  const router = useRouter();
  const setUser = useAppStore((s) => s.setUser);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Enter your account email address.');
      return;
    }
    if (!password) {
      setError('Enter your password.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password, portal, redirect }),
      });
      const data: LoginResponse = await res.json();

      if (!res.ok || !data.success || !data.user) {
        setError(data.error || 'Sign-in failed. Please try again.');
        setSubmitting(false);
        return;
      }

      // Hydrate the portal store with the server-resolved identity, then go
      // where the server said to go.
      setUser(data.user);
      router.push(data.redirectTo || '/');
      // isSubmitting stays true while the portal shell swaps in
    } catch (err: any) {
      setError(err?.message || 'Network error — could not reach the sign-in service.');
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-[12.5px] leading-relaxed text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div>
        <label htmlFor={`${portal}-email`} className="mb-1.5 block text-[13px] font-medium text-foreground">
          Email
        </label>
        <input
          id={`${portal}-email`}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-md border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring transition"
        />
      </div>

      <div>
        <label htmlFor={`${portal}-password`} className="mb-1.5 block text-[13px] font-medium text-foreground">
          Password
        </label>
        <div className="relative">
          <input
            id={`${portal}-password`}
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            className="w-full rounded-md border border-input bg-background px-3.5 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring transition"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-primary py-3 text-[13px] font-semibold uppercase tracking-[0.14em] text-primary-foreground shadow-card transition hover:opacity-90 active:opacity-80 disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Signing in…</span>
          </>
        ) : (
          <span>{submitLabel}</span>
        )}
      </button>
    </form>
  );
};
