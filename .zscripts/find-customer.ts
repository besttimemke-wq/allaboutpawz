import { repo } from "@/lib/repo"
async function main() {
  const rows = (await repo.list("customers").catch(() => [])) as any[]
  const c = rows.find((r) => String(r.email || "").toLowerCase() === "booking@aapawz.com")
  console.log(c ? JSON.stringify({ id: c.id, email: c.email, userId: c.userId, status: c.customerStatus, name: `${c.firstName} ${c.lastName}` }) : "NOT FOUND")
  const dogs = (await repo.list("dogs").catch(() => [])) as any[]
  console.log("THEIR DOGS:", JSON.stringify(dogs.filter((d) => d.customerId === c?.id).map((d) => ({ id: d.id, name: d.name, breed: d.breedName, weightLbs: d.weightLbs }))))
  const bookings = (await repo.list("bookings").catch(() => [])) as any[]
  console.log("THEIR BOOKINGS:", JSON.stringify(bookings.filter((b) => String(b.email || "").toLowerCase() === "booking@aapawz.com").map((b) => ({ id: b.id.slice(0,8), status: b.status, pay: b.paymentStatus, date: b.date, dog: b.dogName, total: b.totalCents, paid: b.paidCents })), null, 1))
  process.exit(0)
}
main()
