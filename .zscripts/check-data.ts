import { repo } from "@/lib/repo"

async function main() {
  try {
    const [pkgs, breeds, bookings, svcItems] = await Promise.all([
      repo.list("packages").catch(e => ({ err: String(e.message || e) })),
      repo.list("dog_breeds").catch(e => ({ err: String(e.message || e) })),
      repo.list("bookings").catch(e => ({ err: String(e.message || e) })),
      repo.list("serviceItems").catch(e => ({ err: String(e.message || e) })),
    ])
    console.log("PACKAGES:", Array.isArray(pkgs) ? pkgs.length : pkgs)
    if (Array.isArray(pkgs) && pkgs.length) console.log(JSON.stringify(pkgs.slice(0, 3), null, 1))
    console.log("BREEDS:", Array.isArray(breeds) ? breeds.length : breeds)
    if (Array.isArray(breeds) && breeds.length) console.log(JSON.stringify(breeds.slice(0, 2)))
    console.log("BOOKINGS:", Array.isArray(bookings) ? bookings.length : bookings)
    if (Array.isArray(bookings) && bookings.length) console.log(JSON.stringify(bookings.slice(0, 2), null, 1))
    console.log("SERVICE_ITEMS:", Array.isArray(svcItems) ? svcItems.length : svcItems)
    if (Array.isArray(svcItems) && svcItems.length) console.log(JSON.stringify(svcItems.slice(0, 3), null, 1))
  } finally { process.exit(0) }
}
main()
