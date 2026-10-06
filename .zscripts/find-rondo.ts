import { repo } from "@/lib/repo"
async function main() {
  const rows = (await repo.list("bookings").catch(() => [])) as any[]
  const rondo = rows.filter((b) => b.dogName === "Rondo")
  rondo.forEach((b) => console.log(JSON.stringify({
    id: b.id, status: b.status, pay: b.paymentStatus, payMode: b.payMode, total: b.totalCents,
    paid: b.paidCents, date: b.date, time: b.time, service: b.service,
    items: (b.itemsJson || "").slice(0, 260), stripe: (b.stripeCheckoutSessionId || "").slice(0, 25),
    createdAt: b.createdAt,
  })))
  process.exit(0)
}
main()
