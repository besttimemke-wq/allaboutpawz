// ---------------------------------------------------------------------------
// Shop facets — the canonical taxonomy of filterable product attributes.
//
// Sourced verbatim from the owner's pasted-content spec (the filter tree for
// every shop landing + department page: Cat Landing, Cat Food, Cat Treats,
// Cat Litter, Furniture & Scratchers, Litter Boxes & Accessories, Cat Toys,
// Carriers & Travel, Cat Health & Wellness, Cat Beds, Bowls & Feeders,
// Flea & Tick, Top Dog Deals, Dog Food, Dog Treats, Flea & Tick, Dog Health
// & Wellness, Crates & Containment, Dog Cleanup, Dog Beds, Dog Bowls &
// Feeding, Dog Toys, Collars/Harnesses & Leashes).
//
// This is the SCAFFOLDING — the customer-facing rail on every shop page
// renders these facets whether or not product data populates them yet.
// Options that have product counts render with `(N)` counts; options
// without product coverage render count-free (so the facet is visible
// for SEO + future inventory, but does not lie about depth).
//
// Page-specific facets (per the spec): every shop landing/department page
// declares the facets it should expose, in order, via SHOP_PAGE_FACETS.
// Subcategory pages inherit their department's facet set.
// ---------------------------------------------------------------------------

export type FacetOption = {
  /** URL-safe value used in ?size=small,small-breed URL params. */
  value: string
  /** Customer-facing label. */
  label: string
}

export type FacetDefinition = {
  /** URL query param key, e.g. "brand", "size", "flavor". */
  key: string
  /** Customer-facing section label, e.g. "Brand", "Size", "Flavor". */
  label: string
  /** The set of options for this facet (may be partial per page via SHOP_PAGE_FACETS). */
  options: FacetOption[]
  /** When true, render the section with a brand-style search filter input. */
  searchable?: boolean
  /** When true, render options collapsible after the first N (default 6). */
  collapsible?: boolean
  /** Default number of options shown before "Show more" toggle. */
  defaultVisible?: number
}

// ---------------------------------------------------------------------------
// All facet options (the union of every spec page) — single source of truth.
// Page-level facet sets (below) reference these by key + filtered options.
// ---------------------------------------------------------------------------

