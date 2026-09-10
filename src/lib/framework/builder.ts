/**
 * Framework builder — expands compact seeds into full Leashed Learning objects.
 * This is the single source of truth for "uniform" generation: every pathway,
 * whether hand-authored or AI-generated, is expanded through these helpers so
 * the structure (hours, CEU, quiz thresholds, rubric counts, flow) is identical.
 */
import {
  DEFAULT_FRAMEWORK_SPEC,
  LEVEL_NAMES,
  ceuFromHours,
  type ClassBlock,
  type Credential,
  type EnrollmentCopy,
  type FrameworkSpec,
  type Level,
  type LevelName,
  type Module,
  type ModuleCapstone,
  type ModuleQuiz,
  type ModuleRubric,
  type Pathway,
  type SubModule,
} from "./types";

// ---------------------------------------------------------------------------
// Compact seed shapes (what an author or the AI actually produces)
// ---------------------------------------------------------------------------

export interface ClassSeed {
  title: string;
  isAppliedLab: boolean;
  flow: {
    connect: string;
    learn: string;
    seeIt: string;
    doIt: string;
    check: string;
  };
  teachableContent: string;
  aiTutorPrompt: string;
  knowledgeCheck: ModuleQuiz["sampleItem"][];
}

export interface SubModuleSeed {
  title: string;
  classes: ClassSeed[];
}

export interface ModuleSeed {
  code: string;
  title: string;
  description: string;
  objectives: string[];
  capstoneEvidence: string;
  artifacts: string[];
  rubricCriteria: string[];
  criticalItems: string[];
  selfReflection: string;
  leashedGuideRole: string;
  quizSampleItem: ModuleQuiz["sampleItem"];
  subModules: SubModuleSeed[]; // exactly 3
}

export interface LevelSeed {
  name: LevelName;
  tagline: string;
  credentialName: string;
  credentialDescription: string;
  modules: ModuleSeed[]; // exactly 5
}

export interface PathwaySeed {
  code: string;
  title: string;
  subtitle: string;
  description: string;
  missionAlignment: string;
  accreditation: Pathway["accreditation"];
  enrollment: EnrollmentCopy;
  levels: LevelSeed[]; // exactly 4
}

// ---------------------------------------------------------------------------
// Expanders
// ---------------------------------------------------------------------------

const CLASS_TITLES = [
  (sub: string) => `${sub} — Concept`,
  (sub: string) => `${sub} — Practice`,
  (sub: string) => `${sub} — Applied Lab`,
];

const SUB_MODULE_TITLES = (m: string) => [
  `${m} Foundations`,
  `${m} Application`,
  `${m} Capstone`,
];

export function expandClass(
  moduleCode: string,
  subIndex: number,
  classIndex: number,
  seed: ClassSeed,
): ClassBlock {
  const id = `M${subIndex + 1}C${classIndex + 1}`;
  return {
    id,
    title: seed.title,
    duration: "40 min",
    isAppliedLab: seed.isAppliedLab,
    flow: seed.flow,
    teachableContent: seed.teachableContent,
    aiTutorPrompt: seed.aiTutorPrompt,
    knowledgeCheck: seed.knowledgeCheck,
  };
}

export function expandSubModule(
  moduleCode: string,
  subIndex: number,
  seed: SubModuleSeed,
): SubModule {
  return {
    id: `M${subIndex + 1}`,
    title: seed.title,
    hours: DEFAULT_FRAMEWORK_SPEC.hoursPerModule / DEFAULT_FRAMEWORK_SPEC.subModulesPerModule,
    classes: seed.classes.map((c, i) => expandClass(moduleCode, subIndex, i, c)),
  };
}

export function expandModule(
  level: number,
  levelName: LevelName,
  seed: ModuleSeed,
): Module {
  const quiz: ModuleQuiz = {
    questionCount: DEFAULT_FRAMEWORK_SPEC.quizQuestionCount,
    passThreshold: DEFAULT_FRAMEWORK_SPEC.quizPassThreshold,
    questionMix: [
      "3 multiple-choice",
      "2 true/false",
      "2 scenario-based",
      "1 short-answer",
    ],
    sampleItem: seed.quizSampleItem,
  };
  const rubric: ModuleRubric = {
    artifacts: seed.artifacts,
    rubricCriteria: seed.rubricCriteria,
    criticalItems: seed.criticalItems,
    passStandard:
      `Pass module quiz at ${DEFAULT_FRAMEWORK_SPEC.quizPassThreshold}% or higher; submit complete ${seed.capstoneEvidence} meeting all rubric criteria (minimum 6/8); pass all critical items; complete self-reflection.`,
    retakeStandard:
      "One revision cycle with LeashGuide feedback on missing rubric items; quiz retake with randomized question pool; critical items require instructor checkpoint.",
    selfReflection: seed.selfReflection,
    leashedGuideRole: seed.leashedGuideRole,
  };
  const capstone: ModuleCapstone = {
    evidence: seed.capstoneEvidence,
    rubricCriteria: seed.rubricCriteria,
  };
  return {
    code: seed.code,
    level,
    levelName,
    title: seed.title,
    hours: DEFAULT_FRAMEWORK_SPEC.hoursPerModule,
    description: seed.description,
    objectives: seed.objectives,
    capstoneEvidence: seed.capstoneEvidence,
    subModules: seed.subModules.map((s, i) => expandSubModule(seed.code, i, s)),
    quiz,
    rubric,
    capstone,
  };
}

export function expandLevel(level: number, seed: LevelSeed): Level {
  const hours = level * 0 + DEFAULT_FRAMEWORK_SPEC.modulesPerLevel * DEFAULT_FRAMEWORK_SPEC.hoursPerModule;
  const cred: Credential = {
    level,
    name: seed.credentialName,
    description: seed.credentialDescription,
    ceus: ceuFromHours(hours),
    issuedBy: ["IACET", "ICG"],
    evidence: seed.modules.map((m) => m.capstoneEvidence),
  };
  return {
    level,
    name: seed.name,
    tagline: seed.tagline,
    modules: seed.modules.map((m) => expandModule(level, seed.name, m)),
    credential: cred,
  };
}

export function expandPathway(seed: PathwaySeed, opts?: { aiGenerated?: boolean }): Pathway {
  const totalHours =
    DEFAULT_FRAMEWORK_SPEC.levelsPerPathway *
    DEFAULT_FRAMEWORK_SPEC.modulesPerLevel *
    DEFAULT_FRAMEWORK_SPEC.hoursPerModule;
  return {
    code: seed.code,
    title: seed.title,
    subtitle: seed.subtitle,
    description: seed.description,
    missionAlignment: seed.missionAlignment,
    totalHours,
    ceus: ceuFromHours(totalHours),
    scormPackageId: `SCORM-${seed.code}-${DEFAULT_FRAMEWORK_SPEC.version}`,
    accreditation: seed.accreditation,
    levels: seed.levels.map((l, i) => expandLevel((i + 1) * 100, l)),
    enrollmentCopy: seed.enrollment,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    aiGenerated: opts?.aiGenerated ?? false,
  };
}

export function spec(): FrameworkSpec {
  return DEFAULT_FRAMEWORK_SPEC;
}

export { LEVEL_NAMES, ceuFromHours };
