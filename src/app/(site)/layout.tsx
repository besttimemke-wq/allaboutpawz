import { SiteChrome } from "@/components/site/site-chrome"
import { getSettings } from "@/lib/site-data"

// Server-rendered shell. Salon settings (address, phone, hours) are fetched
// ONCE on the server and passed down — the chrome renders complete HTML with
// no client-side settings fetch. The layout revalidates on the same cadence
// as the data-driven pages (ISR), so admin edits flow through within minutes.
export const revalidate = 300

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  let settings: Record<string, string> = {}
  try {
    settings = await getSettings()
  } catch {
    // The shell renders with its built-in code fallbacks when the
    // database is unreachable — the site never breaks.
  }
  return <SiteChrome settings={settings}>{children}</SiteChrome>
}
