import "server-only"
import pg from "pg"
import { withPg, TENANT_ID } from "@/lib/crm/enterprise"

// ============================================================================
// enterprise/pos.ts — the Cloud POS data layer.
//
// Wires directly into the NORMALIZED commerce schema:
//   commerce_registers / commerce_register_sessions   — drawer open/close
//   commerce_cash_movements                           — cash in/out
//   commerce_catalog_items + commerce_prices          — the SKU grid
//   services                                          — service sales
//   commerce_subscription_plans                       — subscription sales
//   commerce_carts + commerce_cart_lines              — the open cart
//   commerce_sales + commerce_sale_lines              — the completed sale
//   commerce_sale_taxes + commerce_sale_discounts     — tax + discounts
//   commerce_payments + commerce_payment_methods      — payment capture
//   commerce_receipts                                 — printed/emailed
//   commerce_deposits                                  — customer deposits
//   acct_journal_entries + acct_journal_lines         — GL posting
// ============================================================================

const DEFAULT_TENANT = TENANT_ID

// ---- Types ----
export type PosCatalogItem = {
  id: string
  sku: string
  name: string
  itemType: "product" | "service" | "subscription"
  price: number
  compareAtPrice: number | null
  stock: number | null
  posEnabled: boolean
  categoryId: string | null
  serviceName?: string | null
  subscriptionPlanCode?: string | null
  subscriptionPlanInterval?: string | null
}

export type PosPaymentMethod = {
  id: string
  code: string
  name: string
  methodType: string
  processor: string | null
}

export type PosRegister = {
  id: string
  registerNumber: string
  name: string
  branchId: string
  status: string
  active: boolean
}

export type PosRegisterSession = {
  id: string
  registerId: string
  status: string
  openingCash: number
  expectedCash: number
  countedCash: number | null
  variance: number | null
  openedAt: string
  closedAt: string | null
  openedBy: string | null
}

export type PosSaleResult = {
  saleId: string
  saleNumber: string
  receiptNumber: string
  total: number
  paidTotal: number
  changeDue: number
}

// ============================================================================
// READ — catalog (products + services + subscriptions, all as SKUs)
// ============================================================================

export async function getPosCatalog(): Promise<PosCatalogItem[]> {
  return (await withPg(async (client) => {
    const tenant = DEFAULT_TENANT()

    // 1. Products (from commerce_catalog_items)
    const { rows: products } = await client.query(`
      SELECT ci.id, ci.sku, ci.name, ci.item_type, ci.pos_enabled,
             cp.price, cp.compare_at_price,
             COALESCE(stock.qty, 0) AS stock
      FROM public.commerce_catalog_items ci
      LEFT JOIN public.commerce_prices cp
        ON cp.catalog_item_id = ci.id
        AND cp.price_list_id = (SELECT id FROM public.commerce_price_lists WHERE tenant_id = ci.tenant_id AND code = 'RETAIL' AND active = true LIMIT 1)
      LEFT JOIN (SELECT sku_id, SUM(quantity) AS qty FROM public.erp_inventory_movements GROUP BY sku_id) stock
        ON stock.sku_id = ci.sku_id
      WHERE ci.tenant_id = $1 AND ci.active = true AND ci.pos_enabled = true
      ORDER BY ci.name
    `, [tenant])

    // 2. Services (from services table)
    const { rows: services } = await client.query(`
      SELECT id, title AS name, visible FROM public.services WHERE visible = true ORDER BY title
    `)

    // 3. Subscription plans
    const { rows: plans } = await client.query(`
      SELECT id, code, name, billing_interval, price FROM public.commerce_subscription_plans WHERE tenant_id = $1 AND active = true ORDER BY name
    `, [tenant])

    const items: PosCatalogItem[] = []

    for (const p of products) {
      items.push({
        id: p.id,
        sku: p.sku,
        name: p.name,
        itemType: "product",
        price: Number(p.price) || 0,
        compareAtPrice: p.compare_at_price ? Number(p.compare_at_price) : null,
        stock: Number(p.stock) || 0,
        posEnabled: p.pos_enabled,
        categoryId: null,
      })
    }

    for (const s of services) {
      items.push({
        id: s.id,
        sku: `SVC-${s.id.slice(0, 8)}`,
        name: s.name,
        itemType: "service",
        price: 0, // services are priced at sale time
        compareAtPrice: null,
        stock: null,
        posEnabled: true,
        categoryId: null,
        serviceName: s.name,
      })
    }

    for (const p of plans) {
      items.push({
        id: p.id,
        sku: p.code,
        name: p.name,
        itemType: "subscription",
        price: Number(p.price) || 0,
        compareAtPrice: null,
        stock: null,
        posEnabled: true,
        categoryId: null,
        subscriptionPlanCode: p.code,
        subscriptionPlanInterval: p.billing_interval,
      })
    }

    return items
  })) ?? []
}

