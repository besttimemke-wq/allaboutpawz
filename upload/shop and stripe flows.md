# **Engineering Specification: Shop Category and Product Pages**

Build a data-driven e-commerce category system for Pawz using the existing SQL taxonomy and category-filter mappings. The UI should follow the attached visual direction: warm premium pet retail styling, modular category discovery, product-led browsing, clean filter panels, and responsive mobile interactions.

The goal is to create **three reusable page templates**, not a separate custom design for every category record. SQL controls the taxonomy, products, and filters; the frontend renders the appropriate template from that data.

## **Design Reference**

Use the attached concepts as the visual specification:

* Warm off-white canvas with subtle tan/brown accents.  
* Premium editorial serif headings paired with a clean sans-serif UI font.  
* Rounded cards with restrained borders and soft shadows.  
* Product photography should be large, consistent, and product-forward.  
* Use visual category cards and “Shop by Need” modules to guide discovery.  
* On desktop, filters live in a left sidebar for product-listing pages.  
* On mobile, filters open in a slide-over drawer or bottom sheet.  
* Keep the navigation, cart/bag, product cards, filters, active-filter chips, and product detail page visually consistent across the Shop experience..



The category experience should progress naturally:

 

| Parent landing page → Primary shopping category page → Focused subcategory product listing → Product detail page → Bag → Shared checkout  |
| :---- |

   
The experience should never force a customer to choose from a large filter set before they understand the available category structure.

---

## **Core Information Architecture**

Normalize the customer-facing hierarchy to three levels:

 

| Dog ├── Feeding & Watering │   ├── Automatic Feeders │   ├── Bowls & Dishes │   ├── Feeding Mats │   └── Food Storage ├── Grooming │   ├── Brushes │   ├── Claw Care │   ├── Colognes │   ├── Combs │   ├── Dematting │   ├── Deodorizers │   ├── Clippers │   ├── Wipes │   ├── Shampoos & Conditioners │   ├── Shedding Tools │   └── Bath Supplies ├── Beds & Furniture │   ├── Beds │   ├── Bed Pillows │   ├── Bed Mats │   └── Additional bed and furniture types ├── Treats │   ├── Cookies │   ├── Biscuits │   └── Snacks ├── Apparel & Accessories │   ├── Bandanas │   ├── Boots │   ├── Coats │   └── Additional apparel types ├── Chew Toys ├── Collars, Harnesses & Leashes ├── Carriers & Travel └── Health Supplies  |
| :---- |

 

### **Customer-facing naming rules**

Do not expose redundant taxonomy labels where they repeat the same concept.

For example, avoid this:

 

| Dog → Dog Grooming Supplies → Grooming → Shampoos & Conditioners  |
| :---- |

   
Render this instead:

 

| Dog → Grooming → Shampoos & Conditioners  |
| :---- |

   
The existing SQL may retain intermediate records for operational or legacy reasons, but the frontend must flatten or alias those records for customer-facing navigation, breadcrumbs, URLs, and headings.

### **Category record behavior**

Each category record should support at least:

| Field | Purpose |
| :---- | :---- |
| id | Stable internal category identifier |
| parent\_id | Parent relationship for taxonomy traversal |
| name | Raw SQL category name |
| display\_name | Customer-facing label, including flattened aliases |
| slug | URL-safe route value |
| level | Parent landing, primary category, or subcategory |
| image\_url | Category hero or card image |
| description | Category intro copy |
| display\_order | Sort order for category navigation |
| is\_active | Controls whether the category is published |
| show\_in\_navigation | Controls menu and category-card visibility |
| seo\_title | Optional page title override |
| seo\_description | Optional meta description override |

Do not hardcode category names, category counts, filters, or product groups into UI components. Resolve them from SQL/API data.

---

# **Template 1: Parent Category Landing**

**Route pattern**

 

| /category/\[parent\]  |
| :---- |

   
**Examples**

 

| /category/dog /category/pet-supplies  |
| :---- |

   
**Purpose**

This is a **discovery and merchandising page**, not a large filtered product listing page. It should answer:

|   | *“What can I shop for here?”* |
| :---- | :---- |

It should guide users into major shopping categories, shopping needs, best sellers, new arrivals, and curated collections.

### **Layout requirements**

1. Global shop header.  
2. Breadcrumb trail.  
3. Large visual parent-category hero.  
4. Primary category-card navigation.  
5. “Shop by Need” discovery module.  
6. Best Sellers product rail.  
7. New Arrivals product rail.  
8. Optional promotional or educational module.  
9. Trust/benefits strip near the bottom.  
10. Standard shop footer.

### **Parent hero**

Use a wide, warm editorial banner.

**Example content**

 

| DOG Everything your dog needs for a happy, healthy life.  |
| :---- |

   
Requirements:

* Use a large lifestyle image or a clean cutout pet image.  
* Keep the title and introductory copy readable over or alongside the image.  
* Use visual hierarchy similar to the reference image: large heading, short supporting copy, calm spacing.  
* Do not add a dense filter sidebar to this page.  
* Do not show a large product grid as the first or dominant module.

### **Primary category cards**

Render direct child categories as large image-led cards.

**Example**

 

| Shop by Category \[ Feeding & Watering \] \[ Grooming \] \[ Beds & Furniture \] \[ Treats \] \[ Apparel \] \[ Chew Toys \] \[ Collars, Harnesses & Leashes \] \[ Travel \] \[ Health \]  |
| :---- |

   
Requirements:

* Use card image, category label, and destination link.  
* Cards may be horizontal-scroll on mobile.  
* Cards should navigate to the Level 2 primary category route.  
* Use SQL display order.  
* Do not include unpublished categories.  
* Include a “View all categories” action on mobile when horizontal card scrolling is used.

### **Shop by Need module**

This module is merchandising-driven, not taxonomy-driven. It should be configurable in CMS/database data.

**Initial need collections**

 

| Puppy Essentials Grooming Travel Dental Care Skin & Coat  |
| :---- |

   
Each collection should resolve to a curated product set, category set, collection ID, or saved search.

**Suggested route structure**

 

| /collections/puppy-essentials /collections/grooming /collections/travel /collections/dental-care /collections/skin-coat  |
| :---- |

   
Requirements:

* Use circular or softly rounded image treatments, matching the reference direction.  
* Show a short label only; avoid excessive text.  
* On click, navigate to a collection or pre-filtered product listing.  
* Do not treat Shop by Need as a substitute for the SQL category tree.

### **Product merchandising rails**

Include:

 

| Best Sellers New Arrivals  |
| :---- |

   
Each rail should:

* Render 4 products on standard desktop widths where space permits.  
* Use horizontal scrolling or a 2-column grid on mobile.  
* Include product image, title, price, rating when present, and wishlist button.  
* Link each product to the product-detail page.  
* Include “View all” actions where relevant.  
* Use real product data and product status; do not show mock items in production.

### **Filters on Level 1**

Use **minimal or no filters**.

Allowed:

* A simple optional category search.  
* Promotional collection navigation.  
* Lightweight chips if they guide discovery, not product attributes.

Do not show:

* Full desktop filter sidebar.  
* Large multi-select filter groups.  
* 14–17 filter sections.  
* Deep technical attributes such as material, waterproofing, power type, or scent.

---

# **Template 2: Primary Category Product Listing**

**Route pattern**

 

| /category/\[parent\]/\[category\]  |
| :---- |

   
**Examples**

 

| /category/dog/grooming /category/dog/feeding-watering /category/dog/beds-furniture /category/dog/apparel-accessories  |
| :---- |

   
**Purpose**

This is the main browsing and shopping page. It should answer:

|   | *“What products are available in this major category, and how can I narrow them down?”* |
| :---- | :---- |

This page combines category discovery with a full product listing and relevant filtering.

### **Layout requirements**

1. Global shop header.  
2. Breadcrumbs.  
3. Compact primary-category hero or category header.  
4. “Shop by Category” subcategory navigation.  
5. Product count.  
6. Active filter chips when filters are applied.  
7. Desktop filter sidebar.  
8. Sort control.  
9. Product grid.  
10. Pagination or load-more behavior.  
11. Mobile filter and sort controls.  
12. Optional bottom merchandising block or quiz CTA.

### **Example page content**

 

| DOG / GROOMING SUPPLIES Grooming Grooming supplies for bathing, brushing, de-shedding, and maintaining a healthy coat.  |
| :---- |

   
The display label should be customer-friendly. If the SQL record is named “Dog Grooming Supplies,” render “Grooming” in page headings and UI.

### **Subcategory navigation**

Display the direct shopping subcategories visually before the product grid.

**Example**

 

| Shop by Category \[ Brushes \] \[ Claw Care \] \[ Colognes \] \[ Combs \] \[ Dematting \] \[ Deodorizers \] \[ Clippers \] \[ Wipes \] \[ Shampoos & Conditioners \] \[ Shedding Tools \] \[ Bath Supplies \]  |
| :---- |

   
Requirements:

* Use icon/image cards with category labels.  
* Use a compact horizontal rail, responsive grid, or carousel.  
* Each card routes to the Level 3 subcategory PLP.  
* On desktop, allow 5–8 visible cards depending on available space.  
* On mobile, use horizontal scrolling with a clear affordance.  
* Include “View all” only if the category count exceeds the visible card limit.

### **Product listing controls**

Display the product count and sort controls directly above the grid.

**Example**

 

| 72 Products Filters                         Sort by: Best Selling  |
| :---- |

   
Required sort options:

 

| Best Selling Newest Price: Low to High Price: High to Low Top Rated  |
| :---- |

   
Do not make sorting dependent on frontend-only mock data. Sorting must be implemented in the product query or server-side API.

### **Desktop filter sidebar**

The desktop experience should use a persistent left sidebar similar to the reference design.

Include:

 

| Filters                                  Clear all  |
| :---- |

   
Then render category-relevant groups:

 

