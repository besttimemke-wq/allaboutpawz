import { NextRequest, NextResponse } from "next/server";
import { getVisitor } from "@/lib/visitor";
import { supabase } from "@/lib/supabase";

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

    const [queueResp, attemptResp, dayResp] = await Promise.all([
      supabase
        .from("humanNeedQueue")
        .select("*")
        .eq("ownerId", ownerId)
        .eq("status", "OPEN")
        .order("createdAt", { ascending: true })
        .limit(50),
      supabase
        .from("learningAttempt")
        .select("*")
        .eq("ownerId", ownerId)
        .order("createdAt", { ascending: false })
        .limit(50),
      supabase
        .from("learningDay")
        .select("*")
        .eq("ownerId", ownerId)
        .is("closedAt", null)
        .order("openedAt", { ascending: false })
        .limit(30),
    ]);
    if (queueResp.error) console.error("[instructor] queue:", queueResp.error.message);
    if (attemptResp.error) console.error("[instructor] attempts:", attemptResp.error.message);
    if (dayResp.error) console.error("[instructor] days:", dayResp.error.message);

    // Collect course ids we need to look up.
    const courseIds = new Set<number>();
    for (const q of queueResp.data ?? []) {
      const cid = (q as { courseId?: number | null }).courseId;
      if (cid) courseIds.add(cid);
    }
    for (const a of attemptResp.data ?? []) {
      const cid = (a as { courseId?: number | null }).courseId;
      if (cid) courseIds.add(cid);
    }
    for (const d of dayResp.data ?? []) {
      const cid = (d as { courseId?: number | null }).courseId;
      if (cid) courseIds.add(cid);
    }
    const dayIds = new Set<number>();
    for (const q of queueResp.data ?? []) {
      const did = (q as { dayId?: number | null }).dayId;
      if (did) dayIds.add(did);
    }

    const [courseMap, dayMap] = await Promise.all([
      lookupCourseMap(Array.from(courseIds)),
      lookupDayMap(Array.from(dayIds)),
    ]);

    const reviewQueue = (queueResp.data ?? []).map((q) => {
      const r = q as {
        id: number;
        dayId: number;
        courseId: number | null;
        reason: string;
        status: string;
        contextJson: string;
        createdAt: string;
      };
      const course = r.courseId ? courseMap.get(r.courseId) : undefined;
      const day = dayMap.get(r.dayId);
      return {
        id: r.id,
        dayId: r.dayId,
        courseId: r.courseId,
        reason: r.reason,
        status: r.status,
        context: safeParse(r.contextJson),
        courseTitle: course?.title || "Course",
        courseArea: course?.area || "",
        courseStatute: course?.statute || "",
        dayState: day?.state || "",
        currentLesson: day?.currentLesson ?? 0,
        activeWorkTitle: day?.activeWorkTitle || null,
        createdAt: new Date(r.createdAt).toISOString(),
      };
    });

    const assessments = (attemptResp.data ?? []).map((a) => {
      const r = a as {
        id: number;
        dayId: number;
        courseId: number;
        lessonIndex: number;
        itemText: string;
        attemptNo: number;
        response: string;
        score: number;
        passed: boolean;
        stage: string;
        misconception: string;
        feedback: string;
        evidenceSummary: string;
        workKind: string;
        workKey: string | null;
        createdAt: string;
      };
      const course = courseMap.get(r.courseId);
      return {
        id: r.id,
        dayId: r.dayId,
        courseId: r.courseId,
        courseTitle: course?.title || "Course",
        courseArea: course?.area || "",
        lessonIndex: r.lessonIndex,
        item: r.itemText,
        attemptNo: r.attemptNo,
        response: r.response,
        score: r.score,
        passed: r.passed,
        stage: r.stage,
        misconception: r.misconception,
        feedback: r.feedback,
        evidenceSummary: r.evidenceSummary,
        workKind: r.workKind,
        workKey: r.workKey,
        createdAt: new Date(r.createdAt).toISOString(),
      };
    });

    const sessions = (dayResp.data ?? []).map((d) => {
      const r = d as {
        id: number;
        courseId: number;
        mode: string;
        state: string;
        currentLesson: number;
        activeWorkKind: string | null;
        activeWorkTitle: string | null;
        activeWorkKey: string | null;
        sentiment: string | null;
        openedAt: string;
        scheduledCloseAt: string;
        breakEndsAt: string | null;
      };
      const course = courseMap.get(r.courseId);
      return {
        id: r.id,
        courseId: r.courseId,
        courseTitle: course?.title || "Course",
        courseArea: course?.area || "",
        mode: r.mode,
        state: r.state,
        currentLesson: r.currentLesson,
        activeWorkKind: r.activeWorkKind,
        activeWorkTitle: r.activeWorkTitle,
        activeWorkKey: r.activeWorkKey,
        sentiment: r.sentiment,
        openedAt: new Date(r.openedAt).toISOString(),
        scheduledCloseAt: new Date(r.scheduledCloseAt).toISOString(),
        breakEndsAt: r.breakEndsAt ? new Date(r.breakEndsAt).toISOString() : null,
        learnerName: visitor.name,
      };
    });

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

async function lookupCourseMap(ids: number[]) {
  const map = new Map<number, { title: string; area: string; statute: string }>();
  if (ids.length === 0) return map;
  const { data, error } = await supabase
    .from("course")
    .select("id, title, area, statute")
    .in("id", ids);
  if (error) console.error("[instructor] course map:", error.message);
  for (const c of data ?? []) {
    const r = c as { id: number; title: string; area: string; statute: string };
    map.set(r.id, { title: r.title, area: r.area, statute: r.statute });
  }
  return map;
}

async function lookupDayMap(ids: number[]) {
  const map = new Map<number, { state: string; currentLesson: number; activeWorkTitle: string | null }>();
  if (ids.length === 0) return map;
  const { data, error } = await supabase
    .from("learningDay")
    .select("id, state, currentLesson, activeWorkTitle")
    .in("id", ids);
  if (error) console.error("[instructor] day map:", error.message);
  for (const d of data ?? []) {
    const r = d as {
      id: number;
      state: string;
      currentLesson: number;
      activeWorkTitle: string | null;
    };
    map.set(r.id, {
      state: r.state,
      currentLesson: r.currentLesson,
      activeWorkTitle: r.activeWorkTitle,
    });
  }
  return map;
}

function safeParse(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}
