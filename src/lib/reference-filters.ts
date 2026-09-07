// ---------------------------------------------------------------------------
// Reference filter sections — the imported shop repo's facet data, VERBATIM.
//
// Sources (safety refs, preserved shop repo):
//   • mockupCategoriesData.ts — the department pages' filterSections
//     (dog-feeding-watering-supplies = "Bowl Type / Material / Capacity /
//     Key Features / Brand", the deployed design's sidebar).
//   • feedingSubcategoriesData.ts — the 8 feeding-watering leaf pages.
//   • groomingSubcategoriesData.ts / treatsData.ts — the grooming + treats
//     leaf pages.
//
// Carried over EXACTLY as authored: titles, option labels, order, counts and
// checked states. A `count: null` option renders without a count label
// (the reference's Key Features rows); an absent count falls back to the
// live catalog count. `checked` renders the option checked on first paint
// (the reference's presentation state — the grid is NOT pre-filtered).
//
// Shape: category slug → sections. When a category route's node has an
// entry here, these sections REPLACE the DB-derived mapped filters for that
// route (the reference is the source of truth); everything else keeps the
// Supabase pet_category_filters path.
// ---------------------------------------------------------------------------

export type ReferenceFilterOption = {
  label: string
  colorHex?: string
  /** Reference facet count, rendered verbatim. null = render without a count. */
  count?: number | null
  /** Reference presentation state — renders checked on first paint. */
  checked?: boolean
}

export type ReferenceFilterSection = {
  title: string
  type: "checkbox" | "swatches" | "buttons"
  options: ReferenceFilterOption[]
}

