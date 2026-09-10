"use client";
import { useEffect, useState } from "react";
import { api, type CourseRow } from "@/lib/api-client";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Clock, Award, Layers, Search, Sparkles, GitBranch, Target } from "lucide-react";

export function CatalogView() {
  const openCourse = useAppStore((s) => s.openCourse);
  const [courses, setCourses] = useState<CourseRow[] | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    api.listCourses().then(setCourses);
  }, []);

  const filtered = (courses ?? []).filter((c) => {
    if (!q.trim()) return true;
    const hay = `${c.code} ${c.title} ${c.subtitle} ${c.description}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Course catalog</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Every pathway runs on the same uniform framework — pick one and you get the full credential ladder, live AI
            tutoring, and a SCORM-packaged syllabus.
          </p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search courses…" className="pl-9" />
        </div>
      </div>

      {!filtered.length && courses ? (
        <Card className="mt-10 p-10 text-center">
          <p className="text-sm text-muted-foreground">No courses match &ldquo;{q}&rdquo;.</p>
        </Card>
      ) : !courses ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <Card key={c.code} className="group flex flex-col overflow-hidden transition hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge className="gap-1">
                    <Sparkles className="h-3 w-3" /> {c.code}
                  </Badge>
                  {c.aiGenerated && (
                    <Badge variant="secondary" className="text-[11px] gap-1">
                      <Sparkles className="h-3 w-3" /> AI-built
                    </Badge>
                  )}
                </div>
                <CardTitle className="mt-2 text-lg leading-tight">{c.title}</CardTitle>
                <CardDescription className="line-clamp-2">{c.subtitle}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-3">
                <p className="line-clamp-3 text-sm text-muted-foreground">{c.description}</p>

                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1">
                    <Clock className="h-3 w-3 text-primary" /> {c.totalHours}h
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1">
                    <Award className="h-3 w-3 text-primary" /> {c.ceus} CEU
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1">
                    <Layers className="h-3 w-3 text-primary" /> {c.pathway.levels.length} levels
                  </span>
                </div>

                <div className="mt-1 space-y-1.5 border-t border-border/60 pt-3 text-xs">
                  <p className="flex items-center gap-1.5 text-muted-foreground">
                    <GitBranch className="h-3.5 w-3.5 text-primary" />
                    <span className="font-medium text-foreground">Connects to:</span>{" "}
                    {c.pathway.levels[0]?.credential.name ?? "Credential ladder"}
                  </p>
                  <p className="flex items-center gap-1.5 text-muted-foreground">
                    <Target className="h-3.5 w-3.5 text-primary" />
                    <span className="font-medium text-foreground">Outcome:</span>{" "}
                    {c.pathway.enrollmentCopy.whatYouWillAchieve[0] ?? "Applied mastery"}
                  </p>
                </div>

                <Button
                  onClick={() => openCourse(c.code)}
                  className="mt-auto gap-2"
                  variant="secondary"
                >
                  View & enroll <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
