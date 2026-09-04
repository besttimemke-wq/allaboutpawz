import {
  Scissors, Bathtub, PawPrint, Drop, Sparkle, Bug, ShoppingBag,
  Image as ImageIcon, Tag, Question, ShieldCheck, Quotes, Star,
  Dog, Users, PaintBrush, HandsPraying, Tooth,
} from "@phosphor-icons/react"
import type { Icon } from "@phosphor-icons/react"

// Known image assets shipped in /public/assets (from the original site).
export const ASSETS = [
  "hero-dog.jpg", "salon-interior.jpg", "storefront.jpg",
  "dog-golden.jpg", "dog-doodle.jpg", "dog-bichon.jpg", "dog-pomeranian.jpg",
  "dog-schnauzer.jpg", "dog-shihtzu.jpg",
  "svc-groom.jpg", "svc-bath.jpg", "svc-nails.jpg", "svc-addon.jpg",
  "product-shampoo.jpg", "product-spray.jpg", "product-brush.jpg", "product-bandana.jpg",
  "g1.jpg", "g2.jpg", "g3.jpg", "g4.jpg", "g5.jpg", "g6.jpg", "g7.jpg", "g8.jpg",
  "paw.png", "badge.png",
]

export type FieldType = "text" | "textarea" | "number" | "switch" | "select" | "image"

export type FieldDef = {
  key: string
  label: string
  type: FieldType
  options?: { label: string; value: string }[]
  placeholder?: string
  full?: boolean
}

export type ResourceConfig = {
  resource: string
  title: string
  singular: string
  description: string
  icon: Icon
  fields: FieldDef[]
  cardImage?: (row: any) => string | null
  cardTitle: (row: any) => string
  cardSubtitle?: (row: any) => string
}

export const RESOURCES: ResourceConfig[] = [
  {
    resource: "services",
    title: "Services",
    singular: "Service",
    description: "Grooming service categories shown on the home and services pages.",
    icon: Scissors,
    fields: [
      { key: "title", label: "Title", type: "text", placeholder: "GROOMING" },
      { key: "description", label: "Description", type: "textarea", full: true },
      { key: "icon", label: "Icon (lucide name)", type: "text", placeholder: "Scissors" },
      { key: "image", label: "Image", type: "image" },
      { key: "alt", label: "Alt text", type: "text" },
      { key: "order", label: "Order", type: "number" },
      { key: "visible", label: "Visible on site", type: "switch" },
    ],
    cardImage: (r) => r.image,
    cardTitle: (r) => r.title,
    cardSubtitle: (r) => r.description,
  },
  {
    resource: "products",
    title: "Shop",
    singular: "Product",
    description: "Items in your shop — syncs to the /shop page and (soon) Stripe checkout.",
    icon: ShoppingBag,
    fields: [
      { key: "name", label: "Name", type: "text" },
      { key: "category", label: "Category", type: "text", placeholder: "Shampoo / Brush / Bed / Bandana…" },
      { key: "price", label: "Display price", type: "text", placeholder: "$34.00" },
      { key: "stripePriceId", label: "Stripe Price ID", type: "text", placeholder: "price_…  (enables checkout)", full: true },
      { key: "badge", label: "Badge", type: "text", placeholder: "Bestseller" },
      { key: "image", label: "Image", type: "image" },
      { key: "alt", label: "Alt text", type: "text" },
      { key: "description", label: "Description", type: "textarea", full: true },
      { key: "order", label: "Order", type: "number" },
      { key: "visible", label: "Visible on site", type: "switch" },
    ],
    cardImage: (r) => r.image,
    cardTitle: (r) => r.name,
    cardSubtitle: (r) => r.price,
  },
  {
    resource: "gallery",
    title: "Gallery",
    singular: "Photo",
    description: "Photos in the grooming results gallery.",
    icon: ImageIcon,
    fields: [
      { key: "alt", label: "Caption / alt", type: "text", full: true },
      {
        key: "category", label: "Category", type: "select",
        options: [
          { label: "GROOMING", value: "GROOMING" },
          { label: "BATH & SPA", value: "BATH & SPA" },
          { label: "TRANSFORMATIONS", value: "TRANSFORMATIONS" },
        ],
      },
      { key: "image", label: "Image", type: "image" },
      { key: "order", label: "Order", type: "number" },
      { key: "visible", label: "Visible", type: "switch" },
    ],
    cardImage: (r) => r.image,
    cardTitle: (r) => r.alt,
    cardSubtitle: (r) => r.category,
  },
  {
    resource: "packages",
    title: "Pricing Packages",
    singular: "Package",
    description: "Grooming packages priced by dog size.",
    icon: Tag,
    fields: [
      { key: "name", label: "Package name", type: "text", full: true },
      { key: "smallPrice", label: "Small", type: "text", placeholder: "$75" },
      { key: "mediumPrice", label: "Medium", type: "text", placeholder: "$95" },
      { key: "largePrice", label: "Large", type: "text", placeholder: "$115" },
      { key: "xlargePrice", label: "X-Large", type: "text", placeholder: "$135" },
      { key: "description", label: "Description", type: "textarea", full: true },
      { key: "featured", label: "Featured", type: "switch" },
      { key: "order", label: "Order", type: "number" },
    ],
    cardImage: () => null,
    cardTitle: (r) => r.name,
    cardSubtitle: (r) => `Small ${r.smallPrice} • Large ${r.largePrice}`,
  },
  {
    resource: "addons",
    title: "Add-ons",
    singular: "Add-on",
    description: "Optional services that can be added to any groom.",
    icon: Sparkle,
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "price", label: "Price", type: "text", placeholder: "$15" },
      { key: "icon", label: "Icon (lucide name)", type: "text", placeholder: "Sparkle" },
      { key: "order", label: "Order", type: "number" },
    ],
    cardImage: () => null,
    cardTitle: (r) => r.title,
    cardSubtitle: (r) => r.price,
  },
  {
    resource: "faqs",
    title: "FAQs",
    singular: "FAQ",
    description: "Common questions answered on the FAQ page.",
    icon: Question,
    fields: [
      { key: "question", label: "Question", type: "text", full: true },
      { key: "answer", label: "Answer", type: "textarea", full: true },
      { key: "order", label: "Order", type: "number" },
    ],
    cardImage: () => null,
    cardTitle: (r) => r.question,
    cardSubtitle: (r) => r.answer,
  },
  {
    resource: "policies",
    title: "Policies",
    singular: "Policy",
    description: "Salon policies shown on the FAQ page.",
    icon: ShieldCheck,
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "body", label: "Body", type: "textarea", full: true },
      { key: "order", label: "Order", type: "number" },
    ],
    cardImage: () => null,
    cardTitle: (r) => r.title,
    cardSubtitle: (r) => r.body,
  },
  {
    resource: "testimonials",
    title: "Testimonials",
    singular: "Testimonial",
    description: "Customer reviews shown on the home page.",
    icon: Quotes,
    fields: [
      { key: "quote", label: "Quote", type: "textarea", full: true },
      { key: "author", label: "Author", type: "text", placeholder: "Jessica M. & Cooper" },
      { key: "rating", label: "Rating (1-5)", type: "number" },
      { key: "order", label: "Order", type: "number" },
      { key: "visible", label: "Visible", type: "switch" },
    ],
    cardImage: () => null,
    cardTitle: (r) => r.author,
    cardSubtitle: (r) => `"${r.quote}"`,
  },
]