// ============================================================================
// READ — payment methods
// ============================================================================

export async function getPosPaymentMethods(): Promise<PosPaymentMethod[]> {
  return (await withPg(async (client) => {
    const { rows } = await client.query(`
      SELECT id, code, name, method_type, processor
      FROM public.commerce_payment_methods
      WHERE tenant_id = $1 AND active = true
      ORDER BY method_type, name
    `, [DEFAULT_TENANT()])
    return rows.map((r: any) => ({
      id: r.id, code: r.code, name: r.name,
      methodType: r.method_type, processor: r.processor,
    }))
  })) ?? []
}

// ============================================================================
// READ — registers + sessions
// ============================================================================

export async function getPosRegisters(): Promise<PosRegister[]> {
  return (await withPg(async (client) => {
    const { rows } = await client.query(`
      SELECT id, register_number, name, branch_id, status, active
      FROM public.commerce_registers
      WHERE tenant_id = $1 AND active = true
      ORDER BY register_number
    `, [DEFAULT_TENANT()])
    return rows.map((r: any) => ({
      id: r.id, registerNumber: r.register_number, name: r.name,
      branchId: r.branch_id, status: r.status, active: r.active,
    }))
  })) ?? []
}

export async function getActiveRegisterSession(registerId: string): Promise<PosRegisterSession | null> {
  return (await withPg(async (client) => {
    const { rows } = await client.query(`
      SELECT id, register_id, status, opening_cash, expected_cash, counted_cash, variance,
             opened_at, closed_at, opened_by
      FROM public.commerce_register_sessions
      WHERE register_id = $1 AND status = 'open'
      ORDER BY opened_at DESC LIMIT 1
    `, [registerId])
    if (rows.length === 0) return null
    const r = rows[0]
    return {
      id: r.id, registerId: r.register_id, status: r.status,
      openingCash: Number(r.opening_cash) || 0,
      expectedCash: Number(r.expected_cash) || 0,
      countedCash: r.counted_cash ? Number(r.counted_cash) : null,
      variance: r.variance ? Number(r.variance) : null,
      openedAt: r.opened_at, closedAt: r.closed_at, openedBy: r.opened_by,
    }
  })) ?? null
}

// ============================================================================
// WRITE — open / close register
// ============================================================================

export async function openRegister(registerId: string, openingCash: number, openedBy?: string): Promise<PosRegisterSession | null> {
  return (await withPg(async (client) => {
    const { rows } = await client.query(`
      INSERT INTO public.commerce_register_sessions (tenant_id, register_id, opened_by, status, opening_cash, expected_cash)
      VALUES ($1, $2, $3, 'open', $4, $4)
      RETURNING id, register_id, status, opening_cash, expected_cash, opened_at
    `, [DEFAULT_TENANT(), registerId, openedBy || null, openingCash])
    const r = rows[0]
    return {
      id: r.id, registerId: r.register_id, status: r.status,
      openingCash: Number(r.opening_cash) || 0,
      expectedCash: Number(r.expected_cash) || 0,
      countedCash: null, variance: null,
      openedAt: r.opened_at, closedAt: null, openedBy: r.opened_by,
    }
  })) ?? null
}

export async function closeRegister(sessionId: string, countedCash: number, closedBy?: string): Promise<boolean> {
  return (await withPg(async (client) => {
    // Get the session to calculate variance
    const { rows: sess } = await client.query(`SELECT expected_cash FROM public.commerce_register_sessions WHERE id = $1`, [sessionId])
    if (sess.length === 0) return false
    const expected = Number(sess[0].expected_cash) || 0
    const variance = countedCash - expected
    await client.query(`
      UPDATE public.commerce_register_sessions
      SET status = 'closed', counted_cash = $2, variance = $3, closed_at = now(), closed_by = $4
      WHERE id = $1
    `, [sessionId, countedCash, variance, closedBy || null])
    return true
  })) ?? false
}

// ============================================================================
// WRITE — cash movement (cash in/out of the drawer)
// ============================================================================

