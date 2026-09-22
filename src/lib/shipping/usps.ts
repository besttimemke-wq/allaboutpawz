// ---------------------------------------------------------------------------
// shipping/usps.ts — shared USPS tracking helper used by:
//   • /api/admin/shipping/usps        (single-order tracking)
//   • /api/admin/shipping/usps/poll   (bulk background refresh)
//   • /api/admin/shipping             (track_usps action delegates here)
//
// Two modes:
//   1. USPS_USER_ID env var set → call the legacy USPS TrackV2 XML API at
//      https://meps.usps.com/cgi-bin/uspsapi and parse <TrackSummary>.
//   2. USPS_USER_ID not set (typical for dev) → deterministic simulation
//      based on the last digit of the tracking number so the dev test flow
//      works without real USPS creds. Even digit → delivered; odd → in
//      transit. This keeps the fulfillment state machine exercisable.
//
// On every tracking lookup, this helper:
//   • UPDATEs commerce_orders (tracking_number, carrier, tracking_status,
//     status, fulfillment_status)
//   • INSERTs a commerce_fulfillment_events row (the chronological status
//     history the owner's schema prescribes)
//   • UPSERTs a commerce_shipping_labels row (carrier, tracking_number,
//     postage_amount=null until a real label is purchased)
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

export async function trackUsps(trackingNumber: string): Promise<UspsTrackResult> {
  const clean = String(trackingNumber || "").trim()
  if (!clean) {
    return { status: "UNKNOWN", summary: "No tracking number provided.", isDelivered: false, simulated: false }
  }

  const userId = process.env.USPS_USER_ID

  // ---- Simulation fallback (dev) ----------------------------------------
  if (!userId) {
    const digits = clean.replace(/[^0-9]/g, "")
    const last = digits ? digits.slice(-1) : ""
    const even = last !== "" && parseInt(last, 10) % 2 === 0
    const isDelivered = !!even
    return {
      status: isDelivered ? "DELIVERED" : "IN_TRANSIT",
      summary: isDelivered
        ? "Delivered (USPS simulation mode — set USPS_USER_ID for live tracking)."
        : "In transit (USPS simulation mode — set USPS_USER_ID for live tracking).",
      isDelivered,
      simulated: true,
    }
  }

  // ---- Live USPS XML API ------------------------------------------------
  try {
    const xml = `<TrackRequest USERID="${userId}"><TrackID ID="${clean}"></TrackID></TrackRequest>`
    const url = `https://meps.usps.com/cgi-bin/uspsapi?API=TrackV2&XML=${encodeURIComponent(xml)}`
    const res = await fetch(url, { method: "GET" })
    const txt = await res.text()
    const m = txt.match(/<TrackSummary>([\s\S]*?)<\/TrackSummary>/i)
    const summary = m ? m[1].trim() : "No tracking summary available."
    const isDelivered = /delivered/i.test(summary)
    return {
      status: isDelivered ? "DELIVERED" : "IN_TRANSIT",
      summary,
      isDelivered,
      simulated: false,
    }
  } catch (e: any) {
    return {
      status: "UNKNOWN",
      summary: `USPS tracking failed: ${e?.message || "unknown error"}`,
      isDelivered: false,
      simulated: false,
    }
  }
}

// Apply a USPS tracking lookup to a single commerce_orders row and persist
// the result. Writes:
//   • commerce_orders UPDATE (tracking + status)
//   • commerce_fulfillment_events INSERT (the chronological status history)
//   • commerce_shipping_labels UPSERT (carrier + tracking_number)
// Also revalidates the admin/customer order pages so the new status shows up
// immediately. Never throws — the caller is a route handler.
export async function applyUspsTrackingToOrder(
  orderId: string,
  trackingNumber: string,
): Promise<{ ok: boolean; order: any; result: UspsTrackResult; error?: string }> {
  try {
    const result = await trackUsps(trackingNumber)
    const tenant = TENANT_ID()

    // 1. Load the current order so we can record old_status in the event log.
    const existing = await repo.get("commerce_orders", orderId).catch(() => null)
    const oldStatus = (existing as any)?.fulfillment_status || "pending"
    const newStatus = result.isDelivered ? "delivered" : "shipped"

    // 2. UPDATE commerce_orders.
    const updated = (await repo.update("commerce_orders", orderId, {
      tracking_number: trackingNumber,
      carrier: "USPS",
      tracking_status: result.status,
      status: result.isDelivered ? "delivered" : "shipped",
      fulfillment_status: newStatus,
      updated_at: new Date().toISOString(),
    } as any)) as any

    // 3. INSERT a fulfillment event (the chronological status history the
    //    owner's schema prescribes). Non-fatal.
    await withPg(async (client) => {
      await client.query(
        `INSERT INTO public.commerce_fulfillment_events
           (tenant_id, order_id, event_type, old_status, new_status, payload)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          tenant,
          orderId,
          result.isDelivered ? "delivered" : "tracking_updated",
          oldStatus,
          newStatus,
          JSON.stringify({
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

    // 4. UPSERT a shipping label row (so the admin can see every label ever
    //    generated for the order). Non-fatal.
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
