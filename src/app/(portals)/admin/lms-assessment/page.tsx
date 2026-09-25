'use client';

import React, { useState } from 'react';
import {
  useAssessments,
  type ArtifactSubmissionRow,
  type GradeBookRow,
  type QuizAttemptRow,
} from '@/hooks/useAssessments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ClipboardCheck, Search, Loader2, AlertCircle } from 'lucide-react';

export default function LmsAssessmentPage() {
  const { submissions, gradeBook, quizAttempts, isLoading, error } = useAssessments();
  const [subSearch, setSubSearch] = useState('');
  const [gradeSearch, setGradeSearch] = useState('');
  const [quizSearch, setQuizSearch] = useState('');

  const filteredSubs = submissions.filter((r: ArtifactSubmissionRow) => {
    if (!subSearch.trim()) return true;
    const q = subSearch.toLowerCase();
    return (
      (r.learner_name?.toLowerCase().includes(q)) ||
      (r.course_title?.toLowerCase().includes(q)) ||
      (r.assignment_title?.toLowerCase().includes(q)) ||
      (r.status?.toLowerCase().includes(q))
    );
  });

  const filteredGrades = gradeBook.filter((r: GradeBookRow) => {
    if (!gradeSearch.trim()) return true;
    const q = gradeSearch.toLowerCase();
    return (
      (r.course_title?.toLowerCase().includes(q)) ||
      (r.category?.toLowerCase().includes(q)) ||
      (r.item_name?.toLowerCase().includes(q))
    );
  });

  const filteredQuizzes = quizAttempts.filter((r: QuizAttemptRow) => {
    if (!quizSearch.trim()) return true;
    const q = quizSearch.toLowerCase();
    return (
      (r.learner_user_id?.toLowerCase().includes(q)) ||
      (r.status?.toLowerCase().includes(q)) ||
      (r.quiz_id?.toLowerCase().includes(q))
    );
  });

  const pendingSubs = submissions.filter(r => r.status === 'pending' || r.status === 'submitted').length;
  const lateSubs = submissions.filter(r => r.is_late).length;
  const passedQuizzes = quizAttempts.filter(r => r.is_passed).length;

  return (
    <div className="flex flex-col w-full h-full p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Assessments</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Artifact submissions, grade book, and quiz attempts.</p>
        </div>
        <Badge variant="secondary" className="gap-1.5">
          <ClipboardCheck className="size-3" />
          {submissions.length + gradeBook.length + quizAttempts.length} records
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Submissions', value: submissions.length, sub: `${pendingSubs} pending · ${lateSubs} late` },
          { label: 'Grade Book Entries', value: gradeBook.length, sub: `${gradeBook.filter(g => g.is_released).length} released` },
          { label: 'Quiz Attempts', value: quizAttempts.length, sub: `${passedQuizzes} passed` },
        ].map(card => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{card.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground tabular-nums">{card.value}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{card.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Error banner */}
      {error && !isLoading && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-2 text-destructive">
            <AlertCircle className="size-4" />
            <span className="text-sm">System Error: {error}</span>
          </CardContent>
        </Card>
      )}

      {/* Tabs for the three tables */}
      <Tabs defaultValue="submissions">
        <TabsList>
          <TabsTrigger value="submissions">Submissions ({submissions.length})</TabsTrigger>
          <TabsTrigger value="gradeBook">Grade Book ({gradeBook.length})</TabsTrigger>
          <TabsTrigger value="quizzes">Quiz Attempts ({quizAttempts.length})</TabsTrigger>
        </TabsList>

        {/* Submissions tab */}
        <TabsContent value="submissions">
          <div className="space-y-3">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search submissions…"
                value={subSearch}
                onChange={(e) => setSubSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <LoadingBlock label="Loading submissions…" />
                ) : filteredSubs.length === 0 ? (
                  <EmptyBlock label="No artifact submissions yet." />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Learner</TableHead>
                        <TableHead>Assignment</TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Late</TableHead>
                        <TableHead>Submitted</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubs.map((r: ArtifactSubmissionRow) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">
                            {r.learner_name || <span className="text-muted-foreground">{r.learner_user_id.slice(0, 8)}…</span>}
                          </TableCell>
                          <TableCell>{r.assignment_title || '—'}</TableCell>
                          <TableCell className="text-muted-foreground text-[13px]">{r.course_title || '—'}</TableCell>
                          <TableCell>
                            <Badge variant={
                              r.status === 'graded' ? 'secondary' :
                              r.status === 'pending' || r.status === 'submitted' ? 'default' :
                              r.status === 'late' ? 'destructive' :
                              'outline'
                            }>
                              {r.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {r.is_late ? (
                              <Badge variant="destructive" className="text-[10px]">Late</Badge>
                            ) : (
                              <span className="text-muted-foreground text-[11px]">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-[13px]">
                            {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Grade Book tab */}
        <TabsContent value="gradeBook">
          <div className="space-y-3">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search grade book…"
                value={gradeSearch}
                onChange={(e) => setGradeSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <LoadingBlock label="Loading grade book…" />
                ) : filteredGrades.length === 0 ? (
                  <EmptyBlock label="No grade book entries yet." />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Course</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Score</TableHead>
                        <TableHead className="text-right">Weight</TableHead>
                        <TableHead>Graded</TableHead>
                        <TableHead>Released</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredGrades.map((r: GradeBookRow) => (
                        <TableRow key={r.id}>
                          <TableCell className="text-[13px]">{r.course_title || '—'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">{r.category || '—'}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{r.item_name}</TableCell>
                          <TableCell className="text-right tabular-nums text-[13px]">
                            {r.score ?? '—'} / {r.max_score ?? '—'}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-[13px] text-muted-foreground">{r.weight ?? '—'}</TableCell>
                          <TableCell>
                            <Badge variant={r.is_ai_graded ? 'default' : 'outline'} className="text-[10px]">
                              {r.is_ai_graded ? 'AI' : 'Human'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {r.is_released ? (
                              <Badge variant="secondary" className="text-[10px]">Released</Badge>
                            ) : (
                              <span className="text-muted-foreground text-[11px]">Draft</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Quiz Attempts tab */}
        <TabsContent value="quizzes">
          <div className="space-y-3">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search quiz attempts…"
                value={quizSearch}
                onChange={(e) => setQuizSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <LoadingBlock label="Loading quiz attempts…" />
                ) : filteredQuizzes.length === 0 ? (
                  <EmptyBlock label="No quiz attempts yet." />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Quiz</TableHead>
                        <TableHead>Learner</TableHead>
                        <TableHead className="text-right">Attempt</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Score</TableHead>
                        <TableHead className="text-right">Pct</TableHead>
                        <TableHead>Passed</TableHead>
                        <TableHead>Submitted</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredQuizzes.map((r: QuizAttemptRow) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-mono text-[12px]">{r.quiz_id?.slice(0, 12)}…</TableCell>
                          <TableCell className="font-mono text-[12px] text-muted-foreground">{r.learner_user_id?.slice(0, 8)}…</TableCell>
                          <TableCell className="text-right tabular-nums text-[13px]">#{r.attempt_number ?? '—'}</TableCell>
                          <TableCell>
                            <Badge variant={r.status === 'submitted' ? 'secondary' : r.status === 'in_progress' ? 'default' : 'outline'}>
                              {r.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-[13px]">
                            {r.score ?? '—'} / {r.max_score ?? '—'}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-[13px]">{r.percentage ? `${Math.round(Number(r.percentage))}%` : '—'}</TableCell>
                          <TableCell>
                            {r.is_passed ? (
                              <Badge variant="secondary" className="text-[10px]">Passed</Badge>
                            ) : (
                              <span className="text-muted-foreground text-[11px]">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-[13px]">
                            {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

function EmptyBlock({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-16 text-muted-foreground">
      <span className="text-sm">{label}</span>
    </div>
  );
}
