"use client"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { ImageAssetPicker } from "@/components/cms/asset-picker"
import { ASSETS, type FieldDef } from "@/lib/cms-config"

export function FormField({
  field, value, onChange,
}: {
  field: FieldDef
  value: any
  onChange: (v: any) => void
}) {
  const id = `field-${field.key}`

  if (field.type === "switch") {
    return (
      <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
        <div>
          <Label htmlFor={id} className="text-sm font-medium">{field.label}</Label>
        </div>
        <Switch id={id} checked={!!value} onCheckedChange={onChange} />
      </div>
    )
  }

  if (field.type === "select") {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id} className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{field.label}</Label>
        <Select value={value ?? ""} onValueChange={onChange}>
          <SelectTrigger id={id}>
            <SelectValue placeholder={field.placeholder || "Select…"} />
          </SelectTrigger>
          <SelectContent>
            {(field.options || []).map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  if (field.type === "textarea") {
    return (
      <div className={`space-y-1.5 ${field.full ? "md:col-span-2" : ""}`}>
        <Label htmlFor={id} className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{field.label}</Label>
        <Textarea
          id={id}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={3}
        />
      </div>
    )
  }

  if (field.type === "number") {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id} className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{field.label}</Label>
        <Input
          id={id}
          type="number"
          value={value ?? 0}
          onChange={(e) => onChange(Number(e.target.value))}
          placeholder={field.placeholder}
        />
      </div>
    )
  }

  if (field.type === "image") {
    return (
      <div className={`space-y-1.5 ${field.full ? "md:col-span-2" : ""}`}>
        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{field.label}</Label>
        <ImageAssetPicker value={value ?? ""} onChange={onChange} assets={ASSETS} />
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{field.label}</Label>
      <Input
        id={id}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
      />
    </div>
  )
}