export const FACET_OPTIONS: Record<string, FacetOption[]> = {
  // ---- Brand (placeholder — published when brand data lands) ----
  brand: [
    { value: "all-about-pawz", label: "All About Pawz" },
    { value: "pawz-signature", label: "Pawz Signature" },
    { value: "pawz-pro", label: "Pawz Pro" },
  ],

  // ---- Food Form (full union — covers cat + dog food + treats pages) ----
  foodForm: [
    { value: "crunchy", label: "Crunchy" },
    { value: "dry-food", label: "Dry Food" },
    { value: "pellet", label: "Pellet" },
    { value: "pellets", label: "Pellets" },
    { value: "blended", label: "Blended" },
    { value: "chunks-in-gravy", label: "Chunks in Gravy" },
    { value: "gravy", label: "Gravy" },
    { value: "pate", label: "Pate" },
    { value: "shredded", label: "Shredded" },
    { value: "flakes", label: "Flakes" },
    { value: "raw-freeze-dried", label: "Raw Freeze Dried" },
    { value: "freeze-dried", label: "Freeze Dried" },
    { value: "wet-food", label: "Wet Food" },
    { value: "liquid", label: "Liquid" },
    { value: "puree", label: "Puree" },
    { value: "powder", label: "Powder" },
    { value: "minced", label: "Minced" },
    { value: "broth", label: "Broth" },
    { value: "chunky", label: "Chunky" },
    { value: "loaf", label: "Loaf" },
    { value: "treats", label: "Treats" },
    { value: "semi-moist", label: "Semi-Moist" },
    { value: "fresh", label: "Fresh" },
    { value: "dehydrated", label: "Dehydrated" },
    { value: "food-topping", label: "Food Topping" },
    { value: "soft-and-chewy", label: "Soft & Chewy" },
  ],

  // ---- Life Stage ----
  lifeStage: [
    { value: "puppy", label: "Puppy" },
    { value: "kitten", label: "Kitten" },
    { value: "adult", label: "Adult" },
    { value: "senior", label: "Senior" },
    { value: "all-lifestages", label: "All Lifestages" },
  ],

  // ---- Flavor (full union — cat food + dog food + treats) ----
  flavor: [
    { value: "fish", label: "Fish" },
    { value: "salmon", label: "Salmon" },
    { value: "tuna", label: "Tuna" },
    { value: "seafood", label: "Seafood" },
    { value: "whitefish", label: "Whitefish" },
    { value: "shrimp", label: "Shrimp" },
    { value: "chicken", label: "Chicken" },
    { value: "chicken-liver", label: "Chicken Liver" },
    { value: "turkey", label: "Turkey" },
    { value: "beef", label: "Beef" },
    { value: "lamb", label: "Lamb" },
    { value: "pork", label: "Pork" },
    { value: "bacon", label: "Bacon" },
    { value: "ham", label: "Ham" },
    { value: "duck", label: "Duck" },
    { value: "rabbit", label: "Rabbit" },
    { value: "venison", label: "Venison" },
    { value: "boar", label: "Boar" },
    { value: "bison", label: "Bison" },
    { value: "buffalo", label: "Buffalo" },
    { value: "alligator", label: "Alligator" },
    { value: "quail", label: "Quail" },
    { value: "pheasant", label: "Pheasant" },
    { value: "fowl", label: "Fowl" },
    { value: "liver", label: "Liver" },
    { value: "egg", label: "Egg" },
    { value: "cheese", label: "Cheese" },
    { value: "milk", label: "Milk" },
    { value: "yogurt", label: "Yogurt" },
    { value: "rice", label: "Rice" },
    { value: "potato", label: "Potato" },
    { value: "sweet-potato", label: "Sweet Potato" },
    { value: "peas", label: "Peas" },
    { value: "pumpkin", label: "Pumpkin" },
    { value: "carrot", label: "Carrot" },
    { value: "apple", label: "Apple" },
    { value: "banana", label: "Banana" },
    { value: "cranberry", label: "Cranberry" },
    { value: "coconut", label: "Coconut" },
    { value: "fruit", label: "Fruit" },
    { value: "fruits-and-vegetables", label: "Fruits & Vegetables" },
    { value: "vegetable", label: "Vegetable" },
    { value: "peanut-butter", label: "Peanut Butter" },
    { value: "peanut", label: "Peanut" },
    { value: "honey", label: "Honey" },
    { value: "maple", label: "Maple" },
    { value: "mint", label: "Mint" },
    { value: "peppermint", label: "Peppermint" },
    { value: "vanilla", label: "Vanilla" },
    { value: "catnip", label: "Catnip" },
    { value: "hickory", label: "Hickory" },
    { value: "barbecue", label: "Barbecue" },
    { value: "bacon-and-cheese", label: "Bacon & Cheese" },
    { value: "carob", label: "Carob" },
    { value: "pepperoni", label: "Pepperoni" },
    { value: "assorted", label: "Assorted" },
    { value: "original", label: "Original" },
    { value: "natural", label: "Natural" },
  ],

  // ---- Health Feature (full union) ----
  healthFeature: [
    { value: "advanced-age", label: "Advanced Age" },
    { value: "allergy-relief", label: "Allergy Relief" },
    { value: "antioxidant", label: "Antioxidant" },
    { value: "appetite-stimulant", label: "Appetite Stimulant" },
    { value: "brain-health", label: "Brain Health" },
    { value: "breath-freshener", label: "Breath Freshener" },
    { value: "calming", label: "Calming" },
    { value: "clumping", label: "Clumping" },
    { value: "dental", label: "Dental" },
    { value: "dental-care", label: "Dental Care" },
    { value: "dental-health", label: "Dental Health" },
    { value: "diabetic-support", label: "Diabetic Support" },
    { value: "digestive-health", label: "Digestive Health" },
    { value: "sensitive-digestion", label: "Sensitive Digestion" },
    { value: "sensitive-stomach", label: "Sensitive Stomach" },
    { value: "eye-care", label: "Eye Care" },
    { value: "grain-free", label: "Grain-Free" },
    { value: "hairball", label: "Hairball" },
    { value: "hairball-control", label: "Hairball Control" },
    { value: "heart-care", label: "Heart Care" },
    { value: "hip-and-joint", label: "Hip and Joint" },
    { value: "holistic", label: "Holistic" },
    { value: "homeopathic", label: "Homeopathic" },
    { value: "hydrolyzed-protein", label: "Hydrolyzed Protein" },
    { value: "immune-support", label: "Immune Support" },
    { value: "kidney-care", label: "Kidney Care" },
    { value: "lactose-free", label: "Lactose Free" },
    { value: "liver-care", label: "Liver Care" },
    { value: "low-glycemic", label: "Low Glycemic" },
    { value: "metabolic", label: "Metabolic" },
    { value: "multi-vitamin", label: "Muli-Vitamin" },
    { value: "muscle-care", label: "Muscle Care" },
    { value: "natural", label: "Natural" },
    { value: "organic", label: "Organic" },
    { value: "recovery", label: "Recovery" },
    { value: "renal-support", label: "Renal Support" },
    { value: "scientific-formula", label: "Scientific Formula" },
    { value: "sensitive-skin-and-coat", label: "Sensitive Skin and Coat" },
    { value: "shed-control", label: "Shed Control" },
    { value: "skin-and-coat", label: "Skin & Coat" },
    { value: "sport-endurance", label: "Sport/Endurance" },
    { value: "stress-relief", label: "Stress Relief" },
    { value: "supplemental-topper", label: "Supplemental Topper" },
    { value: "urinary-tract-health", label: "Urinary Tract Health" },
    { value: "weaning-formula", label: "Weaning Formula" },
    { value: "weight-management", label: "Weight Management" },
    { value: "aging", label: "Aging" },
  ],

  // ---- Color ----
  color: [
    { value: "black", label: "Black" },
    { value: "blue", label: "Blue" },
    { value: "bronze", label: "Bronze" },
    { value: "brown", label: "Brown" },
    { value: "clear", label: "Clear" },
    { value: "cream", label: "Cream" },
    { value: "gold", label: "Gold" },
    { value: "green", label: "Green" },
    { value: "grey", label: "Grey" },
    { value: "multi-color", label: "Multi-Color" },
    { value: "natural-wood", label: "Natural Wood" },
    { value: "orange", label: "Orange" },
    { value: "pink", label: "Pink" },
    { value: "purple", label: "Purple" },
    { value: "red", label: "Red" },
    { value: "silver", label: "Silver" },
    { value: "tan", label: "Tan" },
    { value: "teal", label: "Teal" },
    { value: "white", label: "White" },
    { value: "yellow", label: "Yellow" },
  ],

  // ---- Material (full union) ----
  material: [
    { value: "cardboard", label: "Cardboard" },
    { value: "plastic", label: "Plastic" },
    { value: "synthetic-material", label: "Synthetic Material" },
    { value: "plant-material", label: "Plant Material" },
    { value: "plush", label: "Plush" },
    { value: "fabric", label: "Fabric" },
    { value: "recycled-material", label: "Recycled Material" },
    { value: "vinyl", label: "Vinyl" },
    { value: "wood", label: "Wood" },
    { value: "stone", label: "Stone" },
    { value: "nylon", label: "Nylon" },
    { value: "silicone", label: "Silicone" },
    { value: "metal", label: "Metal" },
    { value: "rubber", label: "Rubber" },
    { value: "catnip", label: "Catnip" },
    { value: "foam", label: "Foam" },
    { value: "feather", label: "Feather" },
    { value: "leather", label: "Leather" },
    { value: "neoprene", label: "Neoprene" },
    { value: "ribbon", label: "Ribbon" },
    { value: "natural-material", label: "Natural Material" },
    { value: "velvet", label: "Velvet" },
    { value: "rope", label: "Rope" },
    { value: "glass", label: "Glass" },
    { value: "paper", label: "Paper" },
    { value: "mesh", label: "Mesh" },
    { value: "microfiber", label: "Microfiber" },
    { value: "satin", label: "Satin" },
    { value: "viscose", label: "Viscose" },
    { value: "tpe", label: "TPE" },
    { value: "tpu", label: "TPU" },
  ],

  // ---- Breed Size ----
  breedSize: [
    { value: "extra-small-breed", label: "Extra Small Breed" },
    { value: "small-breed", label: "Small Breed" },
    { value: "medium-breed", label: "Medium Breed" },
    { value: "large-breed", label: "Large Breed" },
    { value: "extra-large-breed", label: "Extra Large Breed" },
    { value: "all-breeds", label: "All Breeds" },
  ],

  // ---- Product Weight ----
  productWeight: [
    { value: "less-than-1-lb", label: "Less than 1 lb" },
    { value: "1-5-lbs", label: "1-5 lbs" },
    { value: "5-10-lbs", label: "5-10 lbs" },
    { value: "10-20-lbs", label: "10-20 lbs" },
    { value: "20-50-lbs", label: "20-50 lbs" },
    { value: "50-100-lbs", label: "50-100 lbs" },
    { value: "100-lbs-and-more", label: "100 lbs and more" },
  ],

  // ---- Frame Material (furniture-specific) ----
  frameMaterial: [
    { value: "wood", label: "Wood" },
    { value: "cardboard", label: "Cardboard" },
    { value: "artificial-wood", label: "Artificial Wood" },
    { value: "metal", label: "Metal" },
    { value: "plastic", label: "Plastic" },
    { value: "engineered-wood", label: "Engineered Wood" },
  ],

  // ---- Apparel Type ----
  apparelType: [
    { value: "shirt", label: "Shirt" },
    { value: "accessory", label: "Accessory" },
    { value: "hoodie", label: "Hoodie" },
    { value: "life-jackets", label: "Life Jackets" },
    { value: "costume", label: "Costume" },
    { value: "bandanas-scarves", label: "Bandanas & Scarves" },
    { value: "jersey-team-apparel", label: "Jersey & Team Apparel" },
    { value: "pajamas", label: "Pajamas" },
    { value: "coats-jackets", label: "Coats & Jackets" },
    { value: "sweater", label: "Sweater" },
    { value: "onesies", label: "Onesies" },
    { value: "hats", label: "Hats" },
    { value: "dresses", label: "Dresses" },
    { value: "tank-top", label: "Tank Top" },
    { value: "cooling-gear", label: "Cooling Gear" },
    { value: "pouches-bags", label: "Pouches & Bags" },
    { value: "jewelry-charms", label: "Jewelry & Charms" },
    { value: "hair-accessories", label: "Hair Accessories" },
    { value: "swimsuits", label: "Swimsuits" },
  ],

  // ---- Size (apparel / collars / etc) ----
  size: [
    { value: "xxx-small", label: "XXX-Small" },
    { value: "xx-small", label: "XX-Small" },
    { value: "x-small", label: "X-Small" },
    { value: "small", label: "Small" },
    { value: "medium", label: "Medium" },
    { value: "large", label: "Large" },
    { value: "x-large", label: "X-Large" },
    { value: "xx-large", label: "XX-Large" },
    { value: "xxx-large-and-up", label: "XXX-Large & Up" },
    { value: "one-size-fits-most", label: "One Size Fits Most" },
  ],

  // ---- Price Buckets ----
  priceBuckets: [
    { value: "under-10", label: "Under $10" },
    { value: "10-25", label: "$10 to $25" },
    { value: "25-50", label: "$25 to $50" },
    { value: "50-100", label: "$50 to $100" },
    { value: "over-100", label: "Over $100" },
  ],

  // ---- Customer Rating ----
  customerRating: [
    { value: "4", label: "4★ & up" },
    { value: "3", label: "3★ & up" },
    { value: "2", label: "2★ & up" },
    { value: "1", label: "1★ & up" },
  ],
}

