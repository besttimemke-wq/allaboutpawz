// UNLEASHED classroom data access — Supabase-backed port of the original
// node:sqlite / Prisma layer. All function signatures and return shapes are
// preserved so the API routes and the classroom UI are unchanged. DateTime
// fields are surfaced as ISO strings to match the original SQLite string
// behavior the frontend expects.

import { supabase } from "./supabase";
import { pgQuery, pgExec } from "./pg";
import { companionForPathway } from "./curriculum";
import type { Companion, CourseRecord } from "./types";

function iso(value: Date | string | null | undefined): string {
  if (!value) return "";
  return typeof value === "string" ? value : value.toISOString();
}

// Convert a Supabase row (timestamps arrive as ISO strings) into the shape
// our callers expect. The LMS data layer reads from the enterprise `lms.*`
// schema (UUIDs + snake_case + tenant_id), so each helper below maps a row
// from `lms.courses` / `lms.enrollments` / etc. back to the CourseRecord /
// Companion shape the classroom UI was authored against.
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
    state: (meta.state as string) || companion?.alignment?.state || "TN",
    area: c.category || (meta.area as string) || companion?.alignment?.area || "Grooming",
    statute: (meta.statute as string) || companion?.alignment?.statute || "",
    grade: (meta.grade as string) || companion?.alignment?.grade || "9-12",
    title: c.title,
    companion: companion ?? fallback,
    model: (meta.model as string) || "gemini-1.5-flash",
    createdAt: iso(c.created_at),
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
  // catalog. The catalog (all 15 published) lives at /learn
  // via courses-data.ts; the classroom queries the learner's active
  // enrollments joined to lms.courses for the rich companion data.
  //
  // ownerId is the visitor string ("demo-avery" in this build). The lms.*
  // schema uses UUID user_ids FK'd to auth.users. Until real auth lands,
  // every classroom request maps to the seeded demo learner UUID.
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

// ---------------- Professor conversation ----------------

export async function listMessages(ownerId: string, courseId: number) {
  const { data, error } = await supabase
    .from("professorMessage")
    .select("*")
    .eq("ownerId", ownerId)
    .eq("courseId", courseId)
    .order("id", { ascending: true })
    .limit(100);
  if (error) {
    console.error("[db] listMessages failed:", error.message);
    return [];
  }
  return (data ?? []).map((m) => {
    const r = asRow<{ id: number; role: string; content: string; createdAt: string }>(m);
    return {
      id: r.id,
      role: r.role as "learner" | "professor",
      content: r.content,
      createdAt: iso(r.createdAt),
    };
  });
}

export async function saveMessage(
  ownerId: string,
  courseId: number,
  role: "learner" | "professor",
  content: string,
) {
  const { error } = await supabase.from("professorMessage").insert({
    ownerId,
    courseId,
    role,
    content,
  });
  if (error) console.error("[db] saveMessage failed:", error.message);
}

export async function listDashboardProfessorMessages(ownerId: string, lessonId: string) {
  const { data, error } = await supabase
    .from("dashboardProfessorMessage")
    .select("*")
    .eq("ownerId", ownerId)
    .eq("lessonId", lessonId)
    .order("id", { ascending: true })
    .limit(100);
  if (error) {
    console.error("[db] listDashboardProfessorMessages failed:", error.message);
    return [];
  }
  return (data ?? []).map((m) => {
    const r = asRow<{ id: number; role: string; content: string; createdAt: string }>(m);
    return {
      id: r.id,
      role: r.role as "learner" | "professor",
      content: r.content,
      createdAt: iso(r.createdAt),
    };
  });
}

export async function saveDashboardProfessorMessage(
  ownerId: string,
  lessonId: string,
  role: "learner" | "professor",
  content: string,
) {
  const { error } = await supabase.from("dashboardProfessorMessage").insert({
    ownerId,
    lessonId,
    role,
    content,
  });
  if (error) console.error("[db] saveDashboardProfessorMessage failed:", error.message);
}

// ---------------- Workspace ----------------

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

export async function listWorkspaceNotes(ownerId: string): Promise<WorkspaceNote[]> {
  const { data, error } = await supabase
    .from("learnerNote")
    .select("*")
    .eq("ownerId", ownerId)
    .order("updatedAt", { ascending: false })
    .limit(100);
  if (error) {
    console.error("[db] listWorkspaceNotes failed:", error.message);
    return [];
  }
  return (data ?? []).map((n) => {
    const r = asRow<{
      id: number;
      courseId: number | null;
      title: string;
      body: string;
      createdAt: string;
      updatedAt: string;
    }>(n);
    return {
      id: r.id,
      courseId: r.courseId,
      title: r.title,
      body: r.body,
      createdAt: iso(r.createdAt),
      updatedAt: iso(r.updatedAt),
    };
  });
}

