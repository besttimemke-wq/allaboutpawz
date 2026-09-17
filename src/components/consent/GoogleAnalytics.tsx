"use client";

// ---------------------------------------------------------------------------
// All About Pawz — Consent Mode v2 forwarder, cookie collector + GA4
// page_view dispatcher.
//
// The GA4 Google tag (G-7EVNS33CKD) and the GTM container (GTM-WT35373V) are
// installed STATICALLY in <head> by the root layout — Google's official
// install position, right AFTER the Consent Mode v2 defaults that
// consent-boot.ts declares pre-paint. That ordering is Google's documented
// consent-mode pattern: the tags load, but while `analytics_storage` is
// "denied" gtag.js sets no cookies and sends no GA4 analytics hits.
//
// This component is the live bridge for everything that happens AFTER load:
//
//   1. CONSENT MODE v2 — every choice is forwarded with
//      `gtag('consent', 'update', …)`. GA4 / Google Ads read these signals
//      natively; consent states appear in GA4 Admin → Privacy (Consent Mode)
//      reporting and in Google Ads consent reporting.
//
//   2. AUDIT TRAIL — every choice pushes `pawz_consent_update` and the
//      collected (masked) cookie inventory `pawz_cookie_inventory` onto the
//      dataLayer, visible in Google Tag Assistant Preview + GA4 DebugView.
//
//   3. PAGE VIEWS — the head config uses `send_page_view: false`, so this
//      component is the single source of page_view hits: one is sent the
//      moment analytics consent is granted (returning visitors: right after
//      restore) and one on every app-router navigation while granted. Never
//      doubled.
// ---------------------------------------------------------------------------

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { toConsentMode, type ConsentCategories } from "@/lib/consent";

declare global {
  interface Window {
    dataLayer?: unknown[];
    __pawzGtag?: (...args: unknown[]) => void;
    __pawzConsent?: ConsentCategories | null;
  }
}

const GA4_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;

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
}

export function GoogleAnalytics() {
  const pathname = usePathname();
  /** Current path the last page_view was sent for (dedupe). */
  const lastPath = useRef<string | null>(null);
  /** Live analytics-consent flag for the SPA page_view effect. */
  const analyticsOn = useRef(false);

  const sendPageView = (path: string) => {
    lastPath.current = path;
    window.__pawzGtag?.("event", "page_view", {
      page_path: path,
      page_title: document.title,
    });
  };

  // Initial state (restored by the boot script) + live updates from the UI.
  useEffect(() => {
    const initial = window.__pawzConsent;
    if (initial) {
      const cats: ConsentCategories = {
        essential: true,
        functional: initial.functional,
        analytics: initial.analytics,
      };
      applyConsent(cats, "restore");
      // Collect inventory once per session even when consent is unchanged.
      pushCookieInventory(cats, "page_load");
      analyticsOn.current = initial.analytics;
      // Returning visitor with analytics granted — GA4 has been live since
      // the head config processed the boot script's restored consent; send
      // this view's page_view now.
      if (initial.analytics) sendPageView(window.location.pathname);
    }
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<ConsentCategories>).detail;
      if (!detail) return;
      applyConsent(detail, "user_choice");
      if (detail.analytics && !analyticsOn.current) {
        // First grant of this visit — nothing has reached GA4 yet. Send the
        // current page immediately so GA4 Realtime lights up on opt-in.
        sendPageView(window.location.pathname);
      }
      analyticsOn.current = detail.analytics;
    };
    window.addEventListener("pawz:consent-changed", onChange);
    return () => window.removeEventListener("pawz:consent-changed", onChange);
  }, []);

  // SPA page_view hits for app-router navigation (GA4 only receives them
  // while analytics consent is granted; send_page_view is false in the head
  // config, so these are the only page_view hits — never doubled).
  useEffect(() => {
    if (!GA4_ID) return;
    if (lastPath.current === pathname) return;
    if (!analyticsOn.current) {
      // Not granted yet — remember the path so the grant handler above
      // sends exactly one page_view for the current view.
      lastPath.current = pathname;
      return;
    }
    sendPageView(pathname);
  }, [pathname]);

  return null;
}
