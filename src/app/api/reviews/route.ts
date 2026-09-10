import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

interface ReviewRow {
  id: string;
  learnerName: string;
  rating: number;
  title: string;
  body: string;
  createdAt: string;
}

// GET /api/reviews?courseId=...  → list reviews + summary for a course
export async function GET(req: NextRequest) {
  const courseId = req.nextUrl.searchParams.get("courseId");
  if (!courseId) return NextResponse.json({ error: "courseId required" }, { status: 400 });

  const reviews = await db.review.findMany({
    where: { courseId },
    orderBy: { createdAt: "desc" },
  });

  const rows: ReviewRow[] = reviews.map((r) => ({
    id: r.id,
    learnerName: r.learnerName,
    rating: r.rating,
    title: r.title,
    body: r.body,
    createdAt: r.createdAt.toISOString(),
  }));

  const avg = reviews.length ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10 : 0;
  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of reviews) dist[r.rating] = (dist[r.rating] ?? 0) + 1;

  return NextResponse.json({
    reviews: rows,
    summary: { count: reviews.length, average: avg, distribution: dist },
  });
}

// POST /api/reviews  { courseId, learnerName, rating, title, body }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const courseId = body?.courseId;
    const learnerName = (body?.learnerName as string | undefined)?.trim();
    const rating = Number(body?.rating);
    const title = (body?.title as string | undefined)?.trim();
    const bodyText = (body?.body as string | undefined)?.trim();

    if (!courseId) return NextResponse.json({ error: "courseId required" }, { status: 400 });
    if (!learnerName) return NextResponse.json({ error: "learnerName required" }, { status: 400 });
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "rating must be 1-5" }, { status: 400 });
    }
    if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });
    if (!bodyText) return NextResponse.json({ error: "body required" }, { status: 400 });

    // Prevent duplicate reviews from the same learner on the same course.
    const existing = await db.review.findFirst({ where: { courseId, learnerName } });
    if (existing) {
      const updated = await db.review.update({
        where: { id: existing.id },
        data: { rating, title, body: bodyText },
      });
      return NextResponse.json({ review: { id: updated.id, learnerName: updated.learnerName, rating: updated.rating, title: updated.title, body: updated.body, createdAt: updated.createdAt.toISOString() } });
    }

    const review = await db.review.create({
      data: { courseId, learnerName, rating, title, body: bodyText },
    });
    return NextResponse.json(
      { review: { id: review.id, learnerName: review.learnerName, rating: review.rating, title: review.title, body: review.body, createdAt: review.createdAt.toISOString() } },
      { status: 201 },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to post review";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
