// All About Pawz Academy — demo seed.
// Idempotent: creates the six Leashed pathway companions + a school-day
// schedule, enrollments, gradebook entries and meetings the first time a
// learner loads the classroom. Authored from the Leashed Program Delivery
// Guide v1.0.
//
// Backed by Supabase — every step is wrapped in try/catch and never throws.
// This runs on every learner visit via the /api/identity route.

import { supabase } from "./supabase";
import { allPathwayCompanions } from "./curriculum";

function todayInChicago(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const pick = (t: string) => parts.find((p) => p.type === t)?.value || "";
  return `${pick("year")}-${pick("month")}-${pick("day")}`;
}

// Demo learner enrollment metadata per pathway (from the program guide).
const ENROLLMENT_META: Array<{
  level: string;
  deficiencyFocus: string | null;
  priority: string;
}> = [
  { level: "Term 2 — Core Skill", deficiencyFocus: null, priority: "Low" }, // IPDG
  {
    level: "Term 1 — Foundation",
    deficiencyFocus: "Marker timing & leash-reactivity protocols",
    priority: "Medium",
  }, // PDT
  { level: "On pace", deficiencyFocus: null, priority: "Low" }, // ACA
  {
    level: "Term 1 — Foundation",
    deficiencyFocus: "Client intake & multi-species care protocols",
    priority: "Medium",
  }, // PPS
  {
    level: "Term 1 — Foundation",
    deficiencyFocus: "Cat temperament reading & safe handling",
    priority: "Medium",
  }, // CAT
  { level: "Term 1 — Foundation", deficiencyFocus: null, priority: "Low" }, // PPC
];

// Demo gradebook — formative, not certified grades.
const GRADEBOOK: Array<{
  courseIndex: number;
  title: string;
  category: string;
  score: number | null;
  possible: number;
  status: string;
  feedback: string;
}> = [
  { courseIndex: 0, title: "IPDG-103 Salon Safety gate", category: "Safety gate", score: 10, possible: 10, status: "GRADED", feedback: "Passed. Signed off for live-animal work." },
  { courseIndex: 0, title: "Breed identification quiz", category: "Quiz", score: 9, possible: 10, status: "GRADED", feedback: "Strong on breed groups; review terrier coat types." },
  { courseIndex: 1, title: "PDT-101 Foundation quiz", category: "Quiz", score: 7, possible: 10, status: "GRADED", feedback: "Review marker timing. Practice with a clicker." },
  { courseIndex: 1, title: "PDT-201 Safety gate", category: "Safety gate", score: null, possible: 10, status: "PENDING", feedback: "Awaiting sign-off." },
  { courseIndex: 2, title: "ACA-201 Safety gate", category: "Safety gate", score: 10, possible: 10, status: "GRADED", feedback: "Passed. Signed off for live-animal work." },
  { courseIndex: 3, title: "PPS-104 Safety gate", category: "Safety gate", score: null, possible: 10, status: "PENDING", feedback: "Awaiting sign-off." },
  { courseIndex: 4, title: "CAT-102 Safety gate", category: "Safety gate", score: null, possible: 10, status: "PENDING", feedback: "Awaiting sign-off." },
  { courseIndex: 0, title: "Sanitation sequence check", category: "Micro-check", score: 5, possible: 5, status: "GRADED", feedback: "Correct sequence demonstrated." },
];

const MEETINGS: Array<{
  courseIndex: number | null;
  title: string;
  start: string;
  end: string;
  room: string;
}> = [
  { courseIndex: null, title: "Instructor check-in", start: "13:00", end: "13:30", room: "Room 204 / virtual" },
  { courseIndex: 1, title: "PDT office hours", start: "15:30", end: "16:00", room: "Training floor" },
];

// Daily schedule template — adapted from the Leashed weekly template (A4).
// A full-time learner's day: morning technical labs, afternoon business module,
// late afternoon micro-checks. Different pathways rotate through the morning.
type BlockTemplate = {
  blockType: string;
  title: string;
  start: string;
  end: string;
  courseIndex: number | null;
  deficiencyFocus?: string;
};

function dailySchedule(courseIds: number[]): BlockTemplate[] {
  return [
    { blockType: "ADVISORY", title: "Professor check-in and Day preview", start: "08:00", end: "08:15", courseIndex: null },
    { blockType: "TECHNICAL_LAB", title: "IPDG Technical lab — Salon safety & breeds", start: "08:15", end: "10:00", courseIndex: 0 },
    { blockType: "TECHNICAL_LAB", title: "PDT Technical lab — Marker training", start: "10:00", end: "11:45", courseIndex: 1, deficiencyFocus: "Marker timing & leash-reactivity protocols" },
    { blockType: "LUNCH", title: "Lunch", start: "11:45", end: "12:30", courseIndex: null },
    { blockType: "BUSINESS_MODULE", title: "Business module — BUS-201 Operations", start: "12:30", end: "13:30", courseIndex: null },
    { blockType: "TECHNICAL_LAB", title: "ACA Technical lab — Handling & sanitation", start: "13:30", end: "14:15", courseIndex: 2 },
    { blockType: "MICRO_CHECKS", title: "Micro-checks + AI workflow log", start: "14:15", end: "15:00", courseIndex: 0 },
    { blockType: "RUBRIC_REVIEW", title: "Rubric review / office hours", start: "15:00", end: "15:30", courseIndex: null },
  ];
}

