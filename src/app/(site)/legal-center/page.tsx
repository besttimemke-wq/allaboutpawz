import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { PageHeader } from "@/components/site/site-chrome"
import { LEGAL_DOCUMENTS } from "@/lib/legal-documents"
import { SITE_URL } from "@/lib/site-url"

const GROUPS = ["Appointments & salon", "Shopping & orders", "Privacy & website"] as const

export const metadata = {
  title: "Legal Center | All About Pawz",
  description: "Browse All About Pawz policies, terms, and legal information by purpose.",
  alternates: { canonical: `${SITE_URL}/legal-center` },
}

export default function LegalCenterPage() {
  return (
    <>
      <PageHeader n="LEGAL" label="LEGAL CENTER" />
      <section className="marble bg-cream px-8 py-12 lg:px-12 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <p className="eyebrow">POLICIES &amp; TERMS</p>
          <h1 className="mt-3 font-display text-[46px] leading-[1.08] text-ink lg:text-[60px]">Legal Center.</h1>
          <p className="mt-5 max-w-2xl text-[14px] leading-[1.85] text-ink-soft">Find the document that applies to your appointment, order, account, or use of this website.</p>
        </div>
      </section>
      <section className="bg-white px-8 py-10 lg:px-12 lg:py-14">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="h-fit border border-gold/25 bg-cream/40 p-5 lg:sticky lg:top-6">
            <p className="text-[10px] font-bold tracking-[0.16em] text-gold-deep">BROWSE BY PURPOSE</p>
            <nav className="mt-4 space-y-5" aria-label="Legal document groups">
              {GROUPS.map((group) => (
                <div key={group}>
                  <p className="text-[12px] font-semibold text-ink">{group}</p>
                  <ul className="mt-2 space-y-1">
                    {LEGAL_DOCUMENTS.filter((document) => document.group === group).map((document) => (
                      <li key={document.slug}><Link href={document.slug === "accessibility" ? "/accessibility" : `/policies/${document.slug}`} className="block py-1 text-[12px] leading-relaxed text-ink-soft hover:text-ink">{document.title}</Link></li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </aside>
          <div>
            {GROUPS.map((group) => (
              <section key={group} id={group.toLowerCase().replace(/[^a-z]+/g, "-")} className="scroll-mt-8 border-b border-gold/20 py-8 first:pt-0 last:border-b-0">
                <p className="eyebrow">{group}</p>
                <div className="mt-4 divide-y divide-gold/20 border-y border-gold/25">
                  {LEGAL_DOCUMENTS.filter((document) => document.group === group).map((document) => (
                    <Link key={document.slug} href={document.slug === "accessibility" ? "/accessibility" : `/policies/${document.slug}`} className="group flex items-center justify-between gap-6 bg-white px-2 py-5 transition-colors hover:bg-cream/40">
                      <div className="min-w-0"><h2 className="text-[16px] font-semibold text-ink">{document.title}</h2><p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-ink-soft">{document.description}</p></div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-gold-deep transition-transform group-hover:translate-x-1" />
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
