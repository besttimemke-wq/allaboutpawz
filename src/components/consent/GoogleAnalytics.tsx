"use client";

// ---------------------------------------------------------------------------
// All About Pawz — Google tag loading (GA4 + GTM) + Consent Mode v2 + cookie
// collector.
//
// This is the bridge between the visitor's cookie choice and the Google
// console:
//
//   1. CONSENT MODE v2 — every choice is forwarded with
//      `gtag('consent', 'update', …)`. GA4 / Google Ads read these signals
//      natively: GA4 stays cookie-less (no _ga cookie, no hits stored) while
//      `analytics_storage` is "denied", and starts reporting the moment it
//      flips to "granted". Consent states appear in GA4 Admin → Privacy
//      (Consent Mode) reporting and in Google Ads consent reporting.
//
//   2. GA4 TAG — googletagmanager.com/gtag/js?id=G-7EVNS33CKD loads ONLY
//      after the visitor grants analytics (NEXT_PUBLIC_GA4_MEASUREMENT_ID).
//      Route changes push page_view hits.
//
//   3. GTM CONTAINER — the owner's Google Tag Manager container
//      (NEXT_PUBLIC_GTM_ID = GTM-WT35373V) is injected with the standard
//      container snippet (gtm.start → gtm.js) after the Consent Mode
//      defaults are already declared (the pre-paint boot script) and only
//      after analytics consent, so every tag inside the container inherits
//      the correct consent state. Tags configured in the container that
//      use the GA4 built-in consent checks respect denied/granted
//      automatically.
//
//   4. COOKIE COLLECTOR — after every consent decision the browser's current
//      first-party cookies are collected (sensitive values masked) and pushed
//      to the dataLayer as a `pawz_cookie_inventory` event with the consent
//      state attached. Visible in Google Tag Assistant Preview + GA4
//      DebugView.
//
// NOTE ON DOUBLE-TAGGING: both the direct GA4 tag AND the GTM container are
// installed per the owner's snippets. If a GA4 tag for the SAME property
// (G-7EVNS33CKD) is ever also created inside the GTM container, remove one
// of the two or every hit will be counted twice.
// ---------------------------------------------------------------------------

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { toConsentMode, type ConsentCategories } from "@/lib/consent";

declare global {
  interface Window {
    dataLayer?: unknown[];
    __pawzGtag?: (...args: unknown[]) => void;
    __pawzConsent?: ConsentCategories | null;
    __pawzGa4Loaded?: boolean;
    __pawzGtmLoaded?: boolean;
  }
}

const GA4_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

/** Cookie names whose VALUES must never leave the browser. */
const SENSITIVE_COOKIE = /session|csrf|oauth|token|secret|nonce|__host/i;

type CollectedCookie = { name: string; value: string };

/** Parse `document.cookie` into name/value pairs with sensitive masking. */
function collectCookies(): CollectedCookie[] {
  return document.cookie
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const eq = part.indexOf("=");
      const name = eq === -1 ? part : part.slice(0, eq);
      const value = eq === -1 ? "" : part.slice(eq + 1);
      return {
        name,
        value: SENSITIVE_COOKIE.test(name) ? `<redacted ${value.length} chars>` : value,
      };
    });
}

/** Push the collected cookies + consent state where the Google console reads. */
function pushCookieInventory(cats: ConsentCategories, trigger: string) {
  const cookies = collectCookies();
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: "pawz_cookie_inventory",
    pawz_trigger: trigger,
    consent: {
      essential: true,
      functional: cats.functional,
      analytics: cats.analytics,
    },
    cookie_count: cookies.length,
    cookie_names: cookies.map((c) => c.name),
    cookies,
  });
}

/** Inject googletagmanager/gtag.js once, then configure the GA4 property. */
function loadGa4Tag() {
  if (window.__pawzGa4Loaded || !GA4_ID) return;
  window.__pawzGa4Loaded = true;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`;
  document.head.appendChild(script);

  window.__pawzGtag?.("js", new Date());
  window.__pawzGtag?.("config", GA4_ID, {
    anonymize_ip: true,
    page_title: document.title,
    page_path: window.location.pathname,
  });
}

/** Inject the GTM container with the standard Google snippet (gtm.start → gtm.js). */
function loadGtmContainer() {
  if (window.__pawzGtmLoaded || !GTM_ID) return;
  window.__pawzGtmLoaded = true;

  // Google's official container snippet, verbatim — executed by injecting it
  // as an inline script so it runs in page context (not module scope):
  //   w[l].push({'gtm.start': …, event:'gtm.js'}) then insert gtm.js?id=GTM-…
  const snippet = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`;

  const script = document.createElement("script");
  script.textContent = snippet;
  document.head.appendChild(script);
}

/** Apply a consent decision everywhere Google looks for it. */
function applyConsent(cats: ConsentCategories, trigger: string) {
  // 1. Google Consent Mode v2 — the signal GA4 / Google Ads read natively.
  window.__pawzGtag?.("consent", "update", toConsentMode(cats));

  // 2. Audit trail on the dataLayer (Tag Assistant / DebugView).
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: "pawz_consent_update",
    pawz_trigger: trigger,
    ...toConsentMode(cats),
  });

  // 3. Collect the browser's cookies and hand them to the dataLayer.
  pushCookieInventory(cats, trigger);

  // 4. Only now may the measurement containers themselves load.
  if (cats.analytics) {
    loadGa4Tag();
    loadGtmContainer();
  }
}

export function GoogleAnalytics() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  // Initial state (restored by the boot script) + live updates from the UI.
  useEffect(() => {
    const initial = window.__pawzConsent;
    if (initial) {
      applyConsent(
        { essential: true, functional: initial.functional, analytics: initial.analytics },
        "restore",
      );
      // Collect inventory once per session even when consent is unchanged.
      pushCookieInventory(
        { essential: true, functional: initial.functional, analytics: initial.analytics },
        "page_load",
      );
    }
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<ConsentCategories>).detail;
      if (detail) applyConsent(detail, "user_choice");
    };
    window.addEventListener("pawz:consent-changed", onChange);
    return () => window.removeEventListener("pawz:consent-changed", onChange);
  }, []);

  // SPA page_view hits for app-router navigation (GA4 only receives them
  // while analytics consent is granted).
  useEffect(() => {
    if (!GA4_ID || !window.__pawzGa4Loaded) return;
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    window.__pawzGtag?.("event", "page_view", {
      page_path: pathname,
      page_title: document.title,
    });
  }, [pathname]);

  return null;
}
