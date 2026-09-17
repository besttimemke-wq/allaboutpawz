"use client";

// ---------------------------------------------------------------------------
// All About Pawz — PostHog provider (product analytics).
//
// PostHog is initialized on the client ONLY after the visitor grants the
// "Performance & Analytics" cookie category (useAnalyticsConsent): before
// consent, no PostHog script is loaded, no cookies are set, and nothing is
// sent. Once granted, PostHog provides:
//   • autocapture        — every click / form / interaction captured OOTB
//   • $pageview          — sent below on every app-router navigation
//   • custom events      — the shared track() fan-out in src/lib/analytics.ts
//                          mirrors all booking + ecommerce events into PostHog
//   • $pageleave         — engagement time per page
//
// Env: NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN + NEXT_PUBLIC_POSTHOG_HOST (.env).
// ---------------------------------------------------------------------------

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { PostHogProvider as PHProvider } from "@posthog/react";
import posthog from "posthog-js";
import { useAnalyticsConsent } from "@/components/analytics/use-analytics-consent";
import { isPortalPath } from "@/lib/portal-paths";

const POSTHOG_TOKEN = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

/** Sends one $pageview per app-router view (PostHog's documented pattern). */
function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const granted = useAnalyticsConsent();

  useEffect(() => {
    if (!granted || !posthog.__loaded) return;
    // Portal views are internal tool pages — never counted as site pageviews.
    if (isPortalPath(pathname)) return;
    try {
      posthog.capture("$pageview", { $current_url: window.location.href });
    } catch {
      /* never fatal */
    }
  }, [pathname, searchParams, granted]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const granted = useAnalyticsConsent();
  const pathname = usePathname();

  useEffect(() => {
    if (!granted || !POSTHOG_TOKEN || posthog.__loaded) return;
    // The portals run on strictly-necessary cookies only — PostHog never
    // initializes there (a visitor entering the public site from a portal
    // gets the saved consent re-applied by GoogleAnalytics and PostHog boots
    // then, exactly as on a direct public visit).
    if (isPortalPath(pathname)) return;
    try {
      posthog.init(POSTHOG_TOKEN, {
        api_host: POSTHOG_HOST,
        // PostHog-recommended defaults for new projects (owner's wizard setup).
        defaults: "2026-05-30",
        // Pageviews are captured explicitly (App Router safe): the loaded
        // callback below covers the first view of a session, PostHogPageView
        // covers every subsequent navigation.
        capture_pageview: false,
        capture_pageleave: true,
        loaded: () => {
          // The SDK is ready. PostHogPageView may have already skipped its
          // run while the config was still loading — capture the current
          // view here so the first $pageview of the session is never missed.
          try {
            posthog.capture("$pageview", { $current_url: window.location.href });
          } catch {
            /* never fatal */
          }
        },
      });
      // Debug handle (console: __pawzPosthog) — mirrors the codebase's
      // window.__pawz* convention for verifying the live stack.
      (window as unknown as { __pawzPosthog?: typeof posthog }).__pawzPosthog = posthog;
    } catch {
      /* never fatal */
    }
  }, [granted]);

  return (
    <PHProvider client={posthog}>
      {children}
      {/* Suspense: useSearchParams would otherwise force dynamic rendering
          of statically-exported pages (PostHog's documented Next.js setup). */}
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
    </PHProvider>
  );
}