| Price Rating Availability Brand Coat Type Grooming Function Tool Type Hair Length Scent Power Type Waterproof  |
| :---- |

   
Requirements:

* Render only filters mapped to the current category or inherited through the category tree.  
* Show product-result counts beside each filter option when performant and available.  
* Keep the filter sidebar sticky within the product-listing viewport where possible.  
* Price must support a min/max range or dual-handle range control.  
* Rating should support minimum-star filtering.  
* Availability should include at least “In Stock” and “Out of Stock.”  
* Brand can be checkbox-driven and searchable when brand count is high.  
* Use collapsible filter sections to prevent excessive vertical clutter.  
* Include an explicit “Clear all” action.  
* Apply filters on selection for desktop unless the interaction model requires an “Apply Filters” button for performance.

### **Product grid**

Desktop rules:

* Use a 3- or 4-column responsive grid based on viewport width.  
* Maintain consistent image aspect ratio.  
* Use product cards with:  
  * Product image  
  * Optional badge: New, Sale, Best Seller, Low Stock  
  * Wishlist icon  
  * Product name  
  * Current price  
  * Original price and discount when applicable  
  * Rating and review count where available  
  * Variant preview where applicable  
* Clicking the product image, name, or card opens the product page.  
* Wishlist actions must not trigger the product page navigation.  
* Product cards must work with keyboard navigation and screen readers.

### **Mobile behavior**

On mobile:

* Replace the desktop sidebar with two sticky controls:  
  * Filters (count)  
  * Sort  
* Filters open in a full-height side drawer or bottom sheet.  
* Include:  
  * Filter categories  
  * Selected option counts  
  * Active chips  
  * Clear all  
  * Apply filters button  
* Preserve selected filters, sort selection, and scroll position when the drawer closes.  
* Keep subcategory cards horizontally scrollable above the product grid.  
* Render products in a 2-column grid unless the viewport is too narrow.

---

# **Template 3: Focused Subcategory Product Listing**

**Route pattern**

 

| /category/\[parent\]/\[category\]/\[subcategory\]  |
| :---- |

   
**Examples**

 

| /category/dog/grooming/shampoos-conditioners /category/dog/grooming/brushes /category/dog/beds-furniture/beds /category/dog/apparel-accessories/bandanas  |
| :---- |

   
**Purpose**

This is the focused, purchase-oriented product listing. It should answer:

|   | *“Show me the exact type of product I want, then help me refine it.”* |
| :---- | :---- |

The category header must be smaller because the customer has already made a specific category decision.

### **Layout requirements**

1. Global shop header.  
2. Full breadcrumb trail.  
3. Compact category heading.  
4. Sibling subcategory navigation.  
5. Product count.  
6. Active-filter chips.  
7. Full relevant desktop filters.  
8. Sort control.  
9. Product grid.  
10. Mobile filter drawer and sort controls.  
11. Optional recommendation module near the end of the page.

### **Example page content**

 

| DOG / GROOMING / SHAMPOOS & CONDITIONERS Shampoos & Conditioners  |
| :---- |

   
Optional supporting description:

 

| Gentle, coat-specific formulas for a clean, healthy-looking finish.  |
| :---- |

   
Keep this description short. Do not use the oversized parent-category hero on this template.

### **Sibling navigation**

Show direct siblings at the top for efficient lateral browsing.

**Example**

 

| \[ All \] \[ Shampoo \] \[ Conditioner \] \[ 2-in-1 \] \[ Medicated \]  |
| :---- |

   
Requirements:

* Render as compact tabs, pills, or chips.  
* The currently selected subcategory must be visually active.  
* Include “All” to navigate back to the Level 2 parent category PLP.  
* Use the category’s real siblings from the taxonomy.  
* Do not hardcode subcategory labels.

### **Active filter chips**

When the user has filters applied, show them above the product listing.

**Example**

 

| Active: \[ Grooming × \] \[ Shampoo × \] \[ Sensitive Skin × \] \[ In Stock × \]     Clear all  |
| :---- |

   
Requirements:

* Include category context chips only when useful.  
* Each chip must be removable individually.  
* Clear all must remove all filter selections but preserve the category route.  
* Filters must be represented in the URL so filtered pages are shareable and browser navigation works.

**Suggested query format**

 

| /category/dog/grooming/shampoos-conditioners?brand=earthbath\&coatType=sensitive-skin\&inStock=true\&sort=best-selling  |
| :---- |

 

### **Filter behavior**

The focused PLP uses full relevant filters, but only filters that produce meaningful refinement.

**Example: Shampoos & Conditioners**

 

| Price Rating Availability Brand Coat Type Grooming Function Hair Length Scent Waterproof Formula Type Ingredients  |
| :---- |

   
Do not show irrelevant groups such as Tool Type or Power Type on a shampoo page unless products in that subcategory actually support those attributes.

---

# **Product Detail Page**

**Route pattern**

 

| /products/\[product-slug\]  |
| :---- |

   
**Purpose**

Convert browsing into a confident purchase. The product page should be visually aligned to the reference image: product gallery on the left, purchase controls and product details on the right.

### **Required layout**

Desktop:

 

| \[ Thumbnail Gallery \] \[ Primary Product Image \] \[ Product Details / Purchase Panel \]  |
| :---- |

   
Mobile:

 

| \[ Image carousel \] \[ Product details \] \[ Variants \] \[ Quantity \] \[ Add to Bag \] \[ Accordions \]  |
| :---- |

 

### **Required product page content**

 

| Breadcrumbs Product badge Product title Star rating and review count Price Compare-at price and savings, where applicable Short product summary Key benefit bullets Variant selectors Size selector Quantity selector Add to Bag button Buy It Now button, if enabled Wishlist action Shipping/returns summary Ingredients How to Use Shipping & Returns Recommended products  |
| :---- |

 

### **Product gallery behavior**

* Use a large primary product image.  
* Support thumbnail image selection on desktop.  
* Support swipeable gallery on mobile.  
* Preserve image aspect ratio and avoid visual jumps while loading.  
* Use accessible labels for all gallery controls.  
* Include product video only if available in SQL/CMS product media.

### **Purchase controls**

* Disable Add to Bag until required variants are selected.  
* Show unavailable variants as disabled.  
* Show low-stock messaging when inventory threshold rules apply.  
* Add to Bag should update the shared global bag without navigating away by default.  
* Show an accessible mini-cart confirmation after adding an item.  
* “Buy It Now” may begin checkout with the current product selection, but must follow the same authentication and checkout rules as Shop, Services, and Pricing.

### **Product accordions**

Include:

 

| Ingredients How to Use Shipping & Returns  |
| :---- |

   
Additional optional accordions:

 

| Care Instructions Product Details Safety Information Size Guide  |
| :---- |

   
Only render an accordion when relevant content exists.

---

# **SQL Category and Filter Rules**

## **Canonical category resolution**

Implement a category resolver service that converts raw SQL nodes into the customer-facing hierarchy.

The resolver must:

1. Load active category records.  
2. Build the parent-child tree using parent\_id.  
3. Identify redundant intermediate nodes.  
4. Map raw names to display aliases where necessary.  
5. Return:  
   * Breadcrumb data  
   * Customer-facing route segments  
   * Direct child categories  
   * Product-bearing category IDs  
   * Inherited filter configuration  
   * SEO metadata  
6. Ensure raw SQL complexity does not leak into the visual navigation.

### **Flattening rule**

If a category node merely repeats or restates its parent concept, skip it in the UI route and breadcrumb hierarchy.

**Example**

 

| Raw SQL: Dog → Dog Grooming Supplies → Grooming → Shampoos & Conditioners Customer-facing UI: Dog → Grooming → Shampoos & Conditioners  |
| :---- |

   
Use an explicit alias/normalization mapping rather than fragile string matching whenever possible.

**Suggested configuration model**

 

| type CategoryPresentationOverride \= {   categoryId: string   displayName?: string   displaySlug?: string   hiddenInBreadcrumb?: boolean   hiddenInNavigation?: boolean   routeParentOverrideId?: string }  |
| :---- |

   
This gives the frontend and content team control without mutating the historical SQL structure.

## **Filter inheritance model**

Use **filter inheritance plus category-specific additions**.

Do not require every leaf subcategory to have a complete manually duplicated filter mapping.

### **Required logic**

 

| Global filters \+ Inherited parent-category filters \+ Current category filters \+ Optional product-type-specific filters \= Visible filter set  |
| :---- |

 

### **Example: Grooming hierarchy**

 

| Dog └── Grooming     ├── Global filters     │   ├── Brand     │   ├── Price     │   ├── Rating     │   ├── Material     │   └── Availability     ├── Grooming filters     │   ├── Coat Type     │   ├── Grooming Function     │   ├── Tool Type     │   ├── Hair Length     │   ├── Scent     │   ├── Power Type     │   └── Waterproof     └── Shampoos & Conditioners         ├── Inherited global filters         ├── Inherited grooming filters         └── Shampoo-specific filters             ├── Formula Type             ├── Ingredient Preferences             └── Skin Concern  |
| :---- |

 

### **Example: Beds hierarchy**

 

| Dog └── Beds & Furniture     ├── Global filters     │   ├── Brand     │   ├── Price     │   ├── Rating     │   ├── Color     │   ├── Material     │   └── Availability     ├── Beds-specific filters     │   ├── Bed Type     │   ├── Bed Size     │   ├── Shape     │   ├── Fill Material     │   ├── Cover Material     │   ├── Washable     │   ├── Waterproof     │   ├── Orthopedic     │   ├── Cooling     │   ├── Heated     │   └── Indoor / Outdoor     └── Beds         ├── Inherited parent filters         └── Optional leaf-specific additions  |
| :---- |

 

### **Filter visibility rules**

A filter should only render when:

* It is mapped to the resolved category context.  
* At least one matching product has a usable value for that filter.  
* The filter produces more than one meaningful option, unless the filter is important for merchandising or inventory.  
* It is appropriate to the product type being displayed.

