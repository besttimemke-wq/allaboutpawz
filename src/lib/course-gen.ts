/**
 * Uniform course generator — the single engine that turns a compact catalog
 * (level themes + module specs) into a full, framework-valid Pathway.
 *
 * Both the hand-authored LSH seed AND the AI Course Builder funnel through
 * this engine, so every course has byte-identical structure (hours, objectives,
 * classes, quiz threshold, rubric count, 5-part flow). Only themed content varies.
 */
import {
  expandPathway,
  type ClassSeed,
  type ModuleSeed,
  type PathwaySeed,
  type SubModuleSeed,
} from "./framework/builder";
import type { AccreditationBody, KnowledgeCheckItem, LevelName, Pathway } from "./framework/types";
import { DEFAULT_FRAMEWORK_SPEC, LEVEL_NAMES } from "./framework/types";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export interface ModuleSpec {
  code: string;
  title: string;
  focus: string; // the single capability this module builds
  artifact: string; // capstone artifact name
}

export interface LevelSpec {
  name: LevelName;
  tagline: string;
  credentialName: string;
  credentialDescription: string;
  modules: ModuleSpec[];
}

export interface EnrollmentSpec {
  headline: string;
  whoIsThisFor: string;
  whatYouWillAchieve: string[];
  whatYouWillEarn: string[];
  timeCommitment: string;
  prerequisites: string;
}

export interface Catalog {
  code: string;
  title: string;
  subtitle: string;
  description: string;
  missionAlignment: string;
  accreditation: AccreditationBody[];
  enrollment: EnrollmentSpec;
  levels: LevelSpec[];
}

// ---------------------------------------------------------------------------
// Per-module themed content (shared by LSH and AI-generated courses)
// ---------------------------------------------------------------------------

function objectivesFor(m: ModuleSpec): string[] {
  const f = m.focus;
  return [
    `Define the core concepts and vocabulary of ${m.title.toLowerCase()} and explain why it matters.`,
    `Analyze personal patterns and current state related to ${f}.`,
    `Apply a structured framework to ${f} in a real personal or professional situation.`,
    `Evaluate trade-offs, risks, and unintended consequences when ${f}.`,
    `Create a concrete, measurable artifact that demonstrates ${f}.`,
    `Reflect on feedback and revise the approach to ${f} for sustained improvement.`,
  ];
}

function rubricCriteriaFor(m: ModuleSpec): string[] {
  return [
    `Conceptual accuracy — the vocabulary and models of ${m.title.toLowerCase()} are used correctly.`,
    `Personal application — claims are grounded in the learner's own situation, not generic.`,
    `Evidence & examples — at least two concrete examples or data points are cited.`,
    `Structure & clarity — the artifact is organized and easy to follow.`,
    `Trade-off analysis — the learner names what they give up and what could go wrong.`,
    `Framework fidelity — the Leashed 5-part flow (Connect → Learn → See It → Do It → Check) is visible.`,
    `Critical items — all module critical items are explicitly addressed.`,
    `Actionability — next steps are specific, time-bound, and measurable.`,
  ];
}

function criticalItemsFor(m: ModuleSpec): string[] {
  return [
    `Learner can name their current baseline for ${m.focus} with at least one measured data point.`,
    `Learner can produce the ${m.artifact} unaided and explain each section.`,
    `Learner can articulate one risk of doing this poorly and a mitigation.`,
    `Learner can teach the core idea of ${m.title.toLowerCase()} to a peer in under two minutes.`,
  ];
}

function quizSampleFor(m: ModuleSpec): KnowledgeCheckItem {
  return {
    type: "multiple-choice",
    question: `Which action best demonstrates applied mastery of "${m.title}"?`,
    options: [
      `Memorizing the definitions of every term in the module.`,
      `Choosing and executing a structured approach to ${m.focus} in a real situation, then reviewing results.`,
      `Reading a second textbook chapter on the topic.`,
      `Watching a lecture without taking notes.`,
    ],
    answer: `Choosing and executing a structured approach to ${m.focus} in a real situation, then reviewing results.`,
    rationale: `Applied mastery requires doing the work in a real context and closing the feedback loop — not passive consumption.`,
  };
}

