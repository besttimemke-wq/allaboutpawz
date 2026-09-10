/**
 * Accreditation Standards — the REAL requirements, honestly mapped.
 *
 * This module is the single source of truth for what each accreditation body
 * actually requires, and whether our system currently produces evidence for it.
 *
 * CRITICAL DISTINCTION:
 * - "Accredited" = a body has reviewed and approved us. WE ARE NOT ACCREDITED.
 * - "Accreditation-ready" = our system produces evidence that maps to the
 *   standard's requirements. THIS is what we can honestly claim.
 *
 * The badges in the footer/catalog must say "Aligned to" or "Building toward",
 * NEVER "Accredited by" or "X CEUs" (for IACET) until authorization is granted.
 *
 * Bodies covered:
 * - IACET (ANSI/IACET 1-2018) — CEU-granting authority. Most achievable.
 * - COE (Council on Occupational Education) — institutional accreditation.
 * - ACCSC (Accrediting Commission of Career Schools & Colleges) — institutional.
 * - SCORM — technical packaging standard (NOT an accreditation body).
 */

export type BodyKey = "IACET" | "COE" | "ACCSC" | "SCORM";

export type EvidenceStatus = "not-started" | "in-progress" | "ready" | "n/a";

export interface StandardRequirement {
  /** Stable id, e.g. "iacet-1-design" */
  id: string;
  /** The body that sets this requirement */
  body: BodyKey;
  /** Category within the standard, e.g. "1. Organizational Profile" */
  category: string;
  /** The actual requirement text (paraphrased from the standard) */
  requirement: string;
  /** What evidence our system must produce to satisfy it */
  evidenceNeeded: string;
  /** Where in our app that evidence lives (route/component name), if any */
  evidenceLocation?: string;
  /** Honest current status of our evidence */
  status: EvidenceStatus;
  /** Whether this is required for the body's authorization (vs. recommended) */
  required: boolean;
}

/**
 * ANSI/IACET 1-2018 — Standard for Continuing Education and Training.
 * Source: iacet.org. 8 categories. This is the path to legally issuing IACET CEUs.
 */