For example:

* Show Scent for shampoos.  
* Show Tool Type for grooming tools.  
* Show Bed Size for beds.  
* Do not show Power Type for non-electric shampoo products.  
* Do not show Waterproof on categories where it has no relevant values.

## **Query model**

All PLP state must be URL-driven and server-queryable.

**Example parameters**

 

| ?sort=best-selling \&minPrice=15 \&maxPrice=50 \&rating=4 \&brand=earthbath,pawz \&availability=in-stock \&coatType=sensitive-skin \&scent=unscented \&page=2  |
| :---- |

   
Required behavior:

* Preserve query parameters during navigation.  
* Filter changes update the URL without a full hard reload.  
* Browser back/forward restores filter state.  
* Shared URLs reproduce the same filtered product result.  
* Product count updates after filters are applied.  
* Empty states must provide recovery actions.

---

# **Component Requirements**

Build reusable components rather than page-specific duplicates.

| Component | Responsibility |
| :---- | :---- |
| ShopHeader | Global navigation, search, account, wishlist, bag |
| Breadcrumbs | Taxonomy-aware path with flattened display hierarchy |
| CategoryHero | Parent and primary category hero variants |
| CategoryCard | Image-led category navigation card |
| NeedCollectionCard | Curated shopping-need card |
| ProductCard | Shared product card across rails and PLPs |
| ProductGrid | Responsive product-card grid |
| FilterSidebar | Desktop filter UI |
| MobileFilterDrawer | Mobile filters with apply/clear actions |
| FilterGroup | Reusable accordion/filter-option group |
| ActiveFilterChips | Selected filter display and removal |
| SortMenu | Sort selection |
| ProductGallery | Product image gallery |
| ProductPurchasePanel | Variant, quantity, bag, and buy-now controls |
| MiniCart | Confirmation and bag preview |
| RecommendationRail | Best sellers, related products, recently viewed |
| TrustStrip | Shipping, quality, rewards, support benefits |

---

# **Product Grid and Card Behavior**

## **Product card requirements**

Every product card must support:

* Product image.  
* Optional image hover swap on desktop.  
* Product title.  
* Price.  
* Sale state.  
* Ratings and review count if available.  
* Wishlist button.  
* Product badge.  
* Product variants when useful.  
* Accessible names and button states.  
* Skeleton loading state.  
* Consistent image crop and card height.

### **Card interaction rules**

* Click/tap on card body opens product page.  
* Wishlist button works independently.  
* Product cards should not contain accidental nested interactive controls.  
* Preserve the current category route and filters when the customer opens a product and returns to the listing.  
* Product-card images should use optimized responsive image loading.

## **Empty states**

When filters produce no products, show:

 

| No products match these filters. Try removing a filter or exploring related categories.  |
| :---- |

   
Include:

 

| Clear all filters View \[Parent Category\]  |
| :---- |

   
Optionally show related subcategory cards or best sellers below the empty state.

---

# **Search, Bag, and Checkout Integration**

The product pages must use the same shared commerce state as the Shop page, Services page, and Pricing page.

## **Shared bag**

The bag must support mixed item types:

 

| Physical shop products Grooming services Grooming packages Service add-ons Pricing-page offerings  |
| :---- |

   
Each line item should preserve:

* Item ID.  
* Item type.  
* Product or service name.  
* Selected variant.  
* Quantity.  
* Price at time of add.  
* Image.  
* Booking metadata when applicable.  
* Tax/shipping eligibility.  
* Fulfillment type.

## **Authentication before checkout**

Before completing checkout:

* Require sign-in or account creation.  
* Reuse booking-wizard details when the customer has already entered them.  
* Avoid asking for duplicate information.  
* Use Supabase Authentication for account creation and access.  
* Ensure an email can map to one customer record and one account relationship.  
* Prevent duplicate customer profiles.

## **Checkout continuation**

After purchase:

1. Create or associate the customer account.  
2. Process the order.  
3. Send the order confirmation email.  
4. Send the Supabase password-setup email when needed.  
5. Redirect the customer to the Customer Portal.  
6. Preserve purchases, appointments, and receipts under the same customer identity.

The Shop product flow must not be a separate checkout system from Services or Pricing.

---

# **Responsive Requirements**

## **Desktop**

* Parent landing pages: spacious hero, visual category grid, merchandising rails.  
* Primary and subcategory PLPs: sticky filter sidebar plus 3–4 column product grid.  
* Product detail page: multi-column gallery and purchase panel.  
* Avoid excessive whitespace between category navigation and product content.  
* Keep content width comfortable and consistently aligned.

## **Tablet**

* Transition to 2–3 product columns.  
* Reduce the visible number of category cards.  
* Convert filter sidebar to collapsible panel or drawer if the layout becomes constrained.  
* Maintain visible bag and account access.

## **Mobile**

* Use a compact sticky header.  
* Use horizontal category rails.  
* Use 2-column product grids where possible.  
* Use filter/sort action bar.  
* Use a filter drawer or bottom sheet.  
* Use a swipeable product gallery.  
* Maintain at least 44px touch targets.  
* Ensure the Add to Bag action is prominent and accessible.  
* Ensure no key action relies on hover.

---

# **Accessibility and Quality Requirements**

* Use semantic page regions, headings, navigation, lists, buttons, and form controls.  
* Maintain keyboard support for menus, filters, drawers, sort controls, product galleries, and bag interactions.  
* Trap focus appropriately inside mobile filter drawers and modal overlays.  
* Provide visible focus states.  
* Use descriptive image alt text based on product and category data.  
* Do not rely on color alone for sale, availability, selection, or active filter state.  
* Ensure text contrast meets WCAG AA expectations.  
* Announce dynamic results updates to screen readers where appropriate, such as product counts after filtering.  
* Use loading skeletons instead of empty blank sections during data fetches.  
* Handle missing image, unavailable inventory, malformed category relationships, and empty category results gracefully.

---

# **Acceptance Criteria**

The implementation is complete when all of the following are true:

* The storefront uses exactly **three reusable category page templates**: Parent Landing, Primary Category PLP, and Focused Subcategory PLP.  
* SQL category records determine the available routes, category cards, product relationships, headings, breadcrumbs, and filters.  
* The UI does not create a separate custom page design for every category record.  
* Redundant intermediary SQL category names are hidden or flattened in customer-facing navigation.  
* A customer can browse from Dog to Grooming to Shampoos & Conditioners without encountering duplicate category concepts.  
* Level 1 pages prioritize visual discovery and merchandising, with minimal or no filters.  
* Level 2 pages display subcategory navigation, full relevant filtering, sorting, and a product grid.  
* Level 3 pages display compact sibling navigation, active filter chips, refined filters, sorting, and a focused product grid.  
* Global filters and category-specific filters are resolved through inheritance plus category-specific additions.  
* Irrelevant filters never appear on a category page.  
* Filter selections, sorting, pagination, and category context are preserved in the URL.  
* Desktop filters use a sidebar; mobile filters use a drawer or bottom sheet.  
* Product detail pages include gallery, variants, pricing, quantity, Add to Bag, and product-information accordions.  
* Shop products, services, packages, and add-ons use one shared bag and checkout system.  
* Product pages are fully responsive, accessible, data-driven, and production-ready.

SHOP SIDEBAR — IMPLEMENTATION SPEC

Use the provided reference image as the visual reference, but do not treat the image itself as the implementation. Build the sidebar from the application's actual category/filter data.

The sidebar is a desktop persistent shop navigation/filter rail.

It is approximately 172px wide in the reference and sits independently from the product grid.

1. Sidebar container
SHOP
×
────────────────────────

CATEGORIES

Dog                         156
Cat                          98
Grooming                     72
Wellness                     64
Toys & Enrichment            49
Beds & Furniture             38
Treats                       35
Travel & Outdoor             26
New Arrivals                 24
Sale                         18

────────────────────────

FILTERS                         Clear all

Price Range

[ $ MIN ] — [ $ MAX ]

Rating

□ ★★★★★                 (84)
□ ★★★★☆ & up            (32)
□ ★★★☆☆ & up             (8)
□ ★☆☆☆☆ & up             (2)

Availability

□ In Stock              (120)
□ Out of Stock            (36)

Brand

[ Search brands... ]

□ Pawz                    (28)
□ Wild One                (18)
□ Earthbath               (14)
□ Burt's Bees             (10)

Show more →

Product Type

□ Shampoo                 (20)
□ Conditioner             (14)
□ Spray                    (10)
□ Wipes                     (6)

[ APPLY FILTERS ]
2. CATEGORIES IS NOT A FILTER

This is the biggest thing Kodak needs to understand.

The top section:

CATEGORIES

is navigation.

It should not be implemented as the same component as:

Price
Rating
Availability
Brand
Product Type

Categories determine where the customer is browsing.

Filters determine which products are displayed within that category.

So the data flow should be:

CATEGORY NAVIGATION
        ↓
Current category
        ↓
Determine applicable filters
        ↓
FILTER STATE
        ↓
Product query

Not:

Everything = filters
3. Category section behavior

The screenshot shows the category list as a compact vertical navigation.

Each row should have:

[icon] Category Name              count

Example:

🐕 Dog                           156
🐈 Cat                            98
✂ Grooming                        72
♡ Wellness                        64
◫ Toys & Enrichment               49
▣ Beds & Furniture                38
...

The count is the number of products available in that category, not the number of subcategories.

Clicking a category navigates to that category's URL.

Example:

/shop/dog
/shop/cat
/shop/grooming
/shop/wellness
/shop/toys-enrichment
/shop/beds-furniture

Do not make clicking the category merely toggle a checkbox.

4. Current category must be visually identifiable

If the user is on:

/shop/grooming

then:

Grooming                         72

needs an active state.

Do not rely exclusively on color.

Use:

stronger text weight
subtle background
icon state
optionally a small active indicator

The customer should immediately know:

I'm currently shopping Grooming.

5. FILTERS begin AFTER the category navigation

There should be a clear separation:

CATEGORIES
──────────────
Dog
Cat
Grooming
...
Sale

──────────────

FILTERS                    Clear all

This is important visually and architecturally.

6. Filters are DATA-DRIVEN

Do not hardcode this sidebar specifically for Grooming.

The sidebar should receive the current category and resolve its filter configuration.

Conceptually:

<ShopSidebar
  category={currentCategory}
  filters={applicableFilters}
  activeFilters={activeFilters}
/>

For Grooming it might receive:

Global:
- Price
- Rating
- Availability
- Brand

Grooming:
- Product Type
- Coat Type
- Grooming Function
- Tool Type
- Hair Length
- Scent
- Power Type
- Waterproof

For Beds:

Global:
- Price
- Rating
- Availability
- Brand

Beds:
- Bed Type
- Bed Size
- Shape
- Fill Material
- Cover Material
- Washable
- Waterproof
- Orthopedic
- Cooling
- Heated
- Indoor / Outdoor

The sidebar component itself should not know these lists.

7. Do NOT display every possible filter

This is another important point.

The screenshot is showing a curated filter set.

If the current category is Grooming, show Grooming-relevant filters.

Don't do:

Price
Rating
Availability
Brand
Color
Material
Size
Bed Type
Bed Size
Coat Type
Tool Type
Scent
...

That creates the exact unusable sidebar we're trying to get away from.

The category determines the filter vocabulary.

8. Filter sections are collapsible

Each filter group should be independently collapsible.

Example:

PRICE RANGE                    ˅

RATING                         ˅

AVAILABILITY                   ˅

BRAND                          ˅

PRODUCT TYPE                   ˅

When expanded:

BRAND                          ˄

[ Search brands... ]

□ Pawz                       (28)
□ Wild One                   (18)
□ Earthbath                  (14)
□ Burt's Bees                (10)

Show more →

The filter state must remain intact when another section is opened/closed.

9. Counts are dynamic

The numbers are not decorative.

For example:

Pawz                         (28)
Wild One                     (18)
Earthbath                    (14)

should come from the actual product/filter aggregation.

Likewise:

Dog                          156
Grooming                      72

should come from catalog data.

Don't hardcode the numbers from the screenshot.

The screenshot is demonstrating layout and hierarchy, not literal data.

10. Active filters belong ABOVE the product grid

Once the customer selects filters, the main content area should show:

72 products

[Grooming ×] [$25–$50 ×] [4★ & up ×] [In Stock ×]     Clear all

The sidebar remains the control surface.

The chips communicate:

These are the filters currently affecting your results.

This is especially important because the customer may close the sidebar or switch between desktop/mobile layouts.

11. Apply behavior

For desktop, the screenshot uses:

[ APPLY FILTERS ]

at the bottom.

Implement that as a deliberate filter application mechanism if the existing product query is designed around staged filter state:

Draft filter state
       ↓
Apply Filters
       ↓
URL/query parameters update
       ↓
Server renders filtered result

For example:

/shop/grooming?price=25-50&rating=4&availability=in-stock

The URL should represent the actual applied state.

Do not maintain the filters exclusively in React state.

The URL needs to be shareable, reloadable, bookmarkable, and server-readable.

12. Desktop vs mobile

The screenshot actually shows two different experiences.

Desktop

Persistent left rail:

┌──────────────────┐
│ SHOP             │
│                  │
│ CATEGORIES       │
│                  │
│ Dog              │
│ Cat              │
│ Grooming         │
│ ...              │
│                  │
│ FILTERS          │
│                  │
│ Price            │
│ Rating           │
│ Availability     │
│ Brand            │
│ Product Type     │
│                  │
│ [APPLY FILTERS]  │
└──────────────────┘
Mobile

Do not shrink this sidebar.

Turn it into a filter/navigation drawer:

┌─────────────────────────┐
│ Filters            ×    │
├─────────────────────────┤
│ Categories          ›   │
│ Price Range         ›   │
│ Rating              ›   │
│ Availability        ›   │
│ Brand               ›   │
│ Product Type        ›   │
├─────────────────────────┤
│ [ APPLY FILTERS (2) ]   │
└─────────────────────────┘

The screenshot already demonstrates this distinction in the lower-right FILTERS (MOBILE VIEW) panel.

13. The category hierarchy needs to remain separate

When you're on:

Dog

the category landing page can expose:

Feeding & Watering
Grooming
Beds & Furniture
Treats
Apparel & Accessories
Chew Toys
...

When you're on:

Dog / Grooming

the category navigation can expose the Grooming children:

Shampoo & Conditioners
Brushes
Combs
Claw Care
Wipes
...

That is category navigation, not filter groups.

So Kodak should not try to represent:

Shampoo
Brushes
Wipes
Nail Care

as checkboxes.

They are destinations.

14. Final component architecture

Tell him to think of the sidebar as these pieces:

ShopSidebar
│
├── ShopSidebarHeader
│
├── CategoryNavigation
│   ├── CategoryNavigationItem
│   ├── CategoryNavigationItem
│   ├── CategoryNavigationItem
│   └── ...
│
├── Divider
│
├── FilterHeader
│   └── ClearAll
│
├── FilterGroup
│   └── PriceRangeFilter
│
├── FilterGroup
│   └── RatingFilter
│
├── FilterGroup
│   └── AvailabilityFilter
│
├── FilterGroup
│   └── BrandFilter
│
├── FilterGroup
│   └── ProductTypeFilter
│
└── ApplyFiltersButton

And the data layer should look conceptually like:

Category
   ↓
category hierarchy
   ↓
applicable filter definitions
   ↓
filter options
   ↓
product aggregation/counts
   ↓
render sidebar
The critical instruction to Kodak

Do not try to "copy the sidebar from the screenshot."

Build the sidebar as a real category/filter system whose visual presentation matches the reference.

The reference establishes:

spacing
proportions
typography hierarchy
grouping
borders
active states
filter organization
desktop/mobile behavior

The application establishes:

category names
category hierarchy
product counts
filter definitions
filter options
selected state
URLs
product result counts

That separation is what will let the sidebar work across Dog, Cat, Grooming, Beds & Furniture, Treats, Wellness, etc. without creating a one-off sidebar for every page.

And don't change the overall shop architecture we established. The sidebar is simply the navigation/filter control for the server-rendered category/PLP experience.


# **Services and Pricing Checkout Flow**

## **Product Direction**

Redesign the Pricing page using an elegant, enterprise-style product experience.

* Replace the current pricing grid with individual product cards.  
* Make each service or package feel like a clearly defined product.  
* Use concise descriptions, transparent pricing, and clear calls to action.  
* Keep the visual style premium, spacious, and easy to scan.  
* Avoid presenting the services as a traditional comparison table.

## **Shared Checkout Experience**

The Services page and Pricing page must use the same checkout flow as the Shop page.

All purchasable services, packages, and products should:

1. Be added to a shared shopping bag.  
2. Remain visible in the bag alongside shop products.  
3. Use the same checkout interface and payment process.  
4. Follow the same authentication and account-creation requirements.  
5. Return the customer to the Customer Portal after checkout.

The shopping bag should support mixed purchases, including grooming services, packages, add-ons, and shop products.

## **Account Creation**

Customers must create or access an account before completing checkout.

The booking wizard already collects the customer’s information. Reuse that information rather than asking the customer to enter it again.

At checkout:

* If the customer is not authenticated, require sign-up or login.  
* Pre-fill the sign-up form with information captured in the booking wizard.  
* Create the customer account through Supabase Authentication.  
* Do not block checkout because the customer has not created a password yet.  
* Send the customer an email that allows them to set their password after checkout.

## **Email Sequence**

After a successful purchase, the customer should receive two emails:

### **1\. Order Confirmation**

Send an order confirmation containing:

* Customer name.  
* Order number.  
* Purchased services or products.  
* Appointment details, if applicable.  
* Itemized pricing.  
* Taxes, fees, and total.  
* Payment status.  
* Link to the Customer Portal.

### **2\. Supabase Account Email**

Send a separate Supabase email that allows the customer to:

* Set their password.  
* Activate access to their account.  
* Complete their account setup.

The Supabase email should use the Pawz brand styling where possible and clearly explain why the customer is receiving it.

## **Post-Checkout Redirect**

After checkout is completed:

1. Display a successful purchase confirmation.  
2. Redirect the customer to the Customer Portal.  
3. If the customer has not set a password, show a clear prompt to complete account setup.  
4. Preserve the customer’s order and booking data during the redirect.  
5. Return the customer to the same Customer Portal after completing password setup.

The password setup link must not create a second customer account or lose the customer’s order history.

## **Customer Portal**

The Customer Portal should allow customers to:

* View upcoming appointments.  
* Book new appointments.  
* Reschedule or cancel appointments, based on business rules.  
* View past appointments.  
* View purchased services and products.  
* Access order confirmations.  
* View and download receipts.  
* Manage their profile and contact information.  
* Set or update their password.  
* Return to checkout or continue shopping.

The portal should be the central destination for all customer activity after booking or purchasing.

## **Booking Wizard Integration**

The booking wizard should connect directly to the account and checkout flow.

It must:

* Capture the customer’s name, email, phone number, dog information, service, and appointment details.  
* Save the collected data before payment.  
* Pass the data into the shared checkout process.  
* Use the customer’s email to identify an existing account.  
* Prevent duplicate customer profiles.  
* Associate the appointment and purchase with the correct customer account.

## **Recommended User Flow**

### **New customer**

