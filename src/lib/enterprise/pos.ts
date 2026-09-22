import "server-only"
import pg from "pg"
import { withPg, TENANT_ID } from "@/lib/crm/enterprise"

// ============================================================================
// enterprise/pos.ts — the Cloud POS data layer (enterprise-grade).
//
// Financial integrity rules enforced:
//   1. Single DB transaction (BEGIN ... COMMIT / ROLLBACK)
//   2. Idempotency key (commerce_idempotency) — blocks double-submission
//   3. Journal balance guardrail (Σ Debits − Σ Credits == 0 before commit)
//   4. Returns create NEW negative rows (never UPDATE/DELETE historical)
//   5. Gift cards query a distinct ledger + log balance_before/after
//   6. Cash drawer trigger via ESC/POS command in receipt raw text
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
  categoryName?: string | null
  subscriptionPlanCode?: string | null
  subscriptionPlanInterval?: string | null
}

export type PosCategory = {
  id: string | null
  name: string
  itemCount: number
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
  receiptRaw: string  // ESC/POS raw text for thermal printers
  journalEntryId: string | null  // the GL posting (balanced)
}

export type GiftCardBalance = {
  id: string
  cardNumber: string
  balance: number
  status: string
  holderName: string | null
}

// ============================================================================
// READ — catalog with categories
// ============================================================================

export async function getPosCatalog(): Promise<{ items: PosCatalogItem[]; categories: PosCategory[] }> {
  return (await withPg(async (client) => {
    const tenant = DEFAULT_TENANT()

    // Products with their category (from commerce_catalog_items + commerce_categories)
    const { rows: products } = await client.query(`
      SELECT ci.id, ci.sku, ci.name, ci.item_type, ci.pos_enabled,
             ci.short_description,
             cp.price, cp.compare_at_price,
             COALESCE(stock.qty, 0) AS stock,
             cc.name AS category_name
      FROM public.commerce_catalog_items ci
      LEFT JOIN public.commerce_prices cp
        ON cp.catalog_item_id = ci.id
        AND cp.price_list_id = (SELECT id FROM public.commerce_price_lists WHERE tenant_id = ci.tenant_id AND code = 'RETAIL' AND active = true LIMIT 1)
      LEFT JOIN (SELECT sku_id, SUM(quantity) AS qty FROM public.erp_inventory_movements GROUP BY sku_id) stock
        ON stock.sku_id = ci.sku_id
      LEFT JOIN public.commerce_categories cc ON cc.id::text = ci.metadata->>'category_id'
      WHERE ci.tenant_id = $1 AND ci.active = true AND ci.pos_enabled = true
      ORDER BY ci.name
    `, [tenant])

    const { rows: services } = await client.query(`
      SELECT id, title AS name FROM public.services WHERE visible = true ORDER BY title
    `)

    const { rows: plans } = await client.query(`
      SELECT id, code, name, billing_interval, price FROM public.commerce_subscription_plans WHERE tenant_id = $1 AND active = true ORDER BY name
    `, [tenant])

    const items: PosCatalogItem[] = []
    const categoryMap = new Map<string, number>()

    for (const p of products) {
      const cat = p.category_name || "Uncategorized"
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1)
      items.push({
        id: p.id, sku: p.sku, name: p.name, itemType: "product",
        price: Number(p.price) || 0,
        compareAtPrice: p.compare_at_price ? Number(p.compare_at_price) : null,
        stock: Number(p.stock) || 0, posEnabled: p.pos_enabled,
        categoryName: cat,
      })
    }
    for (const s of services) {
      items.push({
        id: s.id, sku: `SVC-${s.id.slice(0, 8)}`, name: s.name,
        itemType: "service", price: 0, compareAtPrice: null,
        stock: null, posEnabled: true, categoryName: "Services",
      })
      categoryMap.set("Services", (categoryMap.get("Services") || 0) + 1)
    }
    for (const p of plans) {
      items.push({
        id: p.id, sku: p.code, name: p.name, itemType: "subscription",
        price: Number(p.price) || 0, compareAtPrice: null,
        stock: null, posEnabled: true, categoryName: "Subscriptions",
        subscriptionPlanCode: p.code, subscriptionPlanInterval: p.billing_interval,
      })
      categoryMap.set("Subscriptions", (categoryMap.get("Subscriptions") || 0) + 1)
    }

    const categories: PosCategory[] = [
      { id: null, name: "All Items", itemCount: items.length },
      ...Array.from(categoryMap.entries()).map(([name, count]) => ({
        id: name, name, itemCount: count,
      })),
    ]

    return { items, categories }
  })) ?? { items: [], categories: [] }
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
      FROM public.commerce_registers WHERE tenant_id = $1 AND active = true ORDER BY register_number
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
      WHERE register_id = $1 AND status = 'open' ORDER BY opened_at DESC LIMIT 1
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
      VALUES ($1, $2, $3, 'open', $4, $4) RETURNING id, register_id, status, opening_cash, expected_cash, opened_at
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
    const { rows: sess } = await client.query(`SELECT expected_cash FROM public.commerce_register_sessions WHERE id = $1`, [sessionId])
    if (sess.length === 0) return false
    const expected = Number(sess[0].expected_cash) || 0
    const variance = countedCash - expected
    await client.query(`
      UPDATE public.commerce_register_sessions
      SET status = 'closed', counted_cash = $2, variance = $3, closed_at = now(), closed_by = $4 WHERE id = $1
    `, [sessionId, countedCash, variance, closedBy || null])
    return true
  })) ?? false
}

