"use client";
import { useEffect, useState } from "react";
import { api, type CourseRow } from "@/lib/api-client";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRight,
  Clock,
  Award,
  Layers,
  BookOpen,
  Play,
  TrendingUp,
  Target,
  Flame,
} from "lucide-react";

export function HomeView() {
  const setView = useAppStore((s) => s.setView);
  const openCourse = useAppStore((s) => s.openCourse);
  const learnerName = useAppStore((s) => s.learnerName);
  const [courses, setCourses] = useState<CourseRow[]>([]);

  useEffect(() => {
    api.listCourses().then(setCourses).catch(() => setCourses([]));
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-8">
      {/* Welcome */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {learnerName ? `Welcome back, ${learnerName}!` : "Welcome to Leashed.io"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {learnerName
                ? "You're making great progress. Keep going!"
                : "Pick a pathway and start learning with LeashGuide AI."}
            </p>
          </div>
          {!learnerName && (
            <Button onClick={() => setView("catalog")} className="gap-2">
              Browse pathways <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={TrendingUp} label="Pathways" value={courses.length} sub="available" />
        <MetricCard icon={Layers} label="Modules" value={courses.reduce((n, c) => n + c.pathway.levels.reduce((m, l) => m + l.modules.length, 0), 0)} sub="total" />
        <MetricCard icon={Clock} label="Hours" value={courses.reduce((n, c) => n + c.totalHours, 0)} sub="of content" />
        <MetricCard icon={Award} label="Certificates" value={courses.length * 4} sub="earnable" />
      </div>

      {/* Continue Learning / Start Learning */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            {learnerName ? "Continue Learning" : "Start Learning"}
          </h2>
          <button onClick={() => setView("catalog")} className="text-xs font-medium text-[#0284c7] hover:underline">
            View all pathways →
          </button>
        </div>
        <p className="mb-4 text-sm text-slate-500">
          {learnerName ? "Pick up where you left off." : "Pick a pathway to begin. Every course is taught live by LeashGuide AI."}
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {courses.slice(0, 3).map((c) => (
            <button
              key={c.code}
              onClick={() => openCourse(c.code)}
              className="group rounded-lg border border-slate-200 p-4 text-left transition hover:border-[#0284c7] hover:shadow-sm"
            >
              <div className="mb-2 flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">{c.code}</Badge>
                {c.aiGenerated && <Badge variant="outline" className="text-[9px]">AI</Badge>}
              </div>
              <p className="text-sm font-semibold text-slate-900 group-hover:text-[#0284c7]">{c.title}</p>
              <p className="mt-1 line-clamp-1 text-xs text-slate-500">{c.subtitle}</p>
              <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-400">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {c.totalHours}h</span>
                <span className="flex items-center gap-1"><Layers className="h-3 w-3" /> {c.pathway.levels.length} levels</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, sub }: { icon: typeof Home; label: string; value: number; sub: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <Icon className="h-5 w-5 text-[#0284c7]" />
        <span className="text-xs text-slate-400">{sub}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
