// ---------------------------------------------------------------------------
// /api/admin/analytics/actions/route.ts
//
// Customer & Operations Analytics quick actions. Each handler runs real
// SQL aggregations against the live Supabase database (no stubs, no log-
// only fallbacks). All invocations are audit-logged via the shared
// auditAction() helper.
//
// Currently supported:
//   analytics_view_bookings_funnel   — funnel events by stage
//   analytics_view_no_show_rate      — no-show rate over a date range
//   analytics_view_rebook_rate       — repeat-booking rate within 30 days
//
// These are SELECT-only operations; the audit log captures the call so the
// operator can see "who asked for the no-show report on what date range".
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/gate";
import { pgQuery } from "@/lib/pg";
import { TENANT_ID } from "@/lib/crm/enterprise";
import { auditAction, getActorIdFromRequest } from "@/lib/quick-actions/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const gate = await requireAdminApi();
  if (gate) return gate;

  let action = "";
  let payload: Record<string, unknown> = {};
  let actorId: string | null = null;
  let ip: string | null = null;

  try {
    const body = await req.json();
    action = String(body.action || "");
    payload = body.payload ?? body;
    delete (payload as Record<string, unknown>).action;
    actorId = await getActorIdFromRequest(req);
    ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  } catch (e) {
    return NextResponse.json({ error: `Invalid request body: ${e instanceof Error ? e.message : "unknown"}` }, { status: 400 });
  }

  const shortAction = action.replace(/^[a-z]+_/, "");

  try {
    switch (shortAction) {
      case "view_bookings_funnel":
      case "bookings_funnel":
      case "funnel": {
        // analytics_view_bookings_funnel → view_bookings_funnel
        // Aggregate crm_funnel_events by event_type over a date range.
        // CHECK constraint on event_type only allows:
        //   website_visit | account_created | intake_started | intake_completed |
        //   booking_started | booking_completed
        const startDate = String(payload.start_date || payload.from_date || "");
        const endDate = String(payload.end_date || payload.to_date || "");
        const dateFilter = startDate && endDate
          ? `AND occurred_at::date BETWEEN $2::date AND $3::date`
          : "";
        const params: unknown[] = [TENANT_ID()];
        if (startDate && endDate) params.push(startDate, endDate);
        const rows = await pgQuery<{ event_type: string; count: string }>(
          `SELECT event_type, COUNT(*)::text AS count
             FROM public.crm_funnel_events
            WHERE tenant_id = $1
            ${dateFilter}
            GROUP BY event_type
            ORDER BY
              CASE event_type
                WHEN 'website_visit' THEN 1
                WHEN 'account_created' THEN 2
                WHEN 'intake_started' THEN 3
                WHEN 'intake_completed' THEN 4
                WHEN 'booking_started' THEN 5
                WHEN 'booking_completed' THEN 6
                ELSE 99
              END`,
          params,
        );
        // Build the funnel with all 6 canonical stages (zero-filled)
        const STAGES = ["website_visit", "account_created", "intake_started", "intake_completed", "booking_started", "booking_completed"];
        const counts: Record<string, number> = {};
        for (const s of STAGES) {
          counts[s] = Number(rows.find(r => r.event_type === s)?.count || 0);
        }
        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        const result = {
          dateRange: { from: startDate || null, to: endDate || null },
          stages: STAGES.map(stage => ({ stage, count: counts[stage] })),
          totalEvents: total,
        };
        await auditAction({ action, domain: "crm", tableName: "crm_funnel_events", recordId: null, afterData: result, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, bookingsFunnel: result });
      }

      case "view_no_show_rate":
      case "no_show_rate":
      case "no_show": {
        // analytics_view_no_show_rate → view_no_show_rate
        // Compute the no-show rate over a date range.
        // crm_appointments.status CHECK enum includes: precheck, deposit_paid,
        // scheduled, assigned, waiting_checkin, confirmed, checked_in, in_service,
        // hold, completed, no_show, cancelled, rescheduled.
        // No-show rate = (no_show count) / (no_show + completed + cancelled)
        const startDate = String(payload.start_date || payload.from_date || "");
        const endDate = String(payload.end_date || payload.to_date || "");
        const dateFilter = startDate && endDate
          ? `AND starts_at::date BETWEEN $2::date AND $3::date`
          : "";
        const params: unknown[] = [TENANT_ID()];
        if (startDate && endDate) params.push(startDate, endDate);
        const rows = await pgQuery<{ status: string; count: string }>(
          `SELECT status, COUNT(*)::text AS count
             FROM public.crm_appointments
            WHERE tenant_id = $1
              AND status IN ('no_show','completed','cancelled','confirmed')
            ${dateFilter}
            GROUP BY status`,
          params,
        );
        const noShow = Number(rows.find(r => r.status === "no_show")?.count || 0);
        const completed = Number(rows.find(r => r.status === "completed")?.count || 0);
        const cancelled = Number(rows.find(r => r.status === "cancelled")?.count || 0);
        const confirmed = Number(rows.find(r => r.status === "confirmed")?.count || 0);
        const denominator = noShow + completed + cancelled + confirmed;
        const rate = denominator > 0 ? (noShow / denominator) : 0;
        const result = {
          dateRange: { from: startDate || null, to: endDate || null },
          counts: { noShow, completed, cancelled, confirmed, totalAppointments: denominator },
          noShowRate: rate,
          noShowRatePct: Number((rate * 100).toFixed(2)),
        };
        await auditAction({ action, domain: "crm", tableName: "crm_appointments", recordId: null, afterData: result, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, noShowRate: result });
      }

      case "view_rebook_rate":
      case "rebook_rate":
      case "rebook": {
        // analytics_view_rebook_rate → view_rebook_rate
        // Compute the rebook rate: customers with >=2 appointments where
        // the second appointment starts within 30 days of the first's
        // completion. Denominator = unique customers with >=1 completed appt.
        const startDate = String(payload.start_date || payload.from_date || "");
        const endDate = String(payload.end_date || payload.to_date || "");
        const dateFilter = startDate && endDate
          ? `AND a1.starts_at::date BETWEEN $2::date AND $3::date`
          : "";
        const params: unknown[] = [TENANT_ID()];
        if (startDate && endDate) params.push(startDate, endDate);
        // Customers with >= 1 completed/confirmed appointment in the range
        const totals = await pgQuery<{ total_customers: string }>(
          `SELECT COUNT(DISTINCT customer_id)::text AS total_customers
             FROM public.crm_appointments
            WHERE tenant_id = $1
              AND status IN ('completed','confirmed')
              ${dateFilter}
              AND customer_id IS NOT NULL`,
          params,
        );
        const totalCustomers = Number(totals[0]?.total_customers || 0);
        // Customers with >= 2 appointments within 30 days of each other.
        // We use a self-join on the appointments table directly (NOT a CTE
        // alias — the CTE causes a scope bug where a1 isn't visible).
        const rebookers = await pgQuery<{ rebook_customers: string }>(
          `SELECT COUNT(DISTINCT a1.customer_id)::text AS rebook_customers
             FROM public.crm_appointments a1
             JOIN public.crm_appointments a2
               ON a1.customer_id = a2.customer_id
              AND a1.tenant_id = a2.tenant_id
              AND a1.starts_at < a2.starts_at
              AND a2.starts_at <= a1.starts_at + INTERVAL '30 days'
            WHERE a1.tenant_id = $1
              AND a1.status IN ('completed','confirmed')
              AND a2.status IN ('completed','confirmed')
              ${dateFilter ? `AND a1.starts_at::date BETWEEN $2::date AND $3::date` : ''}
              AND a1.customer_id IS NOT NULL`,
          params,
        );
        const rebookCustomers = Number(rebookers[0]?.rebook_customers || 0);
        const rate = totalCustomers > 0 ? (rebookCustomers / totalCustomers) : 0;
        const result = {
          dateRange: { from: startDate || null, to: endDate || null },
          counts: { totalCustomers, rebookCustomers },
          rebookRate: rate,
          rebookRatePct: Number((rate * 100).toFixed(2)),
        };
        await auditAction({ action, domain: "crm", tableName: "crm_appointments", recordId: null, afterData: result, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, rebookRate: result });
      }

      // ───────────────────────────────────────────────────────────────────
      // ENTITY REPORTS — 10 SQL aggregation reports that surface business
      // metrics across the live data. Each handler runs direct SQL against
      // the relevant tables (no RPC functions needed — these are simple
      // GROUP BY aggregations). All invocations are audit-logged.
      // ───────────────────────────────────────────────────────────────────

      case "view_daily_revenue":
      case "daily_revenue":
      case "daily_revenue_summary": {
        // analytics_view_daily_revenue → view_daily_revenue
        // Daily revenue from succeeded commerce_payments, optionally
        // grouped by day over the date range. Includes payment count and
        // average ticket.
        const startDate = String(payload.start_date || payload.from_date || "");
        const endDate = String(payload.end_date || payload.to_date || "");
        const dateFilter = startDate && endDate
          ? `AND created_at::date BETWEEN $2::date AND $3::date`
          : "";
        const params: unknown[] = [TENANT_ID()];
        if (startDate && endDate) params.push(startDate, endDate);
        const rows = await pgQuery<{ day: string; count: string; revenue: string }>(
          `SELECT DATE(created_at)::text AS day, COUNT(*)::text AS count, COALESCE(SUM(amount),0)::text AS revenue
             FROM public.commerce_payments
            WHERE tenant_id = $1 AND status = 'succeeded'
            ${dateFilter}
            GROUP BY DATE(created_at) ORDER BY day DESC LIMIT 90`,
          params,
        );
        const days = rows.map(r => ({ date: r.day, paymentCount: Number(r.count), revenue: Number(r.revenue) }));
        const totals = {
          totalRevenue: days.reduce((s, d) => s + d.revenue, 0),
          totalPayments: days.reduce((s, d) => s + d.paymentCount, 0),
          dayCount: days.length,
          avgDailyRevenue: days.length > 0 ? days.reduce((s, d) => s + d.revenue, 0) / days.length : 0,
          avgTicket: days.length > 0 && days.reduce((s, d) => s + d.paymentCount, 0) > 0
            ? days.reduce((s, d) => s + d.revenue, 0) / days.reduce((s, d) => s + d.paymentCount, 0)
            : 0,
        };
        const result = { dateRange: { from: startDate || null, to: endDate || null }, days, totals };
        await auditAction({ action, domain: "commerce", tableName: "commerce_payments", recordId: null, afterData: { totals }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, dailyRevenue: result });
      }

      case "view_service_revenue":
      case "service_revenue":
      case "service_report": {
        // analytics_view_service_revenue → view_service_revenue
        // Revenue and appointment count grouped by service_type_confirmed
        // from crm_appointments. Null service types are bucketed as
        // "(unspecified)".
        const startDate = String(payload.start_date || payload.from_date || "");
        const endDate = String(payload.end_date || payload.to_date || "");
        const dateFilter = startDate && endDate
          ? `AND starts_at::date BETWEEN $2::date AND $3::date`
          : "";
        const params: unknown[] = [TENANT_ID()];
        if (startDate && endDate) params.push(startDate, endDate);
        const rows = await pgQuery<{ service_type: string | null; count: string; revenue: string }>(
          `SELECT COALESCE(NULLIF(service_type_confirmed, ''), '(unspecified)') AS service_type,
                  COUNT(*)::text AS count,
                  COALESCE(SUM(total),0)::text AS revenue
             FROM public.crm_appointments
            WHERE tenant_id = $1
            ${dateFilter}
            GROUP BY service_type ORDER BY revenue DESC`,
          params,
        );
        const services = rows.map(r => ({ serviceType: r.service_type, appointmentCount: Number(r.count), revenue: Number(r.revenue) }));
        const result = {
          dateRange: { from: startDate || null, to: endDate || null },
          services,
          totals: {
            totalRevenue: services.reduce((s, r) => s + r.revenue, 0),
            totalAppointments: services.reduce((s, r) => s + r.appointmentCount, 0),
            serviceCount: services.length,
          },
        };
        await auditAction({ action, domain: "crm", tableName: "crm_appointments", recordId: null, afterData: { totals: result.totals }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, serviceRevenue: result });
      }

      case "view_product_sales":
      case "product_sales":
      case "product_report": {
        // analytics_view_product_sales → view_product_sales
        // Revenue grouped by product from commerce_orders. Since orders
        // don't have line items normalized per product in this table, we
        // group by order as a proxy and report the order count + total.
        // (When the commerce_order_items table has data, this can be
        // rewritten to join against it.)
        const startDate = String(payload.start_date || payload.from_date || "");
        const endDate = String(payload.end_date || payload.to_date || "");
        const dateFilter = startDate && endDate
          ? `AND created_at::date BETWEEN $2::date AND $3::date`
          : "";
        const params: unknown[] = [TENANT_ID()];
        if (startDate && endDate) params.push(startDate, endDate);
        const rows = await pgQuery<{ status: string; count: string; revenue: string }>(
          `SELECT status, COUNT(*)::text AS count, COALESCE(SUM(total_amount::numeric),0)::text AS revenue
             FROM public.commerce_orders
            WHERE tenant_id = $1
            ${dateFilter}
            GROUP BY status ORDER BY revenue DESC`,
          params,
        );
        const products = rows.map(r => ({ status: r.status, orderCount: Number(r.count), revenue: Number(r.revenue) }));
        const result = {
          dateRange: { from: startDate || null, to: endDate || null },
          products,
          totals: {
            totalRevenue: products.reduce((s, r) => s + r.revenue, 0),
            totalOrders: products.reduce((s, r) => s + r.orderCount, 0),
          },
        };
        await auditAction({ action, domain: "commerce", tableName: "commerce_orders", recordId: null, afterData: { totals: result.totals }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, productSales: result });
      }

      case "view_multi_location_revenue":
      case "multi_location_revenue":
      case "location_report": {
        // analytics_view_multi_location_revenue → view_multi_location_revenue
        // Revenue and appointment count grouped by location from
        // crm_appointments. Joins crm_locations for the location name.
        const startDate = String(payload.start_date || payload.from_date || "");
        const endDate = String(payload.end_date || payload.to_date || "");
        const dateFilter = startDate && endDate
          ? `AND a.starts_at::date BETWEEN $2::date AND $3::date`
          : "";
        const params: unknown[] = [TENANT_ID()];
        if (startDate && endDate) params.push(startDate, endDate);
        const rows = await pgQuery<{ location_id: string | null; location_name: string | null; count: string; revenue: string }>(
          `SELECT a.location_id, COALESCE(l.name, '(unspecified)') AS location_name,
                  COUNT(*)::text AS count, COALESCE(SUM(a.total),0)::text AS revenue
             FROM public.crm_appointments a
             LEFT JOIN public.crm_locations l ON l.id = a.location_id
            WHERE a.tenant_id = $1
            ${dateFilter}
            GROUP BY a.location_id, l.name ORDER BY revenue DESC`,
          params,
        );
        const locations = rows.map(r => ({
          locationId: r.location_id, locationName: r.location_name,
          appointmentCount: Number(r.count), revenue: Number(r.revenue),
        }));
        const result = {
          dateRange: { from: startDate || null, to: endDate || null },
          locations,
          totals: {
            totalRevenue: locations.reduce((s, r) => s + r.revenue, 0),
            totalAppointments: locations.reduce((s, r) => s + r.appointmentCount, 0),
            locationCount: locations.length,
          },
        };
        await auditAction({ action, domain: "crm", tableName: "crm_appointments", recordId: null, afterData: { totals: result.totals }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, multiLocationRevenue: result });
      }

      case "view_groomer_performance":
      case "groomer_performance":
      case "groomer_report": {
        // analytics_view_groomer_performance → view_groomer_performance
        // Revenue + appointment count + completed count grouped by groomer
        // (assigned_groomer_id) from crm_appointments. Joins crm_staff for
        // the groomer's display name.
        const startDate = String(payload.start_date || payload.from_date || "");
        const endDate = String(payload.end_date || payload.to_date || "");
        const dateFilter = startDate && endDate
          ? `AND a.starts_at::date BETWEEN $2::date AND $3::date`
          : "";
        const params: unknown[] = [TENANT_ID()];
        if (startDate && endDate) params.push(startDate, endDate);
        const rows = await pgQuery<{
          groomer_id: string | null; groomer_name: string | null;
          appt_count: string; completed_count: string; revenue: string;
        }>(
          `SELECT a.assigned_groomer_id AS groomer_id,
                  COALESCE(s.display_name, '(unassigned)') AS groomer_name,
                  COUNT(*)::text AS appt_count,
                  COUNT(*) FILTER (WHERE a.status = 'completed')::text AS completed_count,
                  COALESCE(SUM(a.total),0)::text AS revenue
             FROM public.crm_appointments a
             LEFT JOIN public.crm_staff s ON s.id = a.assigned_groomer_id
            WHERE a.tenant_id = $1
            ${dateFilter}
            GROUP BY a.assigned_groomer_id, s.display_name ORDER BY revenue DESC`,
          params,
        );
        const groomers = rows.map(r => ({
          groomerId: r.groomer_id, groomerName: r.groomer_name,
          appointmentCount: Number(r.appt_count), completedCount: Number(r.completed_count),
          revenue: Number(r.revenue),
          completionRate: Number(r.appt_count) > 0 ? Number(r.completed_count) / Number(r.appt_count) : 0,
        }));
        const result = {
          dateRange: { from: startDate || null, to: endDate || null },
          groomers,
          totals: {
            totalRevenue: groomers.reduce((s, r) => s + r.revenue, 0),
            totalAppointments: groomers.reduce((s, r) => s + r.appointmentCount, 0),
            totalCompleted: groomers.reduce((s, r) => s + r.completedCount, 0),
            groomerCount: groomers.length,
          },
        };
        await auditAction({ action, domain: "crm", tableName: "crm_appointments", recordId: null, afterData: { totals: result.totals }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, groomerPerformance: result });
      }

      case "view_customer_acquisition":
      case "customer_acquisition":
      case "acquisition_report": {
        // analytics_view_customer_acquisition → view_customer_acquisition
        // New customers per month from crm_customers. Returns the last 12
        // months of acquisition data plus a cumulative total.
        const rows = await pgQuery<{ month: string; count: string }>(
          `SELECT DATE_TRUNC('month', created_at)::text AS month,
                  COUNT(*)::text AS count
             FROM public.crm_customers
            WHERE tenant_id = $1 AND is_active = true
            GROUP BY month ORDER BY month DESC LIMIT 12`,
          [TENANT_ID()],
        );
        const months = rows.map(r => ({ month: r.month.slice(0, 7), newCustomers: Number(r.count) }));
        const result = {
          months,
          totals: {
            totalCustomers: months.reduce((s, r) => s + r.newCustomers, 0),
            avgPerMonth: months.length > 0 ? months.reduce((s, r) => s + r.newCustomers, 0) / months.length : 0,
            monthCount: months.length,
          },
        };
        await auditAction({ action, domain: "crm", tableName: "crm_customers", recordId: null, afterData: { totals: result.totals }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, customerAcquisition: result });
      }

      case "view_ar_aging":
      case "ar_aging": {
        // analytics_view_ar_aging → view_ar_aging
        // AR aging report: outstanding invoices grouped by age bucket
        // (current, 1-30, 31-60, 61-90, 90+). Uses acct_ar_invoices
        // with status 'posted' or 'partially_paid' and outstanding > 0.
        const asOfDate = String(payload.as_of_date || payload.end_date || "");
        const rows = await pgQuery<{ invoice_id: string; invoice_number: string; customer_id: string | null; total: string; amount_paid: string; outstanding: string; days_outstanding: string }>(
          `SELECT id AS invoice_id, invoice_number, customer_id,
                  total::text, amount_paid::text,
                  (total - amount_paid)::text AS outstanding,
                  (CASE WHEN due_date IS NULL THEN 0
                        ELSE GREATEST(EXTRACT(DAY FROM ${asOfDate ? "$2::date" : "CURRENT_DATE"} - due_date)::int, 0)
                   END)::text AS days_outstanding
             FROM public.acct_ar_invoices
            WHERE tenant_id = $1
              AND status IN ('posted','partially_paid','approved')
              AND total > amount_paid
            ORDER BY days_outstanding DESC`,
          asOfDate ? [TENANT_ID(), asOfDate] : [TENANT_ID()],
        );
        const invoices = rows.map(r => {
          const days = Number(r.days_outstanding);
          let bucket = "current";
          if (days > 90) bucket = "90+";
          else if (days > 60) bucket = "61-90";
          else if (days > 30) bucket = "31-60";
          else if (days > 0) bucket = "1-30";
          return {
            invoiceId: r.invoice_id, invoiceNumber: r.invoice_number, customerId: r.customer_id,
            total: Number(r.total), amountPaid: Number(r.amount_paid),
            outstanding: Number(r.outstanding), daysOutstanding: days, bucket,
          };
        });
        const buckets = ["current", "1-30", "31-60", "61-90", "90+"].map(b => {
          const inBucket = invoices.filter(i => i.bucket === b);
          return {
            bucket: b,
            count: inBucket.length,
            outstanding: inBucket.reduce((s, i) => s + i.outstanding, 0),
          };
        });
        const result = {
          asOfDate: asOfDate || new Date().toISOString().slice(0, 10),
          buckets,
          invoices,
          totals: {
            totalOutstanding: invoices.reduce((s, i) => s + i.outstanding, 0),
            invoiceCount: invoices.length,
          },
        };
        await auditAction({ action, domain: "acct", tableName: "acct_ar_invoices", recordId: null, afterData: { totals: result.totals }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, arAging: result });
      }

      case "view_gift_card_liability":
      case "gift_card_liability": {
        // analytics_view_gift_card_liability → view_gift_card_liability
        // Outstanding gift card balances grouped by status. The "liability"
        // is the sum of balances still outstanding (i.e. active cards only —
        // converted/replaced/cancelled cards have balance=0).
        const rows = await pgQuery<{ status: string; count: string; liability: string }>(
          `SELECT status, COUNT(*)::text AS count, COALESCE(SUM(balance),0)::text AS liability
             FROM public.commerce_gift_cards
            WHERE tenant_id = $1
            GROUP BY status ORDER BY liability DESC`,
          [TENANT_ID()],
        );
        const byStatus = rows.map(r => ({ status: r.status, cardCount: Number(r.count), liability: Number(r.liability) }));
        const result = {
          byStatus,
          totals: {
            totalLiability: byStatus.reduce((s, r) => s + r.liability, 0),
            totalCards: byStatus.reduce((s, r) => s + r.cardCount, 0),
            activeLiability: Number(byStatus.find(r => r.status === "active")?.liability || 0),
            activeCards: Number(byStatus.find(r => r.status === "active")?.cardCount || 0),
          },
        };
        await auditAction({ action, domain: "acct", tableName: "commerce_gift_cards", recordId: null, afterData: { totals: result.totals }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, giftCardLiability: result });
      }

      case "view_store_credit_liability":
      case "store_credit_liability": {
        // analytics_view_store_credit_liability → view_store_credit_liability
        // Outstanding store credit balances grouped by status. Same
        // shape as the gift card liability report.
        const rows = await pgQuery<{ status: string; count: string; liability: string }>(
          `SELECT status, COUNT(*)::text AS count, COALESCE(SUM(balance),0)::text AS liability
             FROM public.commerce_store_credits
            WHERE tenant_id = $1
            GROUP BY status ORDER BY liability DESC`,
          [TENANT_ID()],
        );
        const byStatus = rows.map(r => ({ status: r.status, creditCount: Number(r.count), liability: Number(r.liability) }));
        const result = {
          byStatus,
          totals: {
            totalLiability: byStatus.reduce((s, r) => s + r.liability, 0),
            totalCredits: byStatus.reduce((s, r) => s + r.creditCount, 0),
            activeLiability: Number(byStatus.find(r => r.status === "active")?.liability || 0),
            activeCredits: Number(byStatus.find(r => r.status === "active")?.creditCount || 0),
          },
        };
        await auditAction({ action, domain: "acct", tableName: "commerce_store_credits", recordId: null, afterData: { totals: result.totals }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, storeCreditLiability: result });
      }

      case "view_deposit_liability":
      case "deposit_liability": {
        // analytics_view_deposit_liability → view_deposit_liability
        // Held deposits grouped by status. "Held" deposits are the
        // salon's liability — they owe the customer either the service
        // or the refund.
        const rows = await pgQuery<{ status: string; count: string; liability: string }>(
          `SELECT status, COUNT(*)::text AS count, COALESCE(SUM(amount),0)::text AS liability
             FROM public.commerce_deposits
            WHERE tenant_id = $1
            GROUP BY status ORDER BY liability DESC`,
          [TENANT_ID()],
        );
        const byStatus = rows.map(r => ({ status: r.status, depositCount: Number(r.count), liability: Number(r.liability) }));
        const result = {
          byStatus,
          totals: {
            totalLiability: byStatus.reduce((s, r) => s + r.liability, 0),
            totalDeposits: byStatus.reduce((s, r) => s + r.depositCount, 0),
            heldLiability: Number(byStatus.find(r => r.status === "held")?.liability || 0),
            heldDeposits: Number(byStatus.find(r => r.status === "held")?.depositCount || 0),
          },
        };
        await auditAction({ action, domain: "acct", tableName: "commerce_deposits", recordId: null, afterData: { totals: result.totals }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, depositLiability: result });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action} (short: ${shortAction})` }, { status: 400 });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[analytics/actions] ${action} failed:`, msg);
    return NextResponse.json({ error: msg, action }, { status: 500 });
  }
}
