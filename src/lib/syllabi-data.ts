// Leashed Program (v1.0 — September 2026)
// Every field in this file is sourced verbatim from the Leashed Program Delivery Guide.
// Section B1–B6 syllabi, week-by-week schedules, assessment calendars, and safety gates.
// Fields the guide does not provide (career outcomes, rubric domains, FAQs) are empty arrays.

export interface WeeklyScheduleEntry {
  week: number;
  term: string;
  technicalModules: string;
  businessModules: string;
  hoursFormatted: string; // e.g. "9 / 20", "4 / 24", "13 / 17"
  technicalHours: number;
  businessHours: number;
  assessments: string;
}

export interface AssessmentCalendarEntry {
  point: string;
  when: string;
  instrument: string;
  passStandard: string;
}

export interface SafetyGateEntry {
  code: string;
  title: string;
  stage: string;
  requirement: string;
  isMandatoryBeforeLiveWork: boolean;
}

export interface CareerOutcomeEntry {
  title: string;
  employmentType: 'Owner-Operator / Entrepreneur' | 'Salaried / Commission Practitioner' | 'Specialist / Lead';
  typicalComp: string;
  roleDescription: string;
  marketDemand: string;
}

export interface CompetencyRubricEntry {
  domain: string;
  coreSkills: string;
  competentBenchmark: string;
  masteryThreshold: string;
}

export interface ProgramData {
  code: 'IPDG' | 'PDT' | 'ACA' | 'PPS' | 'CAT' | 'PPC';
  programName: string;
  credentialTitle: string;
  totalClockHours: number;
  technicalHours: number;
  businessHours: number;
  appliedHours: number;
  scheduledWeeks: number;
  partTimeWeeks: number;
  scheduleTemplate: string;
  programObjective: string;
  admissionRequirements: string[];
  attendancePolicy: string;
  gradingStandards: string;
  safetyGates: SafetyGateEntry[];
  practicumMinimums: string;
  completionRequirements: string[];
  stacksInto: string;
  weeklySchedule: WeeklyScheduleEntry[];
  assessmentCalendar: AssessmentCalendarEntry[];
  careerOutcomes: CareerOutcomeEntry[];
  rubricDomains: CompetencyRubricEntry[];
  faqs: Array<{ question: string; answer: string; category: string }>;
}

// Backward-compat alias consumed by ProgramDetailView.tsx.
export type ProgramInstitutionalData = ProgramData;

// Shared text sourced from the guide:
//   - A4. Weekly Schedule Template (full-time) — Part A, line 235
//   - Attendance policy — Section B (identical across all six pathways)
//   - Grading — Section B (identical across all six pathways)
const SCHEDULE_TEMPLATE_FULL_TIME =
  'Mon–Fri 08:00–15:30 (30 hr/wk full-time) · 08:00–12:00 Technical lab (Mon–Thu) / Practicum or open lab (Fri) · 12:30–14:30 Business module (Mon, Wed, Thu) / Personal module (Tue) / Applied capstone work (Fri) · 14:30–15:30 Micro-checks + AI workflow log (Mon, Tue, Thu) / Checkpoint or quiz (Wed) / Rubric review with instructor (Fri)';

const ATTENDANCE_POLICY =
  'Clock hours are earned only for attended blocks. Minimum 95% attendance per term; missed lab hours are made up in Friday open lab within the same term. Below 90% at any checkpoint triggers a coach meeting and written plan.';

const GRADING_STANDARDS =
  'Module: 10 activities + 10 micro-checks , 2 checkpoints and final quiz at ≥ 80%, capstone artifact accepted. Program: Competency Rubric at Competent on every row (catalog Section 9); safety-critical rows are pass/fail.';

const PRACTICUM_MINIMUMS = 'Final term · Supervised practicum log · Minimums met and supervisor signature.';

