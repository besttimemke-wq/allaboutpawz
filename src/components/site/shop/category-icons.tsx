import {
  Dog,
  Cat,
  Scissors,
  HeartPulse,
  Bone,
  BedDouble,
  Cookie,
  Tent,
  BadgePercent,
  Utensils,
  Shirt,
  Link2,
  PawPrint,
  Home,
  Trash2,
  ArrowUp,
  GraduationCap,
  Bug,
  ShieldCheck,
  SprayCan,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Category icon registry — presentation-layer mapping from the customer-
// facing category slug (or the full "animal/department" key from
// buildNavTreeFromTaxonomy) to a lucide (shadcn) icon. Every category gets
// a UNIQUE icon so the sidebar doesn't show the same paw for everything.
// ---------------------------------------------------------------------------

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  // ---- Virtual parent landings (animals) ----
  cat: Cat,
  dog: Dog,

  // ---- Cat departments (keyed by "cat/{dept-slug}") ----
  "cat/beds-bedding": BedDouble,
  "cat/bowls-feeders": Utensils,
  "cat/carriers-containment": Tent,
  "cat/cleaners-waste-disposal": SprayCan,
  "cat/clothing-accessories": Shirt,
  "cat/food": Utensils,
  "cat/furniture-scratchers": Home,
  "cat/grooming-bathing": Scissors,
  "cat/health-wellness": HeartPulse,
  "cat/litter-litter-boxes-accessories": Trash2,
  "cat/steps-ramps": ArrowUp,
  "cat/toys": Bone,
  "cat/training-behavior": GraduationCap,
  "cat/treats": Cookie,
  "cat/flea-tick": Bug,

  // ---- Dog departments (keyed by "dog/{dept-slug}") ----
  "dog/beds-bedding": BedDouble,
  "dog/bowls-feeding": Utensils,
  "dog/crates-containment": Tent,
  "dog/cleaning-potty-supplies": SprayCan,
  "dog/apparel-accessories": Shirt,
  "dog/collars-harnesses-leashes": Link2,
  "dog/food": Utensils,
  "dog/grooming-bathing": Scissors,
  "dog/health-wellness": HeartPulse,
  "dog/outdoor-travel-gear": Tent,
  "dog/toys": Bone,
  "dog/training-behavior-supplies": GraduationCap,
  "dog/treats-chews": Cookie,
  "dog/flea-tick": Bug,

  // ---- Legacy single-segment keys (for backwards compat with the old
  //      SQL taxonomy that may still be referenced somewhere) ----
  "feeding-watering": Utensils,
  "grooming": Scissors,
  "beds-furniture": BedDouble,
  "treats": Cookie,
  "apparel-accessories": Shirt,
  "chew-toys": Bone,
  "collars-harnesses-leashes": Link2,
  "travel": Tent,
  "wellness": HeartPulse,

  // ---- Merchandising collections (only Sale — New Arrivals was removed
  //      per the owner's directive: "Why is there a React for new arrival
  //      items that shit is not used in this site") ----
  sale: BadgePercent,
}

/** Resolve an icon for a category. Falls back to PawPrint only when no
 *  specific icon is registered for the key (which should be rare now that
 *  every cat + dog department has its own icon). */
export function categoryIcon(key: string): LucideIcon {
  return CATEGORY_ICONS[key] || PawPrint
}

/** Convenience export for components that want the default fallback. */
export const DEFAULT_CATEGORY_ICON = ShoppingBag
