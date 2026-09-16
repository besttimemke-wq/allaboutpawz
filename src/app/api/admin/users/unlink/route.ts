import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/gate";
import pg from "pg";

// POST /api/admin/users/unlink  { userId }
//
// The manual escape hatch from the owner's join spec §3: auto-join is exact
// email match with no confirmation step, so the rare wrong join (two people
// sharing an email) is fixed after the fact. Unlinking clears the nullable
// FK (customers."userId") between the salon record and the login — the
// salon record, the login, and any orders all survive, they are just no
// longer attached to each other. A future transaction under the same email
// re-applies the exact-email join (that is the documented default).
export async function POST(req: NextRequest) {
  const gate = await requireAdminApi();
  if (gate) return gate;

  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    const cs = process.env.SUPABASE_SESSION_POOLER || process.env.SUPABASE_DIRECT_CONNECTION;
    if (!cs) return NextResponse.json({ error: "No database connection configured" }, { status: 500 });

    const client = new pg.Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
    await client.connect();
    try {
      const res = await client.query(
        `UPDATE public.customers SET "userId" = NULL WHERE "userId" = $1::text RETURNING id;`,
        [userId],
      );
      return NextResponse.json({
        success: true,
        unlinked: res.rowCount || 0,
        message:
          (res.rowCount || 0) > 0
            ? "Salon record unlinked from this login. The record and login both remain — a future transaction under the same email re-joins them."
            : "No salon record was linked to this login.",
      });
    } finally {
      await client.end().catch(() => {});
    }
  } catch (err: any) {
    console.error("[POST /api/admin/users/unlink]", err);
    return NextResponse.json({ error: err.message || "Unlink failed" }, { status: 500 });
  }
}
