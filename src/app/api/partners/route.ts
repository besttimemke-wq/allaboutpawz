import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/partners → list all active partner organizations (for the referring-org dropdown)
export async function GET(req: NextRequest) {
  const partners = await db.partner.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, code: true, name: true, type: true },
  });
  return NextResponse.json({ partners });
}

// POST /api/partners/verify  { code } → verify a referral code
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const code = (body?.code as string | undefined)?.trim().toUpperCase();
    if (!code) return NextResponse.json({ error: "code required" }, { status: 400 });

    const partner = await db.partner.findUnique({ where: { code } });
    if (!partner) return NextResponse.json({ valid: false, error: "Invalid referral code" }, { status: 404 });
    if (!partner.active) return NextResponse.json({ valid: false, error: "This organization is no longer active" }, { status: 403 });

    return NextResponse.json({
      valid: true,
      partner: { id: partner.id, code: partner.code, name: partner.name, type: partner.type },
    });
  } catch {
    return NextResponse.json({ error: "Verification failed" }, { status: 400 });
  }
}
