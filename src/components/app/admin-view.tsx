"use client";
import { useCallback, useEffect, useState } from "react";
import { api, type CourseRow } from "@/lib/api-client";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { validatePathwayShape } from "@/lib/framework/types";
import type { AccreditationBody, Pathway } from "@/lib/framework/types";
import {
  Plus,
  Copy,
  Sparkles,
  Trash2,
  Pencil,
  CheckCircle2,
  Save,
  ShieldCheck,
  AlertTriangle,
  ListChecks,
  Eye,
  EyeOff,
  Layers,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ACCREDITATION: AccreditationBody[] = ["COE", "ACCSC", "IACET", "ICG", "SCORM"];

export function AdminView() {
  const [courses, setCourses] = useState<CourseRow[] | null>(null);
  const [tab, setTab] = useState("courses");
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const { toast } = useToast();

  const refresh = useCallback(async () => {
    const cs = await api.listCourses(true);
    setCourses(cs);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cs = await api.listCourses(true);
      if (!cancelled) setCourses(cs);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreate(input: { code: string; title: string; subtitle?: string; description?: string }) {
    const c = await api.createCourse({ ...input, status: "draft", accreditation: ACCREDITATION });
    toast({ title: "Course created", description: `${c.code} · ${c.title} (draft)` });
    await refresh();
    setEditingCode(c.code);
    setTab("editor");
  }

  async function handleDuplicate(code: string, newCode: string, newTitle?: string) {
    const c = await api.duplicateCourse(code, newCode, newTitle);
    toast({ title: "Course duplicated", description: `${c.code} created from ${code}` });
    await refresh();
    setEditingCode(c.code);
    setTab("editor");
  }

  async function handleAIBuild(input: { code: string; title: string; domain: string; audience?: string }) {
    toast({ title: "AI building…", description: `${input.code} · generating 20 modules` });
    const res = await api.buildCourse(input);
    toast({ title: "AI course built", description: `${res.code} · ${res.modules} modules generated` });
    await refresh();
    setEditingCode(res.code);
    setTab("editor");
  }

  async function toggleStatus(c: CourseRow) {
    const next = c.status === "published" ? "draft" : "published";
    await api.updateCourseStatus(c.code, next);
    toast({ title: next === "published" ? "Published" : "Unpublished", description: `${c.code} is now ${next}` });
    await refresh();
  }

  async function handleDelete(code: string) {
    await api.deleteCourse(code);
    toast({ title: "Course deleted", description: code });
    if (editingCode === code) setEditingCode(null);
    await refresh();
  }

  const editing = courses?.find((c) => c.code === editingCode) ?? null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Course Builder</h1>
          <p className="text-sm text-muted-foreground">
            Create, duplicate, AI-generate, and edit courses — all uniform to the Leashed Learning Framework.
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mt-6">
        <TabsList>
          <TabsTrigger value="courses" className="gap-1.5">
            <Layers className="h-4 w-4" /> Courses
          </TabsTrigger>
          <TabsTrigger value="new" className="gap-1.5">
            <Plus className="h-4 w-4" /> New
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-1.5">
            <Sparkles className="h-4 w-4" /> AI Builder
          </TabsTrigger>
          {editing && (
            <TabsTrigger value="editor" className="gap-1.5">
              <Pencil className="h-4 w-4" /> Editor · {editing.code}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="courses" className="pt-5">
          {!courses ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border/60">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Course</th>
                    <th className="hidden px-4 py-3 font-medium sm:table-cell">Hours / CEU</th>
                    <th className="hidden px-4 py-3 font-medium md:table-cell">Modules</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {courses.map((c) => (
                    <tr key={c.code} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Badge className="gap-1 text-[11px]">
                            <Sparkles className="h-3 w-3" /> {c.code}
                          </Badge>
                          {c.aiGenerated && <Badge variant="secondary" className="text-[10px]">AI</Badge>}
                        </div>
                        <p className="mt-1 font-medium">{c.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{c.subtitle}</p>
                      </td>
                      <td className="hidden px-4 py-3 sm:table-cell">
                        <p className="text-xs">{c.totalHours}h</p>
                        <p className="text-xs text-muted-foreground">{c.ceus} CEU</p>
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell text-xs">
                        {c.pathway.levels.reduce((n, l) => n + l.modules.length, 0)} modules · {c.pathway.levels.length} levels
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={c.status === "published" ? "default" : "outline"} className="text-[11px]">
                          {c.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingCode(c.code);
                              setTab("editor");
                            }}
                            className="gap-1.5"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => toggleStatus(c)} title={c.status === "published" ? "Unpublish" : "Publish"}>
                            {c.status === "published" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDuplicate(c.code, `${c.code}2`)}
                            title="Duplicate"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" title="Delete" className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete {c.code}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This permanently removes {c.title} and all its enrollments, chat sessions, and quiz attempts.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(c.code)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="new" className="pt-5">
          <CreateCourseForm onCreate={handleCreate} />
        </TabsContent>

        <TabsContent value="ai" className="pt-5">
          <AIBuildForm onBuild={handleAIBuild} />
        </TabsContent>

        {editing && (
          <TabsContent value="editor" className="pt-5">
            <CourseEditor key={editing.code} course={editing} onSaved={refresh} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function CreateCourseForm({ onCreate }: { onCreate: (i: { code: string; title: string; subtitle?: string; description?: string }) => void }) {
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [err, setErr] = useState<string | null>(null);

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Plus className="h-4 w-4 text-primary" /> New blank course
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Creates a framework-valid blank pathway (4 levels × 5 modules × 9 classes) you can edit. Saved as a draft.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Course code *</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. WDY" className="mt-1 uppercase" />
          </div>
          <div>
            <Label className="text-xs">Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Workplace Dynamics" className="mt-1" />
          </div>
        </div>
        <div>
          <Label className="text-xs">Subtitle</Label>
          <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Short tagline" className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Description</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this pathway covers" className="mt-1" rows={3} />
        </div>
        {err && <p className="text-xs text-destructive">{err}</p>}
        <Button
          onClick={() => {
            if (!code.trim() || !title.trim()) {
              setErr("Code and title are required.");
              return;
            }
            setErr(null);
            onCreate({ code, title, subtitle, description });
            setCode(""); setTitle(""); setSubtitle(""); setDescription("");
          }}
          className="gap-2"
        >
          <Save className="h-4 w-4" /> Create draft
        </Button>
      </CardContent>
    </Card>
  );
}

function AIBuildForm({ onBuild }: { onBuild: (i: { code: string; title: string; domain: string; audience?: string }) => void }) {
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [domain, setDomain] = useState("");
  const [audience, setAudience] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-4 w-4 text-primary" /> AI Course Builder
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Z.ai generates a full 4-level × 5-module catalog for your domain, then expands it through the same uniform
          generator as LSH — so structure is byte-identical. Only themed content varies.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Course code *</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. WSC" className="mt-1 uppercase" />
          </div>
          <div>
            <Label className="text-xs">Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Workplace Safety & Compliance" className="mt-1" />
          </div>
        </div>
        <div>
          <Label className="text-xs">Domain / theme *</Label>
          <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="e.g. occupational safety, OSHA-aligned practices" className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Target audience</Label>
          <Input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="e.g. frontline supervisors in manufacturing" className="mt-1" />
        </div>
        {err && <p className="text-xs text-destructive">{err}</p>}
        <Button
          disabled={loading}
          onClick={async () => {
            if (!code.trim() || !title.trim() || !domain.trim()) {
              setErr("Code, title, and domain are required.");
              return;
            }
            setErr(null);
            setLoading(true);
            try {
              await onBuild({ code, title, domain, audience: audience || undefined });
              setCode(""); setTitle(""); setDomain(""); setAudience("");
            } catch (e) {
              setErr(e instanceof Error ? e.message : "AI build failed");
            } finally {
              setLoading(false);
            }
          }}
          className="gap-2"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? "Generating…" : "Generate course"}
        </Button>
      </CardContent>
    </Card>
  );
}

function CourseEditor({ course, onSaved }: { course: CourseRow; onSaved: () => void }) {
  const { toast } = useToast();
  const [p, setP] = useState<Pathway>(() => JSON.parse(JSON.stringify(course.pathway)) as Pathway);
  const [saving, setSaving] = useState(false);
  const [expandedLevel, setExpandedLevel] = useState<string>(course.pathway.levels[0]?.level.toString() ?? "100");

  const errs = validatePathwayShape(p);
  const compliant = errs.length === 0;

  function update(mut: (draft: Pathway) => void) {
    setP((prev) => {
      const draft = JSON.parse(JSON.stringify(prev)) as Pathway;
      mut(draft);
      return draft;
    });
  }

  async function save() {
    setSaving(true);
    try {
      await api.savePathway(course.code, p);
      toast({ title: "Saved", description: `${course.code} updated (framework ${compliant ? "valid" : "warnings"})` });
      await onSaved();
    } catch (e) {
      toast({ title: "Save failed", description: e instanceof Error ? e.message : "unknown error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Compliance banner */}
      <div className={cn("flex items-center gap-2 rounded-xl border p-3", compliant ? "border-primary/40 bg-primary/5" : "border-destructive/40 bg-destructive/5")}>
        {compliant ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <AlertTriangle className="h-5 w-5 text-destructive" />}
        <div className="flex-1">
          <p className="text-sm font-medium">
            {compliant ? "Framework-compliant" : "Framework validation issues"}
          </p>
          <p className="text-xs text-muted-foreground">
            {compliant
              ? "4 levels · 5 modules each · 6 objectives · 3 sub-modules · 9 classes · 8-question quiz · 8-criterion rubric."
              : errs.join(" · ")}
          </p>
        </div>
        <Button onClick={save} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </Button>
      </div>

      {/* Course overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Course overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Title</Label>
              <Input value={p.title} onChange={(e) => update((d) => { d.title = e.target.value; })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Subtitle</Label>
              <Input value={p.subtitle} onChange={(e) => update((d) => { d.subtitle = e.target.value; })} className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea value={p.description} onChange={(e) => update((d) => { d.description = e.target.value; })} rows={2} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Mission alignment</Label>
            <Textarea value={p.missionAlignment} onChange={(e) => update((d) => { d.missionAlignment = e.target.value; })} rows={2} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Accreditation</Label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {ACCREDITATION.map((a) => {
                const on = p.accreditation.includes(a);
                return (
                  <button
                    key={a}
                    onClick={() => update((d) => {
                      d.accreditation = on ? d.accreditation.filter((x) => x !== a) : [...d.accreditation, a];
                    })}
                    className={cn("rounded-md border px-2.5 py-1 text-xs transition", on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}
                  >
                    {a}
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enrollment copy */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Enrollment copy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs">Headline</Label>
            <Input value={p.enrollmentCopy.headline} onChange={(e) => update((d) => { d.enrollmentCopy.headline = e.target.value; })} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Who this is for</Label>
            <Textarea value={p.enrollmentCopy.whoIsThisFor} onChange={(e) => update((d) => { d.enrollmentCopy.whoIsThisFor = e.target.value; })} rows={2} className="mt-1" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Time commitment</Label>
              <Input value={p.enrollmentCopy.timeCommitment} onChange={(e) => update((d) => { d.enrollmentCopy.timeCommitment = e.target.value; })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Prerequisites</Label>
              <Input value={p.enrollmentCopy.prerequisites} onChange={(e) => update((d) => { d.enrollmentCopy.prerequisites = e.target.value; })} className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">What you&apos;ll achieve (one per line)</Label>
            <Textarea
              value={p.enrollmentCopy.whatYouWillAchieve.join("\n")}
              onChange={(e) => update((d) => { d.enrollmentCopy.whatYouWillAchieve = e.target.value.split("\n").filter(Boolean); })}
              rows={3}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">What you&apos;ll earn (one per line)</Label>
            <Textarea
              value={p.enrollmentCopy.whatYouWillEarn.join("\n")}
              onChange={(e) => update((d) => { d.enrollmentCopy.whatYouWillEarn = e.target.value.split("\n").filter(Boolean); })}
              rows={3}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Levels + modules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ListChecks className="h-4 w-4 text-primary" /> Levels & modules
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {p.levels.map((lvl, li) => {
            const open = expandedLevel === lvl.level.toString();
            return (
              <div key={lvl.level} className="rounded-xl border border-border/60">
                <button
                  onClick={() => setExpandedLevel(open ? "" : lvl.level.toString())}
                  className="flex w-full items-center gap-2 p-3 text-left"
                >
                  <Badge variant="secondary" className="text-[11px]">Level {lvl.level}</Badge>
                  <span className="font-medium">{lvl.name}</span>
                  <span className="text-xs text-muted-foreground">· {lvl.credential.name}</span>
                  <ChevronRotate open={open} />
                </button>
                {open && (
                  <div className="space-y-3 border-t border-border/60 p-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label className="text-xs">Level tagline</Label>
                        <Input value={lvl.tagline} onChange={(e) => update((d) => { d.levels[li].tagline = e.target.value; })} className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">Credential name</Label>
                        <Input value={lvl.credential.name} onChange={(e) => update((d) => { d.levels[li].credential.name = e.target.value; })} className="mt-1" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      {lvl.modules.map((m, mi) => (
                        <div key={m.code} className="rounded-lg border border-border/50 p-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">{m.code}</Badge>
                            <Input value={m.title} onChange={(e) => update((d) => { d.levels[li].modules[mi].title = e.target.value; })} className="h-8 text-sm" />
                          </div>
                          <Textarea
                            value={m.description}
                            onChange={(e) => update((d) => { d.levels[li].modules[mi].description = e.target.value; })}
                            rows={2}
                            className="mt-2 text-xs"
                          />
                          <Label className="mt-2 text-[11px] text-muted-foreground">Objectives (one per line)</Label>
                          <Textarea
                            value={m.objectives.join("\n")}
                            onChange={(e) => update((d) => { d.levels[li].modules[mi].objectives = e.target.value.split("\n").filter(Boolean); })}
                            rows={6}
                            className="mt-1 text-xs"
                          />
                          <p className="mt-2 text-[11px] text-muted-foreground">
                            Artifact: <span className="font-medium text-foreground">{m.capstoneEvidence}</span> · {m.subModules.reduce((n, s) => n + s.classes.length, 0)} classes · quiz {m.quiz.passThreshold}%
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} size="lg" className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save course
        </Button>
      </div>
    </div>
  );
}

function ChevronRotate({ open }: { open: boolean }) {
  return <ChevronRight className={cn("ml-auto h-4 w-4 text-muted-foreground transition", open && "rotate-90")} />;
}