// ---------------------------------------------------------------------------
// Page-level facet sets — which facets each shop landing/department page
// exposes, in the order they should render in the sidebar.
//
// Per the spec, every page lists Categories + Brand + Price + Customer Rating
// at minimum, plus department-specific facets. Subcategory pages inherit
// their parent department's facet set.
//
// Keys are URL paths (e.g. "/shop/cat", "/shop/cat/food").
// ---------------------------------------------------------------------------

export type PageFacets = {
  /** Path key this set applies to (the department or animal landing URL). */
  path: string
  /** Ordered list of facet keys to render in the sidebar. */
  facets: string[]
}

/**
 * The default facet set for the shop home, animal landings, and any path
 * not explicitly listed in SHOP_PAGE_FACETS. Per the spec, the cat landing
 * page is the canonical "all facets" reference.
 */
export const DEFAULT_FACETS: string[] = [
  "categories",
  "brand",
  "price",
  "customerRating",
  "lifeStage",
  "breedSize",
  "color",
  "material",
]

/**
 * Page-specific facet sets. When a path isn't listed here, the page falls
 * back to DEFAULT_FACETS. Subcategory pages inherit their parent
 * department's set (the resolver in lib/shop/catalog.ts handles this).
 */
export const SHOP_PAGE_FACETS: Record<string, string[]> = {
  // ---- Cat landing (the spec reference page — all common facets) ----
  "/shop/cat": [
    "categories",
    "brand",
    "foodForm",
    "lifeStage",
    "flavor",
    "healthFeature",
    "color",
    "price",
    "customerRating",
    "material",
    "breedSize",
    "productWeight",
    "frameMaterial",
  ],

  // ---- Cat Food (full food form + flavor + health feature unions) ----
  "/shop/cat/food": [
    "categories",
    "brand",
    "foodForm",
    "flavor",
    "lifeStage",
    "healthFeature",
    "price",
    "customerRating",
    "breedSize",
    "productWeight",
  ],

  // ---- Cat Treats ----
  "/shop/cat/treats": [
    "categories",
    "brand",
    "flavor",
    "healthFeature",
    "price",
    "customerRating",
    "breedSize",
  ],

  // ---- Cat Litter ----
  "/shop/cat/litter-litter-boxes-accessories": [
    "categories",
    "brand",
    "material",
    "healthFeature",
    "price",
    "customerRating",
    "productWeight",
  ],

  // ---- Cat Furniture & Scratchers ----
  "/shop/cat/furniture-scratchers": [
    "categories",
    "brand",
    "material",
    "frameMaterial",
    "color",
    "price",
    "customerRating",
    "productWeight",
  ],

  // ---- Cat Litter Boxes & Accessories ----
  "/shop/cat/litter-litter-boxes-accessories/cat-litter-boxes-accessories": [
    "categories",
    "brand",
    "material",
    "color",
    "price",
    "customerRating",
    "productWeight",
  ],

  // ---- Cat Toys ----
  "/shop/cat/toys": [
    "categories",
    "brand",
    "material",
    "flavor",
    "color",
    "price",
    "customerRating",
    "breedSize",
  ],

  // ---- Cat Carriers & Travel ----
  "/shop/cat/carriers-containment": [
    "categories",
    "brand",
    "material",
    "color",
    "size",
    "breedSize",
    "price",
    "customerRating",
    "productWeight",
  ],

  // ---- Cat Health & Wellness ----
  "/shop/cat/health-wellness": [
    "categories",
    "brand",
    "healthFeature",
    "flavor",
    "lifeStage",
    "breedSize",
    "price",
    "customerRating",
    "productWeight",
  ],

  // ---- Cat Beds ----
  "/shop/cat/beds-bedding": [
    "categories",
    "brand",
    "material",
    "color",
    "size",
    "breedSize",
    "price",
    "customerRating",
  ],

  // ---- Cat Bowls & Feeders ----
  "/shop/cat/bowls-feeders": [
    "categories",
    "brand",
    "material",
    "color",
    "size",
    "price",
    "customerRating",
  ],

  // ---- Cat Flea & Tick ----
  "/shop/cat/flea-tick": [
    "categories",
    "brand",
    "healthFeature",
    "lifeStage",
    "breedSize",
    "productWeight",
    "price",
    "customerRating",
  ],

  // ---- Dog landing ----
  "/shop/dog": [
    "categories",
    "brand",
    "lifeStage",
    "breedSize",
    "color",
    "material",
    "price",
    "customerRating",
    "apparelType",
    "size",
  ],

  // ---- Dog Food ----
  "/shop/dog/food": [
    "categories",
    "brand",
    "foodForm",
    "flavor",
    "lifeStage",
    "healthFeature",
    "breedSize",
    "productWeight",
    "price",
    "customerRating",
  ],

  // ---- Dog Treats ----
  "/shop/dog/treats-chews": [
    "categories",
    "brand",
    "flavor",
    "healthFeature",
    "lifeStage",
    "breedSize",
    "price",
    "customerRating",
  ],

  // ---- Dog Flea & Tick ----
  "/shop/dog/flea-tick": [
    "categories",
    "brand",
    "healthFeature",
    "lifeStage",
    "breedSize",
    "productWeight",
    "price",
    "customerRating",
  ],

  // ---- Dog Health & Wellness ----
  "/shop/dog/health-wellness": [
    "categories",
    "brand",
    "healthFeature",
    "flavor",
    "lifeStage",
    "breedSize",
    "price",
    "customerRating",
    "productWeight",
  ],

  // ---- Dog Crates & Containment ----
  "/shop/dog/crates-containment": [
    "categories",
    "brand",
    "material",
    "size",
    "breedSize",
    "color",
    "price",
    "customerRating",
    "productWeight",
  ],

  // ---- Dog Cleanup ----
  "/shop/dog/cleanup": [
    "categories",
    "brand",
    "material",
    "color",
    "price",
    "customerRating",
    "productWeight",
  ],

  // ---- Dog Beds ----
  "/shop/dog/beds-bedding": [
    "categories",
    "brand",
    "material",
    "color",
    "size",
    "breedSize",
    "price",
    "customerRating",
  ],

  // ---- Dog Bowls & Feeding ----
  "/shop/dog/bowls-feeding": [
    "categories",
    "brand",
    "material",
    "color",
    "size",
    "breedSize",
    "price",
    "customerRating",
  ],

  // ---- Dog Toys ----
  "/shop/dog/toys": [
    "categories",
    "brand",
    "material",
    "flavor",
    "color",
    "size",
    "breedSize",
    "price",
    "customerRating",
  ],

  // ---- Dog Collars, Harnesses & Leashes ----
  "/shop/dog/collars-harnesses-leashes": [
    "categories",
    "brand",
    "material",
    "color",
    "size",
    "breedSize",
    "price",
    "customerRating",
  ],

  // ---- Dog Apparel & Accessories ----
  "/shop/dog/apparel-accessories": [
    "categories",
    "brand",
    "apparelType",
    "material",
    "color",
    "size",
    "breedSize",
    "price",
    "customerRating",
  ],

  // ---- Dog Grooming & Bathing ----
  "/shop/dog/grooming-bathing": [
    "categories",
    "brand",
    "material",
    "healthFeature",
    "breedSize",
    "price",
    "customerRating",
  ],

  // ---- Dog Outdoor & Travel ----
  "/shop/dog/outdoor-travel-gear": [
    "categories",
    "brand",
    "material",
    "color",
    "size",
    "breedSize",
    "price",
    "customerRating",
    "productWeight",
  ],

  // ---- Dog Cleaning & Potty Supplies ----
  "/shop/dog/cleaning-potty-supplies": [
    "categories",
    "brand",
    "material",
    "color",
    "price",
    "customerRating",
    "productWeight",
  ],
}

