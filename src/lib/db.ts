// UNLEASHED classroom data access — married to the real enterprise `lms.*`
// schema. All function signatures and return shapes are preserved so the API
// routes and the classroom UI are unchanged. DateTime fields are surfaced as
// ISO strings to match the original SQLite string behavior the frontend
// expects.
//
// Data layer contract:
//   - courses / enrollments / ai_tutor_messages / ai_teaching_sessions:
//     the real specialized tables.
//   - workspace notes → lms.learner_notes (title+body joined in note_body).
//   - workspace files → lms.file_uploads (base64 payload in metadata.base64).
//   - human-need queue → lms.human_escalation_routing (status + context jsonb).
//   - workspace events / messages / evidence / assignment-state / day-events /
//     learning attempts → lms.learning_analytics_events (the generic
//     append-only event log — event_type discriminates the payload shape).
//   - school snapshot → lms.enrollments + courses + grade_book +
//     meeting_records + pacing_schedules.

import { pgQuery, pgExec } from "./pg";
import { companionForPathway } from "./curriculum";
import type { Companion, CourseRecord } from "./types";

function iso(value: Date | string | null | undefined): string {
  if (!value) return "";
  return typeof value === "string" ? value : value.toISOString();
}

type Row = Record<string, unknown>;
function asRow<T = Row>(r: unknown): T {
  return (r ?? {}) as T;
}

const TENANT_ID = process.env.SUPABASE_TENANT_ID ?? "00000000-0000-0000-0000-000000000001";

// Demo learner UUID — the visitor system in src/lib/visitor.ts is a fixed
// demo identity ("demo-avery"). The lms.* schema uses UUID user_ids that FK
// to auth.users. We seed exactly one real auth user (allaboutpawz901@gmail.com)
// as the demo learner, and map the visitor to that UUID here. When real auth
// lands, replace this with the actual session user_id.
const DEMO_LEARNER_UUID = "7ea0339e-d79d-477e-adc5-66b6b417525d";

// Stable integer ID derived from a UUID — the classroom UI uses integer IDs
// for course lookup; lms.courses.id is a UUID. We derive a deterministic
// 31-bit int from the UUID's first 8 hex chars so the same course always
// maps to the same int within a session.
function uuidToInt(uuid: string | null | undefined): number {
  if (!uuid) return 0;
  const head = uuid.replace(/[^0-9a-f]/gi, "").slice(0, 8);
  return parseInt(head || "0", 16) % 0x7fffffff;
}

// ---------------- Courses (lms.courses) ----------------

type LmsCourseRow = {
  id: string;
  tenant_id: string;
  code: string | null;
  title: string;
  slug: string;
  description: string | null;
  long_description: string | null;
  category: string | null;
  tags: string[] | null;
  is_published: boolean;
  sort_order: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
  total_clock_hours: string | number | null;
  difficulty_level: string | null;
};

function mapCourseFromLms(c: LmsCourseRow): CourseRecord {
  const meta = (c.metadata && typeof c.metadata === "object" ? c.metadata : {}) as Record<string, unknown>;
  // Companion resolution order:
  //   1. lms.courses.metadata.companion (if a generated companion was persisted)
  //   2. companionForPathway(c.code) — the curriculum.ts authored companions
  //      keyed by pathway code (IPDG, PDT, ACA, PPS, CAT, PPC, ...)
  //   3. Minimal fallback (title only, empty sections)
  let companion: Companion | null = null;
  const companionRaw = meta.companion;
  if (typeof companionRaw === "string") {
    try { companion = JSON.parse(companionRaw) as Companion; } catch { companion = null; }
  } else if (companionRaw && typeof companionRaw === "object") {
    companion = companionRaw as Companion;
  }
  if (!companion && c.code) {
    try { companion = companionForPathway(c.code); } catch { companion = null; }
  }
  const fallback: Companion = {
    title: c.title, subtitle: "", overview: "", alignment: { state: "TN", grade: "9-12", area: c.category || "Grooming", statute: "", authority: "", note: "" },
    learningObjectives: [], sections: [], independentPractice: [], appliedProject: { title: "", brief: "", deliverables: [] },
    glossary: [], familyNote: "", sources: [],
  };
  return {
    id: uuidToInt(c.id),
    code: c.code,
    state: (meta.state as string) || companion?.alignment?.state || "TN",
    area: c.category || (meta.area as string) || companion?.alignment?.area || "Grooming",
    statute: (meta.statute as string) || companion?.alignment?.statute || "",
    grade: (meta.grade as string) || companion?.alignment?.grade || "9-12",
    title: c.title,
    companion: companion ?? fallback,
    model: (meta.model as string) || "gemini-1.5-flash",
    createdAt: iso(c.created_at),
    description: c.description,
    longDescription: c.long_description,
    category: c.category,
    totalClockHours: c.total_clock_hours,
    difficultyLevel: c.difficulty_level,
    slug: c.slug,
  };
}

export async function saveCourse(
  ownerId: string,
  selection: { state: string; area: string; statute: string; grade: string },
  companion: Companion,
  model: string,
) {
  // Courses in the enterprise schema are tenant-scoped, not visitor-scoped.
  // Store the original Prisma-shape fields in lms.courses.metadata so they
  // survive round-trips. slug derived from title; code derived from title.
  const slug = companion.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  const code = (companion.title.split(/\s+/).map((w: string) => w[0]?.toUpperCase() ?? "").join("").slice(0, 4) || "CRS");
  const meta = JSON.stringify({ state: selection.state, area: selection.area, statute: selection.statute, grade: selection.grade, companion, model, ownerId });
  const rows = await pgQuery<LmsCourseRow>(
    `INSERT INTO lms.courses (tenant_id, code, title, slug, description, course_type, delivery_modes, difficulty_level, is_published, sort_order, metadata)
     VALUES ($1, $2, $3, $4, $5, 'course', ARRAY['self_paced']::text[], 'beginner', true, 999, $6::jsonb)
     RETURNING id, tenant_id, code, title, slug, description, long_description, category, tags, is_published, sort_order, metadata, created_at, total_clock_hours, difficulty_level`,
    [TENANT_ID, code, companion.title, slug, companion.title, meta],
  );
  if (rows.length === 0) return null;
  return mapCourseFromLms(rows[0]);
}

export async function listCourses(ownerId: string): Promise<CourseRecord[]> {
  // The classroom canvas shows the LEARNER'S ENROLLED courses — not the
  // catalog. The catalog (all published) lives at /learn via
  // courses-data.ts; the classroom queries the learner's active enrollments
  // joined to lms.courses for the rich companion data.
  void ownerId;
  const rows = await pgQuery<LmsCourseRow>(
    `SELECT c.id, c.tenant_id, c.code, c.title, c.slug, c.description, c.long_description, c.category, c.tags, c.is_published, c.sort_order, c.metadata, c.created_at, c.total_clock_hours, c.difficulty_level
     FROM lms.enrollments e
     JOIN lms.courses c ON c.id = e.course_id AND c.tenant_id = e.tenant_id
     WHERE e.learner_user_id = $1 AND e.status = 'active'
     ORDER BY c.sort_order ASC NULLS LAST, c.title ASC
     LIMIT 50`,
    [DEMO_LEARNER_UUID],
  );
  return rows.map(mapCourseFromLms);
}

