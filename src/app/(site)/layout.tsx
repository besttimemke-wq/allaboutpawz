import { SiteChrome } from "@/components/site/site-chrome"

// Fully static shell — SiteChrome (client) fetches salon settings itself
// after paint. No database in the render path of any public page.
// Pawzsly (AI triage) is mounted once in the root layout so it persists
// across the public site and the customer portal.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <SiteChrome>{children}</SiteChrome>
}
