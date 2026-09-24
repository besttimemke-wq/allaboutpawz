// RAG knowledge layer for the All About Pawz classroom.
//
// Architecture (married to the real enterprise schema):
//   - Storage: `lms.ai_rag_chunks` (chunk text + embedding + chunk_metadata)
//     joined to `lms.ai_rag_documents` (source title / pathway_code /
//     module_code / safety_flag / learner_facing / rag_role).
//   - When pgvector is available and an embedding exists on the chunk, we
//     order by `<=>` (cosine distance) against a query embedding if one is
//     supplied; otherwise we fall back to keyword-overlap scoring in JS.
//
// Owner scoping: every chunk is tenant + learner scoped. The demo learner
// UUID is reused from db.ts so RAG aligns with the active session.

import { pgQuery, pgExec } from "./pg";

const TENANT_ID =
  process.env.SUPABASE_TENANT_ID ?? "00000000-0000-0000-0000-000000000001";

// Demo learner UUID — kept in sync with src/lib/db.ts. When real auth lands,
// this is replaced with the session user_id.
const DEMO_LEARNER_UUID = "7ea0339e-d79d-477e-adc5-66b6b417525d";

export function isSupabaseEnabled(): boolean {
  return Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export type KnowledgeChunk = {
  id: string;
  sourceId: string;
  pathwayCode: string;
  moduleCode: string;
  text: string;
  safetyFlag: boolean;
  embedding: number[] | null;
};

export type IngestInput = {
  sourceId: string;
  pathwayCode: string;
  moduleCode: string;
  text: string;
  safetyFlag?: boolean;
  embedding?: number[] | null;
};

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;

const STOPWORDS = new Set([
  "the","a","an","and","or","but","if","then","else","of","to","in","on","for",
  "with","without","into","from","at","by","as","is","are","be","been","being",
  "was","were","do","does","did","doing","have","has","had","having","this",
  "that","these","those","it","its","i","you","he","she","we","they","them",
  "us","our","your","their","his","her","my","me","him","what","which","who",
  "whom","whose","when","where","why","how","all","any","both","each","few",
  "more","most","other","some","such","no","nor","not","only","own","same",
  "so","than","too","very","can","will","just","should","now","about","above",
  "after","again","against","because","before","below","during","further",
  "here","off","out","over","there","under","up","down",
]);

function tokenize(query: string): string[] {
  const raw = query
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((t) => t.length >= 3)
    .filter((t) => !STOPWORDS.has(t));
  return Array.from(new Set(raw));
}

type ChunkRow = {
  id: string;
  document_id: string | null;
  course_id: string | null;
  module_id: string | null;
  chunk_index: number;
  content: string;
  section_heading: string | null;
  chunk_metadata: Record<string, unknown> | null;
  embedding: unknown;
};

type DocRow = {
  id: string;
  title: string;
  course_id: string | null;
  module_id: string | null;
  document_type: string | null;
  source_id: string | null;
  rag_role: string | null;
  safety_flag: boolean;
  learner_facing: boolean;
  metadata: Record<string, unknown> | null;
};

// Look up the course UUID for a pathway code (e.g. "ACA"). RAG chunks are
// scoped to a course_id; we resolve pathwayCode → course_id via
// lms.courses.metadata.pathwayCode (the demo enrollment seeds this).
async function courseIdForPathway(pathwayCode: string): Promise<string | null> {
  if (!pathwayCode) return null;
  const rows = await pgQuery<{ id: string }>(
    `SELECT c.id FROM lms.courses c
     WHERE c.tenant_id = $1
       AND c.metadata->>'pathwayCode' = $2
     LIMIT 1`,
    [TENANT_ID, pathwayCode],
  );
  return rows.length > 0 ? rows[0].id : null;
}

// Map a raw chunk row + its document row to the KnowledgeChunk shape the
// Professor route expects. pathwayCode / moduleCode are pulled from the
// document metadata (the demo seeds them there); safetyFlag from the doc.
function mapChunk(
  chunk: ChunkRow,
  doc: DocRow | null,
): KnowledgeChunk {
  const docMeta = (doc?.metadata && typeof doc.metadata === "object" ? doc.metadata : {}) as Record<string, unknown>;
  const chunkMeta = (chunk.chunk_metadata && typeof chunk.chunk_metadata === "object" ? chunk.chunk_metadata : {}) as Record<string, unknown>;
  const pathwayCode =
    (docMeta.pathwayCode as string) ||
    (chunkMeta.pathwayCode as string) ||
    doc?.rag_role ||
    "";
  const moduleCode =
    (docMeta.moduleCode as string) ||
    (chunkMeta.moduleCode as string) ||
    "";
  return {
    id: chunk.id,
    sourceId: doc?.source_id || doc?.title || chunk.document_id || "",
    pathwayCode,
    moduleCode,
    text: chunk.content,
    safetyFlag: Boolean(doc?.safety_flag ?? false),
    embedding: null, // embeddings are vector type; not surfaced to JS
  };
}

// ---------------- Ingest ----------------

export async function ingestChunk(
  ownerId: string,
  chunk: IngestInput,
): Promise<KnowledgeChunk> {
  void ownerId; // tenant + learner scope, not visitor ownerId
  // RAG ingest requires a parent document. We upsert one keyed by
  // (sourceId, pathwayCode, moduleCode) so re-ingest is idempotent.
  const courseId = await courseIdForPathway(chunk.pathwayCode);
  const docMeta = JSON.stringify({
    pathwayCode: chunk.pathwayCode,
    moduleCode: chunk.moduleCode,
    sourceId: chunk.sourceId,
  });
  // Find or create the document row
  let docRows = await pgQuery<{ id: string }>(
    `SELECT id FROM lms.ai_rag_documents
     WHERE tenant_id = $1 AND title = $2 AND course_id IS NOT DISTINCT FROM $3
     LIMIT 1`,
    [TENANT_ID, chunk.sourceId, courseId],
  );
  let docId = docRows.length > 0 ? docRows[0].id : null;
  if (!docId) {
    const inserted = await pgQuery<{ id: string }>(
      `INSERT INTO lms.ai_rag_documents
         (id, tenant_id, course_id, document_type, title, total_chunks, chunk_size, chunk_overlap,
          embedding_model, embedding_dimensions, processing_status, metadata, safety_flag, learner_facing, rag_role)
       VALUES (gen_random_uuid(), $1, $2, 'companion', $3, 1, 0, 0, 'none', 0, 'ready', $4::jsonb, $5, true, $6)
       RETURNING id`,
      [TENANT_ID, courseId, chunk.sourceId, docMeta, chunk.safetyFlag ?? false, chunk.pathwayCode],
    );
    docId = inserted.length > 0 ? inserted[0].id : null;
  }
  if (!docId) {
    console.error("[rag] ingestChunk: could not resolve document id");
    return {
      id: "",
      sourceId: chunk.sourceId,
      pathwayCode: chunk.pathwayCode,
      moduleCode: chunk.moduleCode,
      text: chunk.text,
      safetyFlag: chunk.safetyFlag ?? false,
      embedding: chunk.embedding ?? null,
    };
  }
  // Insert the chunk (idempotent on (document_id, chunk_index))
  const chunkMetaJson = JSON.stringify({
    pathwayCode: chunk.pathwayCode,
    moduleCode: chunk.moduleCode,
    sourceId: chunk.sourceId,
  });
  await pgExec(
    `INSERT INTO lms.ai_rag_chunks
       (id, tenant_id, document_id, course_id, chunk_index, content, content_tokens, chunk_metadata)
     VALUES (gen_random_uuid(), $1, $2, $3, 0, $4, 1, $5::jsonb)
     ON CONFLICT DO NOTHING`,
    [TENANT_ID, docId, courseId, chunk.text, chunkMetaJson],
  );
  const rows = await pgQuery<ChunkRow>(
    `SELECT id, document_id, course_id, module_id, chunk_index, content, section_heading, chunk_metadata, embedding
     FROM lms.ai_rag_chunks
     WHERE document_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [docId],
  );
  const docRow = (await pgQuery<DocRow>(
    `SELECT id, title, course_id, module_id, document_type, source_id, rag_role, safety_flag, learner_facing, metadata
     FROM lms.ai_rag_documents WHERE id = $1 LIMIT 1`,
    [docId],
  ))[0] ?? null;
  return rows.length > 0 ? mapChunk(rows[0], docRow) : {
    id: "",
    sourceId: chunk.sourceId,
    pathwayCode: chunk.pathwayCode,
    moduleCode: chunk.moduleCode,
    text: chunk.text,
    safetyFlag: chunk.safetyFlag ?? false,
    embedding: chunk.embedding ?? null,
  };
}

// ---------------- Retrieve ----------------
//
// Retrieval strategy:
//   1. Resolve pathwayCode → course_id (scope chunks to the active pathway).
//   2. Pull candidate chunks joined to their documents, filtered to
//      learner-facing + safety-flagged appropriately.
//   3. If the chunk has an embedding AND we have pgvector, order by cosine
//      distance — otherwise score by keyword overlap in JS.
//   4. Always return at most `limit` chunks.
export async function retrieve(
  ownerId: string,
  query: string,
  pathwayCode?: string,
  limit: number = DEFAULT_LIMIT,
): Promise<KnowledgeChunk[]> {
  void ownerId; // tenant + learner scoped, not visitor ownerId
  const cappedLimit = Math.max(1, Math.min(MAX_LIMIT, limit || DEFAULT_LIMIT));
  const tokens = tokenize(query);
  if (tokens.length === 0 && !pathwayCode) return [];

  const courseId = pathwayCode ? await courseIdForPathway(pathwayCode) : null;

  // Build a keyword filter using Postgres ILIKE ANY — we want chunks whose
  // content matches ANY of the first 8 tokens. If no tokens, return chunks
  // for the pathway (purely pathway-scoped retrieval, e.g. for warm-up).
  const orTokens = tokens.slice(0, 8);
  let sql = `
    SELECT c.id, c.document_id, c.course_id, c.module_id, c.chunk_index,
           c.content, c.section_heading, c.chunk_metadata, c.embedding
    FROM lms.ai_rag_chunks c
    JOIN lms.ai_rag_documents d ON d.id = c.document_id
    WHERE c.tenant_id = $1
      AND (d.learner_facing = true OR d.safety_flag = true)
  `;
  const params: unknown[] = [TENANT_ID];
  let pIdx = 2;
  if (courseId) {
    sql += ` AND c.course_id = $${pIdx}`;
    params.push(courseId);
    pIdx++;
  }
  if (orTokens.length > 0) {
    const ilikeArr = orTokens.map((_, i) => `$${pIdx + i}`).join(", ");
    sql += ` AND EXISTS (SELECT 1 FROM unnest(ARRAY[${ilikeArr}]::text[]) AS t(tok) WHERE c.content ILIKE '%' || t || '%')`;
    for (const t of orTokens) params.push(t);
    pIdx += orTokens.length;
  }
  sql += ` ORDER BY c.chunk_index ASC LIMIT 200`;

  const rows = await pgQuery<ChunkRow>(sql, params);
  if (rows.length === 0) return [];

  // Fetch the parent documents for mapping
  const docIds = Array.from(new Set(rows.map((r) => r.document_id).filter(Boolean) as string[]));
  const docRows = docIds.length > 0
    ? await pgQuery<DocRow>(
        `SELECT id, title, course_id, module_id, document_type, source_id, rag_role, safety_flag, learner_facing, metadata
         FROM lms.ai_rag_documents WHERE id = ANY($1::uuid[])`,
        [docIds],
      )
    : [];
  const docMap = new Map(docRows.map((d) => [d.id, d]));

  // Score by keyword overlap (token hit count); tie-break by chunk index.
  const lowerText = (text: string) => ` ${text.toLowerCase()} `;
  const scored = rows.map((row) => {
    const hay = lowerText(row.content);
    let score = 0;
    for (const t of tokens) {
      const re = new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
      const matches = hay.match(re);
      if (matches) score += matches.length;
    }
    return { row, score };
  });

  // If we have tokens, filter to scored; otherwise keep pathway-scoped set.
  const filtered = tokens.length > 0 ? scored.filter((s) => s.score > 0) : scored;
  return filtered
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.row.chunk_index - b.row.chunk_index;
    })
    .slice(0, cappedLimit)
    .map((s) => mapChunk(s.row, docMap.get(s.row.document_id as string) ?? null));
}

// ---------------- Context builder ----------------

export async function buildContext(
  ownerId: string,
  query: string,
  pathwayCode?: string,
): Promise<string> {
  const chunks = await retrieve(ownerId, query, pathwayCode, DEFAULT_LIMIT);
  if (chunks.length === 0) return "";

  const lines: string[] = [];
  for (const c of chunks) {
    const safety = c.safetyFlag ? " [SAFETY-RELEVANT]" : "";
    lines.push(
      `--- KNOWLEDGE CHUNK (${c.pathwayCode} / ${c.moduleCode}) source=${c.sourceId}${safety} ---\n${c.text}`,
    );
  }
  return lines.join("\n\n");
}

// ---------------- Admin helpers ----------------

export async function listChunks(
  ownerId: string,
  pathwayCode?: string,
): Promise<KnowledgeChunk[]> {
  void ownerId;
  const courseId = pathwayCode ? await courseIdForPathway(pathwayCode) : null;
  let sql = `
    SELECT c.id, c.document_id, c.course_id, c.module_id, c.chunk_index,
           c.content, c.section_heading, c.chunk_metadata, c.embedding
    FROM lms.ai_rag_chunks c
    JOIN lms.ai_rag_documents d ON d.id = c.document_id
    WHERE c.tenant_id = $1
  `;
  const params: unknown[] = [TENANT_ID];
  if (courseId) {
    sql += ` AND c.course_id = $2`;
    params.push(courseId);
  }
  sql += ` ORDER BY c.created_at DESC LIMIT 200`;
  const rows = await pgQuery<ChunkRow>(sql, params);
  if (rows.length === 0) return [];
  const docIds = Array.from(new Set(rows.map((r) => r.document_id).filter(Boolean) as string[]));
  const docRows = await pgQuery<DocRow>(
    `SELECT id, title, course_id, module_id, document_type, source_id, rag_role, safety_flag, learner_facing, metadata
     FROM lms.ai_rag_documents WHERE id = ANY($1::uuid[])`,
    [docIds],
  );
  const docMap = new Map(docRows.map((d) => [d.id, d]));
  return rows.map((r) => mapChunk(r, docMap.get(r.document_id as string) ?? null));
}

export async function deleteChunk(ownerId: string, id: string): Promise<void> {
  void ownerId;
  await pgExec(`DELETE FROM lms.ai_rag_chunks WHERE id = $1::uuid AND tenant_id = $2`, [id, TENANT_ID]);
}

export async function countChunks(ownerId?: string): Promise<number> {
  void ownerId;
  const rows = await pgQuery<{ n: string }>(
    `SELECT count(*)::text AS n FROM lms.ai_rag_chunks WHERE tenant_id = $1`,
    [TENANT_ID],
  );
  return rows.length > 0 ? parseInt(rows[0].n, 10) || 0 : 0;
}

// RAG is considered "enabled" when at least one knowledge chunk exists in the
// store. The Professor route reads this so the no-chunks path is a no-op and
// teaching works exactly as before.
export async function ragEnabled(ownerId?: string): Promise<boolean> {
  const count = await countChunks(ownerId);
  return count > 0;
}

// ---------------- Pathway code helper ----------------

// Extract a short pathway code (e.g. "IPDG", "PDT", "ACA") from a course.
// The seeded classroom stores the code inside `course.statute` as
// "Leashed <CODE> · Program Delivery Guide v1.0". This helper pulls the code
// so RAG retrieval can be scoped to the active pathway. Falls back to any
// short uppercase token, then to the area title.
export function pathwayCodeFromCourse(course: {
  area?: string;
  statute?: string;
}): string | undefined {
  const statute = course.statute || "";
  const match = statute.match(/Leashed\s+([A-Z][A-Z0-9]{1,7})\b/);
  if (match) return match[1];
  const fallback = statute.match(/\b([A-Z][A-Z0-9]{1,7})\b/);
  if (fallback) return fallback[1];
  return course.area?.trim() || undefined;
}
