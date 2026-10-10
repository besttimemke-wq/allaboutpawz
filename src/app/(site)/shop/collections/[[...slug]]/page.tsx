import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowRight, ChevronRight, PawPrint } from "lucide-react"
import { PageHeader } from "@/components/site/site-chrome"
import { COLLECTION_THEMES, collectionTheme } from "@/lib/shop/collection-themes"
import { SITE_URL } from "@/lib/site-url"

type PageProps = { params: Promise<{ slug?: string[] }> }

function pathFrom(slug?: string[]) {
  return slug?.join("/") || ""
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const theme = collectionTheme(pathFrom((await params).slug))
  if (!theme) return { title: "Collections | All About Pawz" }
  return {
    title: `${theme.title} | All About Pawz`,
    description: theme.description,
    alternates: { canonical: `${SITE_URL}/shop/collections/${theme.path}` },
  }
}

export default async function CollectionsPage({ params }: PageProps) {
  const path = pathFrom((await params).slug)
  if (path && !collectionTheme(path)) notFound()
  const theme = path ? collectionTheme(path) : null

  if (!theme) {
    return (
      <>
        <PageHeader n="06" label="SHOP / COLLECTIONS" />
        <section className="border-b border-stone-200 bg-[#f1f2ed] px-6 py-12 lg:px-12 lg:py-16">
          <div className="mx-auto max-w-7xl">
            <p className="text-xs font-bold uppercase tracking-wider text-orange-800">Special occasions</p>
            <h1 className="mt-3 text-4xl font-black leading-tight text-stone-950 lg:text-6xl">Shop the moment.</h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-stone-700">Explore themed collections for celebrations, seasons, new routines, and the everyday moments that deserve something special.</p>
          </div>
        </section>
        <section className="bg-white px-6 py-10 lg:px-12 lg:py-14">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {COLLECTION_THEMES.map((item) => (
                <Link key={item.path} href={`/shop/collections/${item.path}`} className="group border border-stone-300 bg-white p-5 transition-colors hover:border-orange-600">
                  <PawPrint className="h-6 w-6 text-orange-700" strokeWidth={1.2} aria-hidden="true" />
                  <h2 className="mt-6 text-lg font-bold text-stone-950 group-hover:text-orange-800">{item.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-stone-700">{item.description}</p>
                  <span className="mt-5 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-900">Explore theme <ArrowRight className="h-3.5 w-3.5" /></span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </>
    )
  }

  return (
    <>
      <PageHeader n="06" label="SHOP / COLLECTIONS" />
      <section className="border-b border-stone-200 bg-[#f1f2ed] px-6 py-12 lg:px-12 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <nav className="flex items-center gap-2 text-xs text-stone-600" aria-label="Breadcrumb">
            <Link href="/shop" className="hover:text-stone-950">Shop</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href="/shop/collections" className="hover:text-stone-950">Collections</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span>{theme.title}</span>
          </nav>
          <p className="mt-10 text-xs font-bold uppercase tracking-wider text-orange-800">Special occasion collection</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-black leading-tight text-stone-950 lg:text-6xl">{theme.title}</h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-stone-700">{theme.description}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/shop/dog" className="inline-flex min-h-11 items-center bg-stone-950 px-5 text-sm font-bold text-white transition-colors hover:bg-orange-800">Shop for dogs</Link>
            <Link href="/shop/cat" className="inline-flex min-h-11 items-center border border-stone-400 px-5 text-sm font-bold text-stone-950 transition-colors hover:bg-white">Shop for cats</Link>
          </div>
        </div>
      </section>
      <section className="bg-white px-6 py-10 lg:px-12 lg:py-14">
        <div className="mx-auto grid max-w-7xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/shop/dog" className="border border-stone-300 p-6 transition-colors hover:border-orange-600"><p className="text-xs font-bold uppercase tracking-wider text-orange-800">Start here</p><h2 className="mt-3 text-xl font-bold text-stone-950">Dog essentials</h2><p className="mt-2 text-sm leading-relaxed text-stone-700">Build this theme around your dog&apos;s favorite care, play, and comfort picks.</p></Link>
          <Link href="/shop/cat" className="border border-stone-300 p-6 transition-colors hover:border-orange-600"><p className="text-xs font-bold uppercase tracking-wider text-orange-800">Start here</p><h2 className="mt-3 text-xl font-bold text-stone-950">Cat essentials</h2><p className="mt-2 text-sm leading-relaxed text-stone-700">Find cat-friendly care, play, and comfort for the occasion.</p></Link>
          <Link href="/shop" className="border border-stone-300 p-6 transition-colors hover:border-orange-600"><p className="text-xs font-bold uppercase tracking-wider text-orange-800">Browse all</p><h2 className="mt-3 text-xl font-bold text-stone-950">Every pet, every moment</h2><p className="mt-2 text-sm leading-relaxed text-stone-700">Explore the full shop to complete your themed collection.</p></Link>
        </div>
      </section>
    </>
  )
}
