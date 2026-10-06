import { readFileSync } from "node:fs"
const env = readFileSync("/home/z/my-project/.env", "utf8")
const url = env.match(/^SUPABASE_URL=(.+)$/m)[1].trim().replace(/^"|"$/g, "")
const key = env.match(/^SUPABASE_SERVICE_ROLE_KEY=(.+)$/m)[1].trim().replace(/^"|"$/g, "")
const H = { apikey: key, Authorization: `Bearer ${key}` }
const r = await fetch(`${url}/rest/v1/service_items?select=id,name,category,price,smallPrice,mediumPrice,largePrice,xlargePrice,isPackage,visible,order&order=order.asc`, { headers: H })
const rows = await r.json()
console.log("serviceItems:", rows.length)
for (const s of rows) console.log(`- [${s.category}] ${s.name} | price=${s.price} S=${s.smallPrice} M=${s.mediumPrice} L=${s.largePrice} XL=${s.xlargePrice} pkg=${s.isPackage} vis=${s.visible}`)
