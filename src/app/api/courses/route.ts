import { NextRequest, NextResponse } from "next/server";
import { getVisitor } from "@/lib/visitor";
import { listCourses, listAllCourses, getPublishedCourse } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/courses
//   - (default)            → the learner's enrolled courses (classroom view)
//   - ?catalog=true        → all published courses in the tenant (catalog view)
//   - ?id=<int>            → a single published course (pathway-detail view)
export async function GET(request: NextRequest) {
  try {
    const visitor = getVisitor(request);
    const url = new URL(request.url);
    const catalog = url.searchParams.get("catalog");
    const id = url.searchParams.get("id");

    if (catalog === "true") {
      return NextResponse.json({ courses: await listAllCourses() });
    }
    if (id) {
      const parsed = parseInt(id, 10);
      if (!Number.isFinite(parsed)) {
        return NextResponse.json({ error: "Invalid course id." }, { status: 400 });
      }
      const course = await getPublishedCourse(parsed);
      if (!course) {
        return NextResponse.json({ error: "Course not found." }, { status: 404 });
      }
      return NextResponse.json({ course });
    }
    return NextResponse.json({ courses: await listCourses(visitor.id) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load courses." },
      { status: 401 },
    );
  }
}
