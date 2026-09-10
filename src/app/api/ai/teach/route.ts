import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getZAI } from "@/lib/zai";
import type { Pathway, Module, ClassBlock } from "@/lib/framework/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * The live-teaching endpoint. LeashGuide IS the teacher.
 *
 * The AI receives the class context and teaches it LIVE — presenting one stage
 * at a time, posing a challenge, waiting for the learner's response, evaluating
 * it, and deciding whether to advance, re-explain, or go deeper.
 *
 * The conversation IS the lesson. There is no static content dump.
 */

const TEACHER_SYSTEM = `You are LeashGuide, the live AI instructor at Leashed.io — the world's first AI-autonomous school. You are not a chatbot. You are the teacher, present in the classroom, running the lesson RIGHT NOW.

THE LEARNER (personalize to them):
- You know the learner's name, situation, goals, background, and strengths (provided below).
- Reference their actual situation when it's relevant — don't force it, but when a concept connects to their life, say so.
- Adjust your language and examples to their background. If they're a single parent, don't use corporate examples. If they're reentering after incarceration, don't assume they have a recent work history.
- Treat them with dignity. They are here to learn, not to be pitied.

HOW YOU TEACH (this is non-negotiable):
1. You teach ONE stage of the 5-part flow at a time (Connect → Learn → See It → Do It → Check). Never dump all five stages at once.
2. You PRESENT the material for the current stage — explain it, give the example, draw the learner in. 2-4 sentences of real teaching.
3. You then POSE A CHALLENGE specific to that stage: a question to answer, a scenario to respond to, a quick exercise to attempt. The challenge must connect to the learner's actual situation when possible.
4. You STOP and WAIT for the learner's response. End your turn with the challenge. Do not continue until they respond.
5. When the learner responds, you EVALUATE it: confirm what's right, gently correct what's wrong, and then either advance to the next stage OR re-explain if they're stuck.
6. After the Check stage, you summarize the key takeaway in one sentence and tell the learner the class is complete.

THE 5-PART FLOW (what each stage does, pedagogically):
- CONNECT: Hook the learner with a real situation THEY might face. Make the relevance personal. Don't lecture — ask.
- LEARN: Teach the core model or framework. One transferable idea. Use plain language, define terms, give a concrete example.
- SEE IT: Walk through a worked example step-by-step so the learner sees the model in action. Use real specifics (names, numbers, a real scenario).
- DO IT: Give the learner a specific, doable exercise — a question to answer, a scenario to decide, a quick artifact to draft. They must DO something, not just read.
- CHECK: 1-2 quick questions to confirm they got it. If they miss, re-explain briefly. Then summarize and close.

YOUR TONE:
- You are a real teacher — warm, demanding, specific, present. Not a chatbot.
- Use the learner's name.
- Reference their actual responses, not generic "good job."
- Push them to think, not just agree.

OUTPUT FORMAT:
- Use markdown STRUCTURE: **bold** for key terms, bullet lists for steps, occasional short paragraphs.
- The UI renders your markdown as real structure (headings, bullets, bold) — so use it.
- NEVER more than 180 words per turn. You are in a conversation, not lecturing.
- Always end with either a challenge/question (mid-lesson) or a clear "Class complete" statement (end).

You are teaching a REAL class to a REAL learner right now. Teach it.`;

interface TeachBody {
  courseCode: string;
  moduleCode: string;
  classId: string;
  message: string; // learner's response, or "" to begin
  history?: { role: "user" | "assistant"; content: string }[];
  learnerName?: string;
}

