import { Divider } from "@/components/site/brand"
import { PageHeader } from "@/components/site/site-chrome"
import { FaqAccordion } from "@/components/site/islands/faq-accordion"
import { getSiteContent } from "@/lib/site-data"

export default async function FaqPage() {
  const { faqs, policies } = await getSiteContent()
  return (
    <>
      <PageHeader n="11" label="FAQ / POLICIES" />
      {/* The FAQ hero image (white poodle) moved to the homepage third
          section — this hero is the reference type scale, viewport height. */}
      <section className="marble flex min-h-[calc(100svh-6.5rem)] flex-col justify-center bg-cream px-8 py-14 lg:min-h-[calc(100svh-3rem)] lg:px-12">
        <div className="max-w-[560px]">
          <h1 className="font-display text-[42px] leading-[1.08] text-ink lg:text-[52px]">Good<br />To Know.</h1>
          <Divider />
          <p className="mt-5 max-w-md text-[12.5px] leading-[1.9] text-ink-soft">
            Everything you might want to ask before your first visit, and the house rules that keep every pup safe and every appointment on time.
          </p>
        </div>
      </section>
      <section className="marble bg-cream px-8 pb-14 lg:px-12">
        <FaqAccordion faqs={faqs} />
      </section>
      <section className="grid grid-cols-1 items-stretch gap-10 bg-ink px-8 py-14 lg:grid-cols-[0.4fr_1fr] lg:px-12">
        {/* Transparent cutout — directly against the dark canvas, no container */}
        <img src="/FAQ-Policies/faq2.png" alt="Groomed miniature schnauzer with a happy smile" width={373} height={669} className="hidden h-full max-h-[460px] w-full self-start object-contain lg:block" />
        <div>
          <h2 className="font-display text-[26px] text-on-dark">Salon Policies</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {policies.map((p: any) => (
              <div key={p.id} className="border border-gold/25 p-6">
                <p className="text-[10px] font-bold tracking-[0.18em] text-gold">{p.title}</p>
                <p className="mt-3 text-[12px] leading-[1.8] text-on-dark-muted">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