// ---- Simple lookup tables (name + active + order) ----
function lookupConfig(resource: string, title: string, singular: string, icon: Icon): ResourceConfig {
  return {
    resource, title, singular, icon,
    description: `Manage ${title.toLowerCase()} used in the booking wizard and dog profiles.`,
    fields: [
      { key: "name", label: "Name", type: "text", placeholder: "e.g. Teddy Bear Cut" },
      { key: "description", label: "Description", type: "textarea", full: true },
      { key: "sortOrder", label: "Sort Order", type: "number" },
      { key: "active", label: "Active", type: "switch" },
    ],
    cardImage: () => null,
    cardTitle: (r) => r.name,
    cardSubtitle: (r) => r.description || "",
  }
}

export const LOOKUP_RESOURCES: ResourceConfig[] = [
  lookupConfig("dog_breeds", "Dog Breeds", "Breed", Dog),
  lookupConfig("haircut_styles", "Haircut Styles", "Haircut Style", Scissors),
  lookupConfig("coat_types", "Coat Types", "Coat Type", PaintBrush),
  lookupConfig("coat_textures", "Coat Textures", "Coat Texture", PaintBrush),
  lookupConfig("coat_lengths", "Coat Lengths", "Coat Length", PaintBrush),
  lookupConfig("coat_conditions", "Coat Conditions", "Coat Condition", PaintBrush),
  lookupConfig("shedding_levels", "Shedding Levels", "Shedding Level", Drop),
  lookupConfig("clip_lengths", "Clip Lengths", "Clip Length", Scissors),
  lookupConfig("body_styles", "Body Styles", "Body Style", Scissors),
  lookupConfig("leg_styles", "Leg Styles", "Leg Style", Scissors),
  lookupConfig("face_styles", "Face Styles", "Face Style", Scissors),
  lookupConfig("head_styles", "Head Styles", "Head Style", Scissors),
  lookupConfig("ear_styles", "Ear Styles", "Ear Style", Scissors),
  lookupConfig("tail_styles", "Tail Styles", "Tail Style", Scissors),
  lookupConfig("feet_styles", "Feet Styles", "Feet Style", PawPrint),
  lookupConfig("sanitary_options", "Sanitary Options", "Sanitary Option", HandsPraying),
  lookupConfig("nail_services", "Nail Services", "Nail Service", PawPrint),
  lookupConfig("paw_pad_services", "Paw Pad Services", "Paw Pad Service", PawPrint),
  lookupConfig("ear_services", "Ear Services", "Ear Service", Sparkle),
  lookupConfig("teeth_services", "Teeth Services", "Teeth Service", Tooth),
  lookupConfig("deshedding_services", "Deshedding Services", "Deshedding Service", Drop),
  lookupConfig("coat_techniques", "Coat Techniques", "Coat Technique", PaintBrush),
  lookupConfig("staff", "Groomers", "Groomer", Users),
]

export const ALL_RESOURCES = [...RESOURCES, ...LOOKUP_RESOURCES]

// Map of stored icon-name strings (Lucide names, as saved in the DB) -> Phosphor
// components (used by records cards). The site renders the same stored names
// via Lucide (lib/icons.ts); the CMS just previews them with Phosphor.
export const ICONS: Record<string, Icon> = {
  Scissors, Bath: Bathtub, PawPrint, Droplets: Drop, Bug, ShoppingBag, ImageIcon,
  Tag, HelpCircle: Question, ShieldCheck, Quotes, Star,
  Sparkles: Sparkle, // Lucide "Sparkles" -> Phosphor "Sparkle"
}

export function getStoredIcon(name: string | null | undefined, fallback: Icon = Sparkle): Icon {
  if (name && ICONS[name]) return ICONS[name]
  return fallback
}
