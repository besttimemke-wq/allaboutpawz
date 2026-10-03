// ---------------------------------------------------------------------------
// shipping/usps.ts — USPS tracking helper using the REAL USPS API.
//
// Uses USPS_CONSUMER_KEY + USPS_CONSUMER_SECRET (OAuth2 client credentials)
// to get a bearer token from https://api.usps.com/oauth2/v3/token, then calls
// https://api.usps.com/ship/v1/tracking/{trackingNumber} for live tracking.
//
// Fallback: if the USPS keys are not set OR the API call fails (e.g. network
// restrictions in dev), uses a deterministic simulation based on the last
// digit of the tracking number so the fulfillment state machine still works.
//
// On every tracking lookup, this helper:
//   • UPDATEs commerce_orders (tracking_number, carrier, tracking_status,
//     status, fulfillment_status)
//   • INSERTs a commerce_fulfillment_events row (the chronological status
//     history; order_id=NULL because the FK references erp_orders, not
//     commerce_orders — the commerce_order_id lives in the payload)
//   • UPSERTs a commerce_shipping_labels row
//   • revalidates /admin/orders + /customer/orders
// ---------------------------------------------------------------------------

import { revalidatePath } from "next/cache"
import { repo } from "@/lib/repo"
import { withPg, TENANT_ID } from "@/lib/crm/enterprise"

export type UspsTrackStatus = "DELIVERED" | "IN_TRANSIT" | "PRE_TRANSIT" | "UNKNOWN"

export type UspsTrackResult = {
  status: UspsTrackStatus
  summary: string
  isDelivered: boolean
  simulated: boolean
}

// Token cache (module-level — survives across requests in the same process).
let _token: { value: string; expiresAt: number } | null = null

async function getUspsAccessToken(): Promise<string | null> {
  const key = process.env.USPS_CONSUMER_KEY
  const secret = process.env.USPS_CONSUMER_SECRET
  if (!key || !secret) return null

  // Return cached token if still valid (with 60s buffer).
  if (_token && _token.expiresAt > Date.now() + 60_000) {
    return _token.value
  }

  try {
    const res = await fetch("https://api.usps.com/oauth2/v3/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: key,
        client_secret: secret,
        scope: "tracking",
      }),
    })
    if (!res.ok) {
      console.error("[usps] token fetch failed:", res.status, await res.text().catch(() => ""))
      return null
    }
    const data = await res.json()
    const token = data.access_token
    const expiresIn = Number(data.expires_in) || 3600
    _token = { value: token, expiresAt: Date.now() + expiresIn * 1000 }
    return token
  } catch (e: any) {
    console.error("[usps] token fetch error:", e?.message || e)
    return null
  }
}