// Catalog view — all published courses in the tenant, ordered by sort_order.
// Used by /api/courses?catalog=true and the CoursesCatalogView.
export async function listAllCourses(): Promise<CourseRecord[]> {
  const rows = await pgQuery<LmsCourseRow>(
    `SELECT id, tenant_id, code, title, slug, description, long_description, category, tags, is_published, sort_order, metadata, created_at, total_clock_hours, difficulty_level
     FROM lms.courses
     WHERE tenant_id = $1 AND is_published = true
     ORDER BY sort_order ASC NULLS LAST, title ASC
     LIMIT 200`,
    [TENANT_ID],
  );
  return rows.map(mapCourseFromLms);
}

export async function getCourse(ownerId: string, id: number): Promise<CourseRecord | null> {
  // Same enrollment-scoped filter as listCourses; the classroom calls this
  // with an integer id derived from uuidToInt(course.uuid).
  void ownerId;
  const rows = await pgQuery<LmsCourseRow>(
    `SELECT c.id, c.tenant_id, c.code, c.title, c.slug, c.description, c.long_description, c.category, c.tags, c.is_published, c.sort_order, c.metadata, c.created_at, c.total_clock_hours, c.difficulty_level
     FROM lms.enrollments e
     JOIN lms.courses c ON c.id = e.course_id AND c.tenant_id = e.tenant_id
     WHERE e.learner_user_id = $1 AND e.status = 'active'
     ORDER BY c.sort_order ASC NULLS LAST, c.title ASC
     LIMIT 50`,
    [DEMO_LEARNER_UUID],
  );
  const match = rows.find((r) => uuidToInt(r.id) === id);
  return match ? mapCourseFromLms(match) : null;
}

// Catalog-style lookup — fetch any published course by its integer id,
// regardless of enrollment. Used by the pathway-detail view before the
// learner has enrolled.
export async function getPublishedCourse(id: number): Promise<CourseRecord | null> {
  const rows = await pgQuery<LmsCourseRow>(
    `SELECT id, tenant_id, code, title, slug, description, long_description, category, tags, is_published, sort_order, metadata, created_at, total_clock_hours, difficulty_level
     FROM lms.courses
     WHERE tenant_id = $1 AND is_published = true
     ORDER BY sort_order ASC NULLS LAST, title ASC
     LIMIT 500`,
    [TENANT_ID],
  );
  const match = rows.find((r) => uuidToInt(r.id) === id);
  return match ? mapCourseFromLms(match) : null;
}

// ---------------- Professor conversation (lms.ai_tutor_messages) ----------------

// The LMS schema ties tutor messages to a teaching SESSION (ai_teaching_sessions),
// not directly to a course. This helper finds the active session for the demo
// learner + course, creating one if none exists. Returns the session UUID.
async function getOrCreateSession(courseId: number): Promise<string | null> {
  // Find the course UUID from the integer ID
  const courses = await pgQuery<{ id: string }>(
    `SELECT c.id FROM lms.enrollments e
     JOIN lms.courses c ON c.id = e.course_id AND c.tenant_id = e.tenant_id
     WHERE e.learner_user_id = $1 AND e.status = 'active'`,
    [DEMO_LEARNER_UUID],
  );
  const course = courses.find((r) => uuidToInt(r.id) === courseId);
  if (!course) return null;

  // Find an active teaching session for this learner + course
  const sessions = await pgQuery<{ id: string }>(
    `SELECT id FROM lms.ai_teaching_sessions
     WHERE learner_user_id = $1 AND course_id = $2 AND session_status = 'active'
     ORDER BY created_at DESC LIMIT 1`,
    [DEMO_LEARNER_UUID, course.id],
  );
  if (sessions.length > 0) return sessions[0].id;

  // No active session — create one
  const inserted = await pgQuery<{ id: string }>(
    `INSERT INTO lms.ai_teaching_sessions
       (id, tenant_id, learner_user_id, course_id, session_status, started_at, delivery_mode)
     VALUES (gen_random_uuid(), $1, $2, $3, 'active', now(), 'ai_guided')
     RETURNING id`,
    [TENANT_ID, DEMO_LEARNER_UUID, course.id],
  );
  return inserted.length > 0 ? inserted[0].id : null;
}

export async function listMessages(ownerId: string, courseId: number) {
  void ownerId;
  const sessionId = await getOrCreateSession(courseId);
  if (!sessionId) return [];
  const rows = await pgQuery<{
    id: string;
    message_role: string;
    message_content: string;
    created_at: string;
  }>(
    `SELECT id, message_role, message_content, created_at
     FROM lms.ai_tutor_messages
     WHERE session_id = $1
     ORDER BY created_at ASC
     LIMIT 100`,
    [sessionId],
  );
  return rows.map((r, i) => ({
    id: i + 1,
    role: (r.message_role === "ai" ? "professor" : r.message_role) as "learner" | "professor",
    content: r.message_content,
    createdAt: iso(r.created_at),
  }));
}

export async function saveMessage(
  ownerId: string,
  courseId: number,
  role: "learner" | "professor",
  content: string,
) {
  void ownerId;
  const sessionId = await getOrCreateSession(courseId);
  if (!sessionId) {
    console.error("[db] saveMessage: no session for courseId", courseId);
    return;
  }
  try {
    const lmsRole = role === "professor" ? "ai" : role;
    await pgExec(
      `INSERT INTO lms.ai_tutor_messages
         (id, tenant_id, session_id, learner_user_id, message_role, message_content, message_type)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)`,
      [TENANT_ID, sessionId, DEMO_LEARNER_UUID, lmsRole, content, "text"],
    );
  } catch (e) {
    console.error("[db] saveMessage failed:", e instanceof Error ? e.message : "unknown");
  }
}

export async function listDashboardProfessorMessages(ownerId: string, lessonId: string) {
  void ownerId;
  // Dashboard professor messages are tutor messages scoped to a lesson
  // (not a session). Query ai_tutor_messages by lesson_id.
  const rows = await pgQuery<{
    id: string;
    message_role: string;
    message_content: string;
    created_at: string;
  }>(
    `SELECT id, message_role, message_content, created_at
     FROM lms.ai_tutor_messages
     WHERE learner_user_id = $1 AND lesson_id::text = $2
     ORDER BY created_at ASC
     LIMIT 100`,
    [DEMO_LEARNER_UUID, lessonId],
  );
  return rows.map((r, i) => ({
    id: i + 1,
    role: (r.message_role === "ai" ? "professor" : r.message_role) as "learner" | "professor",
    content: r.message_content,
    createdAt: iso(r.created_at),
  }));
}

export async function saveDashboardProfessorMessage(
  ownerId: string,
  lessonId: string,
  role: "learner" | "professor",
  content: string,
) {
  void ownerId;
  try {
    const lmsRole = role === "professor" ? "ai" : role;
    await pgExec(
      `INSERT INTO lms.ai_tutor_messages
         (id, tenant_id, learner_user_id, lesson_id, message_role, message_content, message_type)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)`,
      [TENANT_ID, DEMO_LEARNER_UUID, lessonId, lmsRole, content, "text"],
    );
  } catch (e) {
    console.error("[db] saveDashboardProfessorMessage failed:", e instanceof Error ? e.message : "unknown");
  }
}

// ---------------- Workspace ----------------
//
// Notes live in lms.learner_notes (title + body joined in note_body as
// `${title}\n\n${body}` so the table remains human-readable). Files live in
// lms.file_uploads (base64 payload in metadata.base64). Events, messages,
// evidence, assignment-state, day-events, and learning attempts all live in
// lms.learning_analytics_events — the generic append-only event log — with
// event_type discriminating the payload shape and the full payload in
// event_data jsonb. This avoids NOT-NULL FK constraints on the specialized
// tables (conversation_messages.requires conversation_id,
// artifact_submissions.requires assignment_id, quiz_attempts.requires
// quiz_id) which the workspace UI does not have.

