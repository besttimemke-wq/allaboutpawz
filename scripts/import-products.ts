import { readFileSync } from "fs"
import pg from "pg"

const FILE = "/home/z/my-project/upload/supabase-import.jsonl"
const SUPABASE_URL = process.env.SUPABASE_SESSION_POOLER || process.env.DATABASE_URL || ""
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

// Parse env from .env
const envFile = readFileSync("/home/z/my-project/.env", "utf-8")
const envVars: Record<string, string> = {}
envFile.split("\n").forEach(l => {
  const m = l.match(/^([A-Z_]+)=(.*)$/)
  if (m) envVars[m[1]] = m[2].replace(/["']/g, "")
})

const DB_URL = envVars["SUPABASE_SESSION_POOLER"] || envVars["SUPABASE_DIRECT_CONNECTION"] || ""
console.log("DB URL prefix:", DB_URL.substring(0, 30) + "...")

const TENANT = envVars["SUPABASE_TENANT_ID"] || "00000000-0000-0000-0000-000000000001"

const PRODUCT_TYPE_MAP: Record<string, { animal: string; subcategory: string }> = {
  "Dog Food Dry": { animal: "dog", subcategory: "Dry Dog Food & Kibble" },
  "Dog Food Wet": { animal: "dog", subcategory: "Wet Dog Food" },
  "Dog Food Freeze Dried": { animal: "dog", subcategory: "Fresh, Frozen, & Freeze Dried Dog Food" },
  "Dog Food Topper": { animal: "dog", subcategory: "Dog Food Toppers" },
  "Dog Food Dehydrated": { animal: "dog", subcategory: "Fresh, Frozen, & Freeze Dried Dog Food" },
  "Dog Treats Biscuits Cookies and Crunchy": { animal: "dog", subcategory: "Dog Biscuits, Cookies & Snacks" },
  "Dog Treats Biscuits and Crunchy": { animal: "dog", subcategory: "Dog Biscuits, Cookies & Snacks" },
  "Dog Treats Bones Bully Sticks and Natural Chews": { animal: "dog", subcategory: "Bully Sticks for Dogs" },
  "Dog Treats Soft & Chewy": { animal: "dog", subcategory: "Soft & Chewy Dog Treats" },
  "Dog Treats Soft and Chewy": { animal: "dog", subcategory: "Soft & Chewy Dog Treats" },
  "Dog Treats Dental Chews": { animal: "dog", subcategory: "Dental Dog Chews" },
  "Dog Treats Freeze Dried and Dehydrated": { animal: "dog", subcategory: "Freeze-Dried Dog Treats" },
  "Dog Treats Freeze Dried": { animal: "dog", subcategory: "Freeze-Dried Dog Treats" },
  "Dog Treats Hard Chews and Rawhide": { animal: "dog", subcategory: "Dog Bones & Chews" },
  "Dog Treats Jerky": { animal: "dog", subcategory: "Jerky Dog Treats" },
  "Dog Treats Dehydrated": { animal: "dog", subcategory: "Freeze-Dried Dog Treats" },
  "Dog Treats Training": { animal: "dog", subcategory: "Dog Training Treats" },
  "Dog Training Treats": { animal: "dog", subcategory: "Dog Training Treats" },
  "Dog Treats Dispenser": { animal: "dog", subcategory: "Interactive & Treat Dispensing Dog Toys" },
  "Dog Toys Plush": { animal: "dog", subcategory: "Plush Dog Toys" },
  "Dog Toy Plush": { animal: "dog", subcategory: "Plush Dog Toys" },
  "Dog-Supply-Toys-Plush": { animal: "dog", subcategory: "Plush Dog Toys" },
  "Dog Toys Balls": { animal: "dog", subcategory: "Fetch & Outdoor Dog Toys" },
  "Dog Toys Ball": { animal: "dog", subcategory: "Fetch & Outdoor Dog Toys" },
  "Dog Toys Interactive": { animal: "dog", subcategory: "Interactive & Treat Dispensing Dog Toys" },
  "Dog Toy Interactive": { animal: "dog", subcategory: "Interactive & Treat Dispensing Dog Toys" },
  "Dog-Supply-Toys-Interactive": { animal: "dog", subcategory: "Interactive & Treat Dispensing Dog Toys" },
  "Dog Toy Treat": { animal: "dog", subcategory: "Interactive & Treat Dispensing Dog Toys" },
  "Dog Toys Rope and Tug": { animal: "dog", subcategory: "Rope & Tug Dog Toys" },
  "Dog-Supply-Toys-Rope": { animal: "dog", subcategory: "Rope & Tug Dog Toys" },
  "Dog Toys Hard Chews": { animal: "dog", subcategory: "Tough & Durable Dog Toys" },
  "Dog Toys Rubber and Latex": { animal: "dog", subcategory: "Tough & Durable Dog Toys" },
  "Dog Toys Fetch": { animal: "dog", subcategory: "Fetch & Outdoor Dog Toys" },
  "Dog Toys Chew Toys": { animal: "dog", subcategory: "Dog Chew Toys" },
  "Dog Toy Chew": { animal: "dog", subcategory: "Dog Chew Toys" },
  "Dog Toys Holiday": { animal: "dog", subcategory: "Puppy Toys" },
  "Dog Beds Bolster": { animal: "dog", subcategory: "Bolster Dog Beds" },
  "Dog Beds Cratemats": { animal: "dog", subcategory: "Dog Crate Mats & Pads" },
  "Dog Blanket": { animal: "dog", subcategory: "Dog Blankets, Throws & Bed Covers" },
  "Dog Beds Orthopedic": { animal: "dog", subcategory: "Orthopedic Dog Beds" },
  "Dog Beds Pillows": { animal: "dog", subcategory: "Pillow Bed" },
  "Dog Beds Elevated": { animal: "dog", subcategory: "Elevated Dog Beds & Raised Cots" },
  "Dog-Supply-Accssry-Beds&Mats": { animal: "dog", subcategory: "Dog Crate Mats & Pads" },
  "Dog-Supply-Bedding": { animal: "dog", subcategory: "Dog Beds & Bedding" },
  "Dog Bowls and Dishes": { animal: "dog", subcategory: "Dog Bowls" },
  "Dog Outdoor and Travel Bowls and Accessories": { animal: "dog", subcategory: "Dog Water Bottles" },
  "Dog Feeding Mat": { animal: "dog", subcategory: "Dog Placemats" },
  "Dog Grooming Shampoo and Conditioners": { animal: "dog", subcategory: "Dog Grooming Supplies" },
  "Dog Grooming Tools": { animal: "dog", subcategory: "Dog Grooming Supplies" },
  "Dog Grooming Sprays": { animal: "dog", subcategory: "Dog Grooming Supplies" },
  "Dog Grooming Wipes": { animal: "dog", subcategory: "Dog Grooming Supplies" },
  "Dog Grooming Waterless": { animal: "dog", subcategory: "Dog Grooming Supplies" },
  "Dog Grooming Dental": { animal: "dog", subcategory: "Dog Grooming Supplies" },
  "Dog Supplements Dental": { animal: "dog", subcategory: "Dog Dental Care" },
  "Dog Supplements Vitamins": { animal: "dog", subcategory: "Dog Multivitamins" },
  "Dog Supplements Skin and Coat": { animal: "dog", subcategory: "Dog Skin & Coat Supplements" },
  "Dog Supplement Skin & Coat": { animal: "dog", subcategory: "Dog Skin & Coat Supplements" },
  "Dog Supplements CBD": { animal: "dog", subcategory: "Dog Calming Aids and Supplements" },
  "Dog Supplements Calming": { animal: "dog", subcategory: "Dog Calming Aids and Supplements" },
  "Dog Supplements Stress Anxiety": { animal: "dog", subcategory: "Dog Anxiety & Calming Aid" },
  "Dog Supplements Digest and Urinary": { animal: "dog", subcategory: "Dog Vitamins & Supplements" },
  "Dog Supplements Digestive and Urinary": { animal: "dog", subcategory: "Dog Vitamins & Supplements" },
  "Dog Supplements First Aid": { animal: "dog", subcategory: "Dog First Aid & Recovery" },
  "Dog Supplements Hip and Joint": { animal: "dog", subcategory: "Hip & Joint Supplements for Dog" },
  "Dog Supplements Ears and Eyes": { animal: "dog", subcategory: "Dog Ear & Eye Care" },
  "Dog Supplements Allergy": { animal: "dog", subcategory: "Dog Allergy Medicine & Itch Relief" },
  "Dog Supplements Puppy": { animal: "dog", subcategory: "Dog Vitamins & Supplements" },
  "Dog Supplements Flea and Tick": { animal: "dog", subcategory: "Flea & Tick Medicine for Dogs" },
  "Dog Flea and Tick Topical": { animal: "dog", subcategory: "Topical Flea & Tick Treatment for Dogs" },
  "Dog Flea and Tick Home": { animal: "dog", subcategory: "Flea & Tick Sprays for Houses & Yards" },
  "Dog Flea and Tick Shampoo and Sprays": { animal: "dog", subcategory: "Flea & Tick Shampoos for Dogs" },
  "Dog Flea and Tick Collar": { animal: "dog", subcategory: "Flea & Tick Prevention Collars for Dogs" },
  "Dog Flea and Tick Combs": { animal: "dog", subcategory: "Dog Flea & Tick Combs" },
  "Dog Apparel Collar": { animal: "dog", subcategory: "Dog Collars" },
  "Dog Apparel Leads": { animal: "dog", subcategory: "Dog Leashes" },
  "Dog Apparel Harness": { animal: "dog", subcategory: "Dog Harnesses" },
  "Dog Apparel Head Collar": { animal: "dog", subcategory: "Dog Harnesses" },
  "Dog Training Collars": { animal: "dog", subcategory: "Dog Collars" },
  "Dog Apparel Coats": { animal: "dog", subcategory: "Coats & Jackets" },
  "Dog Apparel Boots and Socks": { animal: "dog", subcategory: "Dog Clothes & Accessories" },
  "Dog Apparel Tags Bells and Charms": { animal: "dog", subcategory: "Dog ID Tags & Accessories" },
  "Dog Costume": { animal: "dog", subcategory: "Costume" },
  "Dog Travel Tie Out": { animal: "dog", subcategory: "Dog Stakes & Tie-Outs" },
  "Dog Outdoor and Travel Tie Out": { animal: "dog", subcategory: "Dog Stakes & Tie-Outs" },
  "Dog Cleaning and Potty Stain Removers": { animal: "dog", subcategory: "Dog Stain & Odor Removers" },
  "Dog Cleaning and Potty Poop Bags": { animal: "dog", subcategory: "Dog Poop Bags & Dispensers" },
  "Dog Cleaning and Potty Pee Pads and Diapers": { animal: "dog", subcategory: "Dog Potty Pads" },
  "Dog Cleaning and Potty Scoopers": { animal: "dog", subcategory: "Dog Waste Disposal" },
  "Travel & Home": { animal: "dog", subcategory: "Dog Outdoor & Travel Gear" },
  "Dog Travel and Home": { animal: "dog", subcategory: "Dog Outdoor & Travel Gear" },
  "Dog Outdoor and Travel Car Accessories": { animal: "dog", subcategory: "Dog Outdoor & Travel Gear" },
  "Dog Outdoor and Travel Carriers": { animal: "dog", subcategory: "Dog Crates, Kennels, & Accessories" },
  "Dog Travel Carriers": { animal: "dog", subcategory: "Dog Crates, Kennels, & Accessories" },
  "Dog Training Repellent": { animal: "dog", subcategory: "Dog Training & Behavior Supplies" },
  "Dog Training Accessories": { animal: "dog", subcategory: "Dog Training & Behavior Supplies" },
  "Dog Training Muzzles": { animal: "dog", subcategory: "Dog Training & Behavior Supplies" },
  "Dog Accessories": { animal: "dog", subcategory: "Dog Outdoor & Travel Gear" },
  "Cat Food Wet": { animal: "cat", subcategory: "Wet Cat Food" },
  "Cat Food Dry": { animal: "cat", subcategory: "Dry Cat Food & Kibble" },
  "Cat Food Freeze Dried": { animal: "cat", subcategory: "Fresh, Frozen, & Freeze-Dried Cat Food" },
  "Cat Food Dehydrated": { animal: "cat", subcategory: "Fresh, Frozen, & Freeze-Dried Cat Food" },
  "Cat Treats Freeze Dried": { animal: "cat", subcategory: "Freeze-Dried Cat Treats" },
  "Cat Treats, Freeze Dried": { animal: "cat", subcategory: "Freeze-Dried Cat Treats" },
  "Cat Treats Soft and Chewy": { animal: "cat", subcategory: "Soft & Chewy Cat Treats" },
  "Cat Treats Soft & Chewy": { animal: "cat", subcategory: "Soft & Chewy Cat Treats" },
  "Cat Treats Crunchy": { animal: "cat", subcategory: "Crunchy Cat Treats" },
  "Cat Treats Catnip": { animal: "cat", subcategory: "Catnip & Cat Grass" },
  "Cat Treats Hard Chews": { animal: "cat", subcategory: "Cat Dental Treats & Chews" },
  "Cat Treats Dispenser": { animal: "cat", subcategory: "Interactive & Electronic Cat Toys" },
  "Cat Toys Plush": { animal: "cat", subcategory: "Mice & Plush Cat Toys" },
  "Cat Toy Plush": { animal: "cat", subcategory: "Mice & Plush Cat Toys" },
  "Cat Toys Catnip": { animal: "cat", subcategory: "Catnip Toys" },
  "Cat Toys Interactive": { animal: "cat", subcategory: "Interactive & Electronic Cat Toys" },
  "Cat Toy Interactive": { animal: "cat", subcategory: "Interactive & Electronic Cat Toys" },
  "Cat-Supply-Toys-Interactive": { animal: "cat", subcategory: "Interactive & Electronic Cat Toys" },
  "Cat Toys Teaser": { animal: "cat", subcategory: "Cat Teasers & Wands" },
  "Cat Toys Wand": { animal: "cat", subcategory: "Cat Teasers & Wands" },
  "Cat Toys Balls": { animal: "cat", subcategory: "Cat Ball & Chaser Toys" },
  "Cat Toy Ball": { animal: "cat", subcategory: "Cat Ball & Chaser Toys" },
  "Cat Toys Scratchers": { animal: "cat", subcategory: "Cat Scratching Posts & Cardboard" },
  "Cat Toys Seasonal": { animal: "cat", subcategory: "Kitten Toys" },
  "Cat Litter": { animal: "cat", subcategory: "Cat Litter" },
  "Cat Litter Pan": { animal: "cat", subcategory: "Cat Litter Boxes & Pans" },
  "Cat Litter Scoop": { animal: "cat", subcategory: "Cat Litter Scoops" },
  "Cat Litter Accessory": { animal: "cat", subcategory: "Cat Litter Box Liners, Filters & Refills" },
  "Cat Potty Poop Bags": { animal: "cat", subcategory: "Cat Cleaners & Waste Disposal" },
  "Cat Cleaning Stain & Odor Remover": { animal: "cat", subcategory: "Cat Cleaners & Waste Disposal" },
  "Cat Bowls & Feeders": { animal: "cat", subcategory: "Cat Bowls" },
  "Cat Grooming Tools": { animal: "cat", subcategory: "Cat Grooming & Bathing" },
  "Cat Grooming Shampoo & Conditioners": { animal: "cat", subcategory: "Cat Grooming & Bathing" },
  "Cat Grooming": { animal: "cat", subcategory: "Cat Grooming & Bathing" },
  "Cat Flea & Tick": { animal: "cat", subcategory: "Flea & Tick Solutions for Cats" },
  "Cat Beds": { animal: "cat", subcategory: "Bolster Cat Beds" },
  "Cat Collars & Lead": { animal: "cat", subcategory: "Cat Collars, Leashes & Harnesses" },
  "Cat Training": { animal: "cat", subcategory: "Cat Training & Behavior" },
  "Cat Supplements Dental": { animal: "cat", subcategory: "Cat Dental Care" },
  "Cat Supplements Calming": { animal: "cat", subcategory: "Cat Anxiety & Calming Aids" },
  "Cat Supplements Vitamins": { animal: "cat", subcategory: "Cat Multivitamins" },
  "Cat Supplements Digest": { animal: "cat", subcategory: "Probiotics for Cats" },
  "Cat Supplements Hairball": { animal: "cat", subcategory: "Cat Hairball Control" },
  "Cat Supplements Urinary": { animal: "cat", subcategory: "Cat Urinary Care" },
  "Cat Supplements Kitten": { animal: "cat", subcategory: "Cat Vitamins & Supplements" },
  "Cat Supplements Hip & Joint": { animal: "cat", subcategory: "Cat Joint Supplements" },
  "Cat Supplements CBD": { animal: "cat", subcategory: "Cat Anxiety & Calming Aids" },
  "Cat Supplements Ear & Eyes": { animal: "cat", subcategory: "Cat Ear & Eye Care" },
  "Cat Supplements Skin & Coat": { animal: "cat", subcategory: "Cat Skin and Coat Supplement" },
}

async function main() {
  const client = new pg.Client({ connectionString: DB_URL })
  await client.connect()
  console.log("Connected to Supabase")

  // Get or create the retail price list
  let priceListId: string
  const plRes = await client.query("SELECT id FROM public.commerce_price_lists WHERE tenant_id = $1 AND name = 'Retail' LIMIT 1", [TENANT])
  if (plRes.rows.length > 0) {
    priceListId = plRes.rows[0].id
  } else {
    const newPl = await client.query("INSERT INTO public.commerce_price_lists (tenant_id, name, currency, active) VALUES ($1, 'Retail', 'USD', true) RETURNING id", [TENANT])
    priceListId = newPl.rows[0].id
  }

  // Get or create the main warehouse
  let warehouseId: string
  const whRes = await client.query("SELECT id FROM public.erp_warehouses WHERE tenant_id = $1 LIMIT 1", [TENANT])
  if (whRes.rows.length > 0) {
    warehouseId = whRes.rows[0].id
  } else {
    const newWh = await client.query("INSERT INTO public.erp_warehouses (tenant_id, name, is_active) VALUES ($1, 'Main', true) RETURNING id", [TENANT])
    warehouseId = newWh.rows[0].id
  }

  const raw = readFileSync(FILE, "utf-8")
  const lines = raw.trim().split("\n")
  console.log(`Total lines: ${lines.length}`)

  let imported = 0, skipped = 0, errors = 0

  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    try {
      const p = JSON.parse(lines[i])
      const tags: string[] = p.tags || []
      const isDog = tags.some((t: string) => t.includes("All Dog"))
      const isCat = tags.some((t: string) => t.includes("All Cat"))
      if (!isDog && !isCat) { skipped++; continue }
      if (tags.some((t: string) => t.toLowerCase() === "discontinued")) { skipped++; continue }

      const mapping = PRODUCT_TYPE_MAP[p.product_type]
      if (!mapping) { skipped++; continue }

      await client.query("BEGIN")

      // 1. erp_products
      const slug = p.handle
      const epRes = await client.query(`
        INSERT INTO public.erp_products (tenant_id, name, description, brand, product_type, is_inventory_item, is_sellable, is_purchasable, is_active, default_unit_price, metadata)
        VALUES ($1, $2, $3, $4, 'physical', true, true, true, true, $5, $6)
        RETURNING id
      `, [
        TENANT, p.title, p.description_html || null, p.vendor || null, p.price,
        JSON.stringify({ slug, category: mapping.subcategory, badge: tags.find((t: string) => t === "Best Seller") ? "bestseller" : tags.find((t: string) => t.startsWith("New")) ? "new" : null, featured: tags.some((t: string) => t === "Best Seller"), sort_order: 99 })
      ])
      const productId = epRes.rows[0].id

      // 2. erp_product_skus
      const skuCode = (slug.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20) || "SKU") + "-" + Math.random().toString(36).slice(2, 6).toUpperCase()
      const skRes = await client.query(`
        INSERT INTO public.erp_product_skus (tenant_id, product_id, sku, uom, unit_price, is_active)
        VALUES ($1, $2, $3, 'EA', $4, true)
        RETURNING id, sku
      `, [TENANT, productId, skuCode, p.price])
      const skuId = skRes.rows[0].id
      const sku = skRes.rows[0].sku

      // 3. commerce_catalog_items
      const ciRes = await client.query(`
        INSERT INTO public.commerce_catalog_items (tenant_id, sku_id, item_type, sku, name, description, short_description, brand, taxable, active, ecommerce_enabled, purchasable, sellable, metadata)
        VALUES ($1, $2, 'product', $3, $4, $5, $6, $7, true, true, true, true, true, $8)
        RETURNING id
      `, [TENANT, skuId, sku, p.title, p.description_html || null, null, p.vendor || null, JSON.stringify({ slug, product_id: productId, sort_order: 99 })])
      const catalogItemId = ciRes.rows[0].id

      // 4. commerce_prices
      await client.query(`
        INSERT INTO public.commerce_prices (tenant_id, price_list_id, catalog_item_id, price, compare_at_price, valid_from)
        VALUES ($1, $2, $3, $4, $5, now())
      `, [TENANT, priceListId, catalogItemId, p.price, p.compare_at_price ?? null])

      // 5. commerce_product_media
      if (Array.isArray(p.image_urls)) {
        for (let j = 0; j < p.image_urls.length; j++) {
          if (!p.image_urls[j]) continue
          await client.query(`
            INSERT INTO public.commerce_product_media (tenant_id, catalog_item_id, media_type, url, alt_text, sort_order, is_primary)
            VALUES ($1, $2, 'image', $3, $4, $5, $6)
          `, [TENANT, catalogItemId, p.image_urls[j], p.title, j, j === 0])
        }
      }

      // 6. erp_inventory_movements (opening stock)
      if (p.available) {
        await client.query(`
          INSERT INTO public.erp_inventory_movements (tenant_id, movement_type, sku_id, warehouse_id, quantity, unit_cost, source_type, source_id, reason, occurred_at)
          VALUES ($1, 'opening', $2, $3, $4, 0, 'admin', $5, 'Opening stock on import', now())
        `, [TENANT, skuId, warehouseId, 10, catalogItemId])
      }

      await client.query("COMMIT")
      imported++

      if (imported % 100 === 0) {
        console.log(`Progress: ${imported} imported, ${skipped} skipped, ${errors} errors, ${i + 1}/${lines.length} processed`)
      }
    } catch (err: any) {
      try { await client.query("ROLLBACK") } catch {}
      errors++
      if (errors <= 10) console.error(`Error on line ${i + 1}:`, err.message)
    }
  }

  console.log(`\n=== IMPORT COMPLETE ===`)
  console.log(`Imported: ${imported}`)
  console.log(`Skipped:  ${skipped}`)
  console.log(`Errors:   ${errors}`)
  await client.end()
}

main().catch(console.error)
