import { repo } from "@/lib/repo"
async function main() {
  const rows = (await repo.list("email_messages").catch(() => [])) as any[]
  const latest = rows.find((r: any) => r.template === "booking_request")
  const html = String(latest?.body || "")
  console.log("body length:", html.length)
  console.log("has ALL ABOUT PAWZ header:", html.includes("ALL ABOUT PAWZ"))
  console.log("has We got it:", html.includes("We got it"))
  console.log("has YOUR REQUEST card:", /your request/i.test(html))
  console.log("has Finish your booking note:", html.includes("Finish your booking"))
  console.log("has 901-800-7182 footer:", html.includes("901-800-7182"))
  console.log("has help@aapawz.com:", html.includes("help@aapawz.com"))
  console.log("has BOOK·SERVICES·SHOP·LEARN nav:", html.includes("BOOK") && html.includes("LEARN"))
  process.exit(0)
}
main()
