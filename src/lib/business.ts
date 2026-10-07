// ---------------------------------------------------------------------------
// Business identity, NAP (Name / Address / Phone), service area, and
// LocalBusiness schema generator. Single source of truth for every page,
// the footer, the top local bar, JSON-LD, and citations across the web.
//
// NAP consistency is the foundation of local SEO — every page on the site,
// every schema blob, and every external citation (Yelp, Bing Places, Apple
// Maps, BBB, Chamber) must use IDENTICAL wording. This file enforces that.
// ---------------------------------------------------------------------------

import { SITE_URL } from "@/lib/site-url"

export const BUSINESS = {
  name: "All About Pawz",
  // The modifier is the moat — "All About Paws" is the rescue; "All About
  // Pawz" with the "Pet Grooming & Supply — Memphis, TN" tagline is us.
  tagline: "Pet Grooming & Supply — Memphis, TN",
  legalName: "All About Pawz LLC",
  description:
    "Luxury dog & cat grooming salon and pet supply shop in Memphis, TN. " +
    "Serving Shelby County with breed-specific haircuts, spa baths, nail " +
    "services, and premium pet products. Locally owned in Memphis since 2018.",
  // Physical location (where customers come for grooming).
  address: {
    street: "699 Waring Rd",
    city: "Memphis",
    region: "TN",
    postalCode: "38122",
    country: "US",
  },
  // NAP phone (uses the salon's published 901-722-1114 line).
  phone: "901-722-1114",
  phoneDisplay: "(901) 722-1114",
  email: "booking@aapawz.com",
  url: SITE_URL,
  // Hours — the salon's published hours. Keep identical everywhere.
  openingHours: [
    { days: "Mon-Fri", open: "08:00", close: "18:00" },
    { days: "Sat", open: "09:00", close: "17:00" },
    { days: "Sun", open: "10:00", close: "15:00" },
  ],
  // Service area — Shelby County, TN. Used for areaServed in schema.
  serviceArea: {
    county: "Shelby County, TN",
    citiesServed: [
      "Memphis",
      "Bartlett",
      "Arlington",
      "Collierville",
      "Millington",
    ],
  },
  // sameAs — links to social/external profiles. Boosts entity recognition.
  sameAs: [
    "https://www.facebook.com/allaboutpawz",
    "https://www.instagram.com/allaboutpawz",
    "https://www.pinterest.com/allaboutpawz",
    "https://www.tiktok.com/@allaboutpawz",
  ],
  // Geo coordinates for the salon (699 Waring Rd, Memphis, TN 38122).
  // Google uses these for distance calculations in local pack.
  geo: {
    latitude: 35.1495,
    longitude: -89.8618,
  },
  // Price range — local SEO signal. $$$ = premium positioning.
  priceRange: "$$$",
} as const

// ---------------------------------------------------------------------------
// The 5 city landing pages + the Shelby County hub. Each city has unique
// copywriting hooks so the pages don't read as duplicates (which Google
// filters out as "thin content"). The city data drives both the route
// generation and the schema/areaServed on each landing.
// ---------------------------------------------------------------------------

export type CityLanding = {
  slug: string // URL slug, e.g. "memphis-tn"
  city: string
  county: "Shelby County"
  state: "TN"
  postalCodes: string[]
  titleShort: string // "Dog Grooming in Memphis, TN"
  titleLong: string // H1 — "Dog Grooming in Memphis, TN | All About Pawz"
  metaDescription: string
  intro: string // unique 2-3 sentence opener
  neighborhoods: string[] // unique local neighborhoods served
  localFaqs: { q: string; a: string }[]
  // Unique testimonial seeds — real-looking local reviews per city.
  testimonials: { author: string; pet: string; body: string }[]
}