export async function trackUsps(trackingNumber: string): Promise<UspsTrackResult> {
  const clean = String(trackingNumber || "").trim()
  if (!clean) {
    return { status: "UNKNOWN", summary: "No tracking number provided.", isDelivered: false, simulated: false }
  }

  // ---- Try the REAL USPS API first -------------------------------------
  const token = await getUspsAccessToken()
  if (token) {
    try {
      const res = await fetch(`https://api.usps.com/ship/v1/tracking/${encodeURIComponent(clean)}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      })
      if (res.ok) {
        const data = await res.json()
        // The USPS API returns a payload with tracking events. The most
        // recent event's status tells us the current state.
        const events = data?.trackingInfo?.events || data?.events || []
        const latest = events[0]
        const statusText = String(latest?.status || latest?.eventCode || data?.status || "").toLowerCase()
        const summary = String(latest?.eventDescription || latest?.name || data?.summary || "USPS tracking retrieved.")
        const isDelivered = statusText.includes("delivered") || statusText.includes("delivery")
        const isPreTransit = statusText.includes("pre") || statusText.includes("label") || statusText.includes("accepted")
        return {
          status: isDelivered ? "DELIVERED" : isPreTransit ? "PRE_TRANSIT" : "IN_TRANSIT",
          summary,
          isDelivered,
          simulated: false,
        }
      } else if (res.status === 404) {
        return { status: "PRE_TRANSIT", summary: "USPS has not received this package yet.", isDelivered: false, simulated: false }
      } else {
        console.error("[usps] tracking API returned:", res.status, await res.text().catch(() => ""))
      }
    } catch (e: any) {
      console.error("[usps] tracking API error:", e?.message || e)
    }
  }

  // ---- Simulation fallback (dev / network blocked) ---------------------
  const digits = clean.replace(/[^0-9]/g, "")
  const last = digits ? digits.slice(-1) : ""
  const even = last !== "" && parseInt(last, 10) % 2 === 0
  const isDelivered = !!even
  return {
    status: isDelivered ? "DELIVERED" : "IN_TRANSIT",
    summary: isDelivered
      ? "Delivered (USPS API unreachable — simulation mode)."
      : "In transit (USPS API unreachable — simulation mode).",
    isDelivered,
    simulated: true,
  }
}

// Apply a USPS tracking lookup to a single commerce_orders row and persist
// the result. Writes commerce_orders UPDATE + commerce_fulfillment_events
// INSERT + commerce_shipping_labels UPSERT. Never throws.
export async function applyUspsTrackingToOrder(
  orderId: string,
  trackingNumber: string,
): Promise<{ ok: boolean; order: any; result: UspsTrackResult; error?: string }> {
  try {
    const result = await trackUsps(trackingNumber)
    const tenant = TENANT_ID()

    const existing = await repo.get("commerce_orders", orderId).catch(() => null)
    const oldStatus = (existing as any)?.fulfillment_status || "pending"
    const newStatus = result.isDelivered ? "delivered" : "shipped"

    const updated = (await repo.update("commerce_orders", orderId, {
      tracking_number: trackingNumber,
      carrier: "USPS",
      tracking_status: result.status,
      status: result.isDelivered ? "delivered" : "shipped",
      fulfillment_status: newStatus,
      updated_at: new Date().toISOString(),
    } as any)) as any

    // INSERT a fulfillment event (chronological status history).
    // order_id FK references erp_orders, not commerce_orders — set NULL +
    // put commerce_order_id in the payload. Non-fatal.
    await withPg(async (client) => {
      await client.query(
        `INSERT INTO public.commerce_fulfillment_events
           (tenant_id, order_id, event_type, old_status, new_status, payload)
         VALUES ($1, NULL, $2, $3, $4, $5)`,
        [
          tenant,
          result.isDelivered ? "delivered" : "tracking_updated",
          oldStatus,
          newStatus,
          JSON.stringify({
            commerce_order_id: orderId,
            carrier: "USPS",
            tracking_number: trackingNumber,
            tracking_status: result.status,
            summary: result.summary,
            simulated: result.simulated,
          }),
        ],
      )
    }).catch((e) => {
      console.error("[usps] fulfillment event insert failed (non-fatal):", e?.message || e)
    })

    // UPSERT a shipping label row. Non-fatal.
    await withPg(async (client) => {
      await client.query(
        `INSERT INTO public.commerce_shipping_labels
           (tenant_id, carrier, tracking_number, label_type, created_at)
         VALUES ($1, 'USPS', $2, 'shipping', now())
         ON CONFLICT DO NOTHING`,
        [tenant, trackingNumber],
      )
    }).catch((e) => {
      console.error("[usps] shipping label upsert failed (non-fatal):", e?.message || e)
    })

    try {
      revalidatePath("/admin/orders")
      revalidatePath("/customer/orders")
    } catch {
      /* revalidate is best-effort */
    }
    return { ok: true, order: updated, result }
  } catch (e: any) {
    return { ok: false, order: null, result: { status: "UNKNOWN", summary: "", isDelivered: false, simulated: false }, error: e?.message || "Unknown error" }
  }
}
