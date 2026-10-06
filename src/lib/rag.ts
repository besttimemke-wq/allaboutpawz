// RAG knowledge layer for the All About Pawz classroom.
//
// Architecture:
//   - Default: chunks stored in Prisma (SQLite), retrieval is keyword overlap.
//   - Supabase: when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are configured,
//     retrieve() calls the `match_knowledge_chunks` RPC (pgvector cosine
//     similarity) for semantic search. Ingest mirrors to both stores.
//
// Owner scoping: every chunk is owned by a single demo visitor (ownerId).

import { prisma } from "./prisma";

let supabaseClient: any = null;
async function getSupabase() {
  if (supabaseClient !== null) return supabaseClient;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  try {
    const { createClient } = await import("@supabase/supabase-js");
    supabaseClient = createClient(url, key);
    return supabaseClient;
  } catch {
    return null;
  }
}

export function isSupabaseEnabled(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
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

// Tiny English stop list — keep retrieval focused on content words.
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

function mapChunk(row: {
  id: string;
  sourceId: string;
  pathwayCode: string;
  moduleCode: string;
  text: string;
  safetyFlag: boolean;
  embedding: string | null;
}): KnowledgeChunk {
  let embedding: number[] | null = null;
  if (row.embedding) {
    try {
      const parsed = JSON.parse(row.embedding);
      if (Array.isArray(parsed)) {
        embedding = parsed.map((n: unknown) => Number(n)).filter((n) => Number.isFinite(n));
      }
    } catch {
      embedding = null;
    }
  }
  return {
    id: row.id,
    sourceId: row.sourceId,
    pathwayCode: row.pathwayCode,
    moduleCode: row.moduleCode,
    text: row.text,
    safetyFlag: row.safetyFlag,
    embedding,
  };
}

// ---------------- Ingest ----------------

export async function ingestChunk(
  ownerId: string,
  chunk: IngestInput,
): Promise<KnowledgeChunk> {
  const embeddingJson = chunk.embedding ? JSON.stringify(chunk.embedding) : null;
  const row = await prisma.knowledgeChunk.create({
    data: {
      ownerId,
      sourceId: chunk.sourceId,
      pathwayCode: chunk.pathwayCode,
      moduleCode: chunk.moduleCode,
      text: chunk.text,
      safetyFlag: chunk.safetyFlag ?? false,
      embedding: embeddingJson,
    },
  });
  return mapChunk(row);
}

// ---------------- Retrieve ----------------
//
// When Supabase is configured (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY),
// retrieval uses pgvector cosine similarity via the `match_knowledge_chunks`
// RPC. Otherwise it falls back to keyword-overlap on SQLite.
//
// The Supabase RPC signature:
//   match_knowledge_chunks(
//     query_text text,
//     p_pathway_code text DEFAULT NULL,
//     p_owner_id text DEFAULT NULL,
//     match_count int DEFAULT 5
//   ) RETURNS TABLE(id text, source_id text, pathway_code text,
//                   module_code text, text text, safety_flag boolean,
//                   similarity float)
//
// The RPC generates an embedding from query_text using OpenAI
// text-embedding-3-small and orders by embedding <=> query_embedding.
export async function retrieve(
  ownerId: string,
  query: string,
  pathwayCode?: string,
  limit: number = DEFAULT_LIMIT,
): Promise<KnowledgeChunk[]> {
  const cappedLimit = Math.max(1, Math.min(MAX_LIMIT, limit || DEFAULT_LIMIT));

  // --- Supabase pgvector path ---
  const supabase = await getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.rpc("match_knowledge_chunks", {
        query_text: query,
        p_pathway_code: pathwayCode || null,
        p_owner_id: ownerId,
        match_count: cappedLimit,
      });
      if (!error && data) {
        return (data as any[]).map((row) => ({
          id: String(row.id),
          sourceId: row.source_id || row.sourceId || "",
          pathwayCode: row.pathway_code || row.pathwayCode || "",
          moduleCode: row.module_code || row.moduleCode || "",
          text: row.text || "",
          safetyFlag: Boolean(row.safety_flag ?? row.safetyFlag),
          embedding: null,
        }));
      }
    } catch {
      // Fall through to keyword path
    }
  }

  // --- Keyword fallback path (SQLite) ---
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  // Fetch candidate chunks. SQLite LIKE is case-insensitive for ASCII by
  // default; we still lowercase the token to be safe across locales.
  const where: { ownerId: string; pathwayCode?: string; OR?: Array<{ text: { contains: string } }> } = { ownerId };
  if (pathwayCode && pathwayCode.trim()) {
    where.pathwayCode = pathwayCode.trim();
  }
  // Pull chunks that contain ANY token — narrow with LIKE on first 8 tokens
  // to keep the SQL cheap. (The rest are scored in JS.)
  const orTokens = tokens.slice(0, 8);
  where.OR = orTokens.map((t) => ({ text: { contains: t } }));

  const rows = await prisma.knowledgeChunk.findMany({ where });
  if (rows.length === 0) return [];

  // Score by total token hit count, then by text length (shorter = denser).
  const lowerText = (text: string) => ` ${text.toLowerCase()} `;
  const scored = rows.map((row) => {
    const hay = lowerText(row.text);
    let score = 0;
    for (const t of tokens) {
      // count non-overlapping occurrences of the token bounded by non-words
      const re = new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
      const matches = hay.match(re);
      if (matches) score += matches.length;
    }
    return { row, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // tie-break: shorter text first (denser match)
      return a.row.text.length - b.row.text.length;
    })
    .slice(0, cappedLimit)
    .map((s) => mapChunk(s.row));
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
  const where: { ownerId: string; pathwayCode?: string } = { ownerId };
  if (pathwayCode && pathwayCode.trim()) where.pathwayCode = pathwayCode.trim();
  const rows = await prisma.knowledgeChunk.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return rows.map(mapChunk);
}

export async function deleteChunk(ownerId: string, id: string): Promise<void> {
  await prisma.knowledgeChunk.deleteMany({ where: { ownerId, id } });
}

export async function countChunks(ownerId?: string): Promise<number> {
  return prisma.knowledgeChunk.count(ownerId ? { where: { ownerId } } : undefined);
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
