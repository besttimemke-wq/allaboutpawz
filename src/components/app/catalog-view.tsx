"use client";
import { useEffect, useMemo, useState } from "react";
import { api, type CourseRow } from "@/lib/api-client";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  ArrowRight,
  Clock,
  Award,
  Layers,
  Search,
  Sparkles,
  GitBranch,
  Target,
  Bookmark,
  BookmarkCheck,
  GitCompare,
  X,
  Check,
  BookOpen,
} from "lucide-react";
import type { AccreditationBody } from "@/lib/framework/types";
import { cn } from "@/lib/utils";

const ACCREDITATION_BODIES: AccreditationBody[] = ["COE", "ACCSC", "IACET", "ICG", "SCORM"];

export function CatalogView() {
  const openCourse = useAppStore((s) => s.openCourse);
  const [courses, setCourses] = useState<CourseRow[] | null>(null);
  const [q, setQ] = useState("");
  const [accFilters, setAccFilters] = useState<Set<AccreditationBody>>(new Set());
  const [bookmarks, setBookmarks] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const saved = localStorage.getItem("leashed-bookmarks");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [compareSet, setCompareSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.listCourses().then(setCourses);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("leashed-bookmarks", JSON.stringify([...bookmarks]));
    } catch {
      /* ignore */
    }
  }, [bookmarks]);

  const filtered = useMemo(() => {
    return (courses ?? []).filter((c) => {
      if (q.trim()) {
        const hay = `${c.code} ${c.title} ${c.subtitle} ${c.description}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      if (accFilters.size > 0) {
        const hasAll = [...accFilters].every((a) => c.accreditation.includes(a));
        if (!hasAll) return false;
      }
      return true;
    });
  }, [courses, q, accFilters]);

  function toggleAcc(a: AccreditationBody) {
    setAccFilters((prev) => {
      const next = new Set(prev);
      if (next.has(a)) next.delete(a);
      else next.add(a);
      return next;
    });
  }

  function toggleBookmark(code: string) {
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function toggleCompare(code: string) {
    setCompareSet((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        if (next.size >= 3) return prev; // max 3
        next.add(code);
      }
      return next;
    });
  }

  function clearFilters() {
    setQ("");
    setAccFilters(new Set());
  }

  const compareCourses = courses ? courses.filter((c) => compareSet.has(c.code)) : [];
  const bookmarkedCourses = courses ? courses.filter((c) => bookmarks.has(c.code)) : [];

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

      {/* Filter chips + bookmarked toggle */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Accreditation:</span>
        {ACCREDITATION_BODIES.map((a) => {
          const active = accFilters.has(a);
          return (
            <button
              key={a}
              onClick={() => toggleAcc(a)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {active && <Check className="mr-1 inline h-3 w-3" />}
              {a}
            </button>
          );
        })}
        {(accFilters.size > 0 || q.trim()) && (
          <button onClick={clearFilters} className="ml-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <X className="h-3 w-3" /> Clear
          </button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} course{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Bookmarked section */}
      {bookmarkedCourses.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <BookmarkCheck className="h-4 w-4 text-primary" /> Bookmarked ({bookmarkedCourses.length})
          </div>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {bookmarkedCourses.map((c) => (
              <BookmarkChip key={c.code} course={c} onOpen={() => openCourse(c.code)} onRemove={() => toggleBookmark(c.code)} />
            ))}
          </div>
        </div>
      )}

      {!filtered.length && courses ? (
        <Card className="mt-10 p-10 text-center">
          <p className="text-sm text-muted-foreground">No courses match your filters.</p>
          <Button variant="outline" className="mt-3" onClick={clearFilters}>Clear filters</Button>
        </Card>
      ) : !courses ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => {
            const isBookmarked = bookmarks.has(c.code);
            const isComparing = compareSet.has(c.code);
            return (
              <Card key={c.code} className="group relative flex flex-col overflow-hidden transition hover:shadow-md">
                {/* Action buttons overlay */}
                <div className="absolute right-3 top-3 z-10 flex gap-1">
                  <button
                    onClick={() => toggleBookmark(c.code)}
                    className={cn(
                      "grid h-7 w-7 place-items-center rounded-full bg-background/80 backdrop-blur transition hover:bg-background",
                      isBookmarked ? "text-primary" : "text-muted-foreground hover:text-foreground",
                    )}
                    title={isBookmarked ? "Remove bookmark" : "Bookmark"}
                  >
                    {isBookmarked ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => toggleCompare(c.code)}
                    className={cn(
                      "grid h-7 w-7 place-items-center rounded-full bg-background/80 backdrop-blur transition hover:bg-background",
                      isComparing ? "text-primary" : "text-muted-foreground hover:text-foreground",
                    )}
                    title={isComparing ? "Remove from comparison" : "Add to comparison"}
                    disabled={!isComparing && compareSet.size >= 3}
                  >
                    <GitCompare className="h-3.5 w-3.5" />
                  </button>
                </div>

                <CardHeader className="pb-3 pr-16">
                  <div className="flex items-center gap-2">
                    <Badge className="gap-1">
                      <Sparkles className="h-3 w-3" /> {c.code}
                    </Badge>
                    {c.aiGenerated && (
                      <Badge variant="secondary" className="text-[11px] gap-1">
                        <Sparkles className="h-3 w-3" /> AI
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

                  <div className="flex flex-wrap gap-1">
                    {c.accreditation.slice(0, 5).map((a) => (
                      <span key={a} className="rounded border border-border/60 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">{a}</span>
                    ))}
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
            );
          })}
        </div>
      )}

      {/* Comparison bar (sticky bottom) */}
      {compareSet.size > 0 && (
        <div className="fixed bottom-4 left-1/2 z-40 w-[min(96vw,640px)] -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-2xl border border-border/80 bg-card/95 p-3 shadow-lg backdrop-blur">
            <div className="flex flex-1 items-center gap-1.5 overflow-x-auto scroll-area-custom">
              <GitCompare className="h-4 w-4 shrink-0 text-primary" />
              {compareCourses.map((c) => (
                <Badge key={c.code} variant="secondary" className="shrink-0 gap-1 text-[11px]">
                  {c.code}
                  <button onClick={() => toggleCompare(c.code)} className="ml-0.5 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <Sheet>
              <SheetTrigger asChild>
                <Button size="sm" className="shrink-0 gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" /> Compare ({compareSet.size})
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[min(96vw,900px)] sm:max-w-[900px] overflow-y-auto scroll-area-custom">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <GitCompare className="h-5 w-5 text-primary" /> Course comparison
                  </SheetTitle>
                </SheetHeader>
                <ComparisonTable courses={compareCourses} onOpen={openCourse} />
              </SheetContent>
            </Sheet>
            <Button size="sm" variant="ghost" className="shrink-0" onClick={() => setCompareSet(new Set())}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function BookmarkChip({ course, onOpen, onRemove }: { course: CourseRow; onOpen: () => void; onRemove: () => void }) {
  return (
    <div className="group flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-2.5">
      <Badge className="shrink-0 gap-1 text-[10px]">
        <Sparkles className="h-2.5 w-2.5" /> {course.code}
      </Badge>
      <button onClick={onOpen} className="min-w-0 flex-1 text-left">
        <p className="truncate text-xs font-medium group-hover:text-primary">{course.title}</p>
        <p className="text-[10px] text-muted-foreground">{course.totalHours}h · {course.ceus} CEU</p>
      </button>
      <button onClick={onRemove} className="text-muted-foreground hover:text-destructive">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function ComparisonTable({ courses, onOpen }: { courses: CourseRow[]; onOpen: (code: string) => void }) {
  const rows: { label: string; get: (c: CourseRow) => React.ReactNode }[] = [
    { label: "Code", get: (c) => <Badge className="gap-1 text-[10px]"><Sparkles className="h-2.5 w-2.5" />{c.code}</Badge> },
    { label: "Title", get: (c) => c.title },
    { label: "Hours", get: (c) => `${c.totalHours}h` },
    { label: "CEUs", get: (c) => `${c.ceus}` },
    { label: "Levels", get: (c) => c.pathway.levels.length },
    { label: "Modules", get: (c) => c.pathway.levels.reduce((n, l) => n + l.modules.length, 0) },
    { label: "Accreditation", get: (c) => <div className="flex flex-wrap gap-1">{c.accreditation.map((a) => <span key={a} className="rounded border border-border/60 px-1 py-0.5 text-[9px]">{a}</span>)}</div> },
    { label: "Who it's for", get: (c) => <span className="text-xs">{c.pathway.enrollmentCopy.whoIsThisFor}</span> },
    { label: "First credential", get: (c) => <span className="text-xs">{c.pathway.levels[0]?.credential.name}</span> },
    { label: "Time commitment", get: (c) => <span className="text-xs">{c.pathway.enrollmentCopy.timeCommitment}</span> },
    { label: "Prerequisites", get: (c) => <span className="text-xs">{c.pathway.enrollmentCopy.prerequisites}</span> },
    { label: "AI-built", get: (c) => c.aiGenerated ? <Badge variant="secondary" className="text-[9px]">Yes</Badge> : <span className="text-xs text-muted-foreground">No</span> },
  ];

  if (!courses.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Add courses to compare (max 3).</p>;
  }

  return (
    <div className="mt-4 overflow-x-auto scroll-area-custom">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="w-32 border-b border-border/60 p-2 text-left text-xs font-medium text-muted-foreground">Attribute</th>
            {courses.map((c) => (
              <th key={c.code} className="border-b border-border/60 p-2 text-left align-top">
                <button onClick={() => onOpen(c.code)} className="text-left hover:text-primary">
                  <p className="text-sm font-semibold">{c.title}</p>
                  <p className="text-[10px] text-muted-foreground">{c.code}</p>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.label} className={i % 2 === 0 ? "bg-muted/20" : ""}>
              <td className="p-2 text-xs font-medium text-muted-foreground">{row.label}</td>
              {courses.map((c) => (
                <td key={c.code} className="p-2 text-xs align-top">{row.get(c)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
