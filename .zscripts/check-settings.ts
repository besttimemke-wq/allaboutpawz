import { repo } from "@/lib/repo"

async function main() {
  try {
    const rows = (await repo.list("serviceItems").catch(() => [])) as any[]
    const settings = (await repo.list("customers").catch(() => [])) as any[]
    // cms settings via lib
    const { getCmsSettings } = await import("@/lib/cms-api").catch(() => ({ getCmsSettings: null }) as any)
    if (getCmsSettings) {
      const s = await getCmsSettings()
      console.log("TAX RATE:", s?.payments?.taxRatePercent ?? s?.payment_tax_rate_percent)
      console.log("SALON:", JSON.stringify({ address: s?.org?.address, city: s?.org?.city, state: s?.org?.state, zip: s?.org?.postalCode, phone: s?.org?.phone }))
    }
  } catch (e: any) { console.log("ERR", e.message) } finally { process.exit(0) }
}
main()
