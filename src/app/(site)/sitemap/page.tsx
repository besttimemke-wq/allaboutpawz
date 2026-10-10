import Link from "next/link"
import { Divider } from "@/components/site/brand"
import { PageHeader } from "@/components/site/site-chrome"
import { SHOP_NAV_TAXONOMY, departmentPath, subcategoryPath } from "@/lib/shop-nav"
import { getAllSlugs, getGuideDataBySlug } from "@/lib/pawsly-u/taxonomy-data"
import { SITE_URL } from "@/lib/site-url"
import { CITY_LANDINGS, SHELBY_HUB } from "@/lib/business"

export const metadata = {
  title: "Sitemap | All About Pawz",
  description: "Every page of All About Pawz — the full shop catalog, grooming services, booking, locations, guides, learning academy, collections, and policies.",
  robots: { index: false, follow: true },
  alternates: { canonical: `${SITE_URL}/sitemap` },
}

// Department block for shop taxonomy sections
function DepartmentBlock({ dept, animalSlug }: { dept: { slug: string; name: string; subcategories: { slug: string; name: string }[] }; animalSlug: string }) {
  return (
    <div className="mb-8">
      <Link href={departmentPath(animalSlug, dept.slug)} className="text-base font-bold text-ink hover:text-black">{dept.name}</Link>
      {dept.subcategories.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {dept.subcategories.map(sub => (
            <li key={sub.slug}><Link href={subcategoryPath(animalSlug, dept.slug, sub.slug)} className="text-sm leading-relaxed text-ink-soft hover:text-black">{sub.name}</Link></li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Simple link list section
function LinkSection({ heading, links }: { heading: string; links: { label: string; href: string }[] }) {
  return (
    <section className="mb-12">
      <h2 className="text-lg font-bold text-ink">{heading}</h2>
      <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
        {links.map(l => (
          <li key={l.href}><Link href={l.href} className="text-sm text-ink-soft hover:text-black">{l.label}</Link></li>
        ))}
      </ul>
    </section>
  )
}

// 3-column grid section for collections
function CollectionSection({ heading, links }: { heading: string; links: { label: string; href: string }[] }) {
  return (
    <section className="mb-12">
      <h2 className="text-lg font-bold text-ink">{heading}</h2>
      <div className="mt-4 grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
        {links.map(l => (
          <Link key={l.href} href={l.href} className="block py-1 text-sm text-ink-soft hover:text-black">{l.label}</Link>
        ))}
      </div>
    </section>
  )
}

export default function SitemapPage() {
  const salonLinks = [
    { label: "Home", href: "/" }, { label: "About Us", href: "/about" },
    { label: "Services", href: "/services" }, { label: "Our Process", href: "/process" },
    { label: "Pricing", href: "/pricing" }, { label: "Gallery", href: "/gallery" },
    { label: "Contact", href: "/contact" }, { label: "FAQ & Policies", href: "/faq" },
  ]
  const bookingLinks = [
    { label: "Booking Overview", href: "/book" },
    { label: "Book Appointment", href: "/book/appointment" },
    { label: "Free Consultation", href: "/book/consultation" },
  ]
  const locationLinks = [
    ...CITY_LANDINGS.map(c => ({ label: c.titleShort, href: `/grooming/${c.slug}` })),
    { label: SHELBY_HUB.titleShort, href: `/grooming/${SHELBY_HUB.slug}` },
  ]
  const policyLinks = [
    { label: "Cancellations", href: "/policies/cancellations" },
    { label: "Late Arrivals", href: "/policies/late-arrivals" },
    { label: "Matted Coats", href: "/policies/matted-coats" },
    { label: "Privacy Policy", href: "/policies/privacy-policy" },
    { label: "Refunds & Returns", href: "/policies/refunds-returns" },
    { label: "Shipping & Delivery", href: "/policies/shipping-delivery" },
    { label: "Terms of Service", href: "/policies/terms-of-service" },
    { label: "Terms of Use", href: "/policies/terms-of-use" },
    { label: "Your Privacy Choices", href: "/policies/privacy-choices" },
    { label: "Vaccinations", href: "/policies/vaccinations" },
  ]
  const learnLinks = [
    { label: "Learning Academy", href: "/learn" },
    { label: "Course Catalog", href: "/learn/courses" },
    { label: "Classroom", href: "/learn/classroom" },
    { label: "Enroll", href: "/learn/enroll" },
    { label: "Animal Behavior Technician", href: "/learn/courses/animal-behavior-technician" },
    { label: "Animal Care Assistant", href: "/learn/courses/animal-care-assistant" },
    { label: "Equine Nursing Technicians", href: "/learn/courses/equine-nursing-technicians" },
    { label: "Felines & Health", href: "/learn/courses/felines-and-health" },
    { label: "Pet Grooming", href: "/learn/courses/pet-grooming" },
    { label: "Grooming Salon Practice Management", href: "/learn/courses/grooming-salon-practice-management" },
    { label: "Professional Trainer", href: "/learn/courses/professional-trainer" },
    { label: "Pre-Veterinary Medicine", href: "/learn/courses/pre-veterinary-medicine" },
    { label: "Veterinary Assistant", href: "/learn/courses/veterinary-assistant" },
    { label: "Veterinary Practice Management", href: "/learn/courses/veterinary-practice-management" },
    { label: "Veterinary Pathology Technician", href: "/learn/courses/veterinary-pathology-technician" },
    { label: "Veterinary Surgical Technician", href: "/learn/courses/veterinary-surgical-technician" },
    { label: "Veterinary Technician", href: "/learn/courses/veterinary-technician" },
    { label: "Veterinary Technology", href: "/learn/courses/veterinary-technology" },
    { label: "Zookeeper Assistant", href: "/learn/courses/zookeeper-assistant" },
    { label: "Positive Dog Training", href: "/learn/courses/positive-dog-training" },
  ]
  const sellerLinks = [
    { label: "Seller Dashboard", href: "/seller" }, { label: "Seller Onboarding", href: "/seller/onboarding" },
    { label: "Seller Products", href: "/seller/products" }, { label: "Add Product", href: "/seller/products/new" },
    { label: "Seller Inventory", href: "/seller/inventory" }, { label: "Seller Orders", href: "/seller/orders" },
    { label: "Seller Pricing", href: "/seller/pricing" }, { label: "Seller Promotions", href: "/seller/promotions" },
    { label: "Seller Advertising", href: "/seller/advertising" }, { label: "Seller Reports", href: "/seller/reports" },
    { label: "Seller Payments", href: "/seller/payments" }, { label: "Seller Performance", href: "/seller/performance" },
    { label: "Seller Messages", href: "/seller/messages" }, { label: "Seller Settings", href: "/seller/settings" },
  ]
  const collectionLinks = [
    { label: "$10 & Under My Human Favorites", href: "/shop/collections/my-human-favorites" },
    { label: "Back to School", href: "/shop/collections/back-to-school" },
    { label: "Better for Your Dog", href: "/shop/collections/better-for-your-dog" },
    { label: "Birthday", href: "/shop/collections/birthday" },
    { label: "Pet Birthday Cakes & Treats", href: "/shop/collections/birthday/pet-birthday-cakes-treats" },
    { label: "Pet Birthday Hats & Outfits", href: "/shop/collections/birthday/pet-birthday-hats-outfits" },
    { label: "Pet Birthday Party Supplies & Gifts", href: "/shop/collections/birthday/pet-birthday-party-supplies-gifts" },
    { label: "Pet Birthday Toys", href: "/shop/collections/birthday/pet-birthday-toys" },
    { label: "Easter", href: "/shop/collections/easter" },
    { label: "Cat Easter", href: "/shop/collections/easter/cat-easter" },
    { label: "Dog Easter", href: "/shop/collections/easter/dog-easter" },
    { label: "Exclusively by All About Pawz", href: "/shop/collections/exclusively-by-all-about-pawz" },
    { label: "Fall", href: "/shop/collections/fall" },
    { label: "Cozy Beds, Furniture & More", href: "/shop/collections/fall/cozy-beds-furniture-more" },
    { label: "Fall Flavors", href: "/shop/collections/fall/fall-flavors" },
    { label: "Fall Pet Apparel", href: "/shop/collections/fall/fall-pet-apparel" },
    { label: "Travel Essentials", href: "/shop/collections/fall/travel-essentials" },
    { label: "Family Game Night", href: "/shop/collections/family-game-night" },
    { label: "Father's Day", href: "/shop/collections/fathers-day" },
    { label: "Fourth of July", href: "/shop/collections/fourth-of-july" },
    { label: "Fresh Finds Under $20", href: "/shop/collections/fresh-finds-under-20" },
    { label: "Get Outside", href: "/shop/collections/get-outside" },
    { label: "Low Prices Everyday Essentials", href: "/shop/collections/low-prices-everyday-essentials" },
    { label: "Mother's Day", href: "/shop/collections/mothers-day" },
    { label: "New Pet Essentials", href: "/shop/collections/new-pet-essentials" },
    { label: "New", href: "/shop/collections/new" },
    { label: "New for Cats", href: "/shop/collections/new/new-for-cats" },
    { label: "New for Dogs", href: "/shop/collections/new/new-for-dogs" },
    { label: "New for Pet Parents", href: "/shop/collections/new/new-for-pet-parents" },
    { label: "All About Pawz Picks", href: "/shop/collections/all-about-pawz-picks" },
    { label: "Pride for Pets", href: "/shop/collections/pride-for-pets" },
    { label: "Spring", href: "/shop/collections/spring" },
    { label: "St. Patrick's Day", href: "/shop/collections/st-patricks-day" },
    { label: "Summer Adventures", href: "/shop/collections/summer-adventures" },
    { label: "Summer BBQ", href: "/shop/collections/summer-bbq" },
    { label: "Trending Now", href: "/shop/collections/trending-now" },
    { label: "Valentine's Day", href: "/shop/collections/valentines-day" },
    { label: "Winter", href: "/shop/collections/winter" },
  ]
  const guideLinks = getAllSlugs().map((slug) => {
    const guide = getGuideDataBySlug(slug, [slug])
    return { label: guide.heroTitle, href: `/pawsly-u/memphis/${slug}` }
  })

  return (
    <>
      <PageHeader n="12" label="SITEMAP" />
      <section className="bg-white px-6 py-16 sm:px-12 lg:px-16 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <h1 className="font-display text-[42px] leading-[1.08] text-ink lg:text-[54px]">Every Page, One Place.</h1>
          <div className="mt-4"><Divider /></div>
          <p className="mt-6 max-w-[460px] text-base leading-[1.85] text-ink-soft">
            The complete map of All About Pawz — the full shop catalog, grooming services, booking, locations, guides, learning academy, collections, seller program, and every policy.
            Search engines read the machine version at <Link href="/sitemap.xml" className="font-bold text-black underline hover:text-black">/sitemap.xml</Link>.
          </p>

          {/* Core site links */}
          <div className="mt-12 grid grid-cols-2 gap-x-10 gap-y-8 sm:grid-cols-4">
            <div>
              <h2 className="text-sm font-bold tracking-[0.18em] text-black">SALON</h2>
              <ul className="mt-3 space-y-2">{salonLinks.map(l => <li key={l.href}><Link href={l.href} className="text-sm text-ink-soft hover:text-black">{l.label}</Link></li>)}</ul>
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-[0.18em] text-black">BOOKING</h2>
              <ul className="mt-3 space-y-2">{bookingLinks.map(l => <li key={l.href}><Link href={l.href} className="text-sm text-ink-soft hover:text-black">{l.label}</Link></li>)}</ul>
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-[0.18em] text-black">SERVING</h2>
              <ul className="mt-3 space-y-2">{locationLinks.map(l => <li key={l.href}><Link href={l.href} className="text-sm text-ink-soft hover:text-black">{l.label}</Link></li>)}</ul>
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-[0.18em] text-black">POLICIES & LEGAL</h2>
              <ul className="mt-3 space-y-2">{policyLinks.map(l => <li key={l.href}><Link href={l.href} className="text-sm text-ink-soft hover:text-black">{l.label}</Link></li>)}</ul>
            </div>
          </div>

          {/* Shop taxonomy — Cat Supplies + Dog Supplies (3-column grid) */}
          {SHOP_NAV_TAXONOMY.map(animal => (
            <section key={animal.slug} className="mt-12">
              <Link href={`/shop/${animal.slug}`} className="font-display text-2xl font-bold text-ink hover:text-black">{animal.name}</Link>
              <div className="mt-6 grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
                {animal.departments.map(dept => <DepartmentBlock key={dept.slug} dept={dept} animalSlug={animal.slug} />)}
              </div>
            </section>
          ))}

          {/* Collections — Special Occasions */}
          <CollectionSection heading="Collections — Special Occasions" links={collectionLinks} />

          <CollectionSection heading="Pawsly U Pet Care Guides" links={guideLinks} />

          {/* Learning Academy */}
          <CollectionSection heading="Learning Academy" links={learnLinks} />

          {/* Seller */}
          <CollectionSection heading="Seller Program" links={sellerLinks} />
        </div>
      </section>
    </>
  )
}
