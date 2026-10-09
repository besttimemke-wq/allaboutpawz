// ---------------------------------------------------------------------------
// fetch-category-stock.mjs — stock-photo library for shop category tiles.
//
// Owner directive: the small-animal (and reptile) taxonomy pages repeat ONE
// Wikimedia photo for every slot. This builds a per-category stock library
// via `z-ai image-search`, screens candidates with VLM (z-ai vision) so
// collages / watermarked / AI-generated / off-topic photos never land in the
// shop, then resizes with sharp:
//   - card:  1200x900 (4:3)  — carousel cards, quick links, PLP fallback
//   - hero:  1600x900 (16:9) — TaxonomyHero + ShopPromoBanner wide slots
// Crops use sharp.strategy.attention so the subject stays in frame.
//
// Resumable: slots whose {key}.jpg already exists are skipped unless --force.
// Usage:
//   node scripts/fetch-category-stock.mjs                 # all missing slots
//   node scripts/fetch-category-stock.mjs --only k1,k2    # subset
//   node scripts/fetch-category-stock.mjs --force         # redo everything
// Report: scripts/category-stock-report.json
// ---------------------------------------------------------------------------

import { execFile } from "child_process"
import { promisify } from "util"
import sharp from "sharp"
import fs from "fs/promises"
import path from "path"

const pExec = promisify(execFile)
const OUT_DIR = path.resolve("public/Shop/categories")
const TMP_DIR = "/tmp/catimg"
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const REPORT = []

// --- Slots -----------------------------------------------------------------
const SLOTS = [
  // ---- small-animal department (live slugs small-animal/small-animal/*) ----
  { key: "small-animal-small-animal-accessories", query: "small pet wooden hideout and exercise wheel accessories for hamster cage", hero: true },
  { key: "small-animal-small-animal-bedding", query: "colorful paper bedding for hamster cage small pet", hero: true },
  { key: "small-animal-small-animal-dishes-waterers", query: "small animal water bottle attached to cage", hero: true },
  { key: "small-animal-small-animal-feeders-waterers", query: "hay feeder for rabbit small pet", hero: true },
  { key: "small-animal-small-animal-food", query: "brown rabbit eating dry pellets from ceramic bowl close up photo", hero: true },
  { key: "small-animal-small-animal-food-ferret", query: "ferret food kibble in bowl", hero: true },
  { key: "small-animal-small-animal-food-hamster", query: "hamster eating seed mix from food bowl", hero: true },
  { key: "small-animal-small-animal-food-hamster-gerbil", query: "gerbil eating seeds close up", hero: true },
  { key: "small-animal-small-animal-food-rabbit", query: "rabbit eating hay", hero: true },
  { key: "small-animal-small-animal-grooming", query: "brushing a rabbit grooming brush small pet", hero: true },
  { key: "small-animal-small-animal-habitats", query: "hamster cage habitat setup with wheel and accessories", hero: true },
  { key: "small-animal-small-animal-litter", query: "rabbit litter box small pet", hero: true },
  { key: "small-animal-small-animal-supplements", query: "rabbit and hamster vitamin supplement drops bottle small pet", hero: true },
  { key: "small-animal-small-animal-toys", query: "pet hamster playing with wooden chew toy", hero: true },
  { key: "small-animal-small-animal-treats", query: "guinea pig eating a treat close up", hero: true },
  { key: "small-animal-small-animal-treats-ferret", query: "ferret eating a treat snack", hero: true },
  { key: "small-animal-small-animal", query: "cute guinea pig and pet hamster together pet shop", hero: true },
  { key: "small-animal", query: "cute guinea pig portrait photo", hero: true },
  // ---- reptile department (live slugs reptile/reptile/*) ----
  { key: "reptile-reptile-bedding-substrates", query: "reptile terrarium coconut fiber substrate bedding", hero: true },
  { key: "reptile-reptile-cleaning", query: "cleaning a reptile terrarium glass tank", hero: true },
  { key: "reptile-reptile-decor", query: "reptile terrarium decoration plants branches cork bark", hero: true },
  { key: "reptile-reptile-dishes", query: "reptile water dish bowl inside terrarium", hero: true },
  { key: "reptile-reptile-filter-pumps", query: "terrarium waterfall fountain reptile enclosure", hero: true },
  { key: "reptile-reptile-food", query: "bearded dragon eating vegetables from bowl", hero: true },
  { key: "reptile-reptile-habitat-accessory", query: "basking platform rock for bearded dragon terrarium", hero: true },
  { key: "reptile-reptile-habitats", query: "bearded dragon terrarium tank setup glass", hero: true },
  { key: "reptile-reptile-heaters-gauges", query: "reptile heat lamp basking light on terrarium", hero: true },
  { key: "reptile-reptile-light-fixtures-bulbs", query: "UVB light bulb for reptile terrarium", hero: true },
  { key: "reptile-reptile-liners", query: "reptile carpet terrarium liner mat", hero: true },
  { key: "reptile-reptile-supplements", query: "reptile calcium supplement powder for bearded dragon", hero: true },
  { key: "reptile-reptile-treats", query: "bearded dragon eating mealworms treat", hero: true },
  { key: "reptile-reptile", query: "bearded dragon inside a terrarium wide photo", hero: true },
  { key: "reptile", query: "leopard gecko portrait photo", hero: true },
  // ---- fish species portrait (pre-existing Wikimedia file was a mountain landscape!) ----
  { key: "fish", query: "colorful tropical fish swimming in aquarium photo", hero: true },
]

