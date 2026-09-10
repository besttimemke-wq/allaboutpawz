import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/learner-profile?name=Jordan  → fetch a learner's profile
export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name")?.trim();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const learner = await db.learner.findUnique({ where: { name } });
  return NextResponse.json({ learner });
}

// POST /api/learner-profile  { name, email?, situation?, goals?, background?, strengths? }
// Creates or updates a learner profile (upsert by name).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = (body?.name as string | undefined)?.trim();
    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

    const learner = await db.learner.upsert({
      where: { name },
      create: {
        name,
        email: body?.email ?? null,
        situation: body?.situation ?? null,
        goals: body?.goals ?? null,
        background: body?.background ?? null,
        strengths: body?.strengths ?? null,
      },
      update: {
        email: body?.email ?? undefined,
        situation: body?.situation ?? undefined,
        goals: body?.goals ?? undefined,
        background: body?.background ?? undefined,
        strengths: body?.strengths ?? undefined,
      },
    });

    return NextResponse.json({ learner });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to save learner profile";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
