import { NextRequest, NextResponse } from "next/server";
import { getZAI } from "@/lib/zai";
import { db } from "@/lib/db";
import { buildPathwayFromCatalog, DEFAULT_ACCREDITATION, moduleCodeFor, type Catalog, type LevelSpec, type ModuleSpec } from "@/lib/course-gen";
import { createCourse } from "@/lib/course-api";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

const LEVEL_NAMES = ["Foundation", "Core", "Advanced", "Capstone"] as const;

interface BuildBody {
  code: string;
  title: string;
  domain: string; // e.g. "Workplace Safety & Compliance"
  audience?: string;
}

const BUILD_PROMPT = `You design full course catalogs for Digital Learning University under the Leashed Learning Framework.

Output STRICT JSON only — no prose, no markdown fences. The catalog MUST contain exactly 4 levels named (in order) "Foundation", "Core", "Advanced", "Capstone". Each level has exactly 5 modules. Each module has a short title, a single-sentence "focus" describing the capability it builds (lowercase, practical), and an "artifact" name (the capstone deliverable).

Schema:
{
  "title": string,
  "subtitle": string,
  "description": string (2-3 sentences),
  "missionAlignment": string (1 sentence),
  "levels": [
    {
      "name": "Foundation" | "Core" | "Advanced" | "Capstone",
      "tagline": string,
      "credentialName": string,
      "credentialDescription": string,
      "modules": [ { "title": string, "focus": string, "artifact": string } ] x5
    }
  ] x4
}

Rules:
- Progression must be real: Foundation = awareness/basics, Core = daily execution, Advanced = relationships/systems, Capstone = leadership/contribution.
- Module titles must be distinct and concrete (no "Module 1").
- "focus" must be a verb-phrase describing an applied capability.
- "artifact" must be a tangible deliverable a learner could show an employer.`;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as BuildBody;
    const code = (body?.code ?? "").trim().toUpperCase();
    const title = (body?.title ?? "").trim();
    const domain = (body?.domain ?? "").trim();
    if (!code || !title || !domain) {
      return NextResponse.json({ error: "code, title, domain required" }, { status: 400 });
    }

    const zai = await getZAI();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: BUILD_PROMPT },
        {
          role: "user",
          content: `Design a pathway.\nCourse code: ${code}\nCourse title: ${title}\nDomain/theme: ${domain}\nTarget audience: ${body.audience || "adult learners preparing for independence"}\nReturn the JSON catalog now.`,
        },
      ],
      thinking: { type: "disabled" },
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    let parsed: Omit<Catalog, "code" | "accreditation" | "enrollment">;
    try {
      // Strip accidental markdown fences.
      const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "AI returned malformed catalog. Try again.", raw },
        { status: 502 },
      );
    }

    // Validate the shape before persisting.
    if (!parsed.levels || parsed.levels.length !== 4) {
      return NextResponse.json({ error: "AI catalog must have exactly 4 levels." }, { status: 502 });
    }

    const levels: LevelSpec[] = parsed.levels.map((lvl: Omit<LevelSpec, "modules"> & { modules: Omit<ModuleSpec, "code">[] }, li) => ({
      name: LEVEL_NAMES[li],
      tagline: lvl.tagline || `${LEVEL_NAMES[li]} level`,
      credentialName: lvl.credentialName || `${title} ${LEVEL_NAMES[li]} Credential`,
      credentialDescription: lvl.credentialDescription || `Awarded on completion of the ${LEVEL_NAMES[li]} level.`,
      modules: (lvl.modules || []).slice(0, 5).map((m, mi) => ({
        code: moduleCodeFor(code, li, mi),
        title: m.title || `${LEVEL_NAMES[li]} Module ${mi + 1}`,
        focus: m.focus || "applying the module's core concepts in a real situation",
        artifact: m.artifact || `${LEVEL_NAMES[li]} Artifact ${mi + 1}`,
      })),
    }));

    const catalog: Catalog = {
      code,
      title,
      subtitle: parsed.subtitle || `${title} — a Leashed Learning Framework pathway.`,
      description: parsed.description || `${title} is a 120-hour, 4-level pathway.`,
      missionAlignment: parsed.missionAlignment || `Advances the University mission through applied ${domain.toLowerCase()} capability.`,
      accreditation: DEFAULT_ACCREDITATION,
      enrollment: {
        headline: `Build real ${domain.toLowerCase()} capability, one cycle at a time.`,
        whoIsThisFor: body.audience || "Adult learners preparing for independence and career readiness.",
        whatYouWillAchieve: [
          "A four-rung credential ladder totaling 12.0 IACET CEUs.",
          "20 evidencing artifacts you can show an employer.",
          "A defended capstone portfolio.",
        ],
        whatYouWillEarn: levels.map((l) => `${l.credentialName} (3.0 CEU)`),
        timeCommitment: "120 contact hours over ~6 months at ~5 hours/week.",
        prerequisites: "None for Level 100.",
      },
      levels,
    };

    // Create the course row, then overwrite data with the generated pathway.
    await createCourse({ code, title, subtitle: catalog.subtitle, description: catalog.description });
    const pathway = buildPathwayFromCatalog(catalog, { aiGenerated: true });
    await db.course.update({
      where: { code },
      data: { data: JSON.stringify(pathway), aiGenerated: true, status: "draft" },
    });

    return NextResponse.json({ code, title: pathway.title, modules: levels.reduce((n, l) => n + l.modules.length, 0) });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "AI build failed";
    console.error("[ai/build-course]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
