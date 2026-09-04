import { PageHeader } from "@/components/site/site-chrome"
import { GalleryGrid } from "@/components/site/islands/gallery-grid"
import { getSiteContent } from "@/lib/site-data"

export default async function GalleryPage() {
  const { gallery, settings } = await getSiteContent()
  return (
    <>
      <PageHeader n="08" label="GALLERY" />
      <section className="marble bg-cream px-8 py-14 lg:px-12">
        <h1 className="font-display text-[38px] leading-[1.1] text-ink">Happy Pups.<br />Happy Parents.<br />Beautiful Results.</h1>
        <GalleryGrid photos={gallery} instagram={settings.instagram} />
      </section>
    </>
  )
}
