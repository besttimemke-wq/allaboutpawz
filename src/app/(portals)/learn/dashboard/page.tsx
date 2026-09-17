'use client';

import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  GraduationCap,
  PlayCircle,
  Award,
  Library,
  Clock,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Video,
  FileText,
  Trophy,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Learning Center Dashboard — the LMS landing surface for every signed-in
// account (customers, groomers, front desk, admins).
//
// - "Continue where you left off" row (resume in-progress modules)
// - Catalog grid (browse all courses)
// - This week's goal + streak
// - Recently earned certificates
// ============================================================================

interface Course {
  id: string;
  title: string;
  category: 'Grooming' | 'Safety' | 'Customer Service' | 'Business' | 'Pet Care';
  duration: string;
  lessons: number;
  progress: number; // 0–100
  thumb: string; // gradient class
  audience: 'Staff' | 'Customers' | 'Everyone';
}

const IN_PROGRESS: Course[] = [
  {
    id: 'c1',
    title: 'Safe Restraint & Low-Stress Handling',
    category: 'Safety',
    duration: '45 min',
    lessons: 8,
    progress: 62,
    thumb: 'from-rose-400 to-orange-400',
    audience: 'Staff',
  },
  {
    id: 'c2',
    title: 'Breed-Specific Coat Prep — Poodles & Doodles',
    category: 'Grooming',
    duration: '38 min',
    lessons: 6,
    progress: 28,
    thumb: 'from-sky-400 to-indigo-400',
    audience: 'Staff',
  },
  {
    id: 'c3',
    title: 'Your First Groom: What to Expect',
    category: 'Pet Care',
    duration: '12 min',
    lessons: 4,
    progress: 75,
    thumb: 'from-emerald-400 to-teal-400',
    audience: 'Customers',
  },
];

const CATALOG: Course[] = [
  {
    id: 'c4',
    title: 'Senior Pet Comfort & Mobility',
    category: 'Pet Care',
    duration: '22 min',
    lessons: 5,
    progress: 0,
    thumb: 'from-amber-400 to-rose-400',
    audience: 'Everyone',
  },
  {
    id: 'c5',
    title: 'Front Desk — Phone Etiquette & Booking Flow',
    category: 'Customer Service',
    duration: '28 min',
    lessons: 6,
    progress: 0,
    thumb: 'from-violet-400 to-fuchsia-400',
    audience: 'Staff',
  },
  {
    id: 'c6',
    title: 'Scissor Work Fundamentals',
    category: 'Grooming',
    duration: '52 min',
    lessons: 9,
    progress: 0,
    thumb: 'from-sky-400 to-cyan-400',
    audience: 'Staff',
  },
  {
    id: 'c7',
    title: 'Shot Records & Vaccination Schedules 101',
    category: 'Safety',
    duration: '15 min',
    lessons: 3,
    progress: 0,
    thumb: 'from-emerald-400 to-lime-400',
    audience: 'Customers',
  },
  {
    id: 'c8',
    title: 'Reading Dog Body Language',
    category: 'Safety',
    duration: '34 min',
    lessons: 7,
    progress: 0,
    thumb: 'from-orange-400 to-amber-500',
    audience: 'Everyone',
  },
  {
    id: 'c9',
    title: 'Building a Loyal Clientele',
    category: 'Business',
    duration: '40 min',
    lessons: 8,
    progress: 0,
    thumb: 'from-indigo-400 to-purple-400',
    audience: 'Staff',
  },
];

const CERTS = [
  { id: 'x1', title: 'Low-Stress Handling — Level 1', issued: 'Apr 12, 2025' },
  { id: 'x2', title: 'Pet CPR & First Aid Basics', issued: 'Mar 03, 2025' },
];

const CATEGORY_TONE: Record<Course['category'], string> = {
  Grooming: 'bg-sky-100 text-sky-800',
  Safety: 'bg-rose-100 text-rose-800',
  'Customer Service': 'bg-violet-100 text-violet-800',
  Business: 'bg-indigo-100 text-indigo-800',
  'Pet Care': 'bg-emerald-100 text-emerald-800',
};

