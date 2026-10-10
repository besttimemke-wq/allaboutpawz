import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, BookOpen, PawPrint } from "lucide-react"
import { SITE_URL } from "@/lib/site-url"

export const metadata: Metadata = {
  title: "Pet Care Guides by Animal | Pawzsly U",
  description: "Find practical care and supply guides for dogs, fish, birds, reptiles, and small animals.",
  alternates: { canonical: `${SITE_URL}/pawzsly-u/memphis` },
}

const petGuides = [
  { number: "01", name: "Dogs", description: "Breed grooming, everyday care, nutrition, and supplies.", href: "/dog-breeds", linkText: "Choose a breed", accent: "border-t-orange-600" },
  { number: "02", name: "Cats", description: "Grooming, nutrition, enrichment, and everyday care for cats.", href: "/kittens-first-groom", linkText: "Browse cat guides", accent: "border-t-violet-700" },
  { number: "03", name: "Fish & Aquatics", description: "Aquariums, water care, filtration, food, and habitat gear.", href: "/fish-and-aquatics", linkText: "Browse aquatics", accent: "border-t-cyan-700" },
  { number: "04", name: "Birds", description: "Cages, perches, food, enrichment, and daily care.", href: "/bird", linkText: "Browse bird guides", accent: "border-t-amber-600" },
  { number: "05", name: "Reptiles", description: "Habitats, lighting, heating, substrates, and supplies.", href: "/reptile", linkText: "Browse reptile guides", accent: "border-t-emerald-700" },
  { number: "06", name: "Small Animals", description: "Guides to food, bedding, habitats, litter, and enrichment.", href: "/small-animal", linkText: "Browse small animal guides", accent: "border-t-orange-700" },
]

const featuredArticles = [
  { eyebrow: "DOG GROOMING", title: "Doodle coat care and grooming", description: "Brushing, mat prevention, bath timing, and salon cut basics.", href: "/doodle-grooming" },
  { eyebrow: "FIRST GROOM", title: "Preparing a puppy for its first groom", description: "A calm, step-by-step introduction to the grooming routine.", href: "/puppys-first-groom" },
  { eyebrow: "CAT GROOMING", title: "A gentle guide to a kitten’s first groom", description: "Build comfort with handling, tools, and a first appointment.", href: "/kittens-first-groom" },
]

const routeFor = (path: string) => {
  if (path === "/guides" || path === "/dog-breeds" || path === "/kittens-first-groom") return path
  return `/pawzsly-u/memphis${path}`
}

export default function PawzslyUMemphisPage() {
  return (
    <div className="min-h-screen bg-white text-stone-900">
      <main className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-2 border-b border-stone-200 py-3 text-xs text-stone-500" aria-label="Breadcrumb">
          <Link href="/" className="font-semibold text-stone-700 hover:text-orange-700">Home</Link>
          <span aria-hidden="true">/</span>
          <span className="text-stone-900">Pawzsly U</span>
        </nav>
        <section className="my-5 grid overflow-hidden bg-[#f1f2ed] md:grid-cols-[1.08fr_0.92fr] lg:my-8">
          <div className="flex flex-col items-start justify-center px-6 py-9 sm:px-10 sm:py-12 lg:px-14 lg:py-16">
            <p className="mb-4 text-xs font-bold uppercase text-orange-800">Pawzsly U · Pet care library</p>
            <h1 className="max-w-2xl text-3xl font-black leading-tight text-stone-950 sm:text-4xl lg:text-5xl">Pet care guides, organized by animal.</h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-stone-700 sm:text-base">Start with the pet you care for. Explore practical articles, care topics, and supply guides without digging through an unrelated list.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="#pet-guides" className="inline-flex min-h-11 items-center gap-2 bg-stone-950 px-5 text-sm font-bold text-white transition-colors hover:bg-orange-800">Find your pet’s guides <ArrowRight className="h-4 w-4" /></Link>
              <Link href={routeFor("/guides")} className="inline-flex min-h-11 items-center gap-2 border border-stone-400 px-5 text-sm font-bold text-stone-900 transition-colors hover:bg-white"><BookOpen className="h-4 w-4" /> All articles</Link>
            </div>
          </div>
          <div className="relative min-h-56 sm:min-h-72 md:min-h-full">
            <Image src="/seopages/images/hero_grooming_dog_1791411047518.jpg" alt="A freshly groomed dog in a salon" fill priority sizes="(max-width: 768px) 100vw, 46vw" className="object-cover" />
          </div>
        </section>
        <section id="pet-guides" className="scroll-mt-24 py-7 sm:py-10">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-stone-200 pb-4">
            <div><p className="text-xs font-bold uppercase text-stone-500">Browse by pet</p><h2 className="mt-1 text-2xl font-black text-stone-950 sm:text-3xl">Where should we start?</h2></div>
            <PawPrint className="mb-1 h-6 w-6 text-orange-700" aria-hidden="true" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
            {petGuides.map((pet) => <article key={pet.number} className={`flex min-h-48 flex-col border border-stone-200 border-t-[3px] ${pet.accent} p-4`}><p className="text-[10px] font-bold tabular-nums text-stone-500">{pet.number} / 05</p><h3 className="mt-3 text-lg font-extrabold text-stone-950">{pet.name}</h3><p className="mt-2 flex-1 text-xs leading-relaxed text-stone-600">{pet.description}</p><Link href={routeFor(pet.href)} className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-stone-900 hover:text-orange-800">{pet.linkText} <ArrowRight className="h-3.5 w-3.5" /></Link></article>)}
          </div>
        </section>
        <section className="grid gap-8 border-t border-stone-200 py-8 sm:py-10 lg:grid-cols-[0.75fr_1.25fr]">
          <div><p className="text-xs font-bold uppercase text-stone-500">From the library</p><h2 className="mt-1 text-2xl font-black text-stone-950">Useful reads to get you started</h2><Link href={routeFor("/guides")} className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-orange-800 hover:text-stone-950">Explore the full guide directory <ArrowRight className="h-3.5 w-3.5" /></Link></div>
          <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-3">
            {featuredArticles.map((article) => <Link key={article.href} href={routeFor(article.href)} className="group border-t border-stone-300 py-4"><p className="text-[10px] font-bold text-orange-800">{article.eyebrow}</p><h3 className="mt-2 text-sm font-bold leading-snug text-stone-950 group-hover:text-orange-800">{article.title}</h3><p className="mt-2 text-xs leading-relaxed text-stone-600">{article.description}</p></Link>)}
          </div>
        </section>
      </main>
    </div>
  )
}
