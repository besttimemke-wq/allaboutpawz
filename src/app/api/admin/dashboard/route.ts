import { NextRequest, NextResponse } from "next/server";
import { withPg, TENANT_ID } from "@/lib/crm/enterprise";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/dashboard
// Returns all CRM dashboard KPIs in a single response — no round-trips.
// Each query is wrapped in try/catch so a missing table never 500s the
// entire dashboard; it returns 0 for that metric instead.
export async function GET(_req: NextRequest) {
  return withPg(async (client) => {
    const tenant = TENANT_ID();
    const safeCount = (rows: any[]) => (rows[0]?.count ? Number(rows[0].count) : 0);
    const safeNum = (rows: any[], key: string) => (rows[0]?.[key] ? Number(rows[0][key]) : 0);

    // ---- KPIs ----
    let todayAppointments = 0;
    let todayRevenue = 0;
    let newCustomers30d = 0;
    let noShowRate30d = 0;
    let rebookRate30d = 0;
    let staffOnDuty = 0;

    try {
      todayAppointments = safeCount(
        await client.query(
          `SELECT COUNT(*)::text FROM public.crm_appointments WHERE starts_at::date = CURRENT_DATE AND tenant_id = $1`,
          [tenant],
        ).then(r => r.rows),
      );
    } catch { /* table or column missing — return 0 */ }

    try {
      todayRevenue = safeNum(
        await client.query(
          `SELECT COALESCE(SUM(amount), 0)::text AS rev FROM public.commerce_payments WHERE status = 'succeeded' AND created_at::date = CURRENT_DATE AND tenant_id = $1`,
          [tenant],
        ).then(r => r.rows),
        "rev",
      );
    } catch { /* commerce_payments might not exist yet */ }

    try {
      newCustomers30d = safeCount(
        await client.query(
          `SELECT COUNT(*)::text FROM public.crm_customers WHERE created_at >= CURRENT_DATE - INTERVAL '30 days' AND tenant_id = $1`,
          [tenant],
        ).then(r => r.rows),
      );
    } catch { /* crm_customers might not exist yet */ }

    try {
      const noShowRows = await client.query(
        `SELECT COUNT(*) FILTER (WHERE status = 'no_show')::text AS no_show,
                COUNT(*)::text AS total
         FROM public.crm_appointments
         WHERE starts_at >= CURRENT_DATE - INTERVAL '30 days' AND tenant_id = $1`,
        [tenant],
      );
      const ns = Number(noShowRows.rows[0]?.no_show || 0);
      const total = Number(noShowRows.rows[0]?.total || 0);
      noShowRate30d = total > 0 ? Math.round((ns / total) * 100) : 0;
    } catch { /* return 0 */ }

    try {
      // Rebook rate: customers with >1 completed appointment in the last 30 days / total customers with appointments
      const rebookRows = await client.query(
        `SELECT COUNT(DISTINCT customer_id) FILTER (WHERE appt_count > 1)::text AS rebookers,
                COUNT(DISTINCT customer_id)::text AS total_customers
         FROM (
           SELECT customer_id, COUNT(*) AS appt_count
           FROM public.crm_appointments
           WHERE starts_at >= CURRENT_DATE - INTERVAL '30 days' AND tenant_id = $1
           GROUP BY customer_id
         ) sub`,
        [tenant],
      );
      const rebookers = Number(rebookRows.rows[0]?.rebookers || 0);
      const totalCusts = Number(rebookRows.rows[0]?.total_customers || 0);
      rebookRate30d = totalCusts > 0 ? Math.round((rebookers / totalCusts) * 100) : 0;
    } catch { /* return 0 */ }

    try {
      staffOnDuty = safeCount(
        await client.query(
          `SELECT COUNT(*)::text FROM public.crm_staff WHERE is_active = true AND tenant_id = $1`,
          [tenant],
        ).then(r => r.rows),
      );
    } catch { /* return 0 */ }

    // ---- Booking Funnel (30 days) ----
    let bookingFunnel: Array<{ stage: string; count: number }> = [];
    try {
      const funnelRows = await client.query(
        `SELECT event_type, COUNT(*)::text AS count
         FROM public.crm_funnel_events
         WHERE occurred_at >= CURRENT_DATE - INTERVAL '30 days' AND tenant_id = $1
         GROUP BY event_type`,
        [tenant],
      );
      const funnelMap: Record<string, number> = {};
      for (const row of funnelRows.rows) {
        funnelMap[row.event_type] = Number(row.count);
      }
      bookingFunnel = [
        { stage: "Website Visits", count: funnelMap["website_visit"] || 0 },
        { stage: "Accounts Created", count: funnelMap["account_created"] || 0 },
        { stage: "Intake Completed", count: funnelMap["intake_completed"] || 0 },
      ];
    } catch { /* return empty array */ }

    // ---- Alerts ----
    let vaccinationsExpiring = 0;
    let unsignedDocuments = 0;
    let upcomingBirthdays = 0;
    let lowInventory = 0;

    try {
      vaccinationsExpiring = safeCount(
        await client.query(
          `SELECT COUNT(*)::text FROM public.crm_pet_vaccinations
           WHERE expires_at IS NOT NULL AND expires_at <= CURRENT_DATE + INTERVAL '30 days'
           AND tenant_id = $1`,
          [tenant],
        ).then(r => r.rows),
      );
    } catch { /* return 0 */ }

    try {
      unsignedDocuments = safeCount(
        await client.query(
          `SELECT COUNT(*)::text FROM public.crm_documents
           WHERE (status = 'unsigned' OR signed_at IS NULL)
           AND tenant_id = $1`,
          [tenant],
        ).then(r => r.rows),
      );
    } catch { /* return 0 */ }

    try {
      // Pets with birthdays (date_of_birth month+day) in the next 30 days
      upcomingBirthdays = safeCount(
        await client.query(
          `SELECT COUNT(*)::text FROM public.crm_pets
           WHERE date_of_birth IS NOT NULL
           AND (
             (EXTRACT(MONTH FROM date_of_birth), EXTRACT(DAY FROM date_of_birth))
             BETWEEN (EXTRACT(MONTH FROM CURRENT_DATE), EXTRACT(DAY FROM CURRENT_DATE))
             AND (EXTRACT(MONTH FROM CURRENT_DATE + INTERVAL '30 days'), EXTRACT(DAY FROM CURRENT_DATE + INTERVAL '30 days'))
           )
           AND tenant_id = $1`,
          [tenant],
        ).then(r => r.rows),
      );
    } catch { /* return 0 */ }

    try {
      lowInventory = safeCount(
        await client.query(
          `SELECT COUNT(*)::text FROM public.inventory_items
           WHERE reorder_level IS NOT NULL AND stock <= reorder_level
           AND tenant_id = $1`,
          [tenant],
        ).then(r => r.rows),
      );
    } catch {
      // Fallback: try erp_low_inventory view
      try {
        lowInventory = safeCount(
          await client.query(`SELECT COUNT(*)::text FROM public.erp_low_inventory WHERE tenant_id = $1`, [tenant]).then(r => r.rows),
        );
      } catch { /* return 0 */ }
    }

    return NextResponse.json({
      kpis: {
        todayAppointments,
        todayRevenue: todayRevenue.toFixed(2),
        newCustomers30d,
        noShowRate30d,
        rebookRate30d,
        staffOnDuty,
      },
      bookingFunnel,
      alerts: {
        vaccinationsExpiring,
        unsignedDocuments,
        upcomingBirthdays,
        lowInventory,
      },
    });
  }).then(r => r ?? NextResponse.json({ error: "DB unavailable" }, { status: 503 }))
    .catch((e) => NextResponse.json({ error: e?.message || "Dashboard fetch failed" }, { status: 500 }));
}
