import { PageHeader } from "@/components/site/site-chrome"
import { HeroCtas } from "@/components/site/hero-ctas"
import { GalleryGrid, type GalleryPhoto } from "@/components/site/islands/gallery-grid"
import { getResource, getSettings } from "@/lib/site-data"

// Data-driven surface: SERVER-RENDERED from Supabase (gallery photos) and
// revalidated on the standard cadence. The hero and CTA chrome stay in code;
// the grid island only owns the filter tabs.
export const revalidate = 300

export const metadata = {
  title: "Grooming Gallery | All About Pawz",
  description: "Real pups, real grooms — browse transformations from the All About Pawz salon floor.",
}

export default async function GalleryPage() {
  const [photoRows, settings] = await Promise.all([
    getResource("gallery"),
    getSettings(),
  ])
  const photos: GalleryPhoto[] = photoRows.filter((p: any) => p.visible)

  return (
    <>
      <PageHeader n="08" label="GALLERY" />
      <section className="marble bg-cream px-8 py-14 lg:px-12">
        <h1 className="font-display text-[38px] leading-[1.1] text-ink">Happy Pups.<br />Happy Parents.<br />Beautiful Results.</h1>
        <p className="mt-5 max-w-[330px] text-[12.5px] leading-[1.85] text-ink-soft">Real pups, real grooms — straight from our salon floor.</p>
        <HeroCtas />
        <GalleryGrid photos={photos} instagram={settings.instagram} />
      </section>
    </>
  )
}
