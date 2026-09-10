import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Enrollment intake pipeline — the 13-step process from your mockup.
 *
 * Steps:
 *  1. Referral & Verification (partner code, referring org)
 *  2. Program Eligibility (eligibility questions)
 *  3. Personal Information (name, dob, contact)
 *  4. Identity & Verification (gov ID, verification method)
 *  5. Location (address, city, state, zip, county)
 *  6. Education & Background (education level, learning background)
 *  7. Employment & Career (work history, employment status)
 *  8. Skills & Experience (self-rated skills across 12 domains)
 *  9. Barriers, Supports & Needs (transportation, childcare, etc.)
 * 10. Demographic & Program Reporting (race, gender, veteran, disability, income, household)
 * 11. Final Review & Consent
 * 12. Welcome to Learning Journey (triggers recommendation + support team assignment)
 * 13. Enrollment Confirmation (pathway selected, enrolled)
 *
 * Each step saves progressively to Learner.intake (JSON).
 * The learner can pause and resume — intakeStep tracks progress.
 */

interface IntakeData {
  // Step 1: Referral
  referralCode?: string;
  referringOrg?: string;
  referringSalon?: string;
  referringGrad?: string;
  referralDate?: string;
  referralSource?: string;
  // Step 2: Eligibility
  eligibility?: Record<string, string>;
  // Step 3: Personal
  firstName?: string;
  lastName?: string;
  middleName?: string;
  suffix?: string;
  preferredName?: string;
  dob?: string;
  email?: string;
  phone?: string;
  pronouns?: string;
  communicationMethod?: string;
  // Step 4: Identity
  legalFirstName?: string;
  govId?: string;
  verificationMethod?: string;
  verificationState?: string;
  // Step 5: Location
  streetAddress?: string;
  apartmentUnit?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  county?: string;
  preferredArea?: string;
  // Step 6: Education
  educationLevel?: string;
  learningBackground?: string;
  // Step 7: Employment
  employmentStatus?: string;
  workHistory?: string;
  careerInterests?: string;
  // Step 8: Skills (self-rated 1-5 across 12 domains)
  skills?: Record<string, number>;
  // Step 9: Barriers
  barriers?: string[];
  supportNeeds?: string[];
  // Step 10: Demographics
  raceEthnicity?: string;
  gender?: string;
  veteranStatus?: string;
  disabilityStatus?: string;
  incomeRange?: string;
  householdSize?: number;
  additionalDemographics?: string;
  // Step 11: Consent
  consentVerified?: boolean;
}

// GET /api/intake?name=Jordan → fetch current intake state
export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name")?.trim();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const learner = await db.learner.findUnique({
    where: { name },
    include: { partner: true },
  });
  if (!learner) return NextResponse.json({ error: "Learner not found" }, { status: 404 });

  return NextResponse.json({
    learner: {
      id: learner.id,
      name: learner.name,
      email: learner.email,
      intakeStep: learner.intakeStep,
      intakeComplete: learner.intakeComplete,
      intake: JSON.parse(learner.intake || "{}") as IntakeData,
      partner: learner.partner ? { code: learner.partner.code, name: learner.partner.name, type: learner.partner.type } : null,
    },
  });
}