// =========================================================================
// B1. SYLLABUS — PROFESSIONAL DOG GROOMER (IPDG)
// Source: Program Delivery Guide, Section B1 (lines 499–1176).
// =========================================================================
export const IPDG_SYLLABUS: ProgramData = {
  code: 'IPDG',
  programName: 'Professional Dog Groomer',
  credentialTitle: 'Professional Dog Groomer Diploma (Diploma)',
  totalClockHours: 1248,
  technicalHours: 360,
  businessHours: 864,
  appliedHours: 24,
  scheduledWeeks: 44,
  partTimeWeeks: 84,
  scheduleTemplate: SCHEDULE_TEMPLATE_FULL_TIME,
  programObjective:
    'Identify dog stages and understand dog life · Recognize breeds · Recognize grooming tools · Identify workplace safety · Provide basic and advanced grooming techniques · Provide handling and pet care · Understand sanitation · Provide supervised live-client salon services · Build, price, market and operate a grooming business · Manage personal readiness, finances and well-being as an owner · Provide CPR and first aid.',
  admissionRequirements: [
    'Age 18+ (17 with guardian consent)',
    'high-school diploma, GED or ability-to-benefit assessment',
    'physical ability to lift 40 lb and stand for lab blocks',
    'signed animal-handling risk acknowledgement',
  ],
  attendancePolicy: ATTENDANCE_POLICY,
  gradingStandards: GRADING_STANDARDS,
  safetyGates: [
    { code: 'IPDG-103', title: '', stage: 'Term 1', requirement: 'Signed off before live-animal work', isMandatoryBeforeLiveWork: true },
    { code: 'IPDG-302', title: '', stage: 'Term 3', requirement: 'Signed off before live-animal work', isMandatoryBeforeLiveWork: true },
    { code: 'IPDG-402', title: '', stage: 'Term 4', requirement: 'Signed off before live-animal work; CPR/First Aid before practicum', isMandatoryBeforeLiveWork: true },
  ],
  practicumMinimums: PRACTICUM_MINIMUMS,
  completionRequirements: [
    'All 157 modules',
    '1,248 clock hours recorded',
    'rubric Competent',
    'GRM-BIZ capstone passed by panel',
    'practicum log signed',
  ],
  stacksInto: 'PPC Advanced Diploma (all technical and business & personal modules credited)',
  weeklySchedule: [
    { week: 1, term: 'T1 Foundation', technicalModules: 'IPDG-101 (cont.)', businessModules: 'LSH-101, LSH-102, LSH-103, LSH-104 (cont.)', hoursFormatted: '9 / 20', technicalHours: 9, businessHours: 20, assessments: 'Quizzes: LSH-101, LSH-102, LSH-103' },
    { week: 2, term: 'T1 Foundation', technicalModules: 'IPDG-101 (cont.)', businessModules: 'LSH-104, LSH-105, PER-101, PER-102 (cont.)', hoursFormatted: '9 / 20', technicalHours: 9, businessHours: 20, assessments: 'Quizzes: LSH-104, LSH-105, PER-101' },
    { week: 3, term: 'T1 Foundation', technicalModules: 'IPDG-101, IPDG-102 (cont.)', businessModules: 'PER-102, PER-103, PER-104, PER-105 (cont.)', hoursFormatted: '9 / 20', technicalHours: 9, businessHours: 20, assessments: 'Quizzes: IPDG-101, PER-102, PER-103, PER-104' },
    { week: 4, term: 'T1 Foundation', technicalModules: 'IPDG-102 (cont.)', businessModules: 'PER-105, BUS-101, BUS-102, BUS-103, BUS-104 (cont.)', hoursFormatted: '9 / 20', technicalHours: 9, businessHours: 20, assessments: 'Quizzes: PER-105, BUS-101, BUS-102, BUS-103' },
    { week: 5, term: 'T1 Foundation', technicalModules: 'IPDG-102 (cont.)', businessModules: 'BUS-104, BUS-105, BUS-106, MKT-101 (cont.)', hoursFormatted: '9 / 20', technicalHours: 9, businessHours: 20, assessments: 'Quizzes: BUS-104, BUS-105, BUS-106' },
    { week: 6, term: 'T1 Foundation', technicalModules: 'IPDG-102, IPDG-103 (cont.)', businessModules: 'MKT-101, MKT-102, MKT-103, MKT-104 (cont.)', hoursFormatted: '9 / 20', technicalHours: 9, businessHours: 20, assessments: 'Quizzes: IPDG-102, MKT-101, MKT-102, MKT-103' },
    { week: 7, term: 'T1 Foundation', technicalModules: 'IPDG-103 (cont.)', businessModules: 'MKT-104, MKT-105, TEC-101, TEC-102 (cont.)', hoursFormatted: '9 / 20', technicalHours: 9, businessHours: 20, assessments: 'Quizzes: MKT-104, MKT-105, TEC-101' },
    { week: 8, term: 'T1 Foundation', technicalModules: 'IPDG-103 (cont.)', businessModules: 'TEC-102, TEC-103, TEC-104, TEC-105, FIN-101 (cont.)', hoursFormatted: '9 / 20', technicalHours: 9, businessHours: 20, assessments: 'Quizzes: TEC-102, TEC-103, TEC-104, TEC-105' },
    { week: 9, term: 'T1 Foundation', technicalModules: 'IPDG-103, IPDG-104 (cont.)', businessModules: 'FIN-101, FIN-102, FIN-103, FIN-104 (cont.)', hoursFormatted: '9 / 20', technicalHours: 9, businessHours: 20, assessments: 'Quizzes: IPDG-103, FIN-101, FIN-102, FIN-103' },
    { week: 10, term: 'T1 Foundation', technicalModules: 'IPDG-104 (cont.)', businessModules: 'FIN-104, FIN-105, LEG-101, LEG-102 (cont.)', hoursFormatted: '9 / 20', technicalHours: 9, businessHours: 20, assessments: 'Quizzes: FIN-104, FIN-105, LEG-101' },
    { week: 11, term: 'T1 Foundation', technicalModules: 'IPDG-104', businessModules: 'LEG-102, LEG-103, LEG-104, LEG-105', hoursFormatted: '9 / 20', technicalHours: 9, businessHours: 20, assessments: 'Quizzes: IPDG-104, LEG-102, LEG-103, LEG-104, LEG-105 · Level checkpoint · rubric review' },
    { week: 12, term: 'T2 Core Skill', technicalModules: 'IPDG-201 (cont.)', businessModules: 'LSH-201, LSH-202, LSH-203, LSH-204 (cont.)', hoursFormatted: '9 / 20', technicalHours: 9, businessHours: 20, assessments: 'Quizzes: LSH-201, LSH-202, LSH-203' },
    { week: 13, term: 'T2 Core Skill', technicalModules: 'IPDG-201 (cont.)', businessModules: 'LSH-204, LSH-205, PER-201, PER-202 (cont.)', hoursFormatted: '9 / 20', technicalHours: 9, businessHours: 20, assessments: 'Quizzes: LSH-204, LSH-205, PER-201' },
    { week: 14, term: 'T2 Core Skill', technicalModules: 'IPDG-201, IPDG-202 (cont.)', businessModules: 'PER-202, PER-203, PER-204, PER-205 (cont.)', hoursFormatted: '9 / 20', technicalHours: 9, businessHours: 20, assessments: 'Quizzes: IPDG-201, PER-202, PER-203, PER-204' },
    { week: 15, term: 'T2 Core Skill', technicalModules: 'IPDG-202 (cont.)', businessModules: 'PER-205, BUS-201, BUS-202, BUS-203, BUS-204 (cont.)', hoursFormatted: '9 / 20', technicalHours: 9, businessHours: 20, assessments: 'Quizzes: PER-205, BUS-201, BUS-202, BUS-203' },
    { week: 16, term: 'T2 Core Skill', technicalModules: 'IPDG-202 (cont.)', businessModules: 'BUS-204, BUS-205, BUS-206, MKT-201 (cont.)', hoursFormatted: '9 / 20', technicalHours: 9, businessHours: 20, assessments: 'Quizzes: BUS-204, BUS-205, BUS-206' },
    { week: 17, term: 'T2 Core Skill', technicalModules: 'IPDG-202, IPDG-203 (cont.)', businessModules: 'MKT-201, MKT-202, MKT-203, MKT-204 (cont.)', hoursFormatted: '9 / 20', technicalHours: 9, businessHours: 20, assessments: 'Quizzes: IPDG-202, MKT-201, MKT-202, MKT-203' },
    { week: 18, term: 'T2 Core Skill', technicalModules: 'IPDG-203 (cont.)', businessModules: 'MKT-204, MKT-205, TEC-201, TEC-202 (cont.)', hoursFormatted: '9 / 20', technicalHours: 9, businessHours: 20, assessments: 'Quizzes: MKT-204, MKT-205, TEC-201' },
    { week: 19, term: 'T2 Core Skill', technicalModules: 'IPDG-203 (cont.)', businessModules: 'TEC-202, TEC-203, TEC-204, TEC-205, FIN-201 (cont.)', hoursFormatted: '9 / 20', technicalHours: 9, businessHours: 20, assessments: 'Quizzes: TEC-202, TEC-203, TEC-204, TEC-205' },
    { week: 20, term: 'T2 Core Skill', technicalModules: 'IPDG-203, IPDG-204 (cont.)', businessModules: 'FIN-201, FIN-202, FIN-203, FIN-204 (cont.)', hoursFormatted: '9 / 20', technicalHours: 9, businessHours: 20, assessments: 'Quizzes: IPDG-203, FIN-201, FIN-202, FIN-203' },
    { week: 21, term: 'T2 Core Skill', technicalModules: 'IPDG-204 (cont.)', businessModules: 'FIN-204, FIN-205, LEG-201, LEG-202 (cont.)', hoursFormatted: '9 / 20', technicalHours: 9, businessHours: 20, assessments: 'Quizzes: FIN-204, FIN-205, LEG-201' },
    { week: 22, term: 'T2 Core Skill', technicalModules: 'IPDG-204', businessModules: 'LEG-202, LEG-203, LEG-204, LEG-205', hoursFormatted: '9 / 20', technicalHours: 9, businessHours: 20, assessments: 'Quizzes: IPDG-204, LEG-202, LEG-203, LEG-204, LEG-205 · Level checkpoint · rubric review' },
    { week: 23, term: 'T3 Advanced Skill', technicalModules: 'IPDG-301 (cont.)', businessModules: 'LSH-301, LSH-302, LSH-303', hoursFormatted: '11 / 18', technicalHours: 11, businessHours: 18, assessments: 'Quizzes: LSH-301, LSH-302, LSH-303' },
    { week: 24, term: 'T3 Advanced Skill', technicalModules: 'IPDG-301 (cont.)', businessModules: 'LSH-304, LSH-305, PER-301', hoursFormatted: '11 / 18', technicalHours: 11, businessHours: 18, assessments: 'Quizzes: LSH-304, LSH-305, PER-301' },
    { week: 25, term: 'T3 Advanced Skill', technicalModules: 'IPDG-301 (cont.)', businessModules: 'PER-302, PER-303, PER-304', hoursFormatted: '11 / 18', technicalHours: 11, businessHours: 18, assessments: 'Quizzes: PER-302, PER-303, PER-304' },
    { week: 26, term: 'T3 Advanced Skill', technicalModules: 'IPDG-301 (cont.)', businessModules: 'PER-305, BUS-301, BUS-302', hoursFormatted: '11 / 18', technicalHours: 11, businessHours: 18, assessments: 'Quizzes: PER-305, BUS-301, BUS-302' },
    { week: 27, term: 'T3 Advanced Skill', technicalModules: 'IPDG-301 (cont.)', businessModules: 'BUS-303, BUS-304, BUS-305', hoursFormatted: '11 / 18', technicalHours: 11, businessHours: 18, assessments: 'Quizzes: BUS-303, BUS-304, BUS-305' },
    { week: 28, term: 'T3 Advanced Skill', technicalModules: 'IPDG-301 (cont.)', businessModules: 'BUS-306, MKT-301, MKT-302', hoursFormatted: '11 / 18', technicalHours: 11, businessHours: 18, assessments: 'Quizzes: BUS-306, MKT-301, MKT-302' },
    { week: 29, term: 'T3 Advanced Skill', technicalModules: 'IPDG-301 (cont.)', businessModules: 'MKT-303, MKT-304, MKT-305', hoursFormatted: '11 / 18', technicalHours: 11, businessHours: 18, assessments: 'Quizzes: MKT-303, MKT-304, MKT-305' },
    { week: 30, term: 'T3 Advanced Skill', technicalModules: 'IPDG-301 (cont.)', businessModules: 'TEC-301, TEC-302, TEC-303', hoursFormatted: '11 / 18', technicalHours: 11, businessHours: 18, assessments: 'Quizzes: TEC-301, TEC-302, TEC-303' },
    { week: 31, term: 'T3 Advanced Skill', technicalModules: 'IPDG-301 (cont.)', businessModules: 'TEC-304, TEC-305, FIN-301', hoursFormatted: '11 / 18', technicalHours: 11, businessHours: 18, assessments: 'Quizzes: TEC-304, TEC-305, FIN-301' },
    { week: 32, term: 'T3 Advanced Skill', technicalModules: 'IPDG-301 (cont.)', businessModules: 'FIN-302, FIN-303, FIN-304', hoursFormatted: '11 / 18', technicalHours: 11, businessHours: 18, assessments: 'Quizzes: FIN-302, FIN-303, FIN-304' },
    { week: 33, term: 'T3 Advanced Skill', technicalModules: 'IPDG-301, IPDG-302 (cont.)', businessModules: 'FIN-305, LEG-301, LEG-302', hoursFormatted: '11 / 18', technicalHours: 11, businessHours: 18, assessments: 'Quizzes: IPDG-301, FIN-305, LEG-301, LEG-302' },
    { week: 34, term: 'T3 Advanced Skill', technicalModules: 'IPDG-302', businessModules: 'LEG-303, LEG-304, LEG-305', hoursFormatted: '11 / 18', technicalHours: 11, businessHours: 18, assessments: 'Quizzes: IPDG-302, LEG-303, LEG-304, LEG-305 · Level checkpoint · rubric review' },
    { week: 35, term: 'T4 Capstone', technicalModules: 'IPDG-401 (cont.)', businessModules: 'LSH-401, LSH-402, LSH-403, LSH-404', hoursFormatted: '4 / 24', technicalHours: 4, businessHours: 24, assessments: 'Quizzes: LSH-401, LSH-402, LSH-403, LSH-404' },
    { week: 36, term: 'T4 Capstone', technicalModules: 'IPDG-401 (cont.)', businessModules: 'LSH-405, PER-401, PER-402, PER-403', hoursFormatted: '4 / 24', technicalHours: 4, businessHours: 24, assessments: 'Quizzes: LSH-405, PER-401, PER-402, PER-403' },
    { week: 37, term: 'T4 Capstone', technicalModules: 'IPDG-401 (cont.)', businessModules: 'PER-404, PER-405, BUS-401, BUS-402', hoursFormatted: '4 / 24', technicalHours: 4, businessHours: 24, assessments: 'Quizzes: PER-404, PER-405, BUS-401, BUS-402' },
    { week: 38, term: 'T4 Capstone', technicalModules: 'IPDG-401 (cont.)', businessModules: 'BUS-403, BUS-404, BUS-405, BUS-406', hoursFormatted: '4 / 24', technicalHours: 4, businessHours: 24, assessments: 'Quizzes: BUS-403, BUS-404, BUS-405, BUS-406' },
    { week: 39, term: 'T4 Capstone', technicalModules: 'IPDG-401 (cont.)', businessModules: 'MKT-401, MKT-402, MKT-403, MKT-404', hoursFormatted: '4 / 24', technicalHours: 4, businessHours: 24, assessments: 'Quizzes: MKT-401, MKT-402, MKT-403, MKT-404' },
    { week: 40, term: 'T4 Capstone', technicalModules: 'IPDG-401 (cont.)', businessModules: 'MKT-405, TEC-401, TEC-402, TEC-403', hoursFormatted: '4 / 24', technicalHours: 4, businessHours: 24, assessments: 'Quizzes: MKT-405, TEC-401, TEC-402, TEC-403' },
    { week: 41, term: 'T4 Capstone', technicalModules: 'IPDG-401 (cont.)', businessModules: 'TEC-404, TEC-405, FIN-401, FIN-402', hoursFormatted: '4 / 24', technicalHours: 4, businessHours: 24, assessments: 'Quizzes: TEC-404, TEC-405, FIN-401, FIN-402' },
    { week: 42, term: 'T4 Capstone', technicalModules: 'IPDG-401', businessModules: 'FIN-403, FIN-404, FIN-405, LEG-401', hoursFormatted: '4 / 24', technicalHours: 4, businessHours: 24, assessments: 'Quizzes: IPDG-401, FIN-403, FIN-404, FIN-405, LEG-401' },
    { week: 43, term: 'T4 Capstone', technicalModules: 'IPDG-402 (cont.)', businessModules: 'LEG-402, LEG-403, LEG-404, LEG-405', hoursFormatted: '4 / 24', technicalHours: 4, businessHours: 24, assessments: 'Quizzes: LEG-402, LEG-403, LEG-404, LEG-405' },
    { week: 44, term: 'T4 Capstone', technicalModules: 'IPDG-402', businessModules: 'GRM-BIZ', hoursFormatted: '4 / 24', technicalHours: 4, businessHours: 24, assessments: 'Quizzes: IPDG-402, GRM-BIZ · Level checkpoint · rubric review · Capstone panel · practicum sign-off' },
  ],
  assessmentCalendar: [
    { point: 'Module quizzes and checkpoints', when: 'Week each module closes (see schedule)', instrument: 'Final quiz + 2 checkpoints + capstone artifact', passStandard: '≥ 80%; artifact accepted' },
    { point: 'Level checkpoint 1', when: 'Last week of Term 1', instrument: 'Competency Rubric rows for that level; attendance audit', passStandard: 'Competent on all rows; ≥ 95% attendance' },
    { point: 'Level checkpoint 2', when: 'Last week of Term 2', instrument: 'Competency Rubric rows for that level; attendance audit', passStandard: 'Competent on all rows; ≥ 95% attendance' },
    { point: 'Level checkpoint 3', when: 'Last week of Term 3', instrument: 'Competency Rubric rows for that level; attendance audit', passStandard: 'Competent on all rows; ≥ 95% attendance' },
    { point: 'Level checkpoint 4', when: 'Last week of Term 4', instrument: 'Competency Rubric rows for that level; attendance audit', passStandard: 'Competent on all rows; ≥ 95% attendance' },
    { point: 'Safety-critical sign-off', when: 'Before first live-animal service', instrument: 'Instructor checklist (handling, sanitation, CPR/First Aid)', passStandard: 'Pass/fail' },
    { point: 'Practicum', when: 'Final term', instrument: 'Supervised practicum log', passStandard: 'Minimums met and supervisor signature' },
    { point: 'Applied business capstone', when: 'Final week — GRM-BIZ', instrument: 'Instructor + owner panel', passStandard: 'Launch plan, price menu, licensing/insurance worksheet, 90-day calendar accepted' },
  ],
  careerOutcomes: [],
  rubricDomains: [],
  faqs: [],
};

