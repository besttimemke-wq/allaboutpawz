"use client";

// ---------------------------------------------------------------------------
// All About Pawz — live cookie-consent state for analytics consumers.
//
// Reads `window.__pawzConsent` (set pre-paint by the consent boot script from
// the pawz_cookie_consent cookie, and updated by CookieConsent.persistConsent
// on every choice) and re-renders on every `pawz:consent-changed` event.
//
// `false` on the server and during hydration (useSyncExternalStore's server
// snapshot) — consumers act inside effects, so this never causes hydration
// mismatches.
// ---------------------------------------------------------------------------

import { useSyncExternalStore } from "react";
import type { ConsentCategories } from "@/lib/consent";

declare global {
  interface Window {
    __pawzConsent?: ConsentCategories | null;
  }
}

function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener("pawz:consent-changed", onStoreChange);
  return () => window.removeEventListener("pawz:consent-changed", onStoreChange);
}

/** True once the visitor granted the Performance & Analytics category. */
export function useAnalyticsConsent(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => {
      const c = window.__pawzConsent;
      return c?.analytics === true;
    },
    () => false,
  );
}