1. Customer selects a service, package, add-on, or shop product.  
2. Item is added to the shared shopping bag.  
3. Customer proceeds to checkout.  
4. Customer enters or confirms their information.  
5. Account is created through Supabase.  
6. Customer completes payment.  
7. Customer receives the order confirmation email.  
8. Customer receives the Supabase password-setup email.  
9. Customer is redirected to the Customer Portal.  
10. Customer sets a password and manages appointments, purchases, and receipts.

### **Returning customer**

1. Customer selects a service or product.  
2. Item is added to the shopping bag.  
3. Customer proceeds to checkout.  
4. Customer signs in.  
5. Existing customer data is loaded automatically.  
6. Customer completes payment.  
7. Customer receives the order confirmation email.  
8. Customer is redirected to the Customer Portal.

## **Engineering Requirements**

* Use one shared shopping-bag and checkout implementation across Shop, Services, and Pricing.  
* Use Supabase Authentication for account creation, login, and password setup.  
* Connect all purchases and appointments to a unique customer ID.  
* Use email as the initial account identifier, while preventing duplicate accounts.  
* Store checkout, payment, booking, and customer records independently but link them through the customer ID and order ID.  
* Ensure checkout state survives authentication and redirects.  
* Ensure password setup does not invalidate the completed order or appointment.  
* Make email delivery events visible in logs for debugging.  
* Handle failed payments, expired password links, duplicate emails, and interrupted checkout sessions gracefully.

## **Acceptance Criteria**

* Services and Pricing use the same bag and checkout flow as Shop.  
* The Pricing page uses elegant product cards instead of a grid.  
* Unauthenticated customers must sign up or log in before completing checkout.  
* Booking-wizard information is reused during account creation.  
* Successful checkouts generate both the order confirmation and Supabase account email.  
* Customers can set a password without creating a duplicate account.  
* Customers are redirected to the Customer Portal after checkout.  
* The portal displays appointments, purchases, receipts, and account details.  
* A customer’s booking and purchase history remains connected across all flows.

# **Admin Publishing and Category System**

Build an admin system that allows staff to create, organize, configure, preview, and publish the category and product experiences shown in the provided design references. The admin configuration must automatically power the Parent Landing, Primary Category PLP, Subcategory PLP, product cards, filters, breadcrumbs, and product-detail pages. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/images/2167716967/27028349-a37d-41bd-8198-fbefd71116b9/image.jpg)

The admin should not require an engineer to hardcode a new category, filter, product, image, or description.

## **Admin Content Hierarchy**

The admin should manage the storefront using this structure:

 

| Pet Type or Parent Category └── Primary Category     └── Subcategory         └── Products  |
| :---- |

   
Example:

 

| Dog └── Grooming     └── Shampoos & Conditioners         ├── Pawz Signature Shampoo         ├── Oatmeal & Honey Shampoo         └── Sensitive Skin Shampoo  |
| :---- |

   
The admin may use the existing SQL category records, but the interface must present the simplified customer-facing hierarchy.

Do not expose redundant names such as:

 

| Dog → Dog Grooming Supplies → Grooming → Shampoos & Conditioners  |
| :---- |

   
Instead, allow the admin to define display settings so the storefront shows:

 

| Dog → Grooming → Shampoos & Conditioners  |
| :---- |

 

## **Admin Navigation**

Create an admin section called:

 

| Catalog  |
| :---- |

   
With these subsections:

 

| Categories Products Filters Collections Media Publishing  |
| :---- |

 

### **Categories**

The Categories section should allow admins to:

* View all categories in a tree.  
* Search categories.  
* Filter by status.  
* Add a parent category.  
* Add a primary category.  
* Add a subcategory.  
* Edit an existing category.  
* Reorder categories.  
* Hide a category from navigation.  
* Archive a category.  
* Preview a category page.  
* Publish or unpublish a category.  
* Assign category images and descriptions.  
* Configure the customer-facing display name and slug.

## **Create Category Flow**

When an admin selects **Add Category**, show a form with the following fields.

### **Basic information**

 

| Category name Customer-facing display name Category level Parent category URL slug Short description Long description  |
| :---- |

 

### **Category level**

The admin must choose one of:

 

| Level 1 — Parent Landing Level 2 — Primary Category Level 3 — Subcategory  |
| :---- |

   
The available parent selector should change based on the selected level.

#### **Level 1**

Required:

 

| Category name Display name Slug Description Hero image Status  |
| :---- |

   
Example:

 

| Name: Dog Display name: Dog Slug: dog Level: Parent Landing  |
| :---- |

 

#### **Level 2**

Required:

 

| Category name Display name Parent category Slug Description Hero image or banner image Status  |
| :---- |

   
Example:

 

| Name: Dog Grooming Supplies Display name: Grooming Parent: Dog Slug: grooming Level: Primary Category  |
| :---- |

 

#### **Level 3**

Required:

 

| Category name Display name Parent category Slug Description Category image Status  |
| :---- |

   
Example:

 

| Name: Shampoos & Conditioners Display name: Shampoos & Conditioners Parent: Grooming Slug: shampoos-conditioners Level: Subcategory  |
| :---- |

 

## **Customer-Facing Display Settings**

Because SQL may contain redundant category records, every category should support presentation controls.

 

| Display name Display slug Show in navigation Show in breadcrumbs Show as category card Flatten into parent hierarchy Display order  |
| :---- |

 

### **Example**

Raw database category:

 

| Dog Grooming Supplies  |
| :---- |

   
Admin configuration:

 

| Display name: Grooming Show in navigation: Yes Show in breadcrumbs: Yes Flatten into hierarchy: Yes Display order: 2  |
| :---- |

   
This allows the database to retain its original record while the customer sees the cleaner experience.

## **Category Statuses**

Each category should support a publishing status:

 

| Draft Scheduled Published Unpublished Archived  |
| :---- |

 

### **Draft**

* Visible only in admin.  
* Available for preview.  
* Not visible on the storefront.  
* Cannot be linked from public navigation.

### **Scheduled**

* Hidden until the selected publish date and time.  
* Automatically becomes published at the scheduled time.  
* Requires a valid date and timezone.

### **Published**

* Visible on the storefront.  
* Included in navigation, breadcrumbs, category cards, and search where applicable.  
* Can receive product assignments and filter configuration.

### **Unpublished**

* Removed from the storefront.  
* Existing products remain in the database.  
* Public links should show a not-found or unavailable state unless redirected.

### **Archived**

* No longer available for normal editing.  
* Removed from navigation.  
* Existing relationships should be retained for historical orders and reporting.

## **Category Page Configuration**

Each category should have a page-configuration panel that controls how the frontend renders the page.

### **Parent landing configuration**

For Level 1, allow the admin to configure:

 

| Hero image Hero title Hero description Featured child categories Shop by Need collections Best Sellers section New Arrivals section Promotional banner SEO title SEO description  |
| :---- |

   
The admin should be able to reorder these sections without changing code.

Example:

 

| 1\. Hero 2\. Shop by Category 3\. Shop by Need 4\. Best Sellers 5\. New Arrivals 6\. Promotional banner  |
| :---- |

 

### **Primary category configuration**

For Level 2, allow:

 

| Category hero image Description Visible subcategories Featured category order Enabled filters Featured products SEO metadata  |
| :---- |

   
The product listing, filter sidebar, active filter chips, and sort controls should be generated automatically from this configuration.

### **Subcategory configuration**

For Level 3, allow:

 

| Category image Short description Sibling navigation Enabled filters Featured products SEO metadata  |
| :---- |

   
The page should use the focused PLP template with a smaller heading and refined filters.

## **Product Creation Flow**

When an admin creates a product, the product must be assigned to at least one category before it can be published.

### **Required product fields**

 

| Product name Customer-facing title SKU Description Short description Brand Price Compare-at price Inventory quantity Product status Primary image Additional images  |
| :---- |

 

### **Category assignment**

The admin must choose:

 

| Parent category Primary category Optional subcategory  |
| :---- |

   
Example:

 

| Parent: Dog Primary category: Grooming Subcategory: Shampoos & Conditioners  |
| :---- |

   
If the admin selects a subcategory, the system should automatically associate the product with its parent categories for navigation and filtering.

The admin should also be allowed to assign a product to multiple relevant categories.

Example:

 

| Primary category: Grooming Additional collection: Skin & Coat Additional collection: Best Sellers  |
| :---- |

   
Do not duplicate the product record when assigning it to multiple categories. Use category-product relationships.

## **Product Publishing Rules**

A product cannot be published unless it has:

* A product name.  
* A valid SKU.  
* A price.  
* A primary image.  
* At least one active category.  
* An inventory or availability status.  
* A valid product URL slug.  
* Required variant data, if the product has variants.

When the product is published:

* It appears in the assigned category product grid.  
* It becomes eligible for relevant filters.  
* It can appear in collections and product rails.  
* It becomes available to the product-detail route.  
* It can be added to the shared bag.

If the product is unpublished:

* It disappears from product grids.  
* It cannot be added to the bag.  
* Existing orders and historical records remain unchanged.  
* Its product page should display an unavailable state or redirect according to admin settings.

## **Manual Filter Management**

Admins must be able to create filters manually and assign them to categories.

Create an admin section called:

 

| Catalog → Filters  |
| :---- |

 

### **Filter fields**

 

| Filter name Customer-facing label Filter key Filter type Category assignment Option values Display order Active status Inheritance setting  |
| :---- |

 

### **Supported filter types**

 

| Single select Multi-select Checkbox Boolean Range Price range Rating Color swatch Size selector Searchable option list  |
| :---- |

 

### **Example: Color filter**

 

| Filter name: Product Color Customer-facing label: Color Filter key: color Filter type: Color swatch Assigned categories: Apparel & Accessories, Collars, Beds Options: \- Black \- Brown \- Cream \- Blue \- Pink Status: Active  |
| :---- |

 

### **Example: Size filter**

 

| Filter name: Product Size Customer-facing label: Size Filter key: size Filter type: Multi-select Assigned categories: Apparel & Accessories, Beds Options: \- Small \- Medium \- Large \- X-Large Status: Active  |
| :---- |

 

