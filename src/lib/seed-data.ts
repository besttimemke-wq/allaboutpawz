/**
 * LSH (Life Skills & Personal Readiness) — the seeded exemplar pathway.
 * Funnels through buildPathwayFromCatalog so its structure is byte-identical
 * to any AI-generated course.
 */
import { buildPathwayFromCatalog, DEFAULT_ACCREDITATION, type Catalog } from "./course-gen";
import type { Pathway } from "./framework/types";

const LSH_CATALOG: Catalog = {
  code: "LSH",
  title: "Life Skills & Personal Readiness",
  subtitle: "The 120-hour foundation pathway of Digital Learning University.",
  description:
    "LSH is the flagship pathway of the Leashed Learning Framework: 4 levels, 20 modules, 180 lesson blocks, and a four-rung credential ladder — built to turn life skills from vague advice into a practiced, evidenced discipline.",
  missionAlignment:
    "LSH operationalizes the University mission: every learner leaves with a defended, portable life-readiness portfolio and the habit of evidence-based self-direction.",
  accreditation: DEFAULT_ACCREDITATION,
  enrollment: {
    headline: "Stop collecting life advice. Start running life cycles.",
    whoIsThisFor:
      "Adults 16+ preparing for independence, returning learners, career changers, and anyone who wants life skills taught as a discipline rather than a slogan.",
    whatYouWillAchieve: [
      "A four-rung credential ladder (Foundation → Capstone) totaling 12.0 IACET CEUs.",
      "20 evidencing artifacts you can show an employer, landlord, or mentor.",
      "A defended Life Readiness Portfolio and a 12-month operating plan.",
    ],
    whatYouWillEarn: [
      "Life Skills Foundation Badge (3.0 CEU)",
      "Daily Living Practitioner Certificate (3.0 CEU)",
      "Relational & Resource Strategist Certificate (3.0 CEU)",
      "Life Readiness Capstone Certificate (3.0 CEU)",
    ],
    timeCommitment:
      "120 contact hours over ~6 months at ~5 hours/week. Each module is 6 hours; each class is ~40 minutes.",
    prerequisites: "None for Level 100. Each higher level assumes the prior level's credential.",
  },
  levels: [
    {
      name: "Foundation",
      tagline: "Know yourself before you change yourself.",
      credentialName: "Life Skills Foundation Badge",
      credentialDescription:
        "Recognizes self-awareness, goal-setting, time/energy management, habit design, and emotional regulation fundamentals.",
      modules: [
        { code: "LSH-101", title: "Self-Awareness & Identity", focus: "mapping strengths, values, triggers, and identity narratives", artifact: "Personal Identity Map" },
        { code: "LSH-102", title: "Personal Values & Goal Setting", focus: "clarifying values and converting them into measurable goals", artifact: "Values-to-Goals Charter" },
        { code: "LSH-103", title: "Time & Energy Management", focus: "calendars, energy cycles, prioritization, and protecting deep work", artifact: "Weekly Operating Rhythm" },
        { code: "LSH-104", title: "Habit & Behavior Foundations", focus: "habit loops, cues, rewards, and stacking sustainable behaviors", artifact: "Habit Stack Blueprint" },
        { code: "LSH-105", title: "Emotional Regulation Basics", focus: "naming, surfacing, and regulating emotions under stress", artifact: "Emotion Regulation Toolkit" },
      ],
    },
    {
      name: "Core",
      tagline: "Run the daily engine that runs your life.",
      credentialName: "Daily Living Practitioner Certificate",
      credentialDescription:
        "Recognizes applied mastery of personal finance, health, communication, digital literacy, and structured problem-solving.",
      modules: [
        { code: "LSH-201", title: "Personal Finance & Budgeting", focus: "cash flow, budgets, savings, debt, and financial goal-setting", artifact: "12-Month Personal Budget" },
        { code: "LSH-202", title: "Health, Nutrition & Sleep", focus: "evidence-based sleep, nutrition, and movement habits", artifact: "Personal Health Operating Plan" },
        { code: "LSH-203", title: "Communication & Active Listening", focus: "clear expression, listening to understand, and non-violent communication", artifact: "Communication Rehearsal Log" },
        { code: "LSH-204", title: "Digital & Information Literacy", focus: "evaluating sources, privacy, digital wellbeing, and online identity", artifact: "Digital Wellness Audit" },
        { code: "LSH-205", title: "Problem-Solving & Decision Making", focus: "framing problems, options analysis, and deciding under uncertainty", artifact: "Decision Journal" },
      ],
    },
    {
      name: "Advanced",
      tagline: "Connect, resource, and resiliently navigate the world.",
      credentialName: "Relational & Resource Strategist Certificate",
      credentialDescription:
        "Recognizes advanced skill in conflict, career readiness, independent living, civic engagement, and resilience.",
      modules: [
        { code: "LSH-301", title: "Conflict Resolution & Boundaries", focus: "de-escalation, boundaries, repair, and hard conversations", artifact: "Boundary & Repair Playbook" },
        { code: "LSH-302", title: "Career Planning & Job Readiness", focus: "career mapping, resumes, interviews, and professional presence", artifact: "Career Launch Packet" },
        { code: "LSH-303", title: "Housing, Transport & Independent Living", focus: "leases, transport, household systems, and independence logistics", artifact: "Independent Living Operations Manual" },
        { code: "LSH-304", title: "Community & Civic Engagement", focus: "belonging, volunteering, networks, and civic participation", artifact: "Community Engagement Plan" },
        { code: "LSH-305", title: "Resilience & Stress Management", focus: "stress science, recovery, reframing, and bouncing back", artifact: "Resilience & Recovery Plan" },
      ],
    },
    {
      name: "Capstone",
      tagline: "Lead, mentor, and contribute beyond yourself.",
      credentialName: "Life Readiness Capstone Certificate",
      credentialDescription:
        "Capstone credential recognizing leadership, mentorship, entrepreneurial thinking, advocacy, and a defended life portfolio.",
      modules: [
        { code: "LSH-401", title: "Leadership & Influence", focus: "leading self and others, influence without authority, and team trust", artifact: "Leadership Influence Map" },
        { code: "LSH-402", title: "Mentorship & Coaching Others", focus: "coaching frameworks, feedback, and developing people", artifact: "Mentorship Engagement Plan" },
        { code: "LSH-403", title: "Entrepreneurial Thinking", focus: "opportunity spotting, lean experiments, and value creation", artifact: "Lean Value Experiment" },
        { code: "LSH-404", title: "Advocacy & Systems Navigation", focus: "navigating institutions, self-advocacy, and advocacy for others", artifact: "Systems Navigation Guide" },
        { code: "LSH-405", title: "Capstone Integration & Life Portfolio", focus: "integrating the pathway into a life-readiness portfolio and 12-month plan", artifact: "Life Readiness Portfolio" },
      ],
    },
  ],
};

export function buildLSHPathway(): Pathway {
  return buildPathwayFromCatalog(LSH_CATALOG, { aiGenerated: false });
}
