import { NextRequest, NextResponse } from "next/server";
import { getVisitor } from "@/lib/visitor";
import { generateJson } from "@/lib/ai";
import { buildContext } from "@/lib/rag";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Course Architect — AI-assisted lesson authoring for admins.
// Body: { pathwayCode, operation, brief }
// Returns: { status, content, guardrails }
//
// The architect is DRAFT-ONLY: it never publishes, never invents source
// locators, and always returns a human-review checklist. The classroom UI
// (admin surface) is responsible for the publish step.

const stringArray = { type: "ARRAY", items: { type: "STRING" } };

const architectSchema = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    summary: { type: "STRING" },
    estimatedMinutes: { type: "NUMBER" },
    objectives: stringArray,
    phases: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          kind: { type: "STRING" },
          title: { type: "STRING" },
          minutes: { type: "NUMBER" },
          body: { type: "STRING" },
        },
        required: ["kind", "title", "minutes", "body"],
      },
    },
    practiceQuestions: stringArray,
    citationNotes: stringArray,
    authorNotes: { type: "STRING" },
  },
  required: [
    "title",
    "summary",
    "estimatedMinutes",
    "objectives",
    "phases",
    "practiceQuestions",
    "citationNotes",
    "authorNotes",
  ],
};

const OPERATIONS: Record<string, { label: string; instruction: string }> = {
  strengthen_lesson: {
    label: "Strengthen lesson sequence",
    instruction:
      "Tighten the lesson sequence for the named module. Improve the worked example, surface one prerequisite, and propose two checks for understanding (no answers).",
  },
  generate_practice: {
    label: "Generate adaptive practice",
    instruction:
      "Generate 5 adaptive practice prompts that test the same idea at three difficulty levels. Do not reveal answers. Mark each prompt with a difficulty tag.",
  },
  assessment_alignment: {
    label: "Align assessments to evidence",
    instruction:
      "Re-align the assessment items to the module's stated evidence outcomes. Map each item to one outcome. Flag any item that drifts.",
  },
  accessibility_pass: {
    label: "Run accessibility pass",
    instruction:
      "Run an accessibility pass: plain-language rewrite, alt-text placeholders, caption notes, and one alternate representation per phase. Do not invent media URLs.",
  },
  draft_module: {
    label: "Draft a new module",
    instruction:
      "Draft a brand-new module for the named pathway based on the brief. Include 3 phases, 4 objectives, and 3 practice prompts. Cite only sources supplied in the brief or the knowledge base.",
  },
};

// Guardrails that always apply, regardless of operation. Surfaced alongside
// the AI draft so the admin UI can show the human-accountability checklist.
const STATIC_GUARDRAILS = [
  "DRAFT ONLY — never auto-publishes. A human admin must review and approve.",
  "No invented source locators, URLs, statutes, or standard codes.",
  "No answer keys revealed in practice prompts or checks for understanding.",
  "Safety-critical modules (live-animal work, sanitation, restraint) require a signed-off instructor gate before publication.",
  "Citations must trace to the academy knowledge base or the brief. Flag anything that cannot be traced.",
];

export async function POST(request: NextRequest) {
  try {
    const visitor = getVisitor(request);
    const body = (await request.json().catch(() => null)) as {
      pathwayCode?: string;
      operation?: string;
      brief?: string;
    } | null;

    if (!body) {
      return NextResponse.json({ error: "Send a JSON body." }, { status: 400 });
    }
    const pathwayCode = String(body.pathwayCode || "").trim().slice(0, 80);
    const operationKey = String(body.operation || "strengthen_lesson").trim();
    const brief = String(body.brief || "").trim().slice(0, 4000);

    if (!pathwayCode) {
      return NextResponse.json({ error: "pathwayCode is required." }, { status: 400 });
    }
    if (brief.length < 15) {
      return NextResponse.json(
        { error: "Brief must be at least 15 characters." },
        { status: 400 },
      );
    }
    const operation = OPERATIONS[operationKey] || OPERATIONS.strengthen_lesson;

    // RAG: ground the architect in any academy knowledge base chunks that
    // match the brief for this pathway. No-op when the store is empty.
    const knowledgeContext = await buildContext(visitor.id, brief, pathwayCode);
    const knowledgeBlock = knowledgeContext
      ? `\n\nACADEMY KNOWLEDGE BASE (use these chunks; cite sourceId when relied upon; do not contradict):\n${knowledgeContext}`
      : "";

    const system = `You are the AI Course Architect for All About Pawz Academy powered by UnLeashe.
You draft lesson and module content for the Leashed program pathways. Drafts are DRAFT ONLY — a human admin always reviews and publishes.
Never invent source locators, statutes, standard codes, URLs, or quotes.
Never reveal answers to checks for understanding or practice prompts.
Ground every factual claim in the supplied brief or the academy knowledge base. If a claim cannot be grounded, say so in authorNotes.
Return only the requested JSON.`;

    const prompt = `PATHWAY CODE: ${pathwayCode}
OPERATION: ${operation.label}
OPERATION INSTRUCTION: ${operation.instruction}

AUTHOR BRIEF:
${brief}${knowledgeBlock}

Requirements:
- One precise title and a 60–120 word summary.
- 3–5 measurable objectives.
- 2–4 phases, each with a kind (e.g. TEACH, MODEL, PRACTICE, CHECK), a short title, a minute estimate, and a 120–220 word body.
- 3–5 practice prompts without answers.
- citationNotes: name every source you relied on. If you relied on a knowledge-base chunk, cite its sourceId.
- authorNotes: flag any claim that needs human verification, any prerequisite you assumed, and any safety gate that applies.`;

    const content = await generateJson<{
      title: string;
      summary: string;
      estimatedMinutes: number;
      objectives: string[];
      phases: Array<{ kind: string; title: string; minutes: number; body: string }>;
      practiceQuestions: string[];
      citationNotes: string[];
      authorNotes: string;
    }>(
      visitor.token,
      system,
      prompt,
      architectSchema,
      `Course Architect draft for ${pathwayCode} (${operation.label})`,
    );

    return NextResponse.json({
      status: "draft",
      operation: operationKey,
      operationLabel: operation.label,
      pathwayCode,
      content,
      guardrails: STATIC_GUARDRAILS,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Course Architect failed." },
      { status: 500 },
    );
  }
}
