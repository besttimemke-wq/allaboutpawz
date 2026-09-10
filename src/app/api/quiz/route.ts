import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCourseByCode } from "@/lib/course-api";

export const dynamic = "force-dynamic";

interface QuizAnswer {
  question: string;
  selected: string;
  correct: string;
}

interface QuizSubmissionBody {
  courseCode: string;
  moduleCode: string;
  learnerName?: string;
  answers: QuizAnswer[];
}

// POST /api/quiz  { courseCode, moduleCode, learnerName?, answers: [{question, selected, correct}] }
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as QuizSubmissionBody;
    if (!body?.courseCode || !body?.moduleCode || !Array.isArray(body.answers)) {
      return NextResponse.json({ error: "courseCode, moduleCode, answers required" }, { status: 400 });
    }
    const course = await getCourseByCode(body.courseCode);
    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

    const total = body.answers.length || 1;
    const correctCount = body.answers.filter((a) => a.selected === a.correct).length;
    const score = Math.round((correctCount / total) * 100);
    const passed = score >= 80;

    const attempt = await db.quizAttempt.create({
      data: {
        courseId: course.id,
        moduleCode: body.moduleCode,
        learnerName: body.learnerName ?? null,
        score,
        passed,
        answers: JSON.stringify(body.answers),
      },
    });

    return NextResponse.json({
      attemptId: attempt.id,
      score,
      passed,
      correctCount,
      total,
      passThreshold: 80,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to submit quiz";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
