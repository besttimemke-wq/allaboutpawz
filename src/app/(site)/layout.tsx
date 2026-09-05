import { SiteChrome } from "@/components/site/site-chrome"

// Fully static shell — SiteChrome (client) fetches salon settings itself
// after paint. No database in the render path of any public page.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <SiteChrome>{children}</SiteChrome>
}