function makeClass(m: ModuleSpec, subLabel: string, kind: "Concept" | "Practice" | "Applied Lab"): ClassSeed {
  const isLab = kind === "Applied Lab";
  const focus = m.focus;
  const title = `${subLabel} — ${kind}`;

  const flow = {
    connect: `Before we go further on ${m.title.toLowerCase()}, recall a moment where ${focus} shaped an outcome for you — good or bad. Hold that moment as our anchor for this class.`,
    learn: `Here is the core model for ${kind.toLowerCase()} in ${m.title.toLowerCase()}: we treat ${focus} as a repeatable cycle — frame, choose, act, observe, adjust. ${kind === "Concept" ? "Today we focus on the framing." : kind === "Practice" ? "Today we rehearse choosing and acting." : "Today we run the full cycle in a real context."}`,
    seeIt: `Worked example: a peer faced a situation requiring ${focus}. They framed the choice, picked an option, acted, observed the result, and adjusted. Notice how each step is visible and reversible.`,
    doIt: isLab
      ? `Run the full cycle now in your real life: pick one situation requiring ${focus} this week, execute the five steps, and capture evidence.`
      : `Take 5 minutes: write your own worked example for ${focus} using the frame → choose → act → observe → adjust structure.`,
    check: `Knowledge check: (1) Name the five steps of the cycle. (2) Why does making each step visible matter? (3) What would "adjust" look like if your first attempt at ${focus} failed?`,
  };

  const teachableContent = `## ${m.title} · ${subLabel} — ${kind}

**Anchor idea.** ${cap(focus)} is a learnable cycle, not a personality trait. The goal of this class is to make the cycle ${kind === "Concept" ? "visible" : kind === "Practice" ? "rehearsed" : "lived"}.

### Core model
1. **Frame** — what situation am I in and what does a good outcome look like?
2. **Choose** — what are 2–3 options and what are their trade-offs?
3. **Act** — pick the smallest reversible step that moves me forward.
4. **Observe** — what happened? capture it without judgment.
5. **Adjust** — what will I keep, stop, or start next time?

### Why it matters here
${m.title} rewards consistency over intensity. ${kind === "Concept" ? "Naming the cycle lets you diagnose where you usually get stuck." : kind === "Practice" ? "Rehearsing the cycle in low-stakes conditions builds the muscle before stakes rise." : "Running the cycle live is where theory becomes evidence you can point to."}

### Common failure modes
- Skipping *Frame* and jumping straight to *Act* (reactive mode).
- Skipping *Observe* so *Adjust* is based on guesswork.
- Treating one cycle as the whole answer instead of iterating.

### Exit ticket
Produce the ${kind === "Applied Lab" ? "evidence" : "notes"} from your cycle and bring one question for LeashGuide.`;

  const aiTutorPrompt = `You are LeashGuide for ${m.code}, class "${title}". You are a Socratic coach, not an answer machine. Goals: (1) surface the learner's prior experience with ${focus}; (2) check they can name the five-step cycle (frame, choose, act, observe, adjust); (3) rehearse one real application of ${focus} before they build the ${m.artifact}. Stay warm, brief, and concrete. Never give more than one concept per reply. End every reply with a single guiding question.`;

  const knowledgeCheck: KnowledgeCheckItem[] = [
    {
      type: "multiple-choice",
      question: `In the cycle for ${m.title.toLowerCase()}, what comes immediately after "Act"?`,
      options: ["Frame", "Choose", "Observe", "Adjust"],
      answer: "Observe",
      rationale: "Act → Observe closes the loop so adjustment is based on evidence, not guesswork.",
    },
    {
      type: "true-false",
      question: `Treating ${m.title.toLowerCase()} as a personality trait rather than a cycle is a common failure mode.`,
      options: ["True", "False"],
      answer: "True",
      rationale: "Framing it as a fixed trait prevents the iterate-and-adjust loop that builds skill.",
    },
    {
      type: "scenario",
      question: `A learner skips "Frame" and jumps to "Act" on ${focus}. What is the most likely cost?`,
      options: [
        "They move faster with no downside.",
        "They act on an unexamined definition of a good outcome and must redo work.",
        "They cannot observe anything.",
        "They finish the cycle early.",
      ],
      answer: "They act on an unexamined definition of a good outcome and must redo work.",
      rationale: "Without framing, the destination is unclear, so even good execution misses the mark.",
    },
  ];

  return { title, isAppliedLab: isLab, flow, teachableContent, aiTutorPrompt, knowledgeCheck };
}

