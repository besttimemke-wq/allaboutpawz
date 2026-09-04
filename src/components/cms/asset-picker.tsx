"use client"

import { useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Image as ImageIcon, Check, UploadSimple, Spinner } from "@phosphor-icons/react"

export function ImageAssetPicker({
  value, onChange, assets,
}: {
  value: string
  onChange: (v: string) => void
  assets: string[]
}) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<"browse" | "upload">("browse")
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const normalized = value.startsWith("/assets/") || value.startsWith("http") || value === ""
    ? value
    : `/assets/${value.replace(/^\/+/, "")}`

  const pick = (a: string) => {
    onChange(`/assets/${a}`)
    setOpen(false)
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setUploading(true)
    try {
      const { url } = await import("@/lib/cms-api").then((m) => m.cms.upload(f))
      onChange(url)
      setOpen(false)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-black/10 bg-zinc-50">
        {normalized ? (
           
          <img src={normalized} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-zinc-400">
            <ImageIcon size={20} />
          </div>
        )}
      </div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="/assets/hero-dog.jpg or https://…"
        className="flex-1"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            Choose
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="flex border-b border-black/10">
            <button
              type="button"
              onClick={() => setTab("browse")}
              className={`flex-1 px-3 py-2 text-xs font-semibold ${tab === "browse" ? "bg-black text-white" : "text-zinc-500 hover:bg-zinc-100"}`}
            >
              Browse site images
            </button>
            <button
              type="button"
              onClick={() => setTab("upload")}
              className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold ${tab === "upload" ? "bg-black text-white" : "text-zinc-500 hover:bg-zinc-100"}`}
            >
              <UploadSimple size={14} /> Upload
            </button>
          </div>
          {tab === "browse" ? (
            <ScrollArea className="h-64">
              <div className="grid grid-cols-3 gap-2 p-2">
                {assets.map((a) => {
                  const active = normalized === `/assets/${a}`
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => pick(a)}
                      className="group relative aspect-square overflow-hidden rounded-md border border-black/10 bg-zinc-50 hover:ring-2 hover:ring-black"
                    >
                      { }
                      <img src={`/assets/${a}`} alt={a} className="h-full w-full object-cover" />
                      {active && (
                        <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-black text-white">
                          <Check size={12} weight="bold" />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="p-4">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={onFile}
                disabled={uploading}
                className="block w-full text-xs file:mr-3 file:rounded-none file:border-0 file:bg-black file:px-3 file:py-2 file:text-white hover:file:bg-zinc-800"
              />
              <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
                {uploading ? (
                  <span className="flex items-center gap-1.5"><Spinner size={12} /> Uploading…</span>
                ) : (
                  "Uploads go to your Supabase Storage bucket “cms-media”. Requires Supabase to be configured."
                )}
              </p>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}
