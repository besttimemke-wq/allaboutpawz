"use client";
import { useEffect, useMemo, useState } from "react";
import { api, type CourseRow, parseProgress } from "@/lib/api-client";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronRight,
  CheckCircle2,
  Circle,
  Clock,
  Award,
  BookOpen,
  Brain,
  HelpCircle,
  Check,
  ListChecks,
  ChevronDown,
  ArrowLeft,
} from "lucide-react";
import type { ClassBlock, Module } from "@/lib/framework/types";
import { cn } from "@/lib/utils";
import { Markdown } from "./markdown";
import { LeashGuideChat } from "./leashguide-chat";
import { ModuleQuiz } from "./module-quiz";

type Progress = Record<string, { completedClasses: string[]; quizScore?: number; quizPassed?: boolean }>;

const FLOW_STAGES = [
  { key: "connect", label: "Connect", icon: BookOpen },
  { key: "learn", label: "Learn", icon: BookOpen },
  { key: "seeIt", label: "See It", icon: BookOpen },
  { key: "doIt", label: "Do It", icon: BookOpen },
  { key: "check", label: "Check", icon: Check },
] as const;

export function LearnerView() {
  const target = useAppStore((s) => s.learnerTarget);
  const learnerName = useAppStore((s) => s.learnerName);
  const setView = useAppStore((s) => s.setView);

  const [course, setCourse] = useState<CourseRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress>({});
  const [selModule, setSelModule] = useState<string | null>(target?.moduleCode ?? null);
  const [selClass, setSelClass] = useState<string | null>(target?.classId ?? null);
  const [showQuiz, setShowQuiz] = useState(false);

  useEffect(() => {
    if (!target?.courseCode) {
      setView("catalog");
      return;
    }
    let cancelled = false;
    api
      .getCourse(target.courseCode)
      .then(async (c) => {
        if (cancelled) return;
        setCourse(c);
        // resolve enrollment
        let enrolls = await api.getEnrollments(c.id, learnerName || undefined);
        if (!enrolls.length && learnerName) {
          await api.enroll(c.id, learnerName);
          enrolls = await api.getEnrollments(c.id, learnerName);
        }
        if (cancelled) return;
        if (enrolls[0]) {
          setEnrollmentId(enrolls[0].id);
          setProgress(parseProgress(enrolls[0].progress));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [target?.courseCode, learnerName, setView]);

  // flatten classes for nav + next
  const allClasses = useMemo(() => {
    if (!course) return [] as { module: Module; cls: ClassBlock }[];
    return course.pathway.levels.flatMap((l) =>
      l.modules.flatMap((m) => m.subModules.flatMap((sm) => sm.classes.map((cls) => ({ module: m, cls })))),
    );
  }, [course]);

  const current = useMemo(() => {
    if (!allClasses.length) return null;
    const exact = allClasses.find((c) => c.module.code === selModule && c.cls.id === selClass);
    if (exact) return exact;
    // fall back to first class of the selected module
    if (selModule) {
      const firstOfModule = allClasses.find((c) => c.module.code === selModule);
      if (firstOfModule) return firstOfModule;
    }
    return allClasses[0];
  }, [allClasses, selModule, selClass]);

  async function patchProgress(next: Progress) {
    setProgress(next);
    if (enrollmentId) await api.updateProgress(enrollmentId, next);
  }

  async function markCompleteAndAdvance() {
    if (!current) return;
    const modCode = current.module.code;
    const clsId = current.cls.id;
    const next: Progress = {
      ...progress,
      [modCode]: {
        completedClasses: Array.from(new Set([...(progress[modCode]?.completedClasses ?? []), clsId])),
        quizScore: progress[modCode]?.quizScore,
        quizPassed: progress[modCode]?.quizPassed,
      },
    };
    await patchProgress(next);
    // advance
    const idx = allClasses.findIndex((c) => c.module.code === modCode && c.cls.id === clsId);
    const nxt = allClasses[idx + 1];
    if (nxt) {
      setSelModule(nxt.module.code);
      setSelClass(nxt.cls.id);
      setShowQuiz(false);
    }
  }

  async function onQuizResult(score: number, passed: boolean) {
    if (!selModule) return;
    const next: Progress = {
      ...progress,
      [selModule]: {
        completedClasses: progress[selModule]?.completedClasses ?? [],
        quizScore: score,
        quizPassed: passed,
      },
    };
    await patchProgress(next);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Skeleton className="h-8 w-48" />
        <div className="mt-4 grid gap-4 lg:grid-cols-[260px_1fr_360px]">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <p className="text-muted-foreground">Enroll in a course to start learning.</p>
        <Button variant="outline" className="mt-4" onClick={() => setView("catalog")}>
          Browse catalog
        </Button>
      </div>
    );
  }

  const totalClasses = allClasses.length;
  const doneClasses = allClasses.filter((c) => progress[c.module.code]?.completedClasses.includes(c.cls.id)).length;
  const overallPct = totalClasses ? Math.round((doneClasses / totalClasses) * 100) : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => setView("course")}>
            <ArrowLeft className="h-4 w-4" /> {course.code}
          </Button>
          <span className="text-sm font-medium">{course.title}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> {doneClasses}/{totalClasses} lessons
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-primary" /> {course.totalHours}h
          </span>
          <Badge variant="secondary" className="text-[11px]">{overallPct}% complete</Badge>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[260px_1fr_380px]">
        {/* Module nav */}
        <aside className="scroll-area-custom max-h-[calc(100vh-220px)] overflow-y-auto rounded-xl border border-border/60 bg-card p-2">
          {course.pathway.levels.map((lvl) => (
            <Collapsible key={lvl.level} defaultOpen={lvl.level === 100}>
              <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-muted/60">
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                <Badge variant="outline" className="text-[10px]">{lvl.level}</Badge>
                <span className="text-xs font-semibold">{lvl.name}</span>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-0.5 pb-1">
                {lvl.modules.map((m) => {
                  const mp = progress[m.code];
                  const done = mp?.completedClasses?.length ?? 0;
                  const passed = mp?.quizPassed;
                  return (
                    <div key={m.code}>
                      <button
                        onClick={() => {
                          setSelModule(m.code);
                          setSelClass(m.subModules[0]?.classes[0]?.id ?? null);
                          setShowQuiz(false);
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition",
                          current?.module.code === m.code ? "bg-primary/15 text-primary-foreground/90" : "hover:bg-muted/60",
                        )}
                      >
                        {passed ? (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                        ) : done > 0 ? (
                          <Circle className="h-3.5 w-3.5 shrink-0 fill-primary/30 text-primary" />
                        ) : (
                          <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{m.code} · {m.title}</span>
                          <span className="block text-[10px] text-muted-foreground">{done}/9 · {m.hours}h</span>
                        </span>
                      </button>
                      {selModule === m.code && current?.module.code === m.code && (
                        <div className="ml-4 border-l border-border/50 pl-2">
                          {m.subModules.map((sm) => (
                            <div key={sm.id} className="py-0.5">
                              <p className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{sm.id} · {sm.title.split(":").pop()?.trim()}</p>
                              {sm.classes.map((cls) => {
                                const cdone = mp?.completedClasses?.includes(cls.id);
                                return (
                                  <button
                                    key={cls.id}
                                    onClick={() => {
                                      setSelModule(m.code);
                                      setSelClass(cls.id);
                                      setShowQuiz(false);
                                    }}
                                    className={cn(
                                      "flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[11px] transition",
                                      current?.cls.id === cls.id ? "bg-secondary text-secondary-foreground" : "hover:bg-muted/60",
                                    )}
                                  >
                                    {cdone ? (
                                      <CheckCircle2 className="h-3 w-3 shrink-0 text-primary" />
                                    ) : (
                                      <Circle className="h-3 w-3 shrink-0 text-muted-foreground/40" />
                                    )}
                                    <span className="truncate">{cls.id} · {cls.title}</span>
                                  </button>
                                );
                              })}
                            </div>
                          ))}
                          <button
                            onClick={() => {
                              setSelModule(m.code);
                              setShowQuiz(true);
                            }}
                            className={cn(
                              "mt-1 flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[11px] transition",
                              showQuiz && current?.module.code === m.code ? "bg-secondary text-secondary-foreground" : "hover:bg-muted/60",
                            )}
                          >
                            <ListChecks className="h-3 w-3 text-primary" />
                            Module quiz
                            {mp?.quizPassed ? <Badge variant="secondary" className="ml-auto text-[9px]">{mp.quizScore}%</Badge> : null}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </aside>

        {/* Lesson + quiz */}
        <main className="min-w-0">
          {current && !showQuiz && (
            <LessonPanel
              module={current.module}
              cls={current.cls}
              onComplete={markCompleteAndAdvance}
              isDone={progress[current.module.code]?.completedClasses.includes(current.cls.id) ?? false}
              onOpenQuiz={() => {
                setSelModule(current.module.code);
                setSelClass(current.cls.id);
                setShowQuiz(true);
              }}
            />
          )}
          {current && showQuiz && (
            <div className="space-y-3">
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => setShowQuiz(false)}>
                <ChevronRight className="h-4 w-4 rotate-180" /> Back to lesson
              </Button>
              <ModuleQuiz courseCode={course.code} courseRowId={course.id} module={current.module} onPassed={onQuizResult} />
            </div>
          )}
        </main>

        {/* LeashGuide AI */}
        <aside className="lg:sticky lg:top-20 lg:h-[calc(100vh-180px)]">
          {current && (
            <LeashGuideChat
              courseCode={course.code}
              moduleCode={current.module.code}
              moduleTitle={`${current.module.code} · ${current.module.title}`}
              classId={current.cls.id}
              classTitle={current.cls.title}
            />
          )}
        </aside>
      </div>
    </div>
  );
}

function LessonPanel({
  module,
  cls,
  onComplete,
  isDone,
  onOpenQuiz,
}: {
  module: Module;
  cls: ClassBlock;
  onComplete: () => void;
  isDone: boolean;
  onOpenQuiz: () => void;
}) {
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="gap-1">{module.code}</Badge>
            <Badge variant="outline" className="text-[11px]">{cls.id} · {cls.duration}</Badge>
            {cls.isAppliedLab && (
              <Badge variant="secondary" className="text-[11px] gap-1">
                <Brain className="h-3 w-3" /> Applied Lab
              </Badge>
            )}
            {isDone && (
              <Badge variant="secondary" className="text-[11px] gap-1">
                <CheckCircle2 className="h-3 w-3" /> Completed
              </Badge>
            )}
          </div>
          <CardTitle className="text-xl">{module.title}</CardTitle>
          <p className="text-sm text-muted-foreground">{cls.title}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 5-part flow */}
          <Tabs defaultValue="connect">
            <TabsList className="w-full justify-start overflow-x-auto">
              {FLOW_STAGES.map((s) => (
                <TabsTrigger key={s.key} value={s.key} className="gap-1.5 text-xs">
                  <s.icon className="h-3.5 w-3.5" />
                  {s.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {FLOW_STAGES.map((s) => (
              <TabsContent key={s.key} value={s.key} className="mt-3">
                <div className="rounded-lg border-l-2 border-primary/50 bg-muted/30 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">{s.label}</p>
                  <p className="mt-1 text-sm leading-relaxed">{cls.flow[s.key]}</p>
                </div>
              </TabsContent>
            ))}
          </Tabs>

          {/* Teachable content */}
          <div className="rounded-lg border border-border/60 p-4">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5 text-primary" /> Teachable content
            </p>
            <Markdown>{cls.teachableContent}</Markdown>
          </div>

          {/* Knowledge check */}
          <div className="rounded-lg border border-border/60 p-4">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <HelpCircle className="h-3.5 w-3.5 text-primary" /> Knowledge check
            </p>
            <div className="space-y-2">
              {cls.knowledgeCheck.map((k, i) => (
                <div key={i} className="rounded-md bg-muted/40 p-2.5">
                  <p className="text-sm font-medium">{i + 1}. {k.question}</p>
                  {k.options && (
                    <ul className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
                      {k.options.map((o) => (
                        <li key={o} className={cn(revealed[i] && o === k.answer && "font-medium text-primary")}>
                          • {o}
                        </li>
                      ))}
                    </ul>
                  )}
                  {revealed[i] ? (
                    <p className="mt-1.5 text-xs">
                      <span className="font-medium text-primary">Answer:</span> {k.answer}
                      <span className="mt-0.5 block text-muted-foreground">{k.rationale}</span>
                    </p>
                  ) : (
                    <Button variant="ghost" size="sm" className="mt-1 h-6 text-xs" onClick={() => setRevealed((r) => ({ ...r, [i]: true }))}>
                      Reveal answer
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Objectives + capstone */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Module objectives</p>
              <ul className="mt-1.5 space-y-1 text-xs text-muted-foreground">
                {module.objectives.map((o, i) => (
                  <li key={i}>• {o}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Capstone artifact</p>
              <p className="mt-1.5 flex items-center gap-1.5 text-sm font-medium">
                <Award className="h-4 w-4 text-primary" /> {module.capstoneEvidence}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Pass the module quiz at {module.quiz.passThreshold}% and complete the artifact to earn this module&apos;s credit.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={onComplete} className="gap-2">
              <Check className="h-4 w-4" /> {isDone ? "Mark complete & continue" : "Complete & continue"}
            </Button>
            <Button variant="outline" onClick={onOpenQuiz} className="gap-2">
              <ListChecks className="h-4 w-4" /> Take module quiz
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