### **Example: Coat Type filter**

 

| Filter name: Coat Type Customer-facing label: Coat Type Filter key: coat\_type Filter type: Multi-select Assigned categories: Grooming Options: \- Short \- Medium \- Long \- Curly \- Double Coat \- Sensitive Skin Status: Active  |
| :---- |

 

## **Filter Assignment Behavior**

Filters should support inheritance.

The storefront should calculate visible filters using:

 

| Global filters \+ Parent-category filters \+ Primary-category filters \+ Subcategory filters  |
| :---- |

   
Example:

 

| Global: Price, Rating, Brand, Availability Grooming: Coat Type, Grooming Function, Tool Type, Hair Length, Scent Shampoos & Conditioners: Formula Type, Skin Concern, Ingredients  |
| :---- |

   
The final subcategory page receives:

 

| Price Rating Brand Availability Coat Type Grooming Function Hair Length Scent Formula Type Skin Concern Ingredients  |
| :---- |

   
The admin should have an option on each filter:

 

| Inherit to child categories: Yes / No  |
| :---- |

   
This prevents admins from manually recreating the same filter on every subcategory.

## **Product Attribute Assignment**

Creating a filter is not enough. Products must have values assigned to that filter.

When editing a product, show an **Attributes** section generated from its assigned categories.

Example for a grooming product:

 

| Coat Type: \[ Short \] \[ Medium \] \[ Long \] \[ Sensitive Skin \] Grooming Function: \[ Cleansing \] \[ Conditioning \] \[ De-shedding \] Scent: \[ Unscented \] Waterproof: \[ No \]  |
| :---- |

   
Example for apparel:

 

| Color: \[ Cream \] Size: \[ Small \] \[ Medium \] \[ Large \] Material: \[ Cotton \] Waterproof: \[ Yes \]  |
| :---- |

   
Only values assigned to products should appear as selectable filter options on the storefront.

This prevents empty filter options from appearing.

## **Filter Option Rules**

Each filter option should support:

 

| Label Internal value Color code or swatch value, if applicable Display order Active status  |
| :---- |

   
Example:

 

| Label: Sensitive Skin Internal value: sensitive-skin Display order: 1 Status: Active  |
| :---- |

   
The internal value should remain stable even if the customer-facing label changes.

Do not use the visible label as the database identifier.

## **Automatic Filter Visibility**

The frontend should only render a filter when:

* The filter is active.  
* The filter is assigned to the category or inherited from a parent.  
* At least one published product has a value for the filter.  
* The filter has at least one valid option.  
* The filter is relevant to the current product set.

Example:

* Size appears on apparel.  
* Bed Size appears on beds.  
* Scent appears on shampoos.  
* Power Type appears on electric grooming tools.  
* Waterproof appears only when applicable.

## **Admin Preview and Publishing**

Every category and product edit screen should include:

 

| Save Draft Preview Publish Schedule Publish Unpublish  |
| :---- |

 

### **Preview behavior**

Preview should display the actual storefront template using unpublished data.

The preview must show:

* Category title.  
* Description.  
* Images.  
* Child categories.  
* Product assignments.  
* Filters.  
* Product count.  
* Desktop layout.  
* Mobile layout.

Use a preview URL that is protected from public indexing.

Example:

 

| /admin/preview/category/dog/grooming?token=...  |
| :---- |

   
The preview should not modify the live storefront until the admin selects Publish.

### **Publish validation**

Before publishing, run validation checks.

#### **Category validation**

* Category has a display name.  
* Category has a valid slug.  
* Parent relationship is valid.  
* Category does not create a circular hierarchy.  
* Required image exists for the selected template.  
* Required description exists.  
* Category is not assigned to an archived parent.  
* Slug is unique within its route level.

#### **Product validation**

* Product has a name.  
* Product has a price.  
* Product has a primary image.  
* Product has a valid category assignment.  
* Product has required variant data.  
* Product has inventory or an explicit availability status.  
* Product slug is unique.

#### **Filter validation**

* Filter has a stable key.  
* Filter has a supported type.  
* Filter has at least one active option.  
* Assigned categories are active.  
* Product values match valid filter options.

If validation fails, show the exact errors and do not publish.

## **Publication Effects**

When an admin publishes a category:

1. The category becomes visible on the storefront.  
2. Its route becomes active.  
3. Its breadcrumbs are generated.  
4. Its child categories appear in navigation.  
5. Its configured filters become available.  
6. Assigned products appear in the product listing.  
7. Category metadata becomes available to search engines.  
8. Product counts are recalculated.  
9. Relevant caches are invalidated.  
10. Search indexes are updated if search indexing is enabled.

When an admin publishes a filter:

1. The filter becomes eligible for assigned categories.  
2. The frontend checks whether published products contain values.  
3. The filter appears only where usable.  
4. Existing product queries can use the new filter.  
5. Product counts are recalculated.

When an admin publishes a product:

1. It appears in assigned product grids.  
2. Its filter values become available.  
3. Its product page becomes active.  
4. It becomes eligible for search and collections.  
5. It becomes available to the shared bag.

## **Admin Workflow Examples**

### **Create a new primary category**

 

| 1\. Admin opens Catalog → Categories. 2\. Admin selects Add Category. 3\. Admin chooses Level 2 — Primary Category. 4\. Admin selects Dog as the parent. 5\. Admin enters display name: Grooming. 6\. Admin adds the description. 7\. Admin uploads the hero image. 8\. Admin selects relevant filters:    \- Brand    \- Price    \- Rating    \- Availability    \- Coat Type    \- Grooming Function    \- Tool Type    \- Hair Length    \- Scent    \- Waterproof 9\. Admin saves the category as Draft. 10\. Admin previews desktop and mobile. 11\. Admin publishes the category. 12\. The storefront renders the Level 2 PLP automatically.  |
| :---- |

 

### **Create a new subcategory**

 

| 1\. Admin opens Catalog → Categories. 2\. Admin selects Add Category. 3\. Admin chooses Level 3 — Subcategory. 4\. Admin selects Grooming as the parent. 5\. Admin enters Shampoos & Conditioners. 6\. Admin adds the short description and image. 7\. Admin enables inherited Grooming filters. 8\. Admin adds:    \- Formula Type    \- Skin Concern    \- Ingredients 9\. Admin previews the focused PLP. 10\. Admin publishes the subcategory.  |
| :---- |

 

### **Create a color filter**

 

| 1\. Admin opens Catalog → Filters. 2\. Admin selects Add Filter. 3\. Admin enters Color. 4\. Admin chooses Color Swatch as the filter type. 5\. Admin adds Black, Brown, Cream, Blue, and Pink. 6\. Admin assigns the filter to Apparel & Accessories. 7\. Admin enables inheritance to its subcategories. 8\. Admin saves and publishes the filter. 9\. The filter becomes visible only on apparel pages containing products with color values.  |
| :---- |

 

### **Assign a product to a new category**

 

| 1\. Admin opens Catalog → Products. 2\. Admin edits the product. 3\. Admin assigns:    \- Parent: Dog    \- Primary: Grooming    \- Subcategory: Shampoos & Conditioners 4\. The product editor displays the relevant grooming attributes. 5\. Admin enters:    \- Coat Type: Sensitive Skin    \- Grooming Function: Cleansing    \- Scent: Unscented    \- Formula Type: Hypoallergenic 6\. Admin saves the product. 7\. The product appears in the correct PLP after publication. 8\. The assigned values become available as filter options.  |
| :---- |

 

## **Recommended Data Relationships**

Use relationship tables rather than storing category assignments as a single product field.

 

| categories category\_presentation category\_product category\_filter filter\_definitions filter\_options product\_filter\_values collections collection\_products  |
| :---- |

 

### **Suggested relationship behavior**

 

| categories \- id \- parent\_id \- name \- display\_name \- slug \- level \- status category\_presentation \- category\_id \- hero\_image \- description \- display\_order \- show\_in\_navigation \- show\_in\_breadcrumbs \- flatten\_in\_hierarchy category\_product \- category\_id \- product\_id \- is\_primary \- display\_order filter\_definitions \- id \- name \- label \- key \- type \- inherit\_to\_children \- status category\_filter \- category\_id \- filter\_id \- display\_order \- is\_required filter\_options \- id \- filter\_id \- label \- value \- display\_order \- status product\_filter\_values \- product\_id \- filter\_id \- option\_id \- value  |
| :---- |

   
Do not modify historical orders when products, categories, or filters change. Orders should store a snapshot of the purchased product name, price, SKU, and selected options.

## **Admin Permissions**

Recommended roles:

| Role | Permissions |
| :---- | :---- |
| Catalog Editor | Create and edit products, categories, filters, and drafts |
| Merchandising Manager | Configure collections, ordering, featured products, and page sections |
| Publisher | Preview, publish, schedule, and unpublish content |
| Administrator | Full access, including taxonomy and system settings |

Use approval status if the business wants a review process:

 

| Draft → Pending Review → Approved → Scheduled → Published  |
| :---- |

 

## **Final System Behavior**

The system should behave as follows:

 

| Admin creates or selects a category → Admin assigns the category level and parent → Admin adds display content and images → Admin assigns or creates relevant filters → Admin assigns products → Admin enters product attribute values → Admin previews the page → System validates the configuration → Admin publishes → Frontend resolves the category and renders the correct template → Products, filters, breadcrumbs, counts, and navigation update automatically  |
| :---- |

   
The key principle is that the admin manages **content and relationships**, while the frontend manages **presentation through reusable templates**. This keeps the storefront consistent with the supplied designs while allowing the catalog to grow without creating new custom code for every category.

# **Admin-Driven Website Content and Booking Specification**

Build a centralized admin system that controls the Services, Pricing, Policies, Documentation, Gallery, Legal, and Booking experiences. Updates made in the admin panel must appear on the public website without requiring frontend code changes or database edits by an engineer.

