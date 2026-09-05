import Link from "next/link"
import { Plus } from "lucide-react"
import { Divider } from "@/components/site/brand"
import { PageHeader } from "@/components/site/site-chrome"
import { HeroCtas } from "@/components/site/hero-ctas"
import { FaqAccordion } from "@/components/site/islands/faq-accordion"
import { getSiteContent } from "@/lib/site-data"

const policySlug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

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
      <section className="grid grid-cols-1 lg:grid-cols-[1fr_1.25fr] lg:min-h-[520px]">
        <div className="marble flex flex-col justify-center bg-cream px-8 py-16 lg:px-12">
          <h1 className="font-display text-[46px] leading-[1.08] text-ink lg:text-[58px]">Good<br />To Know.</h1>
          <div className="mt-6"><Divider /></div>
          <p className="mt-6 max-w-[330px] text-[12.5px] leading-[1.85] text-ink-soft">
            Everything you might want to ask before your first visit, and the house rules that keep every pup safe and every appointment on time.
          </p>
          <HeroCtas />
        </div>
        <div className="relative min-h-[300px]">
          <img
            src="/FAQ-Policies/faqhero-v3.jpeg"
            alt="Fluffy white poodle with blue-tipped ears and a blue bow tie sitting in the All About Pawz salon"
            width={1448}
            height={1206}
            className="absolute inset-0 h-full w-full object-cover object-bottom"
          />
        </div>
      </section>

      {/* SECTION TWO — thin band: four clickable policy boxes. Each box opens
          its own page (/policies/[slug]) so the owner can publish and update
          every policy from the admin portal. */}
      <section className="bg-ink px-8 py-8 lg:px-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="eyebrow-dark">HOUSE RULES</p>
          <p className="text-[11px] text-on-dark-muted">Tap a policy to read the full details</p>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {policies.map((p: any) => (
            <Link
              key={p.id}
              href={`/policies/${policySlug(p.title)}`}
              className="group flex items-center justify-between gap-4 border border-gold/25 px-6 py-5 transition-colors hover:border-gold-deep hover:bg-gold/5"
            >
              <div>
                <p className="text-[10.5px] font-bold tracking-[0.18em] text-gold">{p.title}</p>
                <p className="mt-1.5 text-[11px] leading-[1.6] text-on-dark-muted">Read the policy</p>
              </div>
              <Plus className="h-4 w-4 shrink-0 text-gold transition-transform duration-300 group-hover:rotate-45" strokeWidth={1.8} />
            </Link>
          ))}
        </div>
      </section>

      {/* FAQ RAIL — the schnauzer sits LEFT of the accordion, stretched to the
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
    </>
  )
}
