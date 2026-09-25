import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/gate";
import { pgExec } from "@/lib/pg";
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
      case 'mark_paid': {
        await pgExec(`UPDATE public.acct_ar_invoices SET status = 'paid', amount_paid = total, outstanding_amount = 0, updated_at = now() WHERE id = $1::uuid AND tenant_id = $2`, [payload.invoice_id, TENANT_ID()]);
        return NextResponse.json({ ok: true });
      }
      case 'void_invoice': {
        await pgExec(`UPDATE public.acct_ar_invoices SET status = 'void', updated_at = now() WHERE id = $1::uuid AND tenant_id = $2`, [payload.invoice_id, TENANT_ID()]);
        return NextResponse.json({ ok: true });
      }
      case 'issue_refund': {
        const { order_id, amount } = payload;
        await pgExec(`UPDATE public.commerce_orders SET status = 'refunded', payment_status = 'refunded', updated_at = now() WHERE id = $1 AND tenant_id = $2`, [order_id, TENANT_ID()]);
        return NextResponse.json({ ok: true, message: `Refund of $${amount} processed` });
      }
      case 'issue_gift_card': {
        const { initial_balance, customer_id } = payload;
        const cardNumber = `GC-${Date.now()}`;
        await pgExec(`INSERT INTO public.commerce_gift_cards (id, tenant_id, card_number, balance, currency, status, initial_balance, issued_at) VALUES (gen_random_uuid(), $1, $2, $3, 'USD', 'active', $3, now())`, [TENANT_ID(), cardNumber, initial_balance]);
        return NextResponse.json({ ok: true, cardNumber });
      }
      case 'redeem_gift_card': {
        const { card_number, amount } = payload;
        await pgExec(`UPDATE public.commerce_gift_cards SET balance = balance - $1 WHERE card_number = $2 AND tenant_id = $3 AND status = 'active' AND balance >= $1`, [amount, card_number, TENANT_ID()]);
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
