import { NextResponse } from "next/server"
import fs from "node:fs"
import path from "node:path"
import { getTaxonomyTree, staticDeptKeyForLive } from "@/lib/shop/taxonomy-db"

// ---------------------------------------------------------------------------
// GET /api/shop/nav — the LIVE taxonomy tree shaped for the shop flyout and
// mega menu. Source of truth: taxonomy_nodes + product_nodes/products counts
// (via getTaxonomyTree). The static SHOP_NAV_TAXONOMY in shop-nav.ts is only
// an instant-paint fallback; this endpoint is what the nav actually renders.
//
// Response shape:
// {
//   animals: [{
//     slug, name, productCount, tagline,
//     departments: [{
//       slug, name, path, productCount, image,
//       subcategories: [{ slug, name, path, productCount, image }]
//     }]
//   }]
// }
//
// Image resolution happens server-side (no client 404 guessing):
//   • L2 department: /Shop/departments/<animal>-<dept>.jpeg|png, else
//     /Shop/categories/<animal>-<dept>.jpg, else the node's hero_image_url
//     (category-imagery selection function), else null (client paw tile)
//   • L3 subcategory: /Shop/categories/<animal>-<dept>-<sub>.jpg, else the
//     node's hero_image_url, else the department image
//
// Curated static assets always win for dog/cat (owner-designed imagery);
// hero_image_url only fills the gaps (reptile / small-animal / new nodes).
// ---------------------------------------------------------------------------

export const revalidate = 300

const ANIMAL_META: Record<string, { name: string; tagline: string }> = {
  dog: {
    name: "Dog Supplies",
    tagline: "Food, treats, gear, and grooming for every good dog",
  },
  cat: {
    name: "Cat Supplies",
    tagline: "Everything your cat needs — food, litter, trees, and toys",
  },
  fish: {
    name: "Fish & Aquatics",
    tagline: "Aquariums, filters, food, and water care for fishkeepers",
  },
  bird: {
    name: "Bird Supplies",
    tagline: "Cages, perches, seed, and enrichment for companion birds",
  },
  reptile: {
    name: "Reptile Supplies",
    tagline: "Habitat essentials, food, heat, and lighting for reptiles",
  },
  "small-animal": {
    name: "Small Animal Supplies",
    tagline: "Habitat, bedding, food, and enrichment for small pets",
  },
}

// Legacy slugs used by the static nav / old links → canonical DB slugs, so
// the image file-name lookup and paths line up with public/Shop/.
const IMAGE_SLUG: Record<string, string> = {
  "small-animal": "small-pet",
}

function scanShopImages(): Set<string> {
  const out = new Set<string>()
  for (const dir of ["categories", "departments"]) {
    try {
      const full = path.join(process.cwd(), "public", "Shop", dir)
      for (const f of fs.readdirSync(full)) out.add(f)
    } catch {
      // public/Shop missing in some deploy contexts — image fields go null
    }
  }
  return out
}

function pickImage(
  files: Set<string>,
  candidates: { dir: "categories" | "departments"; file: string }[],
): string | null {
  for (const c of candidates) {
    if (files.has(c.file)) return `/Shop/${c.dir}/${c.file}`
  }
  return null
}

export async function GET() {
  try {
    const tree = await getTaxonomyTree()
    const files = scanShopImages()

    const animals = tree.map((a) => {
      const meta = ANIMAL_META[a.slug]
      const imgAnimal = IMAGE_SLUG[a.slug] ?? a.slug
      const heroImage = pickImage(files, [
        { dir: "categories", file: `${imgAnimal}.jpg` },
      ])

      const departments = a.groups.map((g) => {
        const deptImage =
          pickImage(files, [
            { dir: "departments", file: `${imgAnimal}-${g.slug}.jpeg` },
            { dir: "departments", file: `${imgAnimal}-${g.slug}.png` },
            { dir: "categories", file: `${imgAnimal}-${g.slug}.jpg` },
          ]) ?? g.heroImageUrl ?? heroImage

        const subcategories = g.subcategories.map((s) => ({
          slug: s.slug,
          name: s.name,
          path: `/shop/${a.slug}/${g.slug}/${s.slug}`,
          productCount: s.productCount,
          image:
            pickImage(files, [
              { dir: "categories", file: `${imgAnimal}-${g.slug}-${s.slug}.jpg` },
            ]) ?? s.heroImageUrl ?? deptImage,
        }))

        return {
          slug: g.slug,
          name: g.name,
          path: `/shop/${a.slug}/${g.slug}`,
          // The static-nav key this live department answers to ("food" for
          // cat-cat-food, "treats-chews" for dog-treats) — client islands
          // join their static panels to these live links by this key.
          staticKey: staticDeptKeyForLive(a.slug, g.slug),
          productCount: g.productCount,
          image: deptImage,
          subcategories,
        }
      })

      return {
        slug: a.slug,
        name: meta?.name ?? a.name,
        tagline: meta?.tagline ?? "",
        productCount: a.productCount,
        departments,
      }
    })

    // Canonical animals first (dog, cat), then the rest by product count.
    animals.sort((x, y) => {
      const rank = (s: string) => (s === "dog" ? 0 : s === "cat" ? 1 : 2)
      const r = rank(x.slug) - rank(y.slug)
      return r !== 0 ? r : y.productCount - x.productCount
    })

    return NextResponse.json(
      { animals },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
    )
  } catch (err) {
    console.error("[api/shop/nav] failed to build nav tree:", err)
    return NextResponse.json(
      { animals: [], error: "nav tree unavailable" },
      { status: 503 },
    )
  }
}
