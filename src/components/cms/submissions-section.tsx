"use client"

import { useCallback, useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  MagnifyingGlass, Trash, Tray, CalendarCheck, PhoneCall, ShoppingBag, ListChecks, Users, Plus,
} from "@phosphor-icons/react"
import { cms } from "@/lib/cms-api"

type Row = Record<string, any> & { id: string; status: string; createdAt: string }
type Column = { key: string; label: string; render?: (r: Row) => React.ReactNode }

export type SubmissionConfig = {
  resource: string
  title: string
  description: string
  icon: typeof Tray
  statuses: string[]
  columns: Column[]
  detailFields: { label: string; key: string; type?: "text" | "long" }[]
  detailLink?: (row: Row) => string  // if set, clicking a row navigates instead of opening the sheet
  createFields?: { label: string; key: string; type?: "text" | "tel" | "email" }[]  // if set, shows a "Create" button + dialog
  createApiPath?: string  // defaults to `/api/cms/${resource}` — e.g. `/api/customers` for Stripe linkage
}

const STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-zinc-100 text-zinc-500",
  PAYMENT_PENDING: "bg-amber-500 text-white",
  PAYMENT_FAILED: "bg-red-600 text-white",
  EXPIRED: "bg-zinc-200 text-zinc-500",
  PENDING: "bg-black text-white",
  CONFIRMED: "bg-zinc-800 text-white",
  CHECKED_IN: "bg-zinc-700 text-white",
  IN_SERVICE: "bg-zinc-700 text-white",
  COMPLETED: "bg-emerald-700 text-white",
  CANCELLED: "bg-zinc-100 text-zinc-500",
  NO_SHOW: "bg-zinc-100 text-zinc-500",
  RESCHEDULED: "bg-zinc-100 text-zinc-500",
  // consultations
  REQUESTED: "bg-black text-white",
  CONTACTED: "bg-zinc-800 text-white",
  SCHEDULED: "bg-zinc-700 text-white",
  CONVERTED: "bg-emerald-700 text-white",
  // orders
  CART: "bg-zinc-100 text-zinc-500",
  PAID: "bg-emerald-700 text-white",
  PROCESSING: "bg-zinc-700 text-white",
  FULFILLED: "bg-emerald-700 text-white",
  UNREAD: "bg-black text-white",
  READ: "bg-zinc-100 text-zinc-500",
  REPLIED: "bg-zinc-800 text-white",
  ARCHIVED: "bg-zinc-100 text-zinc-400",
  CLOSED: "bg-zinc-100 text-zinc-500",
}

