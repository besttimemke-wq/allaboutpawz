import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/gate";
import { TENANT_ID, platformAudit } from "@/lib/crm/enterprise";
import pg from "pg";

// ---------------------------------------------------------------------------
// GET /api/admin/invoices — Active Invoices, live from the owner's tables.
//   invoices (number/status/subtotal/total/amount_paid/depositPaid/balanceDue)
//   ← customers ("firstName"/"lastName"/email/phone) via "customerId"
//   ← bookings (ownerName/dogName/service/date/time) via "bookingId"
//   + invoice_items (description/quantity/unitPrice/totalPrice)
//
// POST /api/admin/invoices — draft a new invoice. Two client modes:
//   1. From booking:  { fromBookingId, extraItems?, depositOverride? }
//      The server derives the first line item from the booking itself
//      (service × servicePrice), appends extraItems, and applies the
//      booking's deposit ONLY when the deposit money actually cleared
//      (paymentStatus DEPOSIT_PAID / PAID / CONFIRMED) unless
//      depositOverride is given.
//   2. Standalone:    { customerEmail, items, depositPaid?, dueDate?, notes? }
//      Find-or-create the salon customers row by email (case-insensitive).
//
// Money math (server-authoritative, half-cent slack on comparisons):
//   subtotal = Σ qty × unitPrice, total = subtotal (tax 0 for now)
//   depositPaid = min(deposit, total)
//   balanceDue  = total − amount_paid − depositPaid
// Next INV-#### number per tenant; platform_audit_log entry per create.
// ---------------------------------------------------------------------------

const POOLER = () => process.env.SUPABASE_SESSION_POOLER || process.env.SUPABASE_DIRECT_CONNECTION;

function money(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}

function num(v: any): number {
  return Math.round((parseFloat(String(v ?? "0")) || 0) * 100) / 100;
}

function splitName(name: string): { firstName: string; lastName: string } {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "Walk-in", lastName: "Customer" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

type RawItem = { description: string; quantity: number; unitPrice: number };

function toUiInvoice(r: any, items: any[]) {
  const total = num(r.total);
  const amountPaid = num(r.amount_paid);
  const depositPaid = num(r.depositPaid);
  const balanceDue = Math.max(0, Math.round((total - amountPaid - depositPaid) * 100) / 100);
  const firstName = r.first_name ?? "";
  const lastName = r.last_name ?? "";
  const customerName = `${firstName} ${lastName}`.trim() || r.booking_owner || "—";
  return {
    id: String(r.id),
    number: r.number || `INV-${String(r.id).slice(0, 8).toUpperCase()}`,
    status: String(r.status || "OPEN").toUpperCase(),
    currency: r.currency || "USD",
    subtotal: num(r.subtotal),
    total,
    depositPaid,
    balanceDue,
    amountPaid,
    customerId: r.customerId ?? null,
    bookingId: r.bookingId ?? null,
    customerEmail: r.email ?? null,
    customerName,
    petName: r.dog_name ?? null,
    bookingService: r.booking_service ?? null,
    bookingDate: r.booking_date ?? null,
    bookingTime: r.booking_time ?? null,
    sentAt: r.sentAt ?? null,
    paidAt: r.paidAt ?? null,
    createdAt: r.createdAt ?? null,
    updatedAt: r.updatedAt ?? null,
    dueDate: r.dueDate ? String(r.dueDate).slice(0, 10) : null,
    notes: r.notes ?? null,
    items: items.map((it) => ({
      id: String(it.id),
      description: String(it.description || "Item"),
      quantity: Number(it.quantity ?? 1),
      unitPrice: num(it.unitPrice),
      totalPrice: num(it.totalPrice),
    })),
  };
}

export async function GET() {
  const gate = await requireAdminApi();
  if (gate) return gate;

  const cs = POOLER();
  if (!cs) return NextResponse.json({ invoices: [] });

  const client = new pg.Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    const invRes = await client.query(
      `SELECT i.*, c."firstName" AS first_name, c."lastName" AS last_name,
              c.email, c.phone,
              b."ownerName" AS booking_owner, b."dogName" AS dog_name,
              b.service AS booking_service, b.date AS booking_date, b.time AS booking_time
       FROM public.invoices i
       LEFT JOIN public.customers c ON i."customerId" = c.id
       LEFT JOIN public.bookings b ON i."bookingId" = b.id
       WHERE i.tenant_id = $1
       ORDER BY i."createdAt" DESC`,
      [TENANT_ID()],
    );
    const itemsRes = await client.query(
      `SELECT * FROM public.invoice_items WHERE tenant_id = $1 ORDER BY "createdAt" ASC`,
      [TENANT_ID()],
    );
    const itemsByInvoice = new Map<string, any[]>();
    for (const it of itemsRes.rows) {
      const k = String(it.invoiceId);
      if (!itemsByInvoice.has(k)) itemsByInvoice.set(k, []);
      itemsByInvoice.get(k)!.push(it);
    }
    const invoices = invRes.rows.map((r) => toUiInvoice(r, itemsByInvoice.get(String(r.id)) || []));
    return NextResponse.json({ invoices });
  } catch (e: any) {
    console.error("[GET /api/admin/invoices]", e);
    return NextResponse.json({ error: e.message || "Failed to load invoices" }, { status: 500 });
  } finally {
    await client.end().catch(() => {});
  }
}

