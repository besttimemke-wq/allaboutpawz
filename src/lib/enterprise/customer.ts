import "server-only"
import pg from "pg"
import { withPg, TENANT_ID } from "@/lib/crm/enterprise"

// ============================================================================
// enterprise/customer.ts — the customer account + address data layer.
//
// Wires directly into:
//   crm_customers                 — the CRM person record (email, name, phone)
//   commerce_customer_accounts    — the commerce account (tax_exempt, credit_limit)
//   commerce_customer_addresses   — saved shipping/billing addresses
//
// Auth: the caller resolves the customer via the session cookie's email,
// then passes the crm_customers.id (customerId) to these functions.
// ============================================================================

export type CrmCustomer = {
  id: string
  tenantId: string
  email: string | null
  firstName: string | null
  lastName: string | null
  phone: string | null
  mobilePhone: string | null
  companyName: string | null
  lifecycleStage: string | null
  preferredContactMethod: string | null
}

export type CustomerAccount = {
  id: string
  customerId: string
  priceListId: string | null
  taxExempt: boolean
  taxExemptionNumber: string | null
  creditLimit: number
  active: boolean
  createdAt: string
  updatedAt: string
}

export type CustomerAddress = {
  id: string
  customerId: string
  addressType: string
  firstName: string | null
  lastName: string | null
  company: string | null
  line1: string
  line2: string | null
  city: string
  state: string | null
  postalCode: string | null
  countryCode: string
  phone: string | null
  isDefault: boolean
  createdAt: string
}

export type CustomerStats = {
  totalSpent: number
  orderCount: number
  inTransit: number
  latestStatus: string | null
}

// ---------------------------------------------------------------------------
// lookups
// ---------------------------------------------------------------------------

export async function getCustomerByEmail(email: string): Promise<CrmCustomer | null> {
  return (await withPg(async (client) => {
    const { rows } = await client.query(
      `SELECT id, tenant_id, email, first_name, last_name, phone, mobile_phone,
              company_name, lifecycle_stage, preferred_contact_method
       FROM public.crm_customers
       WHERE lower(email) = lower($1) LIMIT 1`,
      [email],
    )
    if (rows.length === 0) return null
    const r = rows[0]
    return {
      id: r.id,
      tenantId: r.tenant_id,
      email: r.email,
      firstName: r.first_name,
      lastName: r.last_name,
      phone: r.phone,
      mobilePhone: r.mobile_phone,
      companyName: r.company_name,
      lifecycleStage: r.lifecycle_stage,
      preferredContactMethod: r.preferred_contact_method,
    }
  })) ?? null
}

export async function getCustomerAccount(customerId: string): Promise<CustomerAccount | null> {
  return (await withPg(async (client) => {
    const { rows } = await client.query(
      `SELECT id, customer_id, price_list_id, tax_exempt, tax_exemption_number,
              credit_limit, active, created_at, updated_at
       FROM public.commerce_customer_accounts
       WHERE customer_id = $1 LIMIT 1`,
      [customerId],
    )
    if (rows.length === 0) return null
    const r = rows[0]
    return {
      id: r.id,
      customerId: r.customer_id,
      priceListId: r.price_list_id,
      taxExempt: r.tax_exempt,
      taxExemptionNumber: r.tax_exemption_number,
      creditLimit: Number(r.credit_limit) || 0,
      active: r.active,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }
  })) ?? null
}

// Find-or-create a commerce_customer_accounts row for the customer.
export async function ensureCustomerAccount(customerId: string): Promise<CustomerAccount | null> {
  const existing = await getCustomerAccount(customerId)
  if (existing) return existing
  return (await withPg(async (client) => {
    const tenant = TENANT_ID()
    const { rows } = await client.query(
      `INSERT INTO public.commerce_customer_accounts (tenant_id, customer_id, active)
       VALUES ($1, $2, true)
       ON CONFLICT DO NOTHING
       RETURNING id, customer_id, price_list_id, tax_exempt, tax_exemption_number, credit_limit, active, created_at, updated_at`,
      [tenant, customerId],
    )
    if (rows.length === 0) {
      // ON CONFLICT DO NOTHING hit — another caller created it. Re-fetch.
      return await getCustomerAccount(customerId)
    }
    const r = rows[0]
    return {
      id: r.id,
      customerId: r.customer_id,
      priceListId: r.price_list_id,
      taxExempt: r.tax_exempt,
      taxExemptionNumber: r.tax_exemption_number,
      creditLimit: Number(r.credit_limit) || 0,
      active: r.active,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    } as CustomerAccount
  })) ?? null
}