The system should use reusable frontend templates powered by admin-managed content, configuration, relationships, and publishing states.

---

# **1\. Core Publishing Model**

Every admin-managed record must support:

 

| Draft Published Scheduled Unpublished Archived  |
| :---- |

   
Each record should include:

 

| id title slug status created\_by updated\_by created\_at updated\_at published\_at scheduled\_publish\_at  |
| :---- |

 

## **Admin actions**

Every editable record should support:

 

| Save Draft Preview Publish Schedule Publish Unpublish Archive Duplicate  |
| :---- |

 

## **Publishing behavior**

When an admin publishes content:

1. Validate all required fields.  
2. Save the published version.  
3. Invalidate the related frontend cache.  
4. Refresh any relevant search or navigation index.  
5. Make the update visible on the public page.  
6. Record the publishing user and timestamp.

If a record is saved as a draft, it must not affect the live website.

## **Preview behavior**

The admin must be able to preview unpublished content using the actual public page template.

Preview should support:

* Desktop view.  
* Mobile view.  
* Draft content.  
* Draft pricing.  
* Draft services.  
* Draft policies.  
* Draft booking settings.  
* Draft gallery content.

Preview URLs must be protected and excluded from search indexing.

---

# **2\. Shared Admin Architecture**

Create these admin sections:

 

| Services Pricing Booking Settings Groomers Dog Breeds Policies Documentation Legal Gallery Media Library Publishing  |
| :---- |

   
Use a shared content system where possible, but keep transactional data such as deposits, appointments, staff availability, and service pricing separate from marketing content.

## **Important separation**

Use two types of data:

### **Content data**

Used for public page presentation:

 

| Titles Descriptions Images FAQs Policies Service details Marketing copy Gallery captions  |
| :---- |

 

### **Operational data**

Used to run the business:

 

| Prices Deposits Availability Groomers Dog breeds Appointment duration Booking rules Capacity Tax settings  |
| :---- |

   
Marketing content can be drafted and previewed independently. Operational booking changes must include validation and audit history.

---

# **3\. Services Page**

## **Purpose**

Allow the admin to create and manage grooming services that appear on the public Services page and can be selected during booking or added to the checkout bag.

## **Service fields**

Each service should support:

 

| Service name Public display name Slug Short description Long description Service category Hero image Card image Icon Base price Price display mode Duration Eligible dog sizes Eligible coat types Required booking information Add-ons Booking availability Sort order Featured status Status  |
| :---- |

 

## **Price display modes**

Support:

 

| Starting at Fixed price Price range Size-based price Custom quote  |
| :---- |

   
Examples:

 

| Starting at $75 $95 $75–$135 From $75, based on size Contact us for pricing  |
| :---- |

 

## **Service categories**

Allow admin-managed categories such as:

 

| Grooming Bath & Spa Nail & Paw Care Add-On Services  |
| :---- |

   
The admin should be able to:

* Add a category.  
* Rename a category.  
* Reorder categories.  
* Hide a category.  
* Assign services to a category.  
* Feature selected services.

## **Service packages**

Support service packages such as:

 

| Bath & Brush Full Groom Deluxe Spa  |
| :---- |

   
Each package should support size-based pricing:

| Size | Price |
| :---- | :---- |
| Small | $75 |
| Medium | $95 |
| Large | $115 |
| X-Large | $135 |

The admin must be able to add, remove, rename, and reorder size tiers.

## **Service add-ons**

Allow admins to create add-ons independently.

Example:

 

| Teeth Brushing — $15 De-shedding — $15–$35 Paw Treatment — $15 Nail Trim — $15 Flea Bath — $10  |
| :---- |

   
Each add-on should support:

 

| Name Description Price Price range Duration Eligible services Eligible dog sizes Active status  |
| :---- |

 

## **Public Services page behavior**

The frontend should automatically render:

* Service categories.  
* Service cards.  
* Service descriptions.  
* Pricing.  
* Add-ons.  
* Booking buttons.  
* Featured services.  
* Service ordering.

When an admin publishes a service update, the public Services page must display the new content without a code deployment.

## **Booking relationship**

A service may be:

 

| Informational only Bookable Purchasable through the bag Bookable and purchasable  |
| :---- |

   
The admin must select the behavior.

---

# **4\. Pricing Page**

## **Purpose**

The Pricing page should be managed as an admin-configurable product and service catalog using elegant product cards rather than a fixed hardcoded grid.

## **Pricing item types**

Support:

 

| Grooming package Individual service Add-on Membership Promotion Custom pricing item  |
| :---- |

 

## **Pricing item fields**

 

| Name Display title Short description Detailed description Price Price display mode Size-based pricing Included services Add-ons Image Icon Featured status CTA label CTA destination Bookable Addable to bag Sort order Status  |
| :---- |

 

## **Pricing cards**

The frontend should render pricing cards from admin data.

Each card may include:

 

| Package name Short description Starting price Size pricing Included services Recommended badge Book Now button Add to Bag button View Details button  |
| :---- |

   
The admin should be able to choose which elements appear on each card.

## **Pricing page sections**

Allow admins to configure page sections:

 

| Hero Featured packages Grooming packages Bath and spa Nail and paw care Add-ons FAQ Call to action  |
| :---- |

   
Admins must be able to:

* Add a section.  
* Remove a section.  
* Reorder sections.  
* Rename section headings.  
* Assign pricing items.  
* Select featured items.  
* Edit section descriptions.  
* Preview the page before publishing.

## **Pricing and checkout**

Pricing items must use the same shared bag and checkout system as:

 

| Shop products Services Booking add-ons Grooming packages  |
| :---- |

   
The pricing page must not create a separate payment flow.

---

# **5\. Policies and Documentation**

## **Purpose**

Allow non-technical admins to publish customer-facing information without editing code.

Create separate admin areas for:

 

| Policies Documentation FAQs Care Instructions Booking Information Service Preparation Aftercare  |
| :---- |

 

## **Policy fields**

 

| Title Slug Policy type Summary Full content Effective date Version number Requires customer acknowledgment Status  |
| :---- |

 

## **Policy types**

Support:

 

| Cancellation Policy Late Arrival Policy No-Show Policy Deposit Policy Refund Policy Service Policy Pet Safety Policy Pickup Policy Shipping Policy Returns Policy Privacy Policy Terms of Service  |
| :---- |

 

## **Documentation fields**

 

| Title Slug Document category Content blocks Related services Related policies Downloadable file Featured status Status  |
| :---- |

   
Documentation may include:

 

| What to expect How to prepare your dog Grooming aftercare First-visit guide Frequently asked questions Product instructions  |
| :---- |

 

## **Content editor**

Use a structured rich-text editor with support for:

 

| Headings Paragraphs Bulleted lists Numbered lists Links Images Callouts Tables Accordions Buttons Policy notices  |
| :---- |

   
Do not store uncontrolled HTML if structured content blocks can be used.

## **Legal acknowledgment**

For policies that require acknowledgment:

* Display the current published version during booking or checkout.  
* Require the customer to accept the policy before proceeding.  
* Store:  
  * Customer ID.  
  * Policy ID.  
  * Policy version.  
  * Timestamp.  
  * IP or session metadata where legally appropriate.  
* If the policy version changes, require acknowledgment of the new version when applicable.

Existing orders and appointments must retain the version accepted at the time.

---

# **6\. Gallery Management**

## **Purpose**

Allow admins to manage the public Gallery page and control which images appear across the website.

## **Gallery item fields**

 

| Image Title Caption Alt text Category Tags Related service Related groomer Featured status Display order Status  |
| :---- |

 

## **Gallery categories**

Allow admin-managed categories such as:

 

| Grooming Results Bath and Spa Puppy Grooms Before and After Salon Team Community  |
| :---- |

 

## **Gallery behavior**

The public Gallery page should support:

* Featured gallery images.  
* Category filtering.  
* Lightbox viewing.  
* Captions.  
* Responsive image layout.  
* Mobile-friendly scrolling.  
* Optional related service or groomer information.

The admin must be able to:

* Upload images.  
* Crop or select focal points.  
* Add alt text.  
* Reorder images.  
* Hide images.  
* Feature images.  
* Assign tags.  
* Replace an image without breaking existing references.

## **Image requirements**

The system should generate:

 

| Thumbnail Card image Desktop image Mobile image OpenGraph image  |
| :---- |

   
Use optimized image formats and responsive image sizes. Do not serve full-resolution originals when a smaller derivative is sufficient.

---

# **7\. Media Library**

Create a shared Media Library for:

 

| Service images Pricing images Gallery images Policy images Hero images Staff photos Product images Icons Documents  |
| :---- |

   
Each media item should include:

 

| File File type Alt text Caption Tags Focal point Uploaded by Usage references Status  |
| :---- |

   
Prevent deletion of media currently used by published content unless the admin confirms replacement or removal.

---

# **8\. Booking Configuration**

## **Purpose**

Allow the admin to update the booking wizard without code changes.

The booking wizard must be configuration-driven.

Administrators should be able to manage:

 

| Dog breeds Dog sizes Coat types Groomers Services Add-ons Deposits Appointment durations Availability Booking questions Policies Confirmation messages  |
| :---- |

   
---

# **9\. Dog Breed Management**

## **Admin functionality**

Allow admins to:

* Add a dog breed.  
* Edit a dog breed.  
* Assign a breed to a size group.  
* Assign a breed to a coat type.  
* Mark a breed as mixed or other.  
* Hide a breed from new bookings.  
* Search breeds.  
* Reorder commonly used breeds.

## **Breed fields**

 

| Breed name Display name Size group Coat type Typical grooming duration Special handling notes Active status Display order  |
| :---- |

 

## **Size groups**

Support configurable groups such as:

 

| Small Medium Large X-Large  |
| :---- |

   
The admin must be able to change the breed-to-size relationship without changing the pricing code.