// =========================================================================
// B2. SYLLABUS — PROFESSIONAL DOG TRAINER (PDT)
// Source: Program Delivery Guide, Section B2 (lines 1178–1821).
// =========================================================================
export const PDT_SYLLABUS: ProgramData = {
  code: 'PDT',
  programName: 'Professional Dog Trainer',
  credentialTitle: 'Professional Dog Trainer Diploma (Diploma)',
  totalClockHours: 1112,
  technicalHours: 224,
  businessHours: 864,
  appliedHours: 24,
  scheduledWeeks: 39,
  partTimeWeeks: 75,
  scheduleTemplate: SCHEDULE_TEMPLATE_FULL_TIME,
  programObjective:
    'Recognize/search dog history · Offer guidance to new owners · Follow vaccination & ADA guides · Identify 10 most important AKC breeds · Recognize training equipment · Recognize personalities & behavior problems · Choose effective solutions · Train basic obedience · Train advanced obedience · Use in-motion commands, verbal & hand signals · Make corrections · Design private classes · Build, price, market and operate a training business · Manage personal readiness, finances and well-being as an owner · Understand continuous education · Provide CPR and first aid.',
  admissionRequirements: [
    'Age 18+ (17 with guardian consent)',
    'high-school diploma, GED or ability-to-benefit assessment',
    'physical ability to lift 40 lb and stand for lab blocks',
    'signed animal-handling risk acknowledgement',
  ],
  attendancePolicy: ATTENDANCE_POLICY,
  gradingStandards: GRADING_STANDARDS,
  safetyGates: [
    { code: 'PDT-201', title: '', stage: 'Term 2', requirement: 'Signed off before live-animal work', isMandatoryBeforeLiveWork: true },
    { code: 'PDT-402', title: '', stage: 'Term 4', requirement: 'Signed off before live-animal work; CPR/First Aid before practicum', isMandatoryBeforeLiveWork: true },
  ],
  practicumMinimums: PRACTICUM_MINIMUMS,
  completionRequirements: [
    'All 155 modules',
    '1,112 clock hours recorded',
    'rubric Competent',
    'TRN-BIZ capstone passed by panel',
    'practicum log signed',
  ],
  stacksInto: 'PPC Advanced Diploma (all technical and business & personal modules credited)',
  weeklySchedule: [
    { week: 1, term: 'T1 Foundation', technicalModules: 'PDT-101 (cont.)', businessModules: 'LSH-101, LSH-102, LSH-103, LSH-104', hoursFormatted: '4 / 24', technicalHours: 4, businessHours: 24, assessments: 'Quizzes: LSH-101, LSH-102, LSH-103, LSH-104' },
    { week: 2, term: 'T1 Foundation', technicalModules: 'PDT-101 (cont.)', businessModules: 'LSH-105, PER-101, PER-102, PER-103', hoursFormatted: '4 / 24', technicalHours: 4, businessHours: 24, assessments: 'Quizzes: LSH-105, PER-101, PER-102, PER-103' },
    { week: 3, term: 'T1 Foundation', technicalModules: 'PDT-101, PDT-102 (cont.)', businessModules: 'PER-104, PER-105, BUS-101, BUS-102', hoursFormatted: '4 / 24', technicalHours: 4, businessHours: 24, assessments: 'Quizzes: PDT-101, PER-104, PER-105, BUS-101, BUS-102' },
    { week: 4, term: 'T1 Foundation', technicalModules: 'PDT-102 (cont.)', businessModules: 'BUS-103, BUS-104, BUS-105, BUS-106', hoursFormatted: '4 / 24', technicalHours: 4, businessHours: 24, assessments: 'Quizzes: BUS-103, BUS-104, BUS-105, BUS-106' },
    { week: 5, term: 'T1 Foundation', technicalModules: 'PDT-102 (cont.)', businessModules: 'MKT-101, MKT-102, MKT-103, MKT-104', hoursFormatted: '4 / 24', technicalHours: 4, businessHours: 24, assessments: 'Quizzes: MKT-101, MKT-102, MKT-103, MKT-104' },
    { week: 6, term: 'T1 Foundation', technicalModules: 'PDT-102 (cont.)', businessModules: 'MKT-105, TEC-101, TEC-102, TEC-103', hoursFormatted: '4 / 24', technicalHours: 4, businessHours: 24, assessments: 'Quizzes: MKT-105, TEC-101, TEC-102, TEC-103' },
    { week: 7, term: 'T1 Foundation', technicalModules: 'PDT-102, PDT-103 (cont.)', businessModules: 'TEC-104, TEC-105, FIN-101, FIN-102', hoursFormatted: '4 / 24', technicalHours: 4, businessHours: 24, assessments: 'Quizzes: PDT-102, TEC-104, TEC-105, FIN-101, FIN-102' },
    { week: 8, term: 'T1 Foundation', technicalModules: 'PDT-103 (cont.)', businessModules: 'FIN-103, FIN-104, FIN-105, LEG-101', hoursFormatted: '4 / 24', technicalHours: 4, businessHours: 24, assessments: 'Quizzes: FIN-103, FIN-104, FIN-105, LEG-101' },
    { week: 9, term: 'T1 Foundation', technicalModules: 'PDT-103', businessModules: 'LEG-102, LEG-103, LEG-104, LEG-105', hoursFormatted: '4 / 24', technicalHours: 4, businessHours: 24, assessments: 'Quizzes: PDT-103, LEG-102, LEG-103, LEG-104, LEG-105 · Level checkpoint · rubric review' },
    { week: 10, term: 'T2 Core Skill', technicalModules: 'PDT-201 (cont.)', businessModules: 'LSH-201, LSH-202, LSH-203, LSH-204', hoursFormatted: '6 / 24', technicalHours: 6, businessHours: 24, assessments: 'Quizzes: LSH-201, LSH-202, LSH-203, LSH-204' },
    { week: 11, term: 'T2 Core Skill', technicalModules: 'PDT-201 (cont.)', businessModules: 'LSH-205, PER-201, PER-202, PER-203', hoursFormatted: '6 / 24', technicalHours: 6, businessHours: 24, assessments: 'Quizzes: LSH-205, PER-201, PER-202, PER-203' },
    { week: 12, term: 'T2 Core Skill', technicalModules: 'PDT-201 (cont.)', businessModules: 'PER-204, PER-205, BUS-201, BUS-202', hoursFormatted: '6 / 24', technicalHours: 6, businessHours: 24, assessments: 'Quizzes: PER-204, PER-205, BUS-201, BUS-202' },
    { week: 13, term: 'T2 Core Skill', technicalModules: 'PDT-201 (cont.)', businessModules: 'BUS-203, BUS-204, BUS-205, BUS-206', hoursFormatted: '6 / 24', technicalHours: 6, businessHours: 24, assessments: 'Quizzes: BUS-203, BUS-204, BUS-205, BUS-206' },
    { week: 14, term: 'T2 Core Skill', technicalModules: 'PDT-201, PDT-202 (cont.)', businessModules: 'MKT-201, MKT-202, MKT-203, MKT-204', hoursFormatted: '6 / 24', technicalHours: 6, businessHours: 24, assessments: 'Quizzes: PDT-201, MKT-201, MKT-202, MKT-203, MKT-204' },
    { week: 15, term: 'T2 Core Skill', technicalModules: 'PDT-202 (cont.)', businessModules: 'MKT-205, TEC-201, TEC-202, TEC-203', hoursFormatted: '6 / 24', technicalHours: 6, businessHours: 24, assessments: 'Quizzes: MKT-205, TEC-201, TEC-202, TEC-203' },
    { week: 16, term: 'T2 Core Skill', technicalModules: 'PDT-202 (cont.)', businessModules: 'TEC-204, TEC-205, FIN-201, FIN-202', hoursFormatted: '6 / 24', technicalHours: 6, businessHours: 24, assessments: 'Quizzes: TEC-204, TEC-205, FIN-201, FIN-202' },
    { week: 17, term: 'T2 Core Skill', technicalModules: 'PDT-202 (cont.)', businessModules: 'FIN-203, FIN-204, FIN-205, LEG-201', hoursFormatted: '6 / 24', technicalHours: 6, businessHours: 24, assessments: 'Quizzes: FIN-203, FIN-204, FIN-205, LEG-201' },
    { week: 18, term: 'T2 Core Skill', technicalModules: 'PDT-202', businessModules: 'LEG-202, LEG-203, LEG-204, LEG-205', hoursFormatted: '6 / 24', technicalHours: 6, businessHours: 24, assessments: 'Quizzes: PDT-202, LEG-202, LEG-203, LEG-204, LEG-205 · Level checkpoint · rubric review' },
    { week: 19, term: 'T3 Advanced Skill', technicalModules: 'PDT-301 (cont.)', businessModules: 'LSH-301, LSH-302, LSH-303', hoursFormatted: '10 / 18', technicalHours: 10, businessHours: 18, assessments: 'Quizzes: LSH-301, LSH-302, LSH-303' },
    { week: 20, term: 'T3 Advanced Skill', technicalModules: 'PDT-301 (cont.)', businessModules: 'LSH-304, LSH-305, PER-301', hoursFormatted: '10 / 18', technicalHours: 10, businessHours: 18, assessments: 'Quizzes: LSH-304, LSH-305, PER-301' },
    { week: 21, term: 'T3 Advanced Skill', technicalModules: 'PDT-301 (cont.)', businessModules: 'PER-302, PER-303, PER-304', hoursFormatted: '10 / 18', technicalHours: 10, businessHours: 18, assessments: 'Quizzes: PER-302, PER-303, PER-304' },
    { week: 22, term: 'T3 Advanced Skill', technicalModules: 'PDT-301', businessModules: 'PER-305, BUS-301, BUS-302', hoursFormatted: '10 / 18', technicalHours: 10, businessHours: 18, assessments: 'Quizzes: PDT-301, PER-305, BUS-301, BUS-302' },
    { week: 23, term: 'T3 Advanced Skill', technicalModules: 'PDT-302 (cont.)', businessModules: 'BUS-303, BUS-304, BUS-305', hoursFormatted: '10 / 18', technicalHours: 10, businessHours: 18, assessments: 'Quizzes: BUS-303, BUS-304, BUS-305' },
    { week: 24, term: 'T3 Advanced Skill', technicalModules: 'PDT-302 (cont.)', businessModules: 'BUS-306, MKT-301, MKT-302', hoursFormatted: '10 / 18', technicalHours: 10, businessHours: 18, assessments: 'Quizzes: BUS-306, MKT-301, MKT-302' },
    { week: 25, term: 'T3 Advanced Skill', technicalModules: 'PDT-302 (cont.)', businessModules: 'MKT-303, MKT-304, MKT-305', hoursFormatted: '10 / 18', technicalHours: 10, businessHours: 18, assessments: 'Quizzes: MKT-303, MKT-304, MKT-305' },
    { week: 26, term: 'T3 Advanced Skill', technicalModules: 'PDT-302', businessModules: 'TEC-301, TEC-302, TEC-303', hoursFormatted: '10 / 18', technicalHours: 10, businessHours: 18, assessments: 'Quizzes: PDT-302, TEC-301, TEC-302, TEC-303' },
    { week: 27, term: 'T3 Advanced Skill', technicalModules: 'PDT-303 (cont.)', businessModules: 'TEC-304, TEC-305, FIN-301', hoursFormatted: '10 / 18', technicalHours: 10, businessHours: 18, assessments: 'Quizzes: TEC-304, TEC-305, FIN-301' },
    { week: 28, term: 'T3 Advanced Skill', technicalModules: 'PDT-303 (cont.)', businessModules: 'FIN-302, FIN-303, FIN-304', hoursFormatted: '10 / 18', technicalHours: 10, businessHours: 18, assessments: 'Quizzes: FIN-302, FIN-303, FIN-304' },
    { week: 29, term: 'T3 Advanced Skill', technicalModules: 'PDT-303 (cont.)', businessModules: 'FIN-305, LEG-301, LEG-302', hoursFormatted: '10 / 18', technicalHours: 10, businessHours: 18, assessments: 'Quizzes: FIN-305, LEG-301, LEG-302' },
    { week: 30, term: 'T3 Advanced Skill', technicalModules: 'PDT-303', businessModules: 'LEG-303, LEG-304, LEG-305', hoursFormatted: '10 / 18', technicalHours: 10, businessHours: 18, assessments: 'Quizzes: PDT-303, LEG-303, LEG-304, LEG-305 · Level checkpoint · rubric review' },
    { week: 31, term: 'T4 Capstone', technicalModules: 'PDT-401 (cont.)', businessModules: 'LSH-401, LSH-402, LSH-403, LSH-404, LSH-405 (cont.)', hoursFormatted: '2 / 27', technicalHours: 2, businessHours: 27, assessments: 'Quizzes: LSH-401, LSH-402, LSH-403, LSH-404' },
    { week: 32, term: 'T4 Capstone', technicalModules: 'PDT-401 (cont.)', businessModules: 'LSH-405, PER-401, PER-402, PER-403, PER-404 (cont.)', hoursFormatted: '2 / 27', technicalHours: 2, businessHours: 27, assessments: 'Quizzes: LSH-405, PER-401, PER-402, PER-403' },
    { week: 33, term: 'T4 Capstone', technicalModules: 'PDT-401 (cont.)', businessModules: 'PER-404, PER-405, BUS-401, BUS-402, BUS-403, BUS-404 (cont.)', hoursFormatted: '2 / 27', technicalHours: 2, businessHours: 27, assessments: 'Quizzes: PER-404, PER-405, BUS-401, BUS-402, BUS-403' },
    { week: 34, term: 'T4 Capstone', technicalModules: 'PDT-401, PDT-402 (cont.)', businessModules: 'BUS-404, BUS-405, BUS-406, MKT-401, MKT-402 (cont.)', hoursFormatted: '2 / 27', technicalHours: 2, businessHours: 27, assessments: 'Quizzes: PDT-401, BUS-404, BUS-405, BUS-406, MKT-401' },
    { week: 35, term: 'T4 Capstone', technicalModules: 'PDT-402 (cont.)', businessModules: 'MKT-402, MKT-403, MKT-404, MKT-405, TEC-401, TEC-402 (cont.)', hoursFormatted: '2 / 27', technicalHours: 2, businessHours: 27, assessments: 'Quizzes: MKT-402, MKT-403, MKT-404, MKT-405, TEC-401' },
    { week: 36, term: 'T4 Capstone', technicalModules: 'PDT-402 (cont.)', businessModules: 'TEC-402, TEC-403, TEC-404, TEC-405, FIN-401 (cont.)', hoursFormatted: '2 / 27', technicalHours: 2, businessHours: 27, assessments: 'Quizzes: TEC-402, TEC-403, TEC-404, TEC-405' },
    { week: 37, term: 'T4 Capstone', technicalModules: 'PDT-402 (cont.)', businessModules: 'FIN-401, FIN-402, FIN-403, FIN-404, FIN-405, LEG-401 (cont.)', hoursFormatted: '2 / 27', technicalHours: 2, businessHours: 27, assessments: 'Quizzes: FIN-401, FIN-402, FIN-403, FIN-404, FIN-405' },
    { week: 38, term: 'T4 Capstone', technicalModules: 'PDT-402 (cont.)', businessModules: 'LEG-401, LEG-402, LEG-403, LEG-404, LEG-405 (cont.)', hoursFormatted: '2 / 27', technicalHours: 2, businessHours: 27, assessments: 'Quizzes: LEG-401, LEG-402, LEG-403, LEG-404' },
    { week: 39, term: 'T4 Capstone', technicalModules: 'PDT-402', businessModules: 'LEG-405, TRN-BIZ', hoursFormatted: '2 / 27', technicalHours: 2, businessHours: 27, assessments: 'Quizzes: PDT-402, LEG-405, TRN-BIZ · Level checkpoint · rubric review · Capstone panel · practicum sign-off' },
  ],
  assessmentCalendar: [
    { point: 'Module quizzes and checkpoints', when: 'Week each module closes (see schedule)', instrument: 'Final quiz + 2 checkpoints + capstone artifact', passStandard: '≥ 80%; artifact accepted' },
    { point: 'Level checkpoint 1', when: 'Last week of Term 1', instrument: 'Competency Rubric rows for that level; attendance audit', passStandard: 'Competent on all rows; ≥ 95% attendance' },
    { point: 'Level checkpoint 2', when: 'Last week of Term 2', instrument: 'Competency Rubric rows for that level; attendance audit', passStandard: 'Competent on all rows; ≥ 95% attendance' },
    { point: 'Level checkpoint 3', when: 'Last week of Term 3', instrument: 'Competency Rubric rows for that level; attendance audit', passStandard: 'Competent on all rows; ≥ 95% attendance' },
    { point: 'Level checkpoint 4', when: 'Last week of Term 4', instrument: 'Competency Rubric rows for that level; attendance audit', passStandard: 'Competent on all rows; ≥ 95% attendance' },
    { point: 'Safety-critical sign-off', when: 'Before first live-animal service', instrument: 'Instructor checklist (handling, sanitation, CPR/First Aid)', passStandard: 'Pass/fail' },
    { point: 'Practicum', when: 'Final term', instrument: 'Supervised practicum log', passStandard: 'Minimums met and supervisor signature' },
    { point: 'Applied business capstone', when: 'Final week — TRN-BIZ', instrument: 'Instructor + owner panel', passStandard: 'Launch plan, price menu, licensing/insurance worksheet, 90-day calendar accepted' },
  ],
  careerOutcomes: [],
  rubricDomains: [],
  faqs: [],
};

