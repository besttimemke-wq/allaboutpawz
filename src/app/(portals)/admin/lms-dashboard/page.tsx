'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, Users, BookOpen, Award, TrendingUp, ClipboardCheck, Sparkles, ShieldCheck, Bell } from 'lucide-react';
import type { DawgNavSection } from '@/lib/types';

export default function LMSDashboardPage() {
  const router = useRouter();
  const navigate = (s: DawgNavSection) => router.push(`/admin/${s}`);
  const [stats, setStats] = useState({ enrollments: 0, pathways: 6, courses: 24, credentials: 0, activeSessions: 0, pendingReviews: 0 });

  useEffect(() => {
    // Fetch real data from the courses API
    fetch('/api/courses').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.courses) setStats(prev => ({ ...prev, courses: d.courses.length }));
    }).catch(() => {});
  }, []);

  const cards = [
    { label: 'Active Enrollments', value: stats.enrollments, icon: Users, color: 'text-primary', section: 'lms-enrollment' },
    { label: 'Pathways', value: stats.pathways, icon: GraduationCap, color: 'text-success', section: 'lms-curriculum' },
    { label: 'Courses', value: stats.courses, icon: BookOpen, color: 'text-warning', section: 'lms-curriculum' },
    { label: 'Credentials Issued', value: stats.credentials, icon: Award, color: 'text-primary', section: 'lms-skills' },
    { label: 'AI Sessions', value: stats.activeSessions, icon: Sparkles, color: 'text-success', section: 'lms-ai-teaching' },
    { label: 'Pending Reviews', value: stats.pendingReviews, icon: ClipboardCheck, color: 'text-warning', section: 'lms-assessment' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
          <GraduationCap className="size-6" /> Leashed Academy
        </h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          Manage curriculum, enrollment, progress, assessments, credentials, and compliance.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map(card => {
          const Icon = card.icon;
          return (
            <button key={card.label} onClick={() => navigate(card.section as DawgNavSection)}
              className="border border-border bg-card rounded-xl p-4 text-left hover:shadow-sm transition-shadow cursor-pointer">
              <Icon className={`size-5 ${card.color}`} />
              <p className="text-2xl font-bold mt-2 text-foreground">{card.value}</p>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider mt-0.5">{card.label}</p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border border-border rounded-xl p-5">
          <h2 className="text-[14px] font-semibold mb-3 flex items-center gap-2"><BookOpen className="size-4" /> Curriculum</h2>
          <p className="text-[13px] text-muted-foreground">6 Leashed pathways with 24 courses. Author new content, manage versions, publish updates.</p>
          <button onClick={() => navigate('lms-curriculum')} className="mt-3 text-[12px] font-semibold text-primary hover:underline cursor-pointer">Manage Curriculum →</button>
        </div>
        <div className="border border-border rounded-xl p-5">
          <h2 className="text-[14px] font-semibold mb-3 flex items-center gap-2"><ShieldCheck className="size-4" /> Compliance</h2>
          <p className="text-[13px] text-muted-foreground">Clock-hour audit ledger, funder reports, state board compliance. Audit-grade records.</p>
          <button onClick={() => navigate('lms-compliance')} className="mt-3 text-[12px] font-semibold text-primary hover:underline cursor-pointer">View Compliance →</button>
        </div>
      </div>
    </div>
  );
}
