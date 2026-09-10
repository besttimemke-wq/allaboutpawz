/**
 * Server-only course helpers: serialization, creation, duplication, validation.
 * The canonical Pathway JSON lives on Course.data; these functions manage it.
 */
import "server-only";
import { db } from "./db";
import {
  ceuFromHours,
  expandPathway,
  LEVEL_NAMES,
} from "./framework/builder";
import {
  DEFAULT_FRAMEWORK_SPEC,
  validatePathwayShape,
  type AccreditationBody,
  type LevelName,
  type Pathway,
  type PathwaySeed,
} from "./framework/types";

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

export function serializeCourse(row: {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  description: string;
  missionAlignment: string;
  totalHours: number;
  ceus: number;
  scormPackageId: string;
  accreditation: string;
  status: string;
  aiGenerated: boolean;
  createdAt: Date;
  updatedAt: Date;
  data: string;
}): CourseRow {
  let pathway: Pathway;
  try {
    pathway = JSON.parse(row.data) as Pathway;
  } catch {
    pathway = blankPathway(row.code, row.title);
  }
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    subtitle: row.subtitle,
    description: row.description,
    missionAlignment: row.missionAlignment,
    totalHours: row.totalHours,
    ceus: row.ceus,
    scormPackageId: row.scormPackageId,
    accreditation: safeParseArr(row.accreditation),
    status: row.status as "draft" | "published",
    aiGenerated: row.aiGenerated,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    pathway,
  };
}

function safeParseArr(s: string): AccreditationBody[] {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? (v as AccreditationBody[]) : [];
  } catch {
    return [];
  }
}

/** A minimal framework-valid blank pathway (used when creating a new course). */
export function blankPathway(code: string, title: string): Pathway {
  const seed: PathwaySeed = {
    code,
    title,
    subtitle: "New pathway — edit details in the builder.",
    description: "Edit this course overview to describe the pathway.",
    missionAlignment: "Describe how this pathway advances the University mission.",
    accreditation: ["COE", "ACCSC", "IACET", "ICMG", "SCORM"],
    enrollment: {
      headline: "Write an enrollment headline.",
      whoIsThisFor: "Describe who this pathway is for.",
      whatYouWillAchieve: ["Outcome one", "Outcome two", "Outcome three"],
      whatYouWillEarn: ["Credential one", "Credential two"],
      timeCommitment: "120 hours over ~6 months.",
      prerequisites: "None.",
    },
    levels: LEVEL_NAMES.map((name, i) => ({
      name: name as LevelName,
      tagline: `${name} level`,
      credentialName: `${title} ${name} Credential`,
      credentialDescription: `Awarded on completion of the ${name} level.`,
      modules: Array.from({ length: DEFAULT_FRAMEWORK_SPEC.modulesPerLevel }, (_, m) => ({
        code: `${code}-${(i + 1) * 100 + (m + 1)}`,
        title: `${name} Module ${m + 1}`,
        description: "Edit this module's description.",
        objectives: Array.from({ length: DEFAULT_FRAMEWORK_SPEC.objectivesPerModule }, (_, o) => `Objective ${o + 1}`),
        capstoneEvidence: `${title} ${name} Artifact ${m + 1}`,
        artifacts: ["Primary artifact", "Worked example", "Reflection"],
        rubricCriteria: Array.from({ length: DEFAULT_FRAMEWORK_SPEC.rubricCriteriaCount }, (_, r) => `Rubric criterion ${r + 1}`),
        criticalItems: ["Critical item 1", "Critical item 2", "Critical item 3"],
        selfReflection: "What broke down in the cycle, and what is the smallest change next time?",
        leashedGuideRole: `LeashGuide coaches the learner through this module as a Socratic guide.`,
        quizSampleItem: {
          type: "multiple-choice",
          question: `Sample question for ${title} ${name} module ${m + 1}?`,
          options: ["Option A", "Option B", "Option C", "Option D"],
          answer: "Option A",
          rationale: "Replace with the correct rationale.",
        },
        subModules: Array.from({ length: DEFAULT_FRAMEWORK_SPEC.subModulesPerModule }, (_, s) => ({
          title: `${title}: Sub-module ${s + 1}`,
          classes: Array.from({ length: DEFAULT_FRAMEWORK_SPEC.classesPerSubModule }, (_, c) => ({
            title: `${["Concept", "Practice", "Applied Lab"][c % 3]}`,
            isAppliedLab: c % 3 === 2,
            flow: {
              connect: "Connect the learner to prior experience.",
              learn: "Teach the core model.",
              seeIt: "Show a worked example.",
              doIt: "Apply it now.",
              check: "3-question knowledge check.",
            },
            teachableContent: "## Teachable content\n\nEdit this lesson.",
            aiTutorPrompt: "You are LeashGuide. Coach the learner Socratically.",
            knowledgeCheck: [
              { type: "multiple-choice" as const, question: "Sample Q?", options: ["A", "B"], answer: "A", rationale: "Why A." },
            ],
          })),
        })),
      })),
    })),
  };
  return expandPathway(seed, { aiGenerated: false });
}

