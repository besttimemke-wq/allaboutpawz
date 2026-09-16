import { Montserrat, Hanken_Grotesk } from "next/font/google";

// ============================================================================
// (portals) route-group layout — shared chrome for the All About Pawz portals
// (admin OS, groomer station, customer portal) and the five bifurcated auth
// pages. Loads the portal fonts and applies the scoped .pawz-theme token set
// so the public website's root tokens are never touched.
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
      {children}
    </div>
  );
}