// --- Search ------------------------------------------------------------------
async function searchSlot(slot, attempt = 1) {
  try {
    const { stdout } = await pExec(
      "z-ai",
      ["image-search", "-q", slot.query, "-c", "8", "--gl", "us", "--no-rank"],
      { timeout: 200_000, maxBuffer: 32 * 1024 * 1024 },
    )
    const start = stdout.indexOf("{")
    if (start < 0) throw new Error("no JSON in stdout")
    const json = JSON.parse(stdout.slice(start))
    if (!json.success) throw new Error(json.error || "search failed")
    return json.results
  } catch (e) {
    const is429 = /429|Too many/i.test(String(e.message))
    if (attempt < 5) {
      const waitMs = is429 ? attempt * attempt * 25_000 : 5_000
      console.log(`  ⏳ ${slot.key} search attempt ${attempt} failed, retry in ${Math.round(waitMs / 1000)}s`)
      await sleep(waitMs)
      return searchSlot(slot, attempt + 1)
    }
    throw e
  }
}

// --- Candidate pre-filter ------------------------------------------------------
function parsePx(v) {
  const n = Number(String(v ?? "").replace(/px/i, ""))
  return Number.isFinite(n) ? n : 0
}

function rankCandidates(results) {
  const scored = []
  for (const r of results ?? []) {
    const w = parsePx(r.original_width)
    const h = parsePx(r.original_height)
    if (!w || !h) continue
    if (Math.min(w, h) < 480) continue
    const ar = w / h
    let score = Math.min(Math.log2(Math.min(w, h) / 480), 3) * 10
    if (ar >= 1.0 && ar <= 2.1) score += 25
    else if (ar > 0.75 && ar < 1.0) score += 8
    else if (ar > 2.1 && ar <= 2.6) score += 5
    else continue
    scored.push({ url: r.original_url, w, h, score })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, 4)
}

async function download(url, dest) {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const type = res.headers.get("content-type") ?? ""
  if (!type.startsWith("image/")) throw new Error(`type ${type}`)
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 15_000) throw new Error(`too small ${buf.length}B`)
  await fs.writeFile(dest, buf)
  return buf
}

// --- VLM screening -------------------------------------------------------------
function parseVlmContent(content) {
  if (!content) return null
  const fence = content.indexOf("{")
  const end = content.lastIndexOf("}")
  if (fence < 0 || end <= fence) return null
  try {
    return JSON.parse(content.slice(fence, end + 1))
  } catch {
    return null
  }
}

async function vlmPick(slot, candidatePaths) {
  const prompt = [
    `A pet-supply shop needs ONE hero photo for the category "${slot.query}".`,
    `You are given ${candidatePaths.length} candidate images, numbered 1..${candidatePaths.length} in order.`,
    `Pick the single best image. It MUST be:`,
    `- a single photograph (NOT a collage/grid/multi-panel composite)`,
    `- free of watermarks, captions, logos or any overlaid text`,
    `- a real photo (reject obvious AI-generated images, 3D renders, illustrations, heavy filters)`,
    `- on-topic for the category, well-lit, sharp, professional enough for a shop website`,
    `Answer ONLY compact JSON: {"best": <number 1..${candidatePaths.length}>, "reasons": {"1": "ok|why rejected", ...}}`,
  ].join(" ")
  try {
    const args = ["vision", "-p", prompt]
    for (const p of candidatePaths) args.push("-i", p)
    const { stdout } = await pExec("z-ai", args, { timeout: 120_000, maxBuffer: 8 * 1024 * 1024 })
    const start = stdout.indexOf("{")
    if (start < 0) return null
    const json = JSON.parse(stdout.slice(start))
    return parseVlmContent(json.choices?.[0]?.message?.content)
  } catch (e) {
    console.log(`  ⚠ vlm ${slot.key}: ${String(e.message).slice(0, 80)}`)
    return null
  }
}

