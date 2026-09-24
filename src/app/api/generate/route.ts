import { NextRequest, NextResponse } from "next/server";
import { findArea, getState } from "@/lib/atlas";
import { getVisitor } from "@/lib/visitor";
import { generateJson, modelLabel } from "@/lib/ai";
import { saveCourse, enrollGeneratedCourse } from "@/lib/db";
import type { Companion } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stringArray = { type: "ARRAY", items: { type: "STRING" } };
const companionSchema = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    subtitle: { type: "STRING" },
    overview: { type: "STRING" },
    alignment: {
      type: "OBJECT",
      properties: {
        state: { type: "STRING" },
        grade: { type: "STRING" },
        area: { type: "STRING" },
        statute: { type: "STRING" },
        authority: { type: "STRING" },
        note: { type: "STRING" },
      },
      required: ["state", "grade", "area", "statute", "authority", "note"],
    },
    learningObjectives: stringArray,
    sections: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          lesson: { type: "STRING" },
          workedExample: { type: "STRING" },
          checks: stringArray,
        },
        required: ["title", "lesson", "workedExample", "checks"],
      },
    },
    independentPractice: stringArray,
    appliedProject: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING" },
        brief: { type: "STRING" },
        deliverables: stringArray,
      },
      required: ["title", "brief", "deliverables"],
    },
    glossary: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          term: { type: "STRING" },
          definition: { type: "STRING" },
        },
        required: ["term", "definition"],
      },
    },
    familyNote: { type: "STRING" },
    sources: stringArray,
  },
  required: [
    "title",
    "subtitle",
    "overview",
    "alignment",
    "learningObjectives",
    "sections",
    "independentPractice",
    "appliedProject",
    "glossary",
    "familyNote",
    "sources",
  ],
};

export async function POST(request: NextRequest) {
  try {
    const visitor = getVisitor(request);
    const body = (await request.json()) as {
      state?: string;
      area?: string;
      grade?: string;
    };
    const stateName = body.state?.trim() ?? "";
    const areaName = body.area?.trim() ?? "";
    const grade = body.grade?.trim() ?? "";
    const state = getState(stateName);
    const area = findArea(stateName, areaName);

    if (!state || !area || !/^(K|[1-9]|1[0-2])$/.test(grade)) {
      return NextResponse.json(
        { error: "Choose a valid state, area of instruction, and grade." },
        { status: 400 },
      );
    }

    const system = `You are UNLEASHED Press, a rigorous curriculum author.
Create a concise, printable course companion—not marketing copy and not a legal-compliance claim.
The selected statute establishes an instructional area. It does not by itself provide complete subject standards.
Teach the selected subject at the requested grade. Use plain language, concrete examples, and age-appropriate rigor.
Never invent standard codes, legal requirements, source URLs, or claims of state approval.
Do not describe unimplemented software or safety behavior.
Return only the requested JSON.`;

    const prompt = `Create a complete printable course companion with this fixed context:
State: ${state.state}
Grade: ${grade}
Area of instruction: ${area.area}
Instructional-area authority: ${area.statute}
State standards authority: ${state.standards.entity}
Standards statute: ${state.standards.statute}
Standards mode: ${state.standards.mode}
Curriculum selector: ${state.curriculum.entity}

Selected source excerpt:
${area.sourceExcerpt}

Source-boundary requirements:
- Generate only for the selected area of instruction above.
- Treat the selected citation and excerpt as the course's source boundary.
- Do not borrow topics, mandates, or language from another area in the state dataset.

Requirements:
- 1 precise title and subtitle.
- Overview: 100–160 words.
- 5 measurable learning objectives.
- Exactly 4 instructional sections.
- Each section: 180–260 word lesson, one fully explained worked example, and 3 checks for understanding without answers.
- 8 independent-practice questions without answers.
- 1 applied project with 3 deliverables.
- 8 glossary terms.
- A short family note.
- Sources must be named, authoritative sources. Include the supplied statutes. Do not fabricate links.
- Alignment note must clearly distinguish the statutory area from detailed curricular standards and must not claim state approval.`;

    const generated = await generateJson<Companion>(
      visitor.token,
      system,
      prompt,
      companionSchema,
      `Generate an UNLEASHED Press companion for ${state.state}, grade ${grade}`,
    );

    const authoritativeCitation = area.excerptCitation || area.statute;
    const citationDiscrepancy =
      Boolean(area.excerptCitation) && !area.citationMatchesExcerpt;
    const alignmentNote = citationDiscrepancy
      ? `The Atlas index lists ${area.statute}, while the matching source excerpt is headed ${area.excerptCitation}. This companion uses the matched excerpt as its teaching boundary. Reconcile the source-index discrepancy before adoption. This is not a claim of state approval.`
      : `The selected statute establishes an instructional area; it does not by itself provide complete curricular standards or state approval. Review instructional accuracy and local requirements before adoption.`;

    const companion: Companion = {
      ...generated,
      alignment: {
        state: state.state,
        grade,
        area: area.area,
        statute: authoritativeCitation,
        authority: state.standards.entity,
        note: alignmentNote,
      },
      sources: [
        authoritativeCitation,
        ...(citationDiscrepancy
          ? [`Atlas index citation requiring reconciliation: ${area.statute}`]
          : []),
        `Standards-authority context: ${state.standards.statute}`,
      ],
    };

    const course = await saveCourse(
      visitor.id,
      {
        state: state.state,
        area: area.area,
        statute: authoritativeCitation,
        grade,
      },
      companion,
      modelLabel,
    );

    if(course)await enrollGeneratedCourse(visitor.id,course.id);
    return NextResponse.json({ course });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Course generation failed." },
      { status: 500 },
    );
  }
}
