import { NextRequest, NextResponse } from "next/server";
import { repo } from "@/lib/repo";
import { sendUserNotification } from "@/lib/notifications";
import { syncCrmAppointment } from "@/lib/crm/enterprise";
import pg from "pg";

// Resolves the auth user id for a booking's customer — the linked salon
// record's "userId" FK first, then exact email match in auth.users.
async function authUserIdForBooking(bookingId: string): Promise<string | null> {
  const cs = process.env.SUPABASE_SESSION_POOLER || process.env.SUPABASE_DIRECT_CONNECTION;
  if (!cs) return null;
  const client = new pg.Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const res = await client.query(
      `SELECT c."userId"::text AS user_id, COALESCE(lower(c.email), lower(b.email)) AS email
       FROM public.bookings b
       LEFT JOIN public.customers c
         ON c.id = b."customerId" OR (c.email IS NOT NULL AND lower(c.email) = lower(b.email))
       WHERE b.id = $1 LIMIT 1;`,
      [bookingId],
    );
    const row = res.rows[0];
    if (!row) return null;
    if (row.user_id) return row.user_id;
    if (row.email) {
      const auth = await client.query(
        `SELECT id::text FROM auth.users WHERE lower(email) = $1 LIMIT 1;`,
        [row.email],
      );
      return auth.rows[0]?.id || null;
    }
    return null;
  } finally {
    await client.end().catch(() => {});
  }
}

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

      // The owner's appointment registry — every status change lands in
      // crm_appointments (with a status_history row). Non-fatal: the app
      // booking update must never be blocked by the registry sync.
      try {
        const fresh = await repo.get("bookings", id);
        if (fresh) await syncCrmAppointment(fresh);
      } catch (e: any) {
        console.error("[bookings] crm_appointments sync failed:", e.message);
      }

      // Cancellation → simple messaging: the customer gets a message in
      // their portal Messages page (Supabase user_notifications) the moment
      // their appointment is cancelled. Non-fatal — the status update
      // itself must never be blocked by messaging.
      if (status && /^cancel/i.test(String(status))) {
        try {
          const booking = await repo.get("bookings", id);
          const authUserId = await authUserIdForBooking(id);
          if (booking && authUserId) {
            const when = booking.date
              ? ` on ${booking.date}${booking.time ? ` at ${booking.time}` : ""}`
              : "";
            await sendUserNotification({
              userId: authUserId,
              notificationType: "booking_cancellation",
              title: "Appointment cancelled",
              body: `Your ${booking.service || "grooming"} appointment for ${booking.dogName || "your pet"}${when} has been cancelled. If this wasn't expected, message us here and we'll get it sorted.`,
              actionUrl: "/customer/appointments",
              metadata: { bookingId: id },
            });
          }
        } catch (e: any) {
          console.error("[bookings] cancellation message failed:", e.message);
        }
      }

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

    // The owner's appointment registry — crm_customers/crm_pets/
    // crm_appointments are populated the moment a booking exists (the
    // schema is ground truth; these are its write paths). Non-fatal.
    try {
      if (created) await syncCrmAppointment(created);
    } catch (e: any) {
      console.error("[bookings] crm_appointments sync failed:", e.message);
    }

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error("[api/bookings POST]", error);
    return NextResponse.json({ error: error.message || "Failed to create/update booking" }, { status: 500 });
  }
}
