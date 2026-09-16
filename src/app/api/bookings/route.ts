import { NextRequest, NextResponse } from "next/server";
import { repo } from "@/lib/repo";

// GET /api/bookings - List all appointments with full customer, dog, groomer details
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const status = searchParams.get("status");
    const groomerId = searchParams.get("groomerId");

    const [bookings, customers, dogs, staff] = await Promise.all([
      repo.list("bookings").catch(() => []),
      repo.list("customers").catch(() => []),
      repo.list("dogs").catch(() => []),
      repo.list("staff").catch(() => []),
    ]);

    let results = bookings.map((b: any) => {
      const customer = customers.find((c: any) => c.id === b.customerId || c.email?.toLowerCase() === b.email?.toLowerCase());
      const dog = dogs.find((d: any) => d.id === b.dogId || (d.customerId === b.customerId && d.name?.toLowerCase() === b.dogName?.toLowerCase()));
      const groomer = staff.find((s: any) => s.id === b.groomerId);

      return {
        id: b.id,
        date: b.date || "2026-09-18",
        time: b.time || "10:00 AM",
        duration: "2.0 hrs",
        customerName: b.ownerName || (customer ? `${customer.firstName} ${customer.lastName}`.trim() : "Guest Customer"),
        customerEmail: b.email || customer?.email,
        customerPhone: b.phone || customer?.phone,
        customerId: b.customerId || customer?.id,
        petName: b.dogName || dog?.name || "Pup",
        breed: b.breed || dog?.breedName || dog?.breed || "Mixed Breed",
        dogId: b.dogId || dog?.id,
        petAvatar: dog?.photoUrl,
        serviceName: b.service || "Full Groom",
        staffName: groomer?.name || "Assigned Stylist",
        groomerId: b.groomerId || groomer?.id,
        status: b.status === "PAYMENT_PENDING" ? "Scheduled" : (b.status || "Scheduled"),
        paymentStatus: b.paymentStatus || (b.status === "CONFIRMED" ? "Deposit Paid" : "Unpaid"),
        price: parseFloat(String(b.servicePrice || "95").replace(/[^0-9.]/g, "")) || 95,
        depositAmount: parseFloat(String(b.depositAmount || "25").replace(/[^0-9.]/g, "")) || 25,
        notes: b.notes || "",
        createdAt: b.createdAt,
      };
    });

    if (date) {
      results = results.filter((b: any) => b.date === date);
    }
    if (status && status !== "ALL") {
      results = results.filter((b: any) => b.status.toLowerCase() === status.toLowerCase());
    }
    if (groomerId && groomerId !== "ALL") {
      results = results.filter((b: any) => b.groomerId === groomerId);
    }

    return NextResponse.json({ appointments: results, total: results.length });
  } catch (error: any) {
    console.error("[api/bookings GET]", error);
    return NextResponse.json({ error: error.message || "Failed to fetch bookings" }, { status: 500 });
  }
}

// POST /api/bookings - Create booking or update status
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      ownerName,
      dogName,
      breed,
      service,
      size,
      date,
      time,
      notes,
      phone,
      email,
      groomerId,
      customerId,
      dogId,
      status,
      paymentStatus,
      servicePrice,
      depositAmount,
      balanceDue,
    } = body;

    if (id) {
      // Update existing booking
      const updated = await repo.update("bookings", id, {
        ...(ownerName && { ownerName }),
        ...(dogName && { dogName }),
        ...(breed && { breed }),
        ...(service && { service }),
        ...(size && { size }),
        ...(date && { date }),
        ...(time && { time }),
        ...(notes !== undefined && { notes }),
        ...(phone && { phone }),
        ...(email && { email }),
        ...(groomerId && { groomerId }),
        ...(customerId && { customerId }),
        ...(dogId && { dogId }),
        ...(status && { status }),
        ...(paymentStatus && { paymentStatus }),
        ...(servicePrice && { servicePrice }),
        ...(depositAmount && { depositAmount }),
        ...(balanceDue && { balanceDue }),
      });
      return NextResponse.json(updated);
    }

    if (!ownerName || !dogName || !date) {
      return NextResponse.json({ error: "ownerName, dogName, and date are required" }, { status: 400 });
    }

    const created = await repo.create("bookings", {
      ownerName,
      dogName,
      breed: breed || "Mixed Breed",
      service: service || "Full Groom",
      size: size || "MEDIUM",
      date,
      time: time || "10:00 AM",
      notes: notes || "",
      phone: phone || "",
      email: email || "",
      groomerId: groomerId || null,
      customerId: customerId || null,
      dogId: dogId || null,
      status: status || "CONFIRMED",
      paymentStatus: paymentStatus || "UNPAID",
      servicePrice: servicePrice || "$95.00",
      depositAmount: depositAmount || "$25.00",
      balanceDue: balanceDue || "$70.00",
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error("[api/bookings POST]", error);
    return NextResponse.json({ error: error.message || "Failed to create/update booking" }, { status: 500 });
  }
}
