import { NextRequest, NextResponse } from "next/server";
import { createCourse, listCourses } from "@/lib/course-api";

export const dynamic = "force-dynamic";

// GET /api/courses?includeDrafts=1
export async function GET(req: NextRequest) {
  const includeDrafts = req.nextUrl.searchParams.get("includeDrafts") === "1";
  const courses = await listCourses({ includeDrafts });
  return NextResponse.json({ courses });
}

// POST /api/courses  { code, title, subtitle?, description?, accreditation?, status? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const course = await createCourse({
      code: body?.code,
      title: body?.title,
      subtitle: body?.subtitle,
      description: body?.description,
      accreditation: body?.accreditation,
      status: body?.status,
    });
    return NextResponse.json({ course }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to create course";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
