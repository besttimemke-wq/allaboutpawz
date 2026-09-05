import { NextRequest, NextResponse } from "next/server"
import { repo } from "@/lib/repo"

// GET /api/analytics/revenue?period=week|month|quarter
// Returns daily revenue data for the dashboard chart.
// Calculates from actual payments in Supabase.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const period = searchParams.get("period") || "week"

  const days = period === "week" ? 7 : period === "month" ? 30 : 90
  const now = new Date()
  const startDate = new Date(now)
  startDate.setDate(startDate.getDate() - days)

  // Fetch all payments
  const allPayments = (await repo.list("payments")) as any[]
  const allBookings = (await repo.list("bookings")) as any[]

  // Filter to paid payments within the date range
  const paidPayments = allPayments.filter(p => {
    if (p.status !== "paid" && p.status !== "succeeded") return false
    const date = new Date(p.createdAt)
    return date >= startDate && date <= now
  })

  // Group by day
  const dailyRevenue: { date: string; label: string; total: number; count: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(now)
    day.setDate(day.getDate() - i)
    const dayStr = day.toISOString().split("T")[0]
    const dayLabel = day.toLocaleDateString("en-US", { weekday: "short" })

    const dayPayments = paidPayments.filter(p => {
      const pDate = new Date(p.createdAt)
      return pDate.toISOString().split("T")[0] === dayStr
    })

    const total = dayPayments.reduce((sum, p) => sum + parseFloat(p.amount?.replace(/[^0-9.]/g, "") || "0"), 0)

    dailyRevenue.push({
      date: dayStr,
      label: period === "week" ? dayLabel : day.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      total: parseFloat(total.toFixed(2)),
      count: dayPayments.length,
    })
  }

  // Calculate totals and comparison
  const currentTotal = dailyRevenue.reduce((sum, d) => sum + d.total, 0)
  const currentCount = dailyRevenue.reduce((sum, d) => sum + d.count, 0)

  // Previous period for comparison
  const prevStart = new Date(startDate)
  prevStart.setDate(prevStart.getDate() - days)
  const prevPayments = allPayments.filter(p => {
    if (p.status !== "paid" && p.status !== "succeeded") return false
    const date = new Date(p.createdAt)
    return date >= prevStart && date < startDate
  })
  const prevTotal = prevPayments.reduce((sum, p) => sum + parseFloat(p.amount?.replace(/[^0-9.]/g, "") || "0"), 0)
  const prevCount = prevPayments.length

  const revenueChange = prevTotal > 0 ? Math.round(((currentTotal - prevTotal) / prevTotal) * 100) : 0
  const countChange = prevCount > 0 ? Math.round(((currentCount - prevCount) / prevCount) * 100) : 0

  // Staff schedule (real)
  const allStaff = (await repo.list("staff")) as any[]
  const staffSchedule = allStaff.filter(s => s.active !== false).map(s => {
    const staffBookings = allBookings.filter(b => b.groomerId === s.id && b.status !== "CANCELLED")
    // Generate time slots 9am-6pm
    const slots: string[] = []
    for (let h = 9; h <= 18; h++) {
      const hasBooking = staffBookings.some(b => {
        if (!b.time) return false
        const bookingHour = parseInt(b.time.match(/(\d+)/)?.[1] || "0")
        const isPM = /PM/i.test(b.time)
        const hour = isPM && bookingHour !== 12 ? bookingHour + 12 : bookingHour === 12 && !isPM ? 0 : bookingHour
        return hour === h
      })
      slots.push(hasBooking ? "booked" : "available")
    }
    return {
      id: s.id,
      name: s.name,
      role: s.role || "Groomer",
      initials: (s.name || "S").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase(),
      slots,
      appointmentsCount: staffBookings.length,
      phone: s.phone || undefined,
      commissionRate: s.commissionRate,
    }
  })

  // Booking funnel (real)
  const funnel = [
    {
      stage: "Requests",
      count: allBookings.length,
      subtext: "Total bookings",
      conversionPercent: "100%",
      bgClass: "bg-indigo-50",
      textClass: "text-indigo-700",
    },
    {
      stage: "Confirmed",
      count: allBookings.filter(b => b.status === "CONFIRMED").length,
      subtext: "Deposit paid",
      conversionPercent: allBookings.length > 0 ? `${Math.round((allBookings.filter(b => b.status === "CONFIRMED").length / allBookings.length) * 100)}%` : "0%",
      bgClass: "bg-emerald-50",
      textClass: "text-emerald-700",
    },
    {
      stage: "Completed",
      count: allBookings.filter(b => b.status === "COMPLETED").length,
      subtext: "Service done",
      conversionPercent: allBookings.length > 0 ? `${Math.round((allBookings.filter(b => b.status === "COMPLETED").length / allBookings.length) * 100)}%` : "0%",
      bgClass: "bg-zinc-100",
      textClass: "text-zinc-700",
    },
  ]

  // Grooming records with details (real)
  const groomingRecords = allBookings
    .filter(b => b.status === "COMPLETED")
    .slice(0, 10)
    .map(b => ({
      id: b.id,
      petName: b.dogName,
      breed: b.breed || "",
      petEmoji: "🐕",
      date: b.date,
      serviceName: b.service,
      groomer: allStaff.find(s => s.id === b.groomerId)?.name || "—",
      amount: parseFloat(b.servicePrice?.replace(/[^0-9.]/g, "") || "0"),
      status: b.paymentStatus === "PAID" ? "Paid" : "Unpaid",
    }))

  return NextResponse.json({
    revenue: {
      current: currentTotal,
      previous: prevTotal,
      change: revenueChange,
      daily: dailyRevenue,
      paymentCount: currentCount,
      countChange,
    },
    staffSchedule,
    funnel,
    groomingRecords,
  })
}
