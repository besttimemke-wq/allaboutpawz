import { NextRequest, NextResponse } from "next/server";
import { getVisitor } from "@/lib/visitor";
import { supabase } from "@/lib/supabase";
import { resolveHumanNeed, saveLearningEvidence } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/instructor/review — instructor review actions.
//
// Two supported payloads:
//
//   1. Human-need queue review:
//        { queueId, decision, note }
//      Resolves a HumanNeedQueue item via the existing `resolveHumanNeed`
//      helper. `decision` is "resolved" | "escalated"; `note` is the
//      instructor's resolution note (passed as the resolution string).
//
//   2. Assessment review:
//        { moduleCode, assessmentType, decision, note, courseId? }
//      Records an instructor review against the most recent LearningAttempt
//      matching the moduleCode (matched on workKey, then on itemText
//      containing the moduleCode). The review is persisted as a
//      LearnerEvidence row so it surfaces in the learner workspace.

const ALLOWED_QUEUE_DECISIONS = new Set(["resolved", "escalated"]);
const ALLOWED_ASSESSMENT_DECISIONS = new Set(["approved", "revision_required", "passed", "failed"]);

export async function POST(request: NextRequest) {
  try {
    const visitor = getVisitor(request);
    const ownerId = visitor.id;
    const body = (await request.json().catch(() => null)) as {
      queueId?: number | string;
      decision?: string;
      note?: string;
      moduleCode?: string;
      assessmentType?: string;
      courseId?: number | string;
    } | null;

    if (!body) {
      return NextResponse.json({ error: "Send a JSON body." }, { status: 400 });
    }

    const note = String(body.note || "").trim().slice(0, 4000);

    // ---- Human-need queue review ----
    if (body.queueId !== undefined && body.queueId !== null && body.queueId !== "") {
      const queueId = Number(body.queueId);
      if (!Number.isInteger(queueId)) {
        return NextResponse.json({ error: "queueId must be a number." }, { status: 400 });
      }
      const decision = String(body.decision || "resolved").toLowerCase();
      if (!ALLOWED_QUEUE_DECISIONS.has(decision)) {
        return NextResponse.json(
          { error: `decision must be one of: ${Array.from(ALLOWED_QUEUE_DECISIONS).join(", ")}.` },
          { status: 400 },
        );
      }
      const resolution = note || (decision === "escalated" ? "Escalated to lead instructor." : "Live mentoring completed.");
      await resolveHumanNeed(ownerId, queueId, resolution);
      return NextResponse.json({
        reviewed: true,
        kind: "queue",
        queueId,
        decision,
        note: resolution,
      });
    }

    // ---- Assessment review ----
    const moduleCode = String(body.moduleCode || "").trim();
    const assessmentType = String(body.assessmentType || "quiz").trim().toLowerCase();
    const decision = String(body.decision || "").toLowerCase();

    if (!moduleCode) {
      return NextResponse.json(
        { error: "Either queueId or moduleCode is required." },
        { status: 400 },
      );
    }
    if (!ALLOWED_ASSESSMENT_DECISIONS.has(decision)) {
      return NextResponse.json(
        { error: `decision must be one of: ${Array.from(ALLOWED_ASSESSMENT_DECISIONS).join(", ")}.` },
        { status: 400 },
      );
    }

    // Find the most recent attempt that matches the moduleCode. Try workKey
    // first (exact match), then itemText contains moduleCode. PostgREST `or`
    // supports both filters in one round-trip.
    const matchFilter = `workKey.eq.${moduleCode},itemText.ilike.%${moduleCode.replace(/,/g, "\\,")}%`;
    const { data: matchRow, error: matchErr } = await supabase
      .from("learningAttempt")
      .select("id, courseId, dayId, itemText, workKey, lessonIndex")
      .eq("ownerId", ownerId)
      .or(matchFilter)
      .order("createdAt", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (matchErr) console.error("[instructor/review] match:", matchErr.message);
    const match = matchRow
      ? (matchRow as {
          id: number;
          courseId: number;
          dayId: number;
          itemText: string;
          workKey: string | null;
          lessonIndex: number;
        })
      : undefined;

    const explicitCourseId = Number(body.courseId);
    const courseId: number | undefined =
      Number.isFinite(explicitCourseId) && explicitCourseId > 0
        ? explicitCourseId
        : match?.courseId;
    if (!courseId || !Number.isInteger(courseId)) {
      return NextResponse.json(
        { error: "Unable to resolve a course for this assessment review." },
        { status: 404 },
      );
    }

    // Persist the review as learner evidence so it surfaces in the workspace.
    const title = `Instructor review — ${assessmentType} ${moduleCode} (${decision})`;
    const content = JSON.stringify({
      kind: "instructor_assessment_review",
      moduleCode,
      assessmentType,
      decision,
      note,
      attemptId: match?.id ?? null,
      dayId: match?.dayId ?? null,
      lessonIndex: match?.lessonIndex ?? null,
      item: match?.itemText ?? null,
      reviewer: visitor.name,
      reviewedAt: new Date().toISOString(),
    });

    const evidenceId = await saveLearningEvidence(ownerId, {
      courseId,
      kind: "Instructor review",
      title,
      content,
    });

    return NextResponse.json({
      reviewed: true,
      kind: "assessment",
      moduleCode,
      assessmentType,
      decision,
      note,
      evidenceId,
      attemptId: match?.id ?? null,
      courseId,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Instructor review failed." },
      { status: 500 },
    );
  }
}
