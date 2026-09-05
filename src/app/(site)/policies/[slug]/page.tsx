import Link from "next/link"
import { notFound } from "next/navigation"
import { Plus } from "lucide-react"
import { Divider } from "@/components/site/brand"
import { PageHeader } from "@/components/site/site-chrome"
import { getResource } from "@/lib/site-data"

type Policy = { id: string; title: string; body?: string }

// Slug is derived from the title (CANCELLATIONS → cancellations) so the
// owner can publish and update every policy from the admin portal — the
// pages render live from the `policies` table (dynamic per request, so a
// newly published policy is visible immediately with no rebuild).
export function policySlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

async function getPolicy(slug: string) {
  const policies = (await getResource<Policy>("policies")) || []
  return policies.find((p) => policySlug(p.title) === slug)
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const policy = await getPolicy(slug)
  return {
    title: policy ? `${policy.title} | All About Pawz` : "Policy | All About Pawz",
    description: policy?.body?.slice(0, 150) || "All About Pawz salon policies.",
  }
}

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const policy = await getPolicy(slug)
  if (!policy) notFound()

  const others = ((await getResource<Policy>("policies")) || []).filter((p) => p.id !== policy.id)

  return (
    <>
      <PageHeader n="11" label="FAQ / POLICIES" />

      {/* POLICY — spacious single-column reading page. */}
      <section className="marble bg-cream px-8 py-16 lg:px-12 lg:py-20">
        <div className="mx-auto max-w-[640px]">
          <p className="eyebrow">HOUSE RULES</p>
          <h1 className="mt-3 font-display text-[38px] leading-[1.1] text-ink lg:text-[46px]">{policy.title}</h1>
          <div className="mt-6"><Divider /></div>
          <div className="mt-8 space-y-5 text-[13px] leading-[1.9] text-ink-soft">
            {(policy.body || "").split(/\n+/).filter(Boolean).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link href="/book" className="btn-gold">BOOK A VISIT</Link>
            <Link href="/faq" className="btn-ghost">BACK TO FAQ</Link>
          </div>
        </div>
      </section>

      {/* OTHER POLICIES — the same thin clickable-box band from the FAQ page. */}
      {others.length > 0 && (
        <section className="bg-ink px-8 py-8 lg:px-12">
          <p className="eyebrow-dark">MORE HOUSE RULES</p>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {others.map((p) => (
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
      )}
    </>
  )
}
