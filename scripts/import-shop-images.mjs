// Imports reusable-license photos from Wikimedia Commons for shop categories.
// Usage: node scripts/import-shop-images.mjs [groupName ...]   (default: all groups)
// Output: public/Shop/categories/*.jpg, src/lib/shop/category-images.json, public/Shop/categories/credits.json
import fs from "node:fs/promises"
import path from "node:path"
import sharp from "sharp"

const ROOT = process.cwd()
const OUT_DIR = path.join(ROOT, "public/Shop/categories")
const MAP_FILE = path.join(ROOT, "src/lib/shop/category-images.json")
const CREDITS_FILE = path.join(OUT_DIR, "credits.json")
const UA = "AllAboutPawzCatalogImport/1.0 (https://allaboutpawz.com; besttimemke@gmail.com)"
const API = "https://commons.wikimedia.org/w/api.php"

// key = taxonomy path ("fish", "fish/aquatics/food"); value = ordered search queries
const GROUPS = {
  species: {
    fish: ["goldfish swimming aquarium", "betta fish", "tropical fish aquarium"],
    bird: ["budgerigar parakeet perched", "scarlet macaw", "cockatiel"],
    reptile: ["bearded dragon", "leopard gecko", "corn snake"],
    "small-pet": ["guinea pig", "dwarf hamster", "domestic rabbit portrait"],
  },
  fish: {
    "fish/aquatics/accessories": ["aquarium accessories", "aquarium net fish", "aquarium air stone"],
    "fish/aquatics/aquarium-cleaning": ["aquarium algae scraper cleaning", "cleaning aquarium glass", "aquarium gravel vacuum siphon"],
    "fish/aquatics/aquariums": ["freshwater aquarium planted tank", "home aquarium tank", "fish tank living room"],
    "fish/aquatics/aquariums-parts": ["aquarium hood lid light", "aquarium stand cabinet", "aquarium tank silicone glass"],
    "fish/aquatics/decor": ["aquarium decoration driftwood rocks", "aquarium ornament castle", "planted aquarium aquascape"],
    "fish/aquatics/filter-cartridges": ["aquarium filter media sponge", "aquarium filter cartridge", "filter wool aquarium"],
    "fish/aquatics/filters-pumps": ["aquarium canister filter", "aquarium power filter", "aquarium water pump"],
    "fish/aquatics/food": ["fish food flakes", "tropical fish flake food", "fish pellets feeding"],
    "fish/aquatics/heaters-gauges": ["aquarium heater", "aquarium thermometer", "aquarium submersible heater"],
    "fish/aquatics/light-fixtures-bulbs": ["aquarium LED lighting", "aquarium light fixture", "planted tank lighting"],
    "fish/aquatics/supplements": ["aquarium fish medication", "fish food supplement", "aquarium water conditioner bottle"],
    "fish/aquatics/water-care": ["aquarium water test kit", "aquarium water testing", "aquarium water conditioner"],
  },
  bird: {
    "bird/bird/cage": ["bird cage parrot", "birdcage budgerigar", "parakeet cage"],
    "bird/bird/cage-accessory": ["bird cage perch toys", "birdcage accessories", "bird feeder cage cup"],
    "bird/bird/food": ["parrot food seed mix", "birdseed mix pet bird", "budgerigar eating seeds"],
    "bird/bird/mineral-block": ["cuttlebone bird", "bird mineral block", "budgerigar cuttlebone"],
    "bird/bird/perches": ["bird perch natural branch", "parrot perch", "budgerigar on perch"],
    "bird/bird/supplements": ["parrot vitamins", "pet bird health", "parrot eating fruit"],
    "bird/bird/toys": ["parrot toys", "bird toy ladder bell", "cockatiel playing toy"],
    "bird/bird/treats": ["parrot eating treat millet", "budgerigar millet spray", "bird eating fruit"],
    "bird/bird/wild-bird-food": ["wild bird feeder seeds", "bird feeder garden", "bird feeding station"],
  },
  reptile: {
    "reptile/reptile/bedding-substrates": ["reptile substrate terrarium", "terrarium substrate coconut", "bearded dragon enclosure sand"],
    "reptile/reptile/cleaning": ["terrarium cleaning", "reptile enclosure cleaning", "terrarium maintenance"],
    "reptile/reptile/decor": ["terrarium decor rocks branches", "reptile terrarium decoration", "terrarium hide log"],
    "reptile/reptile/dishes": ["reptile water dish", "gecko food dish", "tortoise water bowl"],
    "reptile/reptile/filter-pumps": ["turtle aquarium filter", "aquatic turtle tank", "red-eared slider tank"],
    "reptile/reptile/food": ["crickets feeder insects", "mealworms", "bearded dragon eating insects"],
    "reptile/reptile/habitat-accessory": ["reptile terrarium accessories", "terrarium hide cave", "terrarium plants reptile"],
    "reptile/reptile/habitats": ["reptile terrarium", "vivarium reptile", "terrarium glass enclosure"],
    "reptile/reptile/heaters-gauges": ["reptile heat lamp", "terrarium thermometer", "basking lamp reptile"],
    "reptile/reptile/light-fixtures-bulbs": ["reptile UV light", "terrarium lighting", "basking lamp bearded dragon"],
    "reptile/reptile/liners": ["reptile carpet terrarium", "terrarium liner mat", "snake enclosure paper substrate"],
    "reptile/reptile/supplements": ["reptile calcium supplement", "gecko eating insect dusted", "bearded dragon health"],
    "reptile/reptile/treats": ["bearded dragon eating fruit", "tortoise eating vegetables", "gecko eating fruit"],
  },
  "small-pet": {
    "small-pet/small-animal/accessories": ["guinea pig accessories", "hamster tunnel", "rabbit hutch accessories"],
    "small-pet/small-animal/bedding": ["small animal bedding wood shavings", "hamster bedding", "guinea pig hay bedding"],
    "small-pet/small-animal/dishes-waterers": ["hamster water bottle", "guinea pig water bottle", "rabbit food bowl"],
    "small-pet/small-animal/feeders-waterers": ["rabbit water bottle", "hay feeder rabbit", "small animal water bottle cage"],
    "small-pet/small-animal/food": ["guinea pig eating", "rabbit pellets food", "hamster eating seeds"],
    "small-pet/small-animal/food-ferret": ["ferret eating", "domestic ferret", "pet ferret portrait"],
    "small-pet/small-animal/food-hamster": ["hamster eating", "syrian hamster", "hamster food"],
    "small-pet/small-animal/food-hamster-gerbil": ["gerbil eating", "mongolian gerbil", "gerbil seeds"],
    "small-pet/small-animal/food-rabbit": ["rabbit eating hay", "rabbit eating carrot", "pet rabbit hay"],
    "small-pet/small-animal/grooming": ["guinea pig grooming brush", "rabbit grooming", "long haired guinea pig"],
    "small-pet/small-animal/habitats": ["hamster cage", "rabbit hutch", "guinea pig cage"],
    "small-pet/small-animal/litter": ["rabbit litter box", "guinea pig bedding litter", "small animal litter"],
    "small-pet/small-animal/supplements": ["guinea pig vegetables vitamin c", "rabbit health", "guinea pig bell pepper"],
    "small-pet/small-animal/toys": ["hamster wheel", "guinea pig toys tunnel", "rabbit playing toy"],
    "small-pet/small-animal/treats": ["rabbit eating treat", "guinea pig eating fruit", "hamster eating fruit"],
    "small-pet/small-animal/treats-ferret": ["ferret playing", "ferret portrait", "domestic ferret"],
  },
}

