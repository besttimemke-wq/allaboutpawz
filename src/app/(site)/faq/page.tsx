import { Divider } from "@/components/site/brand"
import { PageHeader } from "@/components/site/site-chrome"
import { FaqAccordion } from "@/components/site/islands/faq-accordion"
import { getSiteContent } from "@/lib/site-data"

export default async function FaqPage() {
  const { faqs, policies } = await getSiteContent()
  return (
    <>
      <PageHeader n="11" label="FAQ / POLICIES" />
      <section className="marble grid grid-cols-1 items-center gap-10 bg-cream px-8 py-14 lg:grid-cols-[0.55fr_1fr] lg:px-12">
        <div className="order-2 border border-gold/25 bg-cream-deep lg:order-1">
          <img src="/FAQ-Policies/faq.png" alt="Fluffy white poodle with blue-tipped ears and a bow tie" width={432} height={578} className="h-full max-h-[420px] w-full object-contain" />
        </div>
        <div className="order-1 lg:order-2">
          <h1 className="font-display text-[38px] leading-[1.1] text-ink">Good<br />To Know.</h1>
          <Divider />
          <p className="mt-5 max-w-md text-[12.5px] leading-[1.9] text-ink-soft">
            Everything you might want to ask before your first visit, and the house rules that keep every pup safe and every appointment on time.
          </p>
        </div>
      </section>
      <section className="marble bg-cream px-8 pb-14 lg:px-12">
        <FaqAccordion faqs={faqs} />
      </section>
      <section className="grid grid-cols-1 gap-10 bg-ink px-8 py-14 lg:grid-cols-[0.4fr_1fr] lg:px-12">
        <div className="hidden self-start border border-gold/25 bg-ink-soft/40 lg:block">
          <img src="/FAQ-Policies/faq2.png" alt="Groomed miniature schnauzer with a happy smile" width={373} height={669} className="h-full max-h-[460px] w-full object-contain p-4" />
        </div>
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
