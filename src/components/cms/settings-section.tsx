"use client"

import { useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { FloppyDisk, Storefront, Clock, ShareNetwork, Sparkle } from "@phosphor-icons/react"
import { cms } from "@/lib/cms-api"

type Group = {
  key: string
  title: string
  description: string
  icon: typeof Store
  fields: { key: string; label: string; type?: "text" | "textarea"; placeholder?: string }[]
}

const GROUPS: Group[] = [
  {
    key: "brand",
    title: "Brand & Hero",
    description: "The brand name and the headline shown on the homepage hero.",
    icon: Sparkle,
    fields: [
      { key: "brandName", label: "Brand name", placeholder: "All About Pawz" },
      { key: "tagline", label: "Tagline", placeholder: "From Pawz to PAWfection" },
      { key: "heroTitle", label: "Hero title", type: "textarea" },
      { key: "heroSubtitle", label: "Hero subtitle", type: "textarea" },
    ],
  },
  {
    key: "contact",
    title: "Salon Details",
    description: "Address, phone, and email shown on the contact page and sidebar.",
    icon: Storefront,
    fields: [
      { key: "addressLine1", label: "Address line 1" },
      { key: "addressLine2", label: "Address line 2" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "footerNote", label: "Footer note", type: "textarea" },
    ],
  },
  {
    key: "hours",
    title: "Opening Hours",
    description: "Hours displayed in the sidebar and contact section.",
    icon: Clock,
    fields: [
      { key: "hoursTueSat", label: "Tuesday – Saturday" },
      { key: "hoursSun", label: "Sunday" },
      { key: "hoursMon", label: "Monday" },
    ],
  },
  {
    key: "social",
    title: "Social Links",
    description: "Links to your social profiles.",
    icon: ShareNetwork,
    fields: [
      { key: "instagram", label: "Instagram URL" },
      { key: "facebook", label: "Facebook URL" },
    ],
  },
]

export function SettingsSection() {
  const { toast } = useToast()
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let alive = true
    cms.settings()
      .then((s) => alive && setSettings(s))
      .catch((e) => toast({ title: "Failed to load settings", description: e.message, variant: "destructive" }))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [toast])

  const update = (key: string, value: string) => setSettings((prev) => ({ ...prev, [key]: value }))

  const save = async () => {
    setSaving(true)
    try {
      await cms.saveSettings(settings)
      toast({ title: "Settings saved", description: "Your live site content has been updated." })
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Site Settings</p>
          <h2 className="mt-2 text-[28px] font-semibold leading-tight tracking-tight text-zinc-900">Global site content</h2>
          <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-zinc-500">
            Brand, hero, salon details, hours and social links used across every page.
          </p>
        </div>
        <Button onClick={save} disabled={saving} className="bg-black text-white hover:bg-zinc-800">
          <FloppyDisk size={16} weight="fill" /> {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {GROUPS.map((g) => (
            <Card key={g.key} className="border border-black/10 bg-white p-6">
              <div className="mb-4 flex items-start gap-3">
                <span className="text-zinc-900">
                  <g.icon size={20} weight="fill" />
                </span>
                <div>
                  <h3 className="text-[15px] font-semibold text-zinc-900">{g.title}</h3>
                  <p className="text-[11.5px] text-zinc-400">{g.description}</p>
                </div>
              </div>
              <div className="space-y-3">
                {g.fields.map((f) => (
                  <div key={f.key} className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">{f.label}</Label>
                    {f.type === "textarea" ? (
                      <Textarea
                        value={settings[f.key] ?? ""}
                        onChange={(e) => update(f.key, e.target.value)}
                        placeholder={f.placeholder}
                        rows={2}
                        className="border-black/10 bg-white text-zinc-900"
                      />
                    ) : (
                      <Input
                        value={settings[f.key] ?? ""}
                        onChange={(e) => update(f.key, e.target.value)}
                        placeholder={f.placeholder}
                        className="border-black/10 bg-white text-zinc-900"
                      />
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
