/**
 * Seed ALL 10 pathways from the Learning Catalog.
 * - LSH, GRM, TEC: real module data extracted from the catalog doc.
 * - BUS, PAR, PER, MKT, FIN, LDR, LEG: AI-generated via the build-course API.
 *
 * Run: bun run scripts/seed-all-catalog.ts
 */
import { db } from "../src/lib/db";
import { buildPathwayFromCatalog, DEFAULT_ACCREDITATION, moduleCodeFor, type Catalog, type LevelSpec, type ModuleSpec } from "../src/lib/course-gen";

// ---------------------------------------------------------------------------
// REAL catalog module data (extracted from Learning Catalog.docx)
// ---------------------------------------------------------------------------

interface CatalogModule {
  code: string;
  title: string;
  capstone: string;
}

const LSH_MODULES: CatalogModule[] = [
  { code: "LSH-101", title: "Personal Readiness", capstone: "Personal readiness profile" },
  { code: "LSH-102", title: "Digital Skills for Daily Life", capstone: "Digital access and communication setup" },
  { code: "LSH-103", title: "Financial Basics for Stability", capstone: "Personal stability budget" },
  { code: "LSH-104", title: "Customer Service & Professional Communication", capstone: "Customer-service practice portfolio" },
  { code: "LSH-105", title: "Animal Welfare, Safety & Sanitation Orientation", capstone: "Safety and sanitation readiness checklist" },
  { code: "LSH-201", title: "Health, Wellness & Sustainable Work Habits", capstone: "Personal wellness and work-routine plan" },
  { code: "LSH-202", title: "Time, Energy & Attendance Management", capstone: "Weekly attendance and energy plan" },
  { code: "LSH-203", title: "Using AI Tools for Daily Success", capstone: "AI-supported personal workflow portfolio" },
  { code: "LSH-204", title: "Housing, Transportation & Stability Navigation", capstone: "Stability resource and logistics plan" },
  { code: "LSH-205", title: "Personal Readiness Capstone", capstone: "90-day personal success plan" },
  { code: "LSH-301", title: "Advanced Communication & Self-Advocacy", capstone: "Self-advocacy toolkit" },
  { code: "LSH-302", title: "Conflict Resolution & Problem Solving", capstone: "Conflict-resolution case file" },
  { code: "LSH-303", title: "Workplace Rights, Responsibilities & Boundaries", capstone: "Workplace rights and boundaries plan" },
  { code: "LSH-304", title: "Career Planning & Professional Identity", capstone: "Career pathway portfolio" },
  { code: "LSH-305", title: "Resilience, Recovery & Change Navigation", capstone: "Personal resilience playbook" },
  { code: "LSH-401", title: "Leadership in Daily Life", capstone: "Personal leadership practice plan" },
  { code: "LSH-402", title: "Community Engagement & Peer Support", capstone: "Community contribution project" },
  { code: "LSH-403", title: "Life Systems Integration", capstone: "Integrated household and work systems map" },
  { code: "LSH-404", title: "Personal Crisis Prevention & Continuity Planning", capstone: "Personal continuity plan" },
  { code: "LSH-405", title: "Life Skills Portfolio Capstone", capstone: "Verified Life Skills Portfolio" },
];