// =========================================================================
// B3. SYLLABUS — ANIMAL CARE ASSISTANT (ACA)
// Source: Program Delivery Guide, Section B3 (lines 1823–2454).
// =========================================================================
export const ACA_SYLLABUS: ProgramData = {
  code: 'ACA',
  programName: 'Animal Care Assistant',
  credentialTitle: 'Dog Bather–Animal Care Assistant Diploma (Diploma)',
  totalClockHours: 988,
  technicalHours: 112,
  businessHours: 864,
  appliedHours: 12,
  scheduledWeeks: 35,
  partTimeWeeks: 66,
  scheduleTemplate: SCHEDULE_TEMPLATE_FULL_TIME,
  programObjective:
    'Identify a puppy and understand puppy life · Recognize breeds · Recognize grooming tools · Identify workplace safety · Provide basic handling and basic dog care · Understand sanitation process · Enter the workforce with personal readiness and customer-service skills · Understand the bather-to-owner career ladder.',
  admissionRequirements: [
    'Age 18+ (17 with guardian consent)',
    'high-school diploma, GED or ability-to-benefit assessment',
    'physical ability to lift 40 lb and stand for lab blocks',
    'signed animal-handling risk acknowledgement',
  ],
  attendancePolicy: ATTENDANCE_POLICY,
  gradingStandards: GRADING_STANDARDS,
  safetyGates: [
    { code: 'ACA-201', title: '', stage: 'Term 2', requirement: 'Signed off before live-animal work; CPR/First Aid before practicum', isMandatoryBeforeLiveWork: true },
  ],
  practicumMinimums: PRACTICUM_MINIMUMS,
  completionRequirements: [
    'All 150 modules',
    '988 clock hours recorded',
    'rubric Competent',
    'ACA-BIZ capstone passed by panel',
    'practicum log signed',
  ],
  stacksInto: 'IPDG (ACA-101/102/103/201/301 credited toward IPDG-101–204); all business & personal modules credited',
  weeklySchedule: [
    { week: 1, term: 'T1 Foundation', technicalModules: 'ACA-101 (cont.)', businessModules: 'LSH-101, LSH-102, LSH-103, LSH-104', hoursFormatted: '4 / 24', technicalHours: 4, businessHours: 24, assessments: 'Quizzes: LSH-101, LSH-102, LSH-103, LSH-104' },
    { week: 2, term: 'T1 Foundation', technicalModules: 'ACA-101, ACA-102 (cont.)', businessModules: 'LSH-105, PER-101, PER-102, PER-103', hoursFormatted: '4 / 24', technicalHours: 4, businessHours: 24, assessments: 'Quizzes: ACA-101, LSH-105, PER-101, PER-102, PER-103' },
    { week: 3, term: 'T1 Foundation', technicalModules: 'ACA-102 (cont.)', businessModules: 'PER-104, PER-105, BUS-101, BUS-102', hoursFormatted: '4 / 24', technicalHours: 4, businessHours: 24, assessments: 'Quizzes: PER-104, PER-105, BUS-101, BUS-102' },
    { week: 4, term: 'T1 Foundation', technicalModules: 'ACA-102 (cont.)', businessModules: 'BUS-103, BUS-104, BUS-105, BUS-106', hoursFormatted: '4 / 24', technicalHours: 4, businessHours: 24, assessments: 'Quizzes: BUS-103, BUS-104, BUS-105, BUS-106' },
    { week: 5, term: 'T1 Foundation', technicalModules: 'ACA-102 (cont.)', businessModules: 'MKT-101, MKT-102, MKT-103, MKT-104', hoursFormatted: '4 / 24', technicalHours: 4, businessHours: 24, assessments: 'Quizzes: MKT-101, MKT-102, MKT-103, MKT-104' },
    { week: 6, term: 'T1 Foundation', technicalModules: 'ACA-102 (cont.)', businessModules: 'MKT-105, TEC-101, TEC-102, TEC-103', hoursFormatted: '4 / 24', technicalHours: 4, businessHours: 24, assessments: 'Quizzes: MKT-105, TEC-101, TEC-102, TEC-103' },
    { week: 7, term: 'T1 Foundation', technicalModules: 'ACA-102 (cont.)', businessModules: 'TEC-104, TEC-105, FIN-101, FIN-102', hoursFormatted: '4 / 24', technicalHours: 4, businessHours: 24, assessments: 'Quizzes: TEC-104, TEC-105, FIN-101, FIN-102' },
    { week: 8, term: 'T1 Foundation', technicalModules: 'ACA-102, ACA-103 (cont.)', businessModules: 'FIN-103, FIN-104, FIN-105, LEG-101', hoursFormatted: '4 / 24', technicalHours: 4, businessHours: 24, assessments: 'Quizzes: ACA-102, FIN-103, FIN-104, FIN-105, LEG-101' },
    { week: 9, term: 'T1 Foundation', technicalModules: 'ACA-103', businessModules: 'LEG-102, LEG-103, LEG-104, LEG-105', hoursFormatted: '4 / 24', technicalHours: 4, businessHours: 24, assessments: 'Quizzes: ACA-103, LEG-102, LEG-103, LEG-104, LEG-105 · Level checkpoint · rubric review' },
    { week: 10, term: 'T2 Core Skill', technicalModules: 'ACA-201 (cont.)', businessModules: 'LSH-201, LSH-202, LSH-203, LSH-204', hoursFormatted: '3 / 24', technicalHours: 3, businessHours: 24, assessments: 'Quizzes: LSH-201, LSH-202, LSH-203, LSH-204' },
    { week: 11, term: 'T2 Core Skill', technicalModules: 'ACA-201 (cont.)', businessModules: 'LSH-205, PER-201, PER-202, PER-203', hoursFormatted: '3 / 24', technicalHours: 3, businessHours: 24, assessments: 'Quizzes: LSH-205, PER-201, PER-202, PER-203' },
    { week: 12, term: 'T2 Core Skill', technicalModules: 'ACA-201 (cont.)', businessModules: 'PER-204, PER-205, BUS-201, BUS-202', hoursFormatted: '3 / 24', technicalHours: 3, businessHours: 24, assessments: 'Quizzes: PER-204, PER-205, BUS-201, BUS-202' },
    { week: 13, term: 'T2 Core Skill', technicalModules: 'ACA-201 (cont.)', businessModules: 'BUS-203, BUS-204, BUS-205, BUS-206', hoursFormatted: '3 / 24', technicalHours: 3, businessHours: 24, assessments: 'Quizzes: BUS-203, BUS-204, BUS-205, BUS-206' },
    { week: 14, term: 'T2 Core Skill', technicalModules: 'ACA-201 (cont.)', businessModules: 'MKT-201, MKT-202, MKT-203, MKT-204', hoursFormatted: '3 / 24', technicalHours: 3, businessHours: 24, assessments: 'Quizzes: MKT-201, MKT-202, MKT-203, MKT-204' },
    { week: 15, term: 'T2 Core Skill', technicalModules: 'ACA-201 (cont.)', businessModules: 'MKT-205, TEC-201, TEC-202, TEC-203', hoursFormatted: '3 / 24', technicalHours: 3, businessHours: 24, assessments: 'Quizzes: MKT-205, TEC-201, TEC-202, TEC-203' },
    { week: 16, term: 'T2 Core Skill', technicalModules: 'ACA-201 (cont.)', businessModules: 'TEC-204, TEC-205, FIN-201, FIN-202', hoursFormatted: '3 / 24', technicalHours: 3, businessHours: 24, assessments: 'Quizzes: TEC-204, TEC-205, FIN-201, FIN-202' },
    { week: 17, term: 'T2 Core Skill', technicalModules: 'ACA-201 (cont.)', businessModules: 'FIN-203, FIN-204, FIN-205, LEG-201', hoursFormatted: '3 / 24', technicalHours: 3, businessHours: 24, assessments: 'Quizzes: FIN-203, FIN-204, FIN-205, LEG-201' },
    { week: 18, term: 'T2 Core Skill', technicalModules: 'ACA-201', businessModules: 'LEG-202, LEG-203, LEG-204, LEG-205', hoursFormatted: '3 / 24', technicalHours: 3, businessHours: 24, assessments: 'Quizzes: ACA-201, LEG-202, LEG-203, LEG-204, LEG-205 · Level checkpoint · rubric review' },
    { week: 19, term: 'T3 Advanced Skill', technicalModules: 'ACA-301 (cont.)', businessModules: 'LSH-301, LSH-302, LSH-303, LSH-304', hoursFormatted: '6 / 24', technicalHours: 6, businessHours: 24, assessments: 'Quizzes: LSH-301, LSH-302, LSH-303, LSH-304' },
    { week: 20, term: 'T3 Advanced Skill', technicalModules: 'ACA-301 (cont.)', businessModules: 'LSH-305, PER-301, PER-302, PER-303', hoursFormatted: '6 / 24', technicalHours: 6, businessHours: 24, assessments: 'Quizzes: LSH-305, PER-301, PER-302, PER-303' },
    { week: 21, term: 'T3 Advanced Skill', technicalModules: 'ACA-301 (cont.)', businessModules: 'PER-304, PER-305, BUS-301, BUS-302', hoursFormatted: '6 / 24', technicalHours: 6, businessHours: 24, assessments: 'Quizzes: PER-304, PER-305, BUS-301, BUS-302' },
    { week: 22, term: 'T3 Advanced Skill', technicalModules: 'ACA-301 (cont.)', businessModules: 'BUS-303, BUS-304, BUS-305, BUS-306', hoursFormatted: '6 / 24', technicalHours: 6, businessHours: 24, assessments: 'Quizzes: BUS-303, BUS-304, BUS-305, BUS-306' },
    { week: 23, term: 'T3 Advanced Skill', technicalModules: 'ACA-301 (cont.)', businessModules: 'MKT-301, MKT-302, MKT-303, MKT-304', hoursFormatted: '6 / 24', technicalHours: 6, businessHours: 24, assessments: 'Quizzes: MKT-301, MKT-302, MKT-303, MKT-304' },
    { week: 24, term: 'T3 Advanced Skill', technicalModules: 'ACA-301 (cont.)', businessModules: 'MKT-305, TEC-301, TEC-302, TEC-303', hoursFormatted: '6 / 24', technicalHours: 6, businessHours: 24, assessments: 'Quizzes: MKT-305, TEC-301, TEC-302, TEC-303' },
    { week: 25, term: 'T3 Advanced Skill', technicalModules: 'ACA-301 (cont.)', businessModules: 'TEC-304, TEC-305, FIN-301, FIN-302', hoursFormatted: '6 / 24', technicalHours: 6, businessHours: 24, assessments: 'Quizzes: TEC-304, TEC-305, FIN-301, FIN-302' },
    { week: 26, term: 'T3 Advanced Skill', technicalModules: 'ACA-301 (cont.)', businessModules: 'FIN-303, FIN-304, FIN-305, LEG-301', hoursFormatted: '6 / 24', technicalHours: 6, businessHours: 24, assessments: 'Quizzes: FIN-303, FIN-304, FIN-305, LEG-301' },
    { week: 27, term: 'T3 Advanced Skill', technicalModules: 'ACA-301', businessModules: 'LEG-302, LEG-303, LEG-304, LEG-305', hoursFormatted: '6 / 24', technicalHours: 6, businessHours: 24, assessments: 'Quizzes: ACA-301, LEG-302, LEG-303, LEG-304, LEG-305 · Level checkpoint · rubric review' },
    { week: 28, term: 'T4 Capstone', technicalModules: '—', businessModules: 'LSH-401, LSH-402, LSH-403, LSH-404, LSH-405 (cont.)', hoursFormatted: '0 / 29', technicalHours: 0, businessHours: 29, assessments: 'Quizzes: LSH-401, LSH-402, LSH-403, LSH-404' },
    { week: 29, term: 'T4 Capstone', technicalModules: '—', businessModules: 'LSH-405, PER-401, PER-402, PER-403, PER-404, PER-405 (cont.)', hoursFormatted: '0 / 29', technicalHours: 0, businessHours: 29, assessments: 'Quizzes: LSH-405, PER-401, PER-402, PER-403, PER-404' },
    { week: 30, term: 'T4 Capstone', technicalModules: '—', businessModules: 'PER-405, BUS-401, BUS-402, BUS-403, BUS-404, BUS-405 (cont.)', hoursFormatted: '0 / 29', technicalHours: 0, businessHours: 29, assessments: 'Quizzes: PER-405, BUS-401, BUS-402, BUS-403, BUS-404' },
    { week: 31, term: 'T4 Capstone', technicalModules: '—', businessModules: 'BUS-405, BUS-406, MKT-401, MKT-402, MKT-403', hoursFormatted: '0 / 29', technicalHours: 0, businessHours: 29, assessments: 'Quizzes: BUS-405, BUS-406, MKT-401, MKT-402, MKT-403' },
    { week: 32, term: 'T4 Capstone', technicalModules: '—', businessModules: 'MKT-404, MKT-405, TEC-401, TEC-402, TEC-403 (cont.)', hoursFormatted: '0 / 29', technicalHours: 0, businessHours: 29, assessments: 'Quizzes: MKT-404, MKT-405, TEC-401, TEC-402' },
    { week: 33, term: 'T4 Capstone', technicalModules: '—', businessModules: 'TEC-403, TEC-404, TEC-405, FIN-401, FIN-402, FIN-403 (cont.)', hoursFormatted: '0 / 29', technicalHours: 0, businessHours: 29, assessments: 'Quizzes: TEC-403, TEC-404, TEC-405, FIN-401, FIN-402' },
    { week: 34, term: 'T4 Capstone', technicalModules: '—', businessModules: 'FIN-403, FIN-404, FIN-405, LEG-401, LEG-402, LEG-403 (cont.)', hoursFormatted: '0 / 29', technicalHours: 0, businessHours: 29, assessments: 'Quizzes: FIN-403, FIN-404, FIN-405, LEG-401, LEG-402' },
    { week: 35, term: 'T4 Capstone', technicalModules: '—', businessModules: 'LEG-403, LEG-404, LEG-405, ACA-BIZ', hoursFormatted: '0 / 29', technicalHours: 0, businessHours: 29, assessments: 'Quizzes: LEG-403, LEG-404, LEG-405, ACA-BIZ · Level checkpoint · rubric review · Capstone panel · practicum sign-off' },
  ],
  assessmentCalendar: [
    { point: 'Module quizzes and checkpoints', when: 'Week each module closes (see schedule)', instrument: 'Final quiz + 2 checkpoints + capstone artifact', passStandard: '≥ 80%; artifact accepted' },
    { point: 'Level checkpoint 1', when: 'Last week of Term 1', instrument: 'Competency Rubric rows for that level; attendance audit', passStandard: 'Competent on all rows; ≥ 95% attendance' },
    { point: 'Level checkpoint 2', when: 'Last week of Term 2', instrument: 'Competency Rubric rows for that level; attendance audit', passStandard: 'Competent on all rows; ≥ 95% attendance' },
    { point: 'Level checkpoint 3', when: 'Last week of Term 3', instrument: 'Competency Rubric rows for that level; attendance audit', passStandard: 'Competent on all rows; ≥ 95% attendance' },
    { point: 'Level checkpoint 4', when: 'Last week of Term 4', instrument: 'Competency Rubric rows for that level; attendance audit', passStandard: 'Competent on all rows; ≥ 95% attendance' },
    { point: 'Safety-critical sign-off', when: 'Before first live-animal service', instrument: 'Instructor checklist (handling, sanitation, CPR/First Aid)', passStandard: 'Pass/fail' },
    { point: 'Practicum', when: 'Final term', instrument: 'Supervised practicum log', passStandard: 'Minimums met and supervisor signature' },
    { point: 'Applied business capstone', when: 'Final week — ACA-BIZ', instrument: 'Instructor + owner panel', passStandard: 'Launch plan, price menu, licensing/insurance worksheet, 90-day calendar accepted' },
  ],
  careerOutcomes: [],
  rubricDomains: [],
  faqs: [],
};

