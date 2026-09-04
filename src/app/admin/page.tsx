"use client"

import React, { useState, useEffect, useCallback } from "react"
import dynamic from "next/dynamic"
import { useSearchParams } from "next/navigation"
import {
  DawgNavSection,
  AppointmentItem,
  Customer,
  PetRecord,
  StaffScheduleItem,
  GroomingRecord,
  LocationItem,
  AuthUser,
  KPIMetric,
  FunnelStage,
  AlertNotification,
} from "@/lib/dawg-types"
import { Sidebar } from "@/components/dawg/Sidebar"
import { Header } from "@/components/dawg/Header"
import { createClient } from "@/lib/auth/client"
import Link from "next/link"

// ============================================================================
// LAZY IMPORTS — each view compiles on-demand only when the user navigates
// to that section. This prevents Turbopack from holding 20,000+ lines of
// component ASTs in memory simultaneously, which was causing OOM kills.
// ============================================================================
const DashboardView = dynamic(() => import("@/components/dawg/DashboardView").then(m => m.DashboardView), { ssr: false })
const AppointmentsView = dynamic(() => import("@/components/dawg/AppointmentsView").then(m => m.AppointmentsView), { ssr: false })
const CustomersView = dynamic(() => import("@/components/dawg/CustomersView").then(m => m.CustomersView), { ssr: false })
const PetsView = dynamic(() => import("@/components/dawg/PetsView").then(m => m.PetsView), { ssr: false })
const GroomingRecordsView = dynamic(() => import("@/components/dawg/GroomingRecordsView").then(m => m.GroomingRecordsView), { ssr: false })
const StaffView = dynamic(() => import("@/components/dawg/StaffView").then(m => m.StaffView), { ssr: false })
const ServicesView = dynamic(() => import("@/components/dawg/ServicesView").then(m => m.ServicesView), { ssr: false })
const InventoryView = dynamic(() => import("@/components/dawg/InventoryView").then(m => m.InventoryView), { ssr: false })
const SettingsView = dynamic(() => import("@/components/dawg/SettingsView").then(m => m.SettingsView), { ssr: false })
const QuickActionModals = dynamic(() => import("@/components/dawg/Modals/QuickActionModals").then(m => m.QuickActionModals), { ssr: false })
const FullCalendarView = dynamic(() => import("@/components/dawg/FullCalendarView").then(m => m.FullCalendarView), { ssr: false })
const GroomerPortalView = dynamic(() => import("@/components/dawg/GroomerPortalView").then(m => m.GroomerPortalView), { ssr: false })
const CustomerPortalView = dynamic(() => import("@/components/dawg/CustomerPortalView").then(m => m.CustomerPortalView), { ssr: false })
const LandingLoginView = dynamic(() => import("@/components/dawg/LandingLoginView").then(m => m.LandingLoginView), { ssr: false })

// ---- Real data fetching from Supabase via our API ----
async function fetchAPI<T>(endpoint: string): Promise<T[]> {
  try {
    const res = await fetch(`/api/cms/${endpoint}`)
    if (!res.ok) return []
    return await res.json()
  } catch { return [] }
}

