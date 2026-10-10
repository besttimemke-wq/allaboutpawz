// Category imagery selection — POST /api/shop/category-images/refresh
//
// Body:
//   { animal?: "fish" | ... }        — refresh one animal root (L2 + L3 subtree)
//   { animals?: string[] }           — several animals
//   { nodeIds?: string[] }           — specific nodes
//
// Only fills hero_image_url on unlocked nodes (additive, idempotent,
// respects admin locks). Typical cadence: after feed-sync, or on demand.

import { NextResponse } from "next/server"
import { refreshAnimalImagery, refreshCategoryImage, type RefreshResult } from "@/lib/shop/category-imagery"

export const dynamic = "force-dynamic"

const KNOWN_ANIMALS = ["fish", "bird", "reptile", "small-animal", "dog", "cat"]

export async function POST(req: Request) {
  let body: { animal?: string; animals?: string[]; nodeIds?: string[] } = {}
  try {
    body = await req.json()
  } catch {
    /* empty body allowed only when nodeIds provided via query-less noop */
  }

  const animals = [
    ...(body.animal ? [body.animal] : []),
    ...(body.animals ?? []),
  ].filter(a => KNOWN_ANIMALS.includes(a))

  const nodeIds = (body.nodeIds ?? []).filter(id => /^[0-9a-f-]{36}$/i.test(id))

  if (!animals.length && !nodeIds.length) {
    return NextResponse.json(
      { error: "Provide animal(s) or nodeIds", knownAnimals: KNOWN_ANIMALS },
      { status: 400 },
    )
  }

  const results: RefreshResult[] = []
  if (animals.length) {
    results.push(...(await refreshAnimalImagery(animals)))
  }
  for (const id of nodeIds) {
    results.push(await refreshCategoryImage(id))
  }

  const summary = {
    updated: results.filter(r => r.status === "updated").length,
    locked: results.filter(r => r.status === "locked").length,
    noCandidates: results.filter(r => r.status === "no-candidates").length,
    failed: results.filter(r => r.status === "failed" || r.status === "skipped").length,
    storage: results.filter(r => r.storedIn === "storage").length,
    sourceFallback: results.filter(r => r.storedIn === "source").length,
  }

  return NextResponse.json({ summary, results })
}
