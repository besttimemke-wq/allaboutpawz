import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/recommend?name=Jordan → recommended pathways + support team + learning plan
export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name")?.trim();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const learner = await db.learner.findUnique({
    where: { name },
    include: {
      partner: true,
      supportTeamAssignments: {
        include: {
          caseManager: true,
          academicAdvisor: true,
          mentor: true,
        },
      },
    },
  });
  if (!learner) return NextResponse.json({ error: "Learner not found" }, { status: 404 });

  const intake = JSON.parse(learner.intake || "{}");
  const skills = intake.skills || {};
  const careerInterests = (intake.careerInterests || "").toLowerCase();
  const barriers = intake.barriers || [];

  // Score all 10 pathways
  const pathwayScores = [
    { code: "LSH", title: "Life Skills & Personal Readiness", score: 50 + (barriers.length * 10) + (intake.employmentStatus === "unemployed" ? 20 : 0), reason: "Foundation for all learners — builds stability, readiness, and daily life management." },
    { code: "GRM", title: "Pet Grooming & Animal Care", score: 30 + (skills["Animal Care"] >= 3 ? 30 : 0) + (skills["Grooming"] >= 3 ? 30 : 0) + (careerInterests.includes("animal") ? 20 : 0), reason: "Hands-on career path with strong job placement in animal care." },
    { code: "TEC", title: "AI & Technology Systems", score: 30 + (skills["Technology"] >= 3 ? 30 : 0) + (careerInterests.includes("tech") ? 20 : 0), reason: "Builds technology literacy and AI fluency for the modern workplace." },
    { code: "BUS", title: "Business & Leadership", score: 30 + (skills["Business"] >= 3 ? 25 : 0) + (skills["Leadership"] >= 3 ? 25 : 0), reason: "Develops business fundamentals and leadership capability." },
    { code: "MKT", title: "Marketing, Branding & SEO", score: 30 + (skills["Marketing"] >= 3 ? 30 : 0) + (skills["Communication"] >= 3 ? 20 : 0), reason: "Marketing and digital presence skills for any business." },
    { code: "FIN", title: "Financial Mastery & Bookkeeping", score: 30 + (skills["Finance"] >= 3 ? 35 : 0) + (careerInterests.includes("finance") ? 25 : 0), reason: "Financial literacy and bookkeeping for personal and business stability." },
    { code: "LDR", title: "Business Leadership & Operations", score: 25 + (skills["Leadership"] >= 3 ? 25 : 0), reason: "Operations and team leadership for scaling." },
    { code: "LEG", title: "Legal, Risk & Compliance", score: 25, reason: "Governance and compliance for business protection." },
    { code: "PAR", title: "Partner Programs & Workforce Transition", score: 30 + (barriers.includes("reentry") ? 30 : 0), reason: "Workforce transition support for career changers." },
    { code: "PER", title: "Personal Mastery & Lifelong Growth", score: 30, reason: "Self-directed growth and lifelong learning habits." },
  ];

  pathwayScores.sort((a, b) => b.score - a.score);
  const top3 = pathwayScores.slice(0, 3);
  const recommended = pathwayScores.filter((p) => p.score >= 60);

  // Support team
  const assignment = learner.supportTeamAssignments[0];
  const supportTeam = assignment ? {
    caseManager: assignment.caseManager ? { name: assignment.caseManager.name, email: assignment.caseManager.email } : null,
    academicAdvisor: assignment.academicAdvisor ? { name: assignment.academicAdvisor.name, email: assignment.academicAdvisor.email } : null,
    mentor: assignment.mentor ? { name: assignment.mentor.name, email: assignment.mentor.email } : null,
  } : null;

  return NextResponse.json({
    learner: { name: learner.name, intakeComplete: learner.intakeComplete, intakeStep: learner.intakeStep },
    recommendedPathways: recommended.length > 0 ? recommended : top3,
    allPathwayScores: pathwayScores,
    supportTeam,
    partner: learner.partner ? { name: learner.partner.name, type: learner.partner.type } : null,
  });
}
