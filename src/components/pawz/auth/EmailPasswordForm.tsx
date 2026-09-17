'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, X, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { createClient } from '@/lib/auth/client';
import type { PortalId } from '@/lib/pawz-auth';

// ============================================================================
// EmailPasswordForm — DUMB, presentational (owner's spec §5). It sends
// exactly what the user typed plus which door it sits on: the /api/auth/login
// server route resolves the role from the salon records and validates the
// door server-side — the client never decides who anyone is.
//
// The server's redirectTo is the single routing answer (role-resolved
// destination, or the door's destination, or the same-site ?redirect=
// override the server already validated).
// ============================================================================

interface EmailPasswordFormProps {
  portal: PortalId;
  submitLabel?: string;
  /** Same-site ?redirect= from the door URL — passed through to the server,
   *  which re-validates it (path-relative only). */
  redirectTo?: string;
  initialError?: string | null;
  emailLabel?: string;
  placeholder?: string;
}

export function EmailPasswordForm({
  portal,
  submitLabel = 'LOG IN',
  redirectTo,
  initialError = null,
  emailLabel = 'Email',
  placeholder,
}: EmailPasswordFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          portal,
          ...(redirectTo ? { redirect: redirectTo } : {}),
        }),
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.user) {
        useAppStore.getState().setUser(data.user);
        const dest: string =
          typeof data.redirectTo === 'string' && data.redirectTo.startsWith('/')
            ? data.redirectTo
            : '/';
        router.push(dest);
        return; // navigating — keep the spinner up
      }

      setErrorMessage(data?.error || 'Invalid email or password.');
      setIsSubmitting(false);
    } catch {
      setErrorMessage('Invalid email or password.');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Email */}
      <div>
        <label htmlFor={`door-email-${portal}`} className="block text-[13px] font-normal text-foreground mb-1.5">
          {emailLabel}
        </label>
        <input
          id={`door-email-${portal}`}
          type="text"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={placeholder || 'you@example.com'}
          autoComplete="username"
          className="w-full bg-card border border-border rounded-md px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border transition"
        />
      </div>

      {/* Password */}
      <div>
        <label htmlFor={`door-password-${portal}`} className="block text-[13px] font-normal text-foreground mb-1.5">
          Password
        </label>
        <div className="relative">
          <input
            id={`door-password-${portal}`}
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
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex justify-end pt-1.5">
          <ForgotPasswordLink defaultEmail={email} />
        </div>
      </div>

      {/* Error banner (server answer or initial ?error= gate message) */}
      {errorMessage && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md flex items-start gap-2.5 text-xs text-destructive">
          <AlertCircle />
          <span className="leading-snug">{errorMessage}</span>
        </div>
      )}

      {/* Submit */}
      <div className="pt-2 space-y-2.5">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 bg-black hover:bg-muted active:bg-card text-white font-medium text-[13px] tracking-[0.18em] uppercase rounded-md transition shadow-xs flex items-center justify-center cursor-pointer disabled:opacity-60"
        >
          {isSubmitting ? (
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <span>{submitLabel}</span>
          )}
        </button>
      </div>
    </form>
  );
}

function AlertCircle() {
  return (
    <svg
      className="w-4 h-4 shrink-0 mt-0.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Forgot password — REAL: requests an actual Supabase reset email. The
// confirmation state shows for any address so it never reveals which emails
// exist. Self-contained: trigger link + modal.
// ---------------------------------------------------------------------------
function ForgotPasswordLink({ defaultEmail }: { defaultEmail: string }) {
  const [open, setOpen] = useState(false);
  const [sentEmail, setSentEmail] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get('email') || '').trim();
    if (!email || sending) return;
    setSending(true);
    try {
      const supabase = createClient();
      try {
        await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback`,
        });
      } catch {
        await supabase.auth.resetPasswordForEmail(email);
      }
      setSentEmail(email);
    } catch {
      // keep the form open so the user can retry
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[12px] text-muted-foreground hover:text-foreground font-serif italic transition cursor-pointer"
      >
        Forgot Password?
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/90 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-card rounded-2xl shadow-2xl border border-border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Reset Your Password</h3>
              <button
                onClick={() => {
                  setOpen(false);
                  setSentEmail('');
                }}
                className="text-muted-foreground/70 hover:text-foreground p-1 rounded-lg"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {sentEmail ? (
              <div className="space-y-3 text-center py-2">
                <CheckCircle2 className="w-10 h-10 text-success mx-auto" />
                <p className="text-[13px] text-foreground">
                  Password reset link sent to <strong>{sentEmail}</strong>. Please check your inbox.
                </p>
                <button
                  onClick={() => {
                    setOpen(false);
                    setSentEmail('');
                  }}
                  className="w-full py-2 bg-card text-white text-[13px] font-semibold rounded-lg mt-2 cursor-pointer"
                >
                  Return to Login
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-3">
                <p className="text-[13px] text-muted-foreground">
                  Enter your registered email and we will send you a password recovery link.
                </p>
                <input
                  type="email"
                  name="email"
                  required
                  defaultValue={defaultEmail}
                  placeholder="Enter your email"
                  className="w-full border border-border rounded-lg px-3 py-2 text-[13px] text-foreground focus:outline-none focus:border-border"
                />
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full py-2.5 bg-black hover:bg-card text-white font-semibold text-[13px] rounded-lg transition cursor-pointer disabled:opacity-60"
                >
                  {sending ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
