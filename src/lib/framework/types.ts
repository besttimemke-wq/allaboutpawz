/**
 * Leashed Learning Framework — Course Data Model
 * ===============================================
 * The canonical TypeScript model for the Digital Learning University.
 *
 * Hierarchy:
 *   University
 *     └─ Mission
 *     └─ Pathway  (= "Course", e.g. LSH)  ── 120 hours, 4 levels, credential ladder
 *          └─ Level  (Foundation / Core / Advanced / Capstone)
 *               └─ Module  (e.g. LSH-101)  ── 6 hours
 *                    ├─ 6 Learning Objectives
 *                    ├─ 3 Sub-Modules  (M1, M2, M3)  ── 2 hours each
 *                    │    └─ 3 Classes  (M1C1..C3)  ── 40 min each
 *                    │         ├─ 5-part flow: Connect → Learn → See It → Do It → Check
 *                    │         ├─ Teachable content (Markdown)
 *                    │         ├─ LeashGuide AI tutor prompt
 *                    │         └─ Knowledge check items
 *                    ├─ Module Quiz (8 Q, 80% pass)
 *                    ├─ Artifact + Rubric (8 criteria)
 *                    ├─ Critical items (3–4)
 *                    ├─ Self-reflection prompt
 *                    └─ Capstone evidence
 *
 * Accreditation alignment: COE · ACCSC · IACET · ICG · SCORM
 * CEU math: 1 CEU = 10 contact hours → 120 hrs = 12.0 CEU per pathway.
 */

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export type ID = string;

export type AccreditationBody =
  | "COE" // Council on Occupational Education
  | "ACCSC" // Accrediting Commission of Career Schools & Colleges
  | "IACET" // International Accreditors for Continuing Education & Training (CEU)
  | "ICG" // Industry Credentials Gateway (internal badge standard)
  | "SCORM"; // Shareable Content Object Reference Model (packaging standard)

export const ACCREDITATION_BODIES: AccreditationBody[] = [
  "COE",
  "ACCSC",
  "IACET",
  "ICG",
  "SCORM",
];

export type FlowStage = "connect" | "learn" | "seeIt" | "doIt" | "check";

export const FLOW_STAGES: { key: FlowStage; label: string; icon: string }[] = [
  { key: "connect", label: "Connect", icon: "handshake" },
  { key: "learn", label: "Learn", icon: "book-open" },
  { key: "seeIt", label: "See It", icon: "eye" },
  { key: "doIt", label: "Do It", icon: "hammer" },
  { key: "check", label: "Check", icon: "clipboard-check" },
];

export type QuestionType =
  | "multiple-choice"
  | "true-false"
  | "short-answer"
  | "scenario";

export interface KnowledgeCheckItem {
  type: QuestionType;
  question: string;
  options?: string[];
  answer: string;
  rationale: string;
}

export type LevelName =
  | "Foundation"
  | "Core"
  | "Advanced"
  | "Capstone";

// ---------------------------------------------------------------------------
// Class (a single 40-min lesson block — one of 9 in a module)
// ---------------------------------------------------------------------------

export interface LeashedFlow {
  connect: string; // hook, shared context
  learn: string; // core teaching
  seeIt: string; // worked example / model
  doIt: string; // applied practice
  check: string; // 3-question knowledge check
}

export interface ClassBlock {
  id: ID; // e.g. "M1C1"
  title: string;
  duration: string; // "40 min"
  isAppliedLab: boolean;
  flow: LeashedFlow;
  teachableContent: string; // Markdown
  aiTutorPrompt: string; // LeashGuide prompt for this class
  knowledgeCheck: KnowledgeCheckItem[];
}

// ---------------------------------------------------------------------------
// Sub-Module (one of 3 in a module, ~2 hours = 3 classes)
// ---------------------------------------------------------------------------

export interface SubModule {
  id: ID; // "M1" | "M2" | "M3"
  title: string;
  hours: number;
  classes: ClassBlock[]; // 3 classes
}

// ---------------------------------------------------------------------------
// Module Quiz + Rubric + Critical Items
// ---------------------------------------------------------------------------

export interface ModuleQuiz {
  questionCount: number; // 8
  passThreshold: number; // 80 (%)
  questionMix: string[]; // e.g. ["3 multiple-choice","2 true/false","2 scenario-based","1 short-answer"]
  sampleItem: KnowledgeCheckItem;
}

export interface ModuleRubric {
  artifacts: string[]; // deliverables produced
  rubricCriteria: string[]; // 8 criteria
  criticalItems: string[]; // 3-4
  passStandard: string;
  retakeStandard: string;
  selfReflection: string;
  leashedGuideRole: string;
}

export interface ModuleCapstone {
  evidence: string; // capstone evidence name
  rubricCriteria: string[];
}

// ---------------------------------------------------------------------------
// Module  (6 hours: 3 sub-modules × 2h, 9 lesson blocks)
// ---------------------------------------------------------------------------

export interface Module {
  code: string; // "LSH-101"
  level: number; // 100 | 200 | 300 | 400
  levelName: LevelName;
  title: string;
  hours: number; // 6
  description: string;
  objectives: string[]; // exactly 6
  capstoneEvidence: string;
  subModules: SubModule[]; // exactly 3
  quiz: ModuleQuiz;
  rubric: ModuleRubric;
  capstone: ModuleCapstone;
}

// ---------------------------------------------------------------------------
// Level + Credential Ladder
// ---------------------------------------------------------------------------

