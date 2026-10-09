import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, ClipboardList, Droplets, HeartPulse, Printer } from "lucide-react"
import { PageHeader } from "@/components/site/site-chrome"
import { Divider } from "@/components/site/brand"
import { breadcrumbSchema } from "@/lib/business"
import { getAllSearchItems, type GuideSearchItem } from "@/lib/education/taxonomy-data"

// ---------------------------------------------------------------------------
// /pet-education/care-sheets — compact, print-friendly care sheets distilled
// from the wellness / feeding & watering / health pillars of the education
// library. Pure static data via getAllSearchItems(), zero DB, zero fetch.
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "Pet Care Sheets — Printable Wellness & Feeding Checklists | All About Pawz",
  description:
    "Free printable pet care sheets from All About Pawz Memphis — compact wellness, feeding & watering, and preventive health checklists reviewed by a consulting DVM.",
  alternates: { canonical: "/pet-education/care-sheets" },
  openGraph: {
    title: "Pet Care Sheets — Printable Wellness & Feeding Checklists | All About Pawz",
    description:
      "Compact, print-friendly pet care checklists for wellness, feeding, and preventive health — from the All About Pawz education library.",
    url: "/pet-education/care-sheets",
    type: "website",
  },
}

// The three care-sheet groups. GuideSearchItem.group comes from the pillar
// name (guides) or the product category name (supply guides).
const CARE_SHEET_GROUPS: { group: string; blurb: string; icon: typeof HeartPulse }[] = [
  {
    group: "Health & Wellness",
    blurb: "Preventive care protocols — vaccinations, parasite defense, dental & skin basics.",
    icon: HeartPulse,
  },
  {
    group: "Feeding & Watering",
    blurb: "Feeding hardware & hydration — bowls, fountains, feeders, and food storage.",
    icon: Droplets,
  },
  {
    group: "Wellness",
    blurb: "Supplement & remedy categories — joint care, dental care, itch & digestive support.",
    icon: ClipboardList,
  },
]

function CareSheetCard({ item }: { item: GuideSearchItem }) {
  return (
    <li>
      <Link
        href={item.url}
        className="group flex min-h-[44px] flex-col rounded border border-gold/25 bg-white p-4 transition-colors hover:border-gold-deep hover:bg-cream/40"
      >
        <span className="flex items-start justify-between gap-3">
          <span className="text-[14px] font-bold leading-snug text-[#002B5C] group-hover:underline">
            {item.name}
          </span>
          <ArrowRight
            className="mt-0.5 h-4 w-4 shrink-0 text-[#002B5C] transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </span>
        <span className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">
          {item.group} care sheet
        </span>
      </Link>
    </li>
  )
}

export default function PetEducationCareSheetsPage() {
  const items = getAllSearchItems()
  const grouped = CARE_SHEET_GROUPS.map((g) => ({
    ...g,
    items: items.filter((i) => i.group === g.group),
  })).filter((g) => g.items.length > 0)
  const totalSheets = grouped.reduce((n, g) => n + g.items.length, 0)

  const breadcrumb = breadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Pet Education Center", url: "/pet-education" },
    { name: "Pet Care Sheets", url: "/pet-education/care-sheets" },
  ])

  return (
    <>
      <PageHeader n="05" label="PET EDUCATION CENTER · CARE SHEETS" />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      {/* Intro */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 pb-10 pt-14 lg:px-12 lg:pt-20">
          <nav className="flex items-center gap-2 text-sm text-ink-soft" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-black">Home</Link>
            <span className="text-black/40">/</span>
            <Link href="/pet-education" className="hover:text-black">Pet Education Center</Link>
            <span className="text-black/40">/</span>
            <span className="text-ink">Pet Care Sheets</span>
          </nav>

          <h1 className="mt-6 font-display text-[34px] leading-[1.15] text-[#002B5C] lg:text-[44px]">
            Pet Care Sheets
          </h1>
          <div className="mt-4"><Divider /></div>
          <p className="mt-6 max-w-3xl text-base leading-[1.85] text-ink-soft">
            Care sheets are the fridge-door version of our full guides: {totalSheets} compact,
            print-friendly checklists covering wellness, feeding &amp; watering, and preventive
            health. Each one distills a complete veterinary-reviewed guide into the essentials —
            open a sheet, print it, and keep it with your pet&rsquo;s supplies.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 rounded border border-gold/30 bg-cream/40 px-3 py-2 text-xs text-ink-soft">
            <Printer className="h-4 w-4 text-[#002B5C]" aria-hidden="true" />
            Tip: every sheet opens as a clean article page — use your browser&rsquo;s print
            function for a tidy handout for sitters, family, or the vet.
          </p>
        </div>
      </section>

      {/* Care sheet groups */}
      {grouped.map((group, groupIndex) => {
        const Icon = group.icon
        return (
          <section
            key={group.group}
            className={`border-t border-gold/20 ${groupIndex % 2 === 0 ? "bg-white" : "bg-cream/30"}`}
          >
            <div className="mx-auto max-w-6xl px-6 py-12 lg:px-12">
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cream-deep/70">
                  <Icon className="h-5 w-5 text-[#002B5C]" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-display text-[24px] text-[#002B5C] lg:text-[28px]">{group.group}</h2>
                  <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-soft">{group.blurb}</p>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-ink-soft">
                    {group.items.length} sheet{group.items.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>

              <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((item) => (
                  <CareSheetCard key={item.url} item={item} />
                ))}
              </ul>
            </div>
          </section>
        )
      })}

      {/* Cross-links */}
      <section className="bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 py-12 text-center lg:px-12">
          <h2 className="font-display text-[22px] text-[#002B5C]">Want the full depth behind these sheets?</h2>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/pet-education/articles"
              className="inline-flex min-h-[44px] items-center gap-2 rounded border border-gold-deep/40 px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-gold-deep hover:bg-cream-deep"
            >
              Browse all articles
            </Link>
            <Link
              href="/book/appointment"
              className="inline-flex min-h-[44px] items-center gap-2 rounded bg-gold-deep px-5 py-2.5 text-sm font-bold text-cream transition-colors hover:bg-gold"
            >
              Book a groom in Memphis
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