// =========================================================================
// B4. SYLLABUS — PROFESSIONAL PET SITTER (PPS)
// Source: Program Delivery Guide, Section B4 (lines 2456–2661).
// =========================================================================
export const PPS_SYLLABUS: ProgramData = {
  code: 'PPS',
  programName: 'Professional Pet Sitter',
  credentialTitle: 'Pet Sitter Certificate (Certificate)',
  totalClockHours: 56,
  technicalHours: 14,
  businessHours: 36,
  appliedHours: 6,
  scheduledWeeks: 2,
  partTimeWeeks: 4,
  scheduleTemplate: SCHEDULE_TEMPLATE_FULL_TIME,
  programObjective:
    'Introduce and choose appropriate clients · Provide multi-species pet care · Handle pets and sanitation safely · Provide CPR and first aid · Launch and run a compliant, insured pet-sitting business.',
  admissionRequirements: [
    'Age 18+',
    'background check (in-home client access)',
    'reliable transportation',
    'signed animal-handling risk acknowledgement',
  ],
  attendancePolicy: ATTENDANCE_POLICY,
  gradingStandards: GRADING_STANDARDS,
  safetyGates: [
    { code: 'PPS-104', title: '', stage: 'Term 1', requirement: 'Signed off before live-animal work', isMandatoryBeforeLiveWork: true },
    { code: 'PPS-105', title: '', stage: 'Term 1', requirement: 'Signed off before live-animal work', isMandatoryBeforeLiveWork: true },
  ],
  practicumMinimums: '',
  completionRequirements: [
    'All 11 modules',
    '56 clock hours recorded',
    'rubric Competent',
    'PPS-BIZ capstone passed by panel',
  ],
  stacksInto: 'ACA, IPDG, PDT or PPC (PPS-101–105 and the 6 micro-owner modules credited)',
  weeklySchedule: [
    { week: 1, term: 'T1 All levels', technicalModules: 'PPS-101, PPS-102, PPS-104, PPS-105 (cont.)', businessModules: 'BUS-101, FIN-101, LEG-101, LEG-103 (cont.)', hoursFormatted: '7 / 21', technicalHours: 7, businessHours: 21, assessments: 'Quizzes: PPS-101, PPS-102, PPS-104, BUS-101, FIN-101, LEG-101' },
    { week: 2, term: 'T1 All levels', technicalModules: 'PPS-105', businessModules: 'LEG-103, BUS-203, MKT-304, PPS-BIZ', hoursFormatted: '7 / 21', technicalHours: 7, businessHours: 21, assessments: 'Quizzes: PPS-105, LEG-103, BUS-203, MKT-304, PPS-BIZ · Level checkpoint · rubric review · Capstone panel · practicum sign-off' },
  ],
  assessmentCalendar: [
    { point: 'Module quizzes and checkpoints', when: 'Week each module closes (see schedule)', instrument: 'Final quiz + 2 checkpoints + capstone artifact', passStandard: '≥ 80%; artifact accepted' },
    { point: 'Level checkpoint 1', when: 'Last week of Term 1', instrument: 'Competency Rubric rows for that level; attendance audit', passStandard: 'Competent on all rows; ≥ 95% attendance' },
    { point: 'Level checkpoint 2', when: 'Last week of Term 2', instrument: 'Competency Rubric rows for that level; attendance audit', passStandard: 'Competent on all rows; ≥ 95% attendance' },
    { point: 'Level checkpoint 3', when: 'Last week of Term 3', instrument: 'Competency Rubric rows for that level; attendance audit', passStandard: 'Competent on all rows; ≥ 95% attendance' },
    { point: 'Level checkpoint 4', when: 'Last week of Term 4', instrument: 'Competency Rubric rows for that level; attendance audit', passStandard: 'Competent on all rows; ≥ 95% attendance' },
    { point: 'Safety-critical sign-off', when: 'Before first live-animal service', instrument: 'Instructor checklist (handling, sanitation, CPR/First Aid)', passStandard: 'Pass/fail' },
    { point: 'Applied business capstone', when: 'Final week — PPS-BIZ', instrument: 'Instructor + owner panel', passStandard: 'Launch plan, price menu, licensing/insurance worksheet, 90-day calendar accepted' },
  ],
  careerOutcomes: [],
  rubricDomains: [],
  faqs: [],
};

