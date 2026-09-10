import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getZAI } from "@/lib/zai";
import type { Pathway, Module, ClassBlock, KnowledgeCheckItem, LeashedFlow } from "@/lib/framework/types";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

const GEN_PROMPT = `You are a master course author writing real, ship-ready lesson content for Leashed.io — the AI-autonomous school.

You will be given a module and a specific class within it. You must produce STRICT JSON (no markdown fences, no prose) with this exact schema:

{
  "flow": {
    "connect": "2-3 sentences. A hook that grounds the learner in a real situation they have faced or will face. No abstract theory — start with a moment.",
    "learn": "3-4 sentences. The core model or framework for THIS class specifically. Teach one transferable idea, not generic process advice.",
    "seeIt": "3-4 sentences. A concrete worked example with specifics (names, numbers, a real scenario). Not 'a peer faced a situation' — give the actual example.",
    "doIt": "A specific 5-10 minute exercise the learner does RIGHT NOW. Give the exact steps and what they produce. Not 'take 5 minutes to reflect' — actual instructions with inputs and outputs.",
    "check": "Pose 3 quick recall/application questions the learner should be able to answer after this class. Number them 1/2/3."
  },
  "teachableContent": "1200-1600 words of REAL instruction in Markdown. This is the actual lesson — the substance a learner reads to learn the skill. Structure with H2/H3 headings, bullet lists, a worked example with real specifics, a 'common mistakes' section, and a 'key takeaways' section. Write like an expert educator, not a template. This must be genuinely useful domain-specific content — not generic process advice. Include real vocabulary, real frameworks, real examples with names and numbers.",
  "knowledgeCheck": [
    {
      "type": "multiple-choice",
      "question": "A specific domain question testing a real concept from this class (not the generic cycle).",
      "options": ["4 plausible options, one clearly correct"],
      "answer": "the correct option verbatim",
      "rationale": "1-2 sentences explaining why it is correct and the others are not."
    },
    {
      "type": "true-false",
      "question": "A specific true/false claim about a real concept from this class.",
      "options": ["True", "False"],
      "answer": "True or False",
      "rationale": "why."
    },
    {
      "type": "scenario",
      "question": "A real-world scenario specific to this domain with 4 options.",
      "options": ["4 options"],
      "answer": "correct option",
      "rationale": "why."
    }
  ],
  "aiTutorPrompt": "A 2-3 sentence coaching prompt tuned to THIS class's actual content. Tell LeashGuide what to surface, what to check, and what real application to rehearse. Specific to the domain, not generic."
}

RULES:
- The content must be SPECIFIC to the module's domain. LSH-101 Personal Readiness must teach actual personal-readiness concepts. GRM-101 Pet Grooming must teach actual grooming career concepts. NO generic "frame/choose/act/observe/adjust" boilerplate.
- The teachableContent is the substance — 1800-2200 words, not a paragraph.
- The exercise (doIt) must be a real activity with steps, not "reflect for 5 minutes."
- Knowledge checks must test real concepts, not the meta-cycle.
- Output STRICT JSON only. No markdown fences, no commentary.`;

interface GenBody {
  courseCode: string;
  moduleCode: string;
  classId: string;
}

function findClass(p: Pathway, moduleCode: string, classId: string) {
  for (const lvl of p.levels) {
    for (const mod of lvl.modules) {
      if (mod.code === moduleCode) {
        for (const sm of mod.subModules) {
          for (const cls of sm.classes) {
            if (cls.id === classId) return { module: mod, cls, smIndex: mod.subModules.indexOf(sm), clsIndex: sm.classes.indexOf(cls) };
          }
        }
      }
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenBody;
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
    const { module: mod, cls, smIndex, clsIndex } = found;

    const userContent = `Course: ${pathway.code} — ${pathway.title}
${pathway.description}

Module: ${mod.code} — ${mod.title} (Level ${mod.level} ${mod.levelName}, ${mod.hours}h)
Module description: ${mod.description}
Module capstone artifact: ${mod.capstoneEvidence}
Module objectives:
${mod.objectives.map((o, i) => `  ${i + 1}. ${o}`).join("\n")}

Class to write: ${cls.id} — ${cls.title}
Class type: ${cls.isAppliedLab ? "APPLIED LAB (the learner does the work, not just reads)" : "Concept/Practice class"}
Sub-module context: ${mod.subModules[smIndex].title}

Write the full lesson content for THIS class now. Return STRICT JSON only.`;

    const zai = await getZAI();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: GEN_PROMPT },
        { role: "user", content: userContent },
      ],
      thinking: { type: "disabled" },
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    let parsed: {
      flow: LeashedFlow;
      teachableContent: string;
      knowledgeCheck: KnowledgeCheckItem[];
      aiTutorPrompt: string;
    };
    try {
      const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "AI returned malformed JSON", raw: raw.slice(0, 500) }, { status: 502 });
    }

    // Validate shape minimally
    if (!parsed.flow || !parsed.teachableContent || !Array.isArray(parsed.knowledgeCheck)) {
      return NextResponse.json({ error: "AI output missing required fields" }, { status: 502 });
    }

    // Overwrite the class in the pathway JSON and persist
    mod.subModules[smIndex].classes[clsIndex] = {
      ...cls,
      flow: parsed.flow,
      teachableContent: parsed.teachableContent,
      knowledgeCheck: parsed.knowledgeCheck,
      aiTutorPrompt: parsed.aiTutorPrompt,
    };

    await db.course.update({
      where: { id: courseRow.id },
      data: { data: JSON.stringify(pathway) },
    });

    return NextResponse.json({
      ok: true,
      courseCode: pathway.code,
      moduleCode: mod.code,
      classId: cls.id,
      wordCount: parsed.teachableContent.split(/\s+/).length,
      knowledgeChecks: parsed.knowledgeCheck.length,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Generation failed";
    console.error("[ai/generate-class]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
