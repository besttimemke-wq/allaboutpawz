import Link from "next/link"
import { Scissors } from "lucide-react"
import { PageHeader } from "@/components/site/site-chrome"
import { getIcon } from "@/lib/icons"
import { getSiteContent } from "@/lib/site-data"

export const metadata = {
  title: "Dog Grooming Services | All About Pawz",
  description: "Breed-specific haircuts, spa baths, and nail & paw care — gentle dog grooming services tailored to your pup's breed, coat, and lifestyle.",
}

export default async function ServicesPage() {
  const { services } = await getSiteContent()
  const featured = services.slice(0, 4)
  return (
    <>
      <PageHeader n="03" label="SERVICES" />
      {/* HERO — site standard (same placement as About/homepage): centered
          text left, image right filling the full column. Button uses
          self-start so it stays button-sized (no full-width stretch). */}
      <section className="grid grid-cols-1 lg:grid-cols-[1fr_1.25fr]">
        <div className="marble flex flex-col justify-center bg-cream px-8 py-16 lg:px-12">
          <h1 className="font-display text-[42px] leading-[1.08] text-ink lg:text-[52px]">Every Pup.<br />Every Breed.<br />Every Detail.</h1>
          <p className="mt-6 max-w-[330px] text-[12.5px] leading-[1.85] text-ink-soft">Premium grooming services tailored to your dog&apos;s breed, coat, and lifestyle.</p>
          <Link href="/pricing" className="btn-gold mt-7 self-start">VIEW PACKAGES</Link>
        </div>
        <div className="relative min-h-[300px]">
          <img src="/services/serviceshero.png" alt="White poodle sitting in the All About Pawz dog grooming salon" width={1448} height={1086} className="absolute inset-0 h-full w-full object-cover" />
        </div>
      </section>

      {/* SECOND SECTION — the homepage services band, copied to this page,
          with the headline replaced. */}
      <section className="bg-ink px-8 py-12 lg:px-12">
        <div className="grid items-center gap-10 lg:grid-cols-[0.85fr_2.4fr]">
          <div className="lg:border-r lg:border-gold/25 lg:pr-10">
            <p className="eyebrow-dark">OUR SERVICES</p>
            <h2 className="mt-3 font-display text-[30px] leading-[1.18] text-on-dark">Gentle Care.<br />Beautiful Results.<br />Happy Pups.</h2>
            <p className="mt-4 max-w-[290px] text-[12px] leading-[1.75] text-on-dark-muted">
              From breed-specific haircuts to relaxing spa baths, we offer a full range of grooming services tailored to your dog&apos;s unique needs.
            </p>
            <Link href="/book" className="btn-gold mt-6">BOOK APPOINTMENT</Link>
          </div>
          <div className="grid grid-cols-2 gap-y-10 lg:grid-cols-4">
            {featured.map(({ id, icon, title, description }, i) => {
              const Icon = getIcon(icon, Scissors)
              return (
                <div key={id} className={`px-6 text-center ${i > 0 ? "lg:border-l lg:border-gold/25" : ""}`}>
                  <Icon className="mx-auto h-10 w-10 text-gold" strokeWidth={1.2} />
                  <h3 className="mt-4 text-[11.5px] font-bold tracking-[0.15em] text-gold">{title}</h3>
                  <p className="mt-3 whitespace-pre-line text-[12px] leading-[1.7] text-on-dark-muted">{description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* FULL SERVICES LIST — enlarged grid: bigger images, text flows right
          up to the image (no dead white space between text and image). */}
      <section className="marble bg-cream px-8 py-10 lg:px-12">
        <div className="divide-y divide-gold/20 border-y border-gold/25">
          {services.map(({ id, icon, title, description, image, alt }) => {
            const Icon = getIcon(icon, Scissors)
            return (
              <div key={id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-6 py-5">
                <Icon className="h-8 w-8 text-gold-deep" strokeWidth={1.2} />
                <div>
                  <h2 className="text-[12px] font-bold tracking-[0.14em] text-ink">{title}</h2>
                  <p className="mt-1.5 text-[12.5px] leading-[1.7] text-ink-soft">{description}</p>
                </div>
                {image && (
                  <img src={image} alt={alt || `${title} dog grooming service at All About Pawz`} width={640} height={512} className="h-[130px] w-[340px] object-cover" />
                )}
              </div>
            )
          })}
        </div>
      </section>
    </>
  )
}