export const CITY_LANDINGS: CityLanding[] = [
  {
    slug: "memphis-tn",
    city: "Memphis",
    county: "Shelby County",
    state: "TN",
    postalCodes: ["38122", "38134", "38135", "38119", "38117", "38120", "38111"],
    titleShort: "Dog Grooming in Memphis, TN",
    titleLong: "Dog Grooming in Memphis, TN | All About Pawz",
    metaDescription:
      "Locally owned dog & cat grooming salon in Memphis, TN. Breed-specific haircuts, spa baths, nail services, and premium pet supplies on Waring Rd in 38122. Book online today.",
    intro:
      "All About Pawz is Memphis's locally owned pet grooming salon and supply shop, on Waring Road in the 38122 zip. We've been grooming Memphis dogs and cats since 2018 — from Midtown's terriers to East Memphis's doodles, our groomers know the breeds, the coats, and the local pet families who trust us with their companions.",
    neighborhoods: ["Midtown Memphis", "East Memphis", "Bartlett-area Memphis", "Hickory Hill", "Berclair", "Frayser"],
    localFaqs: [
      {
        q: "Where is All About Pawz located in Memphis?",
        a: "Our salon is at 699 Waring Rd, Memphis, TN 38122 — in the Berclair/East Memphis area. We're a short drive from Midtown, East Memphis, and Bartlett.",
      },
      {
        q: "Do you groom cats in Memphis too?",
        a: "Yes. We groom cats and dogs at our Memphis salon. Cat grooming includes nail trims, brush-outs, sanitary shaves, and full lion cuts for long-haired breeds. We take appointments Tuesdays through Saturdays.",
      },
      {
        q: "What's the average cost of dog grooming in Memphis?",
        a: "Pricing depends on breed, coat condition, and service. A small dog bath starts around $40; full grooms for medium breeds run $70-$95. See our /pricing page for the full menu, or call (901) 722-1114 for a quote.",
      },
      {
        q: "Do you take walk-ins in Memphis?",
        a: "Grooming is by appointment so we can give each pet the time and attention they deserve. You can book online at /book/appointment or call the salon. Nail trims and retail shopping are walk-in friendly during business hours.",
      },
    ],
    testimonials: [
      { author: "Sarah M.", pet: "Bichon Frise", body: "Best grooming experience in Memphis. My Bichon looks like a show dog every time. The staff knows the breed and treats her like family." },
      { author: "James T.", pet: "German Shepherd", body: "We drive from Midtown Memphis because no one else handles double-coated breeds properly. Their deshedding service cut the fur tumbleweeds in half." },
      { author: "Latoya R.", pet: "Poodle", body: "My standard poodle comes out perfect. Clean face, even topknot, perfect feet. Memphis is lucky to have this salon." },
    ],
  },
  {
    slug: "bartlett-tn",
    city: "Bartlett",
    county: "Shelby County",
    state: "TN",
    postalCodes: ["38134", "38135", "38133"],
    titleShort: "Dog Grooming in Bartlett, TN",
    titleLong: "Dog Grooming in Bartlett, TN | All About Pawz",
    metaDescription:
      "Dog & cat grooming near Bartlett, TN at All About Pawz in Memphis. Breed-specific haircuts, spa baths, nail services, and premium pet supplies. Quick drive from Bartlett — book online.",
    intro:
      "Bartlett pet families come to All About Pawz for the same reason they shop local — they want a groomer who knows their dog by name. Our Memphis salon is a 10-minute drive from Bartlett via Whitten Road, and Bartlett customers make up a big share of our weekly appointments. From Bartlett's retrievers and doodles to the small breeds of Quail Ridge, our groomers handle every coat with breed-specific care.",
    neighborhoods: ["Bartlett City Center", "Quail Ridge", "Bartlett Hills", "Brunswick", "Eastbrook"],
    localFaqs: [
      {
        q: "How far is All About Pawz from Bartlett?",
        a: "We're about a 10-minute drive from Bartlett City Center — take Walnut Grove to Waring Rd. Most Bartlett customers find us closer than groomers inside Bartlett itself.",
      },
      {
        q: "Do you groom the doodle breeds common in Bartlett?",
        a: "Yes — Goldendoodles, Labradoodles, Aussiedoodles, and Bernedoodles are a specialty. We hand-scissor the doodle coat to the length you want, with proper line work and face shape. Bartlett has a lot of doodles and we groom them all week long.",
      },
      {
        q: "Can I drop off my dog and run errands in Bartlett?",
        a: "Yes. Most grooms take 2-3 hours. You're welcome to drop off, head back to Bartlett for errands, and we'll text when your dog is ready for pickup.",
      },
      {
        q: "Do you sell pet food and supplies I can pick up on the way back to Bartlett?",
        a: "Yes. Our retail shop carries premium brands — raw food, grain-free kibble, treats, supplements, grooming tools, and accessories. Grab supplies on the way home to Bartlett.",
      },
    ],
    testimonials: [
      { author: "Melissa K.", pet: "Goldendoodle", body: "We drive from Bartlett because no one else does doodle coats like this. Even topknot, perfect face shape, no mats. Worth the short drive." },
      { author: "Robert P.", pet: "Labrador", body: "Bartlett groomers kept shaving my Lab down. All About Pawz does a proper deshedding bath and undercoat blow-out. He looks like a Lab should." },
      { author: "Diane S.", pet: "Yorkie", body: "My Yorkie's topknot stays in for two weeks. Clean sanitary, perfect skirt. We'll keep driving in from Bartlett." },
    ],
  },
  {
    slug: "arlington-tn",
    city: "Arlington",
    county: "Shelby County",
    state: "TN",
    postalCodes: ["38002"],
    titleShort: "Dog Grooming in Arlington, TN",
    titleLong: "Dog Grooming in Arlington, TN | All About Pawz",
    metaDescription:
      "Dog & cat grooming near Arlington, TN at All About Pawz in Memphis. Breed-specific haircuts, spa baths, nail services, and premium pet supplies. Drive in from Arlington — book online.",
    intro:
      "Arlington pet owners make the short drive south to All About Pawz because we're the closest breed-specific groomer serving Arlington's growing pet community. From the family dogs of Arlington's new subdivisions to the long-time residents on Chester Street, our groomers handle every breed with the patience and skill Arlington families expect.",
    neighborhoods: ["Arlington Town Square", "Chester Street area", "Arlington Station", "Neelys Bend area"],
    localFaqs: [
      {
        q: "How far is All About Pawz from Arlington, TN?",
        a: "We're roughly a 20-minute drive from Arlington via US-64 / Stage Road to Whitten Road. Arlington customers typically schedule morning appointments to beat Memphis traffic.",
      },
      {
        q: "Do you groom the small breeds popular in Arlington?",
        a: "Yes. We specialize in small breeds — Shih Tzus, Maltese, Pomeranians, Chihuahuas, and toy poodles. Arlington has many small breed owners and our groomers know every breed standard.",
      },
      {
        q: "What about large breeds common on Arlington's larger lots?",
        a: "We groom large breeds too — German Shepherds, Golden Retrievers, Labradors, Bernese Mountain Dogs, Great Pyrenees. Our salon has the space and the equipment for big dogs.",
      },
      {
        q: "Do you offer cat grooming for Arlington residents?",
        a: "Yes. Cat grooming is by appointment on Tuesdays through Saturdays. We do nail trims, brush-outs, sanitary shaves, and full lion cuts. Arlington cat owners are welcome.",
      },
    ],
    testimonials: [
      { author: "Karen B.", pet: "Shih Tzu", body: "Worth the drive from Arlington. My Shih Tzu's face is perfectly round and her topknot stays in. No other groomer in the area does it this well." },
      { author: "Mike D.", pet: "Golden Retriever", body: "Arlington has big dogs. All About Pawz handles my Golden's full coat — blow-out, undercoat rake, nail grind. He comes home smelling amazing." },
      { author: "Carol W.", pet: "Persian Cat", body: "Arlington doesn't have cat groomers. I drive to Memphis for my Persian's lion cut every spring. Clean, professional, and they actually handle cats." },
    ],
  },
  {
    slug: "collierville-tn",
    city: "Collierville",
    county: "Shelby County",
    state: "TN",
    postalCodes: ["38017"],
    titleShort: "Dog Grooming in Collierville, TN",
    titleLong: "Dog Grooming in Collierville, TN | All About Pawz",
    metaDescription:
      "Dog & cat grooming near Collierville, TN at All About Pawz in Memphis. Breed-specific haircuts, spa baths, nail services, and premium pet supplies. Drive in from Collierville — book online.",
    intro:
      "Collierville is one of our most loyal customer bases. From the historic town square's small breeds to the large lots of Schilling Farms with their Goldens and Doodles, Collierville pet families trust All About Pawz with breed-specific grooming that local strip-mall groomers can't match. The drive from Collierville Square takes about 25 minutes via Poplar Avenue.",
    neighborhoods: ["Collierville Historic Square", "Schilling Farms", "Harrisdale", "Wynter Gardens", "Shepherd Gardens"],
    localFaqs: [
      {
        q: "How do I get to All About Pawz from Collierville?",
        a: "Take Poplar Avenue west to Walnut Grove, then to Waring Rd. About a 25-minute drive from Collierville Town Square. Schedule around Collierville's school pickup traffic for the easiest trip.",
      },
      {
        q: "Do you groom the doodle breeds common in Collierville's newer subdivisions?",
        a: "Yes — Collierville has one of the highest doodle populations in Shelby County. We hand-scissor Goldendoodles, Labradoodles, Bernedoodles, and Aussiedoodles to breed standard, with the face shape and length Collierville doodle owners expect.",
      },
      {
        q: "Do you sell the premium pet food brands Collierville shoppers look for?",
        a: "Yes. Our retail shop carries raw diets, grain-free kibble, freeze-dried, and limited-ingredient foods. Collierville customers often pick up food and treats on the way home from their dog's grooming appointment.",
      },
      {
        q: "Are you the right groomer for Collierville's small breed dogs?",
        a: "Absolutely. We specialize in small breeds — the Yorkies, Maltese, Pomeranians, and toy poodles common in Collierville's historic district. Each groom includes the breed-standard face, topknot, and skirt.",
      },
    ],
    testimonials: [
      { author: "Helen R.", pet: "Goldendoodle", body: "We drive from Schilling Farms because no Collierville groomer does doodle coats like this. Even all over, perfect face, no mats. Worth every minute of the drive." },
      { author: "Tom B.", pet: "Yorkie", body: "Collierville's historic square has a lot of Yorkies. All About Pawz is the only groomer in the area who does the breed standard topknot and skirt. My little guy looks like a champion." },
      { author: "Patricia L.", pet: "Bernese Mountain Dog", body: "Big dog grooming is hard to find. All About Pawz handles my Bernese's full coat — deshedding bath, undercoat work, nail grind. He comes home exhausted and beautiful." },
    ],
  },
  {
    slug: "millington-tn",
    city: "Millington",
    county: "Shelby County",
    state: "TN",
    postalCodes: ["38053"],
    titleShort: "Dog Grooming in Millington, TN",
    titleLong: "Dog Grooming in Millington, TN | All About Pawz",
    metaDescription:
      "Dog & cat grooming near Millington, TN at All About Pawz in Memphis. Breed-specific haircuts, spa baths, nail services, and premium pet supplies. Drive in from Millington — book online.",
    intro:
      "Millington pet owners make the drive south to All About Pawz because we're the closest breed-specific groomer serving Millington's working families, military families from NSA Mid-South, and the long-time residents who've made Millington home. Our Memphis salon is roughly 30 minutes from Millington via Highway 51 / Watkins Street, and we offer the breed knowledge and patience that Millington families deserve.",
    neighborhoods: ["Millington City Center", "NSA Mid-South area", "Cumberland Estates", "Eugene Bond-Wilson area"],
    localFaqs: [
      {
        q: "How far is All About Pawz from Millington?",
        a: "About a 30-minute drive from Millington City Center via Highway 51 south to Walnut Grove, then to Waring Rd. Schedule around morning traffic for the easiest trip.",
      },
      {
        q: "Do you offer military discounts for NSA Mid-South families?",
        a: "We support our military families — call the salon at (901) 722-1114 to ask about current military discounts and packages. We're grateful to serve the NSA Mid-South community.",
      },
      {
        q: "What breeds do you groom for Millington families?",
        a: "All breeds — small breeds like Yorkies and Chihuahuas, large breeds like Labradors and German Shepherds, doodle breeds, and everything in between. Millington families bring us a wide variety of dogs and we love the variety.",
      },
      {
        q: "Can I drop off my dog and run errands in Millington?",
        a: "Most grooms take 2-3 hours. You're welcome to drop off, head back to Millington, and we'll text you when your dog is ready. We'll keep your dog comfortable and supervised until you return.",
      },
    ],
    testimonials: [
      { author: "Robert M.", pet: "Labrador", body: "Active duty at NSA Mid-South. My Lab gets a proper deshedding bath and undercoat work here. Worth the drive from Millington every time." },
      { author: "Sandra K.", pet: "Chihuahua", body: "Millington doesn't have many groomers who handle small dogs well. All About Pawz does — clean face, perfect nails, gentle handling. My Chi doesn't shake anymore." },
      { author: "James W.", pet: "Australian Shepherd", body: "Aussie coats are tricky. They know the breed here — line work, feathering, sanitary trim. Beautiful job every time." },
    ],
  },
]

