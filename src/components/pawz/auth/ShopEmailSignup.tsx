'use client';

import { useState } from 'react';

// ============================================================================
// ShopEmailSignup — the checkout-flow registration path on the customer door.
//
// The owner's model: "clients are created at checkout, booking, or walk-in."
// Booking had its email door (booking-signup → magic link); the shop did not,
// so a new customer could not sign up anywhere and the session-gated Stripe
// checkout was unreachable. This panel completes the flow: enter your email,
// we create the client record NOW and email a one-tap sign-in link that
// lands back exactly where the visitor was (the bag by default).
// ============================================================================

export function ShopEmailSignup({ redirect }: { redirect?: string }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/shop-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), ...(redirect ? { redirect } : {}) }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || 'Could not send the sign-in email. Please try again.');
        return;
      }
      setSentTo(email.trim().toLowerCase());
      setEmail('');
    } catch {
      setError('Could not send the sign-in email. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (sentTo) {
    return (
      <div className="space-y-2" aria-live="polite">
        <p className="text-[13px] font-medium text-foreground">
          Check your inbox — your sign-in link is on its way to {sentTo}.
        </p>
        <p className="text-[12px] text-muted-foreground">
          One tap signs you in and drops you right back where you were — your bag is
          exactly as you left it.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" aria-label="New customer sign-up">
      <p className="text-[13px] text-muted-foreground">
        New here? Enter your email and we&apos;ll send you a one-tap sign-in link —
        your account is created the moment you order, and your bag comes with you.
      </p>
      <div>
        <label htmlFor="shop-signup-email" className="block text-[13px] font-normal text-foreground mb-1.5">
          Email
        </label>
        <input
          id="shop-signup-email"
          type="text"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          className="w-full bg-card border border-border rounded-md px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border transition"
        />
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md flex items-start gap-2.5 text-xs text-destructive">
          <span aria-hidden>⚠</span>
          <span className="leading-snug">{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full py-3 bg-black hover:bg-muted active:bg-card text-white font-medium text-[13px] tracking-[0.18em] uppercase rounded-md transition shadow-xs flex items-center justify-center cursor-pointer disabled:opacity-60"
      >
        {busy ? (
          <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <span>Email me a sign-in link</span>
        )}
      </button>
    </form>
  );
}
