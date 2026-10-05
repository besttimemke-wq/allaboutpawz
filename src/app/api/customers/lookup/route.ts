import { NextRequest, NextResponse } from "next/server";
import { repo } from "@/lib/repo";

// ---------------------------------------------------------------------------
// GET /api/customers/lookup?email=…
// Returning-customer prefill for the booking wizard's first step (EMAIL
// FIRST). Minimal fields only — exactly what the wizard prefills, nothing
// more. 404 when the email is unknown (the wizard then runs as a fresh
// guest). The wizard's email-first step deliberately captures identity
// BEFORE any selection happens, so an abandoned booking is attributable
// server-side from the very first screen — this endpoint is what makes a
// KNOWN visitor's second booking fast (contact + pups autofill).
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    const email = (new URL(req.url).searchParams.get("email") || "").trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const customers = (await repo.list("customers").catch(() => [])) as any[];
    const found = customers.find((c: any) => String(c.email || "").toLowerCase() === email);
    if (!found) {
      return NextResponse.json({ found: false }, { status: 404 });
    }

    // Their pups — what step 3 offers as ON FILE (reuse instead of
    // re-typing; the wizard UPDATEs the row rather than duplicating it).
    const dogs = (await repo.list("dogs").catch(() => [])) as any[];
    const theirDogs = dogs
      .filter((d: any) => d.customerId === found.id)
      .map((d: any) => ({
        id: d.id,
        name: d.name || "",
        breedId: d.breedId || "",
        breedName: d.breedName || d.breed || "",
        weightLbs:
          d.weightLbs != null
            ? String(d.weightLbs)
            : d.weight
              ? String(d.weight).replace(/[^0-9.]/g, "")
              : "",
        sex: d.sex || "",
        birthDate: d.birthDate || "",
        color: d.color || "",
        photoUrl: d.photoUrl || "",
      }));

    return NextResponse.json({
      found: true,
      customer: {
        id: found.id,
        firstName: found.firstName || "",
        lastName: found.lastName || "",
        phone: found.phone || "",
        address: found.address || "",
        addressLine2: found.addressLine2 || "",
        city: found.city || "",
        state: found.state || "",
        postalCode: found.postalCode || "",
      },
      dogs: theirDogs,
    });
  } catch (error: any) {
    console.error("[api/customers lookup]", error);
    return NextResponse.json({ error: error.message || "Lookup failed" }, { status: 500 });
  }
}
