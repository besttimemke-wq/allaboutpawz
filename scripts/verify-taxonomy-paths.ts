// Verify every static nav path resolves against the LIVE taxonomy with the
// same alias/twin logic the server uses. Run: bun scripts/verify-taxonomy-paths.ts
import { SHOP_NAV_TAXONOMY, SHOP_ANIMALS } from "../src/lib/shop-nav"

const ANIMAL_ALIASES: Record<string, string> = { "small-pet": "small-animal", "fish-aquatics": "fish" }
const GROUP_ALIASES: Record<string, string> = {
  "grooming-bathing": "grooming", "treats-chews": "treats", "crates-containment": "travel-crates",
  "apparel-accessories": "clothes-accessories", "cleaning-potty-supplies": "cleanup-potty",
  "collars-harnesses-leashes": "collars-leashes-harnesses", "training-behavior-supplies": "training-behavior",
  "bowls-feeders": "bowls-feeding", "litter-litter-boxes-accessories": "litter",
  "flea-tick-solutions-for-cats": "flea-tick", "cleaners-waste-disposal": "cleanup-potty",
  "flea-tick-solutions-for-dogs": "flea-tick",
}
const ANIMAL_GROUP_ALIASES: Record<string, string> = {
  "dog/treats-chews": "dog-treats", "dog/bowls-feeding-supplies": "bowls-feeding",
  "dog/crates-gates-housing-accessories": "travel-crates", "dog/grooming-supplies": "grooming",
  "dog/training-behavior-supplies": "training-behavior", "dog/flea-tick-solutions": "flea-tick",
  "cat/treats": "cat-cat-treats", "cat/carriers-containment": "carriers-travel",
  "cat/grooming-bathing": "grooming", "cat/flea-tick-solutions": "flea-tick",
  "cat/bowls-feeders": "bowls-feeding",
  "dog/beds-bedding": "dog-beds", "cat/beds-bedding": "cat-beds", "dog/treats": "dog-treats",
}
const DEPT_TWINS: Record<string, string[]> = {
  "dog/food": ["dog-dog-food"], "dog/dog-dog-food": ["food"], "dog/toys": ["dog-dog-toys"],
  "dog/dog-dog-toys": ["toys"], "dog/grooming": ["dog-grooming-supplies"], "dog/dog-grooming-supplies": ["grooming"],
  "dog/health-wellness": ["dog-dog-health-wellness"], "dog/dog-dog-health-wellness": ["health-wellness"],
  "dog/beds-bedding": ["dog-beds"], "dog/dog-beds": ["beds-bedding"], "dog/bowls-feeding": ["dog-bowls-feeding"],
  "dog/dog-bowls-feeding": ["bowls-feeding"], "dog/cleanup-potty": ["dog-cleanup"], "dog/dog-cleanup": ["cleanup-potty"],
  "dog/collars-leashes-harnesses": ["collars-harnesses-leashes"], "dog/collars-harnesses-leashes": ["collars-leashes-harnesses"],
  "dog/travel-crates": ["crates-containment"], "dog/crates-containment": ["travel-crates"],
  "dog/training-behavior": ["dog-training-behavior-supplies"], "dog/dog-training-behavior-supplies": ["training-behavior"],
  "dog/flea-tick": ["dog-flea-tick-solutions-for-dogs"], "dog/dog-flea-tick-solutions-for-dogs": ["flea-tick"],
  "cat/food": ["cat-cat-food"], "cat/cat-cat-food": ["food"], "cat/toys": ["cat-cat-toys"],
  "cat/cat-cat-toys": ["toys"], "cat/grooming": ["cat-grooming-bathing"], "cat/cat-grooming-bathing": ["grooming"],
  "cat/health-wellness": ["cat-cat-health-wellness"], "cat/cat-cat-health-wellness": ["health-wellness"],
  "cat/beds-bedding": ["cat-beds"], "cat/cat-beds": ["beds-bedding"], "cat/bowls-feeding": ["bowls-feeders"],
  "cat/bowls-feeders": ["bowls-feeding"], "cat/litter": ["cat-litter"], "cat/cat-litter": ["litter"],
  "cat/cleanup-potty": ["cat-cleaners-waste-disposal"], "cat/cat-cleaners-waste-disposal": ["cleanup-potty"],
  "cat/collars-leashes-harnesses": ["cat-collars-leashes-harnesses"], "cat/cat-collars-leashes-harnesses": ["collars-leashes-harnesses"],
  "cat/furniture-scratchers": ["cat-cat-furniture-scratchers"], "cat/cat-cat-furniture-scratchers": ["furniture-scratchers"],
  "cat/training-behavior": ["cat-training-behavior"], "cat/cat-training-behavior": ["training-behavior"],
  "cat/flea-tick": ["flea-tick-solutions-for-cats"], "cat/flea-tick-solutions-for-cats": ["flea-tick"],
}

const base = process.env.DEV_BASE || "http://localhost:3000"

async function head(path: string): Promise<number> {
  const res = await fetch(base + path, { redirect: "manual" })
  // 200 = resolves; 301/307 = resolves + canonicalizes; 404 = BROKEN
  return res.status
}

let ok = 0
let broken: string[] = []
let redirectCount = 0

// All department paths (with 3-sample sub paths each)
const depts: { path: string; subs: { slug: string }[] }[] = []
for (const animal of SHOP_NAV_TAXONOMY) {
  depts.push({ path: `/shop/${animal.slug}`, subs: [] })
  for (const dept of animal.departments) {
    depts.push({ path: `/shop/${animal.slug}/${dept.slug}`, subs: dept.subcategories.slice(0, 3) })
  }
}

for (const d of depts) {
  const s = await head(d.path)
  if (s === 200 || s === 301 || s === 308) {
    if (s !== 200) redirectCount++
    ok++
  } else broken.push(`${s} ${d.path}`)
  for (const sub of d.subs) {
    const st = await head(`${d.path}/${sub.slug}`)
    if (st === 200 || st === 301 || st === 308) {
      if (st !== 200) redirectCount++
      ok++
    } else broken.push(`${st} ${d.path}/${sub.slug}`)
  }
}

console.log(`resolved OK: ${ok}, redirects: ${redirectCount}, BROKEN: ${broken.length}`)
for (const b of broken) console.log("  " + b)
if (broken.length > 0) process.exit(1)
