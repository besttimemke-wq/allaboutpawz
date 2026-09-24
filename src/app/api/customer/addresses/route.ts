import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { SESSION_COOKIE_NAME, verifySessionToken, sessionFromPayload } from "@/lib/pawz-auth"
import {
  getCustomerByEmail,
  listCustomerAddresses,
  createCustomerAddress,
} from "@/lib/enterprise/customer"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

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
      return NextResponse.json({ addresses: [] })
    }
    const addresses = await listCustomerAddresses(crm.id)
    return NextResponse.json({ addresses })
  } catch (e: any) {
    console.error("[GET /api/customer/addresses]", e)
    return NextResponse.json({ error: e.message || "Failed to load addresses" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await sessionUser()
    if (!user?.email) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 })
    }
    const body = await req.json().catch(() => ({}))
    if (!body.line1 || !body.city) {
      return NextResponse.json({ error: "Address line 1 and city are required." }, { status: 400 })
    }
    const crm = await getCustomerByEmail(user.email)
    if (!crm) {
      return NextResponse.json({ error: "No customer profile found for this account." }, { status: 404 })
    }
    const created = await createCustomerAddress(crm.id, {
      addressType: body.addressType || "shipping",
      firstName: body.firstName,
      lastName: body.lastName,
      company: body.company,
      line1: body.line1,
      line2: body.line2,
      city: body.city,
      state: body.state,
      postalCode: body.postalCode,
      countryCode: body.countryCode || "US",
      phone: body.phone,
      isDefault: body.isDefault === true,
    })
    return NextResponse.json({ address: created })
  } catch (e: any) {
    console.error("[POST /api/customer/addresses]", e)
    return NextResponse.json({ error: e.message || "Failed to create address" }, { status: 500 })
  }
}
