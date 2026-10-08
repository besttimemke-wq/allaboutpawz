// Category imagery for the non-cat/dog species (fish, bird, reptile, small-pet),
// sourced from Wikimedia Commons via scripts/import-shop-images.mjs. The script
// writes both this mapping (src/lib/shop/category-images.json) and the JPGs at
// public/Shop/categories/*.jpg. Re-run the script (FORCE=1 to re-download) to
// refresh either side — this loader stays compatible as long as the JSON shape
// (taxonomy path -> public image URL) is preserved.
import raw from "./category-images.json"

const MAP = raw as Record<string, string>

/**
 * Resolve a taxonomy path ("fish", "fish/aquatics/food") to its category
 * image URL, walking up toward the species level when there is no exact
 * match ("fish/aquatics/x" -> "fish/aquatics" -> "fish").
 * Returns undefined for cat/dog paths (those use the generated department
 * imagery at /Shop/departments instead).
 */
export function categoryImage(taxonomyPath?: string | null): string | undefined {
  if (!taxonomyPath) return undefined
  const key = taxonomyPath.replace(/^\/+|\/+$/g, "")
  if (!key) return undefined
  if (MAP[key]) return MAP[key]
  const segments = key.split("/")
  while (segments.length > 0) {
    segments.pop()
    const candidate = segments.join("/")
    if (candidate && MAP[candidate]) return MAP[candidate]
  }
  return undefined
}
