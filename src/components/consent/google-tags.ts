// ---------------------------------------------------------------------------
// All About Pawz — Google tag HEAD snippets (official install code).
//
// The owner pasted Google's own install snippets for BOTH the GA4 Google tag
// (G-7EVNS33CKD) and the Google Tag Manager container (GTM-WT35373V). These
// builders reproduce them VERBATIM so Google's own detection tooling
// (Tag Assistant, the GA4/GTM "check installation" wizards, Search Console)
// finds the tags exactly where Google's documentation says they must live:
// "as high in the <head> of the page as possible".
//
// ORDERING CONTRACT (Google's documented Consent Mode v2 pattern):
//   1. consent-boot.ts  — Consent Mode v2 defaults (all optional DENIED) +
//      restore of a saved choice. Runs BEFORE any tag can execute.
//   2. GA4 gtag.js      — official snippet below.
//   3. GTM container    — official snippet below.
// While `analytics_storage` is "denied", gtag.js sets no cookies and sends no
// GA4 analytics hits (Google's own cookie-less behavior); the moment the
// visitor opts in, `gtag('consent','update')` flips everything live. The GTM
// noscript iframe sits immediately after <body> in the root layout.
//
// NOTE ON DOUBLE-TAGGING: both the direct GA4 tag AND the GTM container are
// installed per the owner's snippets. If a GA4 tag for the SAME property
// (G-7EVNS33CKD) is ever also created inside the GTM container, remove one of
// the two or every hit will be counted twice.
// ---------------------------------------------------------------------------

/**
 * The official GA4 inline config — the exact second half of Google's
 * "Install your Google tag" snippet, adapted only to reuse the gtag stub the
 * consent boot script already defined (window.__pawzGtag / window.gtag push
 * into the same dataLayer, so this is byte-compatible with Google's version).
 *
 * `send_page_view: false` — page_view hits are sent deliberately by
 * GoogleAnalytics.tsx (on consent grant + every app-router navigation) so
 * there is exactly one page_view per view, never two.
 */
export function ga4ConfigScript(ga4Id: string): string {
  return [
    "(function(){try{",
    "var g=window.__pawzGtag||window.gtag||function(){window.dataLayer.push(arguments);};",
    "g('js',new Date());",
    `g('config','${ga4Id}',{send_page_view:false,anonymize_ip:true});`,
    "}catch(e){}})();",
  ].join("");
}

/**
 * Google's official GTM container snippet — verbatim
 * (https://developers.google.com/tag-platform/tag-manager/web):
 *
 *   (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
 *   new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
 *   j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
 *   'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
 *   })(window,document,'script','dataLayer','GTM-XXXXXXX');
 *
 * It reuses the dataLayer the consent boot script created, so Consent Mode
 * v2 defaults + the restored consent state are already queued before the
 * container processes its first tag.
 */
export function gtmContainerScript(gtmId: string): string {
  return [
    "(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':",
    "new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],",
    "j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=",
    "'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);",
    `})(window,document,'script','dataLayer','${gtmId}');`,
  ].join("");
}
