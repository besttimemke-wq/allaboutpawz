import { repo } from "@/lib/repo"
async function main() {
  const b = await repo.get("bookings", "b0adee99-796c-4b38-b8ce-70a71badc87c").catch(() => null)
  console.log(JSON.stringify({ status: b?.status, pay: b?.paymentStatus, abandonedAt: b?.abandonedAt, createdAt: b?.createdAt, email: b?.email, dog: b?.dogName }, null, 1))
  process.exit(0)
}
main()
