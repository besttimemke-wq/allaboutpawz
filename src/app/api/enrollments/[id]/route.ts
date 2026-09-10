import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/enrollments/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const enrollment = await db.enrollment.findUnique({ where: { id } });
  if (!enrollment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ enrollment });
}

// PATCH /api/enrollments/[id]  { progress }
// progress shape: { [moduleCode]: { completedClasses: string[], quizScore?: number, quizPassed?: boolean } }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const enrollment = await db.enrollment.update({
      where: { id },
      data: { progress: JSON.stringify(body?.progress ?? {}) },
    });
    return NextResponse.json({ enrollment });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to update progress";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