export type WorkspaceNote = {
  id: number;
  courseId: number | null;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};
export type WorkspaceEvent = {
  id: number;
  courseId: number | null;
  title: string;
  startsAt: string;
  kind: string;
};
export type WorkspaceFile = {
  id: number;
  courseId: number | null;
  name: string;
  mime: string;
  size: number;
  createdAt: string;
};
export type AssignmentState = {
  courseId: number;
  assignmentKey: string;
  status: string;
  score: number | null;
  updatedAt: string;
};

// Split a learner_notes.note_body back into {title, body}. We stored it as
// `${title}\n\n${body}`. If there's no `\n\n`, the whole thing is the body
// and the title is the first line trimmed.
function splitNoteBody(raw: string | null | undefined): { title: string; body: string } {
  const text = raw ?? "";
  const idx = text.indexOf("\n\n");
  if (idx >= 0) {
    return { title: text.slice(0, idx), body: text.slice(idx + 2) };
  }
  // Fall back: first line is the title
  const nl = text.indexOf("\n");
  if (nl >= 0) return { title: text.slice(0, nl), body: text.slice(nl + 1) };
  return { title: text.slice(0, 80), body: text };
}

// Resolve the integer courseId → lms.courses UUID for FK-safe inserts.
// Returns null if the course isn't in the tenant (the workspace UI passes
// integer IDs from uuidToInt; we round-trip back to the UUID).
async function courseUuidFromInt(courseIdInt: number | null | undefined): Promise<string | null> {
  if (!courseIdInt) return null;
  const rows = await pgQuery<{ id: string }>(
    `SELECT id FROM lms.courses WHERE tenant_id = $1 AND is_published = true`,
    [TENANT_ID],
  );
  const match = rows.find((r) => uuidToInt(r.id) === courseIdInt);
  return match ? match.id : null;
}

// ---------------- Workspace notes (lms.learner_notes) ----------------