const LICENSE_OK = /^(cc0|public domain|pd|cc[ -]by(-sa)?[ -]?\d|cc[ -]by(-sa)?$)/i
const NAME_BAD = /diagram|map|logo|drawing|illustration|stamp|coin|skeleton|dead|fossil|museum|painting|engraving|poster|cartoon|icon|screenshot|chart|schematic|\bsvg\b|crop|collage|montage|poster|ad\b|advert|catalog|label|package|lego|toy_|figurine|plush|medal/i

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const stripHtml = (s = "") => s.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim()

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: "json", ...params })}`
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } })
    if (res.status === 429) { await sleep(2500 * (attempt + 1)); continue }
    if (!res.ok) throw new Error(`API ${res.status}`)
    return res.json()
  }
  throw new Error("API rate limited")
}

async function search(query) {
  const data = await api({
    action: "query", generator: "search", gsrnamespace: "6",
    gsrsearch: `${query} filetype:bitmap`, gsrlimit: "25",
    prop: "imageinfo", iiprop: "url|size|mime|extmetadata", iiurlwidth: "1000",
    iiextmetadatafilter: "LicenseShortName|Artist|Credit|ObjectName",
  })
  const pages = Object.values(data?.query?.pages || {}).sort((a, b) => a.index - b.index)
  return pages.map((p) => {
    const info = p.imageinfo?.[0]
    if (!info) return null
    const meta = info.extmetadata || {}
    return {
      title: p.title,
      mime: info.mime, width: info.width, height: info.height,
      thumb: info.thumburl, page: info.descriptionurl,
      license: stripHtml(meta.LicenseShortName?.value),
      artist: stripHtml(meta.Artist?.value) || stripHtml(meta.Credit?.value),
    }
  }).filter(Boolean)
}

function acceptable(c, used) {
  if (c.mime !== "image/jpeg") return false
  if (c.width < 1100 || c.height < 750) return false
  if (c.width / c.height > 2.2 || c.width / c.height < 0.8) return false
  if (!LICENSE_OK.test(c.license || "")) return false
  if (NAME_BAD.test(c.title)) return false
  if (used.has(c.title)) return false
  return true
}

async function download(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } })
    if (res.status === 429) { await sleep(3000 * (attempt + 1)); continue }
    if (!res.ok) throw new Error(`download ${res.status}`)
    return Buffer.from(await res.arrayBuffer())
  }
  throw new Error("download rate limited")
}

const fileFor = (key) => key.replace(/\//g, "-") + ".jpg"

async function main() {
  const wanted = process.argv.slice(2)
  const groups = wanted.length ? wanted : Object.keys(GROUPS)
  await fs.mkdir(OUT_DIR, { recursive: true })
  const map = JSON.parse(await fs.readFile(MAP_FILE, "utf8").catch(() => "{}"))
  const credits = JSON.parse(await fs.readFile(CREDITS_FILE, "utf8").catch(() => "{}"))
  const used = new Set(Object.values(credits).map((c) => c.title))

  for (const group of groups) {
    for (const [key, queries] of Object.entries(GROUPS[group] || {})) {
      if (map[key] && process.env.FORCE !== "1") continue
      let picked = null
      for (const q of queries) {
        const results = await search(q)
        await sleep(350)
        picked = results.find((c) => acceptable(c, used))
        if (picked) { picked.query = q; break }
      }
      if (!picked) { console.log(`MISS  ${key}`); continue }
      const buf = await download(picked.thumb)
      await sharp(buf).resize(960, 720, { fit: "cover", position: "attention" }).jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(OUT_DIR, fileFor(key)))
      map[key] = `/Shop/categories/${fileFor(key)}`
      credits[key] = { title: picked.title, page: picked.page, license: picked.license, artist: picked.artist, query: picked.query }
      used.add(picked.title)
      console.log(`OK    ${key}  <- ${picked.title} [${picked.license}]`)
      await sleep(500)
    }
  }
  await fs.writeFile(MAP_FILE, JSON.stringify(map, null, 2) + "\n")
  await fs.writeFile(CREDITS_FILE, JSON.stringify(credits, null, 2) + "\n")
}

main().catch((e) => { console.error(e); process.exit(1) })
