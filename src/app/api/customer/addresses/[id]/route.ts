import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { SESSION_COOKIE_NAME, verifySessionToken, sessionFromPayload } from "@/lib/pawz-auth"
import {
  getCustomerByEmail,
  updateCustomerAddress,
  deleteCustomerAddress,
} from "@/lib/enterprise/customer"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

async function sessionUser() {
  const cookieStore = await cookies()
  const payload = verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value)
  if (payload) return sessionFromPayload(payload)
  return null
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await sessionUser()
    if (!user?.email) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 })
    }
    const { id } = await ctx.params
    const body = await req.json().catch(() => ({}))
    const crm = await getCustomerByEmail(user.email)
    if (!crm) {
      return NextResponse.json({ error: "No customer profile found for this account." }, { status: 404 })
    }
    await updateCustomerAddress(id, crm.id, {
      addressType: body.addressType,
      firstName: body.firstName,
      lastName: body.lastName,
      company: body.company,
      line1: body.line1,
      line2: body.line2,
      city: body.city,
      state: body.state,
      postalCode: body.postalCode,
      countryCode: body.countryCode,
      phone: body.phone,
      isDefault: body.isDefault,
    })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error("[PATCH /api/customer/addresses/[id]]", e)
    return NextResponse.json({ error: e.message || "Failed to update address" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await sessionUser()
    if (!user?.email) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 })
    }
    const { id } = await ctx.params
    const crm = await getCustomerByEmail(user.email)
    if (!crm) {
      return NextResponse.json({ error: "No customer profile found for this account." }, { status: 404 })
    }
    const result = await deleteCustomerAddress(id, crm.id)
    if (!result.ok) {
      return NextResponse.json({ error: result.error || "Failed to delete address" }, { status: 409 })
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error("[DELETE /api/customer/addresses/[id]]", e)
    return NextResponse.json({ error: e.message || "Failed to delete address" }, { status: 500 })
  }
}
