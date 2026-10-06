// UNLEASHED classroom data access — Prisma port of the original node:sqlite layer.
// All functions keep their original signatures/shapes so the API routes and the
// classroom UI are unchanged. DateTime fields are surfaced as ISO strings to
// match the original SQLite string behavior the frontend expects.

import { prisma } from "./prisma";
import type { Companion, CourseRecord } from "./types";

function iso(value: Date | string | null | undefined): string {
  if (!value) return "";
  return typeof value === "string" ? value : value.toISOString();
}

// ---------------- Courses ----------------

type CourseRow = {
  id: number;
  ownerId: string;
  state: string;
  area: string;
  statute: string;
  grade: string;
  title: string;
  companionJson: string;
  model: string;
  createdAt: Date;
};

function mapCourse(c: CourseRow): CourseRecord {
  return {
    id: c.id,
    state: c.state,
    area: c.area,
    statute: c.statute,
    grade: c.grade,
    title: c.title,
    companion: JSON.parse(c.companionJson) as Companion,
    model: c.model,
    createdAt: iso(c.createdAt),
  };
}

export function saveCourse(
  ownerId: string,
  selection: { state: string; area: string; statute: string; grade: string },
  companion: Companion,
  model: string,
) {
  const created = prisma.course.create({
    data: {
      ownerId,
      state: selection.state,
      area: selection.area,
      statute: selection.statute,
      grade: selection.grade,
      title: companion.title,
      companionJson: JSON.stringify(companion),
      model,
    },
  });
  return created.then((row) => getCourse(ownerId, row.id));
}