// POST /api/intake  { name, step, data } → save one step of the intake
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = (body?.name as string | undefined)?.trim();
    const step = body?.step as number | undefined;
    const stepData = body?.data as Partial<IntakeData>;

    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
    if (typeof step !== "number" || step < 1 || step > 13) {
      return NextResponse.json({ error: "step must be 1-13" }, { status: 400 });
    }

    // Upsert the learner
    let learner = await db.learner.findUnique({ where: { name } });
    if (!learner) {
      learner = await db.learner.create({
        data: { name, email: stepData.email ?? null },
      });
    }

    // Merge the step data into the existing intake JSON
    const currentIntake = JSON.parse(learner.intake || "{}") as IntakeData;
    const merged: IntakeData = { ...currentIntake, ...stepData };

    // Step 1: verify partner referral code if provided
    let partnerId: string | null = null;
    if (step === 1 && stepData.referralCode) {
      const partner = await db.partner.findUnique({ where: { code: stepData.referralCode } });
      if (partner && partner.active) {
        partnerId = partner.id;
      }
    }

    // Step 12: trigger recommendation + support team assignment
    let recommendedPathways: string[] | undefined;
    let supportTeamAssigned = false;
    if (step === 12) {
      recommendedPathways = computeRecommendations(merged);
      // Auto-assign support team based on intake
      await assignSupportTeam(learner.id, merged);
      supportTeamAssigned = true;
    }

    // Step 13: mark intake complete
    const intakeComplete = step >= 13;

    const updated = await db.learner.update({
      where: { id: learner.id },
      data: {
        intake: JSON.stringify(merged),
        intakeStep: Math.max(learner.intakeStep, step),
        intakeComplete,
        email: stepData.email ?? learner.email ?? undefined,
        partnerId: partnerId ?? learner.partnerId ?? undefined,
      },
    });

    return NextResponse.json({
      ok: true,
      learnerId: updated.id,
      intakeStep: updated.intakeStep,
      intakeComplete: updated.intakeComplete,
      ...(recommendedPathways && { recommendedPathways }),
      ...(supportTeamAssigned && { supportTeamAssigned: true }),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Intake save failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

// ── Recommendation engine: matches intake profile to pathways ──
function computeRecommendations(intake: IntakeData): string[] {
  const recs: { code: string; score: number }[] = [];

  const skills = intake.skills || {};
  const careerInterests = (intake.careerInterests || "").toLowerCase();
  const barriers = intake.barriers || [];

  // LSH (Life Skills) — recommended for everyone, especially those with barriers
  let lshScore = 50;
  if (barriers.includes("housing") || barriers.includes("employment") || barriers.includes("transportation")) lshScore += 30;
  if (intake.employmentStatus === "unemployed" || intake.employmentStatus === "underemployed") lshScore += 20;
  recs.push({ code: "LSH", score: lshScore });

  // GRM (Pet Grooming) — recommended if animal care interest or skills
  let grmScore = 30;
  if (skills["Animal Care"] && skills["Animal Care"] >= 3) grmScore += 30;
  if (skills["Grooming"] && skills["Grooming"] >= 3) grmScore += 30;
  if (careerInterests.includes("animal") || careerInterests.includes("pet") || careerInterests.includes("groom")) grmScore += 20;
  recs.push({ code: "GRM", score: grmScore });

  // TEC (Technology) — recommended if tech skills or interest
  let tecScore = 30;
  if (skills["Technology"] && skills["Technology"] >= 3) tecScore += 30;
  if (careerInterests.includes("tech") || careerInterests.includes("computer") || careerInterests.includes("ai")) tecScore += 20;
  recs.push({ code: "TEC", score: tecScore });

  // BUS (Business) — recommended if business/leadership skills
  let busScore = 30;
  if (skills["Business"] && skills["Business"] >= 3) busScore += 25;
  if (skills["Leadership"] && skills["Leadership"] >= 3) busScore += 25;
  if (skills["Sales"] && skills["Sales"] >= 3) busScore += 15;
  recs.push({ code: "BUS", score: busScore });

  // MKT (Marketing) — recommended if marketing/communication skills
  let mktScore = 30;
  if (skills["Marketing"] && skills["Marketing"] >= 3) mktScore += 30;
  if (skills["Communication"] && skills["Communication"] >= 3) mktScore += 20;
  recs.push({ code: "MKT", score: mktScore });

  // FIN (Finance) — recommended if finance skills
  let finScore = 30;
  if (skills["Finance"] && skills["Finance"] >= 3) finScore += 35;
  if (careerInterests.includes("finance") || careerInterests.includes("bookkeeping")) finScore += 25;
  recs.push({ code: "FIN", score: finScore });

  // Sort by score, return top 3
  recs.sort((a, b) => b.score - a.score);
  return recs.slice(0, 3).map((r) => r.code);
}

// ── Auto-assign support team based on intake ──
async function assignSupportTeam(learnerId: string, intake: IntakeData) {
  // Find available staff
  const caseManagers = await db.supportStaff.findMany({ where: { role: "case-manager", active: true } });
  const advisors = await db.supportStaff.findMany({ where: { role: "academic-advisor", active: true } });
  const mentors = await db.supportStaff.findMany({ where: { role: "mentor", active: true } });

  // Match mentor by specialty if possible
  const barriers = intake.barriers || [];
  let mentor = mentors[0];
  if (barriers.includes("reentry")) {
    const reentryMentor = mentors.find((m) => {
      const specs = JSON.parse(m.specialties || "[]") as string[];
      return specs.includes("reentry");
    });
    if (reentryMentor) mentor = reentryMentor;
  }

  // Create or update the assignment (one per learner)
  const existing = await db.supportTeamAssignment.findUnique({ where: { learnerId } });
  const data = {
    caseManagerId: caseManagers[0]?.id ?? null,
    academicAdvisorId: advisors[0]?.id ?? null,
    mentorId: mentor?.id ?? null,
  };

  if (existing) {
    await db.supportTeamAssignment.update({ where: { id: existing.id }, data });
  } else {
    await db.supportTeamAssignment.create({ data: { learnerId, ...data } });
  }
}
