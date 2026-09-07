// ---------------------------------------------------------------------------
// Shop navigation data — the NINE departments of the shop nav bar, shared by
// the header ShopNavBar (every /shop route). Static, data-driven config per
// the owner's spec (never hardcoded per page): each category carries its
// subcategory column, its What's New column, and its three-image rail.
//
// Slugs are the REAL taxonomy slugs (/shop/category/<slug>) from the live
// category tree — customer-facing names stay flattened (Grooming, Treats,
// Travel & Outdoor, Wellness — never "Dog Grooming Supplies").
// ---------------------------------------------------------------------------

export type ShopNavSubcategory = {
  slug: string
  name: string
}

export type ShopNavWhatsNew = {
  label: string
  href: string
}

export type ShopNavImage = {
  src: string
  alt: string
  href: string
}

export type ShopCategory = {
  slug: string
  name: string
  subcategories: ShopNavSubcategory[]
  whatsNew?: ShopNavWhatsNew[]
  images: ShopNavImage[]
}

const cat = (slug: string) => `/shop/category/${slug}`

export const SHOP_NAV_CATEGORIES: ShopCategory[] = [
  {
    slug: "dog-feeding-watering-supplies",
    name: "Feeding & Watering",
    subcategories: [
      { slug: "bowls-dishes", name: "Bowls & Dishes" },
      { slug: "automatic-feeders", name: "Automatic Feeders" },
      { slug: "water-bottles", name: "Water Bottles" },
      { slug: "fountains", name: "Fountains" },
      { slug: "food-storage", name: "Food Storage" },
      { slug: "feeding-mats", name: "Feeding Mats" },
      { slug: "lick-mats", name: "Lick Mats" },
      { slug: "nursing-supplies", name: "Nursing Supplies" },
    ],
    whatsNew: [
      { label: "Bowls & Dishes", href: cat("bowls-dishes") },
      { label: "Automatic Feeders", href: cat("automatic-feeders") },
      { label: "Lick Mats", href: cat("lick-mats") },
    ],
    images: [
      { src: "/Shop/heroes/beagle.jpeg", alt: "Beagle portrait — shop Feeding & Watering", href: cat("bowls-dishes") },
      { src: "/Shop/heroes/cocker-spaniel.jpeg", alt: "Cocker Spaniel portrait — shop Feeding & Watering", href: cat("automatic-feeders") },
      { src: "/Shop/heroes/pomeranian.jpeg", alt: "Pomeranian portrait — shop Feeding & Watering", href: cat("lick-mats") },
    ],
  },
  {
    slug: "dog-grooming-supplies",
    name: "Grooming",
    subcategories: [
      { slug: "shampoos-conditioners", name: "Shampoos & Conditioners" },
      { slug: "brushes", name: "Brushes" },
      { slug: "combs", name: "Combs" },
      { slug: "claw-care", name: "Claw Care" },
      { slug: "colognes", name: "Colognes" },
      { slug: "shower-bath-supplies", name: "Shower & Bath Supplies" },
      { slug: "dematting-tools", name: "Dematting Tools" },
      { slug: "shedding-tools", name: "Shedding Tools" },
    ],
    whatsNew: [
      { label: "Shampoos & Conditioners", href: cat("shampoos-conditioners") },
      { label: "Claw Care", href: cat("claw-care") },
      { label: "Colognes", href: cat("colognes") },
    ],
    images: [
      { src: "/Shop/heroes/poodle.jpeg", alt: "Groomed poodle portrait — shop Grooming", href: cat("shampoos-conditioners") },
      { src: "/Shop/heroes/shih-tzu.jpeg", alt: "Groomed Shih Tzu portrait — shop Grooming", href: cat("claw-care") },
      { src: "/Shop/heroes/cocker-spaniel.jpeg", alt: "Cocker Spaniel portrait — shop Grooming", href: cat("colognes") },
    ],
  },
  {
    slug: "dog-beds-furniture",
    name: "Beds & Furniture",
    subcategories: [
      { slug: "beds", name: "Beds" },
      { slug: "bed-blankets", name: "Bed Blankets" },
      { slug: "bed-covers", name: "Bed Covers" },
      { slug: "bed-mats", name: "Bed Mats" },
      { slug: "bed-pillows", name: "Bed Pillows" },
      { slug: "bed-liners", name: "Bed Liners" },
      { slug: "sofas-chairs", name: "Sofas & Chairs" },
      { slug: "stairs-steps", name: "Stairs & Steps" },
    ],
    whatsNew: [
      { label: "Beds", href: cat("beds") },
      { label: "Bed Blankets", href: cat("bed-blankets") },
      { label: "Stairs & Steps", href: cat("stairs-steps") },
    ],
    images: [
      { src: "/Shop/heroes/french-bulldog.jpeg", alt: "French Bulldog portrait — shop Beds & Furniture", href: cat("beds") },
      { src: "/Shop/heroes/pomeranian.jpeg", alt: "Pomeranian portrait — shop Beds & Furniture", href: cat("bed-blankets") },
      { src: "/Shop/heroes/shih-tzu.jpeg", alt: "Groomed Shih Tzu portrait — shop Beds & Furniture", href: cat("stairs-steps") },
    ],
  },
  {
    slug: "dog-treat-cookies-biscuits-snacks",
    name: "Treats",
    subcategories: [
      { slug: "biscuits", name: "Biscuits" },
      { slug: "cookies", name: "Cookies" },
      { slug: "snacks", name: "Snacks" },
    ],
    whatsNew: [
      { label: "Biscuits", href: cat("biscuits") },
      { label: "Cookies", href: cat("cookies") },
      { label: "Snacks", href: cat("snacks") },
    ],
    images: [
      { src: "/Shop/heroes/beagle.jpeg", alt: "Beagle portrait — shop Treats", href: cat("biscuits") },
      { src: "/Shop/heroes/border-collie.jpeg", alt: "Border Collie portrait — shop Treats", href: cat("cookies") },
      { src: "/Shop/heroes/pomeranian.jpeg", alt: "Pomeranian portrait — shop Treats", href: cat("snacks") },
    ],
  },
  {
    slug: "dog-apparel-accessories",
    name: "Apparel & Accessories",
    subcategories: [
      { slug: "bandanas", name: "Bandanas" },
      { slug: "sweaters", name: "Sweaters" },
      { slug: "hoodies", name: "Hoodies" },
      { slug: "raincoats", name: "Raincoats" },
      { slug: "cold-weather-coats", name: "Cold Weather Coats" },
      { slug: "boots-paw-protectors", name: "Boots & Paw Protectors" },
      { slug: "dresses", name: "Dresses" },
      { slug: "hats", name: "Hats" },
    ],
    whatsNew: [
      { label: "Bandanas", href: cat("bandanas") },
      { label: "Sweaters", href: cat("sweaters") },
      { label: "Raincoats", href: cat("raincoats") },
    ],
    images: [
      { src: "/Shop/heroes/pomeranian.jpeg", alt: "Pomeranian portrait — shop Apparel & Accessories", href: cat("bandanas") },
      { src: "/Shop/heroes/cocker-spaniel.jpeg", alt: "Cocker Spaniel portrait — shop Apparel & Accessories", href: cat("sweaters") },
      { src: "/Shop/heroes/shih-tzu.jpeg", alt: "Groomed Shih Tzu portrait — shop Apparel & Accessories", href: cat("raincoats") },
    ],
  },
  {
    slug: "dog-chew-toys",
    name: "Chew Toys",
    subcategories: [{ slug: "chew-toys", name: "Chew Toys" }],
    whatsNew: [{ label: "Chew Toys", href: cat("chew-toys") }],
    images: [
      { src: "/Shop/heroes/border-collie.jpeg", alt: "Border Collie portrait — shop Chew Toys", href: cat("chew-toys") },
      { src: "/Shop/heroes/beagle.jpeg", alt: "Beagle portrait — shop Chew Toys", href: cat("chew-toys") },
      { src: "/Shop/heroes/husky.jpeg", alt: "Siberian Husky portrait — shop Chew Toys", href: cat("chew-toys") },
    ],
  },
  {
    slug: "collars-harnesses-leashes",
    name: "Collars, Harnesses & Leashes",
    subcategories: [
      { slug: "collars", name: "Collars" },
      { slug: "harnesses", name: "Harnesses" },
      { slug: "leashes", name: "Leashes" },
      { slug: "id-tags-collar-accessories", name: "ID Tags & Collar Accessories" },
      { slug: "activity-trackers", name: "Activity Trackers" },
      { slug: "location-trackers", name: "Location Trackers" },
      { slug: "muzzles", name: "Muzzles" },
    ],
    whatsNew: [
      { label: "Collars", href: cat("collars") },
      { label: "Harnesses", href: cat("harnesses") },
      { label: "Leashes", href: cat("leashes") },
    ],
    images: [
      { src: "/Shop/heroes/german-shepherd.jpeg", alt: "German Shepherd portrait — shop Collars, Harnesses & Leashes", href: cat("collars") },
      { src: "/Shop/heroes/border-collie.jpeg", alt: "Border Collie portrait — shop Collars, Harnesses & Leashes", href: cat("harnesses") },
      { src: "/Shop/heroes/beagle.jpeg", alt: "Beagle portrait — shop Collars, Harnesses & Leashes", href: cat("leashes") },
    ],
  },
  {
    slug: "carriers-travel-products",
    name: "Travel & Outdoor",
    subcategories: [
      { slug: "carriers", name: "Carriers" },
      { slug: "car-travel-accessories", name: "Car Travel Accessories" },
      { slug: "backpack-carriers", name: "Backpack Carriers" },
      { slug: "strollers", name: "Strollers" },
      { slug: "slings", name: "Slings" },
      { slug: "purses", name: "Purses" },
      { slug: "bicycle-carriers", name: "Bicycle Carriers" },
      { slug: "bicycle-trailers", name: "Bicycle Trailers" },
    ],
    whatsNew: [
      { label: "Carriers", href: cat("carriers") },
      { label: "Car Travel Accessories", href: cat("car-travel-accessories") },
      { label: "Strollers", href: cat("strollers") },
    ],
    images: [
      { src: "/Shop/heroes/husky.jpeg", alt: "Siberian Husky portrait — shop Travel & Outdoor", href: cat("carriers") },
      { src: "/Shop/heroes/german-shepherd.jpeg", alt: "German Shepherd portrait — shop Travel & Outdoor", href: cat("car-travel-accessories") },
      { src: "/Shop/heroes/border-collie.jpeg", alt: "Border Collie portrait — shop Travel & Outdoor", href: cat("strollers") },
    ],
  },
  {
    slug: "health-supplies",
    name: "Wellness",
    subcategories: [
      { slug: "supplements-vitamins", name: "Supplements & Vitamins" },
      { slug: "hip-joint-care", name: "Hip & Joint Care" },
      { slug: "dental-care", name: "Dental Care" },
      { slug: "ear-care", name: "Ear Care" },
      { slug: "eye-care", name: "Eye Care" },
      { slug: "digestive-remedies", name: "Digestive Remedies" },
      { slug: "itch-remedies", name: "Itch Remedies" },
      { slug: "dna-tests", name: "DNA Tests" },
    ],
    whatsNew: [
      { label: "Supplements & Vitamins", href: cat("supplements-vitamins") },
      { label: "Dental Care", href: cat("dental-care") },
      { label: "Hip & Joint Care", href: cat("hip-joint-care") },
    ],
    images: [
      { src: "/Shop/heroes/german-shepherd.jpeg", alt: "German Shepherd portrait — shop Wellness", href: cat("supplements-vitamins") },
      { src: "/Shop/heroes/husky.jpeg", alt: "Siberian Husky portrait — shop Wellness", href: cat("dental-care") },
      { src: "/Shop/heroes/french-bulldog.jpeg", alt: "French Bulldog portrait — shop Wellness", href: cat("hip-joint-care") },
    ],
  },
]
