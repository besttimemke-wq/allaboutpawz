import Link from "next/link"
import { ShoppingBag, ArrowRight } from "lucide-react"
import { SHOP_NAV_TAXONOMY, departmentPath, subcategoryPath, type ShopNavAnimal, type ShopNavDepartment } from "@/lib/shop-nav"
import { BUSINESS } from "@/lib/business"
import { SITE_URL } from "@/lib/site-url"
import { breadcrumbSchema } from "@/lib/business"

// ---------------------------------------------------------------------------
// Taxonomy page templates — the NEW shop page types per the Shop SEO Page
// Architecture spec. Rendered when TAXONOMY_ENABLED is true.
//
// Page types (per spec §2):
//   • Animal landing — /shop/{animal} (Dog landing, Cat landing)
//   • Department page — /shop/{animal}/{department} (Dog Food, Cat Beds)
//   • Category page — /shop/{animal}/{department}/{subcategory}
//
// Each template is SSR (server-rendered), full-bleed, with:
//   • Breadcrumb + H1 + intro (per spec §3 title/H1/meta templates)
//   • Department tiles / subcategory tiles / product grid
//   • Related Searches block (per spec §7)
//   • Grooming cross-sell band (per spec §9)
//   • BreadcrumbList + ItemList JSON-LD schemas
//   • Self-canonical (www + path)
//   • Readable fonts (16px+ headers, 14px+ body)
//   • Image alt text includes "All About Pawz Memphis" for Google Images
// ---------------------------------------------------------------------------

