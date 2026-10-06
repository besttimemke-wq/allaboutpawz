import { repo } from "@/lib/repo"
async function main() {
  const rows = (await repo.list("bookings").catch(() => [])) as any[]
  const mine = rows.filter((b) => String(b.email || "").toLowerCase() === "booking@aapawz.com")
    .sort((a, b) => String(b.createdAt).localeCompare(String(b.createdAt)))
  const latest = mine[mine.length - 1]
  console.log(JSON.stringify({
    id: latest?.id, status: latest?.status, paymentStatus: latest?.paymentStatus, payMode: latest?.payMode,
    total: latest?.totalCents, paid: latest?.paidCents, dog: latest?.dogName, service: latest?.service,
    date: latest?.date, time: latest?.time, items: latest?.itemsJson?.slice(0, 200),
    stripe: latest?.stripeCheckoutSessionId?.slice(0, 30),
  }, null, 1))
  const dogs = (await repo.list("dogs").catch(() => [])) as any[]
  const rondo = dogs.find((d) => d.name === "Rondo" && d.customerId)
  console.log("RONDO DOG:", JSON.stringify({ id: rondo?.id, breed: rondo?.breedName, weight: rondo?.weightLbs, customer: rondo?.customerId?.slice(0,8) }))
  process.exit(0)
}
main()
