import { Divider } from "@/components/site/brand"
import { PageHeader } from "@/components/site/site-chrome"
import { FaqAccordion } from "@/components/site/islands/faq-accordion"
import { getSiteContent } from "@/lib/site-data"

export default async function FaqPage() {
  const { faqs, policies } = await getSiteContent()
  return (
    <>
      <PageHeader n="11" label="FAQ / POLICIES" />
      <section className="marble bg-cream px-8 py-14 lg:px-12">
        <h1 className="font-display text-[38px] leading-[1.1] text-ink">Good<br />To Know.</h1>
        <Divider />
        <p className="mt-5 max-w-md text-[12.5px] leading-[1.9] text-ink-soft">
          Everything you might want to ask before your first visit, and the house rules that keep every pup safe and every appointment on time.
        </p>
        <FaqAccordion faqs={faqs} />
      </section>
      <section className="bg-ink px-8 py-14 lg:px-12">
        <h2 className="font-display text-[26px] text-on-dark">Salon Policies</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {policies.map((p: any) => (
            <div key={p.id} className="border border-gold/25 p-6">
              <p className="text-[10px] font-bold tracking-[0.18em] text-gold">{p.title}</p>
              <p className="mt-3 text-[12px] leading-[1.8] text-on-dark-muted">{p.body}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