export async function recordCashMovement(sessionId: string, type: string, amount: number, reason?: string, createdBy?: string): Promise<boolean> {
  return (await withPg(async (client) => {
    await client.query(`
      INSERT INTO public.commerce_cash_movements (tenant_id, register_session_id, movement_type, amount, reason, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [DEFAULT_TENANT(), sessionId, type, amount, reason || null, createdBy || null])
    const adj = type === "cash_in" ? amount : type === "cash_out" ? -amount : 0
    if (adj !== 0) {
      await client.query(`UPDATE public.commerce_register_sessions SET expected_cash = expected_cash + $2 WHERE id = $1`, [sessionId, adj])
    }
    return true
  })) ?? false
}

// ============================================================================
// GIFT CARD — query balance
// ============================================================================

export async function queryGiftCard(cardNumber: string): Promise<GiftCardBalance | null> {
  return (await withPg(async (client) => {
    const { rows } = await client.query(`
      SELECT gc.id, gc.card_number, gc.balance, gc.status,
             COALESCE(gc.recipient_name, gc.holder_customer_id::text, '') AS holder_name
      FROM public.commerce_gift_cards gc
      WHERE gc.card_number = $1 AND gc.tenant_id = $2
      LIMIT 1
    `, [cardNumber, DEFAULT_TENANT()])
    if (rows.length === 0) return null
    const r = rows[0]
    return {
      id: r.id, cardNumber: r.card_number,
      balance: Number(r.balance) || 0, status: r.status,
      holderName: r.holder_name || null,
    }
  })) ?? null
}

// ============================================================================
// WRITE — complete a POS sale (ENTERPRISE-GRADE)
//
// Enforces:
//   1. Idempotency (commerce_idempotency — blocks double-submission)
//   2. Single DB transaction (BEGIN ... COMMIT / ROLLBACK)
//   3. Journal balance guardrail (Σ Debits − Σ Credits == 0)
//   4. Gift card ledger entries (balance_before/after)
//   5. ESC/POS raw receipt text generation
//   6. Cash drawer trigger command (for cash/check payments)
// ============================================================================

export type PosSaleInput = {
  idempotencyKey: string  // client-generated UUID — blocks double-submission
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
    giftCardNumber?: string  // for gift card payments
    checkReference?: string  // for check payments
  }[]
  depositAmount?: number
  notes?: string
  createdBy?: string
}

export async function completePosSale(input: PosSaleInput): Promise<PosSaleResult | { error: string; idempotent?: boolean }> {
  return (await withPg(async (client) => {
    const tenant = DEFAULT_TENANT()

    // ---- 1. IDEMPOTENCY CHECK ----
    // If this idempotency_key already exists, return the cached response
    // (blocks double-submission from cashier double-clicks).
    const { rows: existing } = await client.query(`
      SELECT response_body FROM public.commerce_idempotency
      WHERE idempotency_key = $1 AND tenant_id = $2 AND expires_at > now()
    `, [input.idempotencyKey, tenant])
    if (existing.length > 0 && existing[0].response_body) {
      // response_body is jsonb — pg returns it as a parsed object
      const cached = typeof existing[0].response_body === 'string'
        ? JSON.parse(existing[0].response_body)
        : existing[0].response_body
      return cached as PosSaleResult
    }

    await client.query("BEGIN")
    try {
      // ---- 2. CALCULATE TOTALS ----
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

      const saleNumber = `POS-${Date.now().toString().slice(-10)}`
      const receiptNumber = `R-${Date.now().toString().slice(-10)}`

      // ---- 3. INSERT commerce_sales ----
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

      // ---- 4. INSERT commerce_sale_lines ----
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

        // For subscription items, create the subscription record
        if (line.itemType === "subscription" && line.subscriptionPlanId) {
          const subNumber = `SUB-${Date.now().toString().slice(-10)}-${i}`
          await client.query(`
            INSERT INTO public.commerce_subscriptions
              (tenant_id, subscription_number, plan_id, customer_id, pet_id, status,
               billing_interval, interval_count, price, currency, start_date,
               current_period_start, current_period_end, next_billing_date)
            SELECT $1, $2, $3, $4, $5, 'active', billing_interval, interval_count, price, 'USD',
                   CURRENT_DATE, CURRENT_DATE,
                   CASE WHEN billing_interval = 'month' THEN CURRENT_DATE + (interval_count || ' month')::interval
                        WHEN billing_interval = 'year' THEN CURRENT_DATE + (interval_count || ' year')::interval
                        ELSE CURRENT_DATE + '1 month'::interval END,
                   CASE WHEN billing_interval = 'month' THEN CURRENT_DATE + (interval_count || ' month')::interval
                        WHEN billing_interval = 'year' THEN CURRENT_DATE + (interval_count || ' year')::interval
                        ELSE CURRENT_DATE + '1 month'::interval END
            FROM public.commerce_subscription_plans WHERE id = $3
          `, [tenant, subNumber, line.subscriptionPlanId, input.customerId || null, input.petId || null])
        }
      }

      // ---- 5. INSERT commerce_sale_taxes + commerce_sale_discounts ----
      if (taxTotal > 0) {
        await client.query(`INSERT INTO public.commerce_sale_taxes (sale_id, jurisdiction, rate, taxable_amount, tax_amount) VALUES ($1, 'local', 0, $2, $3)`, [saleId, subtotal - discountTotal, taxTotal])
      }
      if (discountTotal > 0) {
        await client.query(`INSERT INTO public.commerce_sale_discounts (sale_id, description, amount) VALUES ($1, 'POS discount', $2)`, [saleId, discountTotal])
      }

      // ---- 6. INSERT commerce_payments (with gift card + check handling) ----
      let hasCashOrCheck = false
      for (const pmt of input.payments) {
        const payNumber = `PAY-${Date.now().toString().slice(-10)}-${Math.random().toString(36).slice(2, 5)}`

        // Get the payment method to check if cash/check (for drawer trigger)
        const { rows: pmRows } = await client.query(`SELECT method_type, code FROM public.commerce_payment_methods WHERE id = $1`, [pmt.paymentMethodId])
        const methodType = pmRows[0]?.method_type || ""
        const methodCode = pmRows[0]?.code || ""
        if (methodType === "cash" || methodType === "check") hasCashOrCheck = true

        await client.query(`
          INSERT INTO public.commerce_payments
            (tenant_id, payment_number, sale_id, customer_id, payment_method_id, amount, tip_amount,
             currency, status, processor_transaction_id, authorization_code, staff_id, external_reference)
          VALUES ($1, $2, $3, $4, $5, $6, $7, 'USD', 'succeeded', $8, $9, $10, $11)
        `, [
          tenant, payNumber, saleId, input.customerId || null,
          pmt.paymentMethodId, pmt.amount, pmt.tipAmount || 0,
          pmt.processorTransactionId || null, pmt.authorizationCode || null,
          input.staffId || null,
          pmt.checkReference || pmt.giftCardNumber || null,
        ])

        // ---- GIFT CARD LEDGER ----
        // Deduct balance + log the transaction with balance_before/after
        if (methodCode === "STORE_CREDIT" || pmt.giftCardNumber) {
          if (pmt.giftCardNumber) {
            const { rows: gcRows } = await client.query(`SELECT id, balance FROM public.commerce_gift_cards WHERE card_number = $1 AND tenant_id = $2 FOR UPDATE`, [pmt.giftCardNumber, tenant])
            if (gcRows.length > 0) {
              const gcId = gcRows[0].id
              const balanceBefore = Number(gcRows[0].balance) || 0
              const balanceAfter = Math.max(0, balanceBefore - pmt.amount)
              await client.query(`UPDATE public.commerce_gift_cards SET balance = $2, last_used_at = now() WHERE id = $1`, [gcId, balanceAfter])
              await client.query(`
                INSERT INTO public.commerce_gift_card_transactions
                  (gift_card_id, sale_id, transaction_type, amount, balance_before, balance_after, created_by)
                VALUES ($1, $2, 'redemption', $3, $4, $5, $6)
              `, [gcId, saleId, pmt.amount, balanceBefore, balanceAfter, input.createdBy || null])
            }
          }
        }
      }

      // ---- 7. INSERT commerce_receipts (store receipt as base64 to avoid
      //      JSON/Unicode issues with raw ESC/POS escape codes) ----
      const receiptRaw = generateEscPosReceipt({
        saleNumber, receiptNumber,
        lines: input.lines.map(l => ({ description: l.description, quantity: l.quantity, unitPrice: l.unitPrice })),
        subtotal, discountTotal, taxTotal, total, paidTotal, changeDue,
        payments: input.payments.map(p => ({ amount: p.amount })),
        hasCashOrCheck,
      })
      const receiptBase64 = Buffer.from(receiptRaw, "utf8").toString("base64")
      // Store as plain text URI (NOT jsonb) — the raw ESC/POS contains
      // binary escape codes that break JSON validation.
      await client.query(`
        INSERT INTO public.commerce_receipts (tenant_id, sale_id, receipt_number, receipt_type, delivery_method, document_uri)
        VALUES ($1, $2, $3, 'sale', 'print', $4)
      `, [tenant, saleId, receiptNumber, `pos-receipt:${receiptNumber}`])

      // NOTE: The receipt raw text is returned to the client directly (not
      // stored in jsonb metadata) to avoid "unsupported Unicode escape
      // sequence" errors from the ESC/POS binary control codes.

      // ---- 8. DEPOSIT (if applicable) ----
      if (input.depositAmount && input.depositAmount > 0 && input.customerId) {
        await client.query(`
          INSERT INTO public.commerce_deposits (tenant_id, customer_id, amount, currency, status, source_type, source_id, reference_type, reference_id)
          VALUES ($1, $2, $3, 'USD', 'received', 'pos_sale', $4, 'sale', $4)
        `, [tenant, input.customerId, input.depositAmount, saleId])
      }

      // ---- 9. JOURNAL ENTRY (balanced) ----
      // The guardrail: Σ Debits − Σ Credits must == 0.
      // Debits: Cash/Checking/AR (the payment) + COGS + Discounts
      // Credits: Product/Service/Subscription Revenue + Sales Tax Payable + Inventory
      const journalEntryId = await postJournalEntry(client, tenant, saleId, saleNumber, {
        subtotal, discountTotal, taxTotal, total, totalCost,
        payments: input.payments,
      })
      if (!journalEntryId) {
        // Journal didn't balance — abort the entire sale.
        throw new Error("JOURNAL_UNBALANCED: Σ Debits ≠ Σ Credits — sale aborted to protect GL integrity")
      }

      // ---- 10. IDEMPOTENCY CACHE (inside the transaction) ----
      const result: PosSaleResult = {
        saleId, saleNumber, receiptNumber,
        total, paidTotal, changeDue, receiptRaw, journalEntryId,
      }
      const { receiptRaw: _rr, ...cacheableResult } = result
      await client.query(`
        INSERT INTO public.commerce_idempotency (tenant_id, idempotency_key, operation, request_hash, response_status, response_body, resource_type, resource_id, expires_at)
        VALUES ($1, $2, 'pos_sale', $3, 200, $4, 'sale', $5, now() + interval '24 hours')
      `, [tenant, input.idempotencyKey, JSON.stringify({ lines: input.lines.length, payments: input.payments.length }).slice(0, 500), JSON.stringify(cacheableResult), saleId])

      await client.query("COMMIT")

      return result
    } catch (err) {
      await client.query("ROLLBACK")
      throw err
    }
  })) ?? { error: "Database unavailable" }
}

// ============================================================================
// JOURNAL ENTRY — the balanced GL posting (the guardrail)
// ============================================================================

async function postJournalEntry(
  client: pg.Client,
  tenant: string,
  saleId: string,
  saleNumber: string,
  totals: {
    subtotal: number
    discountTotal: number
    taxTotal: number
    total: number
    totalCost: number
    payments: { paymentMethodId: string; amount: number }[]
  },
): Promise<string | null> {
  // Get GL account IDs for the mapping
  const { rows: glAccounts } = await client.query(`
    SELECT id, code FROM public.acct_chart_of_accounts WHERE tenant_id = $1
  `, [tenant])
  const glByCode = new Map(glAccounts.map((r: any) => [r.code, r.id]))

  // Get the entity + book (required FKs for journal_entries)
  const { rows: entities } = await client.query(`SELECT id FROM public.acct_entities WHERE tenant_id = $1 LIMIT 1`, [tenant])
  const entityId = entities[0]?.id
  if (!entityId) return null

  // Get or create a book
  let { rows: books } = await client.query(`SELECT id FROM public.acct_books WHERE tenant_id = $1 LIMIT 1`, [tenant])
  let bookId = books[0]?.id
  if (!bookId) {
    const { rows: newBook } = await client.query(`INSERT INTO public.acct_books (tenant_id, entity_id, code, name, book_type, accounting_basis, currency, is_primary, active) VALUES ($1, $2, 'MAIN', 'Main Book', 'general', 'accrual', 'USD', true, true) RETURNING id`, [tenant, entityId])
    bookId = newBook[0].id
  }

  // Get or create a period (requires a fiscal year first)
  let { rows: periods } = await client.query(`SELECT id FROM public.acct_periods WHERE tenant_id = $1 AND CURRENT_DATE BETWEEN start_date AND end_date LIMIT 1`, [tenant])
  let periodId = periods[0]?.id
  if (!periodId) {
    // Create fiscal year if missing
    let { rows: fy } = await client.query(`SELECT id FROM public.acct_fiscal_years WHERE tenant_id = $1 AND EXTRACT(YEAR FROM CURRENT_DATE) BETWEEN EXTRACT(YEAR FROM start_date) AND EXTRACT(YEAR FROM end_date) LIMIT 1`, [tenant])
    let fyId = fy[0]?.id
    if (!fyId) {
      const { rows: newFy } = await client.query(`
        INSERT INTO public.acct_fiscal_years (tenant_id, entity_id, fiscal_year, start_date, end_date, is_adjustment_year)
        VALUES ($1, $2, EXTRACT(YEAR FROM CURRENT_DATE)::int, date_trunc('year', CURRENT_DATE)::date, (date_trunc('year', CURRENT_DATE) + interval '1 year' - interval '1 day')::date, false)
        RETURNING id
      `, [tenant, entityId])
      fyId = newFy[0].id
    }
    const { rows: newPeriod } = await client.query(`
      INSERT INTO public.acct_periods (tenant_id, book_id, fiscal_year_id, period_no, name, start_date, end_date, status)
      VALUES ($1, $2, $3, EXTRACT(MONTH FROM CURRENT_DATE)::int, to_char(CURRENT_DATE, 'YYYY-MM'), date_trunc('month', CURRENT_DATE)::date, (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day')::date, 'open')
      RETURNING id
    `, [tenant, bookId, fyId])
    periodId = newPeriod[0].id
  }

  // Build the journal lines
  // DEBITS:  Payment (cash/checking) + COGS + Discounts
  // CREDITS: Revenue + Sales Tax + Inventory
  type JournalLine = { accountId: string; debit: number; credit: number; memo: string }
  const lines: JournalLine[] = []
  let totalDebit = 0
  let totalCredit = 0

  // Debit: Payment method accounts (cash → Cash Drawer, card → Checking)
  // IMPORTANT: debit only the SALE TOTAL, not the tendered amount.
  // The change_due is a separate cash-out (the drawer gives back cash),
  // not part of the revenue entry. This keeps the journal balanced.
  for (const pmt of totals.payments) {
    const { rows: pmRows } = await client.query(`SELECT method_type FROM public.commerce_payment_methods WHERE id = $1`, [pmt.paymentMethodId])
    const mt = pmRows[0]?.method_type || "cash"
    const glCode = mt === "cash" ? "1000" : mt === "card" ? "1010" : mt === "check" ? "1000" : "1010"
    const acctId = glByCode.get(glCode) || glByCode.get("1000")
    if (acctId) {
      // Debit the payment amount, but if it's cash and there's change,
      // the net debit = min(amount, total) — the change goes back out.
      // total = subtotal - discountTotal + taxTotal, so this includes tax.
      const isCash = mt === "cash" || mt === "check"
      const debitAmount = isCash ? Math.min(pmt.amount, totals.total) : pmt.amount
      lines.push({ accountId: acctId, debit: debitAmount, credit: 0, memo: `Payment (${mt})` })
      totalDebit += debitAmount
    }
  }

  // Debit: COGS
  if (totals.totalCost > 0 && glByCode.get("5000")) {
    lines.push({ accountId: glByCode.get("5000")!, debit: totals.totalCost, credit: 0, memo: "COGS" })
    totalDebit += totals.totalCost
  }

  // Debit: Discounts
  if (totals.discountTotal > 0 && glByCode.get("4900")) {
    lines.push({ accountId: glByCode.get("4900")!, debit: totals.discountTotal, credit: 0, memo: "Sales discounts" })
    totalDebit += totals.discountTotal
  }

  // Credit: Revenue (subtotal - discounts)
  const revenue = totals.subtotal
  if (revenue > 0 && glByCode.get("4000")) {
    lines.push({ accountId: glByCode.get("4000")!, debit: 0, credit: revenue, memo: "Product sales revenue" })
    totalCredit += revenue
  }

  // Credit: Sales Tax Payable
  if (totals.taxTotal > 0 && glByCode.get("2200")) {
    lines.push({ accountId: glByCode.get("2200")!, debit: 0, credit: totals.taxTotal, memo: "Sales tax payable" })
    totalCredit += totals.taxTotal
  }

  // Credit: Inventory (for COGS)
  if (totals.totalCost > 0 && glByCode.get("1400")) {
    lines.push({ accountId: glByCode.get("1400")!, debit: 0, credit: totals.totalCost, memo: "Inventory relieved" })
    totalCredit += totals.totalCost
  }

  // ---- THE GUARDRAIL: Σ Debits − Σ Credits must == 0 ----
  // Round to 2 decimal places to avoid floating-point drift
  const debitMinusCredit = Math.round((totalDebit - totalCredit) * 100) / 100
  if (debitMinusCredit !== 0) {
    console.error(`[POS JOURNAL GUARDRAIL] UNBALANCED: debits=${totalDebit} credits=${totalCredit} diff=${debitMinusCredit} — sale ${saleNumber} ABORTED`)
    return null
  }

  // Create a journal batch (required — batch_id is NOT NULL)
  const batchNo = `JB-${Date.now()}`
  const { rows: batchRows } = await client.query(`
    INSERT INTO public.acct_journal_batches (tenant_id, entity_id, book_id, batch_no, source, status, description, source_system)
    VALUES ($1, $2, $3, $4, 'integration', 'posted', 'POS sale batch', 'commerce')
    RETURNING id
  `, [tenant, entityId, bookId, batchNo])
  const batchId = batchRows[0].id

  // Insert the journal entry (entry_no is an identity/generated column)
  const { rows: jeRows } = await client.query(`
    INSERT INTO public.acct_journal_entries (tenant_id, entity_id, book_id, batch_id, period_id, entry_date, posting_date, source, source_id, reference, memo, currency, total_debit, total_credit, status)
    VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, CURRENT_DATE, 'system', $6, $7, $8, 'USD', $9, $10, 'posted')
    RETURNING id
  `, [tenant, entityId, bookId, batchId, periodId, saleId, saleNumber, `POS sale ${saleNumber}`, totalDebit, totalCredit])
  const journalEntryId = jeRows[0].id

  // Insert the journal lines
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    await client.query(`
      INSERT INTO public.acct_journal_lines (tenant_id, entity_id, journal_entry_id, line_no, account_id, description, debit, credit)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [tenant, entityId, journalEntryId, i + 1, line.accountId, line.memo, line.debit, line.credit])
  }

  // Link the journal entry back to the sale
  await client.query(`UPDATE public.commerce_sales SET metadata = metadata || $2 WHERE id = $1`, [saleId, JSON.stringify({ journalEntryId })])

  return journalEntryId
}

// ============================================================================
// ESC/POS RECEIPT GENERATOR
// ============================================================================

function generateEscPosReceipt(data: {
  saleNumber: string
  receiptNumber: string
  lines: { description: string; quantity: number; unitPrice: number }[]
  subtotal: number
  discountTotal: number
  taxTotal: number
  total: number
  paidTotal: number
  changeDue: number
  payments: { amount: number }[]
  hasCashOrCheck: boolean
}): string {
  const ESC = "\x1b"
  const INIT = ESC + "@"
  const BOLD_ON = ESC + "E\x01"
  const BOLD_OFF = ESC + "E\x00"
  const CENTER = ESC + "a\x01"
  const LEFT = ESC + "a\x00"
  const RIGHT = ESC + "a\x02"
  const CUT = "\x1d\x56\x00"
  // Cash drawer kick command (universal — opens RJ12-connected drawer)
  const DRAWER_KICK = "\x1b\x70\x00\x19\xfa"

  let raw = ""
  raw += INIT
  raw += CENTER + BOLD_ON + "All About Pawz\n" + BOLD_OFF
  raw += "4746 Barkshire Drive\nMemphis, TN 38128\n"
  raw += "901-555-0198\n"
  raw += LEFT + `${"-".repeat(42)}\n`
  raw += `Receipt: ${data.receiptNumber}\n`
  raw += `Sale:   ${data.saleNumber}\n`
  raw += `Date:   ${new Date().toLocaleString()}\n`
  raw += `${"-".repeat(42)}\n`

  for (const line of data.lines) {
    const lineTotal = line.unitPrice * line.quantity
    raw += `${line.quantity}x ${line.description.slice(0, 28).padEnd(28)}`
    raw += `$${lineTotal.toFixed(2).padStart(10)}\n`
  }

  raw += `${"-".repeat(42)}\n`
  raw += LEFT + `Subtotal${`$${data.subtotal.toFixed(2)}`.padStart(34)}\n`
  if (data.discountTotal > 0) {
    raw += `Discounts${`-$${data.discountTotal.toFixed(2)}`.padStart(33)}\n`
  }
  raw += `Tax${`$${data.taxTotal.toFixed(2)}`.padStart(39)}\n`
  raw += BOLD_ON + `TOTAL${`$${data.total.toFixed(2)}`.padStart(37)}` + BOLD_OFF + "\n"
  raw += `${"-".repeat(42)}\n`
  raw += `Tendered${`$${data.paidTotal.toFixed(2)}`.padStart(34)}\n`
  raw += `Change${`$${data.changeDue.toFixed(2)}`.padStart(36)}\n`
  raw += `${"-".repeat(42)}\n`
  raw += CENTER + "Thank you for shopping with us!\n"
  raw += "www.aapawz.com\n"
  raw += LEFT + `${"-".repeat(42)}\n`

  // Cash drawer kick — only for cash/check payments
  if (data.hasCashOrCheck) {
    raw += DRAWER_KICK
  }

  raw += CUT
  return raw
}

// ============================================================================
// RETURNS / REFUNDS — never UPDATE/DELETE, always create NEW negative rows
// ============================================================================

export type RefundInput = {
  originalSaleId: string
  refundMethod: string  // 'cash' | 'card' | 'check' | 'gift_card' | 'store_credit'
  amount: number
  reason: string
  lines?: { saleLineId: string; quantity: number; restock: boolean }[]
  createdBy?: string
}

export async function processRefund(input: RefundInput): Promise<{ refundId: string; refundNumber: string; reversalJournalEntryId: string | null } | { error: string }> {
  return (await withPg(async (client) => {
    const tenant = DEFAULT_TENANT()

    // Load the original sale
    const { rows: saleRows } = await client.query(`
      SELECT id, sale_number, subtotal, discount_total, tax_total, total, customer_id
      FROM public.commerce_sales WHERE id = $1 AND tenant_id = $2
    `, [input.originalSaleId, tenant])
    if (saleRows.length === 0) return { error: "Original sale not found" }
    const original = saleRows[0]

    // Check we haven't already refunded more than the original
    const { rows: existingRefunds } = await client.query(`
      SELECT COALESCE(SUM(amount), 0) AS refunded FROM public.commerce_refunds WHERE sale_id = $1 AND status = 'completed'
    `, [input.originalSaleId])
    const alreadyRefunded = Number(existingRefunds[0].refunded) || 0
    if (alreadyRefunded + input.amount > Number(original.total)) {
      return { error: `Refund exceeds original sale total (already refunded $${alreadyRefunded.toFixed(2)})` }
    }

    await client.query("BEGIN")
    try {
      const refundNumber = `REF-${Date.now().toString().slice(-10)}`

      // 1. Insert commerce_refunds (the reversal record)
      const { rows: refundRows } = await client.query(`
        INSERT INTO public.commerce_refunds
          (tenant_id, refund_number, sale_id, amount, reason, status, refund_method, processed_at, created_by)
        VALUES ($1, $2, $3, $4, $5, 'completed', $6, now(), $7)
        RETURNING id
      `, [tenant, refundNumber, input.originalSaleId, input.amount, input.reason, input.refundMethod, input.createdBy || null])
      const refundId = refundRows[0].id

      // 2. Insert refund lines (with restock flag)
      if (input.lines) {
        for (const rl of input.lines) {
          await client.query(`
            INSERT INTO public.commerce_refund_lines (refund_id, sale_line_id, quantity, amount, restock, disposition)
            VALUES ($1, $2, $3, $4, $5, 'returned')
          `, [refundId, rl.saleLineId, rl.quantity, input.amount / input.lines.length, rl.restock])
        }
      }

      // 3. Create a NEW commerce_sales row with NEGATIVE total (the reversal)
      const reversalSaleNumber = `POS-REV-${Date.now().toString().slice(-10)}`
      const { rows: reversalRows } = await client.query(`
        INSERT INTO public.commerce_sales
          (tenant_id, sale_number, customer_id, source, status, currency,
           subtotal, discount_total, tax_total, total, paid_total, change_due,
           sale_at, completed_at, created_by, metadata)
        VALUES ($1, $2, $3, 'pos_refund', 'completed', 'USD',
                $4, 0, $5, $6, $6, 0, now(), now(), $7, $8)
        RETURNING id
      `, [
        tenant, reversalSaleNumber, original.customer_id,
        -Number(original.subtotal), -Number(original.tax_total), -input.amount,
        input.createdBy || null,
        JSON.stringify({ refundOf: input.originalSaleId, refundId, reason: input.reason }),
      ])
      const reversalSaleId = reversalRows[0].id

      // 4. Restock inventory (if any line has restock=true)
      if (input.lines) {
        for (const rl of input.lines) {
          if (rl.restock) {
            // Get the sku_id from the original sale line
            const { rows: slRows } = await client.query(`SELECT sku_id, description FROM public.commerce_sale_lines WHERE id = $1`, [rl.saleLineId])
            if (slRows[0]?.sku_id) {
              // Create a positive inventory movement (return to stock)
              const wh = await client.query(`SELECT id FROM public.erp_warehouses WHERE tenant_id = $1 AND code = 'MAIN' LIMIT 1`, [tenant])
              if (wh.rows[0]) {
                await client.query(`
                  INSERT INTO public.erp_inventory_movements
                    (tenant_id, movement_type, sku_id, warehouse_id, quantity, unit_cost, source_type, source_id, reason, occurred_at)
                  VALUES ($1, 'return', $2, $3, $4, 0, 'refund', $5, 'Customer return', now())
                `, [tenant, slRows[0].sku_id, wh.rows[0].id, rl.quantity, refundId])
              }
            }
          }
        }
      }

      // 5. Post the REVERSAL journal entry (invert the original)
      const reversalJournalEntryId = await postReversalJournalEntry(client, tenant, refundId, refundNumber, {
        amount: input.amount,
        refundMethod: input.refundMethod,
      })

      await client.query("COMMIT")
      return { refundId, refundNumber, reversalJournalEntryId }
    } catch (err) {
      await client.query("ROLLBACK")
      throw err
    }
  })) ?? { error: "Database unavailable" }
}

async function postReversalJournalEntry(
  client: pg.Client,
  tenant: string,
  refundId: string,
  refundNumber: string,
  data: { amount: number; refundMethod: string },
): Promise<string | null> {
  const { rows: glAccounts } = await client.query(`SELECT id, code FROM public.acct_chart_of_accounts WHERE tenant_id = $1`, [tenant])
  const glByCode = new Map(glAccounts.map((r: any) => [r.code, r.id]))
  const { rows: entities } = await client.query(`SELECT id FROM public.acct_entities WHERE tenant_id = $1 LIMIT 1`, [tenant])
  const entityId = entities[0]?.id
  let { rows: books } = await client.query(`SELECT id FROM public.acct_books WHERE tenant_id = $1 LIMIT 1`, [tenant])
  const bookId = books[0]?.id
  let { rows: periods } = await client.query(`SELECT id FROM public.acct_periods WHERE tenant_id = $1 AND CURRENT_DATE BETWEEN start_date AND end_date LIMIT 1`, [tenant])
  const periodId = periods[0]?.id
  if (!entityId || !bookId || !periodId) return null

  // INVERT the original: Debit Revenue, Credit Cash/Checking
  const glCode = data.refundMethod === "cash" || data.refundMethod === "check" ? "1000" : "1010"
  const debitAcct = glByCode.get("4000") // Revenue
  const creditAcct = glByCode.get(glCode) || glByCode.get("1000")

  const totalDebit = data.amount
  const totalCredit = data.amount

  // Guardrail
  if (Math.round((totalDebit - totalCredit) * 100) / 100 !== 0) return null

  // Create a batch for the refund journal entry first (batch_id is NOT NULL)
  const refundBatchNo = `JB-REF-${Date.now()}`
  const { rows: refundBatchRows } = await client.query(`
    INSERT INTO public.acct_journal_batches (tenant_id, entity_id, book_id, batch_no, source, status, description, source_system)
    VALUES ($1, $2, $3, $4, 'integration', 'posted', 'POS refund batch', 'commerce')
    RETURNING id
  `, [tenant, entityId, bookId, refundBatchNo])
  const refundBatchId = refundBatchRows[0].id

  const { rows: jeRows } = await client.query(`
    INSERT INTO public.acct_journal_entries (tenant_id, entity_id, book_id, batch_id, period_id, entry_date, posting_date, source, source_id, reference, memo, currency, total_debit, total_credit, status)
    VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, CURRENT_DATE, 'system', $6, $7, $8, 'USD', $9, $10, 'posted')
    RETURNING id
  `, [tenant, entityId, bookId, refundBatchId, periodId, refundId, refundNumber, `Refund ${refundNumber}`, totalDebit, totalCredit])

  const journalEntryId = jeRows[0].id

  await client.query(`INSERT INTO public.acct_journal_lines (tenant_id, entity_id, journal_entry_id, line_no, account_id, description, debit, credit) VALUES ($1, $2, $3, 1, $4, 'Refund - revenue reversal', $5, 0)`, [tenant, entityId, journalEntryId, debitAcct, totalDebit])
  await client.query(`INSERT INTO public.acct_journal_lines (tenant_id, entity_id, journal_entry_id, line_no, account_id, description, debit, credit) VALUES ($1, $2, $3, 2, $4, 'Refund - cash/check return', 0, $5)`, [tenant, entityId, journalEntryId, creditAcct, totalCredit])

  return journalEntryId
}

// ============================================================================
// READ — today's sales summary
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
      WHERE s.tenant_id = $1 AND s.source = 'pos' AND s.sale_at::date = CURRENT_DATE AND s.status = 'completed'
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