const IACET_REQUIREMENTS: StandardRequirement[] = [
  {
    id: "iacet-1-profile",
    body: "IACET",
    category: "1. Organizational Profile",
    requirement: "Maintain a documented organizational profile describing mission, scope of CE/T offerings, and the learners served.",
    evidenceNeeded: "Org profile document: mission, scope, learner populations, CE/T program inventory.",
    status: "in-progress",
    required: true,
  },
  {
    id: "iacet-2-responsibility",
    body: "IACET",
    category: "2. Responsibility and Control",
    requirement: "Designate a single individual responsible for the CE/T program and for compliance with the standard.",
    evidenceNeeded: "Named CE/T coordinator role + documented authority and reporting structure.",
    status: "not-started",
    required: true,
  },
  {
    id: "iacet-3-environment",
    body: "IACET",
    category: "3. The Learning Environment and Delivery",
    requirement: "Provide an appropriate learning environment and delivery methods suited to the learning outcomes and learners.",
    evidenceNeeded: "Delivery method documentation per course (online, AI-tutored) + accessibility statement.",
    evidenceLocation: "Course detail > Overview tab",
    status: "in-progress",
    required: true,
  },
  {
    id: "iacet-4-needs",
    body: "IACET",
    category: "4. Needs Assessment",
    requirement: "Conduct and document a learning needs assessment that establishes the need for each CE/T activity.",
    evidenceNeeded: "Needs-assessment record per pathway (audience analysis + gap statement + rationale).",
    status: "not-started",
    required: true,
  },
  {
    id: "iacet-5-outcomes",
    body: "IACET",
    category: "5. Learning Outcomes or Objectives",
    requirement: "Develop measurable learning outcomes using action verbs that describe what learners will be able to do.",
    evidenceNeeded: "6 measurable objectives per module written with Bloom's taxonomy action verbs (not 'understand'/'know').",
    evidenceLocation: "Module > objectives",
    status: "ready",
    required: true,
  },
  {
    id: "iacet-6-planning",
    body: "IACET",
    category: "6. Planning and Instructional Design",
    requirement: "Use a systematic instructional design process; document the relationship between needs, outcomes, content, delivery, and assessment.",
    evidenceNeeded: "Instructional design document per pathway mapping needs→outcomes→content→assessment (the Leashed 5-part flow).",
    evidenceLocation: "Module > flow (Connect→Learn→See It→Do It→Check)",
    status: "ready",
    required: true,
  },
  {
    id: "iacet-7-assessment",
    body: "IACET",
    category: "7. Assessment of Learning Outcomes",
    requirement: "Assess learner achievement of the stated outcomes using valid, reliable instruments; set a documented pass standard.",
    evidenceNeeded: "8-question quiz per module at 80% pass + capstone rubric with 8 criteria + critical items.",
    evidenceLocation: "Module quiz + Rubric",
    status: "ready",
    required: true,
  },
  {
    id: "iacet-8-evaluation",
    body: "IACET",
    category: "8. Program Evaluation",
    requirement: "Evaluate the CE/T activity and use results for continuous improvement.",
    evidenceNeeded: "Learner reviews/ratings per course + outcome data (pass rates, completion rates) + improvement log.",
    evidenceLocation: "Reviews + Admin roster analytics",
    status: "in-progress",
    required: true,
  },
  {
    id: "iacet-9-records",
    body: "IACET",
    category: "Records Management",
    requirement: "Maintain learner records for a minimum of 7 years, including registration, completion, and CEU awarded.",
    evidenceNeeded: "Enrollment + QuizAttempt + certificate records with retention policy.",
    evidenceLocation: "Enrollment + QuizAttempt tables",
    status: "ready",
    required: true,
  },
  {
    id: "iacet-10-ceu-calc",
    body: "IACET",
    category: "CEU Calculation",
    requirement: "Calculate CEUs as 1 CEU = 10 contact hours (60 minutes) of organized learning activity. Do NOT issue 'IACET CEUs' until authorized.",
    evidenceNeeded: "CEU math (120h = 12.0 CEU) + honest labeling: 'CEU (IACET authorization pending)' until approved.",
    status: "in-progress",
    required: true,
  },
  {
    id: "iacet-11-instructors",
    body: "IACET",
    category: "Instructor Qualifications",
    requirement: "Document that instructors/facilitators are qualified by education and/or experience; for AI-assisted instruction, document the AI's role and limits.",
    evidenceNeeded: "Instructor qualification records + AI-instructor scope-of-use policy (what LeashGuide may/may not do).",
    status: "not-started",
    required: true,
  },
];

/**
 * COE (Council on Occupational Education) — institutional accreditation.
 * Accredits the INSTITUTION, not courses. Requires years of operation + site visit.
 */
const COE_REQUIREMENTS: StandardRequirement[] = [
  {
    id: "coe-mission",
    body: "COE",
    category: "Mission",
    requirement: "Published mission statement that guides operations and is reviewed periodically.",
    evidenceNeeded: "Institutional mission document + review schedule.",
    status: "in-progress",
    required: true,
  },
  {
    id: "coe-administration",
    body: "COE",
    category: "Educational Administration",
    requirement: "Qualified administrative staff with defined responsibilities; organizational chart.",
    evidenceNeeded: "Org chart + admin role descriptions.",
    status: "not-started",
    required: true,
  },
  {
    id: "coe-financial",
    body: "COE",
    category: "Financial Stability",
    requirement: "Demonstrated financial stability; audited financial statements.",
    evidenceNeeded: "2-3 years of audited financials (requires operating history).",
    status: "not-started",
    required: true,
  },
  {
    id: "coe-curriculum",
    body: "COE",
    category: "Curriculum",
    requirement: "Curriculum that aligns with occupational objectives; documented competencies; regular review.",
    evidenceNeeded: "Per-pathway curriculum maps + competency documentation + review cycle records.",
    evidenceLocation: "Syllabus export + module objectives",
    status: "ready",
    required: true,
  },
  {
    id: "coe-outcomes",
    body: "COE",
    category: "Student Achievement",
    requirement: "Documented student achievement data (completion, placement, licensure) reviewed annually.",
    evidenceNeeded: "Annual outcomes report (completion %, quiz pass %).",
    evidenceLocation: "Admin roster analytics",
    status: "in-progress",
    required: true,
  },
];