// =========================================================================
// B5. SYLLABUS — PROFESSIONAL CAT GROOMER (CAT)
// Source: Program Delivery Guide, Section B5 (lines 2663–2860).
// =========================================================================
export const CAT_SYLLABUS: ProgramData = {
  code: 'CAT',
  programName: 'Professional Cat Groomer',
  credentialTitle: 'Professional Cat Groomer Certificate (Certificate)',
  totalClockHours: 58,
  technicalHours: 16,
  businessHours: 36,
  appliedHours: 6,
  scheduledWeeks: 2,
  partTimeWeeks: 4,
  scheduleTemplate: SCHEDULE_TEMPLATE_FULL_TIME,
  programObjective:
    'Recognize cat breeds · Read cat temperament and handle safely · Bathe and dry cats safely · Perform short, long and shave-down cat grooms · Add a profitable, safe cat-grooming service line to a business.',
  admissionRequirements: [
    'Age 18+',
    'prior grooming experience or ACA/IPDG enrollment recommended',
    'signed animal-handling risk acknowledgement',
  ],
  attendancePolicy: ATTENDANCE_POLICY,
  gradingStandards: GRADING_STANDARDS,
  safetyGates: [
    { code: 'CAT-102', title: '', stage: 'Term 1', requirement: 'Signed off before live-animal work', isMandatoryBeforeLiveWork: true },
  ],
  practicumMinimums: '',
  completionRequirements: [
    'All 11 modules',
    '58 clock hours recorded',
    'rubric Competent',
    'CAT-BIZ capstone passed by panel',
  ],
  stacksInto: 'IPDG or PPC (CAT-101–104 and the 6 micro-owner modules credited)',
  weeklySchedule: [
    { week: 1, term: 'T1 All levels', technicalModules: 'CAT-101, CAT-102', businessModules: 'BUS-101, FIN-101, LEG-101, LEG-103 (cont.)', hoursFormatted: '8 / 21', technicalHours: 8, businessHours: 21, assessments: 'Quizzes: CAT-101, CAT-102, BUS-101, FIN-101, LEG-101' },
    { week: 2, term: 'T1 All levels', technicalModules: 'CAT-103, CAT-104', businessModules: 'LEG-103, BUS-203, MKT-304, CAT-BIZ', hoursFormatted: '8 / 21', technicalHours: 8, businessHours: 21, assessments: 'Quizzes: CAT-103, CAT-104, LEG-103, BUS-203, MKT-304, CAT-BIZ · Level checkpoint · rubric review · Capstone panel · practicum sign-off' },
  ],
  assessmentCalendar: [
    { point: 'Module quizzes and checkpoints', when: 'Week each module closes (see schedule)', instrument: 'Final quiz + 2 checkpoints + capstone artifact', passStandard: '≥ 80%; artifact accepted' },
    { point: 'Level checkpoint 1', when: 'Last week of Term 1', instrument: 'Competency Rubric rows for that level; attendance audit', passStandard: 'Competent on all rows; ≥ 95% attendance' },
    { point: 'Level checkpoint 2', when: 'Last week of Term 2', instrument: 'Competency Rubric rows for that level; attendance audit', passStandard: 'Competent on all rows; ≥ 95% attendance' },
    { point: 'Level checkpoint 3', when: 'Last week of Term 3', instrument: 'Competency Rubric rows for that level; attendance audit', passStandard: 'Competent on all rows; ≥ 95% attendance' },
    { point: 'Level checkpoint 4', when: 'Last week of Term 4', instrument: 'Competency Rubric rows for that level; attendance audit', passStandard: 'Competent on all rows; ≥ 95% attendance' },
    { point: 'Safety-critical sign-off', when: 'Before first live-animal service', instrument: 'Instructor checklist (handling, sanitation, CPR/First Aid)', passStandard: 'Pass/fail' },
    { point: 'Applied business capstone', when: 'Final week — CAT-BIZ', instrument: 'Instructor + owner panel', passStandard: 'Launch plan, price menu, licensing/insurance worksheet, 90-day calendar accepted' },
  ],
  careerOutcomes: [],
  rubricDomains: [],
  faqs: [],
};

