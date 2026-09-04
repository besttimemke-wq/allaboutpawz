import { getSettings } from "@/lib/site-data"
import { SiteChrome } from "@/components/site/site-chrome"

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings()
  return <SiteChrome settings={settings}>{children}</SiteChrome>
}