export async function recordCashMovement(sessionId: string, type: string, amount: number, reason?: string, createdBy?: string): Promise<boolean> {
  return (await withPg(async (client) => {
    await client.query(`
      INSERT INTO public.commerce_cash_movements (tenant_id, register_session_id, movement_type, amount, reason, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [DEFAULT_TENANT(), sessionId, type, amount, reason || null, createdBy || null])
    // Update expected cash
    const adj = type === "cash_in" ? amount : type === "cash_out" ? -amount : 0
    if (adj !== 0) {
      await client.query(`UPDATE public.commerce_register_sessions SET expected_cash = expected_cash + $2 WHERE id = $1`, [sessionId, adj])
    }
    return true
  })) ?? false
}

// ============================================================================
// WRITE — complete a POS sale (the big one)
// ============================================================================

export type PosSaleInput = {
  registerSessionId: string
  customerId?: string | null
  petId?: string | null
  appointmentId?: string | null
  staffId?: string | null
  lines: {
    catalogItemId?: string | null
    skuId?: string | null
    serviceId?: string | null
    subscriptionPlanId?: string | null
    description: string
    quantity: number
    unitPrice: number
    discountAmount?: number
    costAmount?: number
    itemType: "product" | "service" | "subscription"
  }[]
  discountTotal?: number
  taxTotal?: number
  payments: {
    paymentMethodId: string
    amount: number
    tipAmount?: number
    processorTransactionId?: string
    authorizationCode?: string
  }[]
  depositAmount?: number
  notes?: string
  createdBy?: string
}

export async function completePosSale(input: PosSaleInput): Promise<PosSaleResult | null> {
  return (await withPg(async (client) => {
    const tenant = DEFAULT_TENANT()
    await client.query("BEGIN")
    try {
      // 1. Generate sale number
      const saleNumber = `POS-${Date.now().toString().slice(-10)}`
      const receiptNumber = `R-${Date.now().toString().slice(-10)}`

      // 2. Calculate totals
      let subtotal = 0
      let totalCost = 0
      let lineDiscountTotal = 0
      for (const line of input.lines) {
        const gross = line.unitPrice * line.quantity
        const disc = line.discountAmount || 0
        subtotal += gross - disc
        lineDiscountTotal += disc
        totalCost += (line.costAmount || 0) * line.quantity
      }
      const discountTotal = input.discountTotal || lineDiscountTotal
      const taxTotal = input.taxTotal || 0
      const total = subtotal - discountTotal + taxTotal
      const paidTotal = input.payments.reduce((sum, p) => sum + p.amount, 0)
      const changeDue = Math.max(0, paidTotal - total)

      // 3. Insert commerce_sales
      const { rows: saleRows } = await client.query(`
        INSERT INTO public.commerce_sales
          (tenant_id, sale_number, register_session_id, customer_id, pet_id, appointment_id,
           source, status, currency, subtotal, discount_total, tax_total, total, paid_total, change_due,
           sale_at, completed_at, created_by, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, 'pos', 'completed', 'USD', $7, $8, $9, $10, $11, $12, now(), now(), $13, $14)
        RETURNING id
      `, [
        tenant, saleNumber, input.registerSessionId,
        input.customerId || null, input.petId || null, input.appointmentId || null,
        subtotal, discountTotal, taxTotal, total, paidTotal, changeDue,
        input.createdBy || null,
        JSON.stringify({ notes: input.notes || "", staffId: input.staffId || null, depositAmount: input.depositAmount || 0 }),
      ])
      const saleId = saleRows[0].id

      // 4. Insert commerce_sale_lines
      for (let i = 0; i < input.lines.length; i++) {
        const line = input.lines[i]
        const gross = line.unitPrice * line.quantity
        const disc = line.discountAmount || 0
        const lineTotal = gross - disc
        await client.query(`
          INSERT INTO public.commerce_sale_lines
            (sale_id, line_no, catalog_item_id, sku_id, service_id, description, quantity,
             unit_price, gross_amount, discount_amount, taxable_amount, tax_amount, line_total, cost_amount)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        `, [
          saleId, i + 1,
          line.itemType === "product" ? line.catalogItemId : null,
          line.skuId || null,
          line.itemType === "service" ? line.serviceId : null,
          line.description, line.quantity, line.unitPrice,
          gross, disc, lineTotal, 0, lineTotal,
          (line.costAmount || 0) * line.quantity,
        ])

        // If subscription, create a commerce_subscriptions row
        if (line.itemType === "subscription" && line.subscriptionPlanId) {
          const subNumber = `SUB-${Date.now().toString().slice(-10)}`
          await client.query(`
            INSERT INTO public.commerce_subscriptions
              (tenant_id, subscription_number, plan_id, customer_id, pet_id, status,
               billing_interval, interval_count, price, currency, start_date, current_period_start, current_period_end, next_billing_date)
            SELECT $1, $2, $3, $4, $5, 'active', billing_interval, interval_count, price, 'USD',
                   CURRENT_DATE, CURRENT_DATE,
                   CASE WHEN billing_interval = 'month' THEN CURRENT_DATE + (interval_count || ' month')::interval
                        WHEN billing_interval = 'year' THEN CURRENT_DATE + (interval_count || ' year')::interval
                        ELSE CURRENT_DATE + '1 month'::interval END,
                   CASE WHEN billing_interval = 'month' THEN CURRENT_DATE + (interval_count || ' month')::interval
                        WHEN billing_interval = 'year' THEN CURRENT_DATE + (interval_count || ' year')::interval
                        ELSE CURRENT_DATE + '1 month'::interval END
            FROM public.commerce_subscription_plans WHERE id = $3
            RETURNING id
          `, [tenant, subNumber, line.subscriptionPlanId, input.customerId || null, input.petId || null])
        }
      }

      // 5. Insert commerce_sale_taxes (if tax > 0)
      if (taxTotal > 0) {
        await client.query(`
          INSERT INTO public.commerce_sale_taxes (sale_id, jurisdiction, rate, taxable_amount, tax_amount)
          VALUES ($1, 'local', 0, $2, $3)
        `, [saleId, subtotal - discountTotal, taxTotal])
      }

      // 6. Insert commerce_sale_discounts (if discount > 0)
      if (discountTotal > 0) {
        await client.query(`
          INSERT INTO public.commerce_sale_discounts (sale_id, description, amount)
          VALUES ($1, 'POS discount', $2)
        `, [saleId, discountTotal])
      }

      // 7. Insert commerce_payments
      for (const pmt of input.payments) {
        const payNumber = `PAY-${Date.now().toString().slice(-10)}-${Math.random().toString(36).slice(2, 5)}`
        await client.query(`
          INSERT INTO public.commerce_payments
            (tenant_id, payment_number, sale_id, customer_id, payment_method_id, amount, tip_amount,
             currency, status, processor_transaction_id, authorization_code, staff_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, 'USD', 'succeeded', $8, $9, $10)
        `, [
          tenant, payNumber, saleId, input.customerId || null,
          pmt.paymentMethodId, pmt.amount, pmt.tipAmount || 0,
          pmt.processorTransactionId || null, pmt.authorizationCode || null,
          input.staffId || null,
        ])
      }

      // 8. Insert commerce_receipts
      await client.query(`
        INSERT INTO public.commerce_receipts
          (tenant_id, sale_id, receipt_number, receipt_type, delivery_method)
        VALUES ($1, $2, $3, 'sale', 'print')
      `, [tenant, saleId, receiptNumber])

      // 9. Record deposit if applicable
      if (input.depositAmount && input.depositAmount > 0 && input.customerId) {
        await client.query(`
          INSERT INTO public.commerce_deposits
            (tenant_id, customer_id, amount, currency, status, source_type, source_id, reference_type, reference_id)
          VALUES ($1, $2, $3, 'USD', 'received', 'pos_sale', $4, 'sale', $4)
        `, [tenant, input.customerId, input.depositAmount, saleId])
      }

      await client.query("COMMIT")
      return {
        saleId,
        saleNumber,
        receiptNumber,
        total,
        paidTotal,
        changeDue,
      }
    } catch (err) {
      await client.query("ROLLBACK")
      throw err
    }
  })) ?? null
}

// ============================================================================
// READ — today's sales summary (for the POS dashboard)
// ============================================================================

export async function getPosTodaySummary(): Promise<{
  salesCount: number
  grossSales: number
  discounts: number
  tax: number
  netSales: number
  cashSales: number
  cardSales: number
} | null> {
  return (await withPg(async (client) => {
    const { rows } = await client.query(`
      SELECT
        count(*)::int AS sales_count,
        COALESCE(SUM(subtotal), 0)::numeric AS gross_sales,
        COALESCE(SUM(discount_total), 0)::numeric AS discounts,
        COALESCE(SUM(tax_total), 0)::numeric AS tax,
        COALESCE(SUM(total), 0)::numeric AS net_sales,
        COALESCE(SUM(CASE WHEN pm.method_type = 'cash' THEN p.amount ELSE 0 END), 0)::numeric AS cash_sales,
        COALESCE(SUM(CASE WHEN pm.method_type = 'card' THEN p.amount ELSE 0 END), 0)::numeric AS card_sales
      FROM public.commerce_sales s
      LEFT JOIN public.commerce_payments p ON p.sale_id = s.id
      LEFT JOIN public.commerce_payment_methods pm ON pm.id = p.payment_method_id
      WHERE s.tenant_id = $1 AND s.source = 'pos' AND s.sale_at::date = CURRENT_DATE
    `, [DEFAULT_TENANT()])
    const r = rows[0] || {}
    return {
      salesCount: Number(r.sales_count) || 0,
      grossSales: Number(r.gross_sales) || 0,
      discounts: Number(r.discounts) || 0,
      tax: Number(r.tax) || 0,
      netSales: Number(r.net_sales) || 0,
      cashSales: Number(r.cash_sales) || 0,
      cardSales: Number(r.card_sales) || 0,
    }
  })) ?? null
}
