// ---------------------------------------------------------------------------
// Guide page data model — the CMS content structure for SEO guides.
// Per owner spec Q1: (b) AI-assisted drafting per guide TYPE using a
// shared structure (H1, intro, sections, FAQ, relation blocks), each
// page genuinely unique, 150–300+ words, stored in the CMS — and the
// owner reviews before publish.
//
// Wave 3: content generated later via LLM. The TEMPLATE is built now;
// the content comes per-wave.
//
// Guide categories:
//   grooming   — 58 pages (40 breed + 5 first-timer + 5 coat-type + 8 general)
//   nutrition  — 28 pages (8 diet finder + 7 general + 10 breed-specific + 3 treats)
//   health     — 25 pages (vaccination, flea/tick, dental, etc.)
//   buying     — 12 pages (9 how-to + 3 checklists)
// ---------------------------------------------------------------------------

export type GuideSection = {
  heading: string
  body: string // 50-100 words per section
}

export type GuideData = {
  slug: string
  category: "grooming" | "nutrition" | "health" | "buying-guides"
  title: string // H1 — e.g. "Labrador Retriever Grooming Guide"
  metaTitle: string // <title> — e.g. "Labrador Retriever Grooming Guide | All About Pawz Memphis"
  metaDescription: string // 150 chars max
  intro: string // 100-150 words — the unique opening paragraph
  sections: GuideSection[] // 2-4 sections, each 50-100 words
  faqs: { q: string; a: string }[] // 3-5 FAQ pairs
  relatedGuides: { slug: string; title: string }[] // 4 related guides
  relatedProducts: { slug: string; name: string }[] // 4 product cross-sells
  relatedServices: { slug: string; name: string }[] // grooming services
  imageAlt: string // descriptive alt text including "All About Pawz Memphis"
}

// ---------------------------------------------------------------------------
// Grooming breed guides — 40 dog breeds + 10 cat breeds = 50 guides.
// Slugs match the user's spec: /guides/grooming/labrador-retriever-grooming
// Content is empty for now (Wave 3) — the template renders with the
// metadata, and the content sections are populated when the LLM
// generates them.
// ---------------------------------------------------------------------------

export const GROOMING_GUIDES: { slug: string; title: string; animal: "dog" | "cat" }[] = [
  // Dog breeds (30)
  { slug: "labrador-retriever-grooming", title: "Labrador Retriever Grooming Guide", animal: "dog" },
  { slug: "golden-retriever-grooming", title: "Golden Retriever Grooming Guide", animal: "dog" },
  { slug: "poodle-grooming", title: "Poodle Grooming Guide", animal: "dog" },
  { slug: "doodle-grooming", title: "Doodle Grooming Guide", animal: "dog" },
  { slug: "siberian-husky-grooming", title: "Siberian Husky Grooming Guide", animal: "dog" },
  { slug: "german-shepherd-grooming", title: "German Shepherd Grooming Guide", animal: "dog" },
  { slug: "beagle-grooming", title: "Beagle Grooming Guide", animal: "dog" },
  { slug: "bulldog-grooming", title: "Bulldog Grooming Guide", animal: "dog" },
  { slug: "shih-tzu-grooming", title: "Shih Tzu Grooming Guide", animal: "dog" },
  { slug: "yorkshire-terrier-grooming", title: "Yorkshire Terrier Grooming Guide", animal: "dog" },
  { slug: "maltese-grooming", title: "Maltese Grooming Guide", animal: "dog" },
  { slug: "pomeranian-grooming", title: "Pomeranian Grooming Guide", animal: "dog" },
  { slug: "corgi-grooming", title: "Corgi Grooming Guide", animal: "dog" },
  { slug: "dachshund-grooming", title: "Dachshund Grooming Guide", animal: "dog" },
  { slug: "boxer-grooming", title: "Boxer Grooming Guide", animal: "dog" },
  { slug: "rottweiler-grooming", title: "Rottweiler Grooming Guide", animal: "dog" },
  { slug: "doberman-grooming", title: "Doberman Grooming Guide", animal: "dog" },
  { slug: "great-dane-grooming", title: "Great Dane Grooming Guide", animal: "dog" },
  { slug: "chihuahua-grooming", title: "Chihuahua Grooming Guide", animal: "dog" },
  { slug: "pug-grooming", title: "Pug Grooming Guide", animal: "dog" },
  { slug: "border-collie-grooming", title: "Border Collie Grooming Guide", animal: "dog" },
  { slug: "australian-shepherd-grooming", title: "Australian Shepherd Grooming Guide", animal: "dog" },
  { slug: "cocker-spaniel-grooming", title: "Cocker Spaniel Grooming Guide", animal: "dog" },
  { slug: "bichon-frise-grooming", title: "Bichon Frise Grooming Guide", animal: "dog" },
  { slug: "schnauzer-grooming", title: "Schnauzer Grooming Guide", animal: "dog" },
  { slug: "bernese-mountain-dog-grooming", title: "Bernese Mountain Dog Grooming Guide", animal: "dog" },
  { slug: "newfoundland-grooming", title: "Newfoundland Grooming Guide", animal: "dog" },
  { slug: "greyhound-grooming", title: "Greyhound Grooming Guide", animal: "dog" },
  { slug: "shiba-inu-grooming", title: "Shiba Inu Grooming Guide", animal: "dog" },
  { slug: "french-bulldog-grooming", title: "French Bulldog Grooming Guide", animal: "dog" },
  // Cat breeds (10)
  { slug: "persian-grooming", title: "Persian Cat Grooming Guide", animal: "cat" },
  { slug: "maine-coon-grooming", title: "Maine Coon Grooming Guide", animal: "cat" },
  { slug: "ragdoll-grooming", title: "Ragdoll Grooming Guide", animal: "cat" },
  { slug: "sphynx-grooming", title: "Sphynx Grooming Guide", animal: "cat" },
  { slug: "british-shorthair-grooming", title: "British Shorthair Grooming Guide", animal: "cat" },
  { slug: "siamese-grooming", title: "Siamese Grooming Guide", animal: "cat" },
  { slug: "bengal-grooming", title: "Bengal Grooming Guide", animal: "cat" },
  { slug: "scottish-fold-grooming", title: "Scottish Fold Grooming Guide", animal: "cat" },
  { slug: "russian-blue-grooming", title: "Russian Blue Grooming Guide", animal: "cat" },
  { slug: "domestic-shorthair-grooming", title: "Domestic Shorthair Grooming Guide", animal: "cat" },
]

