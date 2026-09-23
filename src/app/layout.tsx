import type { Metadata } from "next";
import { Playfair_Display, Lato, Great_Vibes } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const lato = Lato({
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
  style: ["normal", "italic"],
  variable: "--font-body",
  display: "swap",
});

const greatVibes = Great_Vibes({
  subsets: ["latin"],
  variable: "--font-script",
  display: "swap",
});
import { Toaster } from "@/components/ui/toaster";
import { CONSENT_BOOT_SCRIPT } from "@/components/consent/consent-boot";
import { ga4ConfigScript, gtmContainerScript } from "@/components/consent/google-tags";
import { CookieConsent } from "@/components/consent/CookieConsent";
import { GoogleAnalytics } from "@/components/consent/GoogleAnalytics";
import { PostHogProvider } from "./providers";
import { Clarity } from "@/components/analytics/Clarity";
import { SITE_URL } from "@/lib/site-url";

// ---------------------------------------------------------------------------
// Google tags — installed exactly where Google's install snippets demand:
// "as high in the <head> of the page as possible", AFTER the Consent Mode v2
// defaults (consent-boot.ts) so the tags boot cookie-less while the visitor
// has not opted in. This is Google's documented Consent Mode v2 pattern and
// what Tag Assistant / the GA4 & GTM installation checkers detect.
//
// The IDs are PUBLIC values (they appear in every page's HTML by design —
// Google's own snippet ships the measurement ID in plain text), so they are
// hardcoded as DEFAULTS here: the tags fire on every deployment with zero
// environment configuration. Env vars still override if the owner ever
// re-points them.
// ---------------------------------------------------------------------------
const GA4_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || "G-7EVNS33CKD";
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || "GTM-WT35373V";

// Organization + WebSite structured data (server-rendered JSON-LD).
const SITE_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "All About Pawz",
      url: SITE_URL,
      logo: `${SITE_URL}/assets/paw.png`,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: "All About Pawz",
      url: SITE_URL,
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

const SITE_DESCRIPTION =
  "Spa-level dog grooming where every detail is designed for your pup's comfort, style, and happiness. From Pawz to PAWfection.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "All About Pawz | Luxury Dog Grooming & Spa",
  description: SITE_DESCRIPTION,
  applicationName: "All About Pawz",
  icons: { icon: "/assets/paw.png" },
  openGraph: {
    type: "website",
    siteName: "All About Pawz",
    locale: "en_US",
    url: "/",
    title: "All About Pawz | Luxury Dog Grooming & Spa",
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/assets/og-image.png",
        width: 1344,
        height: 768,
        alt: "All About Pawz — Luxury Dog Grooming & Spa",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "All About Pawz | Luxury Dog Grooming & Spa",
    description: SITE_DESCRIPTION,
    images: ["/assets/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: { canonical: "/" },
};

// Desktop-mode phones ("Request desktop site" in Chrome/Firefox on Android,
// "Request Desktop Website" in iOS Safari) force a 980–1024px layout viewport
// while the page is squeezed onto a ~414px screen: every lg: breakpoint fires
// and the pricing cards render three-squeezed-wide with unreadable type.
// This inline script (runs before first paint) tags those sessions on the
// <html> element so the dm-phone CSS in globals.css can serve the real mobile
// layout. Ordinary desktops never match (desktop UA), ordinary phones never
// match (narrow viewport) — the class appears only on a phone UA at desktop
// width.
const DESKTOP_MODE_PHONE_SCRIPT = `(function(){try{
var ua=navigator.userAgent;
var phone=/iPhone|iPod/.test(ua)||(/Android/.test(ua)&&/Mobile/.test(ua))||/Windows Phone|BlackBerry|Opera Mini|IEMobile/.test(ua);
if(!phone)return;
var root=document.documentElement;
var apply=function(){
var w=root.clientWidth||window.innerWidth;
if(w>=768){root.classList.add('dm-phone');root.style.setProperty('--dm-zoom',String(Math.min(2.6,w/430)));}
};
apply();
window.addEventListener('resize',apply);
window.addEventListener('orientationchange',function(){setTimeout(apply,250)});
}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* 1. Cookie consent boot — MUST run before first paint and before any
            tag fires: sets Google Consent Mode v2 defaults (all optional
            cookies denied) and restores a saved choice from the
            pawz_cookie_consent cookie so returning visitors see no banner. */}
        <script dangerouslySetInnerHTML={{ __html: CONSENT_BOOT_SCRIPT }} />
        {/* 2. GA4 Google tag (official install: gtag.js + config as high in
            <head> as possible). Consent Mode keeps it cookie-less / hit-less
            until the visitor opts in. page_view hits are sent deliberately by
            <GoogleAnalytics /> (send_page_view: false here → never doubled). */}
        {GA4_ID ? (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`} />
            <script dangerouslySetInnerHTML={{ __html: ga4ConfigScript(GA4_ID) }} />
          </>
        ) : null}
        {/* 3. Google Tag Manager container (official snippet, verbatim —
            GTM-WT35373V). The container reads the Consent Mode v2 state
            already queued on the dataLayer, so every Google-built tag inside
            respects the visitor's choice natively. */}
        {GTM_ID ? <script dangerouslySetInnerHTML={{ __html: gtmContainerScript(GTM_ID) }} /> : null}
        <script dangerouslySetInnerHTML={{ __html: DESKTOP_MODE_PHONE_SCRIPT }} />
      </head>
      <body className={`${playfair.variable} ${lato.variable} ${greatVibes.variable} antialiased`}>
        {/* Google Tag Manager (noscript) — the standard no-JS fallback from
            the owner's GTM install (GTM-WT35373V), immediately after the
            opening <body> tag exactly as Google's snippet requires. */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-WT35373V"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {/* PostHog (product analytics) — initialized client-side only after
            analytics consent; autocapture + $pageview + the shared track()
            fan-out all flow through it. */}
        <PostHogProvider>{children}</PostHogProvider>
        <Toaster />
        {/* Cookie consent: load-time banner + Consent Management Center */}
        <CookieConsent />
        {/* Consent Mode v2 forwarder, cookie collector + GA4 page_view hits */}
        <GoogleAnalytics />
        {/* Microsoft Clarity (session recordings + heatmaps) — consent-gated */}
        <Clarity />
        {/* Organization + WebSite structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(SITE_JSON_LD) }}
        />
      </body>
    </html>
  );
}