const GRM_MODULES: CatalogModule[] = [
  { code: "GRM-101", title: "Introduction to Pet Grooming Careers", capstone: "Grooming career readiness plan" },
  { code: "GRM-102", title: "Animal Behavior & Safe Handling", capstone: "Safe-handling skills checklist" },
  { code: "GRM-103", title: "Grooming Tools, Equipment & Sanitation", capstone: "Grooming station setup and sanitation plan" },
  { code: "GRM-104", title: "Bathing, Drying & Basic Coat Care", capstone: "Supervised bath-and-dry service record" },
  { code: "GRM-105", title: "Client Intake, Pet Records & Service Consultation", capstone: "Complete pet intake and consultation portfolio" },
  { code: "GRM-201", title: "Brushing, Combing, De-Shedding & De-Matting Safety", capstone: "Coat-maintenance service portfolio" },
  { code: "GRM-202", title: "Nail, Ear, Paw & Basic Hygiene Services", capstone: "Basic hygiene competency checkoff" },
  { code: "GRM-203", title: "Clippers, Blades, Scissors & Tool Safety", capstone: "Tool-handling safety assessment" },
  { code: "GRM-204", title: "Breed, Coat, Skin & Style Foundations", capstone: "Coat-and-style consultation plan" },
  { code: "GRM-205", title: "Grooming Workflow & Salon Productivity", capstone: "Full-service workflow checklist" },
  { code: "GRM-301", title: "Advanced Bathing, Drying & Coat Preparation", capstone: "Advanced coat-preparation portfolio" },
  { code: "GRM-302", title: "Breed Styling & Pet Trim Fundamentals", capstone: "Supervised trim portfolio" },
  { code: "GRM-303", title: "Difficult, Fearful & High-Needs Pet Handling", capstone: "Behavior-aware handling plan" },
  { code: "GRM-304", title: "Grooming Quality Control & Service Recovery", capstone: "Quality-control and rework system" },
  { code: "GRM-305", title: "Mobile, In-Home & Specialty Grooming Operations", capstone: "Specialty service operating plan" },
  { code: "GRM-401", title: "Advanced Grooming Portfolio Development", capstone: "Verified grooming portfolio" },
  { code: "GRM-402", title: "Grooming Salon Practicum", capstone: "Supervised practicum service log" },
  { code: "GRM-403", title: "Grooming Service Menu, Pricing & Packages", capstone: "Service menu and pricing guide" },
  { code: "GRM-404", title: "Grooming Safety Leadership & Training Others", capstone: "Safety training mini-module" },
  { code: "GRM-405", title: "Pet Grooming Career Capstone", capstone: "Grooming career and business launch portfolio" },
];

const TEC_MODULES: CatalogModule[] = [
  { code: "TEC-101", title: "Technology Foundations & Digital Literacy for Business", capstone: "Technology stack starter kit" },
  { code: "TEC-102", title: "Cybersecurity, Passwords & Safe Online Practices", capstone: "Business cybersecurity checklist" },
  { code: "TEC-103", title: "Cloud Files, Communication & Collaboration Workspace", capstone: "Cloud collaboration setup" },
  { code: "TEC-104", title: "Data Privacy & Customer Information Basics", capstone: "Customer data-handling guide" },
  { code: "TEC-105", title: "AI Literacy, Prompting & Human Verification", capstone: "Responsible AI prompt library" },
  { code: "TEC-201", title: "AI Tools for Business Operations", capstone: "Three AI-assisted workflows" },
  { code: "TEC-202", title: "AI for Customer Communication & Service", capstone: "Customer communication system" },
  { code: "TEC-203", title: "AI for Content, Design & Marketing Production", capstone: "AI content production kit" },
  { code: "TEC-204", title: "AI for Scheduling, Tasks & Workflow Automation", capstone: "Automated scheduling workflow" },
  { code: "TEC-205", title: "AI for Reporting, Data Quality & Decisions", capstone: "AI-supported reporting dashboard" },
  { code: "TEC-301", title: "Choosing, Buying & Integrating Business Technology", capstone: "Technology buying decision report" },
  { code: "TEC-302", title: "Technology Needs Assessment & Vendor Evaluation", capstone: "Vendor evaluation file" },
  { code: "TEC-303", title: "Systems Integration, Data Migration & Automation", capstone: "Systems integration plan" },
  { code: "TEC-304", title: "Technology Budgeting, Contracts & Procurement", capstone: "Technology procurement plan" },
  { code: "TEC-305", title: "AI Governance, Risk & Responsible Implementation", capstone: "AI governance implementation plan" },
  { code: "TEC-401", title: "AI-Powered Business Systems Design", capstone: "AI-powered systems blueprint" },
  { code: "TEC-402", title: "Business Dashboards & Data Strategy", capstone: "Business data strategy" },
  { code: "TEC-403", title: "Technology Continuity, Security & Incident Response", capstone: "Technology continuity plan" },
  { code: "TEC-404", title: "Technology Training, Adoption & Change Management", capstone: "Technology adoption program" },
  { code: "TEC-405", title: "Technology Systems Portfolio Capstone", capstone: "Verified technology systems portfolio" },
];

// ---------------------------------------------------------------------------
// Pathway metadata from the catalog directory
// ---------------------------------------------------------------------------

interface PathwayMeta {
  code: string;
  title: string;
  subtitle: string;
  description: string;
  domain: string;
  audience: string;
  modules: CatalogModule[];
}