// ---------------------------------------------------------------------------
// profile update (crm_customers)
// ---------------------------------------------------------------------------

export async function updateCustomerProfile(
  customerId: string,
  patch: { firstName?: string; lastName?: string; phone?: string; mobilePhone?: string },
): Promise<void> {
  await withPg(async (client) => {
    await client.query(
      `UPDATE public.crm_customers SET
         first_name = COALESCE($2, first_name),
         last_name = COALESCE($3, last_name),
         phone = COALESCE($4, phone),
         mobile_phone = COALESCE($5, mobile_phone)
       WHERE id = $1`,
      [
        customerId,
        patch.firstName ?? null,
        patch.lastName ?? null,
        patch.phone ?? null,
        patch.mobilePhone ?? null,
      ],
    )
  })
}

export async function updateCustomerAccount(
  customerId: string,
  patch: { taxExempt?: boolean; taxExemptionNumber?: string; creditLimit?: number },
): Promise<void> {
  await withPg(async (client) => {
    await client.query(
      `UPDATE public.commerce_customer_accounts SET
         tax_exempt = COALESCE($2, tax_exempt),
         tax_exemption_number = COALESCE($3, tax_exemption_number),
         credit_limit = COALESCE($4, credit_limit),
         updated_at = now()
       WHERE customer_id = $1`,
      [
        customerId,
        patch.taxExempt ?? null,
        patch.taxExemptionNumber ?? null,
        patch.creditLimit ?? null,
      ],
    )
  })
}

// ---------------------------------------------------------------------------
// addresses
// ---------------------------------------------------------------------------

export type AddressInput = {
  addressType?: string
  firstName?: string
  lastName?: string
  company?: string
  line1: string
  line2?: string
  city: string
  state?: string
  postalCode?: string
  countryCode?: string
  phone?: string
  isDefault?: boolean
}

export async function listCustomerAddresses(customerId: string): Promise<CustomerAddress[]> {
  return (await withPg(async (client) => {
    const { rows } = await client.query(
      `SELECT id, customer_id, address_type, first_name, last_name, company,
              line1, line2, city, state, postal_code, country_code, phone,
              is_default, created_at
       FROM public.commerce_customer_addresses
       WHERE customer_id = $1
       ORDER BY is_default DESC, created_at DESC`,
      [customerId],
    )
    return rows.map((r: any) => ({
      id: r.id,
      customerId: r.customer_id,
      addressType: r.address_type,
      firstName: r.first_name,
      lastName: r.last_name,
      company: r.company,
      line1: r.line1,
      line2: r.line2,
      city: r.city,
      state: r.state,
      postalCode: r.postal_code,
      countryCode: r.country_code,
      phone: r.phone,
      isDefault: r.is_default,
      createdAt: r.created_at,
    }))
  })) ?? []
}

export async function createCustomerAddress(
  customerId: string,
  input: AddressInput,
): Promise<CustomerAddress | null> {
  return (await withPg(async (client) => {
    const tenant = TENANT_ID()
    await client.query("BEGIN")
    try {
      // If is_default, unset is_default on the customer's other addresses.
      if (input.isDefault) {
        await client.query(
          `UPDATE public.commerce_customer_addresses SET is_default = false WHERE customer_id = $1`,
          [customerId],
        )
      }
      const { rows } = await client.query(
        `INSERT INTO public.commerce_customer_addresses
           (tenant_id, customer_id, address_type, first_name, last_name, company,
            line1, line2, city, state, postal_code, country_code, phone, is_default)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING id, customer_id, address_type, first_name, last_name, company,
                   line1, line2, city, state, postal_code, country_code, phone,
                   is_default, created_at`,
        [
          tenant, customerId, input.addressType || "shipping",
          input.firstName ?? null, input.lastName ?? null, input.company ?? null,
          input.line1, input.line2 ?? null, input.city, input.state ?? null,
          input.postalCode ?? null, input.countryCode || "US", input.phone ?? null,
          input.isDefault ?? false,
        ],
      )
      await client.query("COMMIT")
      const r = rows[0]
      return {
        id: r.id, customerId: r.customer_id, addressType: r.address_type,
        firstName: r.first_name, lastName: r.last_name, company: r.company,
        line1: r.line1, line2: r.line2, city: r.city, state: r.state,
        postalCode: r.postal_code, countryCode: r.country_code, phone: r.phone,
        isDefault: r.is_default, createdAt: r.created_at,
      }
    } catch (err) {
      await client.query("ROLLBACK")
      throw err
    }
  })) ?? null
}