export interface Credential {
  level: number; // 100 | 200 | 300 | 400
  name: string; // e.g. "Life Skills Foundation Badge"
  description: string;
  ceus: number; // 5 modules × 6h = 30h = 3.0 CEU
  issuedBy: AccreditationBody[];
  evidence: string[]; // capstones required
}

export interface Level {
  level: number; // 100..400
  name: LevelName;
  tagline: string;
  modules: Module[]; // 5 modules
  credential: Credential;
}

// ---------------------------------------------------------------------------
// Pathway (= "Course", e.g. LSH — Life Skills & Personal Readiness)
// ---------------------------------------------------------------------------

export interface Pathway {
  code: string; // "LSH"
  title: string;
  subtitle: string;
  description: string;
  missionAlignment: string;
  totalHours: number; // 120
  ceus: number; // 12.0
  scormPackageId: string;
  accreditation: AccreditationBody[];
  levels: Level[]; // 4 levels
  enrollmentCopy: EnrollmentCopy;
  createdAt?: string;
  updatedAt?: string;
  /** true when produced by the AI Course Builder; false when hand-authored (LSH exemplar). */
  aiGenerated?: boolean;
}

export interface EnrollmentCopy {
  headline: string;
  whoIsThisFor: string;
  whatYouWillAchieve: string[];
  whatYouWillEarn: string[];
  timeCommitment: string;
  prerequisites: string;
}

// ---------------------------------------------------------------------------
// University + Mission
// ---------------------------------------------------------------------------

export interface University {
  name: string;
  tagline: string;
  mission: string;
  vision: string;
  accreditation: AccreditationBody[];
  frameworkVersion: string; // "Leashed Learning Framework v1"
  pathways: Pathway[];
}

// ---------------------------------------------------------------------------
// Framework specification (the "uniform" template the AI builder follows)
// ---------------------------------------------------------------------------

export interface FrameworkSpec {
  name: string; // "Leashed Learning Framework"
  version: string;
  hoursPerModule: number; // 6
  modulesPerLevel: number; // 5
  levelsPerPathway: number; // 4
  hoursPerPathway: number; // 120
  objectivesPerModule: number; // 6
  subModulesPerModule: number; // 3
  classesPerSubModule: number; // 3  → 9 lesson blocks per module
  flowStages: FlowStage[];
  quizQuestionCount: number; // 8
  quizPassThreshold: number; // 80
  rubricCriteriaCount: number; // 8
  criticalItemsRange: [number, number]; // [3,4]
}

export const DEFAULT_FRAMEWORK_SPEC: FrameworkSpec = {
  name: "Leashed Learning Framework",
  version: "1.0",
  hoursPerModule: 6,
  modulesPerLevel: 5,
  levelsPerPathway: 4,
  hoursPerPathway: 120,
  objectivesPerModule: 6,
  subModulesPerModule: 3,
  classesPerSubModule: 3,
  flowStages: ["connect", "learn", "seeIt", "doIt", "check"],
  quizQuestionCount: 8,
  quizPassThreshold: 80,
  rubricCriteriaCount: 8,
  criticalItemsRange: [3, 4],
};

export const LEVEL_NAMES: LevelName[] = [
  "Foundation",
  "Core",
  "Advanced",
  "Capstone",
];

// ---------------------------------------------------------------------------
// Shipping Checklist (accreditation readiness)
// ---------------------------------------------------------------------------

export interface ChecklistItem {
  id: string;
  category: string;
  title: string;
  detail: string;
  bodies: AccreditationBody[];
  required: boolean;
}

// ---------------------------------------------------------------------------
// Computed helpers
// ---------------------------------------------------------------------------

export function moduleClasses(m: Module): ClassBlock[] {
  return m.subModules.flatMap((s) => s.classes);
}

export function pathwayModules(p: Pathway): Module[] {
  return p.levels.flatMap((l) => l.modules);
}

export function pathwayClassCount(p: Pathway): number {
  return pathwayModules(p).reduce((n, m) => n + moduleClasses(m).length, 0);
}

export function pathwayQuizCount(p: Pathway): number {
  return pathwayModules(p).length;
}

export function ceuFromHours(hours: number): number {
  return Math.round((hours / 10) * 10) / 10; // 1 CEU = 10 contact hours
}

export function validatePathwayShape(
  p: Pathway,
  spec: FrameworkSpec = DEFAULT_FRAMEWORK_SPEC,
): string[] {
  const errs: string[] = [];
  if (p.levels.length !== spec.levelsPerPathway)
    errs.push(`Expected ${spec.levelsPerPathway} levels, got ${p.levels.length}`);
  for (const lvl of p.levels) {
    if (lvl.modules.length !== spec.modulesPerLevel)
      errs.push(
        `${lvl.name}: expected ${spec.modulesPerLevel} modules, got ${lvl.modules.length}`,
      );
    for (const m of lvl.modules) {
      if (m.objectives.length !== spec.objectivesPerModule)
        errs.push(`${m.code}: expected ${spec.objectivesPerModule} objectives, got ${m.objectives.length}`);
      if (m.subModules.length !== spec.subModulesPerModule)
        errs.push(`${m.code}: expected ${spec.subModulesPerModule} sub-modules, got ${m.subModules.length}`);
      for (const sm of m.subModules) {
        if (sm.classes.length !== spec.classesPerSubModule)
          errs.push(`${m.code}/${sm.id}: expected ${spec.classesPerSubModule} classes, got ${sm.classes.length}`);
      }
    }
  }
  return errs;
}