export function SubmissionsSection({ config }: { config: SubmissionConfig }) {
  const { toast } = useToast()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [selected, setSelected] = useState<Row | null>(null)
  const Icon = config.icon

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await cms.list<Row>(config.resource)
      setRows(data)
    } catch (e: any) {
      toast({ title: "Failed to load", description: e.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [config.resource, toast])

  useEffect(() => { load() }, [load])

  const filtered = rows.filter((r) => {
    if (statusFilter !== "ALL" && r.status !== statusFilter) return false
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return config.detailFields.some((f) => String(r[f.key] ?? "").toLowerCase().includes(q))
      || config.columns.some((c) => String(r[c.key] ?? "").toLowerCase().includes(q))
  })

  const openRow = async (row: Row) => {
    // If this config has a detailLink, navigate to it instead of opening the sheet
    if (config.detailLink) {
      const link = config.detailLink(row)
      if (link) {
        window.location.href = link
        return
      }
    }
    setSelected(row)
    if (config.resource === "messages" && row.status === "UNREAD") {
      try {
        await cms.update(config.resource, row.id, { status: "READ" })
        setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: "READ" } : r)))
      } catch { /* ignore */ }
    }
  }

  const changeStatus = async (status: string) => {
    if (!selected) return
    try {
      await cms.update(config.resource, selected.id, { status })
      setSelected({ ...selected, status })
      setRows((prev) => prev.map((r) => (r.id === selected.id ? { ...r, status } : r)))
      toast({ title: `Marked as ${status}` })
    } catch (e: any) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" })
    }
  }

  const remove = async () => {
    if (!selected) return
    try {
      await cms.remove(config.resource, selected.id)
      setRows((prev) => prev.filter((r) => r.id !== selected.id))
      setSelected(null)
      toast({ title: "Deleted" })
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">{config.title}</p>
        <h2 className="mt-2 text-[28px] font-semibold leading-tight tracking-tight text-zinc-900">{config.title}</h2>
        <p className="mt-3 text-[13px] leading-relaxed text-zinc-500">{config.description}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <MagnifyingGlass size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" className="border-black/10 bg-white pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44 border-black/10 bg-white"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {config.statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        {config.createFields && (
          <CreateButton config={config} onCreated={load} />
        )}
      </div>

      <Card className="overflow-hidden border border-black/10 bg-white p-0">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <Icon size={32} className="text-zinc-300" />
            <p className="text-[13px] text-zinc-400">Nothing here yet.</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[58vh]">
            <Table>
              <TableHeader>
                <TableRow className="border-black/10 hover:bg-transparent">
                  {config.columns.map((c) => (
                    <TableHead key={c.key} className="whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">{c.label}</TableHead>
                  ))}
                  <TableHead className="w-28 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">Status</TableHead>
                  <TableHead className="w-32 text-right text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">Received</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow key={row.id} onClick={() => openRow(row)} className="cursor-pointer border-black/10 hover:bg-zinc-50">
                    {config.columns.map((c) => (
                      <TableCell key={c.key} className="text-[12px] font-medium text-zinc-900">
                        {c.render ? c.render(row) : (row[c.key] ?? "—")}
                      </TableCell>
                    ))}
                    <TableCell>
                      <Badge className={`${STATUS_STYLE[row.status] || "bg-zinc-100 text-zinc-500"} px-2 py-0.5 text-[9.5px] font-semibold`}>{row.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-[11px] text-zinc-400">{timeAgo(row.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </Card>

      <Sheet open={!!selected} onOpenChange={(o) => { if (!o) setSelected(null) }}>
        <SheetContent className="flex w-full flex-col gap-0 border-l border-black/10 bg-white sm:max-w-lg">
          {selected && (
            <>
              <SheetHeader className="border-b border-black/10">
                <SheetTitle className="text-[22px] font-semibold text-zinc-900">
                  {config.columns[0].render ? (config.columns[0].render(selected) as any) : selected[config.columns[0].key]}
                </SheetTitle>
                <SheetDescription className="text-zinc-500">
                  Received {new Date(selected.createdAt).toLocaleString()}
                </SheetDescription>
              </SheetHeader>
              <ScrollArea className="flex-1">
                <div className="space-y-4 p-6">
                  {config.detailFields.map((f) => (
                    <div key={f.key}>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">{f.label}</p>
                      <p className={`mt-1 text-[13px] text-zinc-900 ${f.type === "long" ? "leading-relaxed" : "font-medium"}`}>
                        {selected[f.key] || "—"}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="flex items-center gap-2 border-t border-black/10 bg-zinc-50 p-4">
                <Select value={selected.status} onValueChange={changeStatus}>
                  <SelectTrigger className="flex-1 border-black/10 bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {config.statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={remove} title="Delete" className="border-black/10 text-zinc-700 hover:text-destructive">
                  <Trash size={16} />
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

export const SUBMISSION_CONFIGS: SubmissionConfig[] = [
  {
    resource: "bookings",
    title: "Bookings",
    description: "Appointment requests — deposit flow pending Stripe webhook wiring.",
    icon: CalendarCheck,
    statuses: ["DRAFT", "PAYMENT_PENDING", "PAYMENT_FAILED", "CONFIRMED", "CHECKED_IN", "IN_SERVICE", "COMPLETED", "CANCELLED", "NO_SHOW", "RESCHEDULED"],
    columns: [
      { key: "ownerName", label: "Owner" },
      { key: "dogName", label: "Dog", render: (r) => `${r.dogName}${r.breed ? ` · ${r.breed}` : ""}` },
      { key: "service", label: "Service" },
      { key: "size", label: "Size" },
      { key: "date", label: "When", render: (r) => `${r.date} · ${r.time}` },
    ],
    detailFields: [
      { label: "Owner name", key: "ownerName" },
      { label: "Dog name", key: "dogName" },
      { label: "Breed", key: "breed" },
      { label: "Service", key: "service" },
      { label: "Dog size", key: "size" },
      { label: "Preferred date", key: "date" },
      { label: "Preferred time", key: "time" },
      { label: "Phone", key: "phone" },
      { label: "Email", key: "email" },
      { label: "Notes", key: "notes", type: "long" },
      { label: "Service price", key: "servicePrice" },
      { label: "Deposit amount", key: "depositAmount" },
      { label: "Balance due", key: "balanceDue" },
      { label: "Payment status", key: "paymentStatus" },
      { label: "Stripe checkout session", key: "stripeCheckoutSessionId" },
      { label: "Stripe payment intent", key: "stripePaymentIntentId" },
    ],
  },
  {
    resource: "consultations",
    title: "Consultations",
    description: "Free consultation requests — convert to booking when ready.",
    icon: PhoneCall,
    statuses: ["DRAFT", "REQUESTED", "CONTACTED", "SCHEDULED", "COMPLETED", "CONVERTED", "CANCELLED"],
    columns: [
      { key: "name", label: "Name" },
      { key: "dogName", label: "Dog", render: (r) => `${r.dogName || "—"}${r.breed ? ` · ${r.breed}` : ""}` },
      { key: "preferredTime", label: "Preferred time" },
    ],
    detailFields: [
      { label: "Your name", key: "name" },
      { label: "Dog name", key: "dogName" },
      { label: "Breed", key: "breed" },
      { label: "Concerns / notes", key: "concerns", type: "long" },
      { label: "Preferred time", key: "preferredTime" },
      { label: "Phone", key: "phone" },
      { label: "Email", key: "email" },
    ],
  },
  {
    resource: "messages",
    title: "Messages",
    description: "Contact form submissions from the contact page.",
    icon: Tray,
    statuses: ["UNREAD", "READ", "REPLIED", "ARCHIVED"],
    columns: [
      { key: "name", label: "From" },
      { key: "subject", label: "Subject", render: (r) => r.subject || "—" },
      { key: "message", label: "Message", render: (r) => (
        <span className="line-clamp-1 max-w-[260px] font-normal text-zinc-400">{r.message}</span>
      ) },
    ],
    detailFields: [
      { label: "Name", key: "name" },
      { label: "Email", key: "email" },
      { label: "Subject", key: "subject" },
      { label: "Message", key: "message", type: "long" },
    ],
  },
  {
    resource: "customers",
    title: "Customers",
    description: "Customers created from the booking wizard — linked to Stripe. Click a customer to view full profile, history, and payments.",
    icon: Users,
    statuses: ["active"],
    columns: [
      { key: "firstName", label: "Name", render: (r) => `${r.firstName || ""} ${r.lastName || ""}`.trim() || "—" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "city", label: "City" },
    ],
    detailFields: [
      { label: "First name", key: "firstName" },
      { label: "Last name", key: "lastName" },
      { label: "Email", key: "email" },
      { label: "Phone", key: "phone" },
      { label: "Address", key: "address" },
      { label: "Address line 2", key: "addressLine2" },
      { label: "City", key: "city" },
      { label: "State", key: "state" },
      { label: "ZIP", key: "postalCode" },
      { label: "Stripe customer ID", key: "stripeCustomerId" },
    ],
    detailLink: (r) => `/admin/customers/${r.id}`,
    createApiPath: "/api/customers",
    createFields: [
      { label: "First name", key: "firstName" },
      { label: "Last name", key: "lastName" },
      { label: "Email", key: "email", type: "email" },
      { label: "Phone", key: "phone", type: "tel" },
      { label: "Address", key: "address" },
      { label: "Address line 2", key: "addressLine2" },
      { label: "City", key: "city" },
      { label: "State", key: "state" },
      { label: "ZIP", key: "postalCode" },
    ],
  },
  {
    resource: "orders",
    title: "Orders",
    description: "Shop orders — paid via Stripe Checkout, confirmed via webhook.",
    icon: ShoppingBag,
    statuses: ["CART", "PAYMENT_PENDING", "PAID", "PROCESSING", "FULFILLED", "COMPLETED", "PAYMENT_FAILED"],
    columns: [
      { key: "id", label: "Order", render: (r) => r.id?.slice(0, 8) + "…" },
      { key: "subtotal", label: "Total" },
      { key: "paymentStatus", label: "Payment" },
    ],
    detailFields: [
      { label: "Order ID", key: "id" },
      { label: "Subtotal", key: "subtotal" },
      { label: "Payment status", key: "paymentStatus" },
      { label: "Stripe checkout session", key: "stripeCheckoutSessionId" },
      { label: "Stripe payment intent", key: "stripePaymentIntentId" },
      { label: "Customer ID", key: "customerId" },
    ],
  },
  {
    resource: "activity_log",
    title: "Activity Log",
    description: "Every important event — bookings, payments, status changes.",
    icon: ListChecks,
    statuses: ["created", "updated", "paid", "confirmed", "cancelled", "converted"],
    columns: [
      { key: "entity", label: "Entity" },
      { key: "action", label: "Action" },
      { key: "summary", label: "Summary", render: (r) => (
        <span className="line-clamp-1 max-w-[300px] font-normal text-zinc-400">{r.summary}</span>
      ) },
    ],
    detailFields: [
      { label: "Entity", key: "entity" },
      { label: "Entity ID", key: "entityId" },
      { label: "Action", key: "action" },
      { label: "Summary", key: "summary", type: "long" },
      { label: "Actor", key: "actor" },
    ],
  },
]

// ---- Create button + dialog ----
function CreateButton({ config, onCreated }: { config: SubmissionConfig; onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const apiPath = config.createApiPath || `/api/cms/${config.resource}`
      const res = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({ error: "Failed" }))
        setError(e.error || "Failed to create")
        setSaving(false)
        return
      }
      setOpen(false)
      setForm({})
      onCreated()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="bg-black text-white hover:bg-zinc-800">
        <Plus size={16} weight="bold" /> Add {config.resource === "customers" ? "Customer" : "Record"}
      </Button>
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setError(null); setForm({}) } }}>
        <DialogContent className="max-w-lg border-black/10 bg-white">
          <DialogHeader>
            <DialogTitle className="text-[20px] font-semibold text-zinc-900">
              New {config.resource === "customers" ? "Customer" : "Record"}
            </DialogTitle>
            <DialogDescription className="text-zinc-500">
              {config.resource === "customers" ? "Creates a customer in Supabase + Stripe." : "Create a new record."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[50vh] gap-3 overflow-y-auto pr-1">
            {config.createFields?.map((f) => (
              <div key={f.key}>
                <label className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-zinc-400">{f.label}</label>
                <input
                  type={f.type || "text"}
                  value={form[f.key] || ""}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-[13px] text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>
            ))}
            {error && <p className="text-[12px] text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="border-black/10 text-zinc-700">Cancel</Button>
            <Button onClick={save} disabled={saving} className="bg-black text-white hover:bg-zinc-800">
              {saving ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