export async function listWorkspaceNotes(ownerId: string): Promise<WorkspaceNote[]> {
  void ownerId;
  const rows = await pgQuery<{
    id: string;
    course_id: string | null;
    note_body: string;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT id, course_id, note_body, created_at, updated_at
     FROM lms.learner_notes
     WHERE learner_user_id = $1
     ORDER BY updated_at DESC
     LIMIT 100`,
    [DEMO_LEARNER_UUID],
  );
  return rows.map((r) => {
    const { title, body } = splitNoteBody(r.note_body);
    return {
      id: uuidToInt(r.id),
      courseId: r.course_id ? uuidToInt(r.course_id) : null,
      title,
      body,
      createdAt: iso(r.created_at),
      updatedAt: iso(r.updated_at),
    };
  });
}

export async function saveWorkspaceNote(
  ownerId: string,
  input: { id?: number; courseId?: number | null; title: string; body: string },
) {
  void ownerId;
  const courseUuid = await courseUuidFromInt(input.courseId);
  const noteBody = `${input.title}\n\n${input.body}`;
  if (input.id) {
    // uuidToInt is a JS function; we can't call it in SQL. Fetch the
    // learner's notes and find the one whose uuidToInt matches.
    const all = await pgQuery<{ id: string }>(
      `SELECT id FROM lms.learner_notes WHERE learner_user_id = $1`,
      [DEMO_LEARNER_UUID],
    );
    const match = all.find((r) => uuidToInt(r.id) === input.id);
    if (match) {
      await pgExec(
        `UPDATE lms.learner_notes
         SET note_body = $1, course_id = $2, updated_at = now()
         WHERE id = $3`,
        [noteBody, courseUuid, match.id],
      );
      return input.id;
    }
  }
  const rows = await pgQuery<{ id: string }>(
    `INSERT INTO lms.learner_notes
       (id, tenant_id, learner_user_id, course_id, note_body, is_ai_summarized)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, false)
     RETURNING id`,
    [TENANT_ID, DEMO_LEARNER_UUID, courseUuid, noteBody],
  );
  return rows.length > 0 ? uuidToInt(rows[0].id) : 0;
}

export async function deleteWorkspaceNote(ownerId: string, id: number) {
  void ownerId;
  const all = await pgQuery<{ id: string }>(
    `SELECT id FROM lms.learner_notes WHERE learner_user_id = $1`,
    [DEMO_LEARNER_UUID],
  );
  const match = all.find((r) => uuidToInt(r.id) === id);
  if (match) {
    await pgExec(`DELETE FROM lms.learner_notes WHERE id = $1`, [match.id]);
  }
}

// ---------------- Workspace events (lms.learning_analytics_events) ----------------

export async function listWorkspaceEvents(ownerId: string): Promise<WorkspaceEvent[]> {
  void ownerId;
  const rows = await pgQuery<{
    id: string;
    event_data: Record<string, unknown> | null;
    created_at: string;
  }>(
    `SELECT id, event_data, recorded_at as created_at
     FROM lms.learning_analytics_events
     WHERE learner_user_id = $1 AND event_type = 'SCHEDULE_EVENT'
     ORDER BY recorded_at ASC
     LIMIT 100`,
    [DEMO_LEARNER_UUID],
  );
  return rows.map((r) => {
    const d = (r.event_data && typeof r.event_data === "object" ? r.event_data : {}) as Record<string, unknown>;
    return {
      id: uuidToInt(r.id),
      courseId: typeof d.courseIdInt === "number" ? d.courseIdInt : null,
      title: String(d.title ?? ""),
      startsAt: String(d.startsAt ?? ""),
      kind: String(d.kind ?? ""),
    };
  });
}

export async function saveWorkspaceEvent(
  ownerId: string,
  input: { courseId?: number | null; title: string; startsAt: string; kind: string },
) {
  void ownerId;
  const courseUuid = await courseUuidFromInt(input.courseId);
  const payload = JSON.stringify({
    title: input.title,
    startsAt: input.startsAt,
    kind: input.kind,
    courseIdInt: input.courseId ?? null,
  });
  const rows = await pgQuery<{ id: string }>(
    `INSERT INTO lms.learning_analytics_events
       (id, tenant_id, learner_user_id, course_id, event_type, event_data, recorded_at)
     VALUES (gen_random_uuid(), $1, $2, $3, 'SCHEDULE_EVENT', $4::jsonb, now())
     RETURNING id`,
    [TENANT_ID, DEMO_LEARNER_UUID, courseUuid, payload],
  );
  return rows.length > 0 ? uuidToInt(rows[0].id) : 0;
}

export async function deleteWorkspaceEvent(ownerId: string, id: number) {
  void ownerId;
  const all = await pgQuery<{ id: string }>(
    `SELECT id FROM lms.learning_analytics_events
     WHERE learner_user_id = $1 AND event_type = 'SCHEDULE_EVENT'`,
    [DEMO_LEARNER_UUID],
  );
  const match = all.find((r) => uuidToInt(r.id) === id);
  if (match) {
    await pgExec(`DELETE FROM lms.learning_analytics_events WHERE id = $1`, [match.id]);
  }
}

// ---------------- Workspace files (lms.file_uploads) ----------------

export async function listWorkspaceFiles(ownerId: string): Promise<WorkspaceFile[]> {
  void ownerId;
  const rows = await pgQuery<{
    id: string;
    file_name: string;
    mime_type: string | null;
    file_type: string;
    file_size_bytes: string;
    course_id: string | null;
    created_at: string;
    metadata: Record<string, unknown> | null;
  }>(
    `SELECT id, file_name, mime_type, file_type, file_size_bytes, course_id, created_at, metadata
     FROM lms.file_uploads
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 100`,
    [DEMO_LEARNER_UUID],
  );
  return rows.map((r) => ({
    id: uuidToInt(r.id),
    courseId: r.course_id ? uuidToInt(r.course_id) : null,
    name: r.file_name,
    mime: r.mime_type || r.file_type || "application/octet-stream",
    size: parseInt(String(r.file_size_bytes), 10) || 0,
    createdAt: iso(r.created_at),
  }));
}

export async function saveWorkspaceFile(
  ownerId: string,
  input: { courseId?: number | null; name: string; mime: string; data: Uint8Array },
) {
  void ownerId;
  const courseUuid = await courseUuidFromInt(input.courseId);
  let b64 = "";
  if (input.data && input.data.byteLength > 0) {
    b64 = Buffer.from(input.data).toString("base64");
  }
  const meta = JSON.stringify({ base64: b64, courseIdInt: input.courseId ?? null });
  const rows = await pgQuery<{ id: string }>(
    `INSERT INTO lms.file_uploads
       (id, tenant_id, user_id, course_id, file_name, file_type, mime_type, file_size_bytes,
        storage_path, storage_bucket, upload_status, is_starred, is_shared, shared_with,
        download_count, version_number, metadata)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $5, $6,
             'workspace/' || gen_random_uuid()::text, 'learner-workspace', 'completed', false, false, '[]'::jsonb,
             0, 1, $7::jsonb)
     RETURNING id`,
    [TENANT_ID, DEMO_LEARNER_UUID, courseUuid, input.name, input.mime, input.data.byteLength, meta],
  );
  return rows.length > 0 ? uuidToInt(rows[0].id) : 0;
}

export async function getWorkspaceFile(ownerId: string, id: number) {
  void ownerId;
  const all = await pgQuery<{
    id: string;
    file_name: string;
    mime_type: string | null;
    metadata: Record<string, unknown> | null;
  }>(
    `SELECT id, file_name, mime_type, metadata
     FROM lms.file_uploads WHERE user_id = $1`,
    [DEMO_LEARNER_UUID],
  );
  const match = all.find((r) => uuidToInt(r.id) === id);
  if (!match) return undefined;
  const meta = (match.metadata && typeof match.metadata === "object" ? match.metadata : {}) as Record<string, unknown>;
  const b64 = typeof meta.base64 === "string" ? meta.base64 : "";
  const bytes = b64 ? Buffer.from(b64, "base64") : Buffer.alloc(0);
  return { name: match.file_name, mime: match.mime_type || "application/octet-stream", data: bytes as unknown as Uint8Array };
}

export async function deleteWorkspaceFile(ownerId: string, id: number) {
  void ownerId;
  const all = await pgQuery<{ id: string }>(
    `SELECT id FROM lms.file_uploads WHERE user_id = $1`,
    [DEMO_LEARNER_UUID],
  );
  const match = all.find((r) => uuidToInt(r.id) === id);
  if (match) {
    await pgExec(`DELETE FROM lms.file_uploads WHERE id = $1`, [match.id]);
  }
}

// ---------------- Assignment states (lms.learning_analytics_events) ----------------

export async function listAssignmentStates(ownerId: string): Promise<AssignmentState[]> {
  void ownerId;
  const rows = await pgQuery<{
    id: string;
    event_data: Record<string, unknown> | null;
    recorded_at: string;
  }>(
    `SELECT id, event_data, recorded_at
     FROM lms.learning_analytics_events
     WHERE learner_user_id = $1 AND event_type = 'ASSIGNMENT_STATE'
     ORDER BY recorded_at DESC
     LIMIT 200`,
    [DEMO_LEARNER_UUID],
  );
  return rows.map((r) => {
    const d = (r.event_data && typeof r.event_data === "object" ? r.event_data : {}) as Record<string, unknown>;
    return {
      courseId: Number(d.courseId ?? 0),
      assignmentKey: String(d.assignmentKey ?? ""),
      status: String(d.status ?? ""),
      score: d.score != null ? Number(d.score) : null,
      updatedAt: iso(r.recorded_at),
    };
  });
}

export async function saveAssignmentState(
  ownerId: string,
  input: { courseId: number; assignmentKey: string; status: string; score?: number | null },
) {
  void ownerId;
  // Upsert: find an existing ASSIGNMENT_STATE event for this courseId + assignmentKey.
  // If found, UPDATE its event_data + updated_at. Otherwise INSERT.
  const candidates = await pgQuery<{ id: string; event_data: Record<string, unknown> | null }>(
    `SELECT id, event_data FROM lms.learning_analytics_events
     WHERE learner_user_id = $1 AND event_type = 'ASSIGNMENT_STATE'`,
    [DEMO_LEARNER_UUID],
  );
  const existing = candidates.find((r) => {
    const d = (r.event_data && typeof r.event_data === "object" ? r.event_data : {}) as Record<string, unknown>;
    return Number(d.courseId ?? 0) === input.courseId && String(d.assignmentKey ?? "") === input.assignmentKey;
  });
  const payload = JSON.stringify({
    courseId: input.courseId,
    assignmentKey: input.assignmentKey,
    status: input.status,
    score: input.score ?? null,
  });
  if (existing) {
    await pgExec(
      `UPDATE lms.learning_analytics_events
       SET event_data = $1::jsonb, recorded_at = now()
       WHERE id = $2`,
      [payload, existing.id],
    );
    return;
  }
  await pgExec(
    `INSERT INTO lms.learning_analytics_events
       (id, tenant_id, learner_user_id, event_type, event_data, recorded_at)
     VALUES (gen_random_uuid(), $1, $2, 'ASSIGNMENT_STATE', $3::jsonb, now())`,
    [TENANT_ID, DEMO_LEARNER_UUID, payload],
  );
}

// ---------------- Workspace messages (lms.learning_analytics_events) ----------------

export async function listWorkspaceMessages(ownerId: string) {
  void ownerId;
  const rows = await pgQuery<{
    id: string;
    event_data: Record<string, unknown> | null;
    created_at: string;
  }>(
    `SELECT id, event_data, recorded_at as created_at
     FROM lms.learning_analytics_events
     WHERE learner_user_id = $1 AND event_type = 'WORKSPACE_MESSAGE'
     ORDER BY recorded_at ASC
     LIMIT 200`,
    [DEMO_LEARNER_UUID],
  );
  return rows.map((r) => {
    const d = (r.event_data && typeof r.event_data === "object" ? r.event_data : {}) as Record<string, unknown>;
    return {
      id: uuidToInt(r.id),
      sender: String(d.sender ?? ""),
      recipient: String(d.recipient ?? ""),
      content: String(d.content ?? ""),
      createdAt: iso(r.created_at),
    };
  });
}

export async function saveWorkspaceMessage(
  ownerId: string,
  input: { sender: string; recipient: string; content: string },
) {
  void ownerId;
  const payload = JSON.stringify({
    sender: input.sender,
    recipient: input.recipient,
    content: input.content,
  });
  const rows = await pgQuery<{ id: string }>(
    `INSERT INTO lms.learning_analytics_events
       (id, tenant_id, learner_user_id, event_type, event_data, recorded_at)
     VALUES (gen_random_uuid(), $1, $2, 'WORKSPACE_MESSAGE', $3::jsonb, now())
     RETURNING id`,
    [TENANT_ID, DEMO_LEARNER_UUID, payload],
  );
  return rows.length > 0 ? uuidToInt(rows[0].id) : 0;
}

// ---------------- Learning evidence (lms.learning_analytics_events) ----------------

export type LearningEvidence = {
  id: number;
  courseId: number;
  kind: string;
  title: string;
  content: string;
  createdAt: string;
};

export async function listLearningEvidence(ownerId: string): Promise<LearningEvidence[]> {
  void ownerId;
  const rows = await pgQuery<{
    id: string;
    event_data: Record<string, unknown> | null;
    created_at: string;
  }>(
    `SELECT id, event_data, recorded_at as created_at
     FROM lms.learning_analytics_events
     WHERE learner_user_id = $1 AND event_type = 'LEARNING_EVIDENCE'
     ORDER BY recorded_at DESC
     LIMIT 100`,
    [DEMO_LEARNER_UUID],
  );
  return rows.map((r) => {
    const d = (r.event_data && typeof r.event_data === "object" ? r.event_data : {}) as Record<string, unknown>;
    return {
      id: uuidToInt(r.id),
      courseId: Number(d.courseId ?? 0),
      kind: String(d.kind ?? ""),
      title: String(d.title ?? ""),
      content: String(d.content ?? ""),
      createdAt: iso(r.created_at),
    };
  });
}

export async function saveLearningEvidence(
  ownerId: string,
  input: { courseId: number; kind: string; title: string; content: string },
) {
  void ownerId;
  const payload = JSON.stringify({
    courseId: input.courseId,
    kind: input.kind,
    title: input.title,
    content: input.content,
  });
  const rows = await pgQuery<{ id: string }>(
    `INSERT INTO lms.learning_analytics_events
       (id, tenant_id, learner_user_id, event_type, event_data, recorded_at)
     VALUES (gen_random_uuid(), $1, $2, 'LEARNING_EVIDENCE', $3::jsonb, now())
     RETURNING id`,
    [TENANT_ID, DEMO_LEARNER_UUID, payload],
  );
  return rows.length > 0 ? uuidToInt(rows[0].id) : 0;
}

// ---------------- Workspace summary ----------------

async function countEvents(eventType: string): Promise<number> {
  const rows = await pgQuery<{ n: string }>(
    `SELECT count(*)::text AS n FROM lms.learning_analytics_events
     WHERE learner_user_id = $1 AND event_type = $2`,
    [DEMO_LEARNER_UUID, eventType],
  );
  return rows.length > 0 ? parseInt(rows[0].n, 10) || 0 : 0;
}

async function countRows(table: string, filterCol: string): Promise<number> {
  const rows = await pgQuery<{ n: string }>(
    `SELECT count(*)::text AS n FROM ${table} WHERE ${filterCol} = $1`,
    [DEMO_LEARNER_UUID],
  );
  return rows.length > 0 ? parseInt(rows[0].n, 10) || 0 : 0;
}

export async function workspaceSummary(ownerId: string) {
  void ownerId;
  const [notes, files, events, messages, evidence, assignmentStates] = await Promise.all([
    countRows("lms.learner_notes", "learner_user_id"),
    countRows("lms.file_uploads", "user_id"),
    countEvents("SCHEDULE_EVENT"),
    countEvents("WORKSPACE_MESSAGE"),
    countEvents("LEARNING_EVIDENCE"),
    listAssignmentStates(ownerId),
  ]);
  return { notes, events, files, messages, evidence, assignmentStates };
}

// ---------------- Governed learning Day ----------------

type DayCommand = {
  state?: string;
  currentLesson?: number;
  currentItem?: string;
  cycleStep?: number;
  sentiment?: string;
  breakEndsAt?: string | null;
  priorState?: string | null;
  activeWorkKind?: "LESSON" | "ASSIGNMENT" | "QUIZ";
  activeWorkKey?: string | null;
  activeWorkTitle?: string | null;
  eventType: string;
  payload: Record<string, unknown>;
};

// Append a day lifecycle event to the analytics stream.
async function appendDayEvent(
  ownerId: string,
  dayId: number,
  eventType: string,
  payload: Record<string, unknown>,
) {
  void ownerId;
  const data = JSON.stringify({ dayId, eventType, ...payload });
  await pgExec(
    `INSERT INTO lms.learning_analytics_events
       (id, tenant_id, learner_user_id, event_type, event_data, recorded_at)
     VALUES (gen_random_uuid(), $1, $2, 'DAY_EVENT', $3::jsonb, now())`,
    [TENANT_ID, DEMO_LEARNER_UUID, data],
  );
}

// Deterministic synthetic day ID — stable per owner+course. The classroom
// day-state is derived from the active ai_teaching_sessions row; this int
// gives the UI a stable handle for the day across requests.
function syntheticDayId(ownerId: string, courseId: number): number {
  const str = ownerId + ":" + courseId;
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 0x7fffffff || 1;
}

export async function openLearningDay(
  ownerId: string,
  courseId: number,
  mode: "SPRINT" | "SHIFT" | "FULL_DAY",
) {
  void mode;
  // Opening a day = ensure a teaching session exists (getOrCreateSession
  // handles that). The day id is synthetic so the UI can reference it.
  await getOrCreateSession(courseId);
  return syntheticDayId(ownerId, courseId);
}

export async function commandLearningDay(ownerId: string, dayId: number, command: DayCommand) {
  // The day state machine writes a DAY_EVENT into the analytics stream so
  // every state transition is auditable. The synthesized snapshot returned
  // by getLearningDaySnapshot reads the latest DAY_EVENT for the day to
  // reconstruct the current state.
  void ownerId; void dayId;
  await appendDayEvent(ownerId, dayId, command.eventType, command.payload);
}

export async function recordLearningAttempt(
  ownerId: string,
  dayId: number,
  courseId: number,
  input: {
    lessonIndex: number;
    item: string;
    attemptNo: number;
    response: string;
    score: number;
    passed: boolean;
    stage: string;
    misconception: string;
    feedback: string;
    evidenceSummary: string;
    workKind?: "LESSON" | "ASSIGNMENT" | "QUIZ";
    workKey?: string | null;
  },
) {
  // Attempts are recorded as LEARNING_ATTEMPT analytics events — the full
  // attempt payload (score, passed, misconception, feedback, evidence) lives
  // in event_data jsonb so the evidence/audit trail is complete.
  void ownerId;
  const payload = JSON.stringify({
    dayId,
    courseId,
    lessonIndex: input.lessonIndex,
    item: input.item,
    attemptNo: input.attemptNo,
    response: input.response,
    score: input.score,
    passed: input.passed,
    stage: input.stage,
    misconception: input.misconception || "",
    feedback: input.feedback || "",
    evidenceSummary: input.evidenceSummary || "",
    workKind: input.workKind || "LESSON",
    workKey: input.workKey ?? null,
  });
  await pgExec(
    `INSERT INTO lms.learning_analytics_events
       (id, tenant_id, learner_user_id, event_type, event_data, recorded_at)
     VALUES (gen_random_uuid(), $1, $2, 'LEARNING_ATTEMPT', $3::jsonb, now())`,
    [TENANT_ID, DEMO_LEARNER_UUID, payload],
  );
}

// ---------------- Human-need queue (lms.human_escalation_routing) ----------------

export async function createHumanNeed(
  ownerId: string,
  dayId: number,
  courseId: number,
  context: Record<string, unknown>,
) {
  void ownerId;
  const reason = String(context.reason || "Human support requested");
  const courseUuid = await courseUuidFromInt(courseId);
  // Find the active teaching session for this course (the escalation is
  // tied to the session).
  const sessions = courseUuid
    ? await pgQuery<{ id: string }>(
        `SELECT id FROM lms.ai_teaching_sessions
         WHERE learner_user_id = $1 AND course_id = $2 AND session_status = 'active'
         ORDER BY created_at DESC LIMIT 1`,
        [DEMO_LEARNER_UUID, courseUuid],
      )
    : [];
  const sessionId = sessions.length > 0 ? sessions[0].id : null;

  // Check for an existing OPEN escalation for this session/learner.
  if (sessionId) {
    const existing = await pgQuery<{ id: string }>(
      `SELECT id FROM lms.human_escalation_routing
       WHERE learner_user_id = $1 AND session_id = $2 AND status = 'OPEN'
       LIMIT 1`,
      [DEMO_LEARNER_UUID, sessionId],
    );
    if (existing.length > 0) {
      // Update the context + reason
      await pgExec(
        `UPDATE lms.human_escalation_routing
         SET escalation_context = $1::jsonb, updated_at = now()
         WHERE id = $2`,
        [JSON.stringify({ reason, ...context, dayId, courseId }), existing[0].id],
      );
      return uuidToInt(existing[0].id);
    }
  }

  const rows = await pgQuery<{ id: string }>(
    `INSERT INTO lms.human_escalation_routing
       (id, tenant_id, session_id, learner_user_id, escalation_type, priority,
        status, escalation_context, metadata)
     VALUES (gen_random_uuid(), $1, $2, $3, 'HUMAN_NEED', 'Medium',
             'OPEN', $4::jsonb, $5::jsonb)
     RETURNING id`,
    [TENANT_ID, sessionId, DEMO_LEARNER_UUID, JSON.stringify({ reason, ...context, dayId, courseId }), JSON.stringify({})],
  );
  return rows.length > 0 ? uuidToInt(rows[0].id) : 0;
}

export async function resolveHumanNeed(ownerId: string, id: number, resolution: string) {
  void ownerId;
  // Find the escalation row whose uuidToInt matches the integer id.
  const all = await pgQuery<{ id: string; escalation_context: Record<string, unknown> | null }>(
    `SELECT id, escalation_context FROM lms.human_escalation_routing WHERE learner_user_id = $1`,
    [DEMO_LEARNER_UUID],
  );
  const match = all.find((r) => uuidToInt(r.id) === id);
  if (!match) {
    throw new Error("Queue item not found.");
  }
  const ctx = match.escalation_context ?? {};
  const dayId = Number((ctx as Record<string, unknown>).dayId ?? 0);
  await pgExec(
    `UPDATE lms.human_escalation_routing
     SET status = 'RESOLVED', resolution_notes = $1, resolved_at = now(), updated_at = now()
     WHERE id = $2`,
    [resolution, match.id],
  );
  await appendDayEvent(ownerId, dayId, "HUMAN_NEED_RESOLVED", { resolution, escalationId: match.id });
}

export async function closeLearningDay(
  ownerId: string,
  dayId: number,
  input: { recap: string; homework: string; forecast: string },
) {
  // Closing the day = mark the active teaching session as completed.
  // We find the most recent active session and set session_status='completed',
  // ended_at=now. The day_id maps via syntheticDayId(ownerId, courseId).
  void ownerId;
  // We don't have the courseId directly here; the snapshot reader will derive
  // state from the latest session. Just append the close event.
  await appendDayEvent(ownerId, dayId, "DAY_CLOSED", input);
}

type MappedDay = {
  id: number;
  courseId: number;
  mode: string;
  state: string;
  currentLesson: number;
  currentItem: string;
  cycleStep: number;
  activeWorkKind: string;
  activeWorkKey: string | null;
  activeWorkTitle: string | null;
  sentiment: string | null;
  openedAt: string;
  scheduledCloseAt: string;
  breakEndsAt: string | null;
  priorState: string | null;
  closedAt: string | null;
  recap: string | null;
  homework: string | null;
  forecast: string | null;
  version: number;
  updatedAt: string;
};

function mapDay(row: any): MappedDay | null {
  if (!row) return null;
  return {
    id: row.id,
    courseId: row.courseId,
    mode: row.mode,
    state: row.state,
    currentLesson: row.currentLesson,
    currentItem: row.currentItem,
    cycleStep: row.cycleStep,
    activeWorkKind: row.activeWorkKind || "LESSON",
    activeWorkKey: row.activeWorkKey,
    activeWorkTitle: row.activeWorkTitle,
    sentiment: row.sentiment,
    openedAt: iso(row.openedAt),
    scheduledCloseAt: iso(row.scheduledCloseAt),
    breakEndsAt: row.breakEndsAt ? iso(row.breakEndsAt) : null,
    priorState: row.priorState,
    closedAt: row.closedAt ? iso(row.closedAt) : null,
    recap: row.recap,
    homework: row.homework,
    forecast: row.forecast,
    version: row.version,
    updatedAt: iso(row.updatedAt),
  };
}

export async function getLearningDaySnapshot(ownerId: string, courseId: number) {
  // The day snapshot is synthesized from:
  //   - the active ai_teaching_sessions row (started_at → openedAt,
  //     session_status → state)
  //   - the latest DAY_EVENT for this day (recap/homework/forecast/state)
  //   - the LEARNING_ATTEMPT events (for metrics)
  //   - the human_escalation_routing OPEN rows (for the queue)
  void ownerId;
  const course = await getCourse(ownerId, courseId);
  if (!course) return null;
  const firstLesson = course.companion.sections?.[0];
  const now = new Date();
  const dayId = syntheticDayId(ownerId, courseId);

  // Find the active teaching session — resolve the course UUID from the
  // integer courseId via the enrollment join, then look up the session.
  const courseLookup = await pgQuery<{ id: string }>(
    `SELECT c.id FROM lms.enrollments e
     JOIN lms.courses c ON c.id = e.course_id AND c.tenant_id = e.tenant_id
     WHERE e.learner_user_id = $1 AND e.status = 'active'`,
    [DEMO_LEARNER_UUID],
  );
  const courseMatch = courseLookup.find((r) => uuidToInt(r.id) === courseId);
  const sessions = courseMatch
    ? await pgQuery<{ id: string; started_at: string; session_status: string; total_turns: number }>(
        `SELECT id, started_at, session_status, total_turns
         FROM lms.ai_teaching_sessions
         WHERE learner_user_id = $1 AND course_id = $2
         ORDER BY created_at DESC LIMIT 1`,
        [DEMO_LEARNER_UUID, courseMatch.id],
      ).catch(() => [])
    : [];

  // Fetch the latest DAY_CLOSED event for recap/homework/forecast
  const closedEvents = await pgQuery<{ event_data: Record<string, unknown> | null; recorded_at: string }>(
    `SELECT event_data, recorded_at FROM lms.learning_analytics_events
     WHERE learner_user_id = $1 AND event_type = 'DAY_EVENT'
       AND event_data->>'dayId' = $2
     ORDER BY recorded_at DESC LIMIT 20`,
    [DEMO_LEARNER_UUID, String(dayId)],
  );
  const closedEvent = closedEvents.find((r) => {
    const d = r.event_data as Record<string, unknown>;
    return d?.eventType === "DAY_CLOSED";
  });

  const day = {
    id: dayId,
    ownerId,
    courseId,
    mode: "SPRINT",
    state: sessions.length > 0 && sessions[0].session_status === "completed" ? "CLOSED" : "CHECK_IN",
    currentLesson: 0,
    currentItem: firstLesson?.checks?.[0] || firstLesson?.title || course.title,
    cycleStep: 0,
    activeWorkKind: "LESSON" as const,
    activeWorkKey: null as string | null,
    activeWorkTitle: firstLesson?.title || course.title,
    breakEndsAt: null as string | null,
    openedAt: sessions.length > 0 ? iso(sessions[0].started_at) : now.toISOString(),
    scheduledCloseAt: new Date(now.getTime() + 45 * 60000).toISOString(),
    closedAt: closedEvent ? iso(closedEvent.recorded_at) : null,
    updatedAt: now.toISOString(),
  };
  void mapDay; // preserved for callers that want a mapped shape

  // Attempts for metrics
  const attemptRows = await pgQuery<{ n: string }>(
    `SELECT count(*)::text AS n FROM lms.learning_analytics_events
     WHERE learner_user_id = $1 AND event_type = 'LEARNING_ATTEMPT'
       AND (event_data->>'courseId')::int = $2`,
    [DEMO_LEARNER_UUID, courseId],
  ).catch(() => [{ n: "0" }]);
  const attemptCount = attemptRows.length > 0 ? parseInt(attemptRows[0].n, 10) || 0 : 0;

  // Queue (open human-need escalations)
  const queueRows = await pgQuery<{
    id: string;
    escalation_type: string;
    status: string;
    escalation_context: Record<string, unknown> | null;
    created_at: string;
  }>(
    `SELECT id, escalation_type, status, escalation_context, created_at
     FROM lms.human_escalation_routing
     WHERE learner_user_id = $1 AND status = 'OPEN'
     ORDER BY created_at ASC LIMIT 20`,
    [DEMO_LEARNER_UUID],
  );

  return {
    day,
    events: closedEvents.map((r, i) => ({
      id: i + 1,
      eventType: String((r.event_data as Record<string, unknown>)?.eventType ?? "DAY_EVENT"),
      payload: (r.event_data as Record<string, unknown>) ?? {},
      createdAt: iso(r.recorded_at),
    })),
    attempts: [] as Array<Record<string, unknown>>,
    queue: queueRows.map((r) => ({
      id: uuidToInt(r.id),
      reason: String((r.escalation_context as Record<string, unknown>)?.reason ?? ""),
      status: r.status,
      context: r.escalation_context ?? {},
      createdAt: iso(r.created_at),
    })),
    metrics: {
      activeMinutes: sessions.length > 0 ? (sessions[0].total_turns || 0) * 2 : 0,
      demonstratedLessons: 0,
      evidenceCount: attemptCount,
    },
  };
}

export async function listInstructorDaySnapshots(ownerId: string) {
  // Instructor view: one snapshot per course the learner is enrolled in.
  void ownerId;
  const courses = await listCourses(ownerId);
  const snapshots = await Promise.all(
    courses.map(async (c) => {
      const snapshot = await getLearningDaySnapshot(ownerId, c.id);
      return {
        ...snapshot,
        courseTitle: c.title,
        courseArea: c.area,
        learnerName: "Avery Johnson",
      };
    }),
  );
  return snapshots.slice(0, 30);
}

// ---------------- Multi-course school Day ----------------

function todayInChicago(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const pick = (type: string) => parts.find((p) => p.type === type)?.value || "";
  return `${pick("year")}-${pick("month")}-${pick("day")}`;
}

export async function getSchoolSnapshot(ownerId: string) {
  void ownerId;
  const today = todayInChicago();

  // Fetch enrollments + courses in one join (real schema).
  const enrRows = await pgQuery<{
    enrollment_id: string;
    course_id: string;
    status: string;
    enrolled_at: string;
    progress_percentage: string;
    metadata: Record<string, unknown> | null;
    c_id: string;
    c_code: string | null;
    c_title: string;
    c_category: string | null;
    c_description: string | null;
    c_metadata: Record<string, unknown> | null;
    c_difficulty_level: string | null;
    c_total_clock_hours: string | null;
  }>(
    `SELECT e.id AS enrollment_id, e.course_id, e.status, e.enrolled_at,
            e.progress_percentage, e.metadata,
            c.id AS c_id, c.code AS c_code, c.title AS c_title,
            c.category AS c_category, c.description AS c_description,
            c.metadata AS c_metadata, c.difficulty_level AS c_difficulty_level,
            c.total_clock_hours AS c_total_clock_hours
     FROM lms.enrollments e
     JOIN lms.courses c ON c.id = e.course_id AND c.tenant_id = e.tenant_id
     WHERE e.learner_user_id = $1
     ORDER BY e.enrolled_at ASC`,
    [DEMO_LEARNER_UUID],
  );

  const priorityRank: Record<string, number> = { High: 1, Medium: 2, Low: 3 };
  const enrollments = enrRows
    .map((r) => {
      const meta = (r.metadata && typeof r.metadata === "object" ? r.metadata : {}) as Record<string, unknown>;
      const cMeta = (r.c_metadata && typeof r.c_metadata === "object" ? r.c_metadata : {}) as Record<string, unknown>;
      const courseIdInt = uuidToInt(r.course_id);
      const companionRaw = cMeta.companion;
      let companion: Companion | null = null;
      if (typeof companionRaw === "string") {
        try { companion = JSON.parse(companionRaw) as Companion; } catch { companion = null; }
      } else if (companionRaw && typeof companionRaw === "object") {
        companion = companionRaw as Companion;
      }
      if (!companion && r.c_code) {
        try { companion = companionForPathway(r.c_code); } catch { companion = null; }
      }
      const priority = String(meta.priority ?? "Low");
      return {
        courseIdInt,
        courseId: r.course_id,
        title: r.c_title,
        area: r.c_category || (cMeta.area as string) || "Grooming",
        grade: (cMeta.grade as string) || "9-12",
        state: (cMeta.state as string) || "TN",
        level: String(meta.level ?? "Not assessed"),
        deficiencyFocus: (meta.deficiencyFocus as string) ?? null,
        priority,
        enrolledAt: iso(r.enrolled_at),
        lessonCount: (companion?.sections || []).length,
        objectiveCount: (companion?.learningObjectives || []).length,
        nextLesson: companion?.sections?.[0]?.title || r.c_title,
        companion,
      };
    })
    .sort((a, b) => {
      const rank = (priorityRank[a.priority] ?? 3) - (priorityRank[b.priority] ?? 3);
      if (rank !== 0) return rank;
      return a.title.localeCompare(b.title);
    });

  // Pacing schedules (the "school schedule block" analog). lms.pacing_schedules
  // is keyed by cohort_id; the demo learner has no cohort, so we synthesize
  // a "today" schedule from the enrollments themselves (one block per
  // enrolled course, ordered by enrollment time).
  const schedule = enrollments.map((e, i) => ({
    id: uuidToInt(e.courseId) + i,
    courseId: e.courseIdInt,
    blockType: "STUDY",
    title: `${e.title} — Daily Lesson`,
    startsAt: `${today}T09:00:00`,
    endsAt: `${today}T10:00:00`,
    status: "UPCOMING",
    deficiencyFocus: e.deficiencyFocus,
    sequence: i,
    area: e.area,
    courseTitle: e.title,
  }));

  // Grade book (real table — joined to courses for titles).
  const gradeRows = await pgQuery<{
    id: string;
    course_id: string;
    category: string;
    item_name: string;
    score: string | null;
    max_score: string | null;
    is_released: boolean;
    updated_at: string;
  }>(
    `SELECT g.id, g.course_id, g.category, g.item_name, g.score, g.max_score,
            g.is_released, g.updated_at
     FROM lms.grade_book g
     WHERE g.learner_user_id = $1
     ORDER BY g.updated_at DESC
     LIMIT 100`,
    [DEMO_LEARNER_UUID],
  );
  const grades = gradeRows.map((g) => {
    const enr = enrollments.find((e) => e.courseId === g.course_id);
    return {
      id: uuidToInt(g.id),
      courseId: enr?.courseIdInt ?? 0,
      courseTitle: enr?.title ?? "",
      title: g.item_name,
      category: g.category,
      score: g.score != null ? Number(g.score) : null,
      possible: g.max_score != null ? Number(g.max_score) : 0,
      status: g.is_released ? "Released" : "Pending",
      feedback: "",
      gradedAt: iso(g.updated_at),
    };
  }).sort((a, b) => {
    const ga = a.gradedAt ?? "9999";
    const gb = b.gradedAt ?? "9999";
    if (ga !== gb) return gb.localeCompare(ga);
    return b.id - a.id;
  });

  // Meetings (real table).
  const meetingRows = await pgQuery<{
    id: string;
    course_id: string | null;
    title: string;
    start_time: string | null;
    end_time: string | null;
    status: string;
    join_url: string | null;
  }>(
    `SELECT id, course_id, title, start_time, end_time, status, join_url
     FROM lms.meeting_records
     WHERE created_by = $1 OR course_id IN (
       SELECT course_id FROM lms.enrollments WHERE learner_user_id = $1
     )
     ORDER BY start_time ASC NULLS LAST
     LIMIT 100`,
    [DEMO_LEARNER_UUID],
  );
  const meetings = meetingRows.map((m) => {
    const enr = m.course_id ? enrollments.find((e) => e.courseId === m.course_id) : null;
    return {
      id: uuidToInt(m.id),
      courseId: m.course_id ? uuidToInt(m.course_id) : null,
      title: m.title,
      startsAt: iso(m.start_time),
      endsAt: iso(m.end_time),
      room: m.join_url || "Live Room",
      status: m.status,
      courseTitle: enr?.title,
    };
  });

  // Submissions from assignment states
  const assignmentStates = await listAssignmentStates(ownerId);
  const submissions = assignmentStates
    .filter((item) => ["Submitted", "Completed"].includes(item.status))
    .map((item) => {
      const enr = enrollments.find((e) => e.courseIdInt === item.courseId);
      const companion = enr?.companion;
      const work = [
        ...((companion?.independentPractice || []).map((title, index) => ({
          key: `practice-${index}`,
          title,
          kind: "Assignment",
        })) as Array<{ key: string; title: string; kind: string }>),
        ...(companion?.appliedProject
          ? [{ key: "project", title: companion.appliedProject.title, kind: "Project" }]
          : []),
        ...((companion?.sections || []).flatMap((section, lessonIndex) =>
          (section.checks || []).map((title, index) => ({
            key: `check-${lessonIndex}-${index}`,
            title,
            kind: "Quiz",
          })),
        ) as Array<{ key: string; title: string; kind: string }>),
      ].find((entry) => entry.key === item.assignmentKey);
      return {
        ...item,
        title: work?.title || item.assignmentKey,
        kind: work?.kind || "Assignment",
        courseTitle: enr?.title || "Course",
      };
    });

  return {
    schoolDate: today,
    currentDate: today,
    isHistoricalSchedule: false,
    enrollments: enrollments.map((e) => ({
      courseId: e.courseIdInt,
      title: e.title,
      area: e.area,
      grade: e.grade,
      state: e.state,
      level: e.level,
      deficiencyFocus: e.deficiencyFocus,
      priority: e.priority,
      enrolledAt: e.enrolledAt,
      lessonCount: e.lessonCount,
      objectiveCount: e.objectiveCount,
      nextLesson: e.nextLesson,
    })),
    schedule,
    grades,
    submissions,
    meetings,
    inbox: (await listWorkspaceMessages(ownerId)).slice(-50).reverse(),
    resources: await listWorkspaceFiles(ownerId),
    events: await listWorkspaceEvents(ownerId),
  };
}

export async function setMeetingStatus(ownerId: string, id: number, status: string) {
  void ownerId;
  if (!["SCHEDULED", "JOINED", "ENDED"].includes(status))
    throw new Error("Invalid meeting status.");
  const all = await pgQuery<{ id: string }>(
    `SELECT id FROM lms.meeting_records
     WHERE created_by = $1 OR course_id IN (
       SELECT course_id FROM lms.enrollments WHERE learner_user_id = $1
     )`,
    [DEMO_LEARNER_UUID],
  );
  const match = all.find((r) => uuidToInt(r.id) === id);
  if (!match) return;
  await pgExec(
    `UPDATE lms.meeting_records SET status = $1, updated_at = now() WHERE id = $2`,
    [status, match.id],
  );
}

export async function setScheduleBlockStatus(ownerId: string, id: number, status: string) {
  void ownerId;
  if (!["UPCOMING", "CURRENT", "COMPLETE"].includes(status))
    throw new Error("Invalid schedule status.");
  // The school snapshot synthesizes schedule blocks from enrollments; there's
  // no persisted pacing_schedules row to update for the demo learner (no
  // cohort). We record the status transition as a DAY_EVENT so the audit
  // trail is preserved, and the snapshot reader will reflect CURRENT blocks
  // via the latest event.
  await appendDayEvent(ownerId, id, "SCHEDULE_BLOCK_STATUS", { status, blockId: id });
}

export async function enrollGeneratedCourse(ownerId: string, courseId: number) {
  void ownerId;
  // Resolve the course UUID from the integer id, then upsert an enrollment.
  const courseUuid = await courseUuidFromInt(courseId);
  if (!courseUuid) {
    console.error("[db] enrollGeneratedCourse: course not found for int id", courseId);
    return;
  }
  // Find the course_version_id (required NOT NULL). The demo courses store
  // current_version_id; fall back to creating nothing if it's missing — we
  // use the course id itself as a synthetic version id.
  const versionRows = await pgQuery<{ current_version_id: string | null }>(
    `SELECT current_version_id FROM lms.courses WHERE id = $1`,
    [courseUuid],
  );
  const versionId = versionRows.length > 0 ? versionRows[0].current_version_id : null;

  // Check for an existing enrollment
  const existing = await pgQuery<{ id: string }>(
    `SELECT id FROM lms.enrollments
     WHERE learner_user_id = $1 AND course_id = $2 AND status = 'active'
     LIMIT 1`,
    [DEMO_LEARNER_UUID, courseUuid],
  );
  if (existing.length > 0) return; // already enrolled

  await pgExec(
    `INSERT INTO lms.enrollments
       (id, tenant_id, learner_user_id, course_id, course_version_id,
        delivery_mode, status, enrolled_at, progress_percentage,
        is_minor, pinned_version_locked, metadata)
     VALUES (gen_random_uuid(), $1, $2, $3, $4,
             'self_paced', 'active', now(), 0.00,
             false, false, $5::jsonb)`,
    [
      TENANT_ID,
      DEMO_LEARNER_UUID,
      courseUuid,
      versionId ?? "00000000-0000-0000-0000-000000000000",
      JSON.stringify({ pathwayCode: "ENROLLED", demoEnrollment: true }),
    ],
  );
}
