// ---------------------------------------------------------------------------
// Reference filter sections — the imported shop repo's per-subcategory facet
// data (git c00e59d: src/data/feedingSubcategoriesData.ts,
// groomingSubcategoriesData.ts, treatsData.ts). Extracted verbatim: titles,
// option labels, and option order. Counts are NOT carried over — they are
// computed live against the catalog (0-count options dim, exactly like the
// DB-driven sections).
//
// Shape: subcategory slug → sections. When a category route's node has an
// entry here, these sections REPLACE the DB-derived mapped filters for that
// route (the reference is the source of truth); everything else keeps the
// Supabase pet_category_filters path.
// ---------------------------------------------------------------------------

export type ReferenceFilterSection = {
  title: string
  type: "checkbox" | "swatches" | "buttons"
  options: { label: string; colorHex?: string }[]
}

export const REFERENCE_FILTER_SECTIONS: Record<string, ReferenceFilterSection[]> = {
  "automatic-feeders": [
    { title: "Capacity", type: "checkbox", options: [
      { label: "Under 2 Cups" },
      { label: "2\u20134 Cups" },
      { label: "4\u20138 Cups" },
      { label: "8+ Cups" }
    ] },
    { title: "Feeder Type", type: "checkbox", options: [
      { label: "Stainless Steel" },
      { label: "Ceramic" },
      { label: "Smart Feeder" },
      { label: "Automatic Timed" }
    ] },
    { title: "Features", type: "checkbox", options: [
      { label: "Portion Control" },
      { label: "Wi-Fi Enabled" },
      { label: "Battery Backup" },
      { label: "Dishwasher Safe Hopper" }
    ] },
    { title: "Brand", type: "checkbox", options: [
      { label: "Pawz & Co." },
      { label: "PetSafe" },
      { label: "Whisker" },
      { label: "WOPET" }
    ] },
  ],
  "bowls-dishes": [
    { title: "Bowl Type", type: "checkbox", options: [
      { label: "Standard Bowls" },
      { label: "Elevated Stands" },
      { label: "Slow Feeders" },
      { label: "Ceramic Stone" },
      { label: "Stainless Steel" }
    ] },
    { title: "Capacity", type: "checkbox", options: [
      { label: "Under 2 Cups (Small)" },
      { label: "2\u20134 Cups (Medium)" },
      { label: "4\u20138 Cups (Large)" },
      { label: "8+ Cups (Giant)" }
    ] },
    { title: "Material", type: "checkbox", options: [
      { label: "Heavy Ceramic Stoneware" },
      { label: "Medical Stainless Steel" },
      { label: "Natural Ash Wood Stand" }
    ] },
  ],
  "feeding-mats": [
    { title: "Material Purity", type: "checkbox", options: [
      { label: "Food-Grade Silicone" },
      { label: "Waterproof Vegan Leather" },
      { label: "Natural Rubber" }
    ] },
    { title: "Dimensions", type: "checkbox", options: [
      { label: "Small (16x12\")" },
      { label: "Med (20x14\")" },
      { label: "Large (24x16\")" },
      { label: "XL (32x20\")" }
    ] },
    { title: "Spill Perimeter", type: "checkbox", options: [
      { label: "Raised Lip Barrier (0.6\")" },
      { label: "Flat Beveled Profile" }
    ] },
  ],
  "food-storage": [
    { title: "Capacity", type: "checkbox", options: [
      { label: "5 lbs (Countertop)" },
      { label: "15 lbs (Medium)" },
      { label: "25-30 lbs (Pantry Core)" },
      { label: "40+ lbs (Bulk Vault)" }
    ] },
    { title: "Material", type: "checkbox", options: [
      { label: "Matte Steel with Wood Lid" },
      { label: "Glazed Ceramic" },
      { label: "BPA-Free Acrylic" }
    ] },
    { title: "Seal Type", type: "checkbox", options: [
      { label: "Airtight Silicone Gasket" },
      { label: "Vacuum Locking Lid" }
    ] },
  ],
  "fountains": [
    { title: "Capacity", type: "checkbox", options: [
      { label: "1.5 \u2013 2 Liters" },
      { label: "2.5 \u2013 3 Liters" },
      { label: "4+ Liters (Large Dogs)" }
    ] },
    { title: "Vessel Material", type: "checkbox", options: [
      { label: "Glazed Ceramic" },
      { label: "304 Food-Grade Steel" },
      { label: "BPA-Free Polymer" }
    ] },
    { title: "Filtration Type", type: "checkbox", options: [
      { label: "Triple Carbon & Ion-Exchange" },
      { label: "UV-C Sterilization Active" }
    ] },
    { title: "Motor Acoustics", type: "checkbox", options: [
      { label: "Ultra Quiet < 20dB" },
      { label: "Wireless Induction Pump" }
    ] },
  ],
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