export async function saveWorkspaceNote(
  ownerId: string,
  input: { id?: number; courseId?: number | null; title: string; body: string },
) {
  const now = new Date().toISOString();
  if (input.id) {
    const { error } = await supabase
      .from("learnerNote")
      .update({
        title: input.title,
        body: input.body,
        courseId: input.courseId ?? null,
        updatedAt: now,
      })
      .eq("ownerId", ownerId)
      .eq("id", input.id);
    if (error) console.error("[db] saveWorkspaceNote update failed:", error.message);
    return input.id;
  }
  const { data, error } = await supabase
    .from("learnerNote")
    .insert({
      ownerId,
      courseId: input.courseId ?? null,
      title: input.title,
      body: input.body,
      createdAt: now,
      updatedAt: now,
    })
    .select()
    .single();
  if (error) {
    console.error("[db] saveWorkspaceNote insert failed:", error.message);
    return 0;
  }
  const row = asRow<{ id: number }>(data);
  return row.id;
}

export async function deleteWorkspaceNote(ownerId: string, id: number) {
  const { error } = await supabase
    .from("learnerNote")
    .delete()
    .eq("ownerId", ownerId)
    .eq("id", id);
  if (error) console.error("[db] deleteWorkspaceNote failed:", error.message);
}

export async function listWorkspaceEvents(ownerId: string): Promise<WorkspaceEvent[]> {
  const { data, error } = await supabase
    .from("learnerEvent")
    .select("*")
    .eq("ownerId", ownerId)
    .order("startsAt", { ascending: true })
    .limit(100);
  if (error) {
    console.error("[db] listWorkspaceEvents failed:", error.message);
    return [];
  }
  return (data ?? []).map((e) => {
    const r = asRow<{
      id: number;
      courseId: number | null;
      title: string;
      startsAt: string;
      kind: string;
    }>(e);
    return {
      id: r.id,
      courseId: r.courseId,
      title: r.title,
      startsAt: r.startsAt,
      kind: r.kind,
    };
  });
}

