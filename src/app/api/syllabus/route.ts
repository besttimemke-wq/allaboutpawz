import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Pathway } from "@/lib/framework/types";

export const dynamic = "force-dynamic";

// GET /api/syllabus?courseCode=LSH  → printable Markdown syllabus
export async function GET(req: NextRequest) {
  const courseCode = (req.nextUrl.searchParams.get("courseCode") ?? "").trim().toUpperCase();
  if (!courseCode) return NextResponse.json({ error: "courseCode required" }, { status: 400 });

  const courseRow = await db.course.findUnique({ where: { code: courseCode } });
  if (!courseRow) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  let p: Pathway;
  try {
    p = JSON.parse(courseRow.data) as Pathway;
  } catch {
    return NextResponse.json({ error: "Invalid course data" }, { status: 500 });
  }

  const lines: string[] = [];
  lines.push(`# ${p.title}`);
  lines.push("");
  lines.push(`> ${p.subtitle}`);
  lines.push("");
  lines.push(`**Course code:** ${p.code}  `);
  lines.push(`**Total hours:** ${p.totalHours}h  `);
  lines.push(`**CEUs:** ${p.ceus} (1 CEU = 10 contact hours · IACET authorization pending)  `);
  lines.push(`**SCORM package ID:** ${p.scormPackageId}  `);
  lines.push(`**Standards alignment:** Building toward ANSI/IACET 1-2018, COE, ACCSC, SCORM 1.2  `);
  lines.push(`**Framework:** Leashed Learning Framework v1.0  `);
  lines.push("");
  lines.push("> NOTE: This is a Certificate-of-Completion pathway, not an accredited credential. IACET CEUs may only be legally issued once Leashed.io is an IACET Authorized Provider. See the Accreditation Readiness dashboard for current status.");
  lines.push("");
  lines.push("## Overview");
  lines.push("");
  lines.push(p.description);
  lines.push("");
  lines.push("**Mission alignment.** " + p.missionAlignment);
  lines.push("");
  lines.push("## Enrollment");
  lines.push("");
  const e = p.enrollmentCopy;
  lines.push(`**Headline:** ${e.headline}`);
  lines.push("");
  lines.push(`**Who this is for:** ${e.whoIsThisFor}`);
  lines.push("");
  lines.push("**What you will achieve:**");
  for (const a of e.whatYouWillAchieve) lines.push(`- ${a}`);
  lines.push("");
  lines.push("**What you will earn:**");
  for (const a of e.whatYouWillEarn) lines.push(`- ${a}`);
  lines.push("");
  lines.push(`**Time commitment:** ${e.timeCommitment}`);
  lines.push("");
  lines.push(`**Prerequisites:** ${e.prerequisites}`);
  lines.push("");

  for (const lvl of p.levels) {
    lines.push("---");
    lines.push("");
    lines.push(`## Level ${lvl.level} — ${lvl.name}`);
    lines.push("");
    lines.push(`*${lvl.tagline}*`);
    lines.push("");
    lines.push(`**Credential:** ${lvl.credential.name} — ${lvl.credential.description} (${lvl.credential.ceus} CEU)`);
    lines.push("");

    for (const m of lvl.modules) {
      lines.push(`### ${m.code} — ${m.title} (${m.hours}h)`);
      lines.push("");
      lines.push(m.description);
      lines.push("");
      lines.push("**Learning objectives:**");
      for (const o of m.objectives) lines.push(`1. ${o}`);
      lines.push("");
      lines.push("**Capstone artifact:** " + m.capstoneEvidence);
      lines.push("");
      lines.push("**Rubric criteria:**");
      for (const r of m.rubric.rubricCriteria) lines.push(`- ${r}`);
      lines.push("");
      lines.push("**Critical items:**");
      for (const c of m.rubric.criticalItems) lines.push(`- ${c}`);
      lines.push("");
      lines.push(`**Quiz:** ${m.quiz.questionCount} questions, ${m.quiz.passThreshold}% to pass (${m.quiz.questionMix.join(", ")}).`);
      lines.push("");
      lines.push("**Self-reflection prompt:** " + m.rubric.selfReflection);
      lines.push("");

      for (const sm of m.subModules) {
        lines.push(`#### Sub-module ${sm.id} — ${sm.title} (${sm.hours}h)`);
        lines.push("");
        for (const cls of sm.classes) {
          lines.push(`##### ${cls.id} — ${cls.title} (${cls.duration})${cls.isAppliedLab ? " · Applied Lab" : ""}`);
          lines.push("");
          lines.push("**Flow:**");
          lines.push(`- **Connect:** ${cls.flow.connect}`);
          lines.push(`- **Learn:** ${cls.flow.learn}`);
          lines.push(`- **See It:** ${cls.flow.seeIt}`);
          lines.push(`- **Do It:** ${cls.flow.doIt}`);
          lines.push(`- **Check:** ${cls.flow.check}`);
          lines.push("");
          lines.push("**LeashGuide AI tutor prompt:** " + cls.aiTutorPrompt);
          lines.push("");
          if (cls.knowledgeCheck.length) {
            lines.push("**Knowledge check:**");
            for (const k of cls.knowledgeCheck) {
              lines.push(`- *${k.type}* — ${k.question}`);
              if (k.options) for (const opt of k.options) lines.push(`  - ${opt}${opt === k.answer ? " ✓" : ""}`);
              lines.push(`  - Answer: ${k.answer}`);
              lines.push(`  - Rationale: ${k.rationale}`);
            }
            lines.push("");
          }
        }
      }
    }
  }

  lines.push("---");
  lines.push("");
  lines.push("## Shipping checklist (accreditation readiness)");
  lines.push("");
  const checklist = [
    { cat: "Structure", item: "4 levels × 5 modules × 9 classes = 180 lesson blocks", bodies: "ALL" },
    { cat: "Hours", item: "120 contact hours = 12.0 IACET CEU", bodies: "IACET" },
    { cat: "Quiz", item: "8 questions per module, 80% pass threshold", bodies: "COE, ACCSC" },
    { cat: "Rubric", item: "8 rubric criteria per module, 3–4 critical items", bodies: "COE, ACCSC" },
    { cat: "Capstone", item: "Per-module + per-level capstone evidence", bodies: "COE, ACCSC" },
    { cat: "Credential ladder", item: "One credential per level (4 total)", bodies: "ICG" },
    { cat: "SCORM", item: `SCORM 1.2 imsmanifest.xml available (${p.scormPackageId})`, bodies: "SCORM" },
    { cat: "AI tutoring", item: "LeashGuide prompt per class (180 prompts)", bodies: "ICG" },
  ];
  lines.push("| Category | Item | Bodies |");
  lines.push("|---|---|---|");
  for (const c of checklist) lines.push(`| ${c.cat} | ${c.item} | ${c.bodies} |`);
  lines.push("");

  const md = lines.join("\n");

  if (req.nextUrl.searchParams.get("format") === "json") {
    return NextResponse.json({ courseCode, markdown: md });
  }
  return new NextResponse(md, {
    headers: { "Content-Type": "text/markdown; charset=utf-8", "Content-Disposition": `attachment; filename="syllabus-${p.code}.md"` },
  });
}
