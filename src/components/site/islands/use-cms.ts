"use client"

import { useEffect, useState } from "react"

// ---------------------------------------------------------------------------
// Client-side CMS fetching — the CSR data layer for the public site.
//
// Pages render their shell statically (no database at build/render time).
// Data-driven sections are client islands that fetch from the site's own API
// (/api/cms/*) AFTER the initial paint, exactly like the booking wizard:
// skeleton while loading, content when it arrives. The API routes hold the
// Supabase credentials server-side — the browser never needs any keys.
// ---------------------------------------------------------------------------

export function useCms<T = any>(resource: string): { data: T[]; loading: boolean } {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch(`/api/cms/${resource}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => {
        if (!alive) return
        setData(Array.isArray(d) ? d : [])
        setLoading(false)
      })
      .catch(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [resource])

  return { data, loading }
}

export function useCmsSettings(): { settings: Record<string, string>; loading: boolean } {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch("/api/cms/settings")
      .then((r) => (r.ok ? r.json() : {}))
      .then((d) => {
        if (!alive) return
        setSettings(d && typeof d === "object" && !Array.isArray(d) ? d : {})
        setLoading(false)
      })
      .catch(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  return { settings, loading }
}

// Rows the admin marked hidden must not render on the public site
// (same truthy check the server-side site-data layer used).
export function visibleOnly<T extends { visible?: boolean }>(rows: T[]): T[] {
  return rows.filter((r) => r.visible)
}