/**
 * ACCSC (Accrediting Commission of Career Schools and Colleges) — institutional.
 */
const ACCSC_REQUIREMENTS: StandardRequirement[] = [
  {
    id: "accsc-mission",
    body: "ACCSC",
    category: "Mission and Objectives",
    requirement: "Clearly defined mission and measurable program objectives.",
    evidenceNeeded: "Mission + per-program measurable objectives.",
    status: "in-progress",
    required: true,
  },
  {
    id: "accsc-faculty",
    body: "ACCSC",
    category: "Faculty",
    requirement: "Qualified faculty with documented credentials and professional development.",
    evidenceNeeded: "Faculty qualification matrix + PD records (for AI instructors: capability + limitation docs).",
    status: "not-started",
    required: true,
  },
  {
    id: "accsc-curriculum",
    body: "ACCSC",
    category: "Curriculum and Instruction",
    requirement: "Curriculum aligned to industry standards; instructional materials current; documented review.",
    evidenceNeeded: "Curriculum maps + industry-standard alignment doc + review dates.",
    evidenceLocation: "Module objectives + rubrics",
    status: "in-progress",
    required: true,
  },
  {
    id: "accsc-outcomes",
    body: "ACCSC",
    category: "Outcomes Assessment",
    requirement: "Ongoing assessment of student outcomes; published completion and placement rates.",
    evidenceNeeded: "Outcomes dashboard + published rates.",
    evidenceLocation: "Admin roster analytics",
    status: "in-progress",
    required: true,
  },
];

/**
 * SCORM — Shareable Content Object Reference Model. This is a TECHNICAL standard,
 * NOT an accreditation. You either comply (your package is importable by an LMS)
 * or you don't. We generate the manifest.
 */
const SCORM_REQUIREMENTS: StandardRequirement[] = [
  {
    id: "scorm-manifest",
    body: "SCORM",
    category: "Manifest",
    requirement: "Valid imsmanifest.xml with proper namespaces (imscp_rootv1p1p2, adlcp_rootv1p2) and item/resource hierarchy.",
    evidenceNeeded: "Generated manifest per course.",
    evidenceLocation: "/api/scorm",
    status: "ready",
    required: true,
  },
  {
    id: "scorm-sco",
    body: "SCORM",
    category: "Sharable Content Objects",
    requirement: "Each module packaged as a SCO with launchable HTML content.",
    evidenceNeeded: "Per-module HTML stubs + zip package.",
    status: "in-progress",
    required: true,
  },
  {
    id: "scorm-sequencing",
    body: "SCORM",
    category: "Sequencing & Navigation",
    requirement: "Defined sequencing rules between modules (pre-requisites, completion criteria).",
    evidenceNeeded: "Sequencing rules in the manifest.",
    status: "not-started",
    required: false,
  },
  {
    id: "scorm-cmi",
    body: "SCORM",
    category: "CMI Data Model",
    requirement: "Tracking of learner progress, score, completion status via the CMI data model.",
    evidenceNeeded: "LMS-side tracking (depends on the consuming LMS).",
    status: "n/a",
    required: false,
  },
];

export const ALL_REQUIREMENTS: StandardRequirement[] = [
  ...IACET_REQUIREMENTS,
  ...COE_REQUIREMENTS,
  ...ACCSC_REQUIREMENTS,
  ...SCORM_REQUIREMENTS,
];

export interface BodySummary {
  body: BodyKey;
  name: string;
  type: "accreditation" | "technical-standard";
  /** Real-world status: we are NOT accredited; this is our readiness. */
  authorizationStatus: "not-applied" | "in-progress" | "applied" | "authorized";
  /** What authorization would let us legally do */
  enables: string;
  /** Honest label to show instead of a fake badge */
  honestLabel: string;
  total: number;
  ready: number;
  inProgress: number;
  notStarted: number;
  pct: number;
}

