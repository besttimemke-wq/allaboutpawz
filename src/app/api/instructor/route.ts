import { NextRequest, NextResponse } from "next/server";
import { getVisitor } from "@/lib/visitor";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/instructor — instructor dashboard snapshot for the demo owner.
// Returns the human-handoff review queue (open HumanNeedQueue items), the
// recent assessment review queue (LearningAttempt records), and the active
// learning sessions (open LearningDay records).
export async function GET(request: NextRequest) {
  try {
    const visitor = getVisitor(request);
    const ownerId = visitor.id;

    const [queueRows, attemptRows, dayRows] = await Promise.all([
      prisma.humanNeedQueue.findMany({
        where: { ownerId, status: "OPEN" },
        orderBy: { createdAt: "asc" },
        take: 50,
        include: {
          course: { select: { id: true, title: true, area: true, statute: true } },
          day: { select: { id: true, state: true, currentLesson: true, activeWorkTitle: true } },
        },
      }),
      prisma.learningAttempt.findMany({
        where: { ownerId },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          course: { select: { id: true, title: true, area: true, statute: true } },
        },
      }),
      prisma.learningDay.findMany({
        where: { ownerId, closedAt: null },
        orderBy: { openedAt: "desc" },
        take: 30,
        include: {
          course: { select: { id: true, title: true, area: true, statute: true } },
        },
      }),
    ]);

    const reviewQueue = queueRows.map((q) => ({
      id: q.id,
      dayId: q.dayId,
      courseId: q.courseId,
      reason: q.reason,
      status: q.status,
      context: safeParse(q.contextJson),
      courseTitle: q.course?.title || "Course",
      courseArea: q.course?.area || "",
      courseStatute: q.course?.statute || "",
      dayState: q.day?.state || "",
      currentLesson: q.day?.currentLesson ?? 0,
      activeWorkTitle: q.day?.activeWorkTitle || null,
      createdAt: q.createdAt.toISOString(),
    }));

    const assessments = attemptRows.map((a) => ({
      id: a.id,
      dayId: a.dayId,
      courseId: a.courseId,
      courseTitle: a.course?.title || "Course",
      courseArea: a.course?.area || "",
      lessonIndex: a.lessonIndex,
      item: a.itemText,
      attemptNo: a.attemptNo,
      response: a.response,
      score: a.score,
      passed: a.passed,
      stage: a.stage,
      misconception: a.misconception,
      feedback: a.feedback,
      evidenceSummary: a.evidenceSummary,
      workKind: a.workKind,
      workKey: a.workKey,
      createdAt: a.createdAt.toISOString(),
    }));

    const sessions = dayRows.map((d) => ({
      id: d.id,
      courseId: d.courseId,
      courseTitle: d.course?.title || "Course",
      courseArea: d.course?.area || "",
      mode: d.mode,
      state: d.state,
      currentLesson: d.currentLesson,
      activeWorkKind: d.activeWorkKind,
      activeWorkTitle: d.activeWorkTitle,
      activeWorkKey: d.activeWorkKey,
      sentiment: d.sentiment,
      openedAt: d.openedAt.toISOString(),
      scheduledCloseAt: d.scheduledCloseAt.toISOString(),
      breakEndsAt: d.breakEndsAt ? d.breakEndsAt.toISOString() : null,
      learnerName: visitor.name,
    }));

    return NextResponse.json({
      viewer: { id: ownerId, name: visitor.name, email: visitor.email },
      reviewQueue,
      assessments,
      sessions,
      stats: {
        openHandoffs: reviewQueue.length,
        recentAttempts: assessments.length,
        activeSessions: sessions.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load instructor dashboard." },
      { status: 500 },
    );
  }
}

function safeParse(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}
