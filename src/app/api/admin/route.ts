import { NextRequest, NextResponse } from "next/server";
import { getVisitor } from "@/lib/visitor";
import { supabase } from "@/lib/supabase";
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

    const [coursesResp, enrollmentsResp, sessionsResp, knowledgeChunksResp, openHandoffsResp] =
      await Promise.all([
        supabase
          .from("course")
          .select("*")
          .eq("ownerId", ownerId)
          .order("createdAt", { ascending: false })
          .limit(50),
        supabase
          .from("courseEnrollment")
          .select("*", { count: "exact", head: true })
          .eq("ownerId", ownerId),
        supabase
          .from("learningDay")
          .select("*", { count: "exact", head: true })
          .eq("ownerId", ownerId),
        supabase
          .from("knowledgeChunk")
          .select("*", { count: "exact", head: true })
          .eq("ownerId", ownerId),
        supabase
          .from("humanNeedQueue")
          .select("*", { count: "exact", head: true })
          .eq("ownerId", ownerId)
          .eq("status", "OPEN"),
      ]);
    if (coursesResp.error) console.error("[admin] courses:", coursesResp.error.message);
    if (enrollmentsResp.error) console.error("[admin] enrollments:", enrollmentsResp.error.message);
    if (sessionsResp.error) console.error("[admin] sessions:", sessionsResp.error.message);
    if (knowledgeChunksResp.error) console.error("[admin] knowledge:", knowledgeChunksResp.error.message);
    if (openHandoffsResp.error) console.error("[admin] handoffs:", openHandoffsResp.error.message);

    const enrollments = enrollmentsResp.count ?? 0;
    const sessions = sessionsResp.count ?? 0;
    const knowledgeChunks = knowledgeChunksResp.count ?? 0;
    const openHandoffs = openHandoffsResp.count ?? 0;

    // For each course, count enrollments.
    const courseList = await Promise.all(
      (coursesResp.data ?? []).map(async (c) => {
        const r = c as {
          id: number;
          title: string;
          area: string;
          statute: string;
          grade: string;
          state: string;
          model: string;
          createdAt: string;
        };
        const { count } = await supabase
          .from("courseEnrollment")
          .select("*", { count: "exact", head: true })
          .eq("ownerId", ownerId)
          .eq("courseId", r.id);
        return {
          id: r.id,
          title: r.title,
          area: r.area,
          statute: r.statute,
          pathwayCode: pathwayCodeFromCourse({ area: r.area, statute: r.statute }) || "",
          grade: r.grade,
          state: r.state,
          model: r.model,
          enrollmentCount: count ?? 0,
          createdAt: new Date(r.createdAt).toISOString(),
        };
      }),
    );

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
        courses: courseList.length,
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
