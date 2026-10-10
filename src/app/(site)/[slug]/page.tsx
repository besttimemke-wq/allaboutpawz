import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowRight } from "lucide-react"
import { PageHeader } from "@/components/site/site-chrome"
import { footerDestination } from "@/lib/footer-destinations"
import { SITE_URL } from "@/lib/site-url"

type PageProps = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  return Object.keys((await import("@/lib/footer-destinations")).FOOTER_DESTINATIONS).map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const destination = footerDestination(slug)
  if (!destination) return {}
  return {
    title: `${destination.title} | All About Pawz`,
    description: destination.description,
    alternates: { canonical: `${SITE_URL}/${slug}` },
  }
}

export default async function FooterDestinationPage({ params }: PageProps) {
  const { slug } = await params
  const destination = footerDestination(slug)
  if (!destination) notFound()

  return (
    <>
      <PageHeader n="INFO" label={destination.title.toUpperCase()} />
      <section className="marble bg-cream px-8 py-20 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-3xl">
          <p className="eyebrow">ALL ABOUT PAWZ</p>
          <h1 className="mt-3 font-display text-[46px] leading-[1.08] text-ink lg:text-[60px]">{destination.title}</h1>
          <p className="mt-6 max-w-2xl text-[15px] leading-[1.85] text-ink-soft">{destination.description}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/contact" className="btn-gold">CONTACT US <ArrowRight className="ml-2 h-4 w-4" /></Link>
            <Link href="/about" className="btn-ghost">ABOUT ALL ABOUT PAWZ</Link>
          </div>
        </div>
      </section>
    </>
  )
}
