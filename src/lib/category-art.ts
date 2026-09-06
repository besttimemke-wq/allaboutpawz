// ---------------------------------------------------------------------------
// Category art — IN CODE, not in the database.
//
// Hero imagery + editorial copy for the shop category pages, imported from the
// remote design project (its per-category hero art and editorial copy). Files
// live in /public/category/<slug>.jpg. A node without its own image (img: "")
// inherits the nearest ancestor's image while keeping its own copy — the
// department art covers every subcategory page.
//
// Only shop products / gallery / pricing / services data are database-driven —
// bands, icons, and category art like this stay in the codebase so the pages
// are persistent and already loaded (the Amazon/Alibaba pattern: static CDN
// assets, no runtime dependency).
// ---------------------------------------------------------------------------

export type CategoryArt = {
  img: string
  alt: string
  eyebrow: string
  description: string
}

export const CATEGORY_ART: Record<string, CategoryArt> = {
  "automatic-feeders": {
    img: "",
    alt: "Automatic Feeders",
    eyebrow: "SMART NOURISHMENT",
    description: "Programmable, timed, and portion-controlled smart feeders engineered with hygienic food-grade stainless steel, antimicrobial ceramics, and whisper-quiet dispense mechanisms. Designed to preserve kibble crispness and seamlessly integrate into modern Scandinavian interiors.",
  },
  "biscuits": {
    img: "/category/biscuits.jpg",
    alt: "Golden Retriever sitting happily in an airy, sun-drenched Scandinavian oak kitchen receiving a crisp, golden-baked artisan bone biscuit from a smiling woman wearing a warm beige ribbed knit sweater, soft Nordic lighting, serene luxury atmosphere",
    eyebrow: "Oven-Crunch Dental Health & Training",
    description: "Traditional double-baked biscuits crafted with pasture-raised bone broth, cold-water kelp, and prebiotic root fibers. Engineered with a crisp dental fracture pattern that gently cleans tartar and stimulates jaw health.",
  },
  "bowls-dishes": {
    img: "",
    alt: "Bowls & Dishes",
    eyebrow: "ARTISAN DINING ESSENTIALS",
    description: "Thoughtfully engineered companion dining rooted in Nordic aesthetic balance. Handcrafted stoneware, heavy matte ceramics, non-slip silicone bases, ergonomic elevated stands, and slow-feeding textured dining bowls made for optimal posture and digestion.",
  },
  "brushes": {
    img: "/category/brushes.jpg",
    alt: "Brushes",
    eyebrow: "Organic Coat Care & Detangling",
    description: "Hand-crafted ergonomic pin brushes, natural boar bristle smoothers, and flexible bamboo paddle brushes designed for gentle daily brushing, untangling delicate coats, and stimulating natural follicle oils without scratching sensitive canine skin.",
  },
  "carriers-travel-products": {
    img: "/category/carriers-travel-products.jpg",
    alt: "Dog resting comfortably inside a premium canvas travel carrier in an automobile",
    eyebrow: "SAFE JOURNEYS & ROADSIDE COMFORT",
    description: "Crash-tested car safety hammocks, airline-compliant soft carriers, and adventure travel accessories thoughtfully designed for seamless journeys together.",
  },
  "claw-care": {
    img: "/category/claw-care.jpg",
    alt: "Claw Care",
    eyebrow: "Stress-Free Pedicure & Precision Trimming",
    description: "Surgical stainless steel clippers, whisper-quiet diamond rotary grinders, and precision quick-sensors engineered to provide gentle, splinter-free nail maintenance in the peaceful comfort of home.",
  },
  "collars-harnesses-leashes": {
    img: "/category/collars-harnesses-leashes.jpg",
    alt: "Warm, editorial lifestyle photograph of an elegant dog wearing a minimal aesthetic leather or woven collar and sleek matching harness with brass hardware",
    eyebrow: "EVERYDAY WALKING & ADVENTURE GEAR",
    description: "Ergonomically designed walk kits, weatherproof coated webbing leashes, and precision-fit harnesses engineered for gentle control, all-day comfort, and daily adventures.",
  },
  "colognes": {
    img: "/category/colognes.jpg",
    alt: "Colognes",
    eyebrow: "Botanical Apothecary & Coat Essences",
    description: "Alcohol-free, plant-distilled coat fragrances infused with organic chamomile, French lavender, cedarwood, and sandalwood to keep coats velvety soft and smelling fresh between grooming sessions.",
  },
  "combs": {
    img: "/category/combs.jpg",
    alt: "Combs",
    eyebrow: "Precision Separation & Metallurgy",
    description: "Seamless hand-polished brass, stainless steel, and Teflon-coated Greyhound combs engineered for static-free coat fluffing, parting, face detailing, and unpicking stubborn knots without breakage.",
  },
  "cookies": {
    img: "/category/cookies.jpg",
    alt: "Warm natural-lit Scandinavian kitchen scene showing a joyful young woman in a cozy cream cashmere knit kneeling on an oak floor, lovingly feeding a freshly baked golden rectangular biscuit treat to an affectionate Golden Retriever.",
    eyebrow: "Artisan Slow-Baked Pastry & Cookies",
    description: "Handcrafted in small batches using human-grade organic oat flour, cold-pressed coconut oil, and unsweetened peanut butter. Delicately decorated with dog-safe yogurt and superfood icing for moments of shared celebration.",
  },
  "dander-remover-sprays": {
    img: "/category/dander-remover-sprays.jpg",
    alt: "Dander Remover Sprays",
    eyebrow: "Allergen Neutralization & Skin Comfort",
    description: "Clinically formulated non-rinsing dander control sprays enriched with colloidal oatmeal, organic aloe vera, and natural enzymes to neutralize pet dander and environmental allergens directly at the coat source.",
  },
  "dematting-tools": {
    img: "/category/dematting-tools.jpg",
    alt: "Dematting Tools",
    eyebrow: "Tangle Removal & Painless Undercoat Care",
    description: "Wave-edge serrated dematting rakes, ergonomic safety mat cutters, and curved blade unravelers designed to effortlessly slice through dense mats and felted undercoat without pulling healthy fur.",
  },
  "deodorizers": {
    img: "/category/deodorizers.jpg",
    alt: "Deodorizers",
    eyebrow: "Enzymatic Odor Elimination & Freshness",
    description: "Natural bio-enzymatic odor neutralizers, baking soda & zinc complexes, and probiotic freshness mists that eliminate wet dog odors and stale coat scents rather than merely masking them with heavy synthetic perfumes.",
  },
  "dog-apparel-accessories": {
    img: "/category/dog-apparel-accessories.jpg",
    alt: "Warm editorial lifestyle photograph of an adorable golden retriever or stylish dog wearing a cozy knit beige sweater and minimal aesthetic waterproof raincoat",
    eyebrow: "ALL-WEATHER COMFORT & STYLE",
    description: "Thoughtfully tailored coats, weather-resistant jackets, breathable knitwear, and stylish bandanas crafted for everyday comfort and outdoor adventures.",
  },
  "dog-beds-furniture": {
    img: "/category/dog-beds-furniture.jpg",
    alt: "Warm, editorial lifestyle photo of a calm, happy dog resting comfortably in an elegant, modern orthopedic dog bed with neutral linen fabric",
    eyebrow: "RESTFUL LIVING & SLEEP SANCTUARY",
    description: "Ergonomically engineered orthopedic beds, bolster loungers, washable furniture protectors, and aesthetic home steps crafted for your dog’s deep restorative sleep and spinal support.",
  },
  "dog-chew-toys": {
    img: "/category/dog-chew-toys.jpg",
    alt: "Warm, editorial lifestyle photograph of a playful, happy dog holding a durable natural rubber or organic rope chew toy in its mouth",
    eyebrow: "PLAYFUL STRENGTH & DENTAL WELLNESS",
    description: "Durable natural rubber, organic cotton rope, and non-toxic chew essentials thoughtfully engineered for dental health, instinctual play, and hours of joyful engagement.",
  },
  "dog-feeding-watering-supplies": {
    img: "/category/dog-feeding-watering-supplies.jpg",
    alt: "Warm, premium lifestyle photo of a happy golden retriever sitting next to modern ceramic and stainless steel elevated dog feeding bowls",
    eyebrow: "REFINED PET DINING",
    description: "Thoughtfully crafted elevated diners, slow feeder bowls, ceramic dishes, and fresh hydration systems designed for your dog’s daily nourishment and orthopedic digestive comfort.",
  },
  "dog-grooming-supplies": {
    img: "/category/dog-grooming-supplies.jpg",
    alt: "Warm, editorial lifestyle photograph of a healthy dog being groomed with care",
    eyebrow: "BOTANICAL & GENTLE CARE",
    description: "Thoughtfully crafted botanical shampoos, conditioning rinses, ergonomic dematting tools, and claw care essentials designed to keep coats healthy, radiant, and fresh from nose to tail.",
  },
  "dog-treat-cookies-biscuits-snacks": {
    img: "/category/dog-treat-cookies-biscuits-snacks.jpg",
    alt: "Dog Treat Cookies, Biscuits & Snacks",
    eyebrow: "NATURAL NOURISHMENT & REWARDS",
    description: "Handcrafted, oven-baked crunchy biscuits, wholesome grain-free cookies, and single-protein training rewards prepared with 100% human-grade, organic ingredients.",
  },
  "electric-clippers-blades": {
    img: "/category/electric-clippers-blades.jpg",
    alt: "Electric Clippers & Blades",
    eyebrow: "Pro-Grade Motor Power & Precision",
    description: "Brushless low-noise cordless clippers, titanium-ceramic detachable blades, and snap-on stainless steel guard combs designed for serene home grooming without heat buildup or snagging thick canine fur.",
  },
  "feeding-mats": {
    img: "",
    alt: "Feeding Mats",
    eyebrow: "CLEAN LIVING & SPILL PROTECTION",
    description: "Engineered with FDA-compliant medical-grade silicone, architectural waterproof linen textures, and spill-intercepting raised rims. Intentionally sculpted to safeguard Scandinavian timber, honed limestone, and minimalist interiors against the most spirited companion mealtime rituals.",
  },
  "food-storage": {
    img: "",
    alt: "Food Storage",
    eyebrow: "HERMETIC FRESHNESS & PANTRY AESTHETICS",
    description: "Airtight ceramic bins, matte powder-coated steel kibble containers with silicone hermetic seals, solid acacia wood scoops, and treat canisters designed to sit proudly on kitchen countertops without compromising interior serenity or essential nutritional aromas.",
  },
  "fountains": {
    img: "",
    alt: "Fountains",
    eyebrow: "CONTINUOUS CLEAN HYDRATION",
    description: "Engineered for canine wellness, our ultra-quiet multi-stage filtration water fountains are crafted in surgical 304 stainless steel and non-porous glazed stoneware. Gentle aerating spouts entice instinctual hydration, keeping water pristine, chilled, and continually oxygenated.",
  },
  "grooming-wipes": {
    img: "/category/grooming-wipes.jpg",
    alt: "Grooming Wipes",
    eyebrow: "Biodegradable Botanical Wipes",
    description: "100% plant-fiber, compostable, hypoallergenic daily grooming wipes infused with soothing organic chamomile, aloe vera, and witch hazel for pristine paws, tear ducts, ears, and coats between restful baths.",
  },
  "hair-removal-mitts-rollers": {
    img: "/category/hair-removal-mitts-rollers.jpg",
    alt: "Hair Removal Mitts & Rollers",
    eyebrow: "Textile Care & Surface Hair Removal",
    description: "Reusable electro-static pet hair mitts, extra-sticky recycled crepe rollers, and self-cleaning furniture rakes designed to effortlessly lift stubborn fur from cashmere, linen upholstery, and car interiors.",
  },
  "health-supplies": {
    img: "/category/health-supplies.jpg",
    alt: "Warm, editorial lifestyle photograph of an elegant dog receiving gentle health and wellness care",
    eyebrow: "VET-FORMULATED & HOLISTIC WELLNESS",
    description: "Thoughtfully crafted botanical tinctures, daily supplements, and veterinary-grade wellness essentials designed to nourish your pet from nose to tail.",
  },
  "lick-mats": {
    img: "",
    alt: "Lick Mats",
    eyebrow: "ENRICHMENT & ANXIETY RELIEF",
    description: "Textured food-grade silicone mats engineered to promote slow, deliberate licking that triggers natural endorphin release. Expertly configured grooves soothe grooming tension, ease separation anxiety, stimulate digestive saliva, and transform wholesome bone broths, yogurts, and purees into serene mental wellness rituals.",
  },
  "nursing-supplies": {
    img: "",
    alt: "Nursing Supplies",
    eyebrow: "GENTLE CARE FOR NEWBORNS & MOTHERS",
    description: "Ergonomically balanced puppy nursing bottles, ultra-soft food-grade silicone anti-colic nipples, calibrated medicine pipettes, and gentle nursery formulas designed to nurture neonatal litters, orphaned rescues, and sensitive transitional weaners.",
  },
  "pet-supplies": {
    img: "/category/pet-supplies.jpg",
    alt: "Curated pet lifestyle photograph of golden retriever and domestic cat together in a modern Scandinavian living room",
    eyebrow: "CURATED ESSENTIALS FOR DOGS & CATS",
    description: "Thoughtfully designed daily essentials, organic wellness, durable play gear, and cozy comforts crafted to enrich everyday moments with dogs and cats.",
  },
  "scissors": {
    img: "/category/scissors.jpg",
    alt: "Scissors",
    eyebrow: "Japanese 440C Stainless Steel Shears",
    description: "Master-crafted convex Japanese stainless steel grooming shears, rounded safety ball-tip scissors, and double-blended thinners engineered for whisper-smooth cutting, precise shaping, and nervous-pet safety.",
  },
  "shampoos-conditioners": {
    img: "/category/shampoos-conditioners.jpg",
    alt: "Shampoos & Conditioners",
    eyebrow: "Botanical Cleansing & pH-Balanced Apothecary",
    description: "Salon-grade, certified cruelty-free botanical shampoos and deep coat conditioners formulated with colloidal oatmeal, organic argan oil, and gentle plant cleansers for a lustrous, skin-soothing wash.",
  },
  "shedding-tools": {
    img: "/category/shedding-tools.jpg",
    alt: "Shedding Tools",
    eyebrow: "Seasonal Undercoat Control & Innovation",
    description: "Ergonomically weighted stainless steel undercoat deshedders, curved shedding blades, and gentle silicone loops engineered to reduce seasonal shedding by up to 90% without cutting top guard hairs.",
  },
  "shower-bath-supplies": {
    img: "/category/shower-bath-supplies.jpg",
    alt: "Shower & Bath Supplies",
    eyebrow: "Serene Bath Rituals & Hydraulic Accessories",
    description: "Indoor & outdoor gentle shower spray attachments, ultra-absorbent organic waffle micro-cotton towels, silicone shampoo massagers, and collapsible bathing tubs engineered to turn bath time into a calm spa ritual.",
  },
  "snacks": {
    img: "",
    alt: "Editorial lifestyle capture of mindful positive reinforcement training with pure venison treats in a sunny Nordic interior",
    eyebrow: "FREEZE-DRIED, JERKY & TRAINING SNACKS",
    description: "High-reward functional snacks ranging from single-ingredient freeze-dried wild meats and slow-smoked tender jerky strips to pocket-sized organic training bites. Formulated for high bioavailability and immediate positive reinforcement.",
  },
  "styptic-gels-powders": {
    img: "/category/styptic-gels-powders.jpg",
    alt: "Styptic Gels & Powders",
    eyebrow: "Veterinary First Aid & Hemostatic Care",
    description: "Fast-acting ferric subsulfate hemostatic powders, precision applicator styptic gels, and soothing benzocaine balms designed to instantly stop minor bleeding from accidental nail quicking with zero sting.",
  },
  "water-bottles": {
    img: "",
    alt: "Water Bottles",
    eyebrow: "PORTABLE ON-THE-GO HYDRATION",
    description: "Thoughtfully engineered travel water bottles featuring seamless food-grade drinking troughs, natural silicone leaf dispensers, double-wall vacuum insulated stainless steel flasks, and intuitive one-touch recirculation flow systems. Designed for serene morning trails, spirited dog parks, and mindful cross-country road trips.",
  },
}

const FALLBACK_EYEBROW = "SHOP BY CATEGORY"

// Resolve art for a category route from its breadcrumb chain
// (["dog-grooming-supplies", "grooming", "brushes"] — root first). Each field
// resolves independently, walking from the node up: the node's own copy wins,
// the nearest ancestor fills whatever the node lacks (image, eyebrow,
// description). Returns null only when nothing in the chain has any art.
export function resolveCategoryArt(chain: string[]): CategoryArt | null {
  if (chain.length === 0) return null
  let img = ""
  let alt = ""
  let eyebrow = ""
  let description = ""
  for (const slug of [...chain].reverse()) {
    const hit = CATEGORY_ART[slug]
    if (!hit) continue
    if (!img && hit.img) { img = hit.img; alt = hit.alt }
    if (!eyebrow && hit.eyebrow) eyebrow = hit.eyebrow
    if (!description && hit.description) description = hit.description
  }
  if (!img) {
    // No image anywhere in the chain — copy still renders (no image block).
    if (!eyebrow && !description) return null
    return { img: "", alt: "", eyebrow: eyebrow || FALLBACK_EYEBROW, description }
  }
  return { img, alt, eyebrow: eyebrow || FALLBACK_EYEBROW, description }
}
