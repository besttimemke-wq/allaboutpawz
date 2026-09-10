import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseProgress } from "@/lib/api-client";
import type { Pathway, Level } from "@/lib/framework/types";

export const dynamic = "force-dynamic";

interface CertQuery {
  learnerName: string;
  courseCode: string;
  level: string; // "100" | "200" | "300" | "400"
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function certificateHTML(opts: {
  learnerName: string;
  pathway: Pathway;
  level: Level;
  issuedDate: string;
  certId: string;
}): string {
  const { learnerName, pathway, level, issuedDate, certId } = opts;
  const credName = level.credential.name;
  const ceus = level.credential.ceus;
  const totalHours = level.modules.length * 6;
  const standardsNote = "Aligned to ANSI/IACET 1-2018 · SCORM 1.2";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(credName)} — ${esc(learnerName)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  @page { size: 297mm 210mm; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: 297mm; height: 210mm; margin: 0; padding: 0;
    background: #0f1f1a;
    font-family: 'Inter', system-ui, sans-serif;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .cert {
    position: relative;
    width: 297mm; height: 210mm;
    background:
      radial-gradient(ellipse at top left, rgba(16,185,129,0.12), transparent 55%),
      radial-gradient(ellipse at bottom right, rgba(245,158,11,0.10), transparent 55%),
      linear-gradient(135deg, #fbfaf6 0%, #f4f1e8 100%);
    color: #1a2b25;
    overflow: hidden;
  }
  .border-outer { position: absolute; inset: 8mm; border: 2px solid #0f766e; border-radius: 6px; pointer-events: none; }
  .border-inner { position: absolute; inset: 10mm; border: 1px solid rgba(15,118,110,0.35); border-radius: 4px; pointer-events: none; }
  .corner { position: absolute; width: 16mm; height: 16mm; border: 2.5px solid #b45309; pointer-events: none; }
  .corner.tl { top: 8mm; left: 8mm; border-right: 0; border-bottom: 0; border-top-left-radius: 6px; }
  .corner.tr { top: 8mm; right: 8mm; border-left: 0; border-bottom: 0; border-top-right-radius: 6px; }
  .corner.bl { bottom: 8mm; left: 8mm; border-right: 0; border-top: 0; border-bottom-left-radius: 6px; }
  .corner.br { bottom: 8mm; right: 8mm; border-left: 0; border-top: 0; border-bottom-right-radius: 6px; }
  .content {
    position: absolute; inset: 0;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    text-align: center; padding: 0 22mm;
  }
  .uni {
    font-family: 'Inter', sans-serif; font-weight: 600; font-size: 11pt;
    letter-spacing: 0.28em; text-transform: uppercase; color: #0f766e;
  }
  .uni .dot { display: inline-block; width: 5px; height: 5px; background: #b45309; border-radius: 50%; vertical-align: middle; margin: 0 8px 2px; }
  .seal-wrap { margin: 6mm 0 3mm; }
  .seal {
    width: 22mm; height: 22mm; border-radius: 50%;
    background: linear-gradient(135deg, #0f766e, #0d9488);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 14px rgba(15,118,110,0.35);
    margin: 0 auto;
  }
  .seal svg { width: 12mm; height: 12mm; fill: #f4f1e8; }
  .kicker { font-family: 'Inter', sans-serif; font-weight: 500; font-size: 10pt; letter-spacing: 0.2em; text-transform: uppercase; color: #6b7c75; margin-top: 3mm; }
  .credential-name {
    font-family: 'Cormorant Garamond', serif; font-weight: 700;
    font-size: 34pt; line-height: 1.1; color: #0f3d2e; margin-top: 2mm;
    max-width: 220mm;
  }
  .presented { font-size: 10.5pt; color: #4a5b54; margin-top: 5mm; letter-spacing: 0.04em; }
  .learner {
    font-family: 'Cormorant Garamond', serif; font-weight: 600;
    font-size: 30pt; color: #0f3d2e; margin-top: 2mm;
    border-bottom: 1.5px solid #b45309; padding-bottom: 1.5mm; min-width: 90mm;
  }
  .body-text { font-size: 10.5pt; color: #3a4a44; max-width: 200mm; line-height: 1.6; margin-top: 5mm; }
  .body-text strong { color: #0f3d2e; font-weight: 600; }
  .meta {
    display: flex; gap: 16mm; margin-top: 8mm; align-items: flex-end;
  }
  .meta-col { text-align: center; min-width: 44mm; }
  .meta-col .label { font-size: 8pt; letter-spacing: 0.18em; text-transform: uppercase; color: #6b7c75; font-weight: 500; }
  .meta-col .val { font-family: 'Cormorant Garamond', serif; font-size: 14pt; color: #0f3d2e; font-weight: 600; margin-top: 1.5mm; }
  .sign-row { display: flex; gap: 22mm; margin-top: 7mm; align-items: flex-end; }
  .sign { min-width: 52mm; text-align: center; }
  .sign .line { border-top: 1px solid #1a2b25; margin-bottom: 1.5mm; padding-top: 5mm; }
  .sign .name { font-family: 'Cormorant Garamond', serif; font-size: 13pt; color: #0f3d2e; font-weight: 600; }
  .sign .role { font-size: 8.5pt; color: #6b7c75; letter-spacing: 0.08em; text-transform: uppercase; margin-top: 0.5mm; }
  .id-strip {
    position: absolute; bottom: 14mm; left: 0; right: 0;
    text-align: center; font-size: 7.5pt; letter-spacing: 0.16em;
    color: #8a9990; text-transform: uppercase;
  }
  .id-strip .pipe { margin: 0 8px; color: #0f766e; }
  .accred { position: absolute; top: 16mm; left: 0; right: 0; text-align: center; font-size: 7.5pt; letter-spacing: 0.22em; color: #8a9990; text-transform: uppercase; }
  @media screen {
    html { background: #2a3a33; }
    body { display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
    .cert { box-shadow: 0 20px 60px rgba(0,0,0,0.4); border-radius: 8px; }
  }
  @media print { body { background: #fbfaf6; } .cert { box-shadow: none; border-radius: 0; } }
</style>
</head>
<body>
  <div class="cert">
    <div class="border-outer"></div>
    <div class="border-inner"></div>
    <div class="corner tl"></div>
    <div class="corner tr"></div>
    <div class="corner bl"></div>
    <div class="corner br"></div>

    <div class="accred">${esc(standardsNote)}</div>

    <div class="content">
      <div class="uni">Leashed<span class="dot"></span>io Career-to-Ownership Academy</div>
      <div class="seal-wrap">
        <div class="seal">
          <svg viewBox="0 0 24 24"><path d="M12 2l2.4 5.4 5.9.5-4.5 3.9 1.4 5.8L12 19.6 6.8 18.6l1.4-5.8L3.7 8.9l5.9-.5L12 2z"/></svg>
        </div>
      </div>
      <div class="kicker">Certificate of Completion · Level ${level.level}</div>
      <div class="credential-name">${esc(credName)}</div>
      <div class="presented">This credential is proudly presented to</div>
      <div class="learner">${esc(learnerName)}</div>
      <div class="body-text">
        for successfully completing all <strong>${level.modules.length} modules</strong> of the
        <strong>${esc(pathway.title)}</strong> pathway at <strong>Level ${level.level} — ${esc(level.name)}</strong>,
        including all lesson blocks, module quizzes (80% pass standard), and capstone artifacts —
        totalling <strong>${totalHours} contact hours</strong> (equivalent to <strong>${ceus.toFixed(1)} CEUs</strong>).
      </div>
      <div class="sign-row">
        <div class="sign">
          <div class="line"></div>
          <div class="name">Leashed.io Registry</div>
          <div class="role">Issuing Authority</div>
        </div>
        <div class="sign">
          <div class="line"></div>
          <div class="name">${esc(level.name)} Faculty</div>
          <div class="role">Program Chair</div>
        </div>
      </div>
    </div>

    <div class="id-strip">
      Issued ${esc(issuedDate)}
      <span class="pipe">|</span>
      Credential ID ${esc(certId)}
      <span class="pipe">|</span>
      Leashed Learning Framework v1.0
      <span class="pipe">|</span>
      Certificate of Completion — not an accredited credential
    </div>
  </div>
</body>
</html>`;
}

// GET /api/certificate?learnerName=...&courseCode=...&level=100
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const learnerName = (p.get("learnerName") ?? "").trim();
  const courseCode = (p.get("courseCode") ?? "").trim().toUpperCase();
  const levelStr = (p.get("level") ?? "").trim();

  if (!learnerName || !courseCode || !levelStr) {
    return NextResponse.json({ error: "learnerName, courseCode, level required" }, { status: 400 });
  }

  const courseRow = await db.course.findUnique({ where: { code: courseCode } });
  if (!courseRow) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  let pathway: Pathway;
  try {
    pathway = JSON.parse(courseRow.data) as Pathway;
  } catch {
    return NextResponse.json({ error: "Invalid course data" }, { status: 500 });
  }

  const levelNum = parseInt(levelStr, 10);
  const level = pathway.levels.find((l) => l.level === levelNum);
  if (!level) return NextResponse.json({ error: "Level not found" }, { status: 404 });

  // Verify the learner actually earned this credential.
  const enrollment = await db.enrollment.findFirst({
    where: { courseId: courseRow.id, learnerName },
  });
  if (!enrollment) {
    return NextResponse.json({ error: "Learner not enrolled in this course" }, { status: 404 });
  }

  const progress = parseProgress(enrollment.progress);
  const allModulesPassed = level.modules.every((m) => progress[m.code]?.quizPassed);
  const allClassesDone = level.modules.every((m) => {
    const need = m.subModules.reduce((n, s) => n + s.classes.length, 0);
    return (progress[m.code]?.completedClasses?.length ?? 0) >= need;
  });
  if (!allModulesPassed || !allClassesDone) {
    return NextResponse.json(
      { error: "Credential requirements not yet met. Complete all modules and quizzes for this level." },
      { status: 403 },
    );
  }

  const issuedDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const certId = `LSH-${courseCode}-${levelNum}-${Date.now().toString(36).toUpperCase().slice(-6)}`;

  const html = certificateHTML({ learnerName, pathway, level, issuedDate, certId });
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
