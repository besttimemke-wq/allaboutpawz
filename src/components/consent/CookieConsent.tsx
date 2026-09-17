"use client";

// ---------------------------------------------------------------------------
// All About Pawz — Cookie Consent UI.
//
//   • ConsentBanner — appears on load when the visitor has no stored choice
//     (screenshot 1): "We Value Your Privacy & Tailored Care" with three
//     actions — Customize Preferences / Reject Non-Essential / Accept All.
//   • ConsentCenter — the "Consent Management Center" dialog (screenshot 2)
//     with three granular categories, locked-essential toggle, key-token
//     metadata rows, jurisdiction bar and Save Custom Choices.
//
// Both share one persistence layer (src/lib/consent.ts): a single
// `pawz_cookie_consent` cookie. Every choice is dispatched on
// `window` as `pawz:consent-changed` so the GoogleAnalytics loader can
// translate it into Google Consent Mode v2 signals for the Google console.
//
// The center can be re-opened anytime — the site footer fires
// `pawz:open-cookie-preferences` on this same window.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Shield, ShieldCheck, Lock, X, SlidersHorizontal, Globe } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  ALL_GRANTED,
  CONSENT_COOKIE,
  CONSENT_COOKIE_MAX_AGE,
  CONSENT_VERSION,
  CUSTOMIZE_DEFAULTS,
  ESSENTIAL_ONLY,
  encodeConsentCookie,
  makeConsentId,
  readConsentCookie,
  type ConsentCategories,
  type ConsentRecord,
} from "@/lib/consent";

// --------------------------------------------------------------------- utils

/** Persist a choice, notify listeners, return the stored record. */
function persistConsent(cats: ConsentCategories, preferredId?: string): ConsentRecord {
  const prior = readConsentCookie();
  const record: ConsentRecord = {
    ...cats,
    v: CONSENT_VERSION,
    ts: Date.now(),
    cid: prior?.cid ?? preferredId ?? makeConsentId(),
  };
  // `Secure` only when actually served over https (local http previews
  // would otherwise silently drop the cookie).
  const secure = typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
  document.cookie = [
    `${CONSENT_COOKIE}=${encodeConsentCookie(record)}`,
    `max-age=${CONSENT_COOKIE_MAX_AGE}`,
    "path=/",
    "SameSite=Lax",
  ].join("; ") + secure;
  // Keep the live window state in sync so consent-gated loaders (PostHog,
  // Clarity, the analytics fan-out) see the new choice immediately — not
  // just after a reload.
  window.__pawzConsent = {
    essential: true,
    functional: cats.functional,
    analytics: cats.analytics,
  };
  // Notify the GA4 / Consent Mode loader (and anything else listening).
  window.dispatchEvent(new CustomEvent("pawz:consent-changed", { detail: cats }));
  return record;
}

// ------------------------------------------------------------------ category

type CategoryDef = {
  n: string;
  title: string;
  badge: "ALWAYS ACTIVE" | "OPTIONAL";
  key: keyof ConsentCategories;
  locked?: boolean;
  description: string;
  meta: { label: string; value: string }[];
};

const CATEGORIES: CategoryDef[] = [
  {
    n: "1",
    title: "Strictly Necessary & Essential",
    badge: "ALWAYS ACTIVE",
    key: "essential",
    locked: true,
    description:
      "These cookies are mandatory for authentication, secure appointment booking, payment gateway tokenization, fraud detection, and keeping your session active. They cannot be turned off.",
    meta: [
      { label: "Key Tokens", value: "session_token · csrf_protect · stripe_id" },
      { label: "Duration", value: "Session to 1 year" },
    ],
  },
  {
    n: "2",
    title: "Functional & User Preferences",
    badge: "OPTIONAL",
    key: "functional",
    description:
      "Enables personalized memory, such as your selected groomer and breed preferences, preferred pet stylist, currency formats, regional store locale defaults, and dark / light interface state.",
    meta: [
      { label: "Key Tokens", value: "pet_profile_prefs · preferred_location" },
      { label: "Duration", value: "6 months" },
    ],
  },
  {
    n: "3",
    title: "Performance & Analytics Cookies",
    badge: "OPTIONAL",
    key: "analytics",
    description:
      "Helps us analyze aggregate visitor interactions, bounce rates, page load metrics, and checkout flow drop-offs to improve server response times and user flow. All data is aggregated and anonymized.",
    meta: [
      { label: "Telemetry Partners", value: "Google Analytics 4 · Google Tag Manager · PostHog · Microsoft Clarity" },
      { label: "Duration", value: "13 months" },
    ],
  },
];

