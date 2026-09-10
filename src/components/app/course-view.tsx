"use client";
import { useEffect, useState } from "react";
import { api, type CourseRow } from "@/lib/api-client";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowLeft, Clock, Award, Layers, Target, Users, CalendarDays, CheckCircle2, Sparkles, Play, BookOpen, FileDown } from "lucide-react";

export function CourseView() {
  const code = useAppStore((s) => s.selectedCourseCode);
  const setView = useAppStore((s) => s.setView);
  const learnerName = useAppStore((s) => s.learnerName);
  const setLearnerName = useAppStore((s) => s.setLearnerName);
  const startLearning = useAppStore((s) => s.startLearning);

  const [course, setCourse] = useState<CourseRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState(learnerName);
  const [enrolling, setEnrolling] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<string>("overview");

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
      // No name yet — jump to the Enroll tab so the learner sees the name field + error.
      setTab("enroll");
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
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-4 h-48 rounded-2xl" />
        <Skeleton className="mt-4 h-64 rounded-2xl" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <p className="text-muted-foreground">Course not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => setView("catalog")}>
          Back to catalog
        </Button>
      </div>
    );
  }

  const e = course.pathway.enrollmentCopy;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Button variant="ghost" size="sm" className="mb-4 gap-1.5 text-muted-foreground" onClick={() => setView("catalog")}>
        <ArrowLeft className="h-4 w-4" /> Catalog
      </Button>

      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="gap-1">
          <Sparkles className="h-3 w-3" /> {course.code}
        </Badge>
        {course.accreditation.map((a) => (
          <Badge key={a} variant="outline" className="text-[11px]">{a}</Badge>
        ))}
      </div>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{course.title}</h1>
      <p className="mt-2 text-base text-muted-foreground">{course.subtitle}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1">
          <Clock className="h-3.5 w-3.5 text-primary" /> {course.totalHours} hours
        </span>
        <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1">
          <Award className="h-3.5 w-3.5 text-primary" /> {course.ceus} IACET CEU
        </span>
        <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1">
          <Layers className="h-3.5 w-3.5 text-primary" /> {course.pathway.levels.length} levels · {course.pathway.levels.reduce((n, l) => n + l.modules.length, 0)} modules
        </span>
        <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1">
          <BookOpen className="h-3.5 w-3.5 text-primary" /> SCORM-packaged
        </span>
        <Button asChild size="sm" variant="outline" className="ml-auto h-7 gap-1.5 text-xs">
          <a href={`/api/syllabus?courseCode=${encodeURIComponent(course.code)}`} download={`syllabus-${course.code}.md`}>
            <FileDown className="h-3.5 w-3.5" /> Download syllabus
          </a>
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mt-8">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="syllabus">Syllabus</TabsTrigger>
          <TabsTrigger value="enroll">Enroll</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-6 pt-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="h-4 w-4 text-primary" /> What this course does
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">{course.description}</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{course.missionAlignment}</p>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4 text-primary" /> Who this is for
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{e.whoIsThisFor}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarDays className="h-4 w-4 text-primary" /> Time commitment
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{e.timeCommitment}</CardContent>
            </Card>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">What you&apos;ll achieve</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {e.whatYouWillAchieve.map((a, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="text-muted-foreground">{a}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">What you&apos;ll earn</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {course.pathway.levels.map((l) => (
                    <li key={l.level} className="flex items-start gap-2">
                      <Award className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>
                        <span className="font-medium">{l.credential.name}</span>
                        <span className="block text-xs text-muted-foreground">{l.credential.ceus} CEU</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-muted/30">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <p className="text-sm font-medium">Prerequisites</p>
                <p className="text-xs text-muted-foreground">{e.prerequisites}</p>
              </div>
              <Button onClick={() => enroll()} disabled={enrolling} className="gap-2">
                <Play className="h-4 w-4" /> Enroll & start learning
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Syllabus */}
        <TabsContent value="syllabus" className="pt-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Full syllabus · {course.pathway.levels.length} levels</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full">
                {course.pathway.levels.map((lvl) => (
                  <AccordionItem key={lvl.level} value={`lvl-${lvl.level}`}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3 pr-2 text-left">
                        <Badge variant="secondary" className="text-[11px]">Level {lvl.level}</Badge>
                        <span className="font-medium">{lvl.name}</span>
                        <span className="text-xs text-muted-foreground">· {lvl.tagline}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-2">
                      {lvl.modules.map((m) => (
                        <div key={m.code} className="rounded-lg border border-border/60 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium">
                              <span className="text-primary">{m.code}</span> · {m.title}
                            </p>
                            <Badge variant="outline" className="text-[10px]">{m.hours}h</Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{m.description}</p>
                          <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                            {m.objectives.slice(0, 4).map((o, i) => (
                              <li key={i} className="text-[11px] text-muted-foreground">• {o}</li>
                            ))}
                          </ul>
                          <p className="mt-2 text-[11px] text-muted-foreground">
                            <span className="font-medium text-foreground">Artifact:</span> {m.capstoneEvidence} ·{" "}
                            <span className="font-medium text-foreground">Quiz:</span> {m.quiz.questionCount}Q @ {m.quiz.passThreshold}%
                          </p>
                        </div>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Enroll */}
        <TabsContent value="enroll" className="pt-5">
          <Card className="max-w-xl">
            <CardHeader>
              <CardTitle className="text-lg">Enroll in {course.code}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {e.headline} Enter your name to create your enrollment and jump into the learner experience with live
                LeashGuide tutoring.
              </p>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Your name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jordan Avery"
                  className="mt-1"
                />
              </div>
              {err && <p className="text-xs text-destructive">{err}</p>}
              <Button onClick={() => enroll()} disabled={enrolling} className="w-full gap-2">
                <Play className="h-4 w-4" /> {enrolling ? "Enrolling…" : "Enroll & start learning"}
              </Button>
              <p className="text-[11px] text-muted-foreground">
                MVP: identity is by name only (no password). Progress is saved per enrollment.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reviews */}
        <TabsContent value="reviews" className="pt-5">
          <ReviewsSection courseId={course.id} courseCode={course.code} />
        </TabsContent>
      </Tabs>

      {/* Related courses */}
      <RelatedCourses currentCode={course.code} />
    </div>
  );
}
