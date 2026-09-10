/**
 * Client-side API helpers for the Leashed.io university app.
 * All return typed shapes; throw on non-OK so callers can handle errors.
 */
import type { Pathway, AccreditationBody } from "./framework/types";

export interface CourseRow {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  description: string;
  missionAlignment: string;
  totalHours: number;
  ceus: number;
  scormPackageId: string;
  accreditation: AccreditationBody[];
  status: "draft" | "published";
  aiGenerated: boolean;
  createdAt: string;
  updatedAt: string;
  pathway: Pathway;
}

export interface CreateCourseInput {
  code: string;
  title: string;
  subtitle?: string;
  description?: string;
  accreditation?: AccreditationBody[];
  status?: "draft" | "published";
}

async function json<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

const base = "/api";

export const api = {
  listCourses: (includeDrafts = false) =>
    json<{ courses: CourseRow[] }>(`${base}/courses${includeDrafts ? "?includeDrafts=1" : ""}`).then((r) => r.courses),

  getCourse: (code: string) =>
    json<{ course: CourseRow }>(`${base}/courses/${encodeURIComponent(code)}`).then((r) => r.course),

  createCourse: (input: CreateCourseInput) =>
    json<{ course: CourseRow }>(`${base}/courses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).then((r) => r.course),

  savePathway: (code: string, pathway: Pathway) =>
    json<{ course: CourseRow }>(`${base}/courses/${encodeURIComponent(code)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pathway }),
    }).then((r) => r.course),

  updateCourseStatus: (code: string, status: "draft" | "published") =>
    json<{ ok: boolean }>(`${base}/courses/${encodeURIComponent(code)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }),

  deleteCourse: (code: string) =>
    json<{ ok: boolean }>(`${base}/courses/${encodeURIComponent(code)}`, { method: "DELETE" }),

  duplicateCourse: (code: string, newCode: string, newTitle?: string) =>
    json<{ course: CourseRow }>(`${base}/courses/${encodeURIComponent(code)}/duplicate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newCode, newTitle }),
    }).then((r) => r.course),

  enroll: (courseId: string, learnerName: string, learnerEmail?: string) =>
    json<{ enrollment: { id: string; courseId: string; learnerName: string; progress: string } }>(`${base}/enrollments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId, learnerName, learnerEmail }),
    }).then((r) => r.enrollment),

  getEnrollments: (courseId: string, learnerName?: string) => {
    const p = new URLSearchParams({ courseId });
    if (learnerName) p.set("learnerName", learnerName);
    return json<{ enrollments: { id: string; courseId: string; learnerName: string; progress: string }[] }>(
      `${base}/enrollments?${p.toString()}`,
    ).then((r) => r.enrollments);
  },

  updateProgress: (id: string, progress: unknown) =>
    json<{ enrollment: { id: string; progress: string } }>(`${base}/enrollments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ progress }),
    }).then((r) => r.enrollment),

  submitQuiz: (body: {
    courseCode: string;
    moduleCode: string;
    learnerName?: string;
    answers: { question: string; selected: string; correct: string }[];
  }) => json<{ attemptId: string; score: number; passed: boolean; correctCount: number; total: number; passThreshold: number }>(`${base}/quiz`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }),

  sendTutorMessage: (body: {
    courseCode: string;
    moduleCode: string;
    classId?: string;
    message: string;
    sessionId?: string;
    learnerName?: string;
  }) =>
    json<{ sessionId: string; reply: string; module: { code: string; title: string }; class: { id: string; title: string } | null }>(
      `${base}/ai/tutor`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    ),

  getTutorHistory: (sessionId: string) =>
    json<{ messages: { id: string; role: string; content: string; createdAt: string }[] }>(
      `${base}/ai/tutor?sessionId=${encodeURIComponent(sessionId)}`,
    ).then((r) => r.messages),

  buildCourse: (input: { code: string; title: string; domain: string; audience?: string }) =>
    json<{ code: string; title: string; modules: number }>(`${base}/ai/build-course`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),

  getLearnerDashboard: (name: string) =>
    json<{ learnerName: string; enrollments: DashboardEnrollment[] }>(`${base}/learner?name=${encodeURIComponent(name)}`).then(
      (r) => r.enrollments,
    ),

  getRoster: (courseId?: string) =>
    json<{ roster: RosterRow[]; summary: RosterSummary }>(
      `${base}/admin/roster${courseId ? `?courseId=${encodeURIComponent(courseId)}` : ""}`,
    ),
};

export interface RosterRow {
  id: string;
  learnerName: string;
  learnerEmail: string | null;
  courseCode: string;
  courseTitle: string;
  enrolledAt: string;
  updatedAt: string;
  totalClasses: number;
  completedClasses: number;
  passedQuizzes: number;
  totalModules: number;
  overallPct: number;
  lastActive: string;
}

export interface RosterSummary {
  totalEnrollments: number;
  uniqueLearners: number;
  avgProgress: number;
  completedPathways: number;
  quizzesPassed: number;
}

export interface DashboardEnrollment {
  id: string;
  courseId: string;
  learnerName: string;
  createdAt: string;
  updatedAt: string;
  course: {
    code: string;
    title: string;
    subtitle: string;
    totalHours: number;
    ceus: number;
    status: string;
  };
  progress: Record<string, { completedClasses: string[]; quizScore?: number; quizPassed?: boolean }>;
  stats: {
    totalModules: number;
    completedClasses: number;
    totalClasses: number;
    passedQuizzes: number;
    overallPct: number;
    nextModuleCode: string | null;
    nextClassId: string | null;
  };
  credentialsEarned: { name: string; ceus: number; level: number }[];
}

/** Parse the JSON progress blob stored on an enrollment. */
export function parseProgress(progress: string): Record<string, { completedClasses: string[]; quizScore?: number; quizPassed?: boolean }> {
  try {
    const v = JSON.parse(progress);
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}