// -------------------------------------------------------------------- banner

function ConsentBanner({
  onAcceptAll,
  onRejectNonEssential,
  onCustomize,
}: {
  onAcceptAll: () => void;
  onRejectNonEssential: () => void;
  onCustomize: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[90] flex justify-center px-3 pb-3 sm:px-6 sm:pb-6"
    >
      <div className="consent-rise w-full max-w-3xl overflow-hidden rounded-lg border border-gold/40 bg-cream shadow-[0_24px_60px_-12px_rgba(26,20,10,0.45)]">
        {/* Header strip — shield, governance title, compliance badges, close */}
        <div className="flex items-center gap-3 border-b border-gold/25 bg-ink px-4 py-2.5 sm:px-6">
          <Shield className="h-4 w-4 shrink-0 text-gold" strokeWidth={1.8} aria-hidden="true" />
          <span className="truncate text-[9px] font-bold tracking-[0.22em] text-on-dark sm:text-[10px]">
            ALL ABOUT PAWZ · PRIVACY GOVERNANCE
          </span>
          <span className="ml-auto hidden items-center gap-2 sm:flex">
            <span className="border border-gold/35 px-2 py-0.5 text-[8px] font-bold tracking-[0.18em] text-gold">
              GDPR / CCPA
            </span>
            <span className="border border-gold/35 px-2 py-0.5 text-[8px] font-bold tracking-[0.18em] text-gold">
              256-BIT SSL
            </span>
          </span>
          <button
            type="button"
            onClick={onRejectNonEssential}
            title="Close (keep only essential cookies)"
            aria-label="Close and keep only essential cookies"
            className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gold/30 text-on-dark-muted transition-colors hover:border-gold hover:text-gold sm:ml-2"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        <div className="px-5 py-5 sm:px-7 sm:py-6">
          <h2 className="font-display text-[22px] leading-[1.15] text-ink sm:text-[26px]">
            We Value Your Privacy &amp; Tailored Care
          </h2>
          <p className="mt-3 max-w-[62ch] text-[11.5px] leading-[1.75] text-ink-soft sm:text-[12px]">
            We use cookies and similar secure technologies to enhance your salon booking experience,
            remember your pet profile preferences, and analyze site performance. Essential cookies
            are required for site security, appointment reservations, and core functionality;
            optional cookies support personalized features and performance analytics. By clicking{" "}
            <strong className="font-bold text-ink">Accept All Cookies</strong>, you agree to our use
            of optional cookies. You can adjust your cookie consent anytime via{" "}
            <strong className="font-bold text-ink">Customize Preferences</strong> or read our full{" "}
            <Link href="/policies/privacy-policy" className="font-bold text-gold-deep underline decoration-gold/50 underline-offset-2 hover:text-gold">
              Privacy Policy
            </Link>
            .
          </p>

          {/* Actions */}
          <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={onCustomize}
              className="flex items-center justify-center gap-2 border border-ink/25 bg-transparent px-4 py-3 text-[9.5px] font-bold tracking-[0.16em] text-ink-soft transition-colors hover:border-gold-deep hover:text-gold-deep"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
              CUSTOMIZE PREFERENCES
            </button>
            <button
              type="button"
              onClick={onRejectNonEssential}
              className="flex-1 border border-gold-deep/60 bg-transparent px-4 py-3 text-[9.5px] font-bold tracking-[0.16em] text-gold-deep transition-colors hover:bg-gold/10 sm:flex-none"
            >
              REJECT NON-ESSENTIAL
            </button>
            <button
              type="button"
              onClick={onAcceptAll}
              className="flex-1 bg-gold-deep px-5 py-3 text-[9.5px] font-bold tracking-[0.16em] text-on-dark transition-colors hover:bg-ink hover:text-gold sm:flex-none"
            >
              ACCEPT ALL COOKIES
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------- center

function ConsentCenter({
  initial,
  consentId,
  onClose,
  onSaved,
}: {
  initial: ConsentCategories;
  consentId: string;
  onClose: () => void;
  onSaved: (cats: ConsentCategories) => void;
}) {
  const [draft, setDraft] = useState<ConsentCategories>(initial);
  const ref = useRef<HTMLDivElement>(null);

  // Esc AND backdrop click close without saving; focus starts inside the dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    ref.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const setCat = (key: keyof ConsentCategories, value: boolean) =>
    setDraft((d) => (key === "essential" ? d : { ...d, [key]: value }));

  return (
    <div
      className="fixed inset-0 z-[95] flex items-end justify-center bg-ink/60 backdrop-blur-[2px] sm:items-center sm:px-6"
      onClick={onClose}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Cookie and privacy preferences"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="consent-rise flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-gold/40 bg-cream shadow-[0_24px_60px_-12px_rgba(26,20,10,0.5)] outline-none sm:max-h-[88dvh]"
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-gold/25 bg-ink px-4 py-3 sm:px-6">
          <ShieldCheck className="h-5 w-5 shrink-0 text-gold" strokeWidth={1.7} aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-[10px] font-bold tracking-[0.22em] text-on-dark sm:text-[11px]">
              CONSENT MANAGEMENT CENTER
            </p>
            <p className="mt-0.5 text-[8px] font-bold tracking-[0.18em] text-gold/80">
              GDPR &amp; CCPA COMPLIANT
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close cookie preferences"
            className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gold/30 text-on-dark-muted transition-colors hover:border-gold hover:text-gold"
          >
            <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="consent-scroll overflow-y-auto">
          <div className="px-5 py-5 sm:px-7 sm:py-6">
            <h2 className="font-display text-[24px] leading-[1.15] text-ink sm:text-[28px]">
              Cookie &amp; Privacy Preferences
            </h2>
            <p className="mt-3 max-w-[62ch] text-[11.5px] leading-[1.75] text-ink-soft sm:text-[12px]">
              We respect your right to privacy. Customize which cookies and tracking technologies
              you permit while using our grooming and boutique services. Essential cookies cannot
              be disabled as they are required for security, appointment reservations, and core
              site functionality.
            </p>
          </div>

          {/* Jurisdiction bar */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-gold/25 bg-cream-deep px-5 py-3 sm:px-7">
            <span className="flex items-center gap-1.5 text-[9.5px] font-bold tracking-[0.14em] text-ink-soft">
              <Globe className="h-3.5 w-3.5 text-gold-deep" strokeWidth={1.8} aria-hidden="true" />
              JURISDICTION: GLOBAL / EU / US-CA
            </span>
            <Link
              href="/policies/privacy-policy"
              className="text-[9.5px] font-bold tracking-[0.14em] text-gold-deep underline decoration-gold/50 underline-offset-2 hover:text-gold"
            >
              READ FULL PRIVACY POLICY →
            </Link>
            <span className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDraft({ ...ESSENTIAL_ONLY })}
                className="border border-ink/25 px-3 py-2 text-[8.5px] font-bold tracking-[0.14em] text-ink-soft transition-colors hover:border-gold-deep hover:text-gold-deep"
              >
                REJECT NON-ESSENTIAL
              </button>
              <button
                type="button"
                onClick={() => setDraft({ ...ALL_GRANTED })}
                className="bg-ink px-3 py-2 text-[8.5px] font-bold tracking-[0.14em] text-on-dark transition-colors hover:bg-gold-deep"
              >
                ENABLE ALL
              </button>
            </span>
          </div>

          {/* Categories */}
          <div className="divide-y divide-gold/20">
            {CATEGORIES.map((cat) => {
              const checked = draft[cat.key];
              return (
                <section key={cat.key} className="px-5 py-5 sm:px-7">
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold tracking-[0.2em] text-gold-deep">
                      {cat.n}.
                    </span>
                    <h3 className="font-display text-[16px] text-ink sm:text-[18px]">{cat.title}</h3>
                    {cat.badge === "ALWAYS ACTIVE" ? (
                      <span className="ml-1 inline-flex items-center gap-1 border border-gold-deep/50 bg-gold/10 px-2 py-0.5 text-[7.5px] font-bold tracking-[0.16em] text-gold-deep">
                        <Lock className="h-2.5 w-2.5" strokeWidth={2.2} aria-hidden="true" />
                        ALWAYS ACTIVE
                      </span>
                    ) : (
                      <span className="ml-1 border border-ink/20 px-2 py-0.5 text-[7.5px] font-bold tracking-[0.16em] text-ink-soft">
                        OPTIONAL
                      </span>
                    )}
                    <span className="ml-auto">
                      <Switch
                        checked={checked}
                        disabled={cat.locked}
                        onCheckedChange={(v) => setCat(cat.key, v)}
                        aria-label={`${cat.title} cookies`}
                        className="data-[state=checked]:bg-gold-deep data-[state=unchecked]:bg-ink/15 h-5 w-9 disabled:opacity-100"
                      />
                    </span>
                  </div>
                  <p className="mt-2.5 max-w-[64ch] text-[11px] leading-[1.7] text-ink-soft">
                    {cat.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5 border-t border-gold/15 pt-2.5">
                    {cat.meta.map((m) => (
                      <p key={m.label} className="text-[9px] font-bold tracking-[0.1em] text-ink-soft/80">
                        <span className="text-gold-deep">{m.label}:</span>{" "}
                        <span className="font-semibold">{m.value}</span>
                      </p>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gold/25 bg-cream-deep px-5 py-3 sm:px-7">
          <p className="text-[8.5px] font-bold tracking-[0.14em] text-ink-soft/75">
            CONSENT ID: {consentId} · UPDATED ACCORDING TO GLOBAL REGULATORY STANDARDS
          </p>
          <div className="mt-3 flex flex-col gap-2.5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => onSaved(draft)}
              className="border border-gold-deep/70 bg-transparent px-5 py-3 text-[9.5px] font-bold tracking-[0.16em] text-gold-deep transition-colors hover:bg-gold/10"
            >
              SAVE CUSTOM CHOICES
            </button>
            <button
              type="button"
              onClick={() => onSaved({ ...ALL_GRANTED })}
              className="bg-gold-deep px-5 py-3 text-[9.5px] font-bold tracking-[0.16em] text-on-dark transition-colors hover:bg-ink hover:text-gold"
            >
              ACCEPT ALL COOKIES
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------- root

export function CookieConsent() {
  const { toast } = useToast();
  // Hydration gate — the codebase's own idiom (see site-chrome): false during
  // SSR and the first client render (markup matches the server exactly),
  // then flips to true and re-renders so the banner can appear client-only.
  const emptySubscribe = () => () => {};
  const hydrated = useSyncExternalStore(emptySubscribe, () => true, () => false);
  // Re-render trigger for after a choice is saved (cookie is re-read in
  // render — reading document.cookie is pure and gives the current state).
  const [, setTick] = useState(0);
  const [centerOpen, setCenterOpen] = useState(false);
  const [draft, setDraft] = useState<ConsentCategories>({ ...CUSTOMIZE_DEFAULTS });
  // Stable "pending" consent id shown in the center before the first save
  // (lazy initializer → generated once per mount).
  const [pendingId] = useState(() => makeConsentId());

  const prior = hydrated ? readConsentCookie() : null;
  const hasChoice = !hydrated || !!prior;
  const consentId = prior?.cid ?? pendingId;

  // Footer / any external "Cookie Preferences" control.
  useEffect(() => {
    const openCenter = () => {
      const p = readConsentCookie();
      setDraft(
        p
          ? { essential: true, functional: p.functional, analytics: p.analytics }
          : { ...CUSTOMIZE_DEFAULTS },
      );
      setCenterOpen(true);
    };
    window.addEventListener("pawz:open-cookie-preferences", openCenter);
    return () => window.removeEventListener("pawz:open-cookie-preferences", openCenter);
  }, []);

  const save = (cats: ConsentCategories, message?: string) => {
    persistConsent(cats, pendingId);
    setCenterOpen(false);
    setTick((t) => t + 1);
    toast({
      title: message ?? "Cookie preferences saved",
      description: cats.analytics
        ? "Analytics cookies are enabled — thank you."
        : "Only essential and functional cookies are active.",
    });
  };

  // Pre-hydration (and SSR) render nothing — the boot script already
  // restored a returning visitor's consent, so there is never a flash.
  if (!hydrated) return null;

  return (
    <>
      {!hasChoice && !centerOpen && (
        <ConsentBanner
          onAcceptAll={() => save({ ...ALL_GRANTED }, "All cookies accepted")}
          onRejectNonEssential={() => save({ ...ESSENTIAL_ONLY }, "Only essential cookies active")}
          onCustomize={() => {
            setDraft({ ...CUSTOMIZE_DEFAULTS });
            setCenterOpen(true);
          }}
        />
      )}
      {centerOpen && (
        <ConsentCenter
          initial={draft}
          consentId={consentId}
          onClose={() => setCenterOpen(false)}
          onSaved={(cats) => save(cats)}
        />
      )}
    </>
  );
}