function findClass(p: Pathway, moduleCode: string, classId: string) {
  for (const lvl of p.levels) {
    for (const mod of lvl.modules) {
      if (mod.code === moduleCode) {
        for (const sm of mod.subModules) {
          for (const cls of sm.classes) {
            if (cls.id === classId) return { module: mod, cls };
          }
        }
      }
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as TeachBody;
    if (!body?.courseCode || !body?.moduleCode || !body?.classId) {
      return NextResponse.json({ error: "courseCode, moduleCode, classId required" }, { status: 400 });
    }

    const courseRow = await db.course.findUnique({ where: { code: body.courseCode.toUpperCase() } });
    if (!courseRow) return NextResponse.json({ error: "Course not found" }, { status: 404 });

    let pathway: Pathway;
    try {
      pathway = JSON.parse(courseRow.data) as Pathway;
    } catch {
      return NextResponse.json({ error: "Invalid course data" }, { status: 500 });
    }

    const found = findClass(pathway, body.moduleCode, body.classId);
    if (!found) return NextResponse.json({ error: "Class not found" }, { status: 404 });
    const { module: mod, cls } = found;

    // Fetch the learner's profile so the AI can personalize
    let learnerProfile: { name: string; situation?: string | null; goals?: string | null; background?: string | null; strengths?: string | null } | null = null;
    if (body.learnerName) {
      const l = await db.learner.findUnique({ where: { name: body.learnerName } });
      if (l) learnerProfile = { name: l.name, situation: l.situation, goals: l.goals, background: l.background, strengths: l.strengths };
    }

    // Fetch any uploaded source material (PDFs/docs) for this course — the AI's reference
    const sources = await db.courseSource.findMany({ where: { courseId: courseRow.id }, take: 3 });
    const sourceText = sources.length
      ? sources.map((s, i) => `\n--- SOURCE ${i + 1}: ${s.filename} ---\n${s.textContent.slice(0, 4000)}`).join("\n")
      : "";

    // Build the context the teacher needs — this is the "lesson plan" the AI teaches from.
    const lessonContext = `
LESSON CONTEXT (the teacher's lesson plan — teach FROM this, do not recite it):

Course: ${pathway.code} — ${pathway.title}
Module: ${mod.code} — ${mod.title} (Level ${mod.level} ${mod.levelName})
Class: ${cls.id} — ${cls.title} (${cls.duration})${cls.isAppliedLab ? " [APPLIED LAB — the learner must DO the work]" : ""}

Module objectives (the learner should be able to do these after the module):
${mod.objectives.map((o, i) => `  ${i + 1}. ${o}`).join("\n")}

Capstone artifact for this module: ${mod.capstoneEvidence}

The 5-part flow for this class (teach each stage's INTENT, use the content as your source material):
1. CONNECT — ${cls.flow.connect}
2. LEARN — ${cls.flow.learn}
3. SEE IT — ${cls.flow.seeIt}
4. DO IT — ${cls.flow.doIt}
5. CHECK — ${cls.flow.check}

Reference teaching material (draw from this, expand on it, make it your own — do NOT just recite it):
${cls.teachableContent.slice(0, 2500)}

${sourceText ? `ADDITIONAL SOURCE MATERIAL (teach from this — it is the authoritative reference):\n${sourceText}\n` : ""}
Knowledge check items you can use in the Check stage:
${cls.knowledgeCheck.map((k, i) => `  Q${i + 1}: ${k.question} (answer: ${k.answer})`).join("\n")}

${learnerProfile ? `THE LEARNER (personalize to them):
- Name: ${learnerProfile.name}
- Situation: ${learnerProfile.situation || "(not provided)"}
- Goals: ${learnerProfile.goals || "(not provided)"}
- Background: ${learnerProfile.background || "(not provided)"}
- Strengths: ${learnerProfile.strengths || "(not provided)"}` : "You don't know the learner's background yet — ask naturally if it helps you teach."}
`.trim();

    // Compose the messages for the model
    const messages: { role: "assistant" | "user"; content: string }[] = [
      { role: "assistant", content: TEACHER_SYSTEM },
      { role: "assistant", content: lessonContext },
    ];

    // Add conversation history
    if (body.history && body.history.length > 0) {
      messages.push(...body.history);
    }

    // The learner's message (or a blank start)
    const learnerMessage = body.message?.trim() || "(lesson beginning — greet the learner and start with the Connect stage)";
    messages.push({ role: "user", content: learnerMessage });

    const zai = await getZAI();
    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: "disabled" },
    });

    const reply = completion.choices[0]?.message?.content?.trim() || "I'm here. Ready to begin?";

    return NextResponse.json({
      reply,
      stage: detectStage(reply),
      classComplete: /class complete|lesson complete|you've completed|that completes/i.test(reply),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Teaching request failed";
    console.error("[ai/teach]", msg);
    return NextResponse.json({ error: "LeashGuide couldn't respond. Please try again." }, { status: 500 });
  }
}

function detectStage(reply: string): string {
  const lower = reply.toLowerCase();
  if (lower.includes("connect") || lower.includes("let's start") || lower.includes("recall a")) return "connect";
  if (lower.includes("learn") || lower.includes("here's the model") || lower.includes("the core idea")) return "learn";
  if (lower.includes("see it") || lower.includes("example") || lower.includes("watch how")) return "seeIt";
  if (lower.includes("do it") || lower.includes("try this") || lower.includes("your turn")) return "doIt";
  if (lower.includes("check") || lower.includes("quick question") || lower.includes("test yourself")) return "check";
  return "teaching";
}