export function getBodySummaries(): BodySummary[] {
  const bodies: { key: BodyKey; name: string; type: "accreditation" | "technical-standard"; authorizationStatus: BodySummary["authorizationStatus"]; enables: string; honestLabel: string }[] = [
    {
      key: "IACET",
      name: "IACET (ANSI/IACET 1-2018)",
      type: "accreditation",
      authorizationStatus: "not-applied",
      enables: "Legally issue IACET Continuing Education Units (CEUs).",
      honestLabel: "CEU calculation aligned; IACET authorization not yet applied for.",
    },
    {
      key: "COE",
      name: "Council on Occupational Education",
      type: "accreditation",
      authorizationStatus: "not-applied",
      enables: "Institutional accreditation for occupational education.",
      honestLabel: "Curriculum evidence exists; institutional accreditation requires operating history + site visit.",
    },
    {
      key: "ACCSC",
      name: "Accrediting Commission of Career Schools & Colleges",
      type: "accreditation",
      authorizationStatus: "not-applied",
      enables: "Institutional accreditation for career schools.",
      honestLabel: "Curriculum evidence exists; institutional accreditation requires operating history + site visit.",
    },
    {
      key: "SCORM",
      name: "SCORM 1.2 (technical packaging)",
      type: "technical-standard",
      authorizationStatus: "in-progress",
      enables: "Course packages importable by any SCORM-compliant LMS.",
      honestLabel: "Manifest generation works; per-module SCO packaging in progress.",
    },
  ];

  return bodies.map((b) => {
    const reqs = ALL_REQUIREMENTS.filter((r) => r.body === b.key);
    const ready = reqs.filter((r) => r.status === "ready").length;
    const inProgress = reqs.filter((r) => r.status === "in-progress").length;
    const notStarted = reqs.filter((r) => r.status === "not-started").length;
    const nA = reqs.filter((r) => r.status === "n/a").length;
    const scored = reqs.length - nA;
    const pct = scored ? Math.round((ready / scored) * 100) : 0;
    return {
      body: b.key,
      name: b.name,
      type: b.type,
      authorizationStatus: b.authorizationStatus,
      enables: b.enables,
      honestLabel: b.honestLabel,
      total: reqs.length,
      ready,
      inProgress,
      notStarted,
      pct,
    };
  });
}

export const STATUS_META: Record<EvidenceStatus, { label: string; color: string; dot: string }> = {
  "not-started": { label: "Not started", color: "text-muted-foreground", dot: "bg-muted-foreground/40" },
  "in-progress": { label: "In progress", color: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500" },
  "ready": { label: "Evidence ready", color: "text-primary", dot: "bg-primary" },
  "n/a": { label: "Not applicable", color: "text-muted-foreground/50", dot: "bg-muted-foreground/20" },
};

/** Honest CEU label — use this everywhere instead of "IACET CEUs". */
export const CEU_LABEL = "CEU (1 CEU = 10 contact hours · IACET authorization pending)";

/**
 * Bloom's taxonomy action verbs for measurable learning outcomes (IACET Cat. 5).
 * LeashGuide and the objective authoring should use these — NOT "understand" / "know" / "learn".
 */
export const BLOOMS_VERBS = {
  remember: ["define", "list", "identify", "name", "recall", "label", "locate"],
  understand: ["explain", "summarize", "describe", "interpret", "classify", "compare", "discuss"],
  apply: ["apply", "demonstrate", "use", "implement", "execute", "solve", "complete"],
  analyze: ["analyze", "differentiate", "examine", "compare", "contrast", "distinguish", "break down"],
  evaluate: ["evaluate", "assess", "critique", "justify", "recommend", "defend", "judge"],
  create: ["create", "design", "develop", "construct", "produce", "formulate", "plan"],
};

/** Vague verbs that fail IACET measurability — flag these in the editor. */
export const VAGUE_VERBS = ["understand", "know", "learn", "be aware of", "become familiar with", "appreciate", "grasp", "see"];