type NormalizedCreate = {
  mode: "booking" | "standalone";
  fromBookingId: string | null;
  customerEmail: string;
  customerName: string;
  customerPhone: string | null;
  items: RawItem[];
  depositOverride: number | null;
  depositPaidExplicit: number | null;
  dueDate: string | null;
  notes: string | null;
};

function normalizeCreate(body: any): { ok: true; value: NormalizedCreate } | { ok: false; error: string } {
  const fromBookingId = String(body?.fromBookingId || body?.bookingId || "").trim() || null;
  const customerEmail = String(body?.customerEmail || body?.customer?.email || "").trim().toLowerCase();
  const customerName = String(body?.customer?.name || body?.customerName || "").trim();
  const customerPhone = String(body?.customer?.phone || body?.phone || "").trim() || null;
  const dueDate = String(body?.dueDate || "").trim() || null;
  const notes = String(body?.notes || "").trim() || null;

  const rawItems = Array.isArray(body?.items) ? body.items : Array.isArray(body?.extraItems) ? body.extraItems : [];
  const items: RawItem[] = rawItems
    .map((it: any) => ({
      description: String(it?.description || "Grooming service").trim().slice(0, 300),
      quantity: Math.max(1, Math.min(999, parseInt(String(it?.quantity ?? 1), 10) || 1)),
      unitPrice: num(it?.unitPrice ?? it?.amount),
    }))
    .filter((it: RawItem) => it.description.length > 0 && it.unitPrice > 0);

  const depositOverride =
    body?.depositOverride === undefined || body?.depositOverride === null || body?.depositOverride === ""
      ? null
      : num(body.depositOverride);
  const depositPaidExplicit =
    body?.depositPaid === undefined || body?.depositPaid === null || body?.depositPaid === ""
      ? null
      : num(body.depositPaid);

  if (fromBookingId) return { ok: true, value: { mode: "booking", fromBookingId, customerEmail, customerName, customerPhone, items, depositOverride, depositPaidExplicit, dueDate, notes } };
  if (!customerEmail && !customerName) return { ok: false, error: "Customer email (or name) is required for a standalone invoice." };
  if (items.length === 0) return { ok: false, error: "At least one line item with a unit price above $0 is required." };
  return { ok: true, value: { mode: "standalone", fromBookingId: null, customerEmail, customerName, customerPhone, items, depositOverride, depositPaidExplicit, dueDate, notes } };
}