// ---------------------------------------------------------------------------
// Resolver — given a path, return the facet keys to render. Walks up the
// path until it finds a match in SHOP_PAGE_FACETS, falling back to the
// DEFAULT_FACETS set. Subcategories inherit their department's set.
// ---------------------------------------------------------------------------

export function resolveFacetsForPath(path: string): string[] {
  if (SHOP_PAGE_FACETS[path]) return SHOP_PAGE_FACETS[path]
  // Walk up: /shop/cat/beds-bedding/bolster-cat-beds → /shop/cat/beds-bedding → /shop/cat
  const parts = path.split("/").filter(Boolean)
  for (let i = parts.length; i >= 2; i--) {
    const candidate = "/" + parts.slice(0, i).join("/")
    if (SHOP_PAGE_FACETS[candidate]) return SHOP_PAGE_FACETS[candidate]
  }
  return DEFAULT_FACETS
}

// ---------------------------------------------------------------------------
// The full catalog of facets — used by the sidebar to render each section.
// Each facet definition references FACET_OPTIONS and carries presentation
// hints (searchable, collapsible, defaultVisible).
// ---------------------------------------------------------------------------

export const FACETS: FacetDefinition[] = [
  {
    key: "brand",
    label: "Brand",
    options: FACET_OPTIONS.brand,
    searchable: true,
    collapsible: true,
    defaultVisible: 6,
  },
  {
    key: "foodForm",
    label: "Food Form",
    options: FACET_OPTIONS.foodForm,
    collapsible: true,
    defaultVisible: 6,
  },
  {
    key: "lifeStage",
    label: "Life Stage",
    options: FACET_OPTIONS.lifeStage,
    collapsible: true,
    defaultVisible: 6,
  },
  {
    key: "flavor",
    label: "Flavor",
    options: FACET_OPTIONS.flavor,
    searchable: true,
    collapsible: true,
    defaultVisible: 6,
  },
  {
    key: "healthFeature",
    label: "Health Feature",
    options: FACET_OPTIONS.healthFeature,
    searchable: true,
    collapsible: true,
    defaultVisible: 6,
  },
  {
    key: "color",
    label: "Color",
    options: FACET_OPTIONS.color,
    collapsible: true,
    defaultVisible: 6,
  },
  {
    key: "material",
    label: "Material",
    options: FACET_OPTIONS.material,
    collapsible: true,
    defaultVisible: 6,
  },
  {
    key: "breedSize",
    label: "Breed Size",
    options: FACET_OPTIONS.breedSize,
    collapsible: true,
    defaultVisible: 6,
  },
  {
    key: "productWeight",
    label: "Product Weight",
    options: FACET_OPTIONS.productWeight,
    collapsible: true,
    defaultVisible: 6,
  },
  {
    key: "frameMaterial",
    label: "Frame Material",
    options: FACET_OPTIONS.frameMaterial,
    collapsible: true,
    defaultVisible: 6,
  },
  {
    key: "apparelType",
    label: "Apparel Type",
    options: FACET_OPTIONS.apparelType,
    collapsible: true,
    defaultVisible: 6,
  },
  {
    key: "size",
    label: "Size",
    options: FACET_OPTIONS.size,
    collapsible: true,
    defaultVisible: 6,
  },
]

/**
 * Get a facet definition by key. Returns null for unknown keys.
 */
export function getFacet(key: string): FacetDefinition | null {
  if (key === "price") {
    return {
      key: "price",
      label: "Price",
      options: FACET_OPTIONS.priceBuckets,
      collapsible: false,
      defaultVisible: 99,
    }
  }
  if (key === "customerRating") {
    return {
      key: "customerRating",
      label: "Customer Rating",
      options: FACET_OPTIONS.customerRating,
      collapsible: false,
      defaultVisible: 99,
    }
  }
  return FACETS.find((f) => f.key === key) || null
}

/**
 * The set of facets to render for a given shop path. Always returns an
 * ordered array of FacetDefinition objects ready for the sidebar.
 */
export function getFacetsForPath(path: string): FacetDefinition[] {
  const keys = resolveFacetsForPath(path)
  // "categories" is a special case — it's the navigation tree, rendered by
  // the sidebar's CATEGORIES section, NOT a checkbox facet. Skip it here.
  return keys
    .filter((k) => k !== "categories")
    .map(getFacet)
    .filter((f): f is FacetDefinition => f !== null)
}
