"use client"

import { useState, useMemo, useCallback } from "react"
import {
  MagnifyingGlass, CaretUp, CaretDown, Export, Plus,
} from "@phosphor-icons/react"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import Link from "next/link"

export type Column<T = any> = {
  key: string
  label: string
  sortable?: boolean
  render?: (row: T) => React.ReactNode
  width?: string
  align?: "left" | "center" | "right"
}

export type DataTableProps<T = any> = {
  rows: T[]
  columns: Column<T>[]
  loading?: boolean
  // search
  searchPlaceholder?: string
  searchKeys?: string[]
  // pagination
  pageSize?: number
  // row interaction
  onRowClick?: (row: T) => void
  rowHref?: (row: T) => string
  // selection
  selectable?: boolean
  bulkActions?: { label: string; onClick: (selectedIds: string[]) => void }[]
  // header actions
  title?: string
  headerActions?: React.ReactNode
  // filters
  filters?: React.ReactNode
}

export function DataTable<T extends { id: string }>({
  rows, columns, loading,
  searchPlaceholder = "Search…", searchKeys,
  pageSize = 50,
  onRowClick, rowHref,
  selectable, bulkActions,
  title, headerActions, filters,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("")
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Filter
  const filtered = useMemo(() => {
    if (!query.trim() || !searchKeys) return rows
    const q = query.toLowerCase()
    return rows.filter((r) => searchKeys.some((k) => String((r as any)[k] ?? "").toLowerCase().includes(q)))
  }, [rows, query, searchKeys])

  // Sort
  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    const dir = sortDir === "asc" ? 1 : -1
    return [...filtered].sort((a, b) => {
      const av = (a as any)[sortKey] ?? ""
      const bv = (b as any)[sortKey] ?? ""
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir
      return String(av).localeCompare(String(bv)) * dir
    })
  }, [filtered, sortKey, sortDir])

  // Paginate
  const totalPages = Math.ceil(sorted.length / pageSize)
  const paginated = sorted.slice(page * pageSize, (page + 1) * pageSize)

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("asc") }
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === paginated.length) setSelected(new Set())
    else setSelected(new Set(paginated.map((r) => r.id)))
  }

  const selectedIds = Array.from(selected)

  return (
    <div className="space-y-3">
      {/* Header */}
      {(title || headerActions) && (
        <div className="flex items-center justify-between">
          {title && <h2 className="text-[20px] font-semibold tracking-tight text-zinc-900">{title}</h2>}
          {headerActions && <div className="flex items-center gap-2">{headerActions}</div>}
        </div>
      )}

      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <MagnifyingGlass size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(0) }}
            placeholder={searchPlaceholder}
            className="w-full rounded-md border border-black/10 bg-white py-2 pl-9 pr-3 text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900"
          />
        </div>
        {filters}
      </div>

      {/* Bulk action bar */}
      {selectable && selectedIds.length > 0 && (
        <div className="flex items-center gap-3 rounded-md border border-black/10 bg-zinc-100 px-4 py-2">
          <span className="text-[12px] font-semibold text-zinc-900">{selectedIds.length} selected</span>
          <div className="flex items-center gap-2">
            {bulkActions?.map((a) => (
              <button key={a.label} onClick={() => a.onClick(selectedIds)} className="rounded border border-black/10 bg-white px-3 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50">
                {a.label}
              </button>
            ))}
          </div>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-[11px] text-zinc-400 hover:text-zinc-700">Clear</button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-black/10">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-black/10 bg-zinc-50">
                {selectable && (
                  <th className="w-10 px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={selected.size === paginated.length && paginated.length > 0}
                      onChange={toggleSelectAll}
                      className="h-3.5 w-3.5 accent-black"
                    />
                  </th>
                )}
                {columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => col.sortable && toggleSort(col.key)}
                    className={`px-3 py-2.5 text-[10px] font-bold uppercase tracking-wide text-zinc-500 ${col.sortable ? "cursor-pointer hover:text-zinc-900" : ""} ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"}`}
                    style={{ width: col.width }}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {col.sortable && sortKey === col.key && (
                        sortDir === "asc" ? <CaretUp size={10} weight="fill" /> : <CaretDown size={10} weight="fill" />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-black/5">
                    <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-3 py-2.5">
                      <Skeleton className="h-5 w-full" />
                    </td>
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-3 py-12 text-center text-[13px] text-zinc-400">
                    No records found.
                  </td>
                </tr>
              ) : (
                paginated.map((row) => {
                  const href = rowHref?.(row)
                  const Comp = href ? Link : "div" as any
                  const linkProps = href ? { href } : {}
                  return (
                    <Comp
                      key={row.id}
                      {...linkProps}
                      onClick={() => onRowClick?.(row)}
                      className={`flex border-b border-black/5 transition-colors hover:bg-zinc-50 ${href ? "cursor-pointer" : ""}`}
                      style={{ display: "table-row" }}
                    >
                      {selectable && (
                        <td className="w-10 px-3 py-2.5" onClick={(e: any) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selected.has(row.id)}
                            onChange={() => toggleSelect(row.id)}
                            className="h-3.5 w-3.5 accent-black"
                          />
                        </td>
                      )}
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={`px-3 py-2.5 text-[12px] text-zinc-900 ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"}`}
                        >
                          {col.render ? col.render(row) : String((row as any)[col.key] ?? "—")}
                        </td>
                      ))}
                    </Comp>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-[11px] text-zinc-500">
          <span>Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)} of {sorted.length}</span>
          <div className="flex items-center gap-1">
            <button disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded px-2 py-1 hover:bg-zinc-100 disabled:opacity-30">← Prev</button>
            <span className="px-2 font-semibold text-zinc-900">{page + 1} / {totalPages}</span>
            <button disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className="rounded px-2 py-1 hover:bg-zinc-100 disabled:opacity-30">Next →</button>
          </div>
        </div>
      )}
    </div>
  )
}
