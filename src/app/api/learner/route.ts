import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCourseByCode } from "@/lib/course-api";
import { parseProgress } from "@/lib/api-client";
import type { Pathway } from "@/lib/framework/types";

export const dynamic = "force-dynamic";

interface DashboardEnrollment {
  id: string;
  courseId: string;
  learnerName: string;
  createdAt: string;
  updatedAt: string;
  course: {
    code: string;
    title: string;
    subtitle: string;
    totalHours: number;
    ceus: number;
    status: string;
  };
  progress: Record<string, { completedClasses: string[]; quizScore?: number; quizPassed?: boolean }>;
  stats: {
    totalModules: number;
    completedClasses: number;
    totalClasses: number;
    passedQuizzes: number;
    overallPct: number;
    nextModuleCode: string | null;
    nextClassId: string | null;
  };
  credentialsEarned: { name: string; ceus: number; level: number }[];
}

// GET /api/learner?name=Jordan  → all enrollments for that learner, with computed progress + credentials
export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name")?.trim();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const enrollments = await db.enrollment.findMany({
    where: { learnerName: name },
    orderBy: { createdAt: "desc" },
  });

  const out: DashboardEnrollment[] = [];
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
      // find this class's module
      const mod = modules.find((mm) => mm.subModules.some((sm) => sm.classes.some((cc) => cc.id === c.id)));
      return mod && progress[mod.code]?.completedClasses?.includes(c.id);
    }).length;
    const passedQuizzes = modules.filter((m) => progress[m.code]?.quizPassed).length;
    const overallPct = allClasses.length ? Math.round((completedClasses / allClasses.length) * 100) : 0;

    // next module = first module not yet fully passed (quiz) with incomplete classes
    let nextModuleCode: string | null = null;
    let nextClassId: string | null = null;
    for (const m of modules) {
      const mp = progress[m.code];
      const modDone = mp?.completedClasses?.length ?? 0;
      if (modDone < m.subModules.reduce((n, s) => n + s.classes.length, 0)) {
        nextModuleCode = m.code;
        const doneSet = new Set(mp?.completedClasses ?? []);
        for (const sm of m.subModules) {
          for (const cls of sm.classes) {
            if (!doneSet.has(cls.id)) {
              nextClassId = cls.id;
              break;
            }
          }
          if (nextClassId) break;
        }
        break;
      }
    }

    // credentials earned = levels where ALL modules' quizzes passed
    const credentialsEarned: { name: string; ceus: number; level: number }[] = [];
    for (const lvl of pathway.levels) {
      const allPassed = lvl.modules.every((m) => progress[m.code]?.quizPassed);
      const allClassesDone = lvl.modules.every((m) => {
        const need = m.subModules.reduce((n, s) => n + s.classes.length, 0);
        return (progress[m.code]?.completedClasses?.length ?? 0) >= need;
      });
      if (allPassed && allClassesDone) {
        credentialsEarned.push({ name: lvl.credential.name, ceus: lvl.credential.ceus, level: lvl.level });
      }
    }

    out.push({
      id: en.id,
      courseId: en.courseId,
      learnerName: en.learnerName,
      createdAt: en.createdAt.toISOString(),
      updatedAt: en.updatedAt.toISOString(),
      course: {
        code: courseRow.code,
        title: courseRow.title,
        subtitle: courseRow.subtitle,
        totalHours: courseRow.totalHours,
        ceus: courseRow.ceus,
        status: courseRow.status,
      },
      progress,
      stats: {
        totalModules: modules.length,
        completedClasses,
        totalClasses: allClasses.length,
        passedQuizzes,
        overallPct,
        nextModuleCode,
        nextClassId,
      },
      credentialsEarned,
    });
    // silence unused import warning for getCourseByCode (kept for potential future use)
    void getCourseByCode;
  }

  return NextResponse.json({ learnerName: name, enrollments: out });
}
