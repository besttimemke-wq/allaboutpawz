import { Montserrat, Hanken_Grotesk } from "next/font/google";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { QuickActionProvider } from "@/providers/QuickActionProvider";
import { GlobalCommandPalette } from "@/components/common/GlobalCommandPalette";

// ============================================================================
// (portals) route-group layout — shared chrome for the All About Pawz portals
// (admin OS, groomer station, customer portal) and the five bifurcated auth
// pages. Loads the portal fonts and applies the scoped .pawz-theme token set
// so the public website's root tokens are never touched.
//
// The layout itself stays a SERVER component (fonts compile statically, the
// shell is static HTML). The QueryProvider is the one client boundary: it
// gives every portal page the client-side data layer (stale-while-revalidate
// queries against the /api routes) so no render path ever waits on the
// database — cached data paints instantly, fresh data arrives in the
// background.
//
// The QuickActionProvider (Cmd+K palette) wraps the whole portals group so
// the palette is available on every portal page. The GlobalCommandPalette
// component is mounted once here so it can be opened with Cmd+K from
// anywhere inside a portal.
// ============================================================================

/* Montserrat Medium — sidebar + topbar (--font-bar) */
const montserrat = Montserrat({
  variable: "--font-bar",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

/* Hanken Grotesk — canvas / content (--font-sans)
 * NOTE: The client spec calls for Laski Sans Regular (commercial, Type
 * Network). Hanken Grotesk is the closest free humanist alternative. */
const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export default function PortalsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={`pawz-theme ${montserrat.variable} ${hankenGrotesk.variable}`}>
      <QueryProvider>
        <QuickActionProvider>
          {children}
          <GlobalCommandPalette />
        </QuickActionProvider>
      </QueryProvider>
    </div>
  );
}
