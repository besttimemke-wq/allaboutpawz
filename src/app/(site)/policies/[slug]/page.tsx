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

// Built-in fallback so the privacy/cookie links from the consent system
// never 404 — applies until the owner publishes their own "Privacy Policy"
// from the admin portal (the DB row then takes precedence).
const BUILTIN_PRIVACY = {
  id: "builtin-privacy-policy",
  title: "Privacy Policy",
  body: [
    "All About Pawz LLC (“we”, “us”) operates aapawz.com. This policy explains what data we collect, the cookies we set, and the choices you control. It applies alongside our salon booking, retail, and customer portal services.",
    "",
    "COOKIE CATEGORIES",
    "On your first visit, a consent banner lets you Accept All Cookies, Reject Non-Essential, or Customize Preferences category by category in our Consent Management Center. You can change your choice anytime via the Cookie Preferences link in the site footer. Your decision is stored in a first-party consent cookie (pawz_cookie_consent) that never contains anything except your category choices, the time of the choice, and a random consent ID such as A4P-8B92-F1C3.",
    "",
    "1. Strictly Necessary & Essential — always active. Used for authentication, secure appointment booking, payment gateway tokenization, fraud detection, and keeping your session active. Typical tokens include session and CSRF protections and payment identifiers. Lifetime: session to 1 year. These cannot be disabled because the site cannot function securely without them.",
    "",
    "2. Functional & User Preferences — optional. Remembers personalization such as your selected groomer and breed preferences, preferred stylist, locale defaults, and interface state. Lifetime: up to 6 months.",
    "",
    "3. Performance & Analytics — optional. Aggregated, anonymized measurement of page performance and booking-flow drop-off via Google Analytics 4 and Cloudflare Web Insights. Lifetime: up to 13 months. Until you grant this category, our Google tag stays in Google Consent Mode v2 “denied” state — no analytics cookies (such as _ga) are created and no analytics hits are stored. Granting it loads the Google Analytics tag, which then sets its own cookies under Google's policies.",
    "",
    "YOUR CHOICES AND RIGHTS",
    "Because we use Google Consent Mode v2, your consent signals are communicated to Google directly, and GA4 stores nothing about you while analytics consent is denied. Under GDPR (EU) and CCPA (California) you may access, correct, export, or delete personal data we hold about you, withdraw consent at any time (Cookie Preferences in the footer), and lodge a complaint with your supervisory authority. Requests: help@aapawz.com.",
    "",
    "DATA WE HOLD AND RETENTION",
    "Account data (name, email), pet profiles, appointment history, and order records are retained while your account is active and for the period required by tax and consumer-protection law. Passwords are stored only as verified credentials we never see. We never sell personal data, and no advertising or cross-site tracking cookies are used on this site.",
    "",
    "CONTACT",
    "All About Pawz LLC · Memphis, TN · help@aapawz.com",
  ].join("\n"),
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
  const policy = (await getPolicy(slug)) ?? (slug === "privacy-policy" ? BUILTIN_PRIVACY : null)
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
