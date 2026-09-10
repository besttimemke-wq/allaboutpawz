"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api, type CourseRow } from "@/lib/api-client";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Sparkles,
  ArrowRight,
  Clock,
  Award,
  Layers,
  BookOpen,
  GraduationCap,
  CheckCircle2,
} from "lucide-react";
import { LEVEL_NAMES } from "@/lib/framework/types";

const STATS = [
  { icon: Layers, label: "Levels", value: 4, suffix: "" },
  { icon: BookOpen, label: "Modules", value: 20, suffix: "" },
  { icon: Clock, label: "Hours", value: 120, suffix: "" },
  { icon: Award, label: "CEUs", value: 12, suffix: ".0" },
];

const LEVEL_BLURBS: Record<string, string> = {
  Foundation: "Know yourself — awareness, values, time, habits, and emotional regulation.",
  Core: "Run the daily engine — finance, health, communication, digital literacy, problem-solving.",
  Advanced: "Navigate the world — conflict, career, housing, community, and resilience.",
  Capstone: "Contribute beyond yourself — leadership, mentorship, entrepreneurship, advocacy.",
};

function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const dur = 900;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <span>{n}{suffix}</span>;
}

export function HomeView() {
  const setView = useAppStore((s) => s.setView);
  const openCourse = useAppStore((s) => s.openCourse);
  const [courses, setCourses] = useState<CourseRow[] | null>(null);

  useEffect(() => {
    api.listCourses().then(setCourses).catch(() => setCourses([]));
  }, []);

  return (
    <div className="space-y-16 pb-4">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="hero-grid absolute inset-0 opacity-60" aria-hidden />
        <div className="pointer-events-none absolute -right-32 -top-24 h-96 w-96 rounded-full bg-primary/20 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -left-24 top-40 h-80 w-80 rounded-full bg-amber-400/20 blur-3xl" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <Badge variant="secondary" className="mb-5 gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              The AI-Autonomous School · Leashed Learning Framework v1.0
            </Badge>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-5xl md:text-6xl"
          >
            The world&apos;s first{" "}
            <span className="bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-transparent">AI-autonomous school</span>.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12 }}
            className="mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg"
          >
            Every course is taught live by LeashGuide AI — not recorded lectures, not static text.
            Pick a pathway, learn through the 5-part flow (Connect → Learn → See It → Do It → Check),
            and earn a free certificate that rivals Harvard&apos;s free classes. 4 levels, 20 modules,
            120 hours, one uniform framework.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18 }}
            className="mt-7 flex flex-wrap items-center gap-3"
          >
            <Button size="lg" onClick={() => setView("catalog")} className="gap-2 shadow-sm">
              Browse the catalog <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>

          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {STATS.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 + i * 0.06 }}
                className="group rounded-xl border border-border/70 bg-card/80 p-4 backdrop-blur transition hover:border-primary/40 hover:shadow-md"
              >
                <s.icon className="h-5 w-5 text-primary transition group-hover:scale-110" />
                <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
                  <CountUp to={s.value} suffix={s.suffix} />
                </p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 6-month pathway overview */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">The 6-month pathway</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              One credential per level. Each level is 5 modules × 6 hours = 30 hours.
            </p>
          </div>
          <Badge variant="outline" className="hidden sm:inline-flex gap-1">
            <GraduationCap className="h-3.5 w-3.5 text-primary" /> Credential ladder
          </Badge>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {LEVEL_NAMES.map((name, i) => (
            <Card key={name} className="relative h-full overflow-hidden transition hover:shadow-md hover:-translate-y-0.5">
              <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-primary to-amber-400" />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-[11px]">Level {(i + 1) * 100}</Badge>
                  <span className="text-xs text-muted-foreground">3.0 CEU</span>
                </div>
                <CardTitle className="mt-1 text-lg">{name}</CardTitle>
                <CardDescription className="text-xs leading-relaxed">{LEVEL_BLURBS[name]}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 text-xs text-muted-foreground">
                5 modules · 30 hours
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Catalog preview — show all pathways */}
      {courses && courses.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl font-semibold tracking-tight">Pathways</h2>
            <Button variant="outline" size="sm" onClick={() => setView("catalog")} className="gap-1.5">
              View all {courses.length} <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.slice(0, 6).map((c) => (
              <Card
                key={c.code}
                className="group flex cursor-pointer flex-col overflow-hidden transition hover:shadow-md hover:-translate-y-0.5"
                onClick={() => openCourse(c.code)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Badge className="gap-1 text-[10px]">
                      <Sparkles className="h-2.5 w-2.5" /> {c.code}
                    </Badge>
                    {c.aiGenerated && <Badge variant="secondary" className="text-[9px]">AI</Badge>}
                  </div>
                  <CardTitle className="mt-1.5 text-sm leading-tight">{c.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-2">
                  <p className="line-clamp-2 text-xs text-muted-foreground">{c.subtitle}</p>
                  <div className="flex flex-wrap gap-1 text-[10px]">
                    <span className="inline-flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5">
                      <Clock className="h-2.5 w-2.5 text-primary" /> {c.totalHours}h
                    </span>
                    <span className="inline-flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5">
                      <Award className="h-2.5 w-2.5 text-primary" /> {c.ceus} CEU
                    </span>
                    <span className="inline-flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5">
                      <Layers className="h-2.5 w-2.5 text-primary" /> {c.pathway.levels.length}L
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