export const REFERENCE_FILTER_SECTIONS: Record<string, ReferenceFilterSection[]> = {
  // ---- DOG FEEDING & WATERING — the department + wrapper pages (the
  // reference's exact sidebar: Bowl Type / Material / Capacity / Key
  // Features / Brand) ----
  "dog-feeding-watering-supplies": [
    { title: "Bowl Type", type: "checkbox", options: [
      { label: "Elevated", count: 19, checked: true },
      { label: "Slow Feeder", count: 24 },
      { label: "Standard", count: 38 },
      { label: "Travel / Portable", count: 15 },
    ] },
    { title: "Material", type: "checkbox", options: [
      { label: "Ceramic", count: 28, checked: true },
      { label: "Stainless Steel", count: 32 },
      { label: "Food-Grade Silicone", count: 18 },
      { label: "Bamboo & Natural Wood", count: 14 },
    ] },
    { title: "Capacity", type: "checkbox", options: [
      { label: "Under 2 Cups", count: 20 },
      { label: "2 – 4 Cups", count: 35 },
      { label: "4 – 8 Cups", count: 22 },
      { label: "8+ Cups", count: 14 },
    ] },
    { title: "Key Features", type: "checkbox", options: [
      { label: "Dishwasher Safe", count: null },
      { label: "Portion Control", count: null },
      { label: "Non-Skid Base", count: null },
      { label: "Automatic / Electric", count: null },
    ] },
    { title: "Brand", type: "checkbox", options: [
      { label: "Pawz & Co.", count: 28, checked: true },
      { label: "Wild One", count: 18 },
      { label: "Yeti Pet", count: 12 },
      { label: "Outward Hound", count: 16 },
    ] },
  ],
  "feeding-watering-supplies": [
    { title: "Bowl Type", type: "checkbox", options: [
      { label: "Elevated", count: 19, checked: true },
      { label: "Slow Feeder", count: 24 },
      { label: "Standard", count: 38 },
      { label: "Travel / Portable", count: 15 },
    ] },
    { title: "Material", type: "checkbox", options: [
      { label: "Ceramic", count: 28, checked: true },
      { label: "Stainless Steel", count: 32 },
      { label: "Food-Grade Silicone", count: 18 },
      { label: "Bamboo & Natural Wood", count: 14 },
    ] },
    { title: "Capacity", type: "checkbox", options: [
      { label: "Under 2 Cups", count: 20 },
      { label: "2 – 4 Cups", count: 35 },
      { label: "4 – 8 Cups", count: 22 },
      { label: "8+ Cups", count: 14 },
    ] },
    { title: "Key Features", type: "checkbox", options: [
      { label: "Dishwasher Safe", count: null },
      { label: "Portion Control", count: null },
      { label: "Non-Skid Base", count: null },
      { label: "Automatic / Electric", count: null },
    ] },
    { title: "Brand", type: "checkbox", options: [
      { label: "Pawz & Co.", count: 28, checked: true },
      { label: "Wild One", count: 18 },
      { label: "Yeti Pet", count: 12 },
      { label: "Outward Hound", count: 16 },
    ] },
  ],

  // ---- the 8 feeding-watering leaf pages (feedingSubcategoriesData) ----
  "automatic-feeders": [
    { title: "Capacity", type: "checkbox", options: [
      { label: "Under 2 Cups", count: 3 },
      { label: "2–4 Cups", count: 5 },
      { label: "4–8 Cups", count: 8, checked: true },
      { label: "8+ Cups", count: 2, checked: true },
    ] },
    { title: "Feeder Type", type: "checkbox", options: [
      { label: "Stainless Steel", count: 11 },
      { label: "Ceramic", count: 4 },
      { label: "Smart Feeder", count: 14, checked: true },
      { label: "Automatic Timed", count: 18, checked: true },
    ] },
    { title: "Features", type: "checkbox", options: [
      { label: "Portion Control", count: 16, checked: true },
      { label: "Wi-Fi Enabled", count: 10 },
      { label: "Battery Backup", count: 13, checked: true },
      { label: "Dishwasher Safe Hopper", count: 15 },
    ] },
    { title: "Brand", type: "checkbox", options: [
      { label: "Pawz & Co.", count: 9, checked: true },
      { label: "PetSafe", count: 4 },
      { label: "Whisker", count: 3 },
      { label: "WOPET", count: 2 },
    ] },
  ],
  "bowls-dishes": [
    { title: "Bowl Type", type: "checkbox", options: [
      { label: "Standard Bowls", count: 34, checked: true },
      { label: "Elevated Stands", count: 18, checked: true },
      { label: "Slow Feeders", count: 24, checked: true },
      { label: "Ceramic Stone", count: 28, checked: true },
      { label: "Stainless Steel", count: 22 },
    ] },
    { title: "Capacity", type: "checkbox", options: [
      { label: "Under 2 Cups (Small)", count: 12 },
      { label: "2–4 Cups (Medium)", count: 24, checked: true },
      { label: "4–8 Cups (Large)", count: 16, checked: true },
      { label: "8+ Cups (Giant)", count: 8 },
    ] },
    { title: "Material", type: "checkbox", options: [
      { label: "Heavy Ceramic Stoneware", count: 28, checked: true },
      { label: "Medical Stainless Steel", count: 18 },
      { label: "Natural Ash Wood Stand", count: 14 },
    ] },
    { title: "Glaze & Color", type: "swatches", options: [
      { label: "Oatmeal Speckle", colorHex: "#E8DFD5" },
      { label: "Terracotta Warm", colorHex: "#BD6B48" },
      { label: "Sage Calm", colorHex: "#A3AC99" },
      { label: "Cream White", colorHex: "#F4F1EA" },
      { label: "Slate Black", colorHex: "#363432" },
    ] },
  ],
  "feeding-mats": [
    { title: "Material Purity", type: "checkbox", options: [
      { label: "Food-Grade Silicone", count: 8, checked: true },
      { label: "Waterproof Vegan Leather", count: 3, checked: true },
      { label: "Natural Rubber", count: 1 },
    ] },
    { title: "Dimensions", type: "checkbox", options: [
      { label: "Small (16x12\")", count: 4 },
      { label: "Med (20x14\")", count: 6, checked: true },
      { label: "Large (24x16\")", count: 5, checked: true },
      { label: "XL (32x20\")", count: 2 },
    ] },
    { title: "Spill Perimeter", type: "checkbox", options: [
      { label: "Raised Lip Barrier (0.6\")", count: 9, checked: true },
      { label: "Flat Beveled Profile", count: 3 },
    ] },
  ],
  "food-storage": [
    { title: "Capacity", type: "checkbox", options: [
      { label: "5 lbs (Countertop)", count: 3 },
      { label: "15 lbs (Medium)", count: 6, checked: true },
      { label: "25-30 lbs (Pantry Core)", count: 5, checked: true },
      { label: "40+ lbs (Bulk Vault)", count: 2 },
    ] },
    { title: "Material", type: "checkbox", options: [
      { label: "Matte Steel with Wood Lid", count: 7, checked: true },
      { label: "Glazed Ceramic", count: 5, checked: true },
      { label: "BPA-Free Acrylic", count: 4 },
    ] },
    { title: "Seal Type", type: "checkbox", options: [
      { label: "Airtight Silicone Gasket", count: 12, checked: true },
      { label: "Vacuum Locking Lid", count: 4 },
    ] },
  ],
  "fountains": [
    { title: "Capacity", type: "checkbox", options: [
      { label: "1.5 – 2 Liters", count: 3 },
      { label: "2.5 – 3 Liters", count: 8, checked: true },
      { label: "4+ Liters (Large Dogs)", count: 3, checked: true },
    ] },
    { title: "Vessel Material", type: "checkbox", options: [
      { label: "Glazed Ceramic", count: 6, checked: true },
      { label: "304 Food-Grade Steel", count: 7, checked: true },
      { label: "BPA-Free Polymer", count: 1 },
    ] },
    { title: "Filtration Type", type: "checkbox", options: [
      { label: "Triple Carbon & Ion-Exchange", count: 10, checked: true },
      { label: "UV-C Sterilization Active", count: 4 },
    ] },
    { title: "Motor Acoustics", type: "checkbox", options: [
      { label: "Ultra Quiet < 20dB", count: 12, checked: true },
      { label: "Wireless Induction Pump", count: 5 },
    ] },
  ],
  "lick-mats": [
    { title: "Texture Pattern", type: "checkbox", options: [
      { label: "Honeycomb Pattern", count: null },
      { label: "Cross Maze", count: null, checked: true },
      { label: "Quadrant Multi-Texture", count: null, checked: true },
      { label: "Fine Micro-Dot", count: null },
    ] },
    { title: "Backing Mounting", type: "checkbox", options: [
      { label: "Heavy Suction (Wall/Tub)", count: null, checked: true },
      { label: "Flat Rubber Anti-Skid", count: null },
    ] },
    { title: "Thermal & Care Rating", type: "checkbox", options: [
      { label: "Freezer Safe (-40°F)", count: null, checked: true },
      { label: "Top-Rack Dishwasher Safe", count: null, checked: true },
      { label: "Microwave Warmable", count: null },
    ] },
  ],
  "nursing-supplies": [
    { title: "Product Type", type: "checkbox", options: [
      { label: "Nursing Bottles (3)", count: null, checked: true },
      { label: "Anti-Colic Nipples (2)", count: null, checked: true },
      { label: "Syringes & Droppers (1)", count: null },
      { label: "Milk Replacement Sets (2)", count: null },
    ] },
    { title: "Bottle Capacity", type: "checkbox", options: [
      { label: "2 oz (Toy/Neonatal)", count: null },
      { label: "4 oz (Standard Litter)", count: null, checked: true },
      { label: "8 oz (Weaning/Large Breed)", count: null },
    ] },
    { title: "Material & Safety", type: "checkbox", options: [
      { label: "BPA-Free Medical Silicone", count: null, checked: true },
      { label: "Borosilicate Glass", count: null },
      { label: "Boil & Dishwasher Safe", count: null, checked: true },
    ] },
  ],
  "water-bottles": [
    { title: "Fluid Capacity", type: "checkbox", options: [
      { label: "12 oz", count: null },
      { label: "19 oz (Selected)", count: null, checked: true },
      { label: "24 oz (Selected)", count: null, checked: true },
      { label: "32 oz+ High Volume", count: null },
    ] },
    { title: "Material Composition", type: "checkbox", options: [
      { label: "Double-Wall Insulated Steel", count: null, checked: true },
      { label: "BPA-Free Tritan Copolyester", count: null },
    ] },
    { title: "Trough & Drinking Style", type: "checkbox", options: [
      { label: "Fold-Out Leaf Bowl", count: null, checked: true },
      { label: "Integrated Cup Lid", count: null },
      { label: "One-Touch Dispenser Spout", count: null, checked: true },
    ] },
    { title: "Essential Features", type: "checkbox", options: [
      { label: "100% Leak-Proof Lock", count: null, checked: true },
      { label: "Water Recirculation Button", count: null, checked: true },
      { label: "Carabiner Clip Included", count: null },
    ] },
  ],

  // ---- grooming leaves (groomingSubcategoriesData) ----
  "brushes": [
    { title: "Brush Type", type: "checkbox", options: [
      { label: "Slicker Brush" },
      { label: "Boar Bristle" },
      { label: "Dual-Sided Pin & Bristle" },
      { label: "Cushion Palm Brush" }
    ] },
    { title: "Coat Type", type: "checkbox", options: [
      { label: "Short Hair" },
      { label: "Medium Coat" },
      { label: "Long & Silky" },
      { label: "Double Coat" }
    ] },
    { title: "Handle Material", type: "checkbox", options: [
      { label: "Sustainable Beechwood" },
      { label: "Organic Bamboo" },
      { label: "Ergonomic Matte Silicone" }
    ] },
  ],
  "claw-care": [
    { title: "Tool Type", type: "checkbox", options: [
      { label: "Scissor-Style Clipper" },
      { label: "Rotary Grinder" },
      { label: "Guillotine Clipper" },
      { label: "Diamond Emery File" }
    ] },
    { title: "Breed Scale", type: "checkbox", options: [
      { label: "Toy & Puppy (<15 lbs)" },
      { label: "Medium Breeds (15\u201350 lbs)" },
      { label: "Large Breeds (50\u201390 lbs)" }
    ] },
  ],
  "colognes": [
    { title: "Scent Profile", type: "checkbox", options: [
      { label: "Lavender & Wild Mint" },
      { label: "Cedarwood & Amber" },
      { label: "Sweet Almond & Vanilla" }
    ] },
  ],
  "combs": [
    { title: "Comb Type", type: "checkbox", options: [
      { label: "Greyhound Style" },
      { label: "Dual-Tooth Coarse/Fine" },
      { label: "Face & Muzzle Comb" }
    ] },
  ],
  "dander-remover-sprays": [
    { title: "Active Ingredient", type: "checkbox", options: [
      { label: "Colloidal Oatmeal" },
      { label: "Organic Aloe Vera" }
    ] },
  ],
  "dematting-tools": [
    { title: "Tool Type", type: "checkbox", options: [
      { label: "Double-Sided Dematting Rake" },
      { label: "Mat Splitter Razor" },
      { label: "Safety Mat Cutter" }
    ] },
  ],
  "deodorizers": [
    { title: "Active Technology", type: "checkbox", options: [
      { label: "Bio-Enzymatic" },
      { label: "Baking Soda & Zinc" }
    ] },
  ],
  "electric-clippers-blades": [
    { title: "Power Type", type: "checkbox", options: [
      { label: "Cordless Lithium-Ion" },
      { label: "2-Speed Rotary" },
      { label: "Corded Heavy-Duty" }
    ] },
  ],
  "grooming-wipes": [
    { title: "Target Area", type: "checkbox", options: [
      { label: "Paws & Sanitary Care" },
      { label: "Face & Eye Tear-Stain" }
    ] },
  ],
  "hair-removal-mitts-rollers": [
    { title: "Tool Mechanism", type: "checkbox", options: [
      { label: "Electrostatic Velvet" },
      { label: "Adhesive Roller (Recycled)" }
    ] },
  ],
  "scissors": [
    { title: "Shear Configuration", type: "checkbox", options: [
      { label: "Curved Shaping Shears" },
      { label: "Straight Finishing Shears" },
      { label: "Thinning & Blending" },
      { label: "Safety Rounded Ball-Tip" }
    ] },
  ],
  "shampoos-conditioners": [
    { title: "Formula Purpose", type: "checkbox", options: [
      { label: "Soothing & Anti-Itch" },
      { label: "Hydrating Conditioner" }
    ] },
  ],
  "shedding-tools": [
    { title: "Tool Silhouette", type: "checkbox", options: [
      { label: "Undercoat Deshedding Rake" },
      { label: "Curved Shedding Loop Blade" }
    ] },
  ],
  "shower-bath-supplies": [
    { title: "Product Category", type: "checkbox", options: [
      { label: "Showerhead Sprayers & Hoses" },
      { label: "Bath Robes & Drying Towels" }
    ] },
  ],
  "styptic-gels-powders": [
    { title: "Delivery Format", type: "checkbox", options: [
      { label: "Fast-Clotting Powder" },
      { label: "Precision Applicator Gel" }
    ] },
  ],
  "snacks": [
    { title: "Dietary Preference", type: "checkbox", options: [
      { label: "Grain-Free" },
      { label: "Single-Protein" },
      { label: "Human-Grade Organic" },
      { label: "Hypoallergenic" }
    ] },
    { title: "Texture & Consistency", type: "checkbox", options: [
      { label: "Crunchy Double-Baked" },
      { label: "Soft & Chewy" },
      { label: "Freeze-Dried Raw" }
    ] },
  ],
}
