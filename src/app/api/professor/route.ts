import { NextRequest, NextResponse } from "next/server";
import { getVisitor } from "@/lib/visitor";
import { generateText, modelLabel } from "@/lib/ai";
import { getCourse, listMessages, saveMessage } from "@/lib/db";
import { buildContext, pathwayCodeFromCourse } from "@/lib/rag";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const visitor = getVisitor(request);
    const courseId = Number(request.nextUrl.searchParams.get("courseId"));
    if (!Number.isInteger(courseId)) {
      return NextResponse.json({ error: "Choose a course." }, { status: 400 });
    }
    const course = await getCourse(visitor.id, courseId);
    if (!course) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }
    return NextResponse.json({
      course,
      messages: await listMessages(visitor.id, courseId),
      model: modelLabel,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load Professor." },
      { status: 401 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const visitor = getVisitor(request);
    const body = (await request.json()) as { courseId?: number; message?: string };
    const courseId = Number(body.courseId);
    const message = body.message?.trim() ?? "";
    if (!Number.isInteger(courseId) || !message || message.length > 4000) {
      return NextResponse.json({ error: "Enter a message under 4,000 characters." }, { status: 400 });
    }

    const course = await getCourse(visitor.id, courseId);
    if (!course) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    await saveMessage(visitor.id, courseId, "learner", message);
    const existing = (await listMessages(visitor.id, courseId)).slice(-16);
    const source = JSON.stringify(course.companion);

    // RAG: pull any matching knowledge chunks for this pathway (no-op when
    // the knowledge store is empty — keeps the Professor fully backward
    // compatible with the pre-RAG build).
    const pathwayCode = pathwayCodeFromCourse(course);
    const knowledgeContext = await buildContext(visitor.id, message, pathwayCode);
    const knowledgeBlock = knowledgeContext
      ? `\n\nKNOWLEDGE CONTEXT\nRetrieved from the academy knowledge base. Use these chunks to ground your teaching. Cite the sourceId when you rely on a chunk. If a chunk conflicts with the companion, prefer the companion and note the discrepancy.\n${knowledgeContext}`
      : "";

    const system = `You are UNLEASHED Professor, teaching one generated Press course.

TEACHING CONTRACT
- Be warm, precise, concise, and age-appropriate.
- Teach one idea at a time from the supplied course and its named source.
- After an explanation, ask one purposeful question and wait for the learner.
- When the learner attempts a question, evaluate the reasoning rather than merely the final phrase.
- On a miss: do not reveal the target answer. Briefly identify the misconception, then reframe with a clue, source excerpt, contrast, example, or simpler prerequisite and invite another attempt.
- After a correct attempt: ask for a short explanation or transfer example before treating the idea as demonstrated.
- If the learner asks for the answer to an active check, practice item, or graded-looking task, decline briefly and provide the next useful hint.
- This no-answer rule applies to active learner tasks. It does not prevent you from directly teaching facts, explaining concepts, or correcting unrelated misinformation.
- Never invent a source, standard code, quote, learner result, mastery score, or capability.
- Use short paragraphs. Avoid excessive headings and praise. Never output hidden reasoning or an answer key.

BOUNDARIES
Ground every course-specific claim in the supplied companion. If it does not support a factual claim, say so.
Do not claim to monitor emergencies, diagnose risk, contact authorities, provide proctoring, award credentials, verify mastery outside this conversation, or perform any feature absent from this interface.
Never claim this course is state-approved. Distinguish a statutory instructional area from detailed standards.

COURSE COMPANION
${source.slice(0, 28000)}${knowledgeBlock}`;

    const history = [
      ...existing.map((item) => ({
        role: item.role === "learner" ? ("user" as const) : ("model" as const),
        text: item.content,
      })),
      // Always include the learner's new message in the history we send to
      // the model — otherwise, when the persisted-message store is empty
      // (e.g. right after enrollment, or when the message table is offline),
      // the SDK receives only the system message and rejects the call.
      { role: "user" as const, text: message },
    ];

    const reply = await generateText(
      visitor.token,
      system,
      history,
      `UNLEASHED Professor response for course ${courseId}`,
    );
    await saveMessage(visitor.id, courseId, "professor", reply);

    return NextResponse.json({
      reply,
      messages: await listMessages(visitor.id, courseId),
      model: modelLabel,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Professor could not respond." },
      { status: 500 },
    );
  }
}
