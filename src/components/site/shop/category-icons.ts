import {
  Dog,
  Cat,
  Scissors,
  HeartPulse,
  Bone,
  BedDouble,
  Cookie,
  Tent,
  Sparkles,
  BadgePercent,
  Utensils,
  Shirt,
  Link2,
  PawPrint,
  type LucideIcon,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Category icon registry — presentation-layer mapping from the customer-
// facing category slug to a lucide (shadcn) icon. Icons are presentation,
// so they live in code; the categories themselves come from SQL.
// ---------------------------------------------------------------------------

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  // Virtual parent landings
  dog: Dog,
  cat: Cat,

  // Dog departments (customer-facing slugs from the resolver)
  "feeding-watering": Utensils,
  grooming: Scissors,
  "beds-furniture": BedDouble,
  treats: Cookie,
  "apparel-accessories": Shirt,
  "chew-toys": Bone,
  "collars-harnesses-leashes": Link2,
  travel: Tent,
  wellness: HeartPulse,

  // Merchandising collections
  "new-arrivals": Sparkles,
  sale: BadgePercent,
}

export function categoryIcon(key: string): LucideIcon {
  return CATEGORY_ICONS[key] || PawPrint
}