export async function listCourses(ownerId: string): Promise<CourseRecord[]> {
  const rows = await prisma.course.findMany({
    where: { ownerId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows.map((r) => mapCourse(r as unknown as CourseRow));
}

export async function getCourse(ownerId: string, id: number): Promise<CourseRecord | null> {
  const row = await prisma.course.findFirst({ where: { ownerId, id } });
  return row ? mapCourse(row as unknown as CourseRow) : null;
}

// ---------------- Professor conversation ----------------

export async function listMessages(ownerId: string, courseId: number) {
  const rows = await prisma.professorMessage.findMany({
    where: { ownerId, courseId },
    orderBy: { id: "asc" },
    take: 100,
  });
  return rows.map((m) => ({
    id: m.id,
    role: m.role as "learner" | "professor",
    content: m.content,
    createdAt: iso(m.createdAt),
  }));
}

export async function saveMessage(
  ownerId: string,
  courseId: number,
  role: "learner" | "professor",
  content: string,
) {
  await prisma.professorMessage.create({
    data: { ownerId, courseId, role, content },
  });
}

export async function listDashboardProfessorMessages(ownerId: string, lessonId: string) {
  const rows = await prisma.dashboardProfessorMessage.findMany({
    where: { ownerId, lessonId },
    orderBy: { id: "asc" },
    take: 100,
  });
  return rows.map((m) => ({
    id: m.id,
    role: m.role as "learner" | "professor",
    content: m.content,
    createdAt: iso(m.createdAt),
  }));
}

export async function saveDashboardProfessorMessage(
  ownerId: string,
  lessonId: string,
  role: "learner" | "professor",
  content: string,
) {
  await prisma.dashboardProfessorMessage.create({
    data: { ownerId, lessonId, role, content },
  });
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
  const rows = await prisma.learnerNote.findMany({
    where: { ownerId },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  return rows.map((n) => ({
    id: n.id,
    courseId: n.courseId,
    title: n.title,
    body: n.body,
    createdAt: iso(n.createdAt),
    updatedAt: iso(n.updatedAt),
  }));
}

export async function saveWorkspaceNote(
  ownerId: string,
  input: { id?: number; courseId?: number | null; title: string; body: string },
) {
  const now = new Date().toISOString();
  if (input.id) {
    await prisma.learnerNote.updateMany({
      where: { ownerId, id: input.id },
      data: { title: input.title, body: input.body, courseId: input.courseId ?? null, updatedAt: now },
    });
    return input.id;
  }
  const row = await prisma.learnerNote.create({
    data: {
      ownerId,
      courseId: input.courseId ?? null,
      title: input.title,
      body: input.body,
      createdAt: now,
      updatedAt: now,
    },
  });
  return row.id;
}

export async function deleteWorkspaceNote(ownerId: string, id: number) {
  await prisma.learnerNote.deleteMany({ where: { ownerId, id } });
}

export async function listWorkspaceEvents(ownerId: string): Promise<WorkspaceEvent[]> {
  const rows = await prisma.learnerEvent.findMany({
    where: { ownerId },
    orderBy: { startsAt: "asc" },
    take: 100,
  });
  return rows.map((e) => ({
    id: e.id,
    courseId: e.courseId,
    title: e.title,
    startsAt: e.startsAt,
    kind: e.kind,
  }));
}

export async function saveWorkspaceEvent(
  ownerId: string,
  input: { courseId?: number | null; title: string; startsAt: string; kind: string },
) {
  const row = await prisma.learnerEvent.create({
    data: {
      ownerId,
      courseId: input.courseId ?? null,
      title: input.title,
      startsAt: input.startsAt,
      kind: input.kind,
      createdAt: new Date().toISOString(),
    },
  });
  return row.id;
}

export async function deleteWorkspaceEvent(ownerId: string, id: number) {
  await prisma.learnerEvent.deleteMany({ where: { ownerId, id } });
}

export async function listWorkspaceFiles(ownerId: string): Promise<WorkspaceFile[]> {
  const rows = await prisma.learnerFile.findMany({
    where: { ownerId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, courseId: true, name: true, mime: true, size: true, createdAt: true },
  });
  return rows.map((f) => ({
    id: f.id,
    courseId: f.courseId,
    name: f.name,
    mime: f.mime,
    size: f.size,
    createdAt: iso(f.createdAt),
  }));
}

export async function saveWorkspaceFile(
  ownerId: string,
  input: { courseId?: number | null; name: string; mime: string; data: Uint8Array },
) {
  const row = await prisma.learnerFile.create({
    data: {
      ownerId,
      courseId: input.courseId ?? null,
      name: input.name,
      mime: input.mime,
      size: input.data.byteLength,
      data: Buffer.from(input.data),
      createdAt: new Date().toISOString(),
    },
  });
  return row.id;
}

export async function getWorkspaceFile(ownerId: string, id: number) {
  const row = await prisma.learnerFile.findFirst({
    where: { ownerId, id },
    select: { name: true, mime: true, data: true },
  });
  if (!row) return undefined;
  return { name: row.name, mime: row.mime, data: row.data as unknown as Uint8Array };
}

export async function deleteWorkspaceFile(ownerId: string, id: number) {
  await prisma.learnerFile.deleteMany({ where: { ownerId, id } });
}

export async function listAssignmentStates(ownerId: string): Promise<AssignmentState[]> {
  const rows = await prisma.learnerAssignmentState.findMany({ where: { ownerId } });
  return rows.map((a) => ({
    courseId: a.courseId,
    assignmentKey: a.assignmentKey,
    status: a.status,
    score: a.score,
    updatedAt: iso(a.updatedAt),
  }));
}

export async function saveAssignmentState(
  ownerId: string,
  input: { courseId: number; assignmentKey: string; status: string; score?: number | null },
) {
  await prisma.learnerAssignmentState.upsert({
    where: {
      ownerId_courseId_assignmentKey: {
        ownerId,
        courseId: input.courseId,
        assignmentKey: input.assignmentKey,
      },
    },
    create: {
      ownerId,
      courseId: input.courseId,
      assignmentKey: input.assignmentKey,
      status: input.status,
      score: input.score ?? null,
      updatedAt: new Date().toISOString(),
    },
    update: {
      status: input.status,
      score: input.score ?? null,
      updatedAt: new Date().toISOString(),
    },
  });
}

export async function listWorkspaceMessages(ownerId: string) {
  const rows = await prisma.learnerMessage.findMany({
    where: { ownerId },
    orderBy: { id: "asc" },
    take: 200,
  });
  return rows.map((m) => ({
    id: m.id,
    sender: m.sender,
    recipient: m.recipient,
    content: m.content,
    createdAt: iso(m.createdAt),
  }));
}

export async function saveWorkspaceMessage(
  ownerId: string,
  input: { sender: string; recipient: string; content: string },
) {
  const row = await prisma.learnerMessage.create({
    data: {
      ownerId,
      sender: input.sender,
      recipient: input.recipient,
      content: input.content,
      createdAt: new Date().toISOString(),
    },
  });
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
  const rows = await prisma.learnerEvidence.findMany({
    where: { ownerId },
    orderBy: { id: "desc" },
    take: 100,
  });
  return rows.map((e) => ({
    id: e.id,
    courseId: e.courseId,
    kind: e.kind,
    title: e.title,
    content: e.content,
    createdAt: iso(e.createdAt),
  }));
}

export async function saveLearningEvidence(
  ownerId: string,
  input: { courseId: number; kind: string; title: string; content: string },
) {
  const row = await prisma.learnerEvidence.create({
    data: {
      ownerId,
      courseId: input.courseId,
      kind: input.kind,
      title: input.title,
      content: input.content,
      createdAt: new Date().toISOString(),
    },
  });
  return row.id;
}

export async function workspaceSummary(ownerId: string) {
  const [notes, events, files, messages, evidence, assignmentStates] = await Promise.all([
    prisma.learnerNote.count({ where: { ownerId } }),
    prisma.learnerEvent.count({ where: { ownerId } }),
    prisma.learnerFile.count({ where: { ownerId } }),
    prisma.learnerMessage.count({ where: { ownerId } }),
    prisma.learnerEvidence.count({ where: { ownerId } }),
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
  await prisma.learningDayEvent.create({
    data: {
      ownerId,
      dayId,
      eventType,
      payloadJson: JSON.stringify(payload),
      createdAt: new Date().toISOString(),
    },
  });
}

export async function openLearningDay(
  ownerId: string,
  courseId: number,
  mode: "SPRINT" | "SHIFT" | "FULL_DAY",
) {
  const active = await prisma.learningDay.findFirst({
    where: { ownerId, courseId, closedAt: null },
    orderBy: { id: "desc" },
  });
  if (active) return active.id;

  const duration = mode === "FULL_DAY" ? 480 : mode === "SHIFT" ? 120 : 45;
  const now = new Date();
  const item = await courseFirstItem(ownerId, courseId);
  const row = await prisma.learningDay.create({
    data: {
      ownerId,
      courseId,
      mode,
      state: "CHECK_IN",
      currentLesson: 0,
      currentItem: item,
      cycleStep: 0,
      openedAt: now,
      scheduledCloseAt: new Date(now.getTime() + duration * 60000),
      updatedAt: now,
    },
  });
  await appendDayEvent(ownerId, row.id, "DAY_OPENED", { mode, durationMinutes: duration });
  return row.id;
}

function resolveDate(next: string | null | undefined, current: Date | null): Date | null {
  if (next === undefined) return current;
  if (next === null) return null;
  return new Date(next);
}

export async function commandLearningDay(ownerId: string, dayId: number, command: DayCommand) {
  const current = await prisma.learningDay.findFirst({ where: { ownerId, id: dayId } });
  if (!current) throw new Error("Learning Day not found.");

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

  await prisma.learningDay.update({
    where: { id: dayId },
    data: {
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
      version: { increment: 1 },
      updatedAt: new Date(),
    },
  });
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
  await prisma.learningAttempt.create({
    data: {
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
    },
  });
}

export async function createHumanNeed(
  ownerId: string,
  dayId: number,
  courseId: number,
  context: Record<string, unknown>,
) {
  const reason = String(context.reason || "Human support requested");
  const existing = await prisma.humanNeedQueue.findFirst({
    where: { ownerId, dayId, status: "OPEN" },
  });
  if (existing) {
    await prisma.humanNeedQueue.update({
      where: { id: existing.id },
      data: { reason, contextJson: JSON.stringify(context) },
    });
    return existing.id;
  }
  const row = await prisma.humanNeedQueue.create({
    data: {
      ownerId,
      dayId,
      courseId,
      reason,
      status: "OPEN",
      contextJson: JSON.stringify(context),
      createdAt: new Date().toISOString(),
    },
  });
  return row.id;
}

export async function resolveHumanNeed(ownerId: string, id: number, resolution: string) {
  const row = await prisma.humanNeedQueue.findFirst({
    where: { ownerId, id },
    select: { dayId: true, contextJson: true },
  });
  if (!row) throw new Error("Queue item not found.");
  await prisma.humanNeedQueue.update({
    where: { id },
    data: { status: "RESOLVED", resolvedAt: new Date() },
  });
  await appendDayEvent(ownerId, row.dayId, "HUMAN_NEED_RESOLVED", { resolution });
}

export async function closeLearningDay(
  ownerId: string,
  dayId: number,
  input: { recap: string; homework: string; forecast: string },
) {
  const now = new Date();
  await prisma.learningDay.update({
    where: { id: dayId },
    data: {
      state: "CLOSED",
      closedAt: now,
      recap: input.recap,
      homework: input.homework,
      forecast: input.forecast,
      version: { increment: 1 },
      updatedAt: now,
    },
  });
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
  const row = await prisma.learningDay.findFirst({
    where: { ownerId, courseId },
    orderBy: { id: "desc" },
  });
  if (!row) return null;

  const [eventRows, attemptRows, queueRows] = await Promise.all([
    prisma.learningDayEvent.findMany({
      where: { ownerId, dayId: row.id },
      orderBy: { id: "asc" },
    }),
    prisma.learningAttempt.findMany({
      where: { ownerId, dayId: row.id },
      orderBy: { id: "asc" },
    }),
    prisma.humanNeedQueue.findMany({
      where: { ownerId, dayId: row.id },
      orderBy: { id: "desc" },
    }),
  ]);

  const events = eventRows.map((e) => ({
    id: e.id,
    eventType: e.eventType,
    payload: JSON.parse(e.payloadJson),
    createdAt: iso(e.createdAt),
  }));
  const attempts = attemptRows.map((a) => ({
    id: a.id,
    lessonIndex: a.lessonIndex,
    item: a.itemText,
    attemptNo: a.attemptNo,
    response: a.response,
    score: a.score,
    passed: Boolean(a.passed),
    stage: a.stage,
    misconception: a.misconception,
    feedback: a.feedback,
    evidenceSummary: a.evidenceSummary,
    workKind: a.workKind,
    workKey: a.workKey,
    createdAt: iso(a.createdAt),
  }));
  const queue = queueRows.map((q) => ({
    id: q.id,
    reason: q.reason,
    status: q.status,
    context: JSON.parse(q.contextJson),
    createdAt: iso(q.createdAt),
    resolvedAt: q.resolvedAt ? iso(q.resolvedAt) : null,
  }));

  const passedLessons = new Set(
    attempts.filter((a) => a.passed && a.workKind === "LESSON").map((a) => a.lessonIndex),
  );
  const openedAt = new Date(row.openedAt).getTime();
  const endedAt = row.closedAt ? new Date(row.closedAt).getTime() : Date.now();
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
  const rows = await prisma.learningDay.findMany({
    where: { ownerId },
    include: { course: { select: { title: true, area: true } } },
    orderBy: { id: "desc" },
    take: 60,
  });
  // Keep only the latest day per course (mirrors the original GROUP BY MAX(id)).
  const seen = new Set<number>();
  const latest = rows.filter((r) => {
    if (seen.has(r.courseId)) return false;
    seen.add(r.courseId);
    return true;
  });
  const snapshots = await Promise.all(
    latest.map(async (r) => {
      const snapshot = await getLearningDaySnapshot(ownerId, r.courseId);
      return {
        ...snapshot,
        courseTitle: r.course.title,
        courseArea: r.course.area,
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

  const enrollmentRows = await prisma.courseEnrollment.findMany({
    where: { ownerId },
    include: { course: true },
  });
  const priorityRank: Record<string, number> = { High: 1, Medium: 2, Low: 3 };
  const enrollments = enrollmentRows
    .map((e) => ({ e, course: e.course }))
    .sort((a, b) => {
      const rank = (priorityRank[a.e.priority] ?? 3) - (priorityRank[b.e.priority] ?? 3);
      if (rank !== 0) return rank;
      return a.course.title.localeCompare(b.course.title);
    });

  const hasTodayBlock = await prisma.schoolScheduleBlock.findFirst({
    where: { ownerId, schoolDate: today },
    select: { id: true },
  });
  const latest = await prisma.schoolScheduleBlock.findFirst({
    where: { ownerId },
    orderBy: { schoolDate: "desc" },
    select: { schoolDate: true },
  });
  const displayedDate = hasTodayBlock ? today : latest?.schoolDate || today;

  const [scheduleRows, gradeRows, meetingRows] = await Promise.all([
    prisma.schoolScheduleBlock.findMany({
      where: { ownerId, schoolDate: displayedDate },
      orderBy: { sequence: "asc" },
      include: { course: { select: { area: true, title: true } } },
    }),
    prisma.gradebookEntry.findMany({
      where: { ownerId },
      include: { course: { select: { title: true } } },
    }),
    prisma.classroomMeeting.findMany({
      where: { ownerId },
      orderBy: { startsAt: "asc" },
      include: { course: { select: { title: true } } },
    }),
  ]);

  const schedule = scheduleRows.map((s) => ({
    id: s.id,
    courseId: s.courseId,
    blockType: s.blockType,
    title: s.title,
    startsAt: s.startsAt,
    endsAt: s.endsAt,
    status: s.status,
    deficiencyFocus: s.deficiencyFocus,
    sequence: s.sequence,
    area: s.course?.area,
    courseTitle: s.course?.title,
  }));

  const grades = gradeRows
    .map((g) => ({
      id: g.id,
      courseId: g.courseId,
      courseTitle: g.course.title,
      title: g.title,
      category: g.category,
      score: g.score,
      possible: g.possible,
      status: g.status,
      feedback: g.feedback,
      gradedAt: g.gradedAt ? iso(g.gradedAt) : null,
    }))
    .sort((a, b) => {
      const ga = a.gradedAt ?? "9999";
      const gb = b.gradedAt ?? "9999";
      if (ga !== gb) return gb.localeCompare(ga);
      return b.id - a.id;
    });

  const meetings = meetingRows.map((m) => ({
    id: m.id,
    courseId: m.courseId,
    title: m.title,
    startsAt: m.startsAt,
    endsAt: m.endsAt,
    room: m.room,
    status: m.status,
    courseTitle: m.course?.title,
  }));

  const assignmentStates = await listAssignmentStates(ownerId);
  const submissions = assignmentStates
    .filter((item) => ["Submitted", "Completed"].includes(item.status))
    .map((item) => {
      const enrollment = enrollments.find((en) => en.course.id === item.courseId);
      const companion = enrollment ? (JSON.parse(enrollment.course.companionJson) as Companion) : null;
      const work = [
        ...(companion?.independentPractice || []).map((title, index) => ({
          key: `practice-${index}`,
          title,
          kind: "Assignment",
        })),
        ...(companion?.appliedProject
          ? [{ key: "project", title: companion.appliedProject.title, kind: "Project" }]
          : []),
        ...(companion?.sections || []).flatMap((section, lessonIndex) =>
          (section.checks || []).map((title, index) => ({
            key: `check-${lessonIndex}-${index}`,
            title,
            kind: "Quiz",
          })),
        ),
      ].find((entry) => entry.key === item.assignmentKey);
      return {
        ...item,
        title: work?.title || item.assignmentKey,
        kind: work?.kind || "Assignment",
        courseTitle: enrollment?.course.title || "Course",
      };
    });

  return {
    schoolDate: displayedDate,
    currentDate: today,
    isHistoricalSchedule: displayedDate !== today,
    enrollments: enrollments.map(({ e, course }) => {
      const companion = JSON.parse(course.companionJson) as Companion;
      return {
        courseId: course.id,
        title: course.title,
        area: course.area,
        grade: course.grade,
        state: course.state,
        level: e.level,
        deficiencyFocus: e.deficiencyFocus,
        priority: e.priority,
        enrolledAt: iso(e.enrolledAt),
        lessonCount: (companion.sections || []).length,
        objectiveCount: (companion.learningObjectives || []).length,
        nextLesson: companion.sections?.[0]?.title || course.title,
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
  await prisma.classroomMeeting.updateMany({ where: { ownerId, id }, data: { status } });
}

export async function setScheduleBlockStatus(ownerId: string, id: number, status: string) {
  if (!["UPCOMING", "CURRENT", "COMPLETE"].includes(status))
    throw new Error("Invalid schedule status.");
  if (status === "CURRENT") {
    const block = await prisma.schoolScheduleBlock.findFirst({
      where: { ownerId, id },
      select: { schoolDate: true },
    });
    if (block) {
      await prisma.schoolScheduleBlock.updateMany({
        where: { ownerId, schoolDate: block.schoolDate, status: "CURRENT" },
        data: { status: "UPCOMING" },
      });
    }
  }
  await prisma.schoolScheduleBlock.updateMany({ where: { ownerId, id }, data: { status } });
}

export async function enrollGeneratedCourse(ownerId: string, courseId: number) {
  await prisma.courseEnrollment.upsert({
    where: { ownerId_courseId: { ownerId, courseId } },
    create: {
      ownerId,
      courseId,
      level: "Not assessed",
      deficiencyFocus: null,
      priority: "Low",
      enrolledAt: new Date().toISOString(),
    },
    update: {},
  });
}