export async function POST(req: NextRequest) {
  const gate = await requireAdminApi();
  if (gate) return gate;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const norm = normalizeCreate(body);
  if (!norm.ok) return NextResponse.json({ error: norm.error }, { status: 400 });
  const c = norm.value;

  const cs = POOLER();
  if (!cs) return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  const client = new pg.Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    await client.query("BEGIN");
    const tenant = TENANT_ID();

    let booking: any = null;
    const lineItems: RawItem[] = [];

    if (c.mode === "booking") {
      const b = await client.query(
        `SELECT id, "customerId", "ownerName", email, phone, "dogName", service, "servicePrice",
                "depositAmount", "paymentStatus", date, time
         FROM public.bookings WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
        [c.fromBookingId, tenant],
      );
      if (!b.rows[0]) {
        await client.query("ROLLBACK").catch(() => {});
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      }
      booking = b.rows[0];

      // First line item derives from the booking itself (the client's
      // "From Booking" mode sends only extraItems).
      const servicePrice = num(booking.servicePrice);
      if (servicePrice > 0) {
        lineItems.push({
          description: `${booking.service || "Grooming"} — ${booking.dogName || "appointment"}`,
          quantity: 1,
          unitPrice: servicePrice,
        });
      }
      lineItems.push(...c.items);
      if (lineItems.length === 0) {
        await client.query("ROLLBACK").catch(() => {});
        return NextResponse.json({ error: "The booking has no service price and no extra items were provided." }, { status: 400 });
      }
    } else {
      lineItems.push(...c.items);
    }

    const subtotal = lineItems.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
    const total = Math.round(subtotal * 100) / 100;

    // ---- Customer resolution ----
    let customerId: string | null = null;
    let customerEmail: string | null = c.customerEmail || null;
    if (c.mode === "booking") {
      if (booking.customerId) {
        customerId = booking.customerId;
      } else if (booking.email) {
        customerEmail = String(booking.email).toLowerCase();
        const found = await client.query(
          `SELECT id::text FROM public.customers WHERE tenant_id = $1 AND lower(email) = $2 ORDER BY "createdAt" ASC LIMIT 1`,
          [tenant, customerEmail],
        );
        customerId = found.rows[0]?.id || null;
      }
    }
    if (!customerId) {
      if (customerEmail) {
        const found = await client.query(
          `SELECT id::text FROM public.customers WHERE tenant_id = $1 AND lower(email) = $2 ORDER BY "createdAt" ASC LIMIT 1`,
          [tenant, customerEmail],
        );
        customerId = found.rows[0]?.id || null;
      } else if (c.customerName) {
        const found = await client.query(
          `SELECT id::text FROM public.customers WHERE tenant_id = $1 AND lower("firstName" || ' ' || "lastName") = lower($2) ORDER BY "createdAt" ASC LIMIT 1`,
          [tenant, c.customerName],
        );
        customerId = found.rows[0]?.id || null;
      }
    }
    if (!customerId) {
      const nameSrc = c.customerName || (customerEmail ? customerEmail.split("@")[0] : "");
      const { firstName, lastName } = splitName(nameSrc);
      const created = await client.query(
        `INSERT INTO public.customers (tenant_id, "firstName", "lastName", email, phone, "customerStatus")
         VALUES ($1, $2, $3, $4, $5, 'active')
         RETURNING id::text`,
        [tenant, firstName, lastName, customerEmail, c.customerPhone],
      );
      customerId = created.rows[0].id;
    }

    // ---- Deposit ----
    let depositPaid = 0;
    if (c.depositOverride !== null) {
      depositPaid = Math.min(Math.max(0, c.depositOverride), total);
    } else if (c.depositPaidExplicit !== null) {
      depositPaid = Math.min(Math.max(0, c.depositPaidExplicit), total);
    } else if (booking) {
      const ps = String(booking.paymentStatus || "").toUpperCase();
      if (ps === "DEPOSIT_PAID" || ps === "PAID" || ps === "CONFIRMED") {
        depositPaid = Math.min(num(booking.depositAmount), total);
      }
    }
    const balanceDue = Math.max(0, Math.round((total - depositPaid) * 100) / 100);

    // ---- Next INV-#### number ----
    const seq = await client.query(
      `SELECT COALESCE(MAX(NULLIF(regexp_replace(number, '\\D', '', 'g'), '')::bigint), 0) + 1 AS next
       FROM public.invoices WHERE tenant_id = $1 AND number LIKE 'INV-%'`,
      [tenant],
    );
    const number = `INV-${String(seq.rows[0].next).padStart(4, "0")}`;

    const inv = await client.query(
      `INSERT INTO public.invoices
         (tenant_id, "customerId", "bookingId", number, status, subtotal, total,
          amount_paid, "depositPaid", "balanceDue", currency, "dueDate", notes)
       VALUES ($1, $2, $3, $4, 'OPEN', $5, $6, 0, $7, $8, 'USD', $9::date, $10)
       RETURNING *`,
      [tenant, customerId, c.mode === "booking" ? booking.id : null, number,
        money(subtotal), money(total), money(depositPaid), money(balanceDue), c.dueDate, c.notes],
    );
    const invoiceRow = inv.rows[0];

    for (const it of lineItems) {
      await client.query(
        `INSERT INTO public.invoice_items (tenant_id, "invoiceId", description, quantity, "unitPrice", "totalPrice")
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [tenant, invoiceRow.id, it.description, it.quantity, money(it.unitPrice), money(it.quantity * it.unitPrice)],
      );
    }

    // Audit the create. Wrapped in a SAVEPOINT so an audit-table failure
    // (CHECK constraint, trigger, NOT NULL, etc.) can NEVER abort the main
    // invoice write — without this, any audit INSERT failure silently rolls
    // back the entire transaction even though the route still returns 201
    // with the in-memory invoiceRow from the INSERT's RETURNING * clause.
    try {
      await client.query("SAVEPOINT audit_sp");
      await platformAudit(client, {
        action: "invoice.created",
        targetType: "invoice",
        targetId: invoiceRow.id,
        actorRole: "admin",
        metadata: {
          number,
          mode: c.mode,
          customer: c.customerName || customerEmail || booking?.ownerName || "—",
          total: money(total),
          depositPaid: money(depositPaid),
          items: lineItems.length,
          bookingId: c.mode === "booking" ? booking.id : null,
        },
      });
      await client.query("RELEASE SAVEPOINT audit_sp");
    } catch (auditErr: any) {
      await client.query("ROLLBACK TO SAVEPOINT audit_sp").catch(() => {});
      console.warn("[POST /api/admin/invoices] audit non-fatal:", auditErr?.message);
    }

    await client.query("COMMIT");

    const itemsRes = await client.query(
      `SELECT * FROM public.invoice_items WHERE "invoiceId"::text = $1::text ORDER BY "createdAt" ASC`,
      [String(invoiceRow.id)],
    );
    return NextResponse.json({ invoice: toUiInvoice(invoiceRow, itemsRes.rows) }, { status: 201 });
  } catch (e: any) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("[POST /api/admin/invoices]", e);
    return NextResponse.json({ error: e.message || "Failed to create invoice" }, { status: 500 });
  } finally {
    await client.end().catch(() => {});
  }
}