export async function ensureDemoSeed(ownerId: string): Promise<void> {
  try {
    const companions = allPathwayCompanions();
    let courseIds: number[] = [];

    // Count existing courses for this owner.
    let existingCourses = 0;
    try {
      const { count, error: cntErr } = await supabase
        .from("course")
        .select("*", { count: "exact", head: true })
        .eq("ownerId", ownerId);
      if (cntErr) console.error("[seed] course count failed:", cntErr.message);
      else existingCourses = count ?? 0;
    } catch (e) {
      console.error("[seed] course count exception:", e instanceof Error ? e.message : String(e));
    }

    if (existingCourses === 0) {
      // First run: create courses + enrollments + grades + meetings.
      for (let i = 0; i < companions.length; i++) {
        const { seed, companion } = companions[i];
        try {
          const { data: course, error } = await supabase
            .from("course")
            .insert({
              ownerId,
              state: "Louisiana",
              area: seed.title,
              statute: `Leashed ${seed.code} · Program Delivery Guide v1.0`,
              grade: seed.level,
              title: companion.title,
              companionJson: JSON.stringify(companion),
              model: "ZAI GLM-4.6",
              createdAt: new Date(Date.now() - (companions.length - i) * 60000).toISOString(),
            })
            .select()
            .single();
          if (error || !course) {
            console.error("[seed] course insert failed:", error?.message);
            continue;
          }
          const courseId = (course as { id: number }).id;
          courseIds.push(courseId);

          const meta = ENROLLMENT_META[i] ?? {
            level: "Term 1 — Foundation",
            deficiencyFocus: null,
            priority: "Low",
          };
          const { error: enrErr } = await supabase.from("courseEnrollment").insert({
            ownerId,
            courseId,
            level: meta.level,
            deficiencyFocus: meta.deficiencyFocus,
            priority: meta.priority,
            enrolledAt: new Date().toISOString(),
          });
          if (enrErr) console.error("[seed] enrollment insert failed:", enrErr.message);
        } catch (e) {
          console.error("[seed] course insert exception:", e instanceof Error ? e.message : String(e));
        }
      }

      // Gradebook.
      for (const g of GRADEBOOK) {
        const courseId = courseIds[g.courseIndex];
        if (!courseId) continue;
        try {
          const { error } = await supabase.from("gradebookEntry").insert({
            ownerId,
            courseId,
            title: g.title,
            category: g.category,
            score: g.score,
            possible: g.possible,
            status: g.status,
            feedback: g.feedback,
            gradedAt: g.status === "GRADED" ? new Date(Date.now() - 86400000).toISOString() : null,
          });
          if (error) console.error("[seed] gradebook insert failed:", error.message);
        } catch (e) {
          console.error("[seed] gradebook exception:", e instanceof Error ? e.message : String(e));
        }
      }

      // Meetings.
      for (const m of MEETINGS) {
        try {
          const { error } = await supabase.from("classroomMeeting").insert({
            ownerId,
            courseId: m.courseIndex === null ? null : courseIds[m.courseIndex] ?? null,
            title: m.title,
            startsAt: m.start,
            endsAt: m.end,
            room: m.room,
            status: "SCHEDULED",
          });
          if (error) console.error("[seed] meeting insert failed:", error.message);
        } catch (e) {
          console.error("[seed] meeting exception:", e instanceof Error ? e.message : String(e));
        }
      }
    } else {
      // Subsequent runs: reuse existing courses (ordered by id ascending).
      try {
        const { data: rows, error } = await supabase
          .from("course")
          .select("id")
          .eq("ownerId", ownerId)
          .order("id", { ascending: true })
          .limit(6);
        if (error) console.error("[seed] course list failed:", error.message);
        else if (rows) {
          courseIds = rows.map((r) => (r as { id: number }).id);
        }
      } catch (e) {
        console.error("[seed] course list exception:", e instanceof Error ? e.message : String(e));
      }
    }

    // Ensure today's schedule exists.
    const today = todayInChicago();
    let todayCount = 0;
    try {
      const { count, error: tCntErr } = await supabase
        .from("schoolScheduleBlock")
        .select("*", { count: "exact", head: true })
        .eq("ownerId", ownerId)
        .eq("schoolDate", today);
      if (tCntErr) console.error("[seed] today count failed:", tCntErr.message);
      else todayCount = count ?? 0;
    } catch (e) {
      console.error("[seed] today count exception:", e instanceof Error ? e.message : String(e));
    }
    if (todayCount === 0 && courseIds.length > 0) {
      const blocks = dailySchedule(courseIds);
      let sequence = 0;
      for (const block of blocks) {
        sequence += 1;
        const courseId =
          block.courseIndex === null ? null : courseIds[block.courseIndex] ?? null;
        try {
          const { error } = await supabase.from("schoolScheduleBlock").insert({
            ownerId,
            schoolDate: today,
            courseId,
            blockType: block.blockType,
            title: block.title,
            startsAt: `${today}T${block.start}:00`,
            endsAt: `${today}T${block.end}:00`,
            status: "UPCOMING",
            deficiencyFocus: block.deficiencyFocus ?? null,
            sequence,
          });
          if (error) console.error("[seed] block insert failed:", error.message);
        } catch (e) {
          console.error("[seed] block exception:", e instanceof Error ? e.message : String(e));
        }
      }
    }
  } catch (e) {
    // Never let the seed blow up the identity route.
    console.error("[seed] unexpected failure:", e instanceof Error ? e.message : String(e));
  }
}
