"use client";
import { useEffect, useState } from "react";
import { api, type DashboardEnrollment } from "@/lib/api-client";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  Play,
  Sparkles,
  User,
} from "lucide-react";
import { LEVEL_NAMES } from "@/lib/framework/types";

export function DashboardView() {
  const learnerName = useAppStore((s) => s.learnerName);
  const setLearnerName = useAppStore((s) => s.setLearnerName);
  const startLearning = useAppStore((s) => s.startLearning);
  const openCourse = useAppStore((s) => s.openCourse);
  const setView = useAppStore((s) => s.setView);

  const [name, setName] = useState(learnerName);
  const [enrollments, setEnrollments] = useState<DashboardEnrollment[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function load(n: string) {
    const trimmed = n.trim();
    if (!trimmed) return;
    setLoading(true);
    setSearched(true);
    setLearnerName(trimmed);
    try {
      const ens = await api.getLearnerDashboard(trimmed);
      setEnrollments(ens);
    } catch {
      setEnrollments([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (learnerName) load(learnerName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalCEUs = (enrollments ?? []).reduce(
    (sum, e) => sum + e.credentialsEarned.reduce((c, x) => c + x.ceus, 0),
    0,
  );
  const totalCompleted = (enrollments ?? []).reduce((s, e) => s + e.stats.completedClasses, 0);
  const totalQuizzes = (enrollments ?? []).reduce((s, e) => s + e.stats.passedQuizzes, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
          <LayoutDashboard className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Learner dashboard</h1>
          <p className="text-sm text-muted-foreground">Your progress, credentials, and next-up lessons across every pathway.</p>
        </div>
      </div>

      {/* Name lookup */}
      <Card className="mt-6">
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-muted-foreground">Your name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") load(name);
              }}
              placeholder="e.g. Jordan Avery"
              className="mt-1"
            />
          </div>
          <Button onClick={() => load(name)} disabled={loading} className="gap-2">
            <Play className="h-4 w-4" /> {loading ? "Loading…" : "View my progress"}
          </Button>
        </CardContent>
      </Card>

      {enrollments === null && !loading && (
        <Card className="mt-6 border-dashed">
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-muted">
              <User className="h-6 w-6 text-muted-foreground" />
            </span>
            <p className="text-sm text-muted-foreground">
              Enter your name above to see your enrolled courses, completed lessons, earned credentials, and what to learn next.
            </p>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      )}

      {enrollments && !enrollments.length && !loading && searched && (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-muted">
              <BookOpen className="h-6 w-6 text-muted-foreground" />
            </span>
            <p className="text-sm font-medium">No enrollments yet for &ldquo;{learnerName}&rdquo;.</p>
            <p className="text-xs text-muted-foreground">Pick a course from the catalog and enroll to start your pathway.</p>
            <Button variant="outline" className="mt-2 gap-2" onClick={() => setView("catalog")}>
              Browse catalog <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {enrollments && enrollments.length > 0 && (
        <>
          {/* Summary stats */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard icon={BookOpen} value={enrollments.length} label="Pathways enrolled" />
            <StatCard icon={CheckCircle2} value={totalCompleted} label="Lessons completed" />
            <StatCard icon={ListChecks} value={totalQuizzes} label="Quizzes passed" />
            <StatCard icon={Award} value={totalCEUs.toFixed(1)} label="CEUs earned" highlight />
          </div>

          {/* Enrolled pathways */}
          <div className="mt-6 space-y-4">
            {enrollments.map((en) => (
              <Card key={en.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge className="gap-1">
                        <Sparkles className="h-3 w-3" /> {en.course.code}
                      </Badge>
                      <CardTitle className="text-lg">{en.course.title}</CardTitle>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        startLearning({
                          courseCode: en.course.code,
                          moduleCode: en.stats.nextModuleCode ?? undefined,
                          classId: en.stats.nextClassId ?? undefined,
                        })
                      }
                      className="gap-1.5"
                    >
                      <Play className="h-3.5 w-3.5" />
                      {en.stats.overallPct >= 100 ? "Review course" : en.stats.overallPct > 0 ? "Continue" : "Start learning"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* progress bar */}
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="font-medium">Overall progress</span>
                      <span className="text-muted-foreground">
                        {en.stats.completedClasses}/{en.stats.totalClasses} lessons · {en.stats.passedQuizzes}/{en.stats.totalModules} quizzes
                      </span>
                    </div>
                    <Progress value={en.stats.overallPct} className="h-2" />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <MiniStat icon={BookOpen} value={`${en.stats.completedClasses}`} label="Lessons done" />
                    <MiniStat icon={ListChecks} value={`${en.stats.passedQuizzes}`} label="Modules passed" />
                    <MiniStat icon={Clock} value={`${en.course.totalHours}h`} label="Pathway hours" />
                  </div>

                  {/* Credentials earned */}
                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <GraduationCap className="h-3.5 w-3.5 text-primary" /> Credential ladder
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      {LEVEL_NAMES.map((lvlName, i) => {
                        const lvl = (i + 1) * 100;
                        const earned = en.credentialsEarned.find((c) => c.level === lvl);
                        return (
                          <div
                            key={lvl}
                            className={`rounded-lg border p-2.5 transition ${
                              earned
                                ? "border-primary/40 bg-primary/5"
                                : "border-border/60 bg-muted/20 opacity-70"
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              {earned ? (
                                <Award className="h-3.5 w-3.5 text-primary" />
                              ) : (
                                <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/30" />
                              )}
                              <span className="text-[11px] font-medium">{lvlName}</span>
                            </div>
                            <p className="mt-1 text-[11px] leading-tight text-muted-foreground">
                              {earned ? `${earned.ceus} CEU earned` : "Locked"}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Next up */}
                  {en.stats.nextModuleCode && en.stats.nextClassId && (
                    <div className="flex items-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3">
                      <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium">Next up</p>
                        <p className="truncate text-sm">
                          <span className="text-primary">{en.stats.nextModuleCode}</span> · class {en.stats.nextClassId}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openCourse(en.course.code)}
                        className="shrink-0 text-xs"
                      >
                        Syllabus
                      </Button>
                    </div>
                  )}

                  {en.stats.overallPct >= 100 && (
                    <div className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 p-3">
                      <Award className="h-5 w-5 text-primary" />
                      <p className="text-sm font-medium">Pathway complete — all {en.stats.totalClasses} lessons done and {en.stats.totalModules} quizzes passed.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
  highlight,
}: {
  icon: typeof BookOpen;
  value: string | number;
  label: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-primary/40 bg-primary/5" : ""}>
      <CardContent className="p-4">
        <Icon className={`h-5 w-5 ${highlight ? "text-primary" : "text-muted-foreground"}`} />
        <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function MiniStat({ icon: Icon, value, label }: { icon: typeof BookOpen; value: string; label: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
      <Icon className="h-3.5 w-3.5 text-primary" />
      <p className="mt-1 text-sm font-semibold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
