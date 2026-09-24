import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/support-team?name=Jordan → the learner's assigned support team
export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name")?.trim();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const learner = await db.learner.findUnique({ where: { name } });
  if (!learner) return NextResponse.json({ error: "Learner not found" }, { status: 404 });

  const assignment = await db.supportTeamAssignment.findUnique({
    where: { learnerId: learner.id },
    include: {
      caseManager: true,
      academicAdvisor: true,
      mentor: true,
    },
  });

  if (!assignment) {
    return NextResponse.json({ supportTeam: null, message: "No support team assigned yet." });
  }

  return NextResponse.json({
    supportTeam: {
      caseManager: assignment.caseManager ? {
        name: assignment.caseManager.name,
        email: assignment.caseManager.email,
        role: "Case Manager",
        description: "Provides academic support, course guidance, and progress checks.",
      } : null,
      academicAdvisor: assignment.academicAdvisor ? {
        name: assignment.academicAdvisor.name,
        email: assignment.academicAdvisor.email,
        role: "Academic Advisor",
        description: "Guides your learning plan and helps with course selection.",
      } : null,
      mentor: assignment.mentor ? {
        name: assignment.mentor.name,
        email: assignment.mentor.email,
        role: "Mentor",
        description: "Supports your personal and professional growth throughout the program.",
      } : null,
      assignedAt: assignment.assignedAt.toISOString(),
    },
  });
}

// POST /api/support-team  { learnerId, caseManagerId?, academicAdvisorId?, mentorId? } → manually assign
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const learnerId = body?.learnerId;
    if (!learnerId) return NextResponse.json({ error: "learnerId required" }, { status: 400 });

    const existing = await db.supportTeamAssignment.findUnique({ where: { learnerId } });
    const data = {
      caseManagerId: body?.caseManagerId ?? null,
      academicAdvisorId: body?.academicAdvisorId ?? null,
      mentorId: body?.mentorId ?? null,
    };

    if (existing) {
      await db.supportTeamAssignment.update({ where: { id: existing.id }, data });
    } else {
      await db.supportTeamAssignment.create({ data: { learnerId, ...data } });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Assignment failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