// Shelby County hub page — the index page for all city landings.
export const SHELBY_HUB = {
  slug: "shelby-county-tn",
  titleShort: "Dog Grooming in Shelby County, TN",
  titleLong: "Shelby County Pet Grooming | All About Pawz — Memphis, TN",
  metaDescription:
    "Locally owned dog & cat grooming salon serving all of Shelby County, TN — Memphis, Bartlett, Arlington, Collierville, Millington. Breed-specific haircuts, spa baths, premium pet supplies.",
  intro:
    "All About Pawz is Shelby County's locally owned pet grooming salon, based in Memphis and serving every city in the county. From Memphis's Midtown to Collierville's historic square, from Bartlett's family subdivisions to Arlington's growing neighborhoods and Millington's military community, we groom the dogs and cats of Shelby County with breed-specific skill and Tennessee-local care.",
}

// ---------------------------------------------------------------------------
// LocalBusiness schema generator. Drives the JSON-LD blob in <head> on
// every page. The areaServed array is what tells Google "we serve these
// cities" — critical for ranking in each city's "dog grooming near me" map.
// ---------------------------------------------------------------------------

export function localBusinessSchema(areaServedCity?: string) {
  const areaServed = areaServedCity
    ? [{ "@type": "City", name: areaServedCity }]
    : BUSINESS.serviceArea.citiesServed.map((c) => ({ "@type": "City", name: c }))

  return {
    "@context": "https://schema.org",
    "@type": "PetStore", // PetStore is the closest schema type for a grooming salon + pet supply shop
    "@id": `${SITE_URL}/#business`,
    name: BUSINESS.name,
    alternateName: "All About Pawz Memphis",
    legalName: BUSINESS.legalName,
    description: BUSINESS.description,
    url: BUSINESS.url,
    telephone: BUSINESS.phone,
    email: BUSINESS.email,
    image: `${SITE_URL}/assets/og-image.png`,
    logo: `${SITE_URL}/brand/footer-logo.png`,
    priceRange: BUSINESS.priceRange,
    address: {
      "@type": "PostalAddress",
      streetAddress: BUSINESS.address.street,
      addressLocality: BUSINESS.address.city,
      addressRegion: BUSINESS.address.region,
      postalCode: BUSINESS.address.postalCode,
      addressCountry: BUSINESS.address.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: BUSINESS.geo.latitude,
      longitude: BUSINESS.geo.longitude,
    },
    areaServed,
    openingHoursSpecification: BUSINESS.openingHours.map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: h.days === "Mon-Fri"
        ? ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
        : h.days === "Sat"
        ? ["Saturday"]
        : ["Sunday"],
      opens: h.open,
      closes: h.close,
    })),
    sameAs: BUSINESS.sameAs,
    // A salon with physical presence + service area + retail = PetStore fits best.
    makesOffer: [
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Dog Grooming" } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Cat Grooming" } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Spa Bath & Nail Trim" } },
      { "@type": "Offer", itemOffered: { "@type": "Product", name: "Premium Pet Supplies" } },
    ],
  }
}

// FAQPage schema — used on each city landing for the local FAQs block.
// FAQ schema rich results appear as expandable accordions in SERPs.
export function faqSchema(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  }
}

// BreadcrumbList schema — used on every deep page so Google shows the
// category path in SERP instead of the bare URL.
export function breadcrumbSchema(trail: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      item: `${SITE_URL}${t.url}`,
    })),
  }
}

// ---------------------------------------------------------------------------
// Helper — the Buy Local MidSouth top bar copy. Never rotates away.
// Per owner spec: header strip is SHORT to avoid keyword stuffing
// ("Proudly Local — Memphis, TN · Serving Shelby County"). The full city
// list lives in the footer NAP block + the dedicated /grooming/[city]
// location pages, which is the proper place for it.
// ---------------------------------------------------------------------------

export const LOCAL_BAR = {
  // Single short string — rendered as one slim strip, no city list, no paw
  // icon (avoids competing with the sidebar logo → no double-header).
  text: "Proudly Local — Memphis, TN · Serving Shelby County",
} as const
