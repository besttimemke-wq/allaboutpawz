"use client"

import { useCallback, useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Plus, Pencil, Trash, DotsThreeVertical, MagnifyingGlass, Eye, EyeSlash, Star,
} from "@phosphor-icons/react"
import { cms } from "@/lib/cms-api"
import { getStoredIcon, type ResourceConfig } from "@/lib/cms-config"
import { FormField } from "@/components/cms/form-field"

type Row = Record<string, any> & { id: string }

export function RecordsSection({ config }: { config: ResourceConfig }) {
  const { toast } = useToast()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [editing, setEditing] = useState<Row | null>(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<Row | null>(null)
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
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return config.fields.some((f) => String(r[f.key] ?? "").toLowerCase().includes(q))
  })

  const openNew = () => { setEditing(blankRow(config)); setOpen(true) }
  const openEdit = (row: Row) => { setEditing({ ...row }); setOpen(true) }

  const save = async () => {
    if (!editing) return
    setSaving(true)
    try {
      const { id, ...data } = editing
      if (id) {
        await cms.update(config.resource, id, data)
        toast({ title: `${config.singular} updated` })
      } else {
        await cms.create(config.resource, data)
        toast({ title: `${config.singular} created` })
      }
      setOpen(false); setEditing(null); await load()
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!deleting) return
    try {
      await cms.remove(config.resource, deleting.id)
      toast({ title: `${config.singular} deleted` })
      setDeleting(null); await load()
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" })
    }
  }

  const toggleVisible = async (row: Row) => {
    try {
      await cms.update(config.resource, row.id, { visible: !row.visible })
      await load()
    } catch (e: any) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">{config.title}</p>
        <h2 className="mt-2 text-[28px] font-semibold leading-tight tracking-tight text-zinc-900">{config.title}</h2>
        <div className="mt-3 flex items-center gap-3">
          <span className="h-px w-12 bg-zinc-200" />
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-zinc-500">{config.description}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <MagnifyingGlass size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="border-black/10 bg-white pl-9"
          />
        </div>
        <Button onClick={openNew} className="bg-black text-white hover:bg-zinc-800">
          <Plus size={16} weight="bold" /> Add {config.singular}
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-2 border border-dashed border-black/10 bg-white py-16 text-center">
          <Icon size={32} className="text-zinc-300" />
          <p className="text-[13px] text-zinc-400">No {config.title.toLowerCase()} yet.</p>
          <Button onClick={openNew} variant="outline" size="sm" className="border-zinc-900 text-zinc-900">Create your first {config.singular.toLowerCase()}</Button>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((row) => {
            const img = config.cardImage?.(row) || null
            const title = config.cardTitle(row)
            const subtitle = config.cardSubtitle?.(row) || ""
            const RowIcon = getStoredIcon(row.icon, config.icon)
            return (
              <Card key={row.id} className="group overflow-hidden border border-black/10 bg-white p-0">
                {img && (
                  <div className="relative h-32 w-full bg-zinc-50">
                    { }
                    <img src={img} alt={row.alt || title} className="h-full w-full object-cover" />
                    {row.visible !== undefined && (
                      <button
                        onClick={() => toggleVisible(row)}
                        title={row.visible ? "Visible on site" : "Hidden"}
                        className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full ${row.visible ? "bg-black text-white" : "bg-white/80 text-zinc-400"}`}
                      >
                        {row.visible ? <Eye size={14} weight="fill" /> : <EyeSlash size={14} weight="fill" />}
                      </button>
                    )}
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {img === null && <RowIcon size={16} weight="fill" className="shrink-0 text-zinc-900" />}
                        <h3 className="truncate text-[15px] font-semibold text-zinc-900">{title}</h3>
                        {row.featured && (
                          <Badge className="bg-zinc-100 px-1.5 py-0 text-[9px] font-semibold text-zinc-700">Featured</Badge>
                        )}
                        {row.rating ? (
                          <span className="ml-auto flex items-center gap-0.5 text-zinc-900">
                            <Star size={12} weight="fill" className="fill-zinc-900" /> {row.rating}
                          </span>
                        ) : null}
                      </div>
                      {subtitle && (
                        <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-zinc-400">{subtitle}</p>
                      )}
                      {row.price && !img && (
                        <p className="mt-1.5 text-[13px] font-bold text-zinc-900">{row.price}</p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-zinc-400 hover:text-zinc-900">
                          <DotsThreeVertical size={16} weight="bold" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(row)}>
                          <Pencil size={14} weight="fill" className="mr-2" /> Edit
                        </DropdownMenuItem>
                        {row.visible !== undefined && (
                          <DropdownMenuItem onClick={() => toggleVisible(row)}>
                            {row.visible ? <EyeSlash size={14} weight="fill" className="mr-2" /> : <Eye size={14} weight="fill" className="mr-2" />}
                            {row.visible ? "Hide" : "Show"}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleting(row)}>
                          <Trash size={14} weight="fill" className="mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null) }}>
        <DialogContent className="max-w-2xl border-black/10 bg-white">
          <DialogHeader>
            <DialogTitle className="text-[22px] font-semibold text-zinc-900">
              {editing?.id ? `Edit ${config.singular.toLowerCase()}` : `New ${config.singular.toLowerCase()}`}
            </DialogTitle>
            <DialogDescription className="text-zinc-500">
              Update the fields below. Changes save to the live site content.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="grid max-h-[55vh] gap-3 overflow-y-auto pr-1 md:grid-cols-2">
              {config.fields.map((f) => (
                <FormField key={f.key} field={f} value={editing[f.key]} onChange={(v) => setEditing({ ...editing, [f.key]: v })} />
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); setEditing(null) }} className="border-black/10 text-zinc-700">Cancel</Button>
            <Button onClick={save} disabled={saving} className="bg-black text-white hover:bg-zinc-800">
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => { if (!o) setDeleting(null) }}>
        <AlertDialogContent className="border-black/10 bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-semibold text-zinc-900">Delete this {config.singular.toLowerCase()}?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-500">
              This action cannot be undone. {deleting ? config.cardTitle(deleting) : ""} will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-black/10 text-zinc-700">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-black text-white hover:bg-zinc-800">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function blankRow(config: ResourceConfig): Row {
  const row: Record<string, any> = {}
  for (const f of config.fields) {
    if (f.type === "switch") row[f.key] = true
    else if (f.type === "number") row[f.key] = 0
    else row[f.key] = ""
  }
  return row as Row
}
