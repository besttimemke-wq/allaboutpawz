import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Pathway, Module, ClassBlock } from "@/lib/framework/types";

export const dynamic = "force-dynamic";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function classSco(m: Module, cls: ClassBlock): string {
  return `    <item identifier="${esc(m.code)}_${esc(cls.id)}" identifierref="${esc(m.code)}_${esc(cls.id)}_RES">
      <title>${esc(m.code)} ${esc(cls.id)} — ${esc(cls.title)}</title>
    </item>`;
}

function moduleSco(m: Module): string {
  return `  <item identifier="${esc(m.code)}" identifierref="${esc(m.code)}_RES">
    <title>${esc(m.code)} — ${esc(m.title)}</title>
    <metadata>
      <schema>ADL SCORM</schema>
      <schemaversion>1.2</schemaversion>
    </metadata>
${m.subModules.flatMap((sm) => sm.classes.map((c) => classSco(m, c))).join("\n")}
  </item>`;
}

// GET /api/scorm?courseCode=LSH  → returns imsmanifest.xml for the course
export async function GET(req: NextRequest) {
  const courseCode = (req.nextUrl.searchParams.get("courseCode") ?? "").trim().toUpperCase();
  if (!courseCode) return NextResponse.json({ error: "courseCode required" }, { status: 400 });

  const courseRow = await db.course.findUnique({ where: { code: courseCode } });
  if (!courseRow) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  let pathway: Pathway;
  try {
    pathway = JSON.parse(courseRow.data) as Pathway;
  } catch {
    return NextResponse.json({ error: "Invalid course data" }, { status: 500 });
  }

  const totalModules = pathway.levels.reduce((n, l) => n + l.modules.length, 0);
  const totalClasses = pathway.levels.reduce(
    (n, l) => n + l.modules.reduce((m, mod) => m + mod.subModules.reduce((s, sm) => s + sm.classes.length, 0), 0),
    0,
  );

  const manifest = `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${esc(courseCode)}_MANIFEST" version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd
                      http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="${esc(courseCode)}_ORG">
    <organization identifier="${esc(courseCode)}_ORG" structure="hierarchical">
      <title>${esc(pathway.title)}</title>
${pathway.levels.map((lvl) => `  <item identifier="LVL_${lvl.level}" identifierref="">
      <title>Level ${lvl.level} — ${esc(lvl.name)}</title>
${lvl.modules.map((m) => moduleSco(m)).join("\n")}
    </item>`).join("\n")}
    </organization>
  </organizations>
  <resources>
${pathway.levels.flatMap((lvl) =>
  lvl.modules.flatMap((m) =>
    [`    <resource identifier="${esc(m.code)}_RES" type="webcontent" adlcp:scormtype="sco" href="modules/${esc(m.code)}.html">
      <metadata>
        <schema>ADL SCORM</schema>
        <schemaversion>1.2</schemaversion>
      </metadata>
      <file href="modules/${esc(m.code)}.html" />
    </resource>`].concat(
      m.subModules.flatMap((sm) =>
        sm.classes.map(
          (c) => `    <resource identifier="${esc(m.code)}_${esc(c.id)}_RES" type="webcontent" adlcp:scormtype="asset" href="modules/${esc(m.code)}_${esc(c.id)}.html">
      <file href="modules/${esc(m.code)}_${esc(c.id)}.html" />
    </resource>`,
        ),
      ),
    ),
  ),
).join("\n")}
    <resource identifier="${esc(courseCode)}_SYLLABUS" type="webcontent" adlcp:scormtype="asset" href="syllabus.html">
      <file href="syllabus.html" />
    </resource>
  </resources>
</manifest>
`;
  return new NextResponse(manifest, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="imsmanifest.xml"`,
    },
  });
}
