"use client";
import { useEffect, useRef, useState } from "react";
import { api, type CourseRow, parseProgress } from "@/lib/api-client";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Circle,
  Clock,
  Award,
  Sparkles,
  Send,
  ArrowLeft,
  Menu,
  ListChecks,
  Loader2,
} from "lucide-react";
import type { Module, ClassBlock } from "@/lib/framework/types";
import { cn } from "@/lib/utils";
import { ModuleQuiz } from "./module-quiz";
import { Markdown } from "./markdown";

type Progress2 = Record<string, { completedClasses: string[]; quizScore?: number; quizPassed?: boolean }>;

interface TeachMsg {
  role: "user" | "assistant";
  content: string;
}

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

  const allClasses: { module: Module; cls: ClassBlock }[] = [];
  if (course) {
    course.pathway.levels.forEach((lvl) => {
      lvl.modules.forEach((m) => {
        m.subModules.forEach((sm) => {
          sm.classes.forEach((cls) => {
            allClasses.push({ module: m, cls });
          });
        });
      });
    });
  }

  const current = (() => {
    if (!allClasses.length) return null;
    const exact = allClasses.find((c) => c.module.code === selModule && c.cls.id === selClass);
    if (exact) return exact;
    if (selModule) {
      const firstOfModule = allClasses.find((c) => c.module.code === selModule);
      if (firstOfModule) return firstOfModule;
    }
    return allClasses[0];
  })();

  const currentFlatIndex = current
    ? allClasses.findIndex((c) => c.module.code === current.module.code && c.cls.id === current.cls.id)
    : -1;
  const prevClass = currentFlatIndex > 0 ? allClasses[currentFlatIndex - 1] : null;
  const nextClass = currentFlatIndex >= 0 && currentFlatIndex < allClasses.length - 1 ? allClasses[currentFlatIndex + 1] : null;

  async function patchProgress(next: Progress2) {
    setProgress(next);
    if (enrollmentId) await api.updateProgress(enrollmentId, next);
  }

  async function markComplete() {
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
  }

  async function onCompleteAndAdvance() {
    await markComplete();
    if (nextClass) {
      setSelModule(nextClass.module.code);
      setSelClass(nextClass.cls.id);
      setShowQuiz(false);
    }
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
        <Skeleton className="mt-6 h-96 rounded-xl" />
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
      {/* Top bar */}
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
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto grid max-w-[1600px] gap-0 lg:grid-cols-[300px_1fr]">
        {/* Sidebar (desktop) */}
        <aside className="sticky top-28 hidden h-[calc(100vh-7rem)] overflow-y-auto border-r border-border/60 bg-background p-3 lg:block scroll-area-custom">
          <ModuleSidebar
            course={course}
            progress={progress}
            current={current}
            onNavigate={navigateToClass}
            onOpenQuiz={(modCode) => {
              setSelModule(modCode);
              setShowQuiz(true);
            }}
          />
        </aside>

        {/* Sidebar (mobile) */}
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

        {/* Main: the live classroom */}
        <main className="min-w-0">
          {current && !showQuiz && (
            <LiveClassroom
              course={course}
              module={current.module}
              cls={current.cls}
              learnerName={learnerName}
              isDone={progress[current.module.code]?.completedClasses.includes(current.cls.id) ?? false}
              onComplete={onCompleteAndAdvance}
              onOpenQuiz={() => setShowQuiz(true)}
              prevClass={prevClass}
              nextClass={nextClass}
              onNavigate={navigateToClass}
              currentStep={currentFlatIndex + 1}
              totalSteps={totalClasses}
            />
          )}
          {current && showQuiz && (
            <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
              <Button variant="ghost" size="sm" className="mb-4 gap-1.5 text-muted-foreground" onClick={() => setShowQuiz(false)}>
                <ChevronLeft className="h-4 w-4" /> Back to class
              </Button>
              <ModuleQuiz courseCode={course.code} courseRowId={course.id} module={current.module} onPassed={() => {}} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Module sidebar (same as before)
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
                      className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[11px] transition hover:bg-muted/60 mt-0.5"
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
// THE LIVE CLASSROOM — LeashGuide teaches, learner responds, lesson moves
// ---------------------------------------------------------------------------

function LiveClassroom({
  course,
  module,
  cls,
  learnerName,
  isDone,
  onComplete,
  onOpenQuiz,
  prevClass,
  nextClass,
  onNavigate,
  currentStep,
  totalSteps,
}: {
  course: CourseRow;
  module: Module;
  cls: ClassBlock;
  learnerName: string;
  isDone: boolean;
  onComplete: () => void;
  onOpenQuiz: () => void;
  prevClass: { module: Module; cls: ClassBlock } | null;
  nextClass: { module: Module; cls: ClassBlock } | null;
  onNavigate: (modCode: string, clsId: string) => void;
  currentStep: number;
  totalSteps: number;
}) {
  const [messages, setMessages] = useState<TeachMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [classComplete, setClassComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);

  // Reset when class changes
  useEffect(() => {
    setMessages([]);
    setClassComplete(false);
    setError(null);
    setInput("");
    setStarted(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course.code, module.code, cls.id]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  async function beginLesson() {
    setStarted(true);
    await send("(begin lesson)");
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (loading) return;
    setError(null);
    if (trimmed && trimmed !== "(begin lesson)") {
      setMessages((m) => [...m, { role: "user", content: trimmed }]);
    }
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/ai/teach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseCode: course.code,
          moduleCode: module.code,
          classId: cls.id,
          message: trimmed || "(begin lesson)",
          history: messages,
          learnerName: learnerName || undefined,
        }),
      });
      if (!res.ok) throw new Error("LeashGuide couldn't respond");
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
      if (data.classComplete) setClassComplete(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Class header */}
      <div className="border-b border-border/60 bg-background px-4 py-4 sm:px-8">
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>{module.levelName}</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-primary">{module.code}</span>
          <ChevronRight className="h-3 w-3" />
          <span className="font-medium text-foreground">{cls.id}</span>
          <span className="ml-auto">Class {currentStep} of {totalSteps}</span>
        </nav>
        <div className="mt-2 flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{cls.title}</h1>
          {cls.isAppliedLab && (
            <Badge variant="secondary" className="gap-1 text-[10px]">
              <Sparkles className="h-2.5 w-2.5" /> Applied Lab
            </Badge>
          )}
          {isDone && (
            <Badge variant="secondary" className="gap-1 text-[10px] text-primary">
              <CheckCircle2 className="h-2.5 w-2.5" /> Completed
            </Badge>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{module.code} · {module.title} · {cls.duration}</p>
      </div>

      {/* Syllabus intro — shown before the live lesson starts */}
      {!started && messages.length === 0 && !loading && (
        <div className="scroll-area-custom flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          <div className="mx-auto max-w-3xl space-y-5">
            <div>
              <Badge variant="outline" className="gap-1 text-[10px]">
                <Sparkles className="h-2.5 w-2.5 text-primary" /> Class overview
              </Badge>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">{cls.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {module.code} · {module.title} — {cls.duration}
                {cls.isAppliedLab && " · Applied Lab"}
              </p>
            </div>

            {/* What you'll learn */}
            <div className="rounded-xl border border-border/60 bg-card p-5">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                What you&apos;ll be able to do after this module
              </p>
              <ul className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
                {module.objectives.map((o, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">{i + 1}</span>
                    {o}
                  </li>
                ))}
              </ul>
            </div>

            {/* The 5-part flow explainer */}
            <div className="rounded-xl border border-border/60 bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                How this class works — the 5-part flow
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                LeashGuide teaches this class live, one stage at a time. You won&apos;t read a wall of text —
                you&apos;ll have a conversation. Here&apos;s the structure:
              </p>
              <div className="mt-3 space-y-2">
                {[
                  { n: 1, name: "Connect", desc: "LeashGuide hooks you with a real situation and asks about your experience." },
                  { n: 2, name: "Learn", desc: "LeashGuide teaches the core model — one transferable idea, in plain language." },
                  { n: 3, name: "See It", desc: "LeashGuide walks through a worked example so you see the model in action." },
                  { n: 4, name: "Do It", desc: "You do a short exercise — answer a question, decide a scenario, draft a quick artifact." },
                  { n: 5, name: "Check", desc: "LeashGuide confirms you got it, then closes the class." },
                ].map((s) => (
                  <div key={s.n} className="flex items-start gap-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{s.n}</span>
                    <div>
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Capstone */}
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
                <Award className="h-3.5 w-3.5" /> Capstone artifact for this module
              </p>
              <p className="mt-1.5 text-sm font-medium">{module.capstoneEvidence}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Pass the module quiz at {module.quiz.passThreshold}% and complete the artifact to earn this module&apos;s credit.
              </p>
            </div>

            <div className="flex justify-center pb-4">
              <Button size="lg" onClick={beginLesson} className="gap-2">
                <Sparkles className="h-4 w-4" /> Start class with LeashGuide
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* The classroom conversation — shown after the intro */}
      {started && (
        <>
        <div ref={scrollRef} className="scroll-area-custom flex-1 overflow-y-auto px-4 py-6 sm:px-8">
        <div className="mx-auto max-w-3xl space-y-4">
          {messages.length === 0 && !loading && (
            <div className="py-12 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10">
                <Sparkles className="h-7 w-7 text-primary" />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                LeashGuide is preparing to teach this class…
              </p>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={cn("flex gap-3", m.role === "user" && "flex-row-reverse")}>
              <span
                className={cn(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-full",
                  m.role === "assistant" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
                )}
              >
                {m.role === "assistant" ? <Sparkles className="h-4 w-4" /> : <span className="text-xs font-bold">{(learnerName || "Y")[0]}</span>}
              </span>
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  m.role === "assistant"
                    ? "bg-card border border-border/60"
                    : "bg-primary text-primary-foreground",
                )}
              >
                <Markdown>{m.content}</Markdown>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                <Sparkles className="h-4 w-4" />
              </span>
              <div className="flex items-center gap-2 rounded-2xl bg-card border border-border/60 px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">LeashGuide is teaching…</span>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        </div>

      {/* Bottom bar: response input OR complete actions */}
      <div className="border-t border-border/60 bg-background px-4 py-3 sm:px-8">
        {classComplete ? (
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2">
            <Badge className="gap-1.5 bg-primary/10 text-primary">
              <CheckCircle2 className="h-3.5 w-3.5" /> Class complete
            </Badge>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={onOpenQuiz}>
                <ListChecks className="h-4 w-4" /> Module quiz
              </Button>
              <Button size="sm" className="gap-1.5" onClick={onComplete}>
                <CheckCircle2 className="h-4 w-4" /> {nextClass ? "Complete & continue" : "Complete"}
              </Button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="mx-auto flex max-w-3xl items-end gap-2"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Respond to LeashGuide…"
              rows={1}
              className="flex-1 resize-none rounded-xl border border-border/60 bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              disabled={loading}
            />
            <Button type="submit" size="icon" disabled={loading || !input.trim()} className="h-11 w-11 shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        )}

        {/* Prev/next nav */}
        <div className="mx-auto mt-3 flex max-w-3xl items-center justify-between border-t border-border/40 pt-3">
          {prevClass ? (
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => onNavigate(prevClass.module.code, prevClass.cls.id)}>
              <ChevronLeft className="h-4 w-4" />
              <span className="flex flex-col items-start leading-tight">
                <span className="text-[10px] text-muted-foreground">Previous</span>
                <span className="max-w-[160px] truncate text-xs font-medium">{prevClass.cls.title}</span>
              </span>
            </Button>
          ) : <span />}
          {nextClass ? (
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => onNavigate(nextClass.module.code, nextClass.cls.id)}>
              <span className="flex flex-col items-end leading-tight">
                <span className="text-[10px] text-muted-foreground">Next</span>
                <span className="max-w-[160px] truncate text-xs font-medium">{nextClass.cls.title}</span>
              </span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : <span />}
        </div>
      </div>
      </>
      )}
    </div>
  );
}
