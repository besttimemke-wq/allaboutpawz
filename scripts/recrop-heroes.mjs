// ---------------------------------------------------------------------------
// recrop-heroes.mjs — derive 16:9 hero crops for the fish/bird category tiles
// that already exist as 4:3 card files (Wikimedia imports). The taxonomy
// hero + promo banner wells are full-bleed ~2:1; blowing the 4:3 card crop
// into them is what made heroes look soft and over-cropped. This crops
// {key}.jpg → {key}-hero.jpg (1280x720, attention) for every CATEGORY_IMAGES
// entry + the fish/bird animal portraits, skipping files that already have a
// -hero sibling. Small-animal/reptile heroes come from the stock pipeline
// (fetch-category-stock.mjs) at 1600x900 straight off the original photos.
//
// Usage: node scripts/recrop-heroes.mjs
// ---------------------------------------------------------------------------

import sharp from "sharp"
import fs from "fs/promises"
import path from "path"

const DIR = path.resolve("public/Shop/categories")

// Same key inventory the taxonomy page maps reference.
const KEYS = [
  // fish/bird per-sub tiles
  ...["fish-aquatics-accessories", "fish-aquatics-aquarium-cleaning", "fish-aquatics-aquariums", "fish-aquatics-decor",
    "fish-aquatics-filters-pumps", "fish-aquatics-food", "fish-aquatics-heaters-gauges", "fish-aquatics-light-fixtures-bulbs",
    "fish-aquatics-supplements", "fish-aquatics-water-care", "bird-bird-cage", "bird-bird-cage-accessory", "bird-bird-food",
    "bird-bird-mineral-block", "bird-bird-perches", "bird-bird-supplements", "bird-bird-toys"],
  // department-level + animal-level portraits
  "fish-aquatics", "bird-bird", "fish", "bird",
]

async function main() {
  let made = 0
  let skipped = 0
  let missing = 0
  for (const key of KEYS) {
    const src = path.join(DIR, `${key}.jpg`)
    const dst = path.join(DIR, `${key}-hero.jpg`)
    try {
      await fs.access(dst)
      skipped++
      continue
    } catch { /* needs creating */ }
    try {
      await fs.access(src)
    } catch {
      console.log(`– ${key}.jpg missing, skipping`)
      missing++
      continue
    }
    await sharp(src)
      .resize(1280, 720, { fit: "cover", position: sharp.strategy.attention })
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(dst)
    made++
    console.log(`✓ ${key}-hero.jpg`)
  }
  console.log(`\nDone: ${made} created, ${skipped} already existed, ${missing} sources missing`)
}

main().catch((e) => {
  console.error("fatal:", e)
  process.exit(1)
})
