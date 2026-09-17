// ---------------------------------------------------------------------------
// All About Pawz — cookie consent model.
//
// One JSON cookie (`pawz_cookie_consent`) is the single source of truth for
// the visitor's privacy choices. Everything else derives from it:
//   • the Consent Management Center UI (banner + granular dialog)
//   • Google Consent Mode v2 signals (gtag consent update) → GA4 / Google Ads
//   • the gtag.js loader (analytics tag only loads after analytics consent)
//   • the cookie inventory collector pushed to the dataLayer
// ---------------------------------------------------------------------------

export const CONSENT_COOKIE = "pawz_cookie_consent";
export const CONSENT_COOKIE_MAX_AGE = 60 * 60 * 24 * 180; // 180 days
export const CONSENT_VERSION = 1;

/** The three categories shown in the Consent Management Center. */
export type ConsentCategories = {
  /** Strictly Necessary & Essential — always active, cannot be disabled. */
  essential: true;
  /** Functional & User Preferences — pet profile prefs, locale, theme. */
  functional: boolean;
  /** Performance & Analytics — Google Analytics 4, Google Tag Manager,
   *  PostHog, Microsoft Clarity. */
  analytics: boolean;
};

export type ConsentRecord = ConsentCategories & {
  /** Schema version, so future changes can migrate old records. */
  v: number;
  /** Epoch ms when the choice was saved. */
  ts: number;
  /** Public consent id shown in the UI, e.g. "A4P-8B92-F1C3". */
  cid: string;
};

export const ESSENTIAL_ONLY: ConsentCategories = {
  essential: true,
  functional: false,
  analytics: false,
};

export const ALL_GRANTED: ConsentCategories = {
  essential: true,
  functional: true,
  analytics: true,
};

/** Defaults the Consent Management Center opens with (from the design mock). */
export const CUSTOMIZE_DEFAULTS: ConsentCategories = {
  essential: true,
  functional: true,
  analytics: false,
};

// ---------------------------------------------------------------------------
// Cookie codec — stored URL-encoded so it survives `document.cookie` intact.
// ---------------------------------------------------------------------------

export function encodeConsentCookie(c: ConsentRecord): string {
  return encodeURIComponent(JSON.stringify(c));
}

export function decodeConsentCookie(raw: string): ConsentRecord | null {
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<ConsentRecord>;
    if (typeof parsed.functional !== "boolean" || typeof parsed.analytics !== "boolean") return null;
    return {
      v: typeof parsed.v === "number" ? parsed.v : CONSENT_VERSION,
      essential: true,
      functional: parsed.functional,
      analytics: parsed.analytics,
      ts: typeof parsed.ts === "number" ? parsed.ts : Date.now(),
      cid: typeof parsed.cid === "string" ? parsed.cid : makeConsentId(),
    };
  } catch {
    return null;
  }
}

export function readConsentCookie(): ConsentRecord | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${CONSENT_COOKIE}=([^;]*)`));
  return m ? decodeConsentCookie(m[1]) : null;
}

export function makeConsentId(): string {
  const hex = (n: number) =>
    Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join("").toUpperCase();
  return `A4P-${hex(4)}-${hex(4)}`;
}

// ---------------------------------------------------------------------------
// Google Consent Mode v2 mapping.
//
// This is the exact signal dictionary GA4 / Google Ads read out of the box —
// pushing this via `gtag('consent', 'update', …)` is what makes the visitor's
// choice show up in the Google console (GA4 Realtime / DebugView, Google Ads
// consent reporting, and Cookie/Tag coverage in Tag Assistant).
//
// No marketing/ad category is presented in the UI yet, so ad_* signals stay
// denied — the site runs no ad pixels today and false is the honest value.
// ---------------------------------------------------------------------------

export type ConsentModeState = {
  ad_storage: "granted" | "denied";
  ad_user_data: "granted" | "denied";
  ad_personalization: "granted" | "denied";
  analytics_storage: "granted" | "denied";
  functionality_storage: "granted" | "denied";
  personalization_storage: "granted" | "denied";
  security_storage: "granted" | "denied";
};

export function toConsentMode(c: ConsentCategories): ConsentModeState {
  const b = (x: boolean): "granted" | "denied" => (x ? "granted" : "denied");
  return {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: b(c.analytics),
    functionality_storage: b(c.functional),
    personalization_storage: b(c.functional),
    security_storage: "granted",
  };
}
