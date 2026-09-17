// ---------------------------------------------------------------------------
// All About Pawz — Analytics tracking library (client-side).
//
// One typed API (`track`) that fans every booking + ecommerce event out to:
//   1. `gtag('event', …)`          → GA4 property G-7EVNS33CKD (Google tag,
//      installed statically in <head> per Google's official snippet)
//   2. `dataLayer.push({event, …})` → Google Tag Manager container
//      GTM-WT35373V (standard GTM/GA4 ecommerce dataLayer schema — any tag
//      configured inside the container can consume it)
//   3. `navigator.sendBeacon('/api/analytics/events')` → the salon's OWN
//      custom analytics (analytics_events table in Supabase, readable from
//      the admin portal)
//   4. `posthog.capture(…)`        → PostHog product analytics (autocapture,
//      funnels, dashboards — the SDK is only initialized after consent)
//
// Consent: events are mirrored to GA4 / PostHog / the server ONLY while the
// visitor granted the "Performance & Analytics" cookie category. While
// denied, nothing leaves the browser: Consent Mode v2 keeps gtag.js
// cookie-less and hit-less, PostHog is never initialized, and the beacon is
// skipped (the dataLayer stays in-memory and inert for GTM until it loads).
//
// Event names follow the GA4 recommended-event schema so they map natively
// in the Google console (Monetization / Ecommerce / Funnel reports) — with
// Pawz-specific custom events for the booking funnel.
// ---------------------------------------------------------------------------

import posthog from "posthog-js";
import { readConsentCookie } from "@/lib/consent";

export const CURRENCY = "USD";

/** GA4 item — the shared shape for every ecommerce event. */
export type AnalyticsItem = {
  item_id: string;
  item_name: string;
  item_category?: string;
  item_variant?: string;
  price?: number;
  quantity?: number;
};

type EcommerceParams = Record<string, unknown> & {
  currency?: string;
  value?: number;
  items?: AnalyticsItem[];
};

// --------------------------------------------------------------------- core

declare global {
  interface Window {
    dataLayer?: unknown[];
    __pawzGtag?: (...args: unknown[]) => void;
  }
}

function analyticsGranted(): boolean {
  if (typeof window === "undefined") return false;
  const live = (window as any).__pawzConsent;
  if (live && typeof live.analytics === "boolean") return live.analytics;
  return readConsentCookie()?.analytics ?? false;
}

/** Parse a display price ("$22.00" / "$1,240.50") to dollars (number). */
export function priceToDollars(p: string | null | undefined): number {
  if (!p) return 0;
  const v = parseFloat(String(p).replace(/[^0-9.]/g, ""));
  return isFinite(v) ? v : 0;
}

