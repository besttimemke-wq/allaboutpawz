"use client";
import { useEffect, useState } from "react";
import { api, type CourseRow } from "@/lib/api-client";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  ArrowLeft,
  Clock,
  Award,
  Layers,
  BookOpen,
  Play,
  CheckCircle2,
  FileDown,
  Sparkles,
} from "lucide-react";
import { LEVEL_NAMES } from "@/lib/framework/types";

export function CourseView() {
  const code = useAppStore((s) => s.selectedCourseCode);
  const setView = useAppStore((s) => s.setView);
  const startLearning = useAppStore((s) => s.startLearning);
  const learnerName = useAppStore((s) => s.learnerName);
  const setLearnerName = useAppStore((s) => s.setLearnerName);

  const [course, setCourse] = useState<CourseRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState(learnerName);
  const [enrolling, setEnrolling] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      setView("catalog");
      return;
    }
    setLoading(true);
    api.getCourse(code).then(setCourse).finally(() => setLoading(false));
  }, [code, setView]);

  async function enroll() {
    if (!course) return;
    const finalName = name.trim();
    if (!finalName) {
      setErr("Enter your name to enroll.");
      return;
    }
    setErr(null);
    setEnrolling(true);
    try {
      setLearnerName(finalName);
      await api.enroll(course.id, finalName);
      startLearning({ courseCode: course.code });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Enrollment failed");
    } finally {
      setEnrolling(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-4 h-64 rounded-xl" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-20 text-center">
        <p className="text-slate-500">Pathway not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => setView("catalog")}>
          Back to pathways
        </Button>
      </div>
    );
  }

  const e = course.pathway.enrollmentCopy;

  return (
    <div className="mx-auto max-w-5xl p-8">
      <Button variant="ghost" size="sm" className="mb-4 gap-1.5 text-slate-500" onClick={() => setView("catalog")}>
        <ArrowLeft className="h-4 w-4" /> Pathways
      </Button>

      {/* Pathway header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="gap-1 bg-[#0284c7] text-white">
            <Sparkles className="h-3 w-3" /> {course.code}
          </Badge>
          {course.aiGenerated && (
            <Badge variant="secondary" className="text-[11px]">AI-built</Badge>
          )}
        </div>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">{course.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{course.subtitle}</p>

        <div className="mt-4 flex flex-wrap gap-3 text-xs">
          <span className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-slate-600">
            <Clock className="h-3.5 w-3.5 text-[#0284c7]" /> {course.totalHours} hours
          </span>
          <span className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-slate-600">
            <Award className="h-3.5 w-3.5 text-[#0284c7]" /> {course.ceus} CEU
          </span>
          <span className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-slate-600">
            <Layers className="h-3.5 w-3.5 text-[#0284c7]" /> {course.pathway.levels.length} levels · {course.pathway.levels.reduce((n, l) => n + l.modules.length, 0)} modules
          </span>
          <Button asChild size="sm" variant="outline" className="h-7 gap-1 text-xs">
            <a href={`/api/syllabus?courseCode=${encodeURIComponent(course.code)}`} download={`syllabus-${course.code}.md`}>
              <FileDown className="h-3.5 w-3.5" /> Syllabus
            </a>
          </Button>
        </div>
      </div>

      {/* Overview */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm leading-relaxed text-slate-600">{course.description}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold text-slate-500">Who this is for</p>
              <p className="mt-1 text-sm text-slate-700">{e.whoIsThisFor}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Time commitment</p>
              <p className="mt-1 text-sm text-slate-700">{e.timeCommitment}</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">What you&apos;ll earn</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {course.pathway.levels.map((l) => (
                <Badge key={l.level} variant="outline" className="gap-1 text-xs">
                  <Award className="h-3 w-3 text-[#0284c7]" /> {l.credential.name} ({l.credential.ceus} CEU)
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Curriculum / Syllabus */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Curriculum — {course.pathway.levels.length} levels</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            {course.pathway.levels.map((lvl) => (
              <AccordionItem key={lvl.level} value={`lvl-${lvl.level}`}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 pr-2 text-left">
                    <Badge variant="secondary" className="text-[11px]">Level {lvl.level}</Badge>
                    <span className="font-medium text-slate-900">{lvl.name}</span>
                    <span className="text-xs text-slate-400">· {lvl.modules.length} modules · {lvl.credential.ceus} CEU</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-2">
                  {lvl.modules.map((m) => (
                    <div key={m.code} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-slate-900">
                          <span className="text-[#0284c7]">{m.code}</span> · {m.title}
                        </p>
                        <Badge variant="outline" className="text-[10px]">{m.hours}h</Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{m.description}</p>
                      <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {m.subModules.reduce((n, s) => n + s.classes.length, 0)} classes</span>
                        <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Quiz: {m.quiz.passThreshold}%</span>
                        <span>Artifact: {m.capstoneEvidence}</span>
                      </div>
                    </div>
                  ))}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Enroll */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Enroll in {course.code}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-500">{e.headline}</p>
          <div>
            <label className="text-xs font-medium text-slate-500">Your name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Marcus, Aisha, James"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0284c7] focus:outline-none focus:ring-1 focus:ring-[#0284c7]"
            />
          </div>
          {err && <p className="text-xs text-red-500">{err}</p>}
          <Button onClick={() => enroll()} disabled={enrolling} className="gap-2 bg-[#0284c7] hover:bg-[#0274c7]">
            <Play className="h-4 w-4" /> {enrolling ? "Enrolling…" : "Enroll & start learning"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
