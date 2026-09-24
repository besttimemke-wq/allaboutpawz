// Seed real RAG chunks from the companion curriculum into lms.ai_rag_chunks.
//
// For each published course in lms.courses, this script:
//   1. Resolves the companion (from metadata.companion or curriculum.ts)
//   2. Chunks the companion content into coherent pieces:
//      - Overview
//      - Each section (lesson + worked example + checks)
//      - Learning objectives
//      - Independent practice items
//      - Applied project
//      - Each glossary term
//   3. Creates a parent ai_rag_documents row per course
//   4. Inserts each chunk into lms.ai_rag_chunks
//
// Idempotent: ON CONFLICT DO NOTHING on re-run.
// Run with: bun scripts/seed-rag-chunks.ts

import "dotenv/config";
import { Client } from "pg";

const CONN = process.env.SUPABASE_SESSION_POOLER || "";
const TENANT_ID = "00000000-0000-0000-0000-000000000001";

if (!CONN) {
  console.error("Missing SUPABASE_SESSION_POOLER");
  process.exit(1);
}

// Import the curriculum companions (same source the classroom uses)
import { companionForPathway } from "../src/lib/curriculum";
import type { Companion } from "../src/lib/types";

interface LmsCourse {
  id: string;
  code: string | null;
  title: string;
  metadata: Record<string, unknown> | null;
}

interface ChunkInput {
  content: string;
  sectionHeading: string;
  moduleCode: string;
  safetyFlag: boolean;
  chunkIndex: number;
}

function companionForCourse(course: LmsCourse): Companion | null {
  // Try metadata.companion first
  const meta = course.metadata ?? {};
  const companionRaw = meta.companion;
  if (typeof companionRaw === "string") {
    try { return JSON.parse(companionRaw); } catch { /* fall through */ }
  }
  if (companionRaw && typeof companionRaw === "object") {
    return companionRaw as Companion;
  }
  // Fall back to curriculum.ts
  if (course.code) {
    try { return companionForPathway(course.code); } catch { return null; }
  }
  return null;
}

function chunkCompanion(companion: Companion, courseCode: string): ChunkInput[] {
  const chunks: ChunkInput[] = [];
  let idx = 0;

  // 1. Overview
  if (companion.overview?.trim()) {
    chunks.push({
      content: `PATHWAY OVERVIEW — ${companion.title}\n\n${companion.overview}`,
      sectionHeading: "Overview",
      moduleCode: `${courseCode}-000`,
      safetyFlag: false,
      chunkIndex: idx++,
    });
  }

  // 2. Learning objectives
  if (companion.learningObjectives?.length) {
    chunks.push({
      content: `LEARNING OBJECTIVES — ${companion.title}\n\n${companion.learningObjectives.map((o, i) => `${i + 1}. ${o}`).join("\n")}`,
      sectionHeading: "Learning Objectives",
      moduleCode: `${courseCode}-OBJ`,
      safetyFlag: false,
      chunkIndex: idx++,
    });
  }

  // 3. Each section (lesson + worked example + checks)
  for (let i = 0; i < (companion.sections?.length ?? 0); i++) {
    const section = companion.sections![i];
    const moduleCode = `${courseCode}-${(i + 1) * 100}`;
    const parts: string[] = [`SECTION ${i + 1}: ${section.title}`];
    if (section.lesson?.trim()) parts.push(`LESSON\n${section.lesson}`);
    if (section.workedExample?.trim()) parts.push(`WORKED EXAMPLE\n${section.workedExample}`);
    if (section.checks?.length) parts.push(`CHECKS\n${section.checks.map((c, j) => `${j + 1}. ${c}`).join("\n")}`);
    chunks.push({
      content: parts.join("\n\n"),
      sectionHeading: section.title,
      moduleCode,
      // Safety-gate sections are safety-relevant
      safetyFlag: /safety|gate|restrain|bite|aggressive|fear|panic|injur/i.test(section.title + " " + section.lesson),
      chunkIndex: idx++,
    });
  }

  // 4. Independent practice
  if (companion.independentPractice?.length) {
    chunks.push({
      content: `INDEPENDENT PRACTICE — ${companion.title}\n\n${companion.independentPractice.map((p, i) => `${i + 1}. ${p}`).join("\n")}`,
      sectionHeading: "Independent Practice",
      moduleCode: `${courseCode}-PRAC`,
      safetyFlag: false,
      chunkIndex: idx++,
    });
  }

  // 5. Applied project
  if (companion.appliedProject?.title?.trim()) {
    const ap = companion.appliedProject;
    const parts = [`APPLIED PROJECT: ${ap.title}`];
    if (ap.brief?.trim()) parts.push(`BRIEF\n${ap.brief}`);
    if (ap.deliverables?.length) parts.push(`DELIVERABLES\n${ap.deliverables.map((d, i) => `${i + 1}. ${d}`).join("\n")}`);
    chunks.push({
      content: parts.join("\n\n"),
      sectionHeading: "Applied Project",
      moduleCode: `${courseCode}-PROJ`,
      safetyFlag: false,
      chunkIndex: idx++,
    });
  }

  // 6. Each glossary term
  for (const term of companion.glossary ?? []) {
    chunks.push({
      content: `GLOSSARY — ${term.term}: ${term.definition}`,
      sectionHeading: "Glossary",
      moduleCode: `${courseCode}-GLOSS`,
      safetyFlag: /safety|quick|bite|injur|restrain/i.test(term.term + " " + term.definition),
      chunkIndex: idx++,
    });
  }

  // 7. Family note
  if (companion.familyNote?.trim()) {
    chunks.push({
      content: `FAMILY NOTE — ${companion.title}\n\n${companion.familyNote}`,
      sectionHeading: "Family Note",
      moduleCode: `${courseCode}-FAM`,
      safetyFlag: false,
      chunkIndex: idx++,
    });
  }

  // 8. Sources
  if (companion.sources?.length) {
    chunks.push({
      content: `SOURCES — ${companion.title}\n\n${companion.sources.map((s, i) => `${i + 1}. ${s}`).join("\n")}`,
      sectionHeading: "Sources",
      moduleCode: `${courseCode}-SRC`,
      safetyFlag: false,
      chunkIndex: idx++,
    });
  }

  return chunks;
}

