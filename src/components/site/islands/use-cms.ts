"use client"

// ---------------------------------------------------------------------------
// Embedded content — the public site's data layer.
//
// The content you see on every page lives in src/content/site-content.ts,
// baked into the bundle at publish time (scripts/bake-content.mjs). The
// public site therefore makes ZERO requests and touches NO database when a
// visitor opens a page: no fetches, no API calls, no skeletons, no loading
// states — nothing that can hang, fail, or blank the page.
//
// The database is involved in exactly two places, by design:
//   1. ADMIN PUBLISHES — the admin portal saves to the database; the owner
//      then runs `bun run bake` and redeploys to publish the edits.
//   2. A VISITOR SUBMITS — booking, contact, consultation, newsletter, and
//      orders POST to the API and write to the database.
//
// The hook signatures are unchanged so every island keeps working as-is;
// `loading` is now always false because the data is already in the bundle.
// ---------------------------------------------------------------------------

import {
  settings,
  testimonials,
  services,
  serviceItems,
  packages,
  addons,
  gallery,
  products,
  productReviews,
  faqs,
  policies,
} from "@/content/site-content"

const RESOURCES: Record<string, unknown[]> = {
  testimonials,
  services,
  serviceItems,
  packages,
  addons,
  gallery,
  products,
  product_reviews: productReviews,
  faqs,
  policies,
}

export function useCms<T = any>(resource: string): { data: T[]; loading: boolean } {
  const rows = RESOURCES[resource]
  return { data: (rows ?? []) as T[], loading: false }
}

export function useCmsSettings(): { settings: Record<string, string>; loading: boolean } {
  return { settings, loading: false }
}

// Rows the admin marked hidden must not render on the public site.
export function visibleOnly<T extends { visible?: boolean }>(rows: T[]): T[] {
  return rows.filter((r) => r.visible)
}