export async function updateCustomerAddress(
  addressId: string,
  customerId: string,
  patch: Partial<AddressInput>,
): Promise<void> {
  await withPg(async (client) => {
    await client.query("BEGIN")
    try {
      if (patch.isDefault) {
        await client.query(
          `UPDATE public.commerce_customer_addresses SET is_default = false WHERE customer_id = $1`,
          [customerId],
        )
      }
      await client.query(
        `UPDATE public.commerce_customer_addresses SET
           address_type = COALESCE($2, address_type),
           first_name = COALESCE($3, first_name),
           last_name = COALESCE($4, last_name),
           company = COALESCE($5, company),
           line1 = COALESCE($6, line1),
           line2 = COALESCE($7, line2),
           city = COALESCE($8, city),
           state = COALESCE($9, state),
           postal_code = COALESCE($10, postal_code),
           country_code = COALESCE($11, country_code),
           phone = COALESCE($12, phone),
           is_default = COALESCE($13, is_default)
         WHERE id = $1 AND customer_id = $14`,
        [
          addressId,
          patch.addressType ?? null, patch.firstName ?? null, patch.lastName ?? null,
          patch.company ?? null, patch.line1 ?? null, patch.line2 ?? null,
          patch.city ?? null, patch.state ?? null, patch.postalCode ?? null,
          patch.countryCode ?? null, patch.phone ?? null, patch.isDefault ?? null,
          customerId,
        ],
      )
      await client.query("COMMIT")
    } catch (err) {
      await client.query("ROLLBACK")
      throw err
    }
  })
}

export async function deleteCustomerAddress(addressId: string, customerId: string): Promise<{ ok: boolean; error?: string }> {
  return (await withPg(async (client) => {
    // Never delete the last address.
    const { rows: countRows } = await client.query(
      `SELECT count(*)::int AS n FROM public.commerce_customer_addresses WHERE customer_id = $1`,
      [customerId],
    )
    if (countRows[0].n <= 1) {
      return { ok: false, error: "Cannot delete your last saved address." }
    }
    await client.query(
      `DELETE FROM public.commerce_customer_addresses WHERE id = $1 AND customer_id = $2`,
      [addressId, customerId],
    )
    return { ok: true }
  })) ?? { ok: false, error: "Database unavailable" }
}

// ---------------------------------------------------------------------------
// stats (from commerce_orders — the customer's lifetime shop activity)
// ---------------------------------------------------------------------------

export async function getCustomerStats(email: string): Promise<CustomerStats> {
  return (await withPg(async (client) => {
    const { rows } = await client.query(
      `SELECT
         COALESCE(SUM(CASE WHEN payment_status = 'paid'
                           THEN CAST(total_amount AS numeric) ELSE 0 END), 0) AS total_spent,
         count(*) AS order_count,
         count(*) FILTER (WHERE fulfillment_status IN ('shipped','in_transit')) AS in_transit,
         (SELECT fulfillment_status FROM public.commerce_orders
          WHERE lower(email) = lower($1)
          ORDER BY created_at DESC LIMIT 1) AS latest_status
       FROM public.commerce_orders
       WHERE lower(email) = lower($1)`,
      [email],
    )
    const r = rows[0] || {}
    return {
      totalSpent: Number(r.total_spent) || 0,
      orderCount: Number(r.order_count) || 0,
      inTransit: Number(r.in_transit) || 0,
      latestStatus: r.latest_status || null,
    }
  })) ?? { totalSpent: 0, orderCount: 0, inTransit: 0, latestStatus: null }
}
