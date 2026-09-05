import { Divider } from "@/components/site/brand"
import { PageHeader } from "@/components/site/site-chrome"
import { FaqAccordion } from "@/components/site/islands/faq-accordion"
import { getSiteContent } from "@/lib/site-data"

export default async function FaqPage() {
  const { faqs, policies } = await getSiteContent()
  return (
    <>
      <PageHeader n="11" label="FAQ / POLICIES" />
      {/* Hero raised to the top, natural height. The white poodle (this is
          where the dog lives) sits in the left column, directly against the
          canvas — no container. */}
      <section className="marble grid grid-cols-1 items-stretch gap-10 bg-cream px-8 pt-6 pb-10 lg:grid-cols-[0.55fr_1fr] lg:px-12 lg:pt-8">
        <img src="/FAQ-Policies/faq.png" alt="Fluffy white poodle with blue-tipped ears and a bow tie" width={334} height={482} className="order-2 h-auto w-full self-end object-contain lg:order-1" />
        <div className="order-1 flex flex-col justify-center lg:order-2">
          <h1 className="font-display text-[42px] leading-[1.08] text-ink lg:text-[52px]">Good<br />To Know.</h1>
          <Divider />
          <p className="mt-5 max-w-md text-[12.5px] leading-[1.9] text-ink-soft">
            Everything you might want to ask before your first visit, and the house rules that keep every pup safe and every appointment on time.
          </p>
        </div>
      </section>
      {/* FAQ rail (accordion) with the brown dog directly opposite it in the
          right column — transparent cutout against the canvas. */}
      <section className="marble grid grid-cols-1 gap-10 bg-cream px-8 pb-14 lg:grid-cols-[1fr_0.32fr] lg:px-12">
        <div className="min-w-0">
          <FaqAccordion faqs={faqs} />
        </div>
        <img src="/Consultation/consultation.png" alt="Groomed apricot doodle sitting attentively beside the FAQ list" width={330} height={586} className="mx-auto h-auto max-h-[560px] w-full max-w-[300px] self-start object-contain lg:max-w-none" />
      </section>
      <section className="grid grid-cols-1 items-stretch gap-10 bg-ink px-8 py-14 lg:grid-cols-[0.4fr_1fr] lg:px-12">
        {/* Transparent cutout — directly against the dark canvas, no container */}
        <img src="/FAQ-Policies/faq2.png" alt="Groomed miniature schnauzer with a happy smile" width={318} height={597} className="hidden h-full max-h-[460px] w-full self-start object-contain lg:block" />
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
