import { NextRequest, NextResponse } from "next/server";
import { duplicateCourse } from "@/lib/course-api";

export const dynamic = "force-dynamic";

// POST /api/courses/[code]/duplicate  { newCode, newTitle? }
export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  try {
    const body = await req.json();
    const course = await duplicateCourse(code, body?.newCode, body?.newTitle);
    return NextResponse.json({ course }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to duplicate course";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
