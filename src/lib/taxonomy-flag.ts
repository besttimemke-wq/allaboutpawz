// ---------------------------------------------------------------------------
// Feature flag for the new taxonomy system. Gates the switch from the old
// pet_product_categories table to the new taxonomy_nodes table.
//
// Per owner spec Q4: "Feature-flag it, default OFF in production (old
// pet_product_categories stays live). The flag enables per-wave: Wave 1
// (30 departments + landings) flips only when every page in the wave
// passes §11a. Build the flag now; the owner flips it per wave."
//
// When false: the shop pages + mega menu read from the OLD catalog resolvers
// (pet_product_categories + commerce_products). The live site stays as-is.
//
// When true: the shop pages + mega menu read from the NEW taxonomy_nodes
// table. The new URL structure (/shop/cat/beds-bedding, /shop/dog/food)
// goes live.
//
// Override via env var NEXT_PUBLIC_TAXONOMY_ENABLED=true for per-wave
// rollouts. Default false = production stays on old taxonomy.
// ---------------------------------------------------------------------------

export const TAXONOMY_ENABLED =
  process.env.NEXT_PUBLIC_TAXONOMY_ENABLED === "true"

// Per-wave gates — when TAXONOMY_ENABLED is true, these control which
// waves are live. Owner flips these per-wave as pages pass §11a.
export const WAVE_1_LANDINGS = true   // /shop + 2 animal landings
export const WAVE_2_DEPARTMENTS = false // 30 department pages
export const WAVE_3_SUBCATEGORIES = false // ~120 subcategory pages
