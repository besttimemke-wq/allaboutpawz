import { SiteChrome } from "@/components/site/site-chrome"
import PawzlyChat from "@/components/site/islands/pawzly-chat"

// Fully static shell — SiteChrome (client) fetches salon settings itself
// after paint. No database in the render path of any public page.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <SiteChrome>
      {children}
      {/* Pawzly — the AI triage assistant, on every public page (owner
          directive: create + wire the triage AI section; the floating 🐾
          widget talks to the deployed `triage-chat` edge function). */}
      <PawzlyChat />
    </SiteChrome>
  )
}
