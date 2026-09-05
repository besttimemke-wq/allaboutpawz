"use client"

// Admin taxonomy browser for the pet product category tree (migration 0004).
// Read/visual only — the taxonomy is migration-managed, so no CRUD here:
// the owner uses this page to see the tree, where products live, and what
// still needs categorizing before publishing real products.

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  TreeStructure, CaretDown, CaretRight, MagnifyingGlass, Info, ArrowClockwise,
} from "@phosphor-icons/react"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"

type CategoryNode = {
  id: number
  name: string
  slug: string
  parentId: number | null
  productCount: number
  children: CategoryNode[]
}

type ProductRow = { id: string; categoryId: number | null }

function countNodes(nodes: CategoryNode[]): number {
  return nodes.reduce((sum, n) => sum + 1 + countNodes(n.children), 0)
}

export default function CategoriesPage() {
  const [tree, setTree] = useState<CategoryNode[] | null>(null) // null = loading
  const [flatCount, setFlatCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [products, setProducts] = useState<ProductRow[] | null>(null)
  const [filterCounts, setFilterCounts] = useState<{ filters: number; values: number; mappings: number } | null>(null)
  const [query, setQuery] = useState("")
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set())
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let alive = true
    Promise.all([
      fetch("/api/shop/categories").then((r) => r.json()).catch(() => null),
      fetch("/api/cms/products").then((r) => r.json()).catch(() => null),
      fetch("/api/cms/pet_product_filters").then((r) => r.json()).catch(() => null),
      fetch("/api/cms/pet_product_filter_values").then((r) => r.json()).catch(() => null),
      fetch("/api/cms/pet_category_filters").then((r) => r.json()).catch(() => null),
    ]).then(([cats, prods, filters, values, mappings]) => {
      if (!alive) return
      if (!cats || !Array.isArray(cats.categories) || typeof cats.ready !== "boolean") {
        setError("Could not load the category taxonomy. Please try again.")
        return
      }
      setTree(cats.categories)
      setFlatCount(Array.isArray(cats.flat) ? cats.flat.length : 0)
      if (Array.isArray(prods)) setProducts(prods)
      setFilterCounts({
        filters: Array.isArray(filters) ? filters.length : 0,
        values: Array.isArray(values) ? values.length : 0,
        mappings: Array.isArray(mappings) ? mappings.length : 0,
      })
    })
    return () => { alive = false }
  }, [reloadKey])

  const retry = () => {
    // Reset from the click handler (not the effect) and re-run the fetches.
    setTree(null)
    setError(null)
    setReloadKey((k) => k + 1)
  }

  // Search keeps a node when its name matches OR any descendant matches (so
  // ancestors of a hit stay visible). Non-matching branches are pruned.
  const q = query.trim().toLowerCase()
  const prune = (nodes: CategoryNode[]): CategoryNode[] => {
    if (!q) return nodes
    return nodes
      .map((n) => {
        const kids = prune(n.children)
        return n.name.toLowerCase().includes(q) || kids.length > 0 ? { ...n, children: kids } : null
      })
      .filter((n): n is CategoryNode => n !== null)
  }

  const searching = q.length > 0
  // 88 nodes — pruning per render is trivial, no memoization needed.
  const visibleTree = tree ? prune(tree) : null
  const visibleCount = visibleTree ? countNodes(visibleTree) : 0

  const toggleRoot = (id: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const categorized = products ? products.filter((p) => p.categoryId != null).length : null
  const uncategorized = products ? products.filter((p) => p.categoryId == null).length : null
  const loading = tree === null && !error

  const renderNode = (node: CategoryNode, depth: number) => {
    const isRoot = depth === 0
    const isOpen = searching || !collapsed.has(node.id)
    return (
      <div key={node.id}>
        <div
          className={`flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-3 py-2 ${isRoot ? "border-black/10 bg-zinc-50/70" : "border-black/5"}`}
          style={isRoot ? undefined : { paddingLeft: `${14 + depth * 20}px` }}
        >
          {isRoot ? (
            <button
              type="button"
              onClick={() => toggleRoot(node.id)}
              aria-expanded={isOpen}
              aria-controls={`cat-branch-${node.id}`}
              aria-label={`${isOpen ? "Collapse" : "Expand"} ${node.name}`}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-zinc-400 hover:bg-black/5 hover:text-black"
            >
              {isOpen ? <CaretDown size={12} weight="fill" /> : <CaretRight size={12} weight="fill" />}
            </button>
          ) : (
            <TreeStructure size={12} weight="fill" className="shrink-0 text-zinc-300" aria-hidden />
          )}
          <span className={`min-w-0 flex-1 ${isRoot ? "text-[12px] font-bold uppercase tracking-wide text-zinc-900" : "text-[12px] font-medium text-zinc-700"}`}>
            {node.name}
          </span>
          {isRoot ? (
            node.productCount > 0 && (
              <span className="rounded-full bg-black px-2 py-0.5 text-[9px] font-bold text-white">{node.productCount}</span>
            )
          ) : (
            node.productCount > 0 && (
              <span className="text-[10px] text-zinc-400">
                {node.productCount} {node.productCount === 1 ? "product" : "products"}
              </span>
            )
          )}
          <span className="ml-auto hidden font-mono text-[10px] text-zinc-400 sm:inline">{node.slug}</span>
          <Link
            href={`/shop/category/${node.slug}`}
            className="text-[9px] font-bold tracking-wide text-zinc-400 underline-offset-2 hover:text-black hover:underline"
          >
            VIEW IN SHOP
          </Link>
        </div>
        {isOpen && node.children.length > 0 && (
          <div id={`cat-branch-${node.id}`}>
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Content</p>
        <h1 className="mt-1 flex items-center gap-2 text-[24px] font-semibold tracking-tight text-zinc-900">
          <TreeStructure size={20} weight="fill" className="text-zinc-400" aria-hidden /> Categories
        </h1>
        <p className="mt-1 text-[12px] text-zinc-500">
          {flatCount} categories across {tree?.length ?? 0} departments · products map to the finest level available
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-black/10 bg-white p-4">
          <p className="text-[9px] font-bold uppercase tracking-wide text-zinc-400">Total categories</p>
          {loading ? <Skeleton className="mt-2 h-7 w-12" /> : (
            <p className="mt-1 text-[20px] font-semibold tracking-tight text-zinc-900">{flatCount}</p>
          )}
        </div>
        <div className="rounded-lg border border-black/10 bg-white p-4">
          <p className="text-[9px] font-bold uppercase tracking-wide text-zinc-400">Products categorized</p>
          {loading || products === null ? <Skeleton className="mt-2 h-7 w-12" /> : (
            <p className="mt-1 text-[20px] font-semibold tracking-tight text-zinc-900">{categorized}</p>
          )}
        </div>
        <div className="rounded-lg border border-black/10 bg-white p-4">
          <p className="text-[9px] font-bold uppercase tracking-wide text-zinc-400">Products uncategorized</p>
          {loading || products === null ? <Skeleton className="mt-2 h-7 w-12" /> : (
            <p className={`mt-1 text-[20px] font-semibold tracking-tight ${uncategorized ? "text-amber-600" : "text-zinc-900"}`}>{uncategorized}</p>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-[12px] font-medium text-red-700">{error}</p>
          <button
            onClick={retry}
            className="flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-100"
          >
            <ArrowClockwise size={12} weight="bold" /> Retry
          </button>
        </div>
      )}

      {/* Tree browser */}
      {loading ? (
        <div className="rounded-lg border border-black/10 bg-white p-4">
          <Skeleton className="mb-3 h-10 w-full max-w-md" />
          <div className="space-y-2">
            {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-7 w-full" style={{ width: `${90 - (i % 4) * 12}%` }} />)}
          </div>
        </div>
      ) : !error && (
        <div className="overflow-hidden rounded-lg border border-black/10 bg-white">
          <div className="flex flex-wrap items-center gap-3 border-b border-black/10 bg-zinc-50 px-4 py-3">
            <div className="relative min-w-[240px] flex-1">
              <MagnifyingGlass size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search categories — name or slug…"
                aria-label="Search categories"
                className="w-full rounded-md border border-black/10 bg-white py-2 pl-9 pr-3 text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>
            <p className="text-[11px] text-zinc-400">
              {searching ? `${visibleCount} matching` : `${flatCount} categories`}
            </p>
          </div>
          <ScrollArea className="[&_[data-slot=scroll-area-viewport]]:max-h-[560px]">
            <div className="p-2">
              {visibleTree && visibleTree.length > 0 ? (
                visibleTree.map((root) => renderNode(root, 0))
              ) : (
                <p className="px-4 py-10 text-center text-[13px] text-zinc-400">
                  {searching ? "No categories match your search." : "No categories found — run migration 0004 to load the taxonomy."}
                </p>
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Taxonomy note (migration-managed, filter framework) */}
      <div className="flex items-start gap-2.5 rounded-lg border border-black/10 bg-zinc-50 px-4 py-3">
        <Info size={14} weight="fill" className="mt-0.5 shrink-0 text-zinc-400" aria-hidden />
        <p className="text-[11px] leading-relaxed text-zinc-500">
          This taxonomy is defined by migration 0004 (pet_product_categories) and is migration-managed —
          categories are curated in the database, not created here. Assign them to products from the{" "}
          <Link href="/admin/products/new" className="font-medium text-zinc-700 underline underline-offset-2 hover:text-black">product editor</Link>.
          Filter framework: {filterCounts ? `${filterCounts.filters} filters · ${filterCounts.values} values · ${filterCounts.mappings} category mappings` : "—"}.
        </p>
      </div>
    </div>
  )
}
