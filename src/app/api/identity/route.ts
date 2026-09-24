import { NextRequest, NextResponse } from "next/server";
import { getVisitor } from "@/lib/visitor";
import { ensureDemoSeed } from "@/lib/seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(r: NextRequest) {
  try {
    const v = getVisitor(r);
    // Seed the demo classroom (courses, schedule, enrollments, grades, meetings)
    // the first time a learner loads. Idempotent.
    await ensureDemoSeed(v.id);
    return NextResponse.json({ id: v.id, name: v.name });
  } catch {
    return NextResponse.json({ id: null, name: "Visitor" });
  }
}
