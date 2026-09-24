import { NextRequest, NextResponse } from "next/server";
import { getVisitor } from "@/lib/visitor";
import { listCourses } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const visitor = getVisitor(request);
    return NextResponse.json({ courses: await listCourses(visitor.id) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load courses." },
      { status: 401 },
    );
  }
}