async function main() {
  const client = new Client({ connectionString: CONN, connectionTimeoutMillis: 10000 });
  await client.connect();

  // Fetch all published courses
  const { rows: courses } = await client.query<LmsCourse>(
    `SELECT id, code, title, metadata FROM lms.courses WHERE tenant_id = $1 AND is_published = true ORDER BY code`,
    [TENANT_ID],
  );
  console.log(`Found ${courses.length} published courses`);

  let totalChunks = 0;
  let totalDocs = 0;

  for (const course of courses) {
    if (!course.code) {
      console.log(`  SKIP ${course.title} — no code`);
      continue;
    }
    const companion = companionForCourse(course);
    if (!companion) {
      console.log(`  SKIP ${course.code} ${course.title} — no companion`);
      continue;
    }

    const chunks = chunkCompanion(companion, course.code);
    if (chunks.length === 0) {
      console.log(`  SKIP ${course.code} ${course.title} — no chunks generated`);
      continue;
    }

    // Create or find the parent document
    const docTitle = `${course.code} — ${companion.title} Companion`;
    let docId: string;
    const existingDoc = await client.query(
      `SELECT id FROM lms.ai_rag_documents WHERE tenant_id = $1 AND title = $2 LIMIT 1`,
      [TENANT_ID, docTitle],
    );
    if (existingDoc.rows.length > 0) {
      docId = existingDoc.rows[0].id;
      // Delete existing chunks for this doc (re-seed)
      await client.query(`DELETE FROM lms.ai_rag_chunks WHERE document_id = $1`, [docId]);
    } else {
      const docMeta = JSON.stringify({ pathwayCode: course.code, moduleCode: course.code, sourceId: docTitle });
      const newDoc = await client.query(
        `INSERT INTO lms.ai_rag_documents
           (id, tenant_id, course_id, document_type, title, total_chunks, chunk_size, chunk_overlap,
            embedding_model, embedding_dimensions, processing_status, metadata, safety_flag, learner_facing, rag_role)
         VALUES (gen_random_uuid(), $1, $2, 'study_guide', $3, $4, 0, 0, 'text-embedding-3-small', 1536, 'completed', $5::jsonb, false, true, 'core')
         RETURNING id`,
        [TENANT_ID, course.id, docTitle, chunks.length, docMeta],
      );
      docId = newDoc.rows[0].id;
      totalDocs++;
    }

    // Insert chunks
    for (const chunk of chunks) {
      const chunkMeta = JSON.stringify({
        pathwayCode: course.code,
        moduleCode: chunk.moduleCode,
        sourceId: docTitle,
        sectionHeading: chunk.sectionHeading,
        safetyFlag: chunk.safetyFlag,
      });
      // Update the doc's safety_flag if any chunk is safety-relevant
      if (chunk.safetyFlag) {
        await client.query(
          `UPDATE lms.ai_rag_documents SET safety_flag = true WHERE id = $1`,
          [docId],
        );
      }
      await client.query(
        `INSERT INTO lms.ai_rag_chunks
           (id, tenant_id, document_id, course_id, chunk_index, content, content_tokens, section_heading, chunk_metadata)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 1, $6, $7::jsonb)`,
        [TENANT_ID, docId, course.id, chunk.chunkIndex, chunk.content, chunk.sectionHeading, chunkMeta],
      );
      totalChunks++;
    }
    console.log(`  SEEDED ${course.code} ${course.title}: ${chunks.length} chunks (${chunks.filter(c => c.safetyFlag).length} safety-flagged)`);
  }

  // Final count
  const { rows: countRows } = await client.query(`SELECT count(*)::int AS n FROM lms.ai_rag_chunks WHERE tenant_id = $1`, [TENANT_ID]);
  console.log(`\nDone. Created ${totalDocs} documents, ${totalChunks} chunks. Total in DB: ${countRows[0].n}`);

  await client.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
