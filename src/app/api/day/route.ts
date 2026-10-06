import { NextRequest, NextResponse } from "next/server";
import {getSchoolSnapshot} from "@/lib/db";
import { getVisitor } from "@/lib/visitor";
import { generateJson, generateText } from "@/lib/ai";
import {
  closeLearningDay,
  commandLearningDay,
  createHumanNeed,
  getCourse,
  getLearningDaySnapshot,
  listInstructorDaySnapshots,
  listMessages,
  openLearningDay,
  recordLearningAttempt,
  saveAssignmentState,
  saveMessage,
} from "@/lib/db";
import { buildContext, pathwayCodeFromCourse } from "@/lib/rag";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const gradingSchema = {
  type: "OBJECT",
  properties: {
    passed: { type: "BOOLEAN" },
    score: { type: "NUMBER" },
    misconception: { type: "STRING" },
    feedback: { type: "STRING" },
    evidenceSummary: { type: "STRING" },
    nextQuestion: { type: "STRING" },
  },
  required: ["passed", "score", "misconception", "feedback", "evidenceSummary", "nextQuestion"],
};

type Grade = {
  passed: boolean;
  score: number;
  misconception: string;
  feedback: string;
  evidenceSummary: string;
  nextQuestion: string;
};

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: NextRequest) {
  try {
    const visitor = getVisitor(request);
    if (request.nextUrl.searchParams.get("view") === "instructor") {
      return NextResponse.json({ classrooms: await listInstructorDaySnapshots(visitor.id) });
    }
    const courseId = Number(request.nextUrl.searchParams.get("courseId"));
    if (!Number.isInteger(courseId)) return fail("Choose a course.");
    const course = await getCourse(visitor.id, courseId);
    if (!course) return fail("Course not found.", 404);
    return NextResponse.json({
      course,
      day: await getLearningDaySnapshot(visitor.id, courseId),
      messages: (await listMessages(visitor.id, courseId)).slice(-20),
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to load the Day.", 401);
  }
}

export async function POST(request: NextRequest) {
  try {
    const visitor = getVisitor(request);
    const body = (await request.json()) as Record<string, any>;
    const courseId = Number(body.courseId);
    if (!Number.isInteger(courseId)) return fail("Choose a course.");
    const course = await getCourse(visitor.id, courseId);
    if (!course) return fail("Course not found.", 404);

    const allDays = await listInstructorDaySnapshots(visitor.id);
    const breakDay = allDays.find((s:any)=>s.day.state === "BREAK_LOCKED");
    if (breakDay && body.command !== "END_BREAK") {
      return fail("A school-day break is active. Resume that break before starting instructional work.");
    }
    if (body.command === "OPEN_DAY") {
      const mode = ["SPRINT", "SHIFT", "FULL_DAY"].includes(body.mode) ? body.mode : "SPRINT";
      await openLearningDay(visitor.id, courseId, mode);
      return NextResponse.json({ day: await getLearningDaySnapshot(visitor.id, courseId) });
    }

    let snapshot: any = await getLearningDaySnapshot(visitor.id, courseId);
    if (!snapshot?.day) return fail("Open the Day first.");
    const dayId = snapshot.day.id;
    const enrollment = (await getSchoolSnapshot(visitor.id)).enrollments.find((e:any)=>e.courseId===courseId);
    const supportContext = enrollment ? `Illustrative course support plan: ${enrollment.deficiencyFocus || "No focus recorded"}; sample level: ${enrollment.level}. These are demonstration plans, not measured diagnoses. Use as a starting point and adapt based on actual attempts without lowering the course target.` : "No support plan recorded; adapt from the learner's attempts.";

    if (snapshot.day.state === "CLOSED") return fail("This block has ended. Open a new block to continue.");
    if (body.command === "ADVANCE" && snapshot.day.state !== "TEACHING") return fail("Complete the active check before advancing.");
    if (body.command === "ASK_PROFESSOR" && snapshot.day.state === "HUMAN_HANDOFF") return fail("Resume with Professor after the handoff before asking for instruction.");

    if (body.command === "CHECK_IN") {
      await commandLearningDay(visitor.id, dayId, {
        state: "AWAITING_ATTEMPT",
        sentiment: String(body.sentiment || "Ready"),
        eventType: "SENTIMENT_RECORDED",
        payload: { sentiment: String(body.sentiment || "Ready") },
      });
    } else if (body.command === "TAKE_BREAK") {
      await commandLearningDay(visitor.id, dayId, {
        state: "BREAK_LOCKED",
        priorState: snapshot.day.state,
        breakEndsAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        eventType: "BREAK_STARTED",
        payload: { durationMinutes: 15, next: currentLesson(course, snapshot.day.currentLesson + 1)?.title || "Continue the lesson" },
      });
    } else if (body.command === "END_BREAK") {
      if (!snapshot.day.breakEndsAt || Date.now() < new Date(snapshot.day.breakEndsAt).getTime()) {
        return fail("The break is still in progress. Professor will resume when the timer ends.");
      }
      await commandLearningDay(visitor.id, dayId, {
        state: snapshot.day.priorState || "AWAITING_ATTEMPT",
        breakEndsAt: null,
        priorState: null,
        eventType: "BREAK_ENDED",
        payload: {},
      });
    } else if (body.command === "START_ASSIGNMENT") {
      if (snapshot.day.state === "BREAK_LOCKED" || snapshot.day.state === "HUMAN_HANDOFF" || snapshot.day.state === "CLOSED") {
        return fail("Finish the current Day state before opening an assignment.");
      }
      const assignment = courseAssignments(course).find((item) => item.key === String(body.assignmentKey || ""));
      if (!assignment) return fail("Assignment not found.");
      await saveAssignmentState(visitor.id, {
        courseId,
        assignmentKey: assignment.key,
        status: "In Progress",
        score: null,
      });
      await commandLearningDay(visitor.id, dayId, {
        state: "AWAITING_ATTEMPT",
        currentItem: assignment.prompt,
        cycleStep: 0,
        activeWorkKind: assignment.kind === "Quiz" ? "QUIZ" : "ASSIGNMENT",
        activeWorkKey: assignment.key,
        activeWorkTitle: assignment.title,
        eventType: "ASSIGNMENT_OPENED",
        payload: { assignmentKey: assignment.key, title: assignment.title, kind: assignment.kind },
      });
      const workLabel = assignment.kind === "Quiz" ? "quiz" : "assignment";
      const opening = `We are now working on the ${workLabel} “${assignment.title}.” I’ll help you interpret the task, question your reasoning, and evaluate your submission without doing the work for you. Start by explaining how you plan to approach it.`;
      await saveMessage(visitor.id, courseId, "professor", opening);
    } else if (body.command === "RETURN_TO_LESSON") {
      await commandLearningDay(visitor.id, dayId, {
        state: "AWAITING_ATTEMPT",
        currentItem: currentCheck(course, snapshot.day.currentLesson),
        cycleStep: 0,
        activeWorkKind: "LESSON",
        activeWorkKey: null,
        activeWorkTitle: null,
        eventType: "LESSON_RESUMED",
        payload: { lessonIndex: snapshot.day.currentLesson },
      });
    } else if (body.command === "ADVANCE") {
      if (snapshot.day.activeWorkKind === "ASSIGNMENT" || snapshot.day.activeWorkKind === "QUIZ") {
        return fail("Return to the lesson before advancing.");
      }
      const lessons = course.companion.sections || [];
      const next = snapshot.day.currentLesson + 1;
      if (next >= lessons.length) {
        await closeLearningDay(visitor.id, dayId, {
          recap: `You completed ${snapshot.attempts.filter((a: any) => a.passed).length} demonstrated checks in ${course.title}.`,
          homework: course.companion.independentPractice?.[0] || "Explain today’s strongest idea to someone else.",
          forecast: "Next time, Professor will begin with retrieval practice from today’s evidence.",
        });
      } else {
        const item = currentCheck(course, next);
        await commandLearningDay(visitor.id, dayId, {
          state: "AWAITING_ATTEMPT",
          currentLesson: next,
          currentItem: item,
          cycleStep: 0,
          eventType: "LESSON_ADVANCED",
          activeWorkKind: "LESSON",
        activeWorkKey: null,
        activeWorkTitle: null,
        payload: { lessonIndex: next, lessonTitle: currentLesson(course, next)?.title, item },
        });
      }
    } else if (body.command === "RAISE_HAND") {
      const reason = String(body.reason || "Learner requested help").slice(0, 500);
      const recent = snapshot.attempts.slice(-4);
      await createHumanNeed(visitor.id, dayId, courseId, {
        reason,
        lessonIndex: snapshot.day.currentLesson,
        lessonTitle: snapshot.day.activeWorkKind === "ASSIGNMENT" || snapshot.day.activeWorkKind === "QUIZ"
          ? snapshot.day.activeWorkTitle
          : currentLesson(course, snapshot.day.currentLesson)?.title,
        workKind: snapshot.day.activeWorkKind,
        workKey: snapshot.day.activeWorkKey,
        item: snapshot.day.currentItem,
        state: snapshot.day.state,
        cycleStep: snapshot.day.cycleStep,
        attempts: recent.map((a: any) => ({
          attempt: a.attemptNo,
          stage: a.stage,
          passed: a.passed,
          misconception: a.misconception,
          response: a.response,
        })),
        source: course.companion.sources?.[0] || course.statute,
        requestedAction: "Mentor the learner at the current point without supplying the answer.",
      });
      await commandLearningDay(visitor.id, dayId, {
        state: "HUMAN_HANDOFF",
        eventType: "HAND_RAISED",
        payload: { reason, boundedAttemptCount: recent.length },
      });
    } else if (body.command === "RESUME_WITH_PROFESSOR") {
      await commandLearningDay(visitor.id, dayId, {
        state: "AWAITING_ATTEMPT",
        eventType: "PROFESSOR_RESUMED",
        payload: {},
      });
    } else if (body.command === "ASK_PROFESSOR") {
      const message = String(body.message || "").trim().slice(0, 4000);
      if (!message) return fail("Enter a question.");
      const lesson = currentLesson(course, snapshot.day.currentLesson);
      // RAG: pull pathway knowledge for the active question. No-op when the
      // knowledge store is empty, so the Day Professor remains backward
      // compatible with the pre-RAG build.
      const pathwayCode = pathwayCodeFromCourse(course);
      const knowledgeContext = await buildContext(visitor.id, message, pathwayCode);
      const knowledgeBlock = knowledgeContext
        ? `\nKNOWLEDGE CONTEXT\nRetrieved from the academy knowledge base. Use these chunks to ground your teaching. Cite the sourceId when you rely on a chunk. If a chunk conflicts with the lesson, prefer the lesson and note the discrepancy.\n${knowledgeContext}\n`
        : "";
      const system = `You are UNLEASHED Professor conducting an active learning Day.
You are the instructor responsible for one next instructional move.
COURSE TITLE: ${course.title}
SUBJECT: ${course.area}
Do not invent or rename the course. Refer to the given title.
Ground all factual course claims in the supplied lesson and source. Teach one idea at a time.
Never reveal an answer to the active check or hidden grading criteria.
If the learner asks for the answer, reframe or point to the source instead.
Be warm, concise, and direct. End with one useful learner action.
SUPPORT CONTEXT: ${supportContext}
DAY STATE: ${snapshot.day.state}
ACTIVE WORK TYPE: ${snapshot.day.activeWorkKind}
ACTIVE WORK TITLE: ${snapshot.day.activeWorkTitle || lesson?.title}
ACTIVE CHECK OR ASSIGNMENT: ${snapshot.day.currentItem}
LESSON: ${JSON.stringify(lesson)}
SOURCE: ${course.companion.sources?.join("; ") || course.statute}${knowledgeBlock}`;
      await saveMessage(visitor.id, courseId, "learner", message);
      const history = (await listMessages(visitor.id, courseId)).slice(-12).map((m) => ({
        role: m.role === "learner" ? ("user" as const) : ("model" as const),
        text: m.content,
      }));
      const reply = await generateText(visitor.token, system, history, "Professor conducts the active UNLEASHED Day");
      await saveMessage(visitor.id, courseId, "professor", reply);
      await commandLearningDay(visitor.id, dayId, {
        eventType: "PROFESSOR_INSTRUCTION",
        payload: { learnerMessage: message, response: reply },
      });
    } else if (body.command === "SUBMIT_ATTEMPT") {
      const response = String(body.response || "").trim().slice(0, 6000);
      if (!response) return fail("Explain your thinking before submitting.");
      if (!["AWAITING_ATTEMPT", "REFRAME", "CITED_NUDGE", "RETEACH", "REPRESENT"].includes(snapshot.day.state)) {
        return fail("The Day is not currently awaiting an attempt.");
      }
      const lesson = currentLesson(course, snapshot.day.currentLesson);
      const stage = snapshot.day.state;
      const workKind = snapshot.day.activeWorkKind === "QUIZ"
        ? "QUIZ"
        : snapshot.day.activeWorkKind === "ASSIGNMENT"
          ? "ASSIGNMENT"
          : "LESSON";
      const workKey = snapshot.day.activeWorkKey || null;
      const grade = await generateJson<Grade>(
        visitor.token,
        `You are the server-side evaluator for an UNLEASHED learning attempt.
Evaluate the learner's reasoning against the lesson and active check.
Do not require exact wording. For LESSON work, passed means the learner demonstrated the core idea.
For ASSIGNMENT work, passed means the response is ready to submit against the stated task; it does not establish lesson mastery.
For QUIZ work, passed means the response demonstrates the quiz item well enough to submit; it remains a formative quiz result and does not automatically establish lesson mastery.
score must be between 0 and 1 and is formative confidence, not a recorded grade.
feedback must be addressed to the learner and must never reveal a complete target answer.
If unsuccessful, identify one misconception and give only the instructional move allowed by STAGE:
AWAITING_ATTEMPT or REFRAME: restate what the task asks.
CITED_NUDGE: direct the learner to inspect the named source without paraphrasing it into the answer.
RETEACH: use a different, non-isomorphic example.
REPRESENT: provide a parallel question testing the same concept.
nextQuestion must be a parallel question without its answer. On success it should request a brief teach-back.
LESSON: ${JSON.stringify(lesson)}
SUPPORT CONTEXT: ${supportContext}
WORK TYPE: ${workKind}
WORK TITLE: ${snapshot.day.activeWorkTitle || lesson?.title}
ACTIVE CHECK OR ASSIGNMENT: ${snapshot.day.currentItem}
SOURCE: ${course.companion.sources?.join("; ") || course.statute}
STAGE: ${stage}`,
        `Learner response: ${response}`,
        gradingSchema,
        "Evaluate an attempt in the active UNLEASHED Day",
      );
      const safeScore = Math.max(0, Math.min(1, Number(grade.score) || 0));
      const attemptNo = snapshot.attempts.filter((a: any) =>
        workKind !== "LESSON"
          ? a.workKind === workKind && a.workKey === workKey
          : a.workKind === "LESSON" && a.lessonIndex === snapshot.day.currentLesson
      ).length + 1;
      const nextCycle = grade.passed ? 0 : snapshot.day.cycleStep + 1;
      const nextState = grade.passed
        ? "TEACHING"
        : nextCycle === 1
          ? "REFRAME"
          : nextCycle === 2
            ? "CITED_NUDGE"
            : nextCycle === 3
              ? "RETEACH"
              : "REPRESENT";
      await recordLearningAttempt(visitor.id, dayId, courseId, {
        lessonIndex: snapshot.day.currentLesson,
        item: snapshot.day.currentItem,
        attemptNo,
        response,
        score: safeScore,
        passed: Boolean(grade.passed),
        stage,
        misconception: grade.misconception,
        feedback: grade.feedback,
        evidenceSummary: grade.evidenceSummary,
        workKind,
        workKey,
      });
      if (workKind !== "LESSON" && workKey) {
        await saveAssignmentState(visitor.id, {
          courseId,
          assignmentKey: workKey,
          status: grade.passed ? "Submitted" : "In Progress",
          score: null,
        });
      }
      await saveMessage(visitor.id, courseId, "learner", response);
      await saveMessage(visitor.id, courseId, "professor", grade.feedback);
      await commandLearningDay(visitor.id, dayId, {
        state: nextState,
        cycleStep: nextCycle,
        currentItem: !grade.passed && nextState === "REPRESENT" ? grade.nextQuestion : snapshot.day.currentItem,
        eventType: grade.passed ? "ATTEMPT_ACCEPTED" : "ATTEMPT_NEEDS_WORK",
        payload: {
          attemptNo,
          score: safeScore,
          stage,
          nextState,
          misconception: grade.misconception,
          evidenceSummary: grade.evidenceSummary,
          workKind,
          workKey,
        },
      });
      if (!grade.passed && nextCycle >= 3) {
        await createHumanNeed(visitor.id, dayId, courseId, {
          reason: "Repeated difficulty",
          lessonIndex: snapshot.day.currentLesson,
          lessonTitle: workKind !== "LESSON" ? snapshot.day.activeWorkTitle : lesson?.title,
          workKind,
          workKey,
          item: snapshot.day.currentItem,
          state: nextState,
          cycleStep: nextCycle,
          attempts: [...snapshot.attempts.slice(-2), { attemptNo, response, misconception: grade.misconception }],
          source: course.companion.sources?.[0] || course.statute,
          requestedAction: "Review the misconception and decide whether live mentoring is useful.",
        });
      }
    } else if (body.command === "CLOSE_DAY") {
      await closeLearningDay(visitor.id, dayId, {
        recap: `Today you worked through ${snapshot.attempts.length} recorded attempt${snapshot.attempts.length === 1 ? "" : "s"}.`,
        homework: course.companion.independentPractice?.[0] || "Write a short teach-back from today’s lesson.",
        forecast: currentLesson(course, snapshot.day.currentLesson + 1)?.title || "Retrieval practice and course review",
      });
    } else {
      return fail("Unknown Day command.");
    }

    snapshot = await getLearningDaySnapshot(visitor.id, courseId);
    return NextResponse.json({
      day: snapshot,
      messages: (await listMessages(visitor.id, courseId)).slice(-20),
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "The Day command failed.", 500);
  }
}

function currentLesson(course: any, index: number) {
  return course.companion.sections?.[index] || null;
}

function currentCheck(course: any, index: number) {
  const lesson = currentLesson(course, index);
  return lesson?.checks?.[0] || `Explain the central idea of ${lesson?.title || course.title} in your own words.`;
}

function courseAssignments(course:any) {
  const practice=(course.companion.independentPractice||[]).map((title:string,index:number)=>({
    key:`practice-${index}`,title,kind:"Independent practice",prompt:title,
  }));
  const project=course.companion.appliedProject ? [{
    key:"project",
    title:course.companion.appliedProject.title||"Applied project",
    kind:"Applied project",
    prompt:`${course.companion.appliedProject.brief||course.companion.appliedProject.title}\nRequired deliverables: ${(course.companion.appliedProject.deliverables||[]).join("; ")}`,
  }] : [];
  const checks=(course.companion.sections||[]).flatMap((section:any,lessonIndex:number)=>
    (section.checks||[]).map((title:string,index:number)=>({
      key:`check-${lessonIndex}-${index}`,title,kind:"Quiz",prompt:title,
    }))
  );
  return [...practice,...project,...checks];
}