// =========================================================================
// B6. SYLLABUS — PROFESSIONAL PET CARE & BUSINESS OWNERSHIP (PPC)
// Source: Program Delivery Guide, Section B6 (lines 2862–3615).
// =========================================================================
export const PPC_SYLLABUS: ProgramData = {
  code: 'PPC',
  programName: 'Professional Pet Care & Business Ownership',
  credentialTitle: 'Professional Pet Care & Business Ownership — Advanced Diploma (Advanced Diploma)',
  totalClockHours: 1500,
  technicalHours: 600,
  businessHours: 864,
  appliedHours: 36,
  scheduledWeeks: 52,
  partTimeWeeks: 100,
  scheduleTemplate: SCHEDULE_TEMPLATE_FULL_TIME,
  programObjective:
    'All IPDG, PDT, PPS and CAT technical objectives · A multi-service practicum across salon floor, training floor and pet-sitting visits · Master the full Business & Personal Mastery spine (LSH, PER, BUS, MKT, TEC, FIN, LEG) · Launch, fund, staff, market, protect and scale a multi-service pet-care enterprise · Master personal life systems, finances and well-being as a whole-person owner · Provide CPR and first aid.',
  admissionRequirements: [
    'Age 18+ (17 with guardian consent)',
    'high-school diploma, GED or ability-to-benefit assessment',
    'physical ability to lift 40 lb and stand for lab blocks',
    'signed animal-handling risk acknowledgement',
  ],
  attendancePolicy: ATTENDANCE_POLICY,
  gradingStandards: GRADING_STANDARDS,
  safetyGates: [
    { code: 'PPC-105', title: '', stage: 'Term 1', requirement: 'Signed off before live-animal work', isMandatoryBeforeLiveWork: true },
    { code: 'PPC-201', title: '', stage: 'Term 2', requirement: 'Signed off before live-animal work', isMandatoryBeforeLiveWork: true },
    { code: 'PPC-306', title: '', stage: 'Term 3', requirement: 'Signed off before live-animal work', isMandatoryBeforeLiveWork: true },
    { code: 'PPC-403', title: '', stage: 'Term 4', requirement: 'Signed off before live-animal work', isMandatoryBeforeLiveWork: true },
    { code: 'PPC-405', title: '', stage: 'Term 4', requirement: 'Signed off before live-animal work', isMandatoryBeforeLiveWork: true },
    { code: 'PPC-410', title: '', stage: 'Term 4', requirement: 'Signed off before live-animal work; CPR/First Aid before practicum', isMandatoryBeforeLiveWork: true },
  ],
  practicumMinimums: PRACTICUM_MINIMUMS,
  completionRequirements: [
    'All 172 modules',
    '1,500 clock hours recorded',
    'rubric Competent',
    'PPC-BIZ capstone passed by panel',
    'practicum log signed',
  ],
  stacksInto: 'Terminal credential',
  weeklySchedule: [
    { week: 1, term: 'T1 Foundation', technicalModules: 'PPC-101 (cont.)', businessModules: 'LSH-101, LSH-102, LSH-103', hoursFormatted: '10 / 18', technicalHours: 10, businessHours: 18, assessments: 'Quizzes: LSH-101, LSH-102, LSH-103' },
    { week: 2, term: 'T1 Foundation', technicalModules: 'PPC-101, PPC-102 (cont.)', businessModules: 'LSH-104, LSH-105, PER-101', hoursFormatted: '10 / 18', technicalHours: 10, businessHours: 18, assessments: 'Quizzes: PPC-101, LSH-104, LSH-105, PER-101' },
    { week: 3, term: 'T1 Foundation', technicalModules: 'PPC-102 (cont.)', businessModules: 'PER-102, PER-103, PER-104', hoursFormatted: '10 / 18', technicalHours: 10, businessHours: 18, assessments: 'Quizzes: PER-102, PER-103, PER-104' },
    { week: 4, term: 'T1 Foundation', technicalModules: 'PPC-102, PPC-103 (cont.)', businessModules: 'PER-105, BUS-101, BUS-102', hoursFormatted: '10 / 18', technicalHours: 10, businessHours: 18, assessments: 'Quizzes: PPC-102, PER-105, BUS-101, BUS-102' },
    { week: 5, term: 'T1 Foundation', technicalModules: 'PPC-103, PPC-104 (cont.)', businessModules: 'BUS-103, BUS-104, BUS-105', hoursFormatted: '10 / 18', technicalHours: 10, businessHours: 18, assessments: 'Quizzes: PPC-103, BUS-103, BUS-104, BUS-105' },
    { week: 6, term: 'T1 Foundation', technicalModules: 'PPC-104 (cont.)', businessModules: 'BUS-106, MKT-101, MKT-102', hoursFormatted: '10 / 18', technicalHours: 10, businessHours: 18, assessments: 'Quizzes: BUS-106, MKT-101, MKT-102' },
    { week: 7, term: 'T1 Foundation', technicalModules: 'PPC-104, PPC-105 (cont.)', businessModules: 'MKT-103, MKT-104, MKT-105', hoursFormatted: '10 / 18', technicalHours: 10, businessHours: 18, assessments: 'Quizzes: PPC-104, MKT-103, MKT-104, MKT-105' },
    { week: 8, term: 'T1 Foundation', technicalModules: 'PPC-105 (cont.)', businessModules: 'TEC-101, TEC-102, TEC-103', hoursFormatted: '10 / 18', technicalHours: 10, businessHours: 18, assessments: 'Quizzes: TEC-101, TEC-102, TEC-103' },
    { week: 9, term: 'T1 Foundation', technicalModules: 'PPC-105 (cont.)', businessModules: 'TEC-104, TEC-105, FIN-101', hoursFormatted: '10 / 18', technicalHours: 10, businessHours: 18, assessments: 'Quizzes: TEC-104, TEC-105, FIN-101' },
    { week: 10, term: 'T1 Foundation', technicalModules: 'PPC-105, PPC-106 (cont.)', businessModules: 'FIN-102, FIN-103, FIN-104', hoursFormatted: '10 / 18', technicalHours: 10, businessHours: 18, assessments: 'Quizzes: PPC-105, FIN-102, FIN-103, FIN-104' },
    { week: 11, term: 'T1 Foundation', technicalModules: 'PPC-106 (cont.)', businessModules: 'FIN-105, LEG-101, LEG-102', hoursFormatted: '10 / 18', technicalHours: 10, businessHours: 18, assessments: 'Quizzes: FIN-105, LEG-101, LEG-102' },
    { week: 12, term: 'T1 Foundation', technicalModules: 'PPC-106', businessModules: 'LEG-103, LEG-104, LEG-105', hoursFormatted: '10 / 18', technicalHours: 10, businessHours: 18, assessments: 'Quizzes: PPC-106, LEG-103, LEG-104, LEG-105 · Level checkpoint · rubric review' },
    { week: 13, term: 'T2 Core Skill', technicalModules: 'PPC-201 (cont.)', businessModules: 'LSH-201, LSH-202, LSH-203 (cont.)', hoursFormatted: '13 / 17', technicalHours: 13, businessHours: 17, assessments: 'Quizzes: LSH-201, LSH-202' },
    { week: 14, term: 'T2 Core Skill', technicalModules: 'PPC-201, PPC-202 (cont.)', businessModules: 'LSH-203, LSH-204, LSH-205, PER-201 (cont.)', hoursFormatted: '13 / 17', technicalHours: 13, businessHours: 17, assessments: 'Quizzes: PPC-201, LSH-203, LSH-204, LSH-205' },
    { week: 15, term: 'T2 Core Skill', technicalModules: 'PPC-202 (cont.)', businessModules: 'PER-201, PER-202, PER-203, PER-204 (cont.)', hoursFormatted: '13 / 17', technicalHours: 13, businessHours: 17, assessments: 'Quizzes: PER-201, PER-202, PER-203' },
    { week: 16, term: 'T2 Core Skill', technicalModules: 'PPC-202, PPC-203 (cont.)', businessModules: 'PER-204, PER-205, BUS-201, BUS-202 (cont.)', hoursFormatted: '13 / 17', technicalHours: 13, businessHours: 17, assessments: 'Quizzes: PPC-202, PER-204, PER-205, BUS-201' },
    { week: 17, term: 'T2 Core Skill', technicalModules: 'PPC-203 (cont.)', businessModules: 'BUS-202, BUS-203, BUS-204 (cont.)', hoursFormatted: '13 / 17', technicalHours: 13, businessHours: 17, assessments: 'Quizzes: BUS-202, BUS-203' },
    { week: 18, term: 'T2 Core Skill', technicalModules: 'PPC-203 (cont.)', businessModules: 'BUS-204, BUS-205, BUS-206, MKT-201 (cont.)', hoursFormatted: '13 / 17', technicalHours: 13, businessHours: 17, assessments: 'Quizzes: BUS-204, BUS-205, BUS-206' },
    { week: 19, term: 'T2 Core Skill', technicalModules: 'PPC-203, PPC-204 (cont.)', businessModules: 'MKT-201, MKT-202, MKT-203, MKT-204 (cont.)', hoursFormatted: '13 / 17', technicalHours: 13, businessHours: 17, assessments: 'Quizzes: PPC-203, MKT-201, MKT-202, MKT-203' },
    { week: 20, term: 'T2 Core Skill', technicalModules: 'PPC-204 (cont.)', businessModules: 'MKT-204, MKT-205, TEC-201, TEC-202 (cont.)', hoursFormatted: '13 / 17', technicalHours: 13, businessHours: 17, assessments: 'Quizzes: MKT-204, MKT-205, TEC-201' },
    { week: 21, term: 'T2 Core Skill', technicalModules: 'PPC-204 (cont.)', businessModules: 'TEC-202, TEC-203, TEC-204 (cont.)', hoursFormatted: '13 / 17', technicalHours: 13, businessHours: 17, assessments: 'Quizzes: TEC-202, TEC-203' },
    { week: 22, term: 'T2 Core Skill', technicalModules: 'PPC-204, PPC-205 (cont.)', businessModules: 'TEC-204, TEC-205, FIN-201, FIN-202 (cont.)', hoursFormatted: '13 / 17', technicalHours: 13, businessHours: 17, assessments: 'Quizzes: PPC-204, TEC-204, TEC-205, FIN-201' },
    { week: 23, term: 'T2 Core Skill', technicalModules: 'PPC-205 (cont.)', businessModules: 'FIN-202, FIN-203, FIN-204, FIN-205 (cont.)', hoursFormatted: '13 / 17', technicalHours: 13, businessHours: 17, assessments: 'Quizzes: FIN-202, FIN-203, FIN-204' },
    { week: 24, term: 'T2 Core Skill', technicalModules: 'PPC-205 (cont.)', businessModules: 'FIN-205, LEG-201, LEG-202, LEG-203 (cont.)', hoursFormatted: '13 / 17', technicalHours: 13, businessHours: 17, assessments: 'Quizzes: FIN-205, LEG-201, LEG-202' },
    { week: 25, term: 'T2 Core Skill', technicalModules: 'PPC-205', businessModules: 'LEG-203, LEG-204, LEG-205', hoursFormatted: '13 / 17', technicalHours: 13, businessHours: 17, assessments: 'Quizzes: PPC-205, LEG-203, LEG-204, LEG-205 · Level checkpoint · rubric review' },
    { week: 26, term: 'T3 Advanced Skill', technicalModules: 'PPC-301 (cont.)', businessModules: 'LSH-301, LSH-302, LSH-303 (cont.)', hoursFormatted: '15 / 14', technicalHours: 15, businessHours: 14, assessments: 'Quizzes: LSH-301, LSH-302' },
    { week: 27, term: 'T3 Advanced Skill', technicalModules: 'PPC-301, PPC-302 (cont.)', businessModules: 'LSH-303, LSH-304, LSH-305 (cont.)', hoursFormatted: '15 / 14', technicalHours: 15, businessHours: 14, assessments: 'Quizzes: PPC-301, LSH-303, LSH-304' },
    { week: 28, term: 'T3 Advanced Skill', technicalModules: 'PPC-302', businessModules: 'LSH-305, PER-301, PER-302, PER-303 (cont.)', hoursFormatted: '15 / 14', technicalHours: 15, businessHours: 14, assessments: 'Quizzes: PPC-302, LSH-305, PER-301, PER-302' },
    { week: 29, term: 'T3 Advanced Skill', technicalModules: 'PPC-303 (cont.)', businessModules: 'PER-303, PER-304, PER-305 (cont.)', hoursFormatted: '15 / 14', technicalHours: 15, businessHours: 14, assessments: 'Quizzes: PER-303, PER-304' },
    { week: 30, term: 'T3 Advanced Skill', technicalModules: 'PPC-303', businessModules: 'PER-305, BUS-301, BUS-302', hoursFormatted: '15 / 14', technicalHours: 15, businessHours: 14, assessments: 'Quizzes: PPC-303, PER-305, BUS-301, BUS-302' },
    { week: 31, term: 'T3 Advanced Skill', technicalModules: 'PPC-304 (cont.)', businessModules: 'BUS-303, BUS-304, BUS-305 (cont.)', hoursFormatted: '15 / 14', technicalHours: 15, businessHours: 14, assessments: 'Quizzes: BUS-303, BUS-304' },
    { week: 32, term: 'T3 Advanced Skill', technicalModules: 'PPC-304, PPC-305 (cont.)', businessModules: 'BUS-305, BUS-306, MKT-301 (cont.)', hoursFormatted: '15 / 14', technicalHours: 15, businessHours: 14, assessments: 'Quizzes: PPC-304, BUS-305, BUS-306' },
    { week: 33, term: 'T3 Advanced Skill', technicalModules: 'PPC-305 (cont.)', businessModules: 'MKT-301, MKT-302, MKT-303, MKT-304 (cont.)', hoursFormatted: '15 / 14', technicalHours: 15, businessHours: 14, assessments: 'Quizzes: MKT-301, MKT-302, MKT-303' },
    { week: 34, term: 'T3 Advanced Skill', technicalModules: 'PPC-305 (cont.)', businessModules: 'MKT-304, MKT-305, TEC-301 (cont.)', hoursFormatted: '15 / 14', technicalHours: 15, businessHours: 14, assessments: 'Quizzes: MKT-304, MKT-305' },
    { week: 35, term: 'T3 Advanced Skill', technicalModules: 'PPC-305 (cont.)', businessModules: 'TEC-301, TEC-302, TEC-303', hoursFormatted: '15 / 14', technicalHours: 15, businessHours: 14, assessments: 'Quizzes: TEC-301, TEC-302, TEC-303' },
    { week: 36, term: 'T3 Advanced Skill', technicalModules: 'PPC-305 (cont.)', businessModules: 'TEC-304, TEC-305, FIN-301 (cont.)', hoursFormatted: '15 / 14', technicalHours: 15, businessHours: 14, assessments: 'Quizzes: TEC-304, TEC-305' },
    { week: 37, term: 'T3 Advanced Skill', technicalModules: 'PPC-305 (cont.)', businessModules: 'FIN-301, FIN-302, FIN-303 (cont.)', hoursFormatted: '15 / 14', technicalHours: 15, businessHours: 14, assessments: 'Quizzes: FIN-301, FIN-302' },
    { week: 38, term: 'T3 Advanced Skill', technicalModules: 'PPC-305 (cont.)', businessModules: 'FIN-303, FIN-304, FIN-305, LEG-301 (cont.)', hoursFormatted: '15 / 14', technicalHours: 15, businessHours: 14, assessments: 'Quizzes: FIN-303, FIN-304, FIN-305' },
    { week: 39, term: 'T3 Advanced Skill', technicalModules: 'PPC-305 (cont.)', businessModules: 'LEG-301, LEG-302, LEG-303 (cont.)', hoursFormatted: '15 / 14', technicalHours: 15, businessHours: 14, assessments: 'Quizzes: LEG-301, LEG-302' },
    { week: 40, term: 'T3 Advanced Skill', technicalModules: 'PPC-305, PPC-306', businessModules: 'LEG-303, LEG-304, LEG-305', hoursFormatted: '15 / 14', technicalHours: 15, businessHours: 14, assessments: 'Quizzes: PPC-305, PPC-306, LEG-303, LEG-304, LEG-305 · Level checkpoint · rubric review' },
    { week: 41, term: 'T4 Capstone', technicalModules: 'PPC-401, PPC-402, PPC-403, PPC-404, PPC-405 (cont.)', businessModules: 'LSH-401, LSH-402, LSH-403, LSH-404 (cont.)', hoursFormatted: '8 / 21', technicalHours: 8, businessHours: 21, assessments: 'Quizzes: PPC-401, PPC-402, PPC-403, PPC-404, LSH-401, LSH-402, LSH-403' },
    { week: 42, term: 'T4 Capstone', technicalModules: 'PPC-405, PPC-406 (cont.)', businessModules: 'LSH-404, LSH-405, PER-401, PER-402', hoursFormatted: '8 / 21', technicalHours: 8, businessHours: 21, assessments: 'Quizzes: PPC-405, LSH-404, LSH-405, PER-401, PER-402' },
    { week: 43, term: 'T4 Capstone', technicalModules: 'PPC-406, PPC-407, PPC-408 (cont.)', businessModules: 'PER-403, PER-404, PER-405, BUS-401 (cont.)', hoursFormatted: '8 / 21', technicalHours: 8, businessHours: 21, assessments: 'Quizzes: PPC-406, PPC-407, PER-403, PER-404, PER-405' },
    { week: 44, term: 'T4 Capstone', technicalModules: 'PPC-408, PPC-409 (cont.)', businessModules: 'BUS-401, BUS-402, BUS-403, BUS-404', hoursFormatted: '8 / 21', technicalHours: 8, businessHours: 21, assessments: 'Quizzes: PPC-408, BUS-401, BUS-402, BUS-403, BUS-404' },
    { week: 45, term: 'T4 Capstone', technicalModules: 'PPC-409 (cont.)', businessModules: 'BUS-405, BUS-406, MKT-401, MKT-402 (cont.)', hoursFormatted: '8 / 21', technicalHours: 8, businessHours: 21, assessments: 'Quizzes: BUS-405, BUS-406, MKT-401' },
    { week: 46, term: 'T4 Capstone', technicalModules: 'PPC-409 (cont.)', businessModules: 'MKT-402, MKT-403, MKT-404, MKT-405', hoursFormatted: '8 / 21', technicalHours: 8, businessHours: 21, assessments: 'Quizzes: MKT-402, MKT-403, MKT-404, MKT-405' },
    { week: 47, term: 'T4 Capstone', technicalModules: 'PPC-409 (cont.)', businessModules: 'TEC-401, TEC-402, TEC-403, TEC-404 (cont.)', hoursFormatted: '8 / 21', technicalHours: 8, businessHours: 21, assessments: 'Quizzes: TEC-401, TEC-402, TEC-403' },
    { week: 48, term: 'T4 Capstone', technicalModules: 'PPC-409 (cont.)', businessModules: 'TEC-404, TEC-405, FIN-401, FIN-402', hoursFormatted: '8 / 21', technicalHours: 8, businessHours: 21, assessments: 'Quizzes: TEC-404, TEC-405, FIN-401, FIN-402' },
    { week: 49, term: 'T4 Capstone', technicalModules: 'PPC-409 (cont.)', businessModules: 'FIN-403, FIN-404, FIN-405, LEG-401 (cont.)', hoursFormatted: '8 / 21', technicalHours: 8, businessHours: 21, assessments: 'Quizzes: FIN-403, FIN-404, FIN-405' },
    { week: 50, term: 'T4 Capstone', technicalModules: 'PPC-409 (cont.)', businessModules: 'LEG-401, LEG-402, LEG-403, LEG-404', hoursFormatted: '8 / 21', technicalHours: 8, businessHours: 21, assessments: 'Quizzes: LEG-401, LEG-402, LEG-403, LEG-404' },
    { week: 51, term: 'T4 Capstone', technicalModules: 'PPC-409, PPC-410 (cont.)', businessModules: 'LEG-405, PPC-BIZ (cont.)', hoursFormatted: '8 / 21', technicalHours: 8, businessHours: 21, assessments: 'Quizzes: PPC-409, LEG-405' },
    { week: 52, term: 'T4 Capstone', technicalModules: 'PPC-410', businessModules: 'PPC-BIZ', hoursFormatted: '8 / 21', technicalHours: 8, businessHours: 21, assessments: 'Quizzes: PPC-410, PPC-BIZ · Level checkpoint · rubric review · Capstone panel · practicum sign-off' },
  ],
  assessmentCalendar: [
    { point: 'Module quizzes and checkpoints', when: 'Week each module closes (see schedule)', instrument: 'Final quiz + 2 checkpoints + capstone artifact', passStandard: '≥ 80%; artifact accepted' },
    { point: 'Level checkpoint 1', when: 'Last week of Term 1', instrument: 'Competency Rubric rows for that level; attendance audit', passStandard: 'Competent on all rows; ≥ 95% attendance' },
    { point: 'Level checkpoint 2', when: 'Last week of Term 2', instrument: 'Competency Rubric rows for that level; attendance audit', passStandard: 'Competent on all rows; ≥ 95% attendance' },
    { point: 'Level checkpoint 3', when: 'Last week of Term 3', instrument: 'Competency Rubric rows for that level; attendance audit', passStandard: 'Competent on all rows; ≥ 95% attendance' },
    { point: 'Level checkpoint 4', when: 'Last week of Term 4', instrument: 'Competency Rubric rows for that level; attendance audit', passStandard: 'Competent on all rows; ≥ 95% attendance' },
    { point: 'Safety-critical sign-off', when: 'Before first live-animal service', instrument: 'Instructor checklist (handling, sanitation, CPR/First Aid)', passStandard: 'Pass/fail' },
    { point: 'Practicum', when: 'Final term', instrument: 'Supervised practicum log', passStandard: 'Minimums met and supervisor signature' },
    { point: 'Applied business capstone', when: 'Final week — PPC-BIZ', instrument: 'Instructor + owner panel', passStandard: 'Launch plan, price menu, licensing/insurance worksheet, 90-day calendar accepted' },
  ],
  careerOutcomes: [],
  rubricDomains: [],
  faqs: [],
};

// =========================================================================
// Lookup map — supports both upper-case (program.code) and lower-case (program.id) keys.
// =========================================================================
export const ALL_PROGRAM_SYLLABI: Record<string, ProgramData> = {
  IPDG: IPDG_SYLLABUS,
  PDT: PDT_SYLLABUS,
  ACA: ACA_SYLLABUS,
  PPS: PPS_SYLLABUS,
  CAT: CAT_SYLLABUS,
  PPC: PPC_SYLLABUS,
  ipdg: IPDG_SYLLABUS,
  pdt: PDT_SYLLABUS,
  aca: ACA_SYLLABUS,
  pps: PPS_SYLLABUS,
  cat: CAT_SYLLABUS,
  ppc: PPC_SYLLABUS,
};
