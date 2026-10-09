// Verify every link the storefront nav ACTUALLY renders — /api/shop/nav is
// what the flyout/mega menu consume, so its dept + subcategory paths are the
// real UI contract. Run: bun scripts/verify-nav-links.ts
const base = process.env.DEV_BASE || "http://localhost:3000"

const res = await fetch(base + "/api/shop/nav")
const data = await res.json()
const paths: string[] = []
for (const a of data.animals ?? []) {
  paths.push(`/shop/${a.slug}`)
  for (const d of a.departments ?? []) {
    paths.push(d.path)
    for (const s of d.subcategories ?? []) paths.push(s.path)
  }
}

let ok = 0
const broken: string[] = []
for (const p of [...new Set(paths)]) {
  const r = await fetch(base + p, { redirect: "manual" })
  if (r.status === 200 || r.status === 301 || r.status === 308) ok++
  else broken.push(`${r.status} ${p}`)
}

console.log(`nav-rendered links: ${ok}/${ok + broken.length} resolve, BROKEN: ${broken.length}`)
for (const b of broken) console.log("  " + b)
if (broken.length > 0) process.exit(1)
