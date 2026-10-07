"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Package, ShoppingCart, DollarSign, TrendingUp, Settings, MessageSquare, FileText, Megaphone, Bell } from "lucide-react"

// ---------------------------------------------------------------------------
// /seller — Seller Dashboard home (widget grid). Per spec §1.4:
// Gate: Approved seller + grid grant.
//
// Shows: account status, product count, order count, revenue, performance score,
// recent activity, and navigation to all seller tools.
// ---------------------------------------------------------------------------

type SellerData = {
  status: string
  displayName: string
  productCount: number
  orderCount: number
  revenue: string
  performanceScore: number
}

export default function SellerDashboard() {
  const [data, setData] = useState<SellerData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // TODO: fetch seller data from /api/seller/dashboard
    // For now, show placeholder data
    setData({
      status: "approved",
      displayName: "Your Seller Account",
      productCount: 0,
      orderCount: 0,
      revenue: "$0.00",
      performanceScore: 100,
    })
    setLoading(false)
  }, [])

  if (loading) return <div className="p-8 text-sm text-ink-soft">Loading...</div>

  const widgets = [
    { icon: Package, label: "Products", value: data?.productCount || 0, href: "/seller/products", color: "text-blue-600" },
    { icon: ShoppingCart, label: "Orders", value: data?.orderCount || 0, href: "/seller/orders", color: "text-green-600" },
    { icon: DollarSign, label: "Revenue", value: data?.revenue || "$0", href: "/seller/payments", color: "text-gold-deep" },
    { icon: TrendingUp, label: "Performance", value: data?.performanceScore || 0, href: "/seller/performance", color: "text-purple-600" },
  ]

  const tools = [
    { icon: Package, label: "Products", href: "/seller/products", desc: "Manage your product catalog" },
    { icon: ShoppingCart, label: "Orders", href: "/seller/orders", desc: "View and fulfill orders" },
    { icon: DollarSign, label: "Pricing", href: "/seller/pricing", desc: "Set pricing rules" },
    { icon: Megaphone, label: "Promotions", href: "/seller/promotions", desc: "Create coupons and deals" },
    { icon: FileText, label: "Reports", href: "/seller/reports", desc: "Download sales reports" },
    { icon: DollarSign, label: "Payments", href: "/seller/payments", desc: "View payouts and balance" },
    { icon: TrendingUp, label: "Performance", href: "/seller/performance", desc: "Account Health score" },
    { icon: MessageSquare, label: "Messages", href: "/seller/messages", desc: "Buyer messages" },
    { icon: Settings, label: "Settings", href: "/seller/settings", desc: "Business profile and tax" },
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Seller Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">{data?.displayName}</p>
          </div>
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
            {data?.status?.toUpperCase()}
          </span>
        </div>

        {/* Widget grid */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {widgets.map((w) => (
            <Link key={w.label} href={w.href} className="rounded-lg border border-gray-200 bg-white p-6 transition hover:shadow-md">
              <w.icon className={`h-6 w-6 ${w.color}`} />
              <p className="mt-3 text-2xl font-bold text-gray-900">{w.value}</p>
              <p className="text-sm text-gray-500">{w.label}</p>
            </Link>
          ))}
        </div>

        {/* Tools grid */}
        <h2 className="mb-4 text-lg font-bold text-gray-900">Seller Tools</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((t) => (
            <Link key={t.label} href={t.href} className="group rounded-lg border border-gray-200 bg-white p-5 transition hover:border-gray-300 hover:shadow-md">
              <div className="flex items-center gap-3">
                <t.icon className="h-5 w-5 text-gray-600 group-hover:text-gray-900" />
                <span className="font-semibold text-gray-900">{t.label}</span>
              </div>
              <p className="mt-2 text-sm text-gray-500">{t.desc}</p>
            </Link>
          ))}
        </div>

        {/* Onboarding link (always visible) */}
        <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-700">
            Need to update your seller profile?{" "}
            <Link href="/seller/onboarding" className="font-semibold underline">Go to onboarding</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
