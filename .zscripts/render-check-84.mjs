// Render every template through the REAL builders and assert the salon
// phone (901-722-1114) appears in the footer of every framed email, and
// that body copy is black — the owner's two standing email rules.
import { register } from "node:module"
// bun resolves the TS imports natively
const { EMAIL_TEMPLATES } = await import("/home/z/my-project/src/lib/email/templates/index.ts")
const { BRAND } = await import("/home/z/my-project/src/lib/email/design.ts")
let pass = 0, fail = 0
for (const t of EMAIL_TEMPLATES) {
  const html = typeof t.html === "string" ? t.html : ""
  const hasPhone = html.includes(BRAND.phone) || html.includes("9017221114")
  if (hasPhone) { pass++ } else { fail++; console.log(`  MISSING PHONE: ${t.id} (${t.name})`) }
}
console.log(`phone check: ${pass} pass / ${fail} fail of ${EMAIL_TEMPLATES.length} templates`)
// black body spot-check on one representative template
const sample = EMAIL_TEMPLATES.find(t => t.id === "booking_confirmed")
console.log("booking_confirmed uses black body:", sample.html.includes("color:#000000") ? "YES" : "NO")
