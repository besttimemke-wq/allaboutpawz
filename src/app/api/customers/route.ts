import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { repo } from "@/lib/repo";
import { isAdmin } from "@/lib/auth/server";
import { enrollCustomer } from "@/lib/auth/enroll-customer";
import { withPg, TENANT_ID } from "@/lib/crm/enterprise";

let _stripe: Stripe | null = null;
function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return _stripe;
}

// Paid payments per customer, from the owner's commerce_payments ledger —
// keyed by the crm_customers registry (email or the salon-record back-link).
async function paidSpendByCustomer(): Promise<Map<string, number>> {
  return withPg(async (client) => {
    const res = await client.query(
      `SELECT cc.source_customer_id, lower(cc.email) AS email, SUM(cp.amount) AS spent
       FROM public.commerce_payments cp
       JOIN public.crm_customers cc ON cp.customer_id = cc.id
       WHERE cp.tenant_id = $1 AND cp.status IN ('succeeded', 'captured')
       GROUP BY cc.source_customer_id, lower(cc.email)`,
      [TENANT_ID()],
    )
    const map = new Map<string, number>();
    for (const r of res.rows) {
      const spent = parseFloat(String(r.spent || "0")) || 0;
      if (r.email) map.set(String(r.email), spent);
      if (r.source_customer_id) map.set(String(r.source_customer_id), spent);
    }
    return map;
  }).catch(() => new Map<string, number>()) as Promise<Map<string, number>>;
}

// GET /api/customers - List customers with dogs & bookings
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";

    const [customers, dogs, bookings, spend] = await Promise.all([
      repo.list("customers").catch(() => []),
      repo.list("dogs").catch(() => []),
      repo.list("bookings").catch(() => []),
      paidSpendByCustomer(),
    ]);

    // Enhance customers with dogs, latest booking, and calculated spend
    const enhanced = customers.map((c: any) => {
      const customerDogs = dogs.filter((d: any) => d.customerId === c.id);
      const customerBookings = bookings.filter((b: any) => b.customerId === c.id || b.email?.toLowerCase() === c.email?.toLowerCase());
      const calculatedSpent = spend.get(String(c.id)) || spend.get(String(c.email || "").toLowerCase()) || 0;

      // Sort bookings by date
      const sortedBookings = [...customerBookings].sort((a, b) => {
        const dateA = new Date(a.date || a.createdAt).getTime();
        const dateB = new Date(b.date || b.createdAt).getTime();
        return dateB - dateA;
      });

      const upcoming = customerBookings.find((b: any) => {
        if (!b.date) return false;
        return new Date(b.date).getTime() >= new Date().setHours(0, 0, 0, 0) && b.status !== "CANCELLED" && b.status !== "CANCELED";
      });

      const lastVisit = sortedBookings.find((b: any) => b.status === "COMPLETED" || b.status === "CONFIRMED");

      return {
        ...c,
        name: `${c.firstName || ""} ${c.lastName || ""}`.trim() || c.email || "Unnamed Customer",
        pets: customerDogs.map((d: any) => d.name || "Pet"),
        petDetails: customerDogs,
        totalSpent: calculatedSpent || (c.totalSpent || 0),
        lastVisit: lastVisit ? lastVisit.date : (c.lastVisit || "No visits yet"),
        lastService: lastVisit ? lastVisit.service : "—",
        nextAppointment: upcoming ? upcoming.date : undefined,
        nextApptTime: upcoming ? upcoming.time : undefined,
        bookingsCount: customerBookings.length,
        dogsCount: customerDogs.length,
      };
    });

    if (search) {
      const q = search.toLowerCase();
      const filtered = enhanced.filter((c: any) =>
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.pets.some((p: string) => p.toLowerCase().includes(q))
      );
      return NextResponse.json({ customers: filtered });
    }

    return NextResponse.json({ customers: enhanced });
  } catch (error: any) {
    console.error("[api/customers GET]", error);
    return NextResponse.json({ error: error.message || "Failed to fetch customers" }, { status: 500 });
  }
}

// POST /api/customers - Create or update customer & sync Stripe Customer
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { firstName, lastName, email, phone, address, addressLine2, city, state, postalCode, notes } = body;

    if (!email || !firstName) {
      return NextResponse.json({ error: "firstName and email are required" }, { status: 400 });
    }

    // 1. Check if customer already exists by email
    const existing = (await repo.list("customers")) as any[];
    const found = existing.find((c: any) => c.email?.toLowerCase() === email.toLowerCase());

    // 2. Sync to Stripe
    const stripe = getStripe();
    let stripeCustomer: Stripe.Customer | Stripe.DeletedCustomer | null = null;
    if (stripe) {
      try {
        if (found?.stripeCustomerId) {
          stripeCustomer = await stripe.customers.retrieve(found.stripeCustomerId);
        }
        if (!stripeCustomer || (stripeCustomer as Stripe.DeletedCustomer).deleted) {
          stripeCustomer = await stripe.customers.create({
            email,
            name: `${firstName} ${lastName || ""}`.trim(),
            phone: phone || undefined,
            address: address ? {
              line1: address,
              line2: addressLine2 || undefined,
              city: city || undefined,
              state: state || undefined,
              postal_code: postalCode || undefined,
              country: "US",
            } : undefined,
          });
        } else if (found) {
          stripeCustomer = await stripe.customers.update(found.stripeCustomerId, {
            email,
            name: `${firstName} ${lastName || ""}`.trim(),
            phone: phone || undefined,
          });
        }
      } catch (e: any) {
        console.error("[customer API] Stripe sync error:", e.message);
      }
    }

    // 3. Persist in Supabase
    const data: any = {
      firstName,
      lastName: lastName || "",
      email,
      phone: phone || "",
      address: address || "",
      addressLine2: addressLine2 || "",
      city: city || "",
      state: state || "",
      postalCode: postalCode || "",
      stripeCustomerId: (stripeCustomer as Stripe.Customer)?.id || found?.stripeCustomerId || null,
      customerStatus: "ACTIVE",
    };

    let customer: any;
    if (found) {
      customer = await repo.update("customers", found.id, data);
    } else {
      customer = await repo.create("customers", data);
    }

    // Walk-in: when an ADMIN creates the customer, the identical
    // enrollCustomer() runs — the same invite email fires as an online
    // purchase or booking (the admin stays in the loop only for walk-ins,
    // and even then through the same function, not a separate path).
    // Public callers (booking wizard) never trigger this: their enrollment
    // is the Stripe webhook after payment actually clears.
    let invited = false;
    if (!found) {
      const adminCaller = await isAdmin().catch(() => false);
      if (adminCaller) {
        try {
          const result = await enrollCustomer({ email, source: "walkin", referenceId: customer?.id });
          invited = result.invited;
        } catch (e: any) {
          console.error("[api/customers POST] walk-in enroll failed:", e.message);
        }
      }
    }

    return NextResponse.json({ ...customer, invited }, { status: found ? 200 : 201 });
  } catch (error: any) {
    console.error("[api/customers POST]", error);
    return NextResponse.json({ error: error.message || "Failed to save customer" }, { status: 500 });
  }
}
