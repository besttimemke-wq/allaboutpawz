import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/enrollments?courseId=...   (optionally ?learnerName=...)
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const courseId = p.get("courseId");
  const learnerName = p.get("learnerName");
  const where: Record<string, unknown> = {};
  if (courseId) where.courseId = courseId;
  if (learnerName) where.learnerName = learnerName;
  const enrollments = await db.enrollment.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ enrollments });
}

// POST /api/enrollments  { courseId, learnerName, learnerEmail? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const courseId = body?.courseId;
    const learnerName = (body?.learnerName as string | undefined)?.trim();
    if (!courseId) return NextResponse.json({ error: "courseId required" }, { status: 400 });
    if (!learnerName) return NextResponse.json({ error: "learnerName required" }, { status: 400 });

    // Re-enroll if an enrollment already exists for this learner+course.
    const existing = await db.enrollment.findFirst({
      where: { courseId, learnerName },
    });
    if (existing) return NextResponse.json({ enrollment: existing });

    const enrollment = await db.enrollment.create({
      data: { courseId, learnerName, learnerEmail: body?.learnerEmail ?? null },
    });
    return NextResponse.json({ enrollment }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to enroll";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