export interface CreateCourseInput {
  code: string;
  title: string;
  subtitle?: string;
  description?: string;
  accreditation?: AccreditationBody[];
  status?: "draft" | "published";
}

export async function createCourse(input: CreateCourseInput): Promise<CourseRow> {
  const code = input.code.trim().toUpperCase();
  if (!code) throw new Error("Course code is required.");
  const existing = await db.course.findUnique({ where: { code } });
  if (existing) throw new Error(`Course code "${code}" already exists.`);

  const pathway = blankPathway(code, input.title.trim() || code);
  const row = await db.course.create({
    data: {
      code,
      title: input.title.trim() || code,
      subtitle: input.subtitle ?? pathway.subtitle,
      description: input.description ?? pathway.description,
      missionAlignment: pathway.missionAlignment,
      totalHours: pathway.totalHours,
      ceus: pathway.ceus,
      scormPackageId: pathway.scormPackageId,
      accreditation: JSON.stringify(input.accreditation ?? pathway.accreditation),
      status: input.status ?? "draft",
      aiGenerated: false,
      data: JSON.stringify(pathway),
    },
  });
  return serializeCourse(row);
}

/** Deep-clone a course's pathway with a new code + title (retains all content). */
export async function duplicateCourse(
  sourceCode: string,
  newCode: string,
  newTitle?: string,
): Promise<CourseRow> {
  const source = await db.course.findUnique({ where: { code: sourceCode } });
  if (!source) throw new Error(`Source course "${sourceCode}" not found.`);
  const code = newCode.trim().toUpperCase();
  if (!code) throw new Error("New course code is required.");
  const exists = await db.course.findUnique({ where: { code } });
  if (exists) throw new Error(`Course code "${code}" already exists.`);

  const pathway = JSON.parse(source.data) as Pathway;
  pathway.code = code;
  pathway.title = newTitle?.trim() || `${pathway.title} (Copy)`;
  pathway.subtitle = `Duplicated from ${sourceCode}.`;
  pathway.createdAt = new Date().toISOString();
  pathway.updatedAt = new Date().toISOString();
  pathway.aiGenerated = source.aiGenerated;
  pathway.scormPackageId = `SCORM-${code}-${DEFAULT_FRAMEWORK_SPEC.version}`;
  // Re-tag module codes under the new course code.
  pathway.levels.forEach((lvl, li) => {
    lvl.modules.forEach((mod, mi) => {
      mod.code = `${code}-${(li + 1) * 100 + (mi + 1)}`;
    });
  });

  const row = await db.course.create({
    data: {
      code,
      title: pathway.title,
      subtitle: pathway.subtitle,
      description: pathway.description,
      missionAlignment: pathway.missionAlignment,
      totalHours: pathway.totalHours,
      ceus: pathway.ceus,
      scormPackageId: pathway.scormPackageId,
      accreditation: source.accreditation,
      status: "draft",
      aiGenerated: source.aiGenerated,
      data: JSON.stringify(pathway),
    },
  });
  return serializeCourse(row);
}

/** Persist an updated Pathway object back onto a course. */
export async function savePathway(code: string, pathway: Pathway): Promise<CourseRow> {
  const errs = validatePathwayShape(pathway);
  if (errs.length) throw new Error("Framework validation failed: " + errs.join(" | "));
  const totalHours =
    DEFAULT_FRAMEWORK_SPEC.levelsPerPathway *
    DEFAULT_FRAMEWORK_SPEC.modulesPerLevel *
    DEFAULT_FRAMEWORK_SPEC.hoursPerModule;
  const row = await db.course.update({
    where: { code },
    data: {
      title: pathway.title,
      subtitle: pathway.subtitle,
      description: pathway.description,
      missionAlignment: pathway.missionAlignment,
      totalHours,
      ceus: ceuFromHours(totalHours),
      accreditation: JSON.stringify(pathway.accreditation),
      data: JSON.stringify(pathway),
    },
  });
  return serializeCourse(row);
}

export async function getCourseByCode(code: string): Promise<CourseRow | null> {
  const row = await db.course.findUnique({ where: { code: code.toUpperCase() } });
  return row ? serializeCourse(row) : null;
}

export async function listCourses(opts?: { includeDrafts?: boolean }): Promise<CourseRow[]> {
  const rows = await db.course.findMany({
    where: opts?.includeDrafts ? undefined : { status: "published" },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(serializeCourse);
}
