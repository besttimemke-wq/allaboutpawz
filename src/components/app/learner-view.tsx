"use client";
import { useEffect, useMemo, useState } from "react";
import { api, type CourseRow, parseProgress } from "@/lib/api-client";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  CheckCircle2,
  Circle,
  Clock,
  Award,
  BookOpen,
  Brain,
  HelpCircle,
  Check,
  ListChecks,
  Sparkles,
  MessageSquare,
  ArrowLeft,
  Menu,
} from "lucide-react";
import type { ClassBlock, Module } from "@/lib/framework/types";
import { cn } from "@/lib/utils";
import { Markdown } from "./markdown";
import { LeashGuideChat } from "./leashguide-chat";
import { ModuleQuiz } from "./module-quiz";

type Progress2 = Record<string, { completedClasses: string[]; quizScore?: number; quizPassed?: boolean }>;

const FLOW_STAGES = [
  { key: "connect" as const, label: "Connect", num: 1, hint: "Hook · shared context" },
  { key: "learn" as const, label: "Learn", num: 2, hint: "Core teaching" },
  { key: "seeIt" as const, label: "See It", num: 3, hint: "Worked example" },
  { key: "doIt" as const, label: "Do It", num: 4, hint: "Applied practice" },
  { key: "check" as const, label: "Check", num: 5, hint: "Knowledge check" },
];

