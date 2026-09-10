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
  ShieldCheck,
  Brain,
  Workflow,
  Users,
} from "lucide-react";
import { LEVEL_NAMES } from "@/lib/framework/types";

const STATS = [
  { icon: Layers, label: "Levels", value: 4, suffix: "" },
  { icon: BookOpen, label: "Modules", value: 20, suffix: "" },
  { icon: Clock, label: "Hours", value: 120, suffix: "" },
  { icon: Award, label: "CEUs", value: 12, suffix: ".0" },
];

const HOW_IT_WORKS = [
  {
    icon: Workflow,
    title: "Uniform framework",
    desc: "Every pathway is built on the same 4×5×9 structure — 4 levels, 5 modules, 9 lesson blocks each, with a 5-part flow per class.",
  },
  {
    icon: Brain,
    title: "Live AI tutoring",
    desc: "LeashGuide is a Socratic coach on every lesson — calls Z.ai in real time, persists conversations, never hands you the artifact.",
  },
  {
    icon: Users,
    title: "Builder + learner",
    desc: "Admins create, duplicate, and AI-generate courses. Learners progress through lessons, quizzes, and a credential ladder.",
  },
  {
    icon: ShieldCheck,
    title: "Accreditation-ready",
    desc: "Building toward ANSI/IACET 1-2018, COE, ACCSC, and SCORM packaging — the accreditation readiness dashboard maps every requirement to real evidence.",
  },
];

const LEVEL_BLURBS: Record<string, string> = {
  Foundation: "Know yourself — awareness, values, time, habits, and emotional regulation.",
  Core: "Run the daily engine — finance, health, communication, digital literacy, problem-solving.",
  Advanced: "Navigate the world — conflict, career, housing, community, and resilience.",
  Capstone: "Contribute beyond yourself — leadership, mentorship, entrepreneurship, advocacy.",
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4, ease: "easeOut" as const } }),
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
  const [course, setCourse] = useState<CourseRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listCourses()
      .then((cs) => setCourse(cs[0] ?? null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-16 pb-4">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="hero-grid absolute inset-0 opacity-60" aria-hidden />
        <div
          className="pointer-events-none absolute -right-32 -top-24 h-96 w-96 rounded-full bg-primary/20 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-24 top-40 h-80 w-80 rounded-full bg-amber-400/20 blur-3xl"
          aria-hidden
        />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <Badge variant="secondary" className="mb-5 gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Leashed Learning Framework · v1.0
            </Badge>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-5xl md:text-6xl"
          >
            Turn life skills into a{" "}
            <span className="bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-transparent">practiced discipline</span>.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12 }}
            className="mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg"
          >
            Digital Learning University builds every course on one uniform framework — 4 levels, 20 modules, 180 lesson
            blocks, 120 hours, and a four-rung credential ladder. Live AI tutoring by LeashGuide on every lesson.
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
            <Button size="lg" variant="outline" onClick={() => setView("admin")} className="gap-2">
              <ShieldCheck className="h-4 w-4" /> Open the Builder
            </Button>
          </motion.div>

          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {STATS.map((s, i) => (
              <motion.div
                key={s.label}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                animate="show"
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

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              One framework, four guarantees — applied to every pathway, whether hand-authored or AI-generated.
            </p>
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.map((h, i) => (
            <motion.div
              key={h.title}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
            >
              <Card className="h-full transition hover:shadow-md hover:-translate-y-0.5">
                <CardHeader className="pb-3">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                    <h.icon className="h-5 w-5" />
                  </span>
                  <CardTitle className="mt-3 text-base">{h.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs leading-relaxed text-muted-foreground">{h.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 6-month pathway overview */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">The 6-month pathway</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              One credential per level. Each level is 5 modules × 6 hours = 30 hours (3.0 CEU, IACET authorization pending).
            </p>
          </div>
          <Badge variant="outline" className="hidden sm:inline-flex gap-1">
            <GraduationCap className="h-3.5 w-3.5 text-primary" /> Credential ladder
          </Badge>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {LEVEL_NAMES.map((name, i) => (
            <motion.div
              key={name}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
            >
              <Card className="relative h-full overflow-hidden transition hover:shadow-md hover:-translate-y-0.5">
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
            </motion.div>
          ))}
        </div>
      </section>

      {/* Featured course */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">Featured pathway</h2>
        <p className="mt-1 text-sm text-muted-foreground">The flagship, fully-seeded exemplar course.</p>

        {loading ? (
          <div className="mt-6 h-48 animate-pulse rounded-2xl bg-muted/60" />
        ) : course ? (
          <Card className="mt-6 overflow-hidden">
            <div className="grid gap-0 md:grid-cols-[1.4fr_1fr]">
              <div className="p-6 sm:p-8">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="gap-1">
                    <Sparkles className="h-3 w-3" /> {course.code}
                  </Badge>
                  {course.accreditation.map((a) => (
                    <Badge key={a} variant="outline" className="text-[11px]">{a}</Badge>
                  ))}
                </div>
                <h3 className="mt-3 text-2xl font-semibold tracking-tight">{course.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{course.subtitle}</p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{course.description}</p>

                <div className="mt-5 flex flex-wrap gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1">
                    <Clock className="h-3.5 w-3.5 text-primary" /> {course.totalHours} hours
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1">
                    <Award className="h-3.5 w-3.5 text-primary" /> {course.ceus} CEU
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1">
                    <Layers className="h-3.5 w-3.5 text-primary" /> {course.pathway.levels.length} levels
                  </span>
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  <Button onClick={() => openCourse(course.code)} className="gap-2">
                    Explore course <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="border-t border-border/60 bg-muted/30 p-6 sm:p-8 md:border-l md:border-t-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What you&apos;ll earn</p>
                <ul className="mt-3 space-y-2">
                  {course.pathway.levels.map((l) => (
                    <li key={l.level} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>
                        <span className="font-medium">{l.credential.name}</span>
                        <span className="block text-xs text-muted-foreground">{l.credential.ceus} CEU · {l.modules.length} modules</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="mt-6 p-8 text-center text-sm text-muted-foreground">No courses published yet.</Card>
        )}
      </section>
    </div>
  );
}
