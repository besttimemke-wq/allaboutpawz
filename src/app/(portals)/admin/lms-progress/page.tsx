'use client';

import React, { useState } from 'react';
import {
  useLearnerProgress,
  type LessonProgressRow,
  type ModuleProgressRow,
} from '@/hooks/useLearnerProgress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { TrendingUp, Search, Loader2, AlertCircle } from 'lucide-react';

export default function LmsProgressPage() {
  const { lessonProgress, moduleProgress, isLoading, error } = useLearnerProgress();
  const [lessonSearch, setLessonSearch] = useState('');
  const [moduleSearch, setModuleSearch] = useState('');

  const filteredLessons = lessonProgress.filter((r: LessonProgressRow) => {
    if (!lessonSearch.trim()) return true;
    const q = lessonSearch.toLowerCase();
    return (
      (r.learner_name?.toLowerCase().includes(q)) ||
      (r.course_title?.toLowerCase().includes(q)) ||
      (r.status?.toLowerCase().includes(q))
    );
  });

  const filteredModules = moduleProgress.filter((r: ModuleProgressRow) => {
    if (!moduleSearch.trim()) return true;
    const q = moduleSearch.toLowerCase();
    return (
      (r.status?.toLowerCase().includes(q)) ||
      (r.module_id?.toLowerCase().includes(q))
    );
  });

  const lessonsCompleted = lessonProgress.filter(r => r.status === 'completed').length;
  const modulesCompleted = moduleProgress.filter(r => r.status === 'completed').length;

  return (
    <div className="flex flex-col w-full h-full p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Learner Progress</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Track lesson and module completion across all enrolled learners.</p>
        </div>
        <Badge variant="secondary" className="gap-1.5">
          <TrendingUp className="size-3" />
          {lessonProgress.length + moduleProgress.length} records
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Lesson Records', value: lessonProgress.length },
          { label: 'Lessons Completed', value: lessonsCompleted },
          { label: 'Module Records', value: moduleProgress.length },
          { label: 'Modules Completed', value: modulesCompleted },
        ].map(card => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{card.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground tabular-nums">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Error banner (only when the endpoint actually failed) */}
      {error && !isLoading && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-2 text-destructive">
            <AlertCircle className="size-4" />
            <span className="text-sm">System Error: {error}</span>
          </CardContent>
        </Card>
      )}

      {/* Lesson Progress Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold tracking-tight text-foreground">Lesson Progress</h2>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search lessons…"
              value={lessonSearch}
              onChange={(e) => setLessonSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                <span className="text-sm">Loading lesson progress…</span>
              </div>
            ) : filteredLessons.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <span className="text-sm">No lesson progress records yet.</span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Learner</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Lesson</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead className="text-right">Time (min)</TableHead>
                    <TableHead>Last Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLessons.map((r: LessonProgressRow) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        {r.learner_name || <span className="text-muted-foreground">{r.learner_user_id.slice(0, 8)}…</span>}
                      </TableCell>
                      <TableCell>{r.course_title || '—'}</TableCell>
                      <TableCell className="font-mono text-[12px] text-muted-foreground">{r.lesson_id?.slice(0, 12)}…</TableCell>
                      <TableCell>
                        <Badge variant={
                          r.status === 'completed' ? 'secondary' :
                          r.status === 'in_progress' ? 'default' :
                          r.status === 'not_started' ? 'outline' :
                          'outline'
                        }>
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-foreground rounded-full transition-all"
                              style={{ width: `${Math.min(100, Number(r.progress_percentage) || 0)}%` }}
                            />
                          </div>
                          <span className="text-[11px] text-muted-foreground tabular-nums">
                            {Math.round(Number(r.progress_percentage) || 0)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-[13px]">
                        {r.time_spent_seconds ? Math.round(Number(r.time_spent_seconds) / 60) : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-[13px]">
                        {r.last_accessed_at ? new Date(r.last_accessed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Module Progress Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold tracking-tight text-foreground">Module Progress</h2>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search modules…"
              value={moduleSearch}
              onChange={(e) => setModuleSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                <span className="text-sm">Loading module progress…</span>
              </div>
            ) : filteredModules.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <span className="text-sm">No module progress records yet.</span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Module</TableHead>
                    <TableHead>Enrollment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Completed</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Last Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredModules.map((r: ModuleProgressRow) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-[12px]">{r.module_id?.slice(0, 16)}</TableCell>
                      <TableCell className="font-mono text-[12px] text-muted-foreground">{r.enrollment_id?.slice(0, 12)}…</TableCell>
                      <TableCell>
                        <Badge variant={
                          r.status === 'completed' ? 'secondary' :
                          r.status === 'in_progress' ? 'default' :
                          'outline'
                        }>
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-[13px]">{r.lessons_completed ?? '—'}</TableCell>
                      <TableCell className="text-right tabular-nums text-[13px]">{r.lessons_total ?? '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-foreground rounded-full transition-all"
                              style={{ width: `${Math.min(100, Number(r.progress_percentage) || 0)}%` }}
                            />
                          </div>
                          <span className="text-[11px] text-muted-foreground tabular-nums">
                            {Math.round(Number(r.progress_percentage) || 0)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-[13px]">
                        {r.last_accessed_at ? new Date(r.last_accessed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
