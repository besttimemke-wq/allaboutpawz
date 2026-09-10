import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseProgress } from "@/lib/api-client";
import type { Pathway } from "@/lib/framework/types";

export const dynamic = "force-dynamic";

interface RosterRow {
  id: string;
  learnerName: string;
  learnerEmail: string | null;
  courseCode: string;
  courseTitle: string;
  enrolledAt: string;
  updatedAt: string;
  totalClasses: number;
  completedClasses: number;
  passedQuizzes: number;
  totalModules: number;
  overallPct: number;
  lastActive: string;
}

// GET /api/admin/roster?courseId=...  (optional filter)
export async function GET(req: NextRequest) {
  const courseId = req.nextUrl.searchParams.get("courseId");
  const where = courseId ? { courseId } : undefined;
  const enrollments = await db.enrollment.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  const rows: RosterRow[] = [];
  for (const en of enrollments) {
    const courseRow = await db.course.findUnique({ where: { id: en.courseId } });
    if (!courseRow) continue;
    let pathway: Pathway;
    try {
      pathway = JSON.parse(courseRow.data) as Pathway;
    } catch {
      continue;
    }
    const progress = parseProgress(en.progress);
    const modules = pathway.levels.flatMap((l) => l.modules);
    const allClasses = modules.flatMap((m) => m.subModules.flatMap((sm) => sm.classes));
    const completedClasses = allClasses.filter((c) => {
      const mod = modules.find((mm) => mm.subModules.some((sm) => sm.classes.some((cc) => cc.id === c.id)));
      return mod && progress[mod.code]?.completedClasses?.includes(c.id);
    }).length;
    const passedQuizzes = modules.filter((m) => progress[m.code]?.quizPassed).length;
    const overallPct = allClasses.length ? Math.round((completedClasses / allClasses.length) * 100) : 0;

    rows.push({
      id: en.id,
      learnerName: en.learnerName,
      learnerEmail: en.learnerEmail,
      courseCode: courseRow.code,
      courseTitle: courseRow.title,
      enrolledAt: en.createdAt.toISOString(),
      updatedAt: en.updatedAt.toISOString(),
      totalClasses: allClasses.length,
      completedClasses,
      passedQuizzes,
      totalModules: modules.length,
      overallPct,
      lastActive: en.updatedAt.toISOString(),
    });
  }

  // summary
  const summary = {
    totalEnrollments: rows.length,
    uniqueLearners: new Set(rows.map((r) => r.learnerName)).size,
    avgProgress: rows.length ? Math.round(rows.reduce((s, r) => s + r.overallPct, 0) / rows.length) : 0,
    completedPathways: rows.filter((r) => r.overallPct >= 100).length,
    quizzesPassed: rows.reduce((s, r) => s + r.passedQuizzes, 0),
  };

  return NextResponse.json({ roster: rows, summary });
}