function makeSubModules(m: ModuleSpec): SubModuleSeed[] {
  const labels = [`${m.title}: Concepts`, `${m.title}: Application`, `${m.title}: Integration`];
  return labels.map((label) => ({
    title: label,
    classes: [
      makeClass(m, label, "Concept"),
      makeClass(m, label, "Practice"),
      makeClass(m, label, "Applied Lab"),
    ],
  }));
}

export function makeModule(m: ModuleSpec): ModuleSeed {
  return {
    code: m.code,
    title: m.title,
    description: `A 6-hour module that builds applied mastery of ${m.focus}, culminating in the ${m.artifact}.`,
    objectives: objectivesFor(m),
    capstoneEvidence: m.artifact,
    artifacts: [
      `${m.artifact} (primary deliverable)`,
      `Annotated worked example using the five-step cycle`,
      `One-page reflection on what was adjusted after observing results`,
    ],
    rubricCriteria: rubricCriteriaFor(m),
    criticalItems: criticalItemsFor(m),
    selfReflection: `Where did the cycle of ${m.focus} break down for me this week — Frame, Choose, Act, Observe, or Adjust — and what is the smallest change I will make next time?`,
    leashedGuideRole: `LeashGuide acts as a Socratic coach for ${m.title}: it surfaces prior experience, confirms the learner can name the five-step cycle, and rehearses one real application before the ${m.artifact} is built. It never hands the learner the artifact.`,
    quizSampleItem: quizSampleFor(m),
    subModules: makeSubModules(m),
  };
}

/** Expand a full catalog into a framework-valid Pathway (120h, 12 CEU, 4×5×9). */
export function buildPathwayFromCatalog(catalog: Catalog, opts?: { aiGenerated?: boolean }): Pathway {
  const seed: PathwaySeed = {
    code: catalog.code,
    title: catalog.title,
    subtitle: catalog.subtitle,
    description: catalog.description,
    missionAlignment: catalog.missionAlignment,
    accreditation: catalog.accreditation,
    enrollment: catalog.enrollment,
    levels: catalog.levels.map((lvl) => ({
      name: lvl.name,
      tagline: lvl.tagline,
      credentialName: lvl.credentialName,
      credentialDescription: lvl.credentialDescription,
      modules: lvl.modules.map(makeModule),
    })),
  };
  return expandPathway(seed, { aiGenerated: opts?.aiGenerated ?? false });
}

/** Default accreditation set for new pathways. */
export const DEFAULT_ACCREDITATION: AccreditationBody[] = ["COE", "ACCSC", "IACET", "ICMG", "SCORM"];

/** Build module codes from a course code following the LSH-101 convention. */
export function moduleCodeFor(courseCode: string, levelIndex: number, moduleIndex: number): string {
  return `${courseCode}-${(levelIndex + 1) * 100 + (moduleIndex + 1)}`;
}

export { LEVEL_NAMES, DEFAULT_FRAMEWORK_SPEC };