If a breed does not have a known size mapping, display:

 

| Other / Mixed Breed  |
| :---- |

   
The customer should still be able to continue booking.

---

# **10\. Groomer Management**

## **Groomer fields**

 

| Name Display name Profile photo Bio Specialties Eligible services Eligible dog sizes Availability Bookable status Display order Status  |
| :---- |

 

## **Groomer behavior**

Admins should be able to:

* Add a groomer.  
* Edit a groomer.  
* Upload a profile image.  
* Assign services.  
* Assign working hours.  
* Set time-off periods.  
* Mark a groomer as bookable or unavailable.  
* Hide a groomer from public selection.  
* Feature a groomer.  
* Reorder groomers in the booking wizard.

## **Booking selection**

The booking flow should support:

 

| Any groomer Specific groomer Recommended groomer  |
| :---- |

   
If a groomer is unavailable for the selected service, size, or date, the groomer should not appear as an available option.

---

# **11\. Deposit Management**

## **Deposit settings**

Allow admins to configure deposits globally and per service.

Supported deposit types:

 

| Fixed amount Percentage of appointment price No deposit Full prepayment  |
| :---- |

 

## **Deposit fields**

 

| Deposit type Deposit amount or percentage Applies to services Applies to sizes Applies to new customers Applies to specific dates Refundable status Cancellation deadline Effective date Status  |
| :---- |

   
Example:

 

| Deposit type: Percentage Amount: 25% Applies to: Full Groom and Deluxe Spa Refundable: Yes, if canceled 48 hours before appointment  |
| :---- |

 

## **Deposit behavior**

When the customer selects a service:

1. Calculate the service price.  
2. Calculate the required deposit.  
3. Display the deposit clearly before payment.  
4. Add the deposit to the booking/order record.  
5. Store the remaining balance.  
6. Display cancellation and refund rules.  
7. Use the active policy version for acknowledgment.

Do not hardcode the deposit amount into the frontend.

## **Deposit versioning**

When an admin changes a deposit:

* Existing appointments retain the original deposit rules.  
* New bookings use the newly published rule.  
* The system stores the rule ID and version used for each appointment.  
* Draft deposit changes must not affect live checkout.

---

# **12\. Booking Wizard Configuration**

The booking wizard should be built from configurable steps.

## **Default steps**

 

| 1\. Select service 2\. Select dog size 3\. Select dog breed 4\. Select coat type 5\. Select add-ons 6\. Select groomer 7\. Select date and time 8\. Enter customer information 9\. Review policies and deposit 10\. Pay deposit 11\. Confirmation  |
| :---- |

   
The admin should be able to:

* Rename step labels.  
* Enable or disable optional steps.  
* Reorder steps where safe.  
* Add booking questions.  
* Mark questions as required.  
* Add help text.  
* Configure selection labels.  
* Configure confirmation copy.

## **Booking question fields**

 

| Question Field type Required Help text Applies to service Display order Status  |
| :---- |

   
Supported field types:

 

| Short text Long text Single select Multi-select Yes/no Date File upload  |
| :---- |

   
Example questions:

 

| Does your dog have any sensitivities? Is your dog comfortable around other dogs? Are there any areas we should avoid?  |
| :---- |

   
---

# **13\. Frontend Data Flow**

The public frontend should retrieve published data through a shared API or server-side data layer.

## **Services**

 

| GET /api/services?status=published GET /api/service-categories?status=published GET /api/add-ons?status=published  |
| :---- |

 

## **Pricing**

 

| GET /api/pricing-items?status=published GET /api/pricing-sections?status=published  |
| :---- |

 

## **Policies and documentation**

 

| GET /api/policies/\[slug\] GET /api/documents/\[slug\] GET /api/faqs  |
| :---- |

 

## **Gallery**

 

| GET /api/gallery?status=published GET /api/gallery/categories  |
| :---- |

 

## **Booking configuration**

 

| GET /api/booking/config GET /api/booking/breeds GET /api/booking/groomers GET /api/booking/services GET /api/booking/deposit-rules GET /api/booking/questions  |
| :---- |

   
The API must never return drafts to unauthenticated public users.

Admin preview requests may access drafts only through a protected preview mechanism.

---

# **14\. Cache and Update Behavior**

Published updates must become visible without requiring a frontend deployment.

When an admin publishes content:

 

| Publish content → Invalidate related cache → Refresh API response → Revalidate public route → Update search/index data → Show new content on next page load  |
| :---- |

   
Recommended invalidation targets:

 

| Services page Pricing page Booking wizard Policy page Gallery page Related service detail pages Homepage sections using the updated content  |
| :---- |

   
For urgent updates, provide:

 

| Publish immediately  |
| :---- |

   
For planned updates, provide:

 

| Schedule publication  |
| :---- |

   
If the application uses static generation, use on-demand revalidation or tag-based cache invalidation rather than requiring a full deployment.

---

# **15\. Audit History**

Every important admin change must be logged.

Track:

 

| User Action Record type Record ID Previous value New value Timestamp IP/session metadata where appropriate  |
| :---- |

   
Audit changes for:

* Service prices.  
* Pricing items.  
* Deposits.  
* Policies.  
* Legal content.  
* Groomer availability.  
* Breed availability.  
* Booking settings.  
* Published and unpublished content.

Admins should be able to view the change history for a record.

---

# **16\. Validation Rules**

## **Services and pricing**

A service or pricing item cannot be published without:

* Name.  
* Description.  
* Price or valid pricing mode.  
* Required image where the selected template needs one.  
* Valid booking or checkout behavior.  
* Active status.

## **Policies and legal**

A legal or policy page cannot be published without:

* Title.  
* Slug.  
* Full content.  
* Effective date.  
* Version number.  
* Assigned policy type.

## **Gallery**

A gallery item cannot be published without:

* Image.  
* Alt text.  
* Status.  
* Valid image processing result.

## **Groomers**

A groomer cannot be bookable without:

* Name.  
* Active status.  
* At least one service assignment.  
* Availability schedule or valid availability rule.

## **Dog breeds**

A breed cannot be selectable in booking unless:

* It has a display name.  
* It has an active status.  
* It has a size group or “Other/Mixed Breed” fallback.

## **Deposit rules**

A deposit rule cannot be published unless:

* Deposit type is valid.  
* Amount or percentage is valid.  
* Applicable services are selected.  
* Refund and cancellation behavior is defined.

---

# **17\. Example Admin Workflows**

## **Update a service price**

 

| 1\. Admin opens Services. 2\. Admin selects Full Groom. 3\. Admin edits the size-based price table. 4\. Admin changes Large from $135 to $145. 5\. Admin saves as Draft. 6\. Admin previews the Services page and Booking wizard. 7\. Admin publishes the change. 8\. New bookings use $145 for Large. 9\. Existing appointments retain their original price. 10\. The published price appears on Services, Pricing, and booking checkout.  |
| :---- |

 

## **Add a new groomer**

 

| 1\. Admin opens Booking Settings → Groomers. 2\. Admin selects Add Groomer. 3\. Admin enters the groomer name and bio. 4\. Admin uploads a profile image. 5\. Admin assigns eligible services and sizes. 6\. Admin adds the working schedule. 7\. Admin marks the groomer as Bookable. 8\. Admin previews the booking wizard. 9\. Admin publishes. 10\. The groomer appears in the groomer selection step when available.  |
| :---- |

 

## **Add a new breed**

 

| 1\. Admin opens Booking Settings → Dog Breeds. 2\. Admin selects Add Breed. 3\. Admin enters the breed name. 4\. Admin assigns the size group and coat type. 5\. Admin adds optional grooming notes. 6\. Admin publishes. 7\. The breed appears in the booking wizard. 8\. The assigned size and coat rules are used for pricing and service eligibility.  |
| :---- |

 

## **Change the deposit**

 

| 1\. Admin opens Booking Settings → Deposits. 2\. Admin creates a new deposit rule. 3\. Admin selects percentage or fixed amount. 4\. Admin enters the amount. 5\. Admin selects applicable services. 6\. Admin defines cancellation and refund rules. 7\. Admin saves as Draft. 8\. Admin previews the booking checkout. 9\. Admin publishes the rule. 10\. New bookings use the new rule. 11\. Existing bookings retain the previous rule version.  |
| :---- |

 

## **Publish a new policy**

 

| 1\. Admin opens Policies. 2\. Admin selects Add Policy. 3\. Admin selects Cancellation Policy. 4\. Admin enters the content and effective date. 5\. Admin assigns a version number. 6\. Admin marks customer acknowledgment as required. 7\. Admin previews the policy and booking acknowledgment. 8\. Admin publishes. 9\. New bookings require acknowledgment of the new version. 10\. Existing appointments retain the previous accepted version.  |
| :---- |

   
---

# **18\. Acceptance Criteria**

The system is complete when:

* Services can be created, edited, reordered, drafted, previewed, published, and unpublished from the admin panel.  
* Pricing cards are generated from admin-managed pricing items.  
* Service and pricing updates appear on the public site without frontend code changes.  
* Services, packages, add-ons, and pricing items use the shared booking and checkout system.  
* Policies and documentation can be authored and published from the admin panel.  
* Legal policy versions are stored and linked to customer acknowledgments.  
* Gallery images can be uploaded, categorized, reordered, featured, and published.  
* Dog breeds can be added or removed from the booking selection without code changes.  
* Groomers can be added, assigned services, scheduled, and made bookable from the admin panel.  
* Deposit type and amount can be changed through admin configuration.  
* New deposit rules apply only to new bookings.  
* Existing bookings retain historical pricing, deposit, and policy versions.  
* Booking steps and questions can be configured from admin settings.  
* Public pages only display published records.  
* Draft content is visible only through protected preview.  
* Every publication and operational change is logged.  
* Cache and route revalidation make published changes visible without a deployment.  
* The system validates incomplete or conflicting configuration before publishing.