export function LearnerView() {
  const target = useAppStore((s) => s.learnerTarget);
  const learnerName = useAppStore((s) => s.learnerName);
  const setView = useAppStore((s) => s.setView);

  const [course, setCourse] = useState<CourseRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress2>({});
  const [selModule, setSelModule] = useState<string | null>(target?.moduleCode ?? null);
  const [selClass, setSelClass] = useState<string | null>(target?.classId ?? null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

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

  const allClasses = useMemo(() => {
    if (!course) return [] as { module: Module; cls: ClassBlock; modIndex: number; clsIndex: number }[];
    const out: { module: Module; cls: ClassBlock; modIndex: number; clsIndex: number }[] = [];
    course.pathway.levels.forEach((lvl, li) => {
      lvl.modules.forEach((m, mi) => {
        m.subModules.forEach((sm) => {
          sm.classes.forEach((cls, ci) => {
            const flatModIndex = li * 5 + mi;
            out.push({ module: m, cls, modIndex: flatModIndex, clsIndex: out.length });
          });
        });
      });
    });
    return out;
  }, [course]);

  const current = useMemo(() => {
    if (!allClasses.length) return null;
    const exact = allClasses.find((c) => c.module.code === selModule && c.cls.id === selClass);
    if (exact) return exact;
    if (selModule) {
      const firstOfModule = allClasses.find((c) => c.module.code === selModule);
      if (firstOfModule) return firstOfModule;
    }
    return allClasses[0];
  }, [allClasses, selModule, selClass]);

  const currentFlatIndex = useMemo(
    () => (current ? allClasses.findIndex((c) => c.module.code === current.module.code && c.cls.id === current.cls.id) : -1),
    [allClasses, current],
  );
  const prevClass = currentFlatIndex > 0 ? allClasses[currentFlatIndex - 1] : null;
  const nextClass = currentFlatIndex >= 0 && currentFlatIndex < allClasses.length - 1 ? allClasses[currentFlatIndex + 1] : null;

  async function patchProgress(next: Progress2) {
    setProgress(next);
    if (enrollmentId) await api.updateProgress(enrollmentId, next);
  }

  async function markCompleteAndAdvance() {
    if (!current) return;
    const modCode = current.module.code;
    const clsId = current.cls.id;
    const next: Progress2 = {
      ...progress,
      [modCode]: {
        completedClasses: Array.from(new Set([...(progress[modCode]?.completedClasses ?? []), clsId])),
        quizScore: progress[modCode]?.quizScore,
        quizPassed: progress[modCode]?.quizPassed,
      },
    };
    await patchProgress(next);
    if (nextClass) {
      setSelModule(nextClass.module.code);
      setSelClass(nextClass.cls.id);
      setShowQuiz(false);
    }
  }

  async function onQuizResult(score: number, passed: boolean) {
    if (!selModule) return;
    const next: Progress2 = {
      ...progress,
      [selModule]: {
        completedClasses: progress[selModule]?.completedClasses ?? [],
        quizScore: score,
        quizPassed: passed,
      },
    };
    await patchProgress(next);
  }

  function navigateToClass(modCode: string, clsId: string) {
    setSelModule(modCode);
    setSelClass(clsId);
    setShowQuiz(false);
    setSidebarOpen(false);
  }

  if (loading) {
    return (
      <div className="px-4 py-8 sm:px-6">
        <Skeleton className="h-10 w-full max-w-3xl" />
        <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
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
    <div className="min-h-screen bg-muted/20">
      {/* Top bar: course identity + progress */}
      <div className="sticky top-16 z-30 border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="px-4 sm:px-6">
          <div className="flex h-12 items-center gap-3">
            <Button variant="ghost" size="sm" className="gap-1.5 px-2 text-muted-foreground" onClick={() => setView("course")}>
              <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">{course.code}</span>
            </Button>
            <div className="h-4 w-px bg-border" />
            <span className="truncate text-sm font-medium">{course.title}</span>
            <div className="ml-auto flex items-center gap-3">
              <div className="hidden items-center gap-2 sm:flex">
                <span className="text-xs text-muted-foreground">{doneClasses}/{totalClasses}</span>
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${overallPct}%` }} />
                </div>
                <span className="text-xs font-medium tabular-nums">{overallPct}%</span>
              </div>
              {/* LeashGuide slide-over trigger */}
              <Sheet open={chatOpen} onOpenChange={setChatOpen}>
                <SheetTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span className="hidden sm:inline">LeashGuide</span>
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                    </span>
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-[min(100vw,440px)] p-0 sm:max-w-[440px]">
                  <SheetHeader className="sr-only">
                    <SheetTitle>LeashGuide AI tutor</SheetTitle>
                  </SheetHeader>
                  {current && (
                    <LeashGuideChat
                      courseCode={course.code}
                      moduleCode={current.module.code}
                      moduleTitle={`${current.module.code} · ${current.module.title}`}
                      classId={current.cls.id}
                      classTitle={current.cls.title}
                    />
                  )}
                </SheetContent>
              </Sheet>
              {/* Module nav slide-over (mobile) */}
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Body: sidebar + content */}
      <div className="mx-auto grid max-w-[1600px] gap-0 lg:grid-cols-[300px_1fr]">
        {/* Module sidebar (desktop) */}
        <aside className="sticky top-28 hidden h-[calc(100vh-7rem)] overflow-y-auto border-r border-border/60 bg-background p-3 lg:block scroll-area-custom">
          <ModuleSidebar
            course={course}
            progress={progress}
            current={current}
            onNavigate={navigateToClass}
            onOpenQuiz={(modCode) => {
              setSelModule(modCode);
              setShowQuiz(true);
              setSidebarOpen(false);
            }}
          />
        </aside>

        {/* Module sidebar (mobile slide-over) */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-[min(100vw,340px)] p-0 sm:max-w-[340px]">
            <SheetHeader className="sr-only">
              <SheetTitle>Course modules</SheetTitle>
            </SheetHeader>
            <div className="h-full overflow-y-auto p-3 scroll-area-custom">
              <ModuleSidebar
                course={course}
                progress={progress}
                current={current}
                onNavigate={navigateToClass}
                onOpenQuiz={(modCode) => {
                  setSelModule(modCode);
                  setShowQuiz(true);
                  setSidebarOpen(false);
                }}
              />
            </div>
          </SheetContent>
        </Sheet>

        {/* Main content */}
        <main className="min-w-0 px-4 py-8 sm:px-8 lg:px-12">
          {current && !showQuiz && (
            <LessonPanel
              module={current.module}
              cls={current.cls}
              onComplete={markCompleteAndAdvance}
              isDone={progress[current.module.code]?.completedClasses.includes(current.cls.id) ?? false}
              onOpenQuiz={() => setShowQuiz(true)}
              prevClass={prevClass}
              nextClass={nextClass}
              onNavigate={(m, c) => navigateToClass(m, c)}
              currentStep={currentFlatIndex + 1}
              totalSteps={totalClasses}
            />
          )}
          {current && showQuiz && (
            <div className="mx-auto max-w-3xl">
              <Button variant="ghost" size="sm" className="mb-4 gap-1.5 text-muted-foreground" onClick={() => setShowQuiz(false)}>
                <ChevronLeft className="h-4 w-4" /> Back to lesson
              </Button>
              <ModuleQuiz courseCode={course.code} courseRowId={course.id} module={current.module} onPassed={onQuizResult} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Module sidebar — the course outline
// ---------------------------------------------------------------------------

function ModuleSidebar({
  course,
  progress,
  current,
  onNavigate,
  onOpenQuiz,
}: {
  course: CourseRow;
  progress: Progress2;
  current: { module: Module; cls: ClassBlock } | null;
  onNavigate: (modCode: string, clsId: string) => void;
  onOpenQuiz: (modCode: string) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Course outline
      </p>
      {course.pathway.levels.map((lvl) => (
        <div key={lvl.level} className="space-y-0.5">
          <div className="flex items-center gap-1.5 px-2 py-2">
            <Badge variant="secondary" className="text-[9px]">{lvl.level}</Badge>
            <span className="text-xs font-semibold">{lvl.name}</span>
          </div>
          {lvl.modules.map((m) => {
            const mp = progress[m.code];
            const done = mp?.completedClasses?.length ?? 0;
            const passed = mp?.quizPassed;
            const classCount = m.subModules.reduce((n, s) => n + s.classes.length, 0);
            const isActive = current?.module.code === m.code;
            return (
              <div key={m.code}>
                <button
                  onClick={() => onNavigate(m.code, m.subModules[0]?.classes[0]?.id ?? "")}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition",
                    isActive ? "bg-primary/10 font-medium" : "hover:bg-muted/60",
                  )}
                >
                  {passed ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                  ) : done > 0 ? (
                    <Circle className="h-3.5 w-3.5 shrink-0 fill-primary/25 text-primary" />
                  ) : (
                    <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{m.code}</span>
                    <span className="block truncate text-[10px] text-muted-foreground">{m.title}</span>
                  </span>
                  <span className="shrink-0 text-[9px] text-muted-foreground">{done}/{classCount}</span>
                </button>
                {isActive && (
                  <div className="ml-4 border-l border-border/50 pl-1.5">
                    {m.subModules.map((sm) => (
                      <div key={sm.id} className="py-0.5">
                        {sm.classes.map((cls) => {
                          const cdone = mp?.completedClasses?.includes(cls.id);
                          const isCurrent = current?.cls.id === cls.id;
                          return (
                            <button
                              key={cls.id}
                              onClick={() => onNavigate(m.code, cls.id)}
                              className={cn(
                                "flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[11px] transition",
                                isCurrent ? "bg-secondary font-medium" : "hover:bg-muted/60",
                              )}
                            >
                              {cdone ? (
                                <CheckCircle2 className="h-3 w-3 shrink-0 text-primary" />
                              ) : (
                                <Circle className="h-3 w-3 shrink-0 text-muted-foreground/30" />
                              )}
                              <span className="truncate">{cls.title}</span>
                            </button>
                          );
                        })}
                      </div>
                    ))}
                    <button
                      onClick={() => onOpenQuiz(m.code)}
                      className={cn(
                        "flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[11px] transition hover:bg-muted/60",
                        "mt-0.5",
                      )}
                    >
                      <ListChecks className="h-3 w-3 shrink-0 text-primary" />
                      <span>Module quiz</span>
                      {passed && <Badge variant="secondary" className="ml-auto text-[8px]">{mp?.quizScore}%</Badge>}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lesson panel — the actual reading experience
// ---------------------------------------------------------------------------

function LessonPanel({
  module,
  cls,
  onComplete,
  isDone,
  onOpenQuiz,
  prevClass,
  nextClass,
  onNavigate,
  currentStep,
  totalSteps,
}: {
  module: Module;
  cls: ClassBlock;
  onComplete: () => void;
  isDone: boolean;
  onOpenQuiz: () => void;
  prevClass: { module: Module; cls: ClassBlock } | null;
  nextClass: { module: Module; cls: ClassBlock } | null;
  onNavigate: (modCode: string, clsId: string) => void;
  currentStep: number;
  totalSteps: number;
}) {
  const [revealedMap, setRevealedMap] = useState<Record<string, Record<number, boolean>>>({});
  const revealed = revealedMap[cls.id] ?? {};
  const setRevealed = (updater: (prev: Record<number, boolean>) => Record<number, boolean>) =>
    setRevealedMap((prev) => ({
      ...prev,
      [cls.id]: updater(prev[cls.id] ?? {}),
    }));

  return (
    <article className="mx-auto max-w-3xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>{module.levelName}</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-primary">{module.code}</span>
        <ChevronRight className="h-3 w-3" />
        <span className="font-medium text-foreground">{cls.id}</span>
        <span className="ml-auto text-muted-foreground">Lesson {currentStep} of {totalSteps}</span>
      </nav>

      {/* Title block */}
      <header className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          {cls.isAppliedLab && (
            <Badge variant="secondary" className="gap-1 text-[11px]">
              <Brain className="h-3 w-3" /> Applied Lab
            </Badge>
          )}
          {isDone && (
            <Badge variant="secondary" className="gap-1 text-[11px] text-primary">
              <CheckCircle2 className="h-3 w-3" /> Completed
            </Badge>
          )}
          <Badge variant="outline" className="gap-1 text-[11px]">
            <Clock className="h-3 w-3" /> {cls.duration}
          </Badge>
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{cls.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{module.code} · {module.title}</span>
        </p>
      </header>

      {/* Module objectives (upfront so learner knows the goal) */}
      <section className="mt-6 rounded-xl border border-border/60 bg-card p-5">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <BookOpen className="h-3.5 w-3.5 text-primary" /> What you&apos;ll be able to do after this module
        </p>
        <ul className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
          {module.objectives.map((o, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
              <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">{i + 1}</span>
              {o}
            </li>
          ))}
        </ul>
      </section>

      {/* The 5-part flow as a guided path (not tabs) */}
      <section className="mt-8">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          The 5-part flow
        </p>
        <div className="space-y-5">
          {FLOW_STAGES.map((s, idx) => (
            <div key={s.key} className="relative pl-10">
              {/* Step number / connector */}
              <div className="absolute left-0 top-0 flex flex-col items-center">
                <span className={cn(
                  "grid h-7 w-7 place-items-center rounded-full text-xs font-bold transition",
                  "bg-primary text-primary-foreground shadow-sm",
                )}>{s.num}</span>
                {idx < FLOW_STAGES.length - 1 && (
                  <span className="mt-1 h-[calc(100%-1rem)] w-px bg-border" />
                )}
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-base font-semibold">{s.label}</h3>
                  <span className="text-[11px] text-muted-foreground">{s.hint}</span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {cls.flow[s.key]}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Teachable content — the real material */}
      <section className="mt-8 rounded-xl border border-border/60 bg-card p-6">
        <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <BookOpen className="h-3.5 w-3.5 text-primary" /> Teachable content
        </p>
        <Markdown>{cls.teachableContent}</Markdown>
      </section>

      {/* Knowledge check */}
      {cls.knowledgeCheck.length > 0 && (
        <section className="mt-8">
          <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <HelpCircle className="h-3.5 w-3.5 text-primary" /> Knowledge check
          </p>
          <div className="space-y-3">
            {cls.knowledgeCheck.map((k, i) => (
              <div key={i} className="rounded-lg border border-border/60 bg-card p-4">
                <p className="text-sm font-medium">{i + 1}. {k.question}</p>
                {k.options && (
                  <ul className="mt-2 space-y-1 text-sm">
                    {k.options.map((o) => {
                      const isCorrect = revealed[i] && o === k.answer;
                      return (
                        <li key={o} className={cn(
                          "flex items-center gap-2 rounded-md px-2 py-1 transition",
                          isCorrect && "bg-primary/10 text-primary",
                          revealed[i] && o !== k.answer && "opacity-60",
                        )}>
                          <span className={cn(
                            "grid h-4 w-4 shrink-0 place-items-center rounded-full border",
                            isCorrect ? "border-primary bg-primary text-primary-foreground" : "border-border",
                          )}>
                            {isCorrect && <Check className="h-2.5 w-2.5" />}
                          </span>
                          {o}
                        </li>
                      );
                    })}
                  </ul>
                )}
                {revealed[i] ? (
                  <div className="mt-2 rounded-md bg-muted/40 p-2.5 text-xs">
                    <p><span className="font-medium text-primary">Answer:</span> {k.answer}</p>
                    <p className="mt-0.5 text-muted-foreground">{k.rationale}</p>
                    <Button variant="ghost" size="sm" className="mt-1 h-6 p-0 text-[11px]" onClick={() => setRevealed((r) => ({ ...r, [i]: false }))}>
                      Hide
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" className="mt-2 h-7 text-xs" onClick={() => setRevealed((r) => ({ ...r, [i]: true }))}>
                    Reveal answer
                  </Button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Capstone artifact */}
      <section className="mt-8 rounded-xl border border-primary/30 bg-primary/5 p-5">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
          <Award className="h-3.5 w-3.5" /> Capstone artifact for this module
        </p>
        <p className="mt-1.5 text-sm font-medium">{module.capstoneEvidence}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Pass the module quiz at {module.quiz.passThreshold}% and complete the artifact to earn this module&apos;s credit.
        </p>
      </section>

      {/* Action bar: prev / complete / quiz / next */}
      <nav className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-6">
        <div>
          {prevClass ? (
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => onNavigate(prevClass.module.code, prevClass.cls.id)}>
              <ChevronLeft className="h-4 w-4" />
              <span className="flex flex-col items-start leading-tight">
                <span className="text-[10px] text-muted-foreground">Previous</span>
                <span className="max-w-[160px] truncate text-xs font-medium">{prevClass.cls.title}</span>
              </span>
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">Start of pathway</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onOpenQuiz}>
            <ListChecks className="h-4 w-4" /> Module quiz
          </Button>
          <Button size="sm" className="gap-1.5" onClick={onComplete}>
            <Check className="h-4 w-4" />
            {isDone ? "Complete & continue" : "Mark complete"}
          </Button>
        </div>
        <div>
          {nextClass ? (
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => onNavigate(nextClass.module.code, nextClass.cls.id)}>
              <span className="flex flex-col items-end leading-tight">
                <span className="text-[10px] text-muted-foreground">Next</span>
                <span className="max-w-[160px] truncate text-xs font-medium">{nextClass.cls.title}</span>
              </span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">End of pathway</span>
          )}
        </div>
      </nav>
    </article>
  );
}