const PATHWAYS: PathwayMeta[] = [
  {
    code: "LSH", title: "Life Skills & Personal Readiness",
    subtitle: "The 120-hour foundation pathway — personal readiness, stability, and career launch.",
    description: "LSH builds the personal readiness layer: digital skills, financial basics, health, time management, communication, conflict, career planning, resilience, leadership, and a verified life-skills portfolio.",
    domain: "life skills, personal readiness, daily stability, career launch",
    audience: "adults preparing for independent living, career changers, returning learners",
    modules: LSH_MODULES,
  },
  {
    code: "GRM", title: "Pet Grooming & Animal Care",
    subtitle: "The 120-hour career-to-ownership pathway for pet grooming professionals.",
    description: "GRM trains pet groomers from safety foundations through advanced breed styling, salon operations, and career/business launch — with live-animal labs and practicum evidence.",
    domain: "pet grooming, animal care, salon operations, safety, breed styling",
    audience: "aspiring pet groomers and salon owners",
    modules: GRM_MODULES,
  },
  {
    code: "TEC", title: "AI & Technology Systems",
    subtitle: "The 120-hour pathway for AI-fluent business technology operators.",
    description: "TEC covers digital literacy, cybersecurity, cloud collaboration, AI literacy and prompting, AI for operations/content/automation, technology procurement, AI governance, and a verified technology systems portfolio.",
    domain: "AI literacy, business technology, cybersecurity, cloud collaboration, AI governance",
    audience: "business operators adopting AI tools and technology systems",
    modules: TEC_MODULES,
  },
];

const AI_GENERATED: PathwayMeta[] = [
  { code: "BUS", title: "Business & Leadership", subtitle: "The 120-hour business fundamentals + leadership pathway.", description: "BUS covers business foundations, operations, finance, marketing, leadership, strategy, and a business launch portfolio.", domain: "business fundamentals, operations, leadership, strategy, entrepreneurship", audience: "current and aspiring business owners and team leaders", modules: [] },
  { code: "PAR", title: "Partner Programs & Workforce Transition", subtitle: "The 120-hour workforce transition pathway.", description: "PAR covers career transition, partner program onboarding, workplace integration, credential stacking, and a workforce transition portfolio.", domain: "workforce transition, partner programs, career onboarding, credential stacking", audience: "workforce program participants and partner-organization learners", modules: [] },
  { code: "PER", title: "Personal Mastery & Lifelong Growth", subtitle: "The 120-hour personal mastery pathway.", description: "PER covers self-directed learning, habit mastery, deep work, mental models, lifelong growth, and a personal mastery portfolio.", domain: "personal mastery, lifelong learning, habit design, mental models, deep work", audience: "adults pursuing self-directed personal growth", modules: [] },
  { code: "MKT", title: "Marketing, Branding & SEO Mastery", subtitle: "The 120-hour marketing + SEO mastery pathway.", description: "MKT covers brand foundations, content marketing, SEO, paid media, analytics, conversion, and a marketing launch portfolio.", domain: "marketing, branding, SEO, content marketing, paid media, analytics", audience: "marketers, business owners, and content creators", modules: [] },
  { code: "FIN", title: "Financial Mastery, Bookkeeping & Tax Strategy", subtitle: "The 120-hour financial mastery pathway.", description: "FIN covers bookkeeping, financial statements, cash flow, tax strategy, investment basics, and a financial mastery portfolio.", domain: "bookkeeping, financial statements, cash flow, tax strategy, personal finance", audience: "small business owners, bookkeepers, and individuals mastering finance", modules: [] },
  { code: "LDR", title: "Business Leadership, Operations & Expansion", subtitle: "The 120-hour leadership + operations expansion pathway.", description: "LDR covers team leadership, operations management, hiring, performance, scaling, and a leadership expansion portfolio.", domain: "leadership, operations management, hiring, scaling, team performance", audience: "business leaders scaling teams and operations", modules: [] },
  { code: "LEG", title: "Legal, Risk, Compliance & Ethical Governance", subtitle: "The 120-hour legal + compliance governance pathway.", description: "LEG covers business law basics, contracts, risk management, compliance frameworks, ethics, and a governance portfolio.", domain: "business law, contracts, risk management, compliance, ethical governance", audience: "business owners, managers, and compliance officers", modules: [] },
];

// ---------------------------------------------------------------------------
// Build a Catalog from module specs
// ---------------------------------------------------------------------------

function modulesToSpecs(code: string, mods: CatalogModule[]): ModuleSpec[] {
  return mods.map((m) => ({
    code: m.code,
    title: m.title,
    focus: m.title.toLowerCase(),
    artifact: m.capstone,
  }));
}

