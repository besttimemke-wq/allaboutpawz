'use client';

import React from 'react';
import Link from 'next/link';
import { useLmsDashboard } from '@/hooks/useLmsDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import {
  BookOpen, Users, Sparkles, GraduationCap, MessageSquare, Database,
  ClipboardCheck, Award, HeartHandshake, Bell, ShieldCheck,
  FolderOpen, ArrowRightLeft, Bot,
} from 'lucide-react';

interface QuickLink {
  href: string;
  label: string;
  description: string;
  icon: React.ElementType;
}

const QUICK_LINKS: QuickLink[] = [
  { href: '/admin/lms-enrollment', label: 'Enrollments', description: 'Learner enrollments & statuses', icon: Users },
  { href: '/admin/lms-curriculum', label: 'Curriculum', description: 'Courses, pathways & lessons', icon: BookOpen },
  { href: '/admin/lms-ai-teaching', label: 'AI Teaching Sessions', description: 'Live AI instructor sessions', icon: Sparkles },
  { href: '/admin/lms-progress', label: 'Learner Progress', description: 'Lesson & module completion', icon: ClipboardCheck },
  { href: '/admin/lms-assessment', label: 'Assessments', description: 'Submissions, grades & quizzes', icon: ClipboardCheck },
  { href: '/admin/lms-skills', label: 'Skills & Credentials', description: 'Skills, signoffs, credentials, badges', icon: Award },
  { href: '/admin/lms-support', label: 'Support Queue', description: 'Escalations & navigator caseloads', icon: HeartHandshake },
  { href: '/admin/lms-communication', label: 'Communications', description: 'Announcements & notifications', icon: Bell },
  { href: '/admin/lms-compliance', label: 'Compliance', description: 'Documents & audit log', icon: ShieldCheck },
  { href: '/admin/lms-media', label: 'Media Library', description: 'Video, audio & document assets', icon: FolderOpen },
  { href: '/admin/lms-bridge', label: 'Platform Bridge', description: 'Sync log & commerce queue', icon: ArrowRightLeft },
  { href: '/admin/lms-ai-instructor', label: 'AI Instructor Config', description: 'Personas & prompt templates', icon: Bot },
];

export default function LmsDashboardPage() {
  const { stats, isLoading, error } = useLmsDashboard();

  const cards = [
    { label: 'Courses', value: stats.courses, icon: BookOpen },
    { label: 'Enrollments', value: stats.enrollments, icon: Users },
    { label: 'AI Sessions', value: stats.sessions, icon: Sparkles },
    { label: 'Pathways', value: stats.pathways, icon: GraduationCap },
    { label: 'AI Messages', value: stats.messages, icon: MessageSquare },
    { label: 'RAG Chunks', value: stats.ragChunks, icon: Database },
  ];

  return (
    <div className="flex flex-col w-full h-full p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">LMS Dashboard</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Academy overview — courses, learners, AI activity & RAG knowledge.</p>
        </div>
        <Badge variant="secondary" className="gap-1.5">
          <GraduationCap className="size-3" />
          {stats.pathways} pathways
        </Badge>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map(card => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{card.label}</CardTitle>
                  <Icon className="size-3.5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                ) : error ? (
                  <div className="flex items-center gap-1.5 text-destructive">
                    <AlertCircle className="size-4" />
                    <span className="text-[11px]">Err</span>
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-foreground tabular-nums">{card.value}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Error banner (only if the dashboard endpoint failed) */}
      {error && !isLoading && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-2 text-destructive">
            <AlertCircle className="size-4" />
            <span className="text-sm">System Error: {error}</span>
          </CardContent>
        </Card>
      )}

      {/* Quick Links */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-semibold tracking-tight text-foreground">Quick Links</h2>
          <span className="text-[11px] text-muted-foreground">{QUICK_LINKS.length} LMS modules</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {QUICK_LINKS.map(link => {
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href} className="block group">
                <Card className="hover:border-foreground/30 hover:shadow-sm transition-all">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center size-7 rounded-md bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                          <Icon className="size-3.5" />
                        </div>
                        <CardTitle className="text-[13px] font-semibold tracking-tight text-foreground">{link.label}</CardTitle>
                      </div>
                      <ArrowRight className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-[12px] text-muted-foreground leading-snug">{link.description}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