// --- Per-slot pipeline ----------------------------------------------------------
async function processSlot(slot, force = false) {
  const entry = { key: slot.key, query: slot.query, status: "ok" }
  const cardPath = path.join(OUT_DIR, `${slot.key}.jpg`)
  if (!force) {
    try {
      await fs.access(cardPath)
      entry.status = "skipped-existing"
      return entry
    } catch { /* needs fetching */ }
  }

  try {
    const results = await searchSlot(slot)
    const candidates = rankCandidates(results)
    if (!candidates.length) {
      entry.status = "no-candidates"
      console.log(`✗ ${slot.key}: no usable candidates`)
      return entry
    }

    // Download all candidates for VLM screening.
    const local = []
    for (let i = 0; i < candidates.length; i++) {
      const dest = path.join(TMP_DIR, `cand-${slot.key}-${i}.jpg`)
      try {
        await download(candidates[i].url, dest)
        local.push(dest)
      } catch (e) {
        entry.note = `${entry.note ?? ""}dl-fail(${i}:${e.message}) `
      }
    }
    if (!local.length) {
      entry.status = "download-failed"
      console.log(`✗ ${slot.key}: every candidate failed to download`)
      return entry
    }

    // VLM screening — pick the first clean, on-topic photo.
    let pickIdx = 0
    const verdict = await vlmPick(slot, local)
    if (verdict && Number.isInteger(verdict.best) && verdict.best >= 1 && verdict.best <= local.length) {
      pickIdx = verdict.best - 1
    } else if (verdict === null) {
      // VLM unavailable — fall back to the size-ranked favorite rather than failing.
      entry.note = `${entry.note ?? ""}vlm-unavailable `
    }
    entry.picked = { index: pickIdx, url: candidates[pickIdx]?.url, verdict: verdict ?? "vlm-unavailable" }
    await sleep(2_000) // breathe between vision calls

    const img = sharp(local[pickIdx])
    await fs.mkdir(OUT_DIR, { recursive: true })

    const cardBuf = await img
      .clone()
      .resize(1200, 900, { fit: "cover", position: sharp.strategy.attention })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer()
    await fs.writeFile(path.join(OUT_DIR, `${slot.key}.jpg`), cardBuf)
    entry.cardBytes = cardBuf.length

    const heroBuf = await img
      .clone()
      .resize(1600, 900, { fit: "cover", position: sharp.strategy.attention })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer()
    await fs.writeFile(path.join(OUT_DIR, `${slot.key}-hero.jpg`), heroBuf)
    entry.heroBytes = heroBuf.length

    console.log(`✓ ${slot.key} (pick ${pickIdx + 1}/${local.length}) card ${Math.round(cardBuf.length / 1024)}KB hero ${Math.round(heroBuf.length / 1024)}KB`)
    return entry
  } catch (e) {
    entry.status = `error: ${String(e.message).slice(0, 120)}`
    console.log(`✗ ${slot.key}: ${entry.status}`)
    return entry
  }
}

async function main() {
  const force = process.argv.includes("--force")
  const onlyIdx = process.argv.indexOf("--only")
  let slots = SLOTS
  if (onlyIdx >= 0 && process.argv[onlyIdx + 1]) {
    const keys = new Set(process.argv[onlyIdx + 1].split(","))
    slots = SLOTS.filter((s) => keys.has(s.key))
  }

  await fs.mkdir(TMP_DIR, { recursive: true })
  console.log(`Processing ${slots.length} slots (concurrency 2, spaced)…`)

  let cursor = 0
  async function worker() {
    while (cursor < slots.length) {
      const slot = slots[cursor++]
      const entry = await processSlot(slot, force)
      REPORT.push(entry)
      await sleep(6_000) // spacing — search + vision APIs both rate-limit
    }
  }
  await Promise.all(Array.from({ length: Math.min(2, slots.length) }, worker))

  await fs.writeFile("scripts/category-stock-report.json", JSON.stringify(REPORT, null, 2))
  const done = REPORT.filter((r) => r.status === "ok").length
  const skip = REPORT.filter((r) => r.status === "skipped-existing").length
  const bad = REPORT.filter((r) => !["ok", "skipped-existing"].includes(r.status))
  console.log(`\nDone: ${done} fetched, ${skip} skipped, ${bad.length} failed`)
  for (const f of bad) console.log(`  FAILED ${f.key}: ${f.status}`)
}

main().catch((e) => {
  console.error("fatal:", e)
  process.exit(1)
})