function buildCatalogFromMeta(meta: PathwayMeta): Catalog {
  const levelSpecs: LevelSpec[] = [
    { name: "Foundation", tagline: "Foundation: literacy, readiness, vocabulary, basic confidence", credentialName: `${meta.code} Foundation Badge`, credentialDescription: `Foundation-level credential for ${meta.title}.`, modules: modulesToSpecs(meta.code, meta.modules.slice(0, 5)) },
    { name: "Core", tagline: "Core skill: guided application, workplace practice, tool use", credentialName: `${meta.code} Core Certificate`, credentialDescription: `Core-level credential for ${meta.title}.`, modules: modulesToSpecs(meta.code, meta.modules.slice(5, 10)) },
    { name: "Advanced", tagline: "Advanced skill: systems, strategy, analysis, real decisions", credentialName: `${meta.code} Advanced Certificate`, credentialDescription: `Advanced-level credential for ${meta.title}.`, modules: modulesToSpecs(meta.code, meta.modules.slice(10, 15)) },
    { name: "Capstone", tagline: "Capstone: integrated execution, portfolio, leadership, launch evidence", credentialName: `${meta.code} Capstone Certificate`, credentialDescription: `Capstone-level credential for ${meta.title}.`, modules: modulesToSpecs(meta.code, meta.modules.slice(15, 20)) },
  ];
  return {
    code: meta.code,
    title: meta.title,
    subtitle: meta.subtitle,
    description: meta.description,
    missionAlignment: `${meta.title} advances the Career-to-Ownership Academy mission: every learner leaves with applied capability and a defended portfolio.`,
    accreditation: DEFAULT_ACCREDITATION,
    enrollment: {
      headline: `Build real ${meta.domain.split(",")[0]} capability, one cycle at a time.`,
      whoIsThisFor: meta.audience,
      whatYouWillAchieve: ["A four-rung credential ladder totaling 12.0 CEU.", "20 evidencing artifacts you can show an employer.", "A defended capstone portfolio."],
      whatYouWillEarn: levelSpecs.map((l) => `${l.credentialName} (3.0 CEU)`),
      timeCommitment: "120 contact hours over ~6 months at ~5 hours/week.",
      prerequisites: "None for Level 100.",
    },
    levels: levelSpecs,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== Seeding full catalog (10 pathways) ===\n");

  // 1. Real-data pathways (LSH, GRM, TEC)
  for (const meta of PATHWAYS) {
    console.log(`→ ${meta.code}: ${meta.title} (${meta.modules.length} real modules)`);
    const catalog = buildCatalogFromMeta(meta);
    const pathway = buildPathwayFromCatalog(catalog, { aiGenerated: false });
    await db.course.upsert({
      where: { code: meta.code },
      create: {
        code: meta.code, title: pathway.title, subtitle: pathway.subtitle,
        description: pathway.description, missionAlignment: pathway.missionAlignment,
        totalHours: pathway.totalHours, ceus: pathway.ceus,
        scormPackageId: pathway.scormPackageId,
        accreditation: JSON.stringify(pathway.accreditation),
        status: "published", aiGenerated: false,
        data: JSON.stringify(pathway),
      },
      update: {
        title: pathway.title, subtitle: pathway.subtitle, description: pathway.description,
        missionAlignment: pathway.missionAlignment, totalHours: pathway.totalHours, ceus: pathway.ceus,
        scormPackageId: pathway.scormPackageId, accreditation: JSON.stringify(pathway.accreditation),
        status: "published", data: JSON.stringify(pathway),
      },
    });
    console.log(`  ✓ ${pathway.levels.reduce((n, l) => n + l.modules.length, 0)} modules seeded`);
  }

  // 2. AI-generated pathways (BUS, PAR, PER, MKT, FIN, LDR, LEG)
  for (const meta of AI_GENERATED) {
    console.log(`→ ${meta.code}: ${meta.title} (AI-generating modules...)`);
    try {
      const res = await fetch("http://localhost:3000/api/ai/build-course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: meta.code, title: meta.title, domain: meta.domain, audience: meta.audience }),
      });
      if (!res.ok) {
        console.log(`  ✗ AI build failed: ${res.status}`);
        continue;
      }
      // Publish it
      await fetch(`http://localhost:3000/api/courses/${meta.code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "published" }),
      });
      console.log(`  ✓ AI-generated + published`);
    } catch (e) {
      console.log(`  ✗ Error: ${e instanceof Error ? e.message : "unknown"}`);
    }
  }

  const count = await db.course.count();
  const published = await db.course.count({ where: { status: "published" } });
  console.log(`\n=== Done. ${count} courses in DB (${published} published) ===`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await db.$disconnect(); });
