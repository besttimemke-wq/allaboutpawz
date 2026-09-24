import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/gate";
import { withPg, TENANT_ID } from "@/lib/crm/enterprise";

function num(v: any): number { return Math.round((parseFloat(String(v ?? "0")) || 0) * 100) / 100; }

export async function GET(req: NextRequest) {
  const gate = await requireAdminApi(); if (gate) return gate;
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "200") || 200, 500);
  return withPg(async (client) => {
    const tenant = TENANT_ID();
    const r = await client.query(
      `SELECT cp.id::text, cp.payment_number, cp.amount, cp.tip_amount, cp.currency, cp.status,
              cp.processor_transaction_id, cp.external_reference, cp.created_at,
              cc.first_name AS customer_first_name, cc.last_name AS customer_last_name, cc.email AS customer_email,
              COALESCE(pm.name, 'Other') AS tender_name,
              s.display_name AS staff_name
       FROM public.commerce_payments cp
       LEFT JOIN public.crm_customers cc ON cc.id = cp.customer_id
       LEFT JOIN public.commerce_payment_methods pm ON pm.id = cp.payment_method_id
       LEFT JOIN public.crm_staff s ON s.id = cp.staff_id
       WHERE cp.tenant_id = $1
       ORDER BY cp.created_at DESC LIMIT $2`,
      [tenant, limit],
    );
    return NextResponse.json({
      payments: r.rows.map((row: any) => ({
        id: row.payment_number || row.id,
        customer: [row.customer_first_name, row.customer_last_name].filter(Boolean).join(" ").trim() || row.customer_email || "Walk-in",
        amount: num(row.amount),
        tips: num(row.tip_amount),
        tender: row.tender_name,
        status: String(row.status || "").toLowerCase() === "succeeded" || String(row.status || "").toLowerCase() === "captured" ? "PAID" : String(row.status || "").toUpperCase(),
        date: row.created_at ? new Date(row.created_at).toISOString().slice(0, 10) : null,
        time: row.created_at ? new Date(row.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : null,
        reference: row.processor_transaction_id || row.external_reference || row.tender_name,
        staff: row.staff_name || "—",
      })),
      total: r.rows.length,
    });
  }).then((r) => r ?? NextResponse.json({ error: "DB unavailable" }, { status: 503 }))
    .catch((e: any) => NextResponse.json({ error: e?.message }, { status: 500 }));
}
