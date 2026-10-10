import "./seopages.css";

// ---------------------------------------------------------------------------
// (education) route group — the owner's standalone Education Center design,
// ported verbatim from his /tmp/seopages repo (Next 15 → Next 16).
//
// This group exists so his pages keep HIS chrome (UnifiedTopNav + Footer are
// rendered inside his own page components) and are NOT wrapped in the
// aapawz SiteChrome that the (site) group layout applies. Owner directive:
// "swap out those pages and replace them with my exact design — I don't want
// it dressed up jazzied out."
//
// URLs are the owner's intended root-level paths (/guides, /dog-breeds,
// /feeding-and-watering, …) — a route group adds no URL segments.
//
// seopages.css is his globals.css scoped under the .seo-pages wrapper this
// layout applies (see that file's header for the full scoping decision).
// ---------------------------------------------------------------------------
export default function EducationLayout({ children }: { children: React.ReactNode }) {
  return <div className="seo-pages">{children}</div>;
}
