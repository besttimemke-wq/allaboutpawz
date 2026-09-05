import { PageHeader } from "@/components/site/site-chrome"
import { HeroCtas } from "@/components/site/hero-ctas"
import { GalleryGrid } from "@/components/site/islands/gallery-grid"

export default function GalleryPage() {
  // CSR architecture: static shell; the grid fetches its photos after paint.
  return (
    <>
      <PageHeader n="08" label="GALLERY" />
      <section className="marble bg-cream px-8 py-14 lg:px-12">
        <h1 className="font-display text-[38px] leading-[1.1] text-ink">Happy Pups.<br />Happy Parents.<br />Beautiful Results.</h1>
        <p className="mt-5 max-w-[330px] text-[12.5px] leading-[1.85] text-ink-soft">Real pups, real grooms — straight from our salon floor.</p>
        <HeroCtas />
        <GalleryGrid />
      </section>
    </>
  )
}
