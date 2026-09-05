"use client"

import { useEffect, useState } from "react"
import { DataTable, type Column } from "@/components/admin/data-table"
import { Plus } from "@phosphor-icons/react"
import Link from "next/link"

type Dog = {
  id: string; name: string; customerId: string | null; breedId: string | null
  breedName: string | null; sex: string | null; weightLbs: string | null
  color: string | null; createdAt: string
}
type Breed = { id: string; name: string; sizeCategory: string; coatType: string; akcGroup: string }

export default function DogsPage() {
  const [rows, setRows] = useState<Dog[]>([])
  const [breeds, setBreeds] = useState<Record<string, Breed>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch("/api/cms/dogs").then((r) => r.json()),
      fetch("/api/cms/dog_breeds").then((r) => r.json()),
    ]).then(([dogs, breedList]) => {
      setRows(dogs)
      const map: Record<string, Breed> = {}
      breedList.forEach((b: Breed) => { map[b.id] = b })
      setBreeds(map)
    }).finally(() => setLoading(false))
  }, [])

  const columns: Column<Dog>[] = [
    { key: "name", label: "Dog", sortable: true, render: (r) => (
      <span className="font-medium text-zinc-900">{r.name}</span>
    )},
    { key: "breed", label: "Breed", sortable: true, render: (r) => {
      const b = r.breedId ? breeds[r.breedId] : null
      return b?.name || r.breedName || "—"
    }},
    { key: "size", label: "Size", render: (r) => {
      const b = r.breedId ? breeds[r.breedId] : null
      return b?.sizeCategory || "—"
    }},
    { key: "weight", label: "Weight", align: "right", render: (r) => r.weightLbs ? `${r.weightLbs} lbs` : "—" },
    { key: "sex", label: "Sex", render: (r) => r.sex || "—" },
    { key: "color", label: "Color", render: (r) => r.color || "—" },
  ]

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">CRM</p>
        <h1 className="mt-1 text-[24px] font-semibold tracking-tight text-zinc-900">Dogs</h1>
        <p className="mt-1 text-[12px] text-zinc-500">{rows.length} dogs</p>
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search dog name, breed, owner…"
        searchKeys={["name", "breedName", "color", "markings"]}
        pageSize={100}
        rowHref={(r) => `/admin/dogs/${r.id}`}
      />
    </div>
  )
}
