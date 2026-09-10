"use client";
import { useEffect, useState } from "react";
import { api, type ReviewRow, type ReviewSummary } from "@/lib/api-client";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, MessageSquare, Loader2, ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  courseId: string;
  courseCode: string;
}

export function ReviewsSection({ courseId, courseCode }: Props) {
  const learnerName = useAppStore((s) => s.learnerName);
  const [data, setData] = useState<{ reviews: ReviewRow[]; summary: ReviewSummary } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState(learnerName);
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const d = await api.getReviews(courseId);
      setData(d);
    } catch {
      setData({ reviews: [], summary: { count: 0, average: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } } });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  async function submit() {
    if (!name.trim()) {
      setErr("Enter your name to post a review.");
      return;
    }
    if (!title.trim() || !body.trim()) {
      setErr("Add a title and review text.");
      return;
    }
    setErr(null);
    setSubmitting(true);
    try {
      await api.postReview({ courseId, learnerName: name.trim(), rating, title: title.trim(), body: body.trim() });
      setShowForm(false);
      setTitle("");
      setBody("");
      setRating(5);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to post review");
    } finally {
      setSubmitting(false);
    }
  }

  const s = data?.summary;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-4 w-4 text-primary" /> Learner reviews
          </CardTitle>
          <Button size="sm" variant={showForm ? "ghost" : "outline"} onClick={() => setShowForm((v) => !v)} className="gap-1.5">
            {showForm ? "Cancel" : "Write a review"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading reviews…
          </div>
        ) : (
          <>
            {/* Summary */}
            {s && s.count > 0 && (
              <div className="grid gap-4 sm:grid-cols-[140px_1fr] sm:items-center">
                <div className="text-center sm:border-r sm:border-border/60 sm:pr-4">
                  <p className="text-4xl font-bold tabular-nums">{s.average.toFixed(1)}</p>
                  <div className="mt-1 flex justify-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={cn("h-4 w-4", n <= Math.round(s.average) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")}
                      />
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{s.count} review{s.count === 1 ? "" : "s"}</p>
                </div>
                <div className="space-y-1">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = s.distribution[star] ?? 0;
                    const pct = s.count ? (count / s.count) * 100 : 0;
                    return (
                      <div key={star} className="flex items-center gap-2 text-xs">
                        <span className="w-3 text-muted-foreground">{star}</span>
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-6 text-right tabular-nums text-muted-foreground">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Review form */}
            {showForm && (
              <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs">Your name</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jordan Avery" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Rating</Label>
                    <div className="mt-1.5 flex gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setRating(n)}
                          onMouseEnter={() => setHover(n)}
                          onMouseLeave={() => setHover(0)}
                          className="p-0.5"
                          aria-label={`Rate ${n} stars`}
                        >
                          <Star
                            className={cn(
                              "h-6 w-6 transition",
                              n <= (hover || rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30 hover:text-muted-foreground",
                            )}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Title</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Summarize your experience" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Review</Label>
                  <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="What did you learn? Who would this course suit?" rows={3} className="mt-1" />
                </div>
                {err && <p className="text-xs text-destructive">{err}</p>}
                <Button onClick={submit} disabled={submitting} className="gap-2">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
                  {submitting ? "Posting…" : "Post review"}
                </Button>
              </div>
            )}

            {/* Reviews list */}
            {data && data.reviews.length === 0 && !showForm ? (
              <div className="py-8 text-center">
                <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/40" />
                <p className="mt-2 text-sm text-muted-foreground">No reviews yet. Be the first to review {courseCode}.</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={() => setShowForm(true)}>
                  Write the first review
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {data?.reviews.map((r) => (
                  <ReviewCard key={r.id} review={r} />
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ReviewCard({ review }: { review: ReviewRow }) {
  const initials = review.learnerName
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="rounded-lg border border-border/60 p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {initials || "?"}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">{review.learnerName}</p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className={cn("h-3 w-3", n <= review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
                  ))}
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {new Date(review.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-[11px] text-muted-foreground" disabled>
              <ThumbsUp className="h-3 w-3" /> Helpful
            </Button>
          </div>
          <p className="mt-1.5 text-sm font-medium">{review.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{review.body}</p>
        </div>
      </div>
    </div>
  );
}