export default function AdminPage() {
  const searchParams = useSearchParams()
  const forcePortal = searchParams.get("portal") // "groomer" or "customer"
  const supabase = createClient()

  const [activeSection, setActiveSection] = useState<DawgNavSection>("dashboard")
  const [mobileOpen, setMobileOpen] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }))
  const [selectedLocation, setSelectedLocation] = useState("All About Pawz – Main Location")

  // Auth state
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  // Real data from Supabase
  const [bookings, setBookings] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [dogs, setDogs] = useState<any[]>([])
  const [staff, setStaff] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Analytics state
  const [analytics, setAnalytics] = useState<any>(null)

  // Modal state
  const [activeModal, setActiveModal] = useState<'appointment' | 'customer' | 'pet' | 'intake' | 'payment' | 'invoice' | 'search' | null>(null)

  // Check auth on mount
  useEffect(() => {
    let alive = true
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!alive) return
      if (session?.user) {
        const role = (session.user.user_metadata?.role as string) || "admin"
        const firstName = session.user.user_metadata?.firstName || "Admin"
        const lastName = session.user.user_metadata?.lastName || "User"
        setCurrentUser({
          id: session.user.id,
          name: `${firstName} ${lastName}`,
          email: session.user.email || "",
          role: role as any,
          stationName: role === "groomer" ? "Station #1" : "Central Management",
        })
      }
      // If no session, currentUser stays null → LandingLoginView shows
      setAuthChecked(true)
    })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    let alive = true
    Promise.all([
      fetchAPI("bookings"),
      fetchAPI("customers"),
      fetchAPI("dogs"),
      fetchAPI("staff"),
      fetchAPI("payments"),
      fetchAPI("products"),
      fetchAPI("services"),
      fetch("/api/cms/stats").then(r => r.json()).catch(() => null),
      fetch("/api/analytics/revenue?period=week").then(r => r.json()).catch(() => null),
    ]).then(([bks, custs, dgs, stf, pays, prods, svcs, sts, anlyt]) => {
      if (!alive) return
      setBookings(bks)
      setCustomers(custs)
      setDogs(dgs)
      setStaff(stf)
      setPayments(pays)
      setProducts(prods)
      setServices(svcs)
      setStats(sts)
      setAnalytics(anlyt)
      setLoading(false)
    })
    return () => { alive = false }
  }, [])

  // Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        setActiveModal("search")
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  // Transform real bookings to AppointmentItem format
  const appointments: AppointmentItem[] = bookings.map((b: any) => ({
    id: b.id,
    date: b.date,
    time: b.time || "",
    customerName: b.ownerName,
    petName: b.dogName,
    breed: b.breed || "",
    petEmoji: "🐕",
    serviceName: b.service || "",
    staffName: staff.find(s => s.id === b.groomerId)?.name || "Unassigned",
    status: (b.status === "PAYMENT_PENDING" ? "Scheduled" :
             b.status === "CONFIRMED" ? "Confirmed" :
             b.status === "CHECKED_IN" ? "Checked In" :
             b.status === "IN_SERVICE" ? "In Progress" :
             b.status === "COMPLETED" ? "Completed" :
             b.status === "CANCELLED" ? "Cancelled" :
             b.status === "NO_SHOW" ? "No Show" : "Scheduled") as any,
    price: parseFloat(b.servicePrice?.replace(/[^0-9.]/g, "") || "0"),
    paymentStatus: b.paymentStatus === "PAID" ? "Paid in Full" :
                   b.paymentStatus === "DEPOSIT_PAID" ? "Deposit Paid" : "Unpaid",
  }))

  // Transform real customers
  const dawgCustomers: Customer[] = customers.map((c: any) => ({
    id: c.id,
    name: `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Unknown",
    email: c.email || "",
    phone: c.phone || "",
    pets: dogs.filter(d => d.customerId === c.id).map(d => d.name),
    totalSpent: payments
      .filter(p => p.customerId === c.id && p.status === "paid")
      .reduce((s, p) => s + parseFloat(p.amount?.replace(/[^0-9.]/g, "") || "0"), 0),
    lastVisit: bookings
      .filter(b => b.customerId === c.id && b.status === "COMPLETED")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]?.date || "—",
  }))

  // Transform real dogs
  const dawgPets: PetRecord[] = dogs.map((d: any) => ({
    id: d.id,
    name: d.name || "Unknown",
    breed: d.breedName || "Unknown",
    age: d.birthDate ? `${Math.floor((Date.now() - new Date(d.birthDate).getTime()) / 31536000000)} yrs` : "—",
    weight: d.weightLbs ? `${d.weightLbs} lbs` : "—",
    ownerName: customers.find(c => c.id === d.customerId)?.firstName + " " + customers.find(c => c.id === d.customerId)?.lastName || "—",
    emoji: "🐕",
    vaccinationStatus: "Up to date" as const,
    specialNotes: d.markings || "",
  }))

  // Transform staff from analytics (real schedule slots)
  const dawgStaff: StaffScheduleItem[] = analytics?.staffSchedule?.map((s: any) => ({
    id: s.id,
    name: s.name,
    role: s.role as any,
    initials: s.initials,
    slots: s.slots as any,
    appointmentsCount: s.appointmentsCount,
    phone: s.phone,
    commissionRate: s.commissionRate,
  })) || staff.map((s: any) => ({
    id: s.id,
    name: s.name || "Staff",
    role: (s.role as any) || "Groomer",
    initials: (s.name || "S").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase(),
    slots: ["available", "available", "available", "available", "available", "available", "available", "available", "available", "available"] as any,
    appointmentsCount: bookings.filter(b => b.groomerId === s.id).length,
  }))

  // KPI metrics from real stats + analytics
  const revenueData = analytics?.revenue
  const kpiMetrics: KPIMetric[] = stats ? [
    {
      id: "kpi-1", label: "Today's Appointments",
      value: String(appointments.filter(a => a.date === new Date().toISOString().split("T")[0]).length || stats.counts?.bookings || 0),
      change: "—", period: "today", isPositive: true, iconName: "calendar", colorTheme: "purple",
    },
    {
      id: "kpi-2", label: "Revenue (7d)",
      value: revenueData ? `$${revenueData.current.toFixed(0)}` : "$0",
      change: revenueData?.change ? `${Math.abs(revenueData.change)}%` : "—",
      period: revenueData?.change && revenueData.change >= 0 ? "vs last week" : "vs last week",
      isPositive: revenueData ? revenueData.change >= 0 : true,
      iconName: "currency-dollar", colorTheme: "emerald",
    },
    {
      id: "kpi-3", label: "Customers",
      value: String(stats.counts?.customers || 0),
      change: "—", period: "total", isPositive: true, iconName: "user-plus", colorTheme: "blue",
    },
    {
      id: "kpi-4", label: "Pending Bookings",
      value: String(stats.pendingBookings || 0),
      change: "—", period: "needs attention", isPositive: false, iconName: "paw-print", colorTheme: "amber",
    },
    {
      id: "kpi-5", label: "Unread Messages",
      value: String(stats.unreadMessages || 0),
      change: "—", period: "inbox", isPositive: false, iconName: "arrows-clockwise", colorTheme: "rose",
    },
  ] : []

  // Revenue chart data from analytics
  const revenueChartPoints = analytics?.revenue?.daily?.map((d: any) => ({
    day: d.label,
    amount: `$${d.total.toFixed(0)}`,
  })) || []

  // Booking funnel from analytics
  const bookingFunnel: FunnelStage[] = analytics?.funnel || [
    { stage: "Requests", count: bookings.length, subtext: "Total bookings", bgClass: "bg-indigo-50", textClass: "text-indigo-700" },
    { stage: "Confirmed", count: bookings.filter(b => b.status === "CONFIRMED").length, subtext: "Deposit paid", bgClass: "bg-emerald-50", textClass: "text-emerald-700" },
    { stage: "Completed", count: bookings.filter(b => b.status === "COMPLETED").length, subtext: "Service done", bgClass: "bg-zinc-100", textClass: "text-zinc-700" },
  ]

  // Grooming records from analytics
  const groomingRecords: GroomingRecord[] = analytics?.groomingRecords || bookings
    .filter((b: any) => b.status === "COMPLETED")
    .map((b: any) => ({
      id: b.id,
      petName: b.dogName,
      breed: b.breed || "",
      petEmoji: "🐕",
      date: b.date,
      serviceName: b.service,
      groomer: staff.find(s => s.id === b.groomerId)?.name || "—",
      amount: parseFloat(b.servicePrice?.replace(/[^0-9.]/g, "") || "0"),
      status: (b.paymentStatus === "PAID" ? "Paid" : "Unpaid") as const,
    }))

  // Alerts from real data
  const alerts: AlertNotification[] = [
    ...(stats?.pendingBookings > 0 ? [{
      id: "alert-1", title: "Pending Bookings", description: `${stats.pendingBookings} booking(s) awaiting payment`, count: stats.pendingBookings,
      type: "document" as const, iconName: "file-text" as const, bgIconColor: "bg-amber-100", badgeBg: "bg-amber-500", badgeText: "text-white",
    }] : []),
    ...(stats?.unreadMessages > 0 ? [{
      id: "alert-2", title: "Unread Messages", description: `${stats.unreadMessages} unread message(s)`, count: stats.unreadMessages,
      type: "document" as const, iconName: "file-text" as const, bgIconColor: "bg-rose-100", badgeBg: "bg-rose-500", badgeText: "text-white",
    }] : []),
  ]

  const locations: LocationItem[] = [
    { id: "loc-1", name: "All About Pawz – Main Location", type: "Main Location", address: "1428 Maple Grove Avenue", cityStateZip: "Riverbend, IL 60614", phone: "(312) 555-0142", email: "hello@allaboutpawz.com", manager: "Lead Groomer", status: "Active", stationCount: 4, operatingHours: "Tue-Sat 9-6, Sun 10-4", isDefault: true }
  ]

  // Handlers
  const handleToggleAppointmentStatus = (id: string) => {
    setBookings(prev => prev.map(b => {
      if (b.id === id) {
        const nextStatus = b.status === "CHECKED_IN" ? "COMPLETED" : b.status === "CONFIRMED" ? "CHECKED_IN" : b.status
        // Update via API
        fetch(`/api/cms/bookings/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: nextStatus }) })
        return { ...b, status: nextStatus }
      }
      return b
    }))
  }

  const handleAddAppointment = (newAppt: Partial<AppointmentItem>) => {
    // In real implementation, this would POST to /api/bookings/checkout
    console.log("New appointment:", newAppt)
  }

  const handleAddCustomer = (newCust: Partial<Customer>) => {
    fetch("/api/customers", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: newCust.name?.split(" ")[0] || "",
        lastName: newCust.name?.split(" ").slice(1).join(" ") || "",
        email: newCust.email, phone: newCust.phone,
      }),
    }).then(() => fetchAPI("customers").then(setCustomers))
  }

  const handleAddPet = (newPet: Partial<PetRecord>) => {
    // Would need a customer context — for now just log
    console.log("New pet:", newPet)
  }

  if (!authChecked) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#fafbfc]">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
      </div>
    )
  }

  // Not logged in → show LandingLoginView (the auth page you built)
  if (!currentUser) {
    return (
      <LandingLoginView
        onLogin={(user, initialSection) => {
          setCurrentUser(user)
          if (initialSection) setActiveSection(initialSection as DawgNavSection)
        }}
      />
    )
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#fafbfc]">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
          <p className="mt-3 text-sm text-slate-400">Loading All About Pawz OS…</p>
        </div>
      </div>
    )
  }

  // Role-based portal routing
  const effectiveRole = forcePortal === "groomer" ? "groomer" : forcePortal === "customer" ? "customer" : currentUser?.role

  // Groomer Portal
  if (effectiveRole === "groomer" && currentUser) {
    return (
      <GroomerPortalView
        currentUser={currentUser}
        onSwitchToAdmin={() => {
          setCurrentUser({ ...currentUser, role: "admin" })
          window.history.replaceState({}, "", "/admin")
        }}
        onSignOut={() => { supabase.auth.signOut(); setCurrentUser(null) }}
      />
    )
  }

  // Customer Portal
  if (effectiveRole === "customer" && currentUser) {
    return (
      <CustomerPortalView
        currentUser={currentUser}
        onSwitchToAdmin={() => {
          setCurrentUser({ ...currentUser, role: "admin" })
          window.history.replaceState({}, "", "/admin")
        }}
        onSwitchToGroomer={() => {
          setCurrentUser({ ...currentUser, role: "groomer" })
          window.history.replaceState({}, "", "/admin?portal=groomer")
        }}
        onSignOut={() => { supabase.auth.signOut(); setCurrentUser(null) }}
      />
    )
  }

  // Admin OS Shell

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#fafbfc] text-slate-800 antialiased font-sans">
      {/* Sidebar */}
      <Sidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        selectedLocation={selectedLocation}
        onSelectLocation={setSelectedLocation}
        locationsList={locations}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#fafbfc]">
        <Header
          onOpenMobileMenu={() => setMobileOpen(true)}
          onOpenSearch={() => setActiveModal("search")}
          currentDate={currentDate}
          onChangeDate={setCurrentDate}
          onNavigateSection={setActiveSection}
          currentUser={currentUser}
        />

        <div className="flex-1 overflow-y-auto">
          {activeSection === "dashboard" && (
            <DashboardView
              metrics={kpiMetrics}
              appointments={appointments}
              staffSchedules={dawgStaff}
              bookingFunnel={bookingFunnel}
              groomingRecords={groomingRecords}
              alerts={alerts}
              onNavigateSection={setActiveSection}
              onOpenQuickAction={(action) => setActiveModal(action)}
              onToggleAppointmentStatus={handleToggleAppointmentStatus}
            />
          )}

          {(activeSection === "appointments") && (
            <AppointmentsView
              appointments={appointments}
              onAddAppointment={() => setActiveModal("appointment")}
              onUpdateStatus={(id, status) => {
                setBookings(prev => prev.map(b => b.id === id ? { ...b, status: status.toUpperCase().replace(" ", "_") } : b))
                fetch(`/api/cms/bookings/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: status.toUpperCase().replace(" ", "_") }) })
              }}
            />
          )}

          {/* Calendar now lives inside Appointments view (kanban/timeline/calendar tabs) */}

          {activeSection === "customers" && (
            <CustomersView
              customers={dawgCustomers}
              onAddCustomer={() => setActiveModal("customer")}
              onOpenNewAppointment={() => setActiveModal("appointment")}
              onOpenAddPet={() => setActiveModal("pet")}
              onOpenTakePayment={() => setActiveModal("payment")}
              onOpenIntake={() => setActiveModal("intake")}
            />
          )}

          {activeSection === "pets" && (
            <PetsView pets={dawgPets} onAddPet={() => setActiveModal("pet")} />
          )}

          {activeSection === "grooming-records" && (
            <GroomingRecordsView records={groomingRecords} />
          )}

          {(activeSection === "staff" || activeSection === "schedule" || activeSection === "payroll") && (
            <StaffView staffList={dawgStaff} />
          )}

          {activeSection === "services" && <ServicesView />}

          {activeSection === "inventory" && <InventoryView />}

          {activeSection === "settings" && (
            <SettingsView
              locations={locations}
              selectedLocation={selectedLocation}
              onSelectLocation={setSelectedLocation}
              onAddLocation={() => {}}
              onDeleteLocation={() => {}}
              onNavigateSection={setActiveSection}
              onOpenQuickAction={(action) => setActiveModal(action)}
            />
          )}

          {/* Placeholder sections that link to existing pages */}
          {(activeSection === "payments" || activeSection === "invoices" || activeSection === "documents" || activeSection === "communications" || activeSection === "marketing" || activeSection === "reports") && (
            <div className="p-6  space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 capitalize">
                      {activeSection.replace("-", " ")} Module
                    </h2>
                    <p className="text-xs text-slate-500">
                      All About Pawz OS integrated business control center.
                    </p>
                  </div>
                  <Link href="/admin" className="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold cursor-pointer">
                    Return to Dashboard
                  </Link>
                </div>

                {activeSection === "payments" && payments.length > 0 && (
                  <div className="overflow-hidden rounded-xl border border-slate-100">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-xs text-slate-500">
                        <tr>
                          <th className="px-4 py-2 text-left">Date</th>
                          <th className="text-left">Amount</th>
                          <th className="text-left">Type</th>
                          <th className="text-right pr-4">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map(p => (
                          <tr key={p.id} className="border-t border-slate-50">
                            <td className="px-4 py-2">{new Date(p.createdAt).toLocaleDateString()}</td>
                            <td className="font-medium">{p.amount}</td>
                            <td>{p.type}</td>
                            <td className="pr-4 text-right">
                              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${p.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{p.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Quick Action Modals */}
      <QuickActionModals
        activeModal={activeModal}
        onClose={() => setActiveModal(null)}
        onSaveAppointment={handleAddAppointment}
        onSaveCustomer={handleAddCustomer}
        onSavePet={handleAddPet}
        onNavigateSection={setActiveSection}
      />
    </div>
  )
}
