import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { SESSION_COOKIE_NAME, verifySessionToken, sessionFromPayload } from "@/lib/pawz-auth"
import {
  getCustomerByEmail,
  ensureCustomerAccount,
  updateCustomerProfile,
  updateCustomerAccount,
} from "@/lib/enterprise/customer"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// ============================================================================
// /api/customer/account — the signed-in customer's profile + commerce account.
//   GET    → { profile: CrmCustomer, account: CustomerAccount }
//   PATCH  → updates first_name/last_name/phone on crm_customers +
//            tax_exempt/tax_exemption_number on commerce_customer_accounts
// Auth: pawz_session cookie (same pattern as /api/customer/orders).
// ============================================================================

async function sessionUser() {
  const cookieStore = await cookies()
  const payload = verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value)
  if (payload) return sessionFromPayload(payload)
  return null
}

export async function GET() {
  try {
    const user = await sessionUser()
    if (!user?.email) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 })
    }

    const crm = await getCustomerByEmail(user.email)
    if (!crm) {
      return NextResponse.json({ error: "No customer profile found for this account." }, { status: 404 })
    }
    const account = await ensureCustomerAccount(crm.id)
    return NextResponse.json({ profile: crm, account })
  } catch (e: any) {
    console.error("[GET /api/customer/account]", e)
    return NextResponse.json({ error: e.message || "Failed to load account" }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await sessionUser()
    if (!user?.email) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 })
    }
    const body = await req.json().catch(() => ({}))
    const crm = await getCustomerByEmail(user.email)
    if (!crm) {
      return NextResponse.json({ error: "No customer profile found for this account." }, { status: 404 })
    }

    // Profile fields (crm_customers)
    if (body.firstName !== undefined || body.lastName !== undefined || body.phone !== undefined || body.mobilePhone !== undefined) {
      await updateCustomerProfile(crm.id, {
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone,
        mobilePhone: body.mobilePhone,
      })
    }
    // Account fields (commerce_customer_accounts)
    if (body.taxExempt !== undefined || body.taxExemptionNumber !== undefined || body.creditLimit !== undefined) {
      await ensureCustomerAccount(crm.id)
      await updateCustomerAccount(crm.id, {
        taxExempt: body.taxExempt,
        taxExemptionNumber: body.taxExemptionNumber,
        creditLimit: body.creditLimit,
      })
    }

    // Re-fetch + return the updated state.
    const refreshed = await getCustomerByEmail(user.email)
    const account = await ensureCustomerAccount(crm.id)
    return NextResponse.json({ profile: refreshed, account })
  } catch (e: any) {
    console.error("[PATCH /api/customer/account]", e)
    return NextResponse.json({ error: e.message || "Failed to update account" }, { status: 500 })
  }
}
