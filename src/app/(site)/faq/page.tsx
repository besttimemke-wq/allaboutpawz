import { Divider } from "@/components/site/brand"
import { PageHeader } from "@/components/site/site-chrome"
import { FaqAccordion } from "@/components/site/islands/faq-accordion"
import { getSiteContent } from "@/lib/site-data"

export const metadata = {
  title: "FAQ & Policies | All About Pawz",
  description: "Answers to the questions pet parents ask most — appointments, vaccines, matted coats, and the salon policies that keep every pup safe.",
}

export default async function FaqPage() {
  const { faqs, policies } = await getSiteContent()
  return (
    <>
      <PageHeader n="11" label="FAQ / POLICIES" />

      {/* HERO — site standard: centered text left, photo right filling the column. */}
      <section className="grid grid-cols-1 lg:grid-cols-[1fr_1.25fr]">
        <div className="marble flex flex-col justify-center bg-cream px-8 py-16 lg:px-12">
          <h1 className="font-display text-[42px] leading-[1.08] text-ink lg:text-[52px]">Good<br />To Know.</h1>
          <div className="mt-6"><Divider /></div>
          <p className="mt-6 max-w-[330px] text-[12.5px] leading-[1.85] text-ink-soft">
            Everything you might want to ask before your first visit, and the house rules that keep every pup safe and every appointment on time.
          </p>
        </div>
        <div className="relative min-h-[300px]">
          <img
            src="/FAQ-Policies/faqhero-v2.jpeg"
            alt="Fluffy white poodle with blue-tipped ears and a blue bow tie sitting in the All About Pawz salon"
            width={1448}
            height={1086}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      </section>

      {/* FAQ RAIL — positions swapped: the schnauzer (brought up from the
          policies band) now sits LEFT of the accordion, stretched to the
          accordion's full height; the accordion takes the right column. */}
      <section className="marble grid grid-cols-1 gap-10 bg-cream px-8 py-14 lg:grid-cols-[0.7fr_1fr] lg:px-12">
        <div className="relative hidden min-h-[200px] lg:block">
          <img
            src="/FAQ-Policies/faq2.png"
            alt="Groomed miniature schnauzer with a happy smile beside the FAQ list"
            width={318}
            height={597}
            className="absolute bottom-0 left-0 h-full w-full object-contain object-bottom"
          />
        </div>
        <div className="min-w-0">
          <FaqAccordion faqs={faqs} />
        </div>
      </section>

      {/* SALON POLICIES — black band pattern: heading column left, policy
          cards right (the schnauzer moved up to the FAQ rail). */}
      <section className="bg-ink px-8 py-14 lg:px-12">
        <div className="grid items-start gap-10 lg:grid-cols-[0.4fr_1fr]">
          <div>
            <p className="eyebrow-dark">HOUSE RULES</p>
            <h2 className="mt-3 font-display text-[26px] text-on-dark">Salon Policies</h2>
            <p className="mt-4 max-w-[290px] text-[12px] leading-[1.75] text-on-dark-muted">
              A few simple guidelines that keep the salon calm, safe, and right on schedule for every pup.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
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