// First-timer series (5)
export const GROOMING_FIRST_TIMER = [
  { slug: "puppys-first-groom", title: "Puppy's First Groom: What to Expect" },
  { slug: "kittens-first-groom", title: "Kitten's First Groom: What to Expect" },
  { slug: "adult-rescues-first-groom", title: "Adult Rescue's First Groom" },
  { slug: "what-to-bring-to-grooming", title: "What to Bring to Your Grooming Appointment" },
  { slug: "vaccination-rules-for-grooming", title: "Vaccination Requirements for Grooming" },
]

// Coat-type guides (5)
export const GROOMING_COAT_TYPES = [
  { slug: "double-coat-grooming", title: "Double Coat Grooming Guide" },
  { slug: "curly-hypoallergenic-coat-grooming", title: "Curly & Hypoallergenic Coat Grooming" },
  { slug: "long-silky-coat-grooming", title: "Long & Silky Coat Grooming Guide" },
  { slug: "short-smooth-coat-grooming", title: "Short & Smooth Coat Grooming Guide" },
  { slug: "hairless-cat-grooming", title: "Hairless Cat Grooming Guide" },
]

// General grooming guides (8)
export const GROOMING_GENERAL = [
  { slug: "how-often-to-bathe-groom-by-breed-coat-lifestyle", title: "How Often to Bathe & Groom: By Breed, Coat, Lifestyle" },
  { slug: "matted-coats-prevention-dematting-vs-shave-down", title: "Matted Coats: Prevention, Dematting vs. Shave Down" },
  { slug: "deshedding-blowing-coat-seasons", title: "Deshedding & Blowing Coat: Seasonal Guide" },
  { slug: "nail-trimming-grinder-vs-clipper-black-nail-guide", title: "Nail Trimming: Grinder vs. Clipper + Black Nail Guide" },
  { slug: "ears-eyes-teeth-cleaning-by-breed", title: "Ears, Eyes & Teeth Cleaning by Breed" },
  { slug: "anxious-and-senior-pet-grooming", title: "Anxious & Senior Pet Grooming Guide" },
  { slug: "style-glossary-puppy-cut-teddy-bear-lion-cut", title: "Grooming Style Glossary: Puppy Cut, Teddy Bear, Lion Cut" },
  { slug: "seasonal-summer-cuts-winter-paw-care-allergy-skin", title: "Seasonal Grooming: Summer Cuts, Winter Paw Care, Allergy Skin" },
]

// Helper — get all grooming guide slugs for generateStaticParams
export function getAllGroomingSlugs() {
  return [
    ...GROOMING_GUIDES.map(g => ({ slug: g.slug })),
    ...GROOMING_FIRST_TIMER.map(g => ({ slug: g.slug })),
    ...GROOMING_COAT_TYPES.map(g => ({ slug: g.slug })),
    ...GROOMING_GENERAL.map(g => ({ slug: g.slug })),
  ]
}

// Helper — look up a guide by slug
export function findGroomingGuide(slug: string) {
  return (
    GROOMING_GUIDES.find(g => g.slug === slug) ||
    GROOMING_FIRST_TIMER.find(g => g.slug === slug) ||
    GROOMING_COAT_TYPES.find(g => g.slug === slug) ||
    GROOMING_GENERAL.find(g => g.slug === slug)
  )
}
