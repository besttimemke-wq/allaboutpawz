import Link from "next/link"
import { Scissors } from "lucide-react"
import { PageHeader } from "@/components/site/site-chrome"
import { getIcon } from "@/lib/icons"
import { getSiteContent } from "@/lib/site-data"

export default async function ServicesPage() {
  const { services, settings } = await getSiteContent()
  return (
    <>
      <PageHeader n="03" label="SERVICES" />
      {/* Hero raised to the top, natural height; photo fills its column so the
          services grid sits tight beneath it. */}
      <section className="marble grid grid-cols-1 items-stretch gap-8 bg-cream px-8 pt-6 lg:grid-cols-[1fr_0.72fr] lg:px-12 lg:pt-8">
        <div className="flex flex-col justify-center pb-10">
          <h1 className="font-display text-[42px] leading-[1.08] text-ink lg:text-[52px]">Every Pup.<br />Every Breed.<br />Every Detail.</h1>
          <p className="mt-6 max-w-[330px] text-[12.5px] leading-[1.85] text-ink-soft">Premium grooming services tailored to your dog&apos;s breed, coat, and lifestyle.</p>
          <Link href="/pricing" className="btn-gold mt-7">VIEW PACKAGES</Link>
        </div>
        <img src="/services/serviceshero2.jpeg" alt="Groomed dog posed under warm salon lights" width={2752} height={1536} className="h-full min-h-[260px] w-full object-cover" />
      </section>
      <section className="marble bg-cream px-8 pb-14 pt-6 lg:px-12">
        <div className="divide-y divide-gold/20 border-y border-gold/25">
          {services.map(({ icon, title, description, image, alt }) => {
            const Icon = getIcon(icon, Scissors)
            return (
              <div key={title} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 py-3.5">
                <Icon className="h-7 w-7 text-gold-deep" strokeWidth={1.2} />
                <div>
                  <h2 className="text-[11.5px] font-bold tracking-[0.14em] text-ink">{title}</h2>
                  <p className="mt-1 max-w-[420px] text-[12px] leading-[1.6] text-ink-soft">{description}</p>
                </div>
                {image && (

                  <img src={image} alt={alt || title} width={640} height={512} className="h-[64px] w-[172px] object-cover" />
                )}
              </div>
            )
          })}
        </div>
      </section>
    </>
  )
}
