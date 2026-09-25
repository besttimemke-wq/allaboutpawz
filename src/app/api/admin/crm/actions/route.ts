import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/gate";
import { pgQuery, pgExec } from "@/lib/pg";
import { TENANT_ID } from "@/lib/crm/enterprise";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const gate = await requireAdminApi();
  if (gate) return gate;
  try {
    const body = await req.json();
    const { action, ...payload } = body;
    switch (action) {
      case 'add_customer': {
        const { first_name, last_name, email, phone } = payload;
        const rows = await pgQuery(`INSERT INTO public.crm_customers (id, tenant_id, customer_type, lifecycle_stage, lifecycle_status, first_name, last_name, email, phone, country, is_active) VALUES (gen_random_uuid(), $1, 'individual', 'new_customer', 'healthy', $2, $3, $4, $5, 'US', true) RETURNING id`, [TENANT_ID(), first_name, last_name, email, phone]);
        return NextResponse.json({ ok: true, id: rows[0]?.id });
      }
      case 'add_pet': {
        const { customer_id, name, species, breed } = payload;
        await pgExec(`INSERT INTO public.crm_pets (id, tenant_id, primary_customer_id, name, species, breed, mixed_breed, weight_unit, medical_alert, special_handling, nervous, aggressive, first_visit, senior, puppy, status) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, false, 'lbs', false, false, false, false, false, false, false, 'active')`, [TENANT_ID(), customer_id, name, species, breed]);
        return NextResponse.json({ ok: true });
      }
      case 'send_message': {
        const { customer_id, channel, body: msgBody } = payload;
        await pgExec(`INSERT INTO public.crm_messages (id, tenant_id, customer_id, channel, direction, status, body, sent_at) VALUES (gen_random_uuid(), $1, $2, $3, 'outbound', 'queued', $4, now())`, [TENANT_ID(), customer_id, channel || 'sms', msgBody]);
        return NextResponse.json({ ok: true });
      }
      case 'add_note': {
        const { customer_id, note_type, body: noteBody } = payload;
        await pgExec(`INSERT INTO public.crm_notes (id, tenant_id, customer_id, note_type, body, is_pinned) VALUES (gen_random_uuid(), $1, $2, $3, $4, false)`, [TENANT_ID(), customer_id, note_type || 'general', noteBody]);
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