/** Random per-visitor session id (first-party, only set with analytics consent). */
function getSessionId(): string {
  if (typeof document === "undefined") return "server";
  const m = document.cookie.match(/(?:^|;\s*)pawz_sid=([^;]*)/);
  if (m) return m[1];
  const sid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  document.cookie = `pawz_sid=${sid}; max-age=1800; path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  return sid;
}

/**
 * Dispatch one analytics event to GA4 (gtag), GTM (dataLayer) and the
 * salon's own event log (beacon). Never throws — analytics must not be able
 * to break a booking or a checkout.
 */
function dispatch(event: string, params: EcommerceParams = {}): void {
  try {
    if (typeof window === "undefined") return;
    const granted = analyticsGranted();

    // 1+2. GTM dataLayer event (standard GTM/GA4 ecommerce schema) and the
    //      direct gtag event for the GA4 property. The dataLayer push keeps
    //      the `ecommerce` key (GTM's native shape); gtag takes flat params.
    window.dataLayer = window.dataLayer || [];
    const dl: Record<string, unknown> = { event, ...params };
    if (params.items || params.value != null || params.currency) {
      dl.ecommerce = { currency: params.currency ?? CURRENCY, ...params };
    }
    window.dataLayer.push(dl);
    if (granted && window.__pawzGtag) {
      window.__pawzGtag("event", event, params);
    }

    // 3. PostHog product analytics — the SDK is only initialized after
    //    analytics consent (see app/providers.tsx).
    if (granted && posthog.__loaded) {
      posthog.capture(event, { ...params, $current_url: window.location.href });
    }

    // 4. Custom analytics mirror — the salon's own event log in Supabase.
    if (granted && typeof navigator !== "undefined" && navigator.sendBeacon) {
      const payload = JSON.stringify({
        event,
        data: params,
        page: window.location.pathname,
        sessionId: getSessionId(),
        ts: Date.now(),
      });
      navigator.sendBeacon(
        "/api/analytics/events",
        new Blob([payload], { type: "application/json" }),
      );
    }
  } catch {
    /* never fatal */
  }
}

const itemsValue = (items: AnalyticsItem[]): number =>
  items.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 1), 0);

// ------------------------------------------------------- ecommerce (GA4)

export const track = {
  /** Product grid / category page seen. */
  viewItemList(listId: string, listName: string, items: AnalyticsItem[]) {
    dispatch("view_item_list", {
      item_list_id: listId,
      item_list_name: listName,
      items,
    });
  },

  /** Product detail page seen. */
  viewItem(item: AnalyticsItem) {
    dispatch("view_item", {
      currency: CURRENCY,
      value: item.price ?? 0,
      items: [item],
    });
  },

  /** A product was clicked in a listing (ProductCard). */
  selectItem(item: AnalyticsItem, listId: string) {
    dispatch("select_item", {
      item_list_id: listId,
      items: [item],
    });
  },

  /** Added to the bag. */
  addToCart(item: AnalyticsItem) {
    dispatch("add_to_cart", {
      currency: CURRENCY,
      value: (item.price || 0) * (item.quantity || 1),
      items: [item],
    });
  },

  /** Removed from the bag (or qty decreased / removed entirely). */
  removeFromCart(item: AnalyticsItem) {
    dispatch("remove_from_cart", {
      currency: CURRENCY,
      value: (item.price || 0) * (item.quantity || 1),
      items: [item],
    });
  },

  /** Bag page viewed. */
  viewCart(items: AnalyticsItem[]) {
    dispatch("view_cart", {
      currency: CURRENCY,
      value: itemsValue(items),
      items,
    });
  },

  /** Checkout flow entered (shop step 1 / booking review). */
  beginCheckout(items: AnalyticsItem[], flow: "shop" | "booking") {
    dispatch("begin_checkout", {
      currency: CURRENCY,
      value: itemsValue(items),
      items,
      checkout_flow: flow,
    });
  },

  /** Delivery choice made (shop checkout step 3). */
  addShippingInfo(items: AnalyticsItem[], tier: "ship" | "pickup") {
    dispatch("add_shipping_info", {
      currency: CURRENCY,
      value: itemsValue(items),
      items,
      shipping_tier: tier === "ship" ? "Shipping" : "Salon pickup",
    });
  },

  /** Pay clicked — right before the Stripe redirect. */
  addPaymentInfo(items: AnalyticsItem[], paymentType = "stripe") {
    dispatch("add_payment_info", {
      currency: CURRENCY,
      value: itemsValue(items),
      items,
      payment_type: paymentType,
    });
  },

  /** Payment cleared (fired on the Stripe success return). */
  purchase(transactionId: string, items: AnalyticsItem[], value?: number) {
    dispatch("purchase", {
      transaction_id: transactionId,
      currency: CURRENCY,
      value: value ?? itemsValue(items),
      items,
    });
  },

  // ---------------------------------------------------- booking funnel

  /** Booking wizard started (first step advanced past Name). */
  beginBooking(flow: "appointment" | "consultation") {
    dispatch("begin_booking", { booking_flow: flow });
  },

  /** A wizard step was completed (custom funnel event). */
  bookingStep(stepIndex: number, stepName: string, flow: "appointment" | "consultation") {
    dispatch("booking_step", {
      step_index: stepIndex,
      step_name: stepName,
      booking_flow: flow,
    });
  },

  /** Appointment confirmed (deposit paid — fired on the Stripe success return). */
  bookAppointment(details: Record<string, unknown>) {
    dispatch("book_appointment", details);
  },

  /** Consultation submitted (no deposit) — GA4 lead event. */
  generateLead(leadType: "consultation" | "contact", details: Record<string, unknown> = {}) {
    dispatch("generate_lead", { lead_type: leadType, currency: CURRENCY, value: 0, ...details });
  },

  /** Custom salon event (escape hatch for anything new). */
  custom(event: string, params: Record<string, unknown> = {}) {
    dispatch(`pawz_${event}`, params);
  },
};

/**
 * Identify the visitor to PostHog once we legitimately know who they are
 * (they submitted their email in the booking or checkout flow). Consent-
 * gated; server-side captures use the same email as distinct_id, so the
 * client identity stitches the whole funnel together in PostHog.
 */
export function identifyViewer(email: string | null | undefined): void {
  try {
    if (typeof window === "undefined" || !email) return;
    if (!analyticsGranted()) return;
    if (posthog.__loaded) posthog.identify(email);
  } catch {
    /* never fatal */
  }
}