export async function saveWorkspaceEvent(
  ownerId: string,
  input: { courseId?: number | null; title: string; startsAt: string; kind: string },
) {
  const { data, error } = await supabase
    .from("learnerEvent")
    .insert({
      ownerId,
      courseId: input.courseId ?? null,
      title: input.title,
      startsAt: input.startsAt,
      kind: input.kind,
      createdAt: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) {
    console.error("[db] saveWorkspaceEvent failed:", error.message);
    return 0;
  }
  const row = asRow<{ id: number }>(data);
  return row.id;
}

export async function deleteWorkspaceEvent(ownerId: string, id: number) {
  const { error } = await supabase
    .from("learnerEvent")
    .delete()
    .eq("ownerId", ownerId)
    .eq("id", id);
  if (error) console.error("[db] deleteWorkspaceEvent failed:", error.message);
}

export async function listWorkspaceFiles(ownerId: string): Promise<WorkspaceFile[]> {
  const { data, error } = await supabase
    .from("learnerFile")
    .select("id, courseId, name, mime, size, createdAt")
    .eq("ownerId", ownerId)
    .order("createdAt", { ascending: false })
    .limit(100);
  if (error) {
    console.error("[db] listWorkspaceFiles failed:", error.message);
    return [];
  }
  return (data ?? []).map((f) => {
    const r = asRow<{
      id: number;
      courseId: number | null;
      name: string;
      mime: string;
      size: number;
      createdAt: string;
    }>(f);
    return {
      id: r.id,
      courseId: r.courseId,
      name: r.name,
      mime: r.mime,
      size: r.size,
      createdAt: iso(r.createdAt),
    };
  });
}

export async function saveWorkspaceFile(
  ownerId: string,
  input: { courseId?: number | null; name: string; mime: string; data: Uint8Array },
) {
  // Store the binary as base64 in a TEXT column (supabase-js friendly).
  let b64 = "";
  if (input.data && input.data.byteLength > 0) {
    b64 = Buffer.from(input.data).toString("base64");
  }
  const { data, error } = await supabase
    .from("learnerFile")
    .insert({
      ownerId,
      courseId: input.courseId ?? null,
      name: input.name,
      mime: input.mime,
      size: input.data.byteLength,
      data: b64,
      createdAt: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) {
    console.error("[db] saveWorkspaceFile failed:", error.message);
    return 0;
  }
  const row = asRow<{ id: number }>(data);
  return row.id;
}

export async function getWorkspaceFile(ownerId: string, id: number) {
  const { data, error } = await supabase
    .from("learnerFile")
    .select("name, mime, data")
    .eq("ownerId", ownerId)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[db] getWorkspaceFile failed:", error.message);
    return undefined;
  }
  if (!data) return undefined;
  const r = asRow<{ name: string; mime: string; data: string }>(data);
  const bytes = r.data ? Buffer.from(r.data, "base64") : Buffer.alloc(0);
  return { name: r.name, mime: r.mime, data: bytes as unknown as Uint8Array };
}

export async function deleteWorkspaceFile(ownerId: string, id: number) {
  const { error } = await supabase
    .from("learnerFile")
    .delete()
    .eq("ownerId", ownerId)
    .eq("id", id);
  if (error) console.error("[db] deleteWorkspaceFile failed:", error.message);
}

export async function listAssignmentStates(ownerId: string): Promise<AssignmentState[]> {
  const { data, error } = await supabase
    .from("learnerAssignmentState")
    .select("*")
    .eq("ownerId", ownerId);
  if (error) {
    console.error("[db] listAssignmentStates failed:", error.message);
    return [];
  }
  return (data ?? []).map((a) => {
    const r = asRow<{
      courseId: number;
      assignmentKey: string;
      status: string;
      score: number | null;
      updatedAt: string;
    }>(a);
    return {
      courseId: r.courseId,
      assignmentKey: r.assignmentKey,
      status: r.status,
      score: r.score,
      updatedAt: iso(r.updatedAt),
    };
  });
}

export async function saveAssignmentState(
  ownerId: string,
  input: { courseId: number; assignmentKey: string; status: string; score?: number | null },
) {
  const now = new Date().toISOString();
  const payload = {
    ownerId,
    courseId: input.courseId,
    assignmentKey: input.assignmentKey,
    status: input.status,
    score: input.score ?? null,
    updatedAt: now,
  };
  const { error } = await supabase
    .from("learnerAssignmentState")
    .upsert(payload, { onConflict: "ownerId,courseId,assignmentKey" });
  if (error) console.error("[db] saveAssignmentState failed:", error.message);
}

export async function listWorkspaceMessages(ownerId: string) {
  const { data, error } = await supabase
    .from("learnerMessage")
    .select("*")
    .eq("ownerId", ownerId)
    .order("id", { ascending: true })
    .limit(200);
  if (error) {
    console.error("[db] listWorkspaceMessages failed:", error.message);
    return [];
  }
  return (data ?? []).map((m) => {
    const r = asRow<{
      id: number;
      sender: string;
      recipient: string;
      content: string;
      createdAt: string;
    }>(m);
    return {
      id: r.id,
      sender: r.sender,
      recipient: r.recipient,
      content: r.content,
      createdAt: iso(r.createdAt),
    };
  });
}

export async function saveWorkspaceMessage(
  ownerId: string,
  input: { sender: string; recipient: string; content: string },
) {
  const { data, error } = await supabase
    .from("learnerMessage")
    .insert({
      ownerId,
      sender: input.sender,
      recipient: input.recipient,
      content: input.content,
      createdAt: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) {
    console.error("[db] saveWorkspaceMessage failed:", error.message);
    return 0;
  }
  const row = asRow<{ id: number }>(data);
  return row.id;
}

export type LearningEvidence = {
  id: number;
  courseId: number;
  kind: string;
  title: string;
  content: string;
  createdAt: string;
};

export async function listLearningEvidence(ownerId: string): Promise<LearningEvidence[]> {
  const { data, error } = await supabase
    .from("learnerEvidence")
    .select("*")
    .eq("ownerId", ownerId)
    .order("id", { ascending: false })
    .limit(100);
  if (error) {
    console.error("[db] listLearningEvidence failed:", error.message);
    return [];
  }
  return (data ?? []).map((e) => {
    const r = asRow<{
      id: number;
      courseId: number;
      kind: string;
      title: string;
      content: string;
      createdAt: string;
    }>(e);
    return {
      id: r.id,
      courseId: r.courseId,
      kind: r.kind,
      title: r.title,
      content: r.content,
      createdAt: iso(r.createdAt),
    };
  });
}

export async function saveLearningEvidence(
  ownerId: string,
  input: { courseId: number; kind: string; title: string; content: string },
) {
  const { data, error } = await supabase
    .from("learnerEvidence")
    .insert({
      ownerId,
      courseId: input.courseId,
      kind: input.kind,
      title: input.title,
      content: input.content,
      createdAt: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) {
    console.error("[db] saveLearningEvidence failed:", error.message);
    return 0;
  }
  const row = asRow<{ id: number }>(data);
  return row.id;
}

async function countRows(table: string, ownerId: string): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("ownerId", ownerId);
  if (error) {
    console.error(`[db] count ${table} failed:`, error.message);
    return 0;
  }
  return count ?? 0;
}

export async function workspaceSummary(ownerId: string) {
  const [notes, events, files, messages, evidence, assignmentStates] = await Promise.all([
    countRows("learnerNote", ownerId),
    countRows("learnerEvent", ownerId),
    countRows("learnerFile", ownerId),
    countRows("learnerMessage", ownerId),
    countRows("learnerEvidence", ownerId),
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

async function courseFirstItem(ownerId: string, courseId: number) {
  const course = await getCourse(ownerId, courseId);
  const first = course?.companion.sections?.[0];
  return (
    first?.checks?.[0] ||
    `Explain the central idea of ${first?.title || course?.title || "this lesson"} in your own words.`
  );
}

async function appendDayEvent(
  ownerId: string,
  dayId: number,
  eventType: string,
  payload: Record<string, unknown>,
) {
  const { error } = await supabase.from("learningDayEvent").insert({
    ownerId,
    dayId,
    eventType,
    payloadJson: JSON.stringify(payload),
    createdAt: new Date().toISOString(),
  });
  if (error) console.error("[db] appendDayEvent failed:", error.message);
}

export async function openLearningDay(
  ownerId: string,
  courseId: number,
  mode: "SPRINT" | "SHIFT" | "FULL_DAY",
) {
  // Look for an open day (closedAt IS NULL) for this owner+course, newest first.
  const { data: existing, error: findErr } = await supabase
    .from("learningDay")
    .select("id")
    .eq("ownerId", ownerId)
    .eq("courseId", courseId)
    .is("closedAt", null)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (findErr) console.error("[db] openLearningDay find failed:", findErr.message);
  if (existing) {
    const r = asRow<{ id: number }>(existing);
    if (r.id) return r.id;
  }

  const duration = mode === "FULL_DAY" ? 480 : mode === "SHIFT" ? 120 : 45;
  const now = new Date();
  const item = await courseFirstItem(ownerId, courseId);
  const { data, error } = await supabase
    .from("learningDay")
    .insert({
      ownerId,
      courseId,
      mode,
      state: "CHECK_IN",
      currentLesson: 0,
      currentItem: item,
      cycleStep: 0,
      openedAt: now.toISOString(),
      scheduledCloseAt: new Date(now.getTime() + duration * 60000).toISOString(),
      updatedAt: now.toISOString(),
    })
    .select()
    .single();
  if (error) {
    console.error("[db] openLearningDay insert failed:", error.message);
    return 0;
  }
  const row = asRow<{ id: number }>(data);
  await appendDayEvent(ownerId, row.id, "DAY_OPENED", { mode, durationMinutes: duration });
  return row.id;
}

function resolveDate(next: string | null | undefined, current: string | null): string | null {
  if (next === undefined) return current;
  if (next === null) return null;
  return next;
}

export async function commandLearningDay(ownerId: string, dayId: number, command: DayCommand) {
  const { data: currentRow, error: curErr } = await supabase
    .from("learningDay")
    .select("*")
    .eq("ownerId", ownerId)
    .eq("id", dayId)
    .maybeSingle();
  if (curErr) {
    console.error("[db] commandLearningDay find failed:", curErr.message);
    throw new Error("Learning Day not found.");
  }
  if (!currentRow) throw new Error("Learning Day not found.");
  const current = asRow<{
    state: string;
    currentLesson: number;
    currentItem: string | null;
    cycleStep: number;
    sentiment: string | null;
    breakEndsAt: string | null;
    priorState: string | null;
    activeWorkKind: string | null;
    activeWorkKey: string | null;
    activeWorkTitle: string | null;
    version: number;
  }>(currentRow);

  const state = command.state ?? current.state;
  const lesson = command.currentLesson ?? current.currentLesson;
  const item = command.currentItem ?? current.currentItem;
  const cycle = command.cycleStep ?? current.cycleStep;
  const sentiment = command.sentiment ?? current.sentiment;
  const breakEnds = resolveDate(command.breakEndsAt, current.breakEndsAt);
  const prior = command.priorState === undefined ? current.priorState : command.priorState;
  const workKind = command.activeWorkKind ?? (current.activeWorkKind || "LESSON");
  const workKey = command.activeWorkKey === undefined ? current.activeWorkKey : command.activeWorkKey;
  const workTitle =
    command.activeWorkTitle === undefined ? current.activeWorkTitle : command.activeWorkTitle;

  const { error: updErr } = await supabase
    .from("learningDay")
    .update({
      state,
      currentLesson: lesson,
      currentItem: item,
      cycleStep: cycle,
      sentiment,
      breakEndsAt: breakEnds,
      priorState: prior,
      activeWorkKind: workKind,
      activeWorkKey: workKey,
      activeWorkTitle: workTitle,
      version: (current.version || 0) + 1,
      updatedAt: new Date().toISOString(),
    })
    .eq("id", dayId);
  if (updErr) console.error("[db] commandLearningDay update failed:", updErr.message);

  await appendDayEvent(ownerId, dayId, command.eventType, {
    fromState: current.state,
    toState: state,
    ...command.payload,
  });
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
  const { error } = await supabase.from("learningAttempt").insert({
    ownerId,
    dayId,
    courseId,
    lessonIndex: input.lessonIndex,
    itemText: input.item,
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
    createdAt: new Date().toISOString(),
  });
  if (error) console.error("[db] recordLearningAttempt failed:", error.message);
}

export async function createHumanNeed(
  ownerId: string,
  dayId: number,
  courseId: number,
  context: Record<string, unknown>,
) {
  const reason = String(context.reason || "Human support requested");
  const { data: existing, error: findErr } = await supabase
    .from("humanNeedQueue")
    .select("id")
    .eq("ownerId", ownerId)
    .eq("dayId", dayId)
    .eq("status", "OPEN")
    .limit(1)
    .maybeSingle();
  if (findErr) console.error("[db] createHumanNeed find failed:", findErr.message);
  if (existing) {
    const r = asRow<{ id: number }>(existing);
    if (r.id) {
      const { error: updErr } = await supabase
        .from("humanNeedQueue")
        .update({ reason, contextJson: JSON.stringify(context) })
        .eq("id", r.id);
      if (updErr) console.error("[db] createHumanNeed update failed:", updErr.message);
      return r.id;
    }
  }
  const { data, error } = await supabase
    .from("humanNeedQueue")
    .insert({
      ownerId,
      dayId,
      courseId,
      reason,
      status: "OPEN",
      contextJson: JSON.stringify(context),
      createdAt: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) {
    console.error("[db] createHumanNeed insert failed:", error.message);
    return 0;
  }
  const row = asRow<{ id: number }>(data);
  return row.id;
}

export async function resolveHumanNeed(ownerId: string, id: number, resolution: string) {
  const { data: row, error: findErr } = await supabase
    .from("humanNeedQueue")
    .select("dayId, contextJson")
    .eq("ownerId", ownerId)
    .eq("id", id)
    .maybeSingle();
  if (findErr || !row) {
    console.error("[db] resolveHumanNeed find failed:", findErr?.message || "not found");
    throw new Error("Queue item not found.");
  }
  const r = asRow<{ dayId: number; contextJson: string }>(row);
  const { error } = await supabase
    .from("humanNeedQueue")
    .update({ status: "RESOLVED", resolvedAt: new Date().toISOString() })
    .eq("id", id);
  if (error) console.error("[db] resolveHumanNeed update failed:", error.message);
  await appendDayEvent(ownerId, r.dayId, "HUMAN_NEED_RESOLVED", { resolution });
}

export async function closeLearningDay(
  ownerId: string,
  dayId: number,
  input: { recap: string; homework: string; forecast: string },
) {
  const now = new Date();
  const { error } = await supabase
    .from("learningDay")
    .update({
      state: "CLOSED",
      closedAt: now.toISOString(),
      recap: input.recap,
      homework: input.homework,
      forecast: input.forecast,
      updatedAt: now.toISOString(),
    })
    .eq("id", dayId);
  if (error) console.error("[db] closeLearningDay failed:", error.message);
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
  const { data: row, error: dayErr } = await supabase
    .from("learningDay")
    .select("*")
    .eq("ownerId", ownerId)
    .eq("courseId", courseId)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (dayErr) {
    console.error("[db] getLearningDaySnapshot find failed:", dayErr.message);
    return null;
  }
  if (!row) return null;

  const dayId = asRow<{ id: number }>(row).id;

  const [eventsResp, attemptsResp, queueResp] = await Promise.all([
    supabase
      .from("learningDayEvent")
      .select("*")
      .eq("ownerId", ownerId)
      .eq("dayId", dayId)
      .order("id", { ascending: true }),
    supabase
      .from("learningAttempt")
      .select("*")
      .eq("ownerId", ownerId)
      .eq("dayId", dayId)
      .order("id", { ascending: true }),
    supabase
      .from("humanNeedQueue")
      .select("*")
      .eq("ownerId", ownerId)
      .eq("dayId", dayId)
      .order("id", { ascending: false }),
  ]);
  if (eventsResp.error) console.error("[db] getLearningDaySnapshot events:", eventsResp.error.message);
  if (attemptsResp.error) console.error("[db] getLearningDaySnapshot attempts:", attemptsResp.error.message);
  if (queueResp.error) console.error("[db] getLearningDaySnapshot queue:", queueResp.error.message);

  const events = (eventsResp.data ?? []).map((e) => {
    const r = asRow<{ id: number; eventType: string; payloadJson: string; createdAt: string }>(e);
    return {
      id: r.id,
      eventType: r.eventType,
      payload: JSON.parse(r.payloadJson || "{}"),
      createdAt: iso(r.createdAt),
    };
  });
  const attempts = (attemptsResp.data ?? []).map((a) => {
    const r = asRow<{
      id: number;
      lessonIndex: number;
      itemText: string;
      attemptNo: number;
      response: string;
      score: number;
      passed: boolean;
      stage: string;
      misconception: string;
      feedback: string;
      evidenceSummary: string;
      workKind: string;
      workKey: string | null;
      createdAt: string;
    }>(a);
    return {
      id: r.id,
      lessonIndex: r.lessonIndex,
      item: r.itemText,
      attemptNo: r.attemptNo,
      response: r.response,
      score: r.score,
      passed: Boolean(r.passed),
      stage: r.stage,
      misconception: r.misconception,
      feedback: r.feedback,
      evidenceSummary: r.evidenceSummary,
      workKind: r.workKind,
      workKey: r.workKey,
      createdAt: iso(r.createdAt),
    };
  });
  const queue = (queueResp.data ?? []).map((q) => {
    const r = asRow<{
      id: number;
      reason: string;
      status: string;
      contextJson: string;
      createdAt: string;
      resolvedAt: string | null;
    }>(q);
    return {
      id: r.id,
      reason: r.reason,
      status: r.status,
      context: JSON.parse(r.contextJson || "{}"),
      createdAt: iso(r.createdAt),
      resolvedAt: r.resolvedAt ? iso(r.resolvedAt) : null,
    };
  });

  const passedLessons = new Set(
    attempts.filter((a) => a.passed && a.workKind === "LESSON").map((a) => a.lessonIndex),
  );
  const openedAt = new Date(iso(asRow<{ openedAt: string }>(row).openedAt)).getTime();
  const closedAtRaw = asRow<{ closedAt: string | null }>(row).closedAt;
  const endedAt = closedAtRaw ? new Date(iso(closedAtRaw)).getTime() : Date.now();
  let cursor = openedAt;
  let activeMs = 0;
  let paused = false;
  for (const event of events) {
    const at = new Date(event.createdAt).getTime();
    if (event.eventType === "BREAK_STARTED") {
      if (!paused) activeMs += Math.max(0, at - cursor);
      paused = true;
    } else if (event.eventType === "BREAK_ENDED") {
      paused = false;
      cursor = at;
    }
  }
  if (!paused) activeMs += Math.max(0, endedAt - cursor);

  return {
    day: mapDay(row),
    events,
    attempts,
    queue,
    metrics: {
      activeMinutes: Math.floor(activeMs / 60000),
      demonstratedLessons: passedLessons.size,
      evidenceCount: attempts.filter((a) => a.passed).length,
    },
  };
}

export async function listInstructorDaySnapshots(ownerId: string) {
  const { data: rows, error } = await supabase
    .from("learningDay")
    .select("id, courseId")
    .eq("ownerId", ownerId)
    .order("id", { ascending: false })
    .limit(60);
  if (error) {
    console.error("[db] listInstructorDaySnapshots failed:", error.message);
    return [];
  }
  // Keep only the latest day per course (mirrors the original GROUP BY MAX(id)).
  const seen = new Set<number>();
  const latest = (rows ?? []).filter((r) => {
    const courseId = asRow<{ courseId: number }>(r).courseId;
    if (seen.has(courseId)) return false;
    seen.add(courseId);
    return true;
  });
  // Fetch course titles for each unique course id (no FK relationship to lean
  // on for the embedded PostgREST join — we do it in JS instead).
  const courseIds = latest.map((r) => asRow<{ courseId: number }>(r).courseId);
  const courseInfoMap = new Map<number, { area: string; title: string }>();
  if (courseIds.length > 0) {
    const { data: courseRows, error: courseErr } = await supabase
      .from("course")
      .select("id, area, title")
      .in("id", courseIds);
    if (courseErr) console.error("[db] listInstructorDaySnapshots course fetch:", courseErr.message);
    for (const c of courseRows ?? []) {
      const r = asRow<{ id: number; area: string; title: string }>(c);
      courseInfoMap.set(r.id, { area: r.area, title: r.title });
    }
  }
  const snapshots = await Promise.all(
    latest.map(async (r) => {
      const courseId = asRow<{ courseId: number }>(r).courseId;
      const courseInfo = courseInfoMap.get(courseId);
      const snapshot = await getLearningDaySnapshot(ownerId, courseId);
      return {
        ...snapshot,
        courseTitle: courseInfo?.title ?? "",
        courseArea: courseInfo?.area ?? "",
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
  const today = todayInChicago();

  // Fetch enrollment rows + course rows separately (no FK constraints to
  // lean on for PostgREST embedded joins).
  const [{ data: enrollmentRows, error: enrErr }, { data: courseRowsForEnr, error: courseEnrErr }] =
    await Promise.all([
      supabase.from("courseEnrollment").select("*").eq("ownerId", ownerId),
      supabase.from("course").select("*").eq("ownerId", ownerId),
    ]);
  if (enrErr) console.error("[db] getSchoolSnapshot enrollments:", enrErr.message);
  if (courseEnrErr) console.error("[db] getSchoolSnapshot courses:", courseEnrErr.message);
  const courseMap = new Map<number, Row>();
  for (const c of courseRowsForEnr ?? []) courseMap.set(asRow<{ id: number }>(c).id, c as Row);

  const priorityRank: Record<string, number> = { High: 1, Medium: 2, Low: 3 };
  const enrollments = (enrollmentRows ?? [])
    .map((e) => {
      const r = asRow<{
        courseId: number;
        level: string;
        deficiencyFocus: string | null;
        priority: string;
        enrolledAt: string;
      }>(e);
      const course = courseMap.get(r.courseId) ?? ({} as Row);
      return { e: r, course };
    })
    .sort((a, b) => {
      const rank = (priorityRank[a.e.priority] ?? 3) - (priorityRank[b.e.priority] ?? 3);
      if (rank !== 0) return rank;
      return String(a.course.title || "").localeCompare(String(b.course.title || ""));
    });

  // Detect whether today's schedule exists.
  const { data: todayBlockRow } = await supabase
    .from("schoolScheduleBlock")
    .select("id")
    .eq("ownerId", ownerId)
    .eq("schoolDate", today)
    .limit(1)
    .maybeSingle();
  const hasTodayBlock = !!todayBlockRow;

  const { data: latestBlock } = await supabase
    .from("schoolScheduleBlock")
    .select("schoolDate")
    .eq("ownerId", ownerId)
    .order("schoolDate", { ascending: false })
    .limit(1)
    .maybeSingle();
  const latestDate = latestBlock
    ? asRow<{ schoolDate: string }>(latestBlock).schoolDate
    : today;
  const displayedDate = hasTodayBlock ? today : latestDate || today;

  const [scheduleResp, gradeResp, meetingResp] = await Promise.all([
    supabase
      .from("schoolScheduleBlock")
      .select("*")
      .eq("ownerId", ownerId)
      .eq("schoolDate", displayedDate)
      .order("sequence", { ascending: true }),
    supabase
      .from("gradebookEntry")
      .select("*")
      .eq("ownerId", ownerId),
    supabase
      .from("classroomMeeting")
      .select("*")
      .eq("ownerId", ownerId)
      .order("startsAt", { ascending: true }),
  ]);
  if (scheduleResp.error) console.error("[db] getSchoolSnapshot schedule:", scheduleResp.error.message);
  if (gradeResp.error) console.error("[db] getSchoolSnapshot grades:", gradeResp.error.message);
  if (meetingResp.error) console.error("[db] getSchoolSnapshot meetings:", meetingResp.error.message);

  const schedule = (scheduleResp.data ?? []).map((s) => {
    const r = asRow<{
      id: number;
      courseId: number | null;
      blockType: string;
      title: string;
      startsAt: string;
      endsAt: string;
      status: string;
      deficiencyFocus: string | null;
      sequence: number;
    }>(s);
    const course = r.courseId ? courseMap.get(r.courseId) : null;
    return {
      id: r.id,
      courseId: r.courseId,
      blockType: r.blockType,
      title: r.title,
      startsAt: r.startsAt,
      endsAt: r.endsAt,
      status: r.status,
      deficiencyFocus: r.deficiencyFocus,
      sequence: r.sequence,
      area: course ? asRow<{ area: string }>(course).area : undefined,
      courseTitle: course ? asRow<{ title: string }>(course).title : undefined,
    };
  });

  const grades = (gradeResp.data ?? [])
    .map((g) => {
      const r = asRow<{
        id: number;
        courseId: number;
        title: string;
        category: string;
        score: number | null;
        possible: number;
        status: string;
        feedback: string;
        gradedAt: string | null;
      }>(g);
      const course = courseMap.get(r.courseId);
      return {
        id: r.id,
        courseId: r.courseId,
        courseTitle: course ? asRow<{ title: string }>(course).title : "",
        title: r.title,
        category: r.category,
        score: r.score,
        possible: r.possible,
        status: r.status,
        feedback: r.feedback,
        gradedAt: r.gradedAt ? iso(r.gradedAt) : null,
      };
    })
    .sort((a, b) => {
      const ga = a.gradedAt ?? "9999";
      const gb = b.gradedAt ?? "9999";
      if (ga !== gb) return gb.localeCompare(ga);
      return b.id - a.id;
    });

  const meetings = (meetingResp.data ?? []).map((m) => {
    const r = asRow<{
      id: number;
      courseId: number | null;
      title: string;
      startsAt: string;
      endsAt: string;
      room: string;
      status: string;
    }>(m);
    const course = r.courseId ? courseMap.get(r.courseId) : null;
    return {
      id: r.id,
      courseId: r.courseId,
      title: r.title,
      startsAt: r.startsAt,
      endsAt: r.endsAt,
      room: r.room,
      status: r.status,
      courseTitle: course ? asRow<{ title: string }>(course).title : undefined,
    };
  });

  const assignmentStates = await listAssignmentStates(ownerId);
  const submissions = assignmentStates
    .filter((item) => ["Submitted", "Completed"].includes(item.status))
    .map((item) => {
      const enrollment = enrollments.find(
        (en) => asRow<{ id: number }>(en.course).id === item.courseId,
      );
      const companionJson = enrollment
        ? (asRow<{ companionJson: string }>(enrollment.course).companionJson || "{}")
        : "{}";
      let companion: Companion | null = null;
      try {
        companion = JSON.parse(companionJson) as Companion;
      } catch {
        companion = null;
      }
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
      const courseTitle = enrollment
        ? (asRow<{ title: string }>(enrollment.course).title || "Course")
        : "Course";
      return {
        ...item,
        title: work?.title || item.assignmentKey,
        kind: work?.kind || "Assignment",
        courseTitle,
      };
    });

  return {
    schoolDate: displayedDate,
    currentDate: today,
    isHistoricalSchedule: displayedDate !== today,
    enrollments: enrollments.map(({ e, course }) => {
      let companion: Companion | null = null;
      try {
        companion = JSON.parse(
          asRow<{ companionJson: string }>(course).companionJson || "{}",
        ) as Companion;
      } catch {
        companion = null;
      }
      const cRow = asRow<{
        id: number;
        title: string;
        area: string;
        grade: string;
        state: string;
        companionJson: string;
      }>(course);
      return {
        courseId: cRow.id,
        title: cRow.title,
        area: cRow.area,
        grade: cRow.grade,
        state: cRow.state,
        level: e.level,
        deficiencyFocus: e.deficiencyFocus,
        priority: e.priority,
        enrolledAt: iso(e.enrolledAt),
        lessonCount: (companion?.sections || []).length,
        objectiveCount: (companion?.learningObjectives || []).length,
        nextLesson: companion?.sections?.[0]?.title || cRow.title,
      };
    }),
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
  if (!["SCHEDULED", "JOINED", "ENDED"].includes(status))
    throw new Error("Invalid meeting status.");
  const { error } = await supabase
    .from("classroomMeeting")
    .update({ status })
    .eq("ownerId", ownerId)
    .eq("id", id);
  if (error) console.error("[db] setMeetingStatus failed:", error.message);
}

export async function setScheduleBlockStatus(ownerId: string, id: number, status: string) {
  if (!["UPCOMING", "CURRENT", "COMPLETE"].includes(status))
    throw new Error("Invalid schedule status.");
  if (status === "CURRENT") {
    const { data: block } = await supabase
      .from("schoolScheduleBlock")
      .select("schoolDate")
      .eq("ownerId", ownerId)
      .eq("id", id)
      .maybeSingle();
    if (block) {
      const schoolDate = asRow<{ schoolDate: string }>(block).schoolDate;
      const { error: clrErr } = await supabase
        .from("schoolScheduleBlock")
        .update({ status: "UPCOMING" })
        .eq("ownerId", ownerId)
        .eq("schoolDate", schoolDate)
        .eq("status", "CURRENT");
      if (clrErr) console.error("[db] setScheduleBlockStatus clear:", clrErr.message);
    }
  }
  const { error } = await supabase
    .from("schoolScheduleBlock")
    .update({ status })
    .eq("ownerId", ownerId)
    .eq("id", id);
  if (error) console.error("[db] setScheduleBlockStatus failed:", error.message);
}

export async function enrollGeneratedCourse(ownerId: string, courseId: number) {
  const { error } = await supabase
    .from("courseEnrollment")
    .upsert(
      {
        ownerId,
        courseId,
        level: "Not assessed",
        deficiencyFocus: null,
        priority: "Low",
        enrolledAt: new Date().toISOString(),
      },
      { onConflict: "ownerId,courseId" },
    );
  if (error) console.error("[db] enrollGeneratedCourse failed:", error.message);
}