export default function LearnDashboardPage() {
  const router = useRouter();

  return (
    <div className="p-6 space-y-8 max-w-[1400px] mx-auto">
      {/* Hero */}
      <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-violet-50 via-sky-50 to-emerald-50 p-6 sm:p-8 overflow-hidden relative">
        <div className="absolute -right-8 -top-8 size-40 rounded-full bg-white/40 blur-2xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge variant="outline" className="mb-2 bg-white/70 border-violet-200 text-violet-800">
              <Sparkles className="size-3 mr-1" /> Learning Center
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Welcome back — pick up where you left off
            </h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-xl">
              Track your progress, earn certificates, and keep up with the latest in
              low-stress handling, breed-specific grooming, and client care.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="rounded-xl bg-white/70 border border-border/60 p-3 text-center min-w-20">
              <div className="flex items-center justify-center gap-1 text-amber-600">
                <Trophy className="size-4" />
              </div>
              <p className="text-xl font-semibold mt-1">3</p>
              <p className="text-[11px] text-muted-foreground">certificates</p>
            </div>
            <div className="rounded-xl bg-white/70 border border-border/60 p-3 text-center min-w-20">
              <div className="flex items-center justify-center gap-1 text-emerald-600">
                <CheckCircle2 className="size-4" />
              </div>
              <p className="text-xl font-semibold mt-1">17</p>
              <p className="text-[11px] text-muted-foreground">modules done</p>
            </div>
            <div className="rounded-xl bg-white/70 border border-border/60 p-3 text-center min-w-20">
              <div className="flex items-center justify-center gap-1 text-sky-600">
                <Clock className="size-4" />
              </div>
              <p className="text-xl font-semibold mt-1">4.5h</p>
              <p className="text-[11px] text-muted-foreground">this week</p>
            </div>
          </div>
        </div>
      </div>

      {/* Continue learning */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <PlayCircle className="size-5 text-sky-600" />
              Continue learning
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Jump back into modules you&rsquo;ve started.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.push('/learn/in-progress')}>
            View all <ArrowRight className="size-3.5 ml-1" />
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {IN_PROGRESS.map((c) => (
            <Card key={c.id} className="overflow-hidden border-border/60 hover:shadow-md transition-shadow">
              <div className={cn('h-28 bg-gradient-to-br relative', c.thumb)}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="size-12 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center">
                    <PlayCircle className="size-7 text-white" />
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn('absolute top-2 right-2 bg-white/80', CATEGORY_TONE[c.category])}
                >
                  {c.category}
                </Badge>
              </div>
              <CardContent className="p-4">
                <h3 className="font-medium text-sm line-clamp-2">{c.title}</h3>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-2">
                  <span className="flex items-center gap-1">
                    <Video className="size-3" /> {c.lessons} lessons
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" /> {c.duration}
                  </span>
                </div>
                <div className="mt-3 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{c.progress}%</span>
                  </div>
                  <Progress value={c.progress} className="h-1.5" />
                </div>
                <Button size="sm" className="w-full mt-3">
                  <PlayCircle className="size-4 mr-1" /> Resume
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Catalog */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Library className="size-5 text-violet-600" />
              Course catalog
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Browse every module — filter by category or audience.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.push('/learn/course-catalog')}>
            Browse all <ArrowRight className="size-3.5 ml-1" />
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {CATALOG.map((c) => (
            <button
              key={c.id}
              onClick={() => router.push('/learn/course-catalog')}
              className="group text-left rounded-xl border border-border/60 bg-card overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="flex">
                <div className={cn('w-20 shrink-0 bg-gradient-to-br', c.thumb)} />
                <div className="p-3 min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className={cn('text-[10px]', CATEGORY_TONE[c.category])}>
                      {c.category}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">{c.audience}</span>
                  </div>
                  <h3 className="font-medium text-sm line-clamp-2 group-hover:text-foreground">
                    {c.title}
                  </h3>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1.5">
                    <span className="flex items-center gap-1">
                      <Video className="size-3" /> {c.lessons}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" /> {c.duration}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Certificates + this week */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="size-4 text-amber-600" />
              Recent certificates
            </CardTitle>
            <CardDescription className="text-xs">
              Earn a certificate by completing every lesson in a track.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 space-y-2.5">
            {CERTS.map((cert) => (
              <div
                key={cert.id}
                className="flex items-center gap-3 rounded-lg border border-amber-200/60 bg-amber-50/50 p-3"
              >
                <div className="flex items-center justify-center size-10 rounded-full bg-amber-100">
                  <Award className="size-5 text-amber-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{cert.title}</p>
                  <p className="text-[11px] text-muted-foreground">Issued {cert.issued}</p>
                </div>
                <Button variant="outline" size="sm">
                  <FileText className="size-3.5 mr-1" /> View
                </Button>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="w-full" onClick={() => router.push('/learn/certificates')}>
              See all certificates
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <GraduationCap className="size-4 text-indigo-600" />
              This week&rsquo;s goal
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">2 of 3 modules</span>
                <span className="font-medium">67%</span>
              </div>
              <Progress value={67} className="h-2" />
            </div>
            <p className="text-xs text-muted-foreground">
              Complete one more module by Sunday to keep your 4-week streak alive.
            </p>
            <div className="flex items-center gap-1.5 pt-1">
              {[1, 2, 3, 4].map((w) => (
                <div
                  key={w}
                  className={cn(
                    'flex-1 h-8 rounded-md flex items-center justify-center text-[10px] font-medium',
                    w < 4 ? 'bg-emerald-100 text-emerald-800' : 'bg-muted text-muted-foreground'
                  )}
                >
                  Wk {w}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
