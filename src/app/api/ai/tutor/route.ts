import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCourseByCode } from "@/lib/course-api";
import { getZAI } from "@/lib/zai";
import type { Pathway } from "@/lib/framework/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const LEASHGUIDE_BASE = `You are LeashGuide, the live AI tutor for Digital Learning University's Leashed Learning Framework.

Your coaching contract:
- You guide learners through the 5-part flow: Connect → Learn → See It → Do It → Check.
- You are warm, Socratic, brief, and concrete. Plain language, no jargon dump.
- You NEVER hand the learner the finished artifact. You help them build it themselves.
- One concept per reply. Keep replies under 180 words.
- Always end with exactly ONE guiding question.
- Use Markdown sparingly (short bullets or a single bold line max).
- If the learner is stuck, offer a single concrete next step, not a wall of options.
- Celebrate effort, normalize confusion, and connect back to the learner's real situation.`;

interface TutorRequestBody {
  courseCode: string;
  moduleCode: string;
  classId?: string; // e.g. "M1C1"
  message: string;
  sessionId?: string;
  learnerName?: string;
}

function findClass(p: Pathway, moduleCode: string, classId?: string) {
  for (const lvl of p.levels) {
    for (const mod of lvl.modules) {
      if (mod.code === moduleCode) {
        if (!classId) return { module: mod, class: undefined };
        for (const sm of mod.subModules) {
          for (const cls of sm.classes) {
            if (cls.id === classId) return { module: mod, class: cls };
          }
        }
        return { module: mod, class: undefined };
      }
    }
  }
  return { module: undefined, class: undefined };
}

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  const messages = await db.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ messages });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as TutorRequestBody;
    if (!body?.courseCode || !body?.moduleCode || !body?.message?.trim()) {
      return NextResponse.json(
        { error: "courseCode, moduleCode, message required" },
        { status: 400 },
      );
    }

    const course = await getCourseByCode(body.courseCode);
    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

    const { module, class: cls } = findClass(course.pathway, body.moduleCode, body.classId);
    if (!module) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    // Find or create the chat session.
    let session = body.sessionId
      ? await db.chatSession.findUnique({ where: { id: body.sessionId } })
      : null;
    if (!session) {
      session = await db.chatSession.create({
        data: {
          courseId: course.id,
          moduleCode: module.code,
          learnerName: body.learnerName ?? null,
        },
      });
    }

    // Persist the user message first.
    await db.chatMessage.create({
      data: { sessionId: session.id, role: "user", content: body.message.trim() },
    });

    // Load recent history (keep it lean for the model).
    const history = await db.chatMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: "asc" },
      take: 16,
    });

    // Build the context block for this class/module.
    const contextParts: string[] = [
      `Course: ${course.pathway.code} — ${course.pathway.title}`,
      `Module: ${module.code} — ${module.title} (${module.hours}h, ${module.levelName} level)`,
      `Module objective sample: ${module.objectives[0] ?? "n/a"}`,
      `Module capstone artifact: ${module.capstoneEvidence}`,
    ];
    if (cls) {
      contextParts.push(
        `Class: ${cls.id} — ${cls.title}`,
        `Class LeashGuide prompt: ${cls.aiTutorPrompt}`,
        `Flow stage the learner is on: Connect → Learn → See It → Do It → Check.`,
      );
    } else {
      contextParts.push(`Module LeashGuide role: ${module.rubric.leashedGuideRole}`);
    }
    const context = contextParts.join("\n");

    // Compose messages for the model. System = base + context, then history.
    const messages = [
      { role: "assistant" as const, content: `${LEASHGUIDE_BASE}\n\n--- TUTORING CONTEXT ---\n${context}` },
      ...history.map((m) => ({
        role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
        content: m.content,
      })),
    ];

    const zai = await getZAI();
    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: "disabled" },
    });
    const reply =
      completion.choices[0]?.message?.content?.trim() ||
      "I'm here. Could you say a bit more about where you are in the Connect → Learn → See It → Do It → Check flow right now?";

    // Persist the assistant reply.
    await db.chatMessage.create({
      data: { sessionId: session.id, role: "assistant", content: reply },
    });

    return NextResponse.json({
      sessionId: session.id,
      reply,
      module: { code: module.code, title: module.title },
      class: cls ? { id: cls.id, title: cls.title } : null,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "LeashGuide request failed";
    console.error("[ai/tutor]", msg);
    return NextResponse.json(
      { error: "LeashGuide is briefly unavailable. Please try again." },
      { status: 500 },
    );
  }
}
