import { repo } from "@/lib/repo"
async function main() {
  const bookings = (await repo.list("bookings").catch(() => [])) as any[]
  bookings.forEach((b) => console.log(`${(b.email||'?').slice(0,32).padEnd(34)} ${String(b.status).padEnd(16)} ${String(b.dogName).slice(0,18).padEnd(20)} ${b.date} ${b.totalCents ?? '—'}c`))
  const customers = (await repo.list("customers").catch(() => [])) as any[]
  const test = customers.filter((c) => String(c.email||'').toLowerCase() === 'booking@aapawz.com')
  console.log("TEST CUSTOMERS REMAINING:", test.length)
  process.exit(0)
}
main()
