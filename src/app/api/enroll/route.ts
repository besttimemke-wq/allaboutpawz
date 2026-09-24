import { NextRequest, NextResponse } from "next/server";
import { getVisitor } from "@/lib/visitor";
import { listAllCourses, enrollGeneratedCourse } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/enroll
// Body: { code?: string, courseId?: number }
// Creates an active enrollment in lms.enrollments for the demo learner.
// The course is resolved by pathway code (e.g. "ACA") or integer id.
export async function POST(request: NextRequest) {
  try {
    const visitor = getVisitor(request);
    const body = (await request.json().catch(() => ({}))) as {
      code?: string;
      courseId?: number;
    };

    let courseId: number | null = null;

    // Resolve by code first
    if (body.code) {
      const all = await listAllCourses();
      const match = all.find(
        (c) => (c.code ?? "").toUpperCase() === body.code!.toUpperCase(),
      );
      if (match) courseId = match.id;
    }

    // Fall back to direct integer id
    if (courseId === null && body.courseId && Number.isFinite(body.courseId)) {
      courseId = body.courseId;
    }

    if (courseId === null) {
      return NextResponse.json(
        { error: "Course not found. Provide a valid code or courseId." },
        { status: 404 },
      );
    }

    await enrollGeneratedCourse(visitor.id, courseId);

    return NextResponse.json({
      ok: true,
      courseId,
      message: "Enrollment created successfully.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to create enrollment.",
      },
      { status: 500 },
    );
  }
}
