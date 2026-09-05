"use client"

import { useEffect, useState } from "react"
import { DataTable, type Column } from "@/components/admin/data-table"
import {
  Scissors, PawPrint, Drop, PaintBrush, HandsPraying, Tooth,
  Plus, Users, Dog as DogIcon,
} from "@phosphor-icons/react"
import type { Icon } from "@phosphor-icons/react"

type Row = { id: string; name: string; slug: string | null; description: string | null; active: boolean; sortOrder: number; createdAt: string }

const TABLES: { key: string; label: string; resource: string; icon: Icon }[] = [
  { key: "dog_breeds", label: "Breed Data", resource: "dog_breeds", icon: DogIcon },
  { key: "coat_types", label: "Coat Types", resource: "coat_types", icon: PaintBrush },
  { key: "coat_textures", label: "Coat Textures", resource: "coat_textures", icon: PaintBrush },
  { key: "coat_lengths", label: "Coat Lengths", resource: "coat_lengths", icon: PaintBrush },
  { key: "coat_conditions", label: "Coat Conditions", resource: "coat_conditions", icon: PaintBrush },
  { key: "shedding_levels", label: "Shedding Levels", resource: "shedding_levels", icon: Drop },
  { key: "haircut_styles", label: "Haircut Styles", resource: "haircut_styles", icon: Scissors },
  { key: "clip_lengths", label: "Body Lengths", resource: "clip_lengths", icon: Scissors },
  { key: "body_styles", label: "Body Styles", resource: "body_styles", icon: Scissors },
  { key: "leg_styles", label: "Leg Styles", resource: "leg_styles", icon: Scissors },
  { key: "face_styles", label: "Face Styles", resource: "face_styles", icon: Scissors },
  { key: "head_styles", label: "Head Styles", resource: "head_styles", icon: Scissors },
  { key: "ear_styles", label: "Ear Styles", resource: "ear_styles", icon: Scissors },
  { key: "tail_styles", label: "Tail Styles", resource: "tail_styles", icon: Scissors },
  { key: "feet_styles", label: "Feet Styles", resource: "feet_styles", icon: PawPrint },
  { key: "sanitary_options", label: "Sanitary", resource: "sanitary_options", icon: HandsPraying },
  { key: "nail_services", label: "Nail Services", resource: "nail_services", icon: PawPrint },
  { key: "paw_pad_services", label: "Paw Pad Services", resource: "paw_pad_services", icon: PawPrint },
  { key: "ear_services", label: "Ear Services", resource: "ear_services", icon: PaintBrush },
  { key: "teeth_services", label: "Teeth Services", resource: "teeth_services", icon: Tooth },
  { key: "deshedding_services", label: "Deshedding", resource: "deshedding_services", icon: Drop },
  { key: "coat_techniques", label: "Coat Techniques", resource: "coat_techniques", icon: PaintBrush },
  { key: "staff", label: "Groomers", resource: "staff", icon: Users },
]

export default function GroomingDataPage() {
  const [active, setActive] = useState("dog_breeds")
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  const activeTable = TABLES.find((t) => t.key === active)!

  useEffect(() => {
    let alive = true
    fetch(`/api/cms/${activeTable.resource}`).then((r) => r.json()).then((d) => {
      if (!alive) return
      setRows(d)
      setLoading(false)
    }).catch(() => { if (alive) setLoading(false) })
    return () => { alive = false }
     
  }, [active])

  const columns: Column<Row>[] = [
    { key: "name", label: "Name", sortable: true, render: (r) => <span className="font-medium text-zinc-900">{r.name}</span> },
    { key: "description", label: "Description", render: (r) => <span className="text-zinc-500">{r.description || "—"}</span> },
    { key: "active", label: "Status", render: (r) => r.active ? (
      <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">Active</span>
    ) : (
      <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-500">Inactive</span>
    )},
  ]

  return (
    <div className="flex gap-6">
      {/* Secondary navigation */}
      <aside className="w-48 shrink-0">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">Grooming Data</p>
        <nav className="space-y-0.5">
          {TABLES.map((t) => (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={`flex w-full items-center gap-2 rounded px-3 py-2 text-[12px] font-medium transition-colors ${
                active === t.key ? "bg-black text-white" : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              <t.icon size={14} weight="fill" className={active === t.key ? "text-white" : "text-zinc-400"} />
              {t.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Table */}
      <div className="min-w-0 flex-1">
        <div className="mb-4">
          <h1 className="text-[20px] font-semibold tracking-tight text-zinc-900">{activeTable.label}</h1>
          <p className="mt-1 text-[12px] text-zinc-500">{rows.length} records</p>
        </div>

        <DataTable
          rows={rows}
          columns={columns}
          loading={loading}
          searchPlaceholder={`Search ${activeTable.label.toLowerCase()}…`}
          searchKeys={["name", "slug"]}
          pageSize={50}
          selectable
          bulkActions={[
            { label: "Activate", onClick: async (ids) => { await Promise.all(ids.map((id) => fetch(`/api/cms/${activeTable.resource}/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: true }) }))); window.location.reload() } },
            { label: "Deactivate", onClick: async (ids) => { await Promise.all(ids.map((id) => fetch(`/api/cms/${activeTable.resource}/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: false }) }))); window.location.reload() } },
            { label: "Delete", onClick: async (ids) => { if (!confirm(`Delete ${ids.length} records?`)) return; await Promise.all(ids.map((id) => fetch(`/api/cms/${activeTable.resource}/${id}`, { method: "DELETE" }))); window.location.reload() } },
          ]}
        />
      </div>
    </div>
  )
}