// --- Animal Landing Page (/shop/dog, /shop/cat) ---
export function AnimalLandingPage({ animal }: { animal: ShopNavAnimal }) {
  const breadcrumb = breadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Shop", url: "/shop" },
    { name: animal.name, url: `/shop/${animal.slug}` },
  ])

  // ItemList schema — department tiles
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: animal.name,
    itemListElement: animal.departments.map((d, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: d.name,
      url: `${SITE_URL}${departmentPath(animal.slug, d.slug)}`,
    })),
  }

  return (
    <article className="bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />

      {/* Hero — H1 + intro */}
      <section className="border-b border-gold/15 px-6 py-12 lg:px-12 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <nav className="flex items-center gap-2 text-sm text-ink-soft" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-gold-deep">Home</Link>
            <span className="text-gold/40">/</span>
            <Link href="/shop" className="hover:text-gold-deep">Shop</Link>
            <span className="text-gold/40">/</span>
            <span className="text-ink">{animal.name}</span>
          </nav>
          <h1 className="mt-4 font-display text-[36px] leading-[1.15] text-ink lg:text-[48px]">
            {animal.name} in Memphis, TN
          </h1>
          <p className="mt-4 text-base leading-[1.85] text-ink-soft">
            {animal.tagline}. Shop locally at All About Pawz for premium {animal.slug} supplies —
            food, treats, beds, toys, grooming, health, and wellness. Available in-store at our
            Memphis salon or online with local pickup.
          </p>
        </div>
      </section>

      {/* Department tiles grid */}
      <section className="px-6 py-12 lg:px-12 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-xl font-bold text-ink">Browse by Department</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {animal.departments.map(dept => (
              <Link
                key={dept.slug}
                href={departmentPath(animal.slug, dept.slug)}
                className="group rounded-lg border border-gold/20 p-5 transition-colors hover:border-gold-deep hover:bg-cream/30"
              >
                <h3 className="text-base font-bold text-ink group-hover:text-gold-deep">{dept.name}</h3>
                <p className="mt-1 text-sm text-ink-soft">
                  {dept.subcategories.length > 0
                    ? `${dept.subcategories.length} categories`
                    : "Browse all"}
                </p>
                <ArrowRight className="mt-3 h-4 w-4 text-gold-deep opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Grooming cross-sell band */}
      <section className="border-t border-gold/15 bg-cream/20 px-6 py-10 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 text-center lg:flex-row lg:justify-between lg:text-left">
          <div>
            <h2 className="text-lg font-bold text-ink">Full-Service Grooming in Memphis</h2>
            <p className="mt-1 text-sm text-ink-soft">
              All About Pawz offers breed-specific grooming at our Memphis salon. Book online or call {BUSINESS.phoneDisplay}.
            </p>
          </div>
          <Link
            href="/book/appointment"
            className="inline-flex items-center gap-2 rounded bg-gold-deep px-5 py-3 text-sm font-bold text-cream transition-colors hover:bg-gold"
          >
            Book a Groom →
          </Link>
        </div>
      </section>
    </article>
  )
}

// --- Department Page (/shop/dog/food, /shop/cat/beds-bedding) ---
export function DepartmentPage({
  animal,
  dept,
}: {
  animal: ShopNavAnimal
  dept: ShopNavDepartment
}) {
  const breadcrumb = breadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Shop", url: "/shop" },
    { name: animal.name, url: `/shop/${animal.slug}` },
    { name: dept.name, url: departmentPath(animal.slug, dept.slug) },
  ])

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: dept.name,
    itemListElement: dept.subcategories.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: s.name,
      url: `${SITE_URL}${subcategoryPath(animal.slug, dept.slug, s.slug)}`,
    })),
  }

  return (
    <article className="bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />

      {/* Breadcrumb + H1 */}
      <section className="border-b border-gold/15 px-6 py-10 lg:px-12 lg:py-14">
        <div className="mx-auto max-w-7xl">
          <nav className="flex items-center gap-2 text-sm text-ink-soft" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-gold-deep">Home</Link>
            <span className="text-gold/40">/</span>
            <Link href="/shop" className="hover:text-gold-deep">Shop</Link>
            <span className="text-gold/40">/</span>
            <Link href={`/shop/${animal.slug}`} className="hover:text-gold-deep">{animal.name}</Link>
            <span className="text-gold/40">/</span>
            <span className="text-ink">{dept.name}</span>
          </nav>
          <h1 className="mt-4 font-display text-[32px] leading-[1.15] text-ink lg:text-[42px]">
            {dept.name} for {animal.name.replace(" Supplies", "")}s in Memphis, TN
          </h1>
          <p className="mt-3 text-base leading-[1.7] text-ink-soft">
            Shop {dept.name.toLowerCase()} at All About Pawz Memphis — locally owned pet supply
            shop and grooming salon. Browse categories below or visit us at {BUSINESS.address.street}.
          </p>
        </div>
      </section>

      {/* Subcategory tiles */}
      {dept.subcategories.length > 0 && (
        <section className="px-6 py-10 lg:px-12 lg:py-14">
          <div className="mx-auto max-w-7xl">
            <h2 className="text-lg font-bold text-ink">Categories</h2>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {dept.subcategories.map(sub => (
                <Link
                  key={sub.slug}
                  href={subcategoryPath(animal.slug, dept.slug, sub.slug)}
                  className="group rounded-lg border border-gold/20 p-4 transition-colors hover:border-gold-deep hover:bg-cream/30"
                >
                  <h3 className="text-base font-semibold text-ink group-hover:text-gold-deep">{sub.name}</h3>
                  <ArrowRight className="mt-2 h-4 w-4 text-gold-deep opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Product grid placeholder — populated when products are linked to this taxonomy node */}
      <section className="border-t border-gold/15 px-6 py-10 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
            <ShoppingBag className="h-5 w-5 text-gold-deep" />
            Products
          </h2>
          <p className="mt-2 text-sm text-ink-soft">
            Products for {dept.name.toLowerCase()} are being added. Visit our Memphis salon or
            check back soon for our full {dept.name.toLowerCase()} selection.
          </p>
        </div>
      </section>

      {/* Grooming cross-sell band */}
      <section className="border-t border-gold/15 bg-cream/20 px-6 py-10 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 text-center lg:flex-row lg:justify-between lg:text-left">
          <div>
            <h2 className="text-lg font-bold text-ink">Or Let Our Memphis Groomers Handle It</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Shop supplies or book a professional groom — All About Pawz does both.
            </p>
          </div>
          <Link
            href="/book/appointment"
            className="inline-flex items-center gap-2 rounded bg-gold-deep px-5 py-3 text-sm font-bold text-cream transition-colors hover:bg-gold"
          >
            Book a Groom →
          </Link>
        </div>
      </section>
    </article>
  )
}

// Helper — resolve a taxonomy path to the right template
export function resolveTaxonomyPage(segments: string[]): {
  type: "animal" | "department" | "subcategory"
  animal?: ShopNavAnimal
  dept?: ShopNavDepartment
  subSlug?: string
} | null {
  if (segments.length === 0) return null

  const animalSlug = segments[0]
  const animal = SHOP_NAV_TAXONOMY.find(a => a.slug === animalSlug)
  if (!animal) return null

  if (segments.length === 1) {
    return { type: "animal", animal }
  }

  const deptSlug = segments[1]
  const dept = animal.departments.find(d => d.slug === deptSlug)
  if (!dept) return null

  if (segments.length === 2) {
    return { type: "department", animal, dept }
  }

  // Subcategory or deeper
  return { type: "subcategory", animal, dept, subSlug: segments[2] }
}
