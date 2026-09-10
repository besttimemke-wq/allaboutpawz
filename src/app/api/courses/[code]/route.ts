import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCourseByCode, savePathway } from "@/lib/course-api";

export const dynamic = "force-dynamic";

// GET /api/courses/[code]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const course = await getCourseByCode(code);
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
  return NextResponse.json({ course });
}

// PATCH /api/courses/[code]  { pathway?, status? }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  try {
    const body = await req.json();
    if (body?.pathway) {
      const course = await savePathway(code.toUpperCase(), body.pathway);
      return NextResponse.json({ course });
    }
    if (body?.status) {
      const row = await db.course.update({
        where: { code: code.toUpperCase() },
        data: { status: body.status },
      });
      return NextResponse.json({ ok: true, status: row.status });
    }
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to update course";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

// DELETE /api/courses/[code]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  try {
    await db.course.delete({ where: { code: code.toUpperCase() } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }
}
