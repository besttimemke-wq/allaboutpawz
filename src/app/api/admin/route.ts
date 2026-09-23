import { NextRequest, NextResponse } from "next/server";
import { getVisitor } from "@/lib/visitor";
import { prisma } from "@/lib/prisma";
import { pathwayCodeFromCourse } from "@/lib/rag";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin — admin dashboard snapshot for the demo owner.
// Returns counts (courses / enrollments / sessions / knowledge chunks), the
// course list with pathway codes, and the cohost roster (one demo cohost plus
// a count of open handoffs they could pick up).
export async function GET(request: NextRequest) {
  try {
    const visitor = getVisitor(request);
    const ownerId = visitor.id;

    const [courses, enrollments, sessions, knowledgeChunks, openHandoffs] =
      await Promise.all([
        prisma.course.findMany({
          where: { ownerId },
          orderBy: { createdAt: "desc" },
          take: 50,
          include: { _count: { select: { enrollments: true } } },
        }),
        prisma.courseEnrollment.count({ where: { ownerId } }),
        prisma.learningDay.count({ where: { ownerId } }),
        prisma.knowledgeChunk.count({ where: { ownerId } }),
        prisma.humanNeedQueue.count({ where: { ownerId, status: "OPEN" } }),
      ]);

    const courseList = courses.map((c) => ({
      id: c.id,
      title: c.title,
      area: c.area,
      statute: c.statute,
      pathwayCode: pathwayCodeFromCourse(c) || "",
      grade: c.grade,
      state: c.state,
      model: c.model,
      enrollmentCount: c._count.enrollments,
      createdAt: c.createdAt.toISOString(),
    }));

    // Single demo cohost — Jamie Carter — plus a count of open handoffs they
    // could pick up. In a multi-tenant build this would be a real roster;
    // here it stays consistent with the seeded classroom cohost persona.
    const cohosts = [
      {
        id: 1,
        name: "Jamie Carter",
        email: "jamie.carter@pawz.academy",
        role: "co_instructor",
        status: openHandoffs > 0 ? "reviewing" : "available",
        activeHandoffs: openHandoffs,
      },
    ];

    return NextResponse.json({
      viewer: { id: ownerId, name: visitor.name, email: visitor.email },
      stats: {
        courses: courses.length,
        enrollments,
        sessions,
        knowledgeChunks,
        openHandoffs,
      },
      courses: courseList,
      cohosts,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load admin dashboard." },
      { status: 500 },
    );
  }
}
