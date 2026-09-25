'use client';

import React, { useState } from 'react';
import { useCourses, type Course } from '@/hooks/useCourses';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { BookOpen, Search, Loader2, AlertCircle, Plus, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function LmsCurriculumPage() {
  const { courses, isLoading, error } = useCourses();
  const [search, setSearch] = useState('');

  const filtered = courses.filter((c: Course) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (c.title?.toLowerCase().includes(q)) ||
      (c.code?.toLowerCase().includes(q)) ||
      (c.category?.toLowerCase().includes(q)) ||
      (c.pathway_name?.toLowerCase().includes(q))
    );
  });

  const published = courses.filter(c => c.is_published).length;
  const unpublished = courses.length - published;

  return (
    <div className="flex flex-col w-full h-full p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Curriculum Authoring</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Manage courses, pathways, lessons, and publishing.</p>
        </div>
        <Button className="gap-1.5">
          <Plus className="size-4" />
          New Course
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Courses', value: courses.length, icon: BookOpen },
          { label: 'Published', value: published, icon: CheckCircle2 },
          { label: 'Drafts', value: unpublished, icon: BookOpen },
          { label: 'Pathways', value: new Set(courses.map(c => c.pathway_name).filter(Boolean)).size, icon: BookOpen },
        ].map(card => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{card.label}</CardTitle>
                <card.icon className="size-3.5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search by title, code, or pathway…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              <span className="text-sm">Loading curriculum…</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-16 gap-2 text-destructive">
              <AlertCircle className="size-4" />
              <span className="text-sm">System Error: {error}</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <span className="text-sm">No courses found.</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Pathway</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Board</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c: Course) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-[10px]">{c.code || '—'}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{c.title}</TableCell>
                    <TableCell className="text-muted-foreground text-[13px]">{c.pathway_name || '—'}</TableCell>
                    <TableCell className="text-muted-foreground text-[13px]">{c.difficulty_level || '—'}</TableCell>
                    <TableCell className="text-muted-foreground text-[13px] tabular-nums">
                      {c.total_clock_hours ? `${Number(c.total_clock_hours).toFixed(0)}h` : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.is_published ? 'default' : 'outline'}>
                        {c.is_published ? 'Published' : 'Draft'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {c.state_board_approved ? (
                        <Badge variant="secondary" className="gap-1 text-[10px]">
                          <CheckCircle2 className="size-2.5" /> Approved
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="gap-1.5">
                        Edit <ArrowRight className="size-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
