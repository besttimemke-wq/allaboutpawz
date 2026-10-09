// ---------------------------------------------------------------------------
// ShopHeroBento — the single category-navigation surface on shop landing /
// department pages. Replaces the old duplicate pattern (3 flat "+" cards in
// the hero + a "Shop by Category" carousel right below it showing the SAME
// categories). Now there is ONE surface: a mixed-tile bento grid.
//
// Layout reference: Chewy's department landing — clean open header (eyebrow,
// H1, one-liner), then an asymmetric image grid where one feature tile
// anchors the composition and smaller tiles fill the field. Sharp corners,
// navy #002B5C + gold #F2C500, full-bleed imagery, labels on a neutral
// black scrim (owner ruling: NO blue tint over the tile photos).
//
// Tile spans (grid-flow-dense packs holes automatically):
//   N=1        → one full-width banner
//   N=2        → two equal halves
//   N=3        → feature (2x2) + two stacked wides on the right
//   N>=4       → feature (2x2), then cycling [1x1, 1x1, wide 2x1]
// Mobile collapses to a 2-col grid with the same classes (feature = full
// width, wides = full width, 1x1 = half).
// ---------------------------------------------------------------------------

import Link from "next/link"
import { ArrowRight } from "lucide-react"

export type BentoTile = {
  name: string
  href: string
  image?: string
  imageAlt: string
  /** Short line under the name on feature/wide tiles (a one-sentence description or product count). */
  note?: string
  /** Solid-navy tile (no image) for collection/service plugs inside the grid. */
  accent?: boolean
}

function tileSpan(index: number, total: number): string {
  if (total === 1) return "col-span-2 row-span-2 lg:col-span-4"
  if (index === 0 || total === 2) return "col-span-2 row-span-2"
  if (total === 3) return "col-span-2"
  const k = index - 1
  return k % 3 === 2 ? "col-span-2" : "col-span-1"
}

function BentoCard({ tile, index, total }: { tile: BentoTile; index: number; total: number }) {
  const span = tileSpan(index, total)
  const isFeature = index === 0 || total <= 2
  const isWide = isFeature || span.includes("col-span-2")
  const showNote = (isWide && tile.note) || ""

  return (
    <Link
      href={tile.href}
      className={`group relative overflow-hidden bg-neutral-100 ${span}`}
      aria-label={tile.name}
    >
      {tile.image && !tile.accent ? (
        <img
          src={tile.image}
          alt={tile.imageAlt}
          loading={index <= 1 ? "eager" : "lazy"}
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        />
      ) : (
        <div className="absolute inset-0 bg-[#002B5C] transition-colors duration-300 group-hover:bg-[#0A3A73]" aria-hidden="true" />
      )}
      {!tile.accent && (
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"
          aria-hidden="true"
        />
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3 lg:p-4">
        <div className="min-w-0">
          <p
            className={`font-semibold leading-tight text-white ${
              isFeature ? "text-[16px] lg:text-[20px]" : isWide ? "text-[15px] lg:text-[17px]" : "text-[13px] lg:text-[14px]"
            }`}
          >
            {tile.name}
          </p>
          {showNote && (
            <p className="mt-0.5 line-clamp-1 text-[11px] text-white/75 lg:text-[12px]">{tile.note}</p>
          )}
        </div>
        {isWide && (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-[#F2C500] text-[#002B5C] transition-transform duration-300 group-hover:translate-x-0.5 lg:h-8 lg:w-8">
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
      </div>
      {/* Gold sweep on hover */}
      <span
        className="absolute bottom-0 left-0 h-[3px] w-0 bg-[#F2C500] transition-all duration-300 group-hover:w-full"
        aria-hidden="true"
      />
    </Link>
  )
}

export function ShopHeroBento({
  eyebrow,
  title,
  description,
  tiles,
  cta,
  headingTag = "h1",
}: {
  eyebrow: string
  title: string
  description: string
  tiles: BentoTile[]
  /** Optional right-aligned header link (e.g. "Shop all Dog Supplies" → grid anchor). */
  cta?: { label: string; href: string }
  /** Heading level — h2 when the bento sits on a page that already has an h1 (homepage). */
  headingTag?: "h1" | "h2"
}) {
  const Heading = headingTag
  return (
    <section className="px-6 pb-8 pt-5 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 lg:mb-5">
          <div className="max-w-2xl">
            <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-[#002B5C]/70">{eyebrow}</p>
            <Heading className="mt-1.5 font-display text-[32px] font-bold leading-tight text-[#002B5C] sm:text-[42px]">
              {title}
            </Heading>
            <p className="mt-2 text-[15px] leading-relaxed text-neutral-700 lg:text-[16px]">{description}</p>
          </div>
          {cta && tiles.length > 0 && (
            <Link
              href={cta.href}
              className="inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap text-[13px] font-bold uppercase tracking-[0.1em] text-[#002B5C] underline-offset-4 transition-colors hover:text-[#C79A00] hover:underline lg:text-[14px]"
            >
              {cta.label}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}
        </div>

        {tiles.length > 0 && (
          <div className="grid grid-flow-dense grid-cols-2 auto-rows-[108px] gap-2 sm:auto-rows-[130px] sm:gap-2.5 lg:grid-cols-4 lg:auto-rows-[152px] lg:gap-3">
            {tiles.map((tile, i) => (
              <BentoCard key={tile.href} tile={tile} index={i} total={tiles.length} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

/**
 * BentoGrid — just the tile grid, no header. Lets pages that render their own
 * band header in the local page design (e.g. the homepage's marble/cream
 * language) reuse the EXACT same bento tiles as /shop without inheriting the
 * shop landing's open header.
 */
export function BentoGrid({ tiles }: { tiles: BentoTile[] }) {
  if (tiles.length === 0) return null
  return (
    <div className="grid grid-flow-dense grid-cols-2 auto-rows-[108px] gap-2 sm:auto-rows-[130px] sm:gap-2.5 lg:grid-cols-4 lg:auto-rows-[152px] lg:gap-3">
      {tiles.map((tile, i) => (
        <BentoCard key={tile.href} tile={tile} index={i} total={tiles.length} />
      ))}
    </div>
  )
}
