'use client';

import { useMemo, useState } from 'react';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Library, Search, PlayCircle, Clock } from 'lucide-react';

// ============================================================================
// Learning Center — Course Catalog. The full library of courses available to
// the signed-in account. Courses are organized by track (grooming, safety,
// salon ops, pet-parent education) and tagged by audience.
// ============================================================================

interface Course {
  id: string;
  title: string;
  track: string;
  audience: 'Staff' | 'Clients' | 'Everyone';
  lessons: number;
  minutes: number;
}

const CATALOG: Course[] = [
  { id: 'c1', title: 'Bathing & Drying Fundamentals', track: 'Grooming', audience: 'Staff', lessons: 6, minutes: 45 },
  { id: 'c2', title: 'Poodle Trim Patterns 101', track: 'Grooming', audience: 'Staff', lessons: 8, minutes: 70 },
  { id: 'c3', title: 'Safe Handling & Bite Prevention', track: 'Safety', audience: 'Staff', lessons: 5, minutes: 35 },
  { id: 'c4', title: 'Sanitation & Tool Care', track: 'Safety', audience: 'Staff', lessons: 4, minutes: 25 },
  { id: 'c5', title: 'Front Desk Hospitality', track: 'Salon Ops', audience: 'Staff', lessons: 5, minutes: 30 },
  { id: 'c6', title: 'Booking & Deposits Walkthrough', track: 'Salon Ops', audience: 'Everyone', lessons: 3, minutes: 15 },
  { id: 'c7', title: 'Preparing Your Dog for a Groom', track: 'Pet Parent', audience: 'Clients', lessons: 4, minutes: 20 },
  { id: 'c8', title: 'Brushing at Home Between Visits', track: 'Pet Parent', audience: 'Clients', lessons: 4, minutes: 18 },
];

export default function CourseCatalogPage() {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CATALOG;
    return CATALOG.filter(
      (c) => c.title.toLowerCase().includes(q) || c.track.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Course Catalog</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {CATALOG.length} courses across grooming, safety, salon ops &amp; pet-parent education.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search courses…"
            className="pl-8"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {filtered.map((c) => (
          <Card key={c.id} className="border-border/60 flex flex-col">
            <CardContent className="p-4 flex flex-col gap-2 flex-1">
              <div className="flex items-start justify-between gap-2">
                <Badge variant="secondary" className="text-[10px]">
                  {c.track}
                </Badge>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{c.audience}</span>
              </div>
              <p className="text-[13px] font-semibold leading-snug">{c.title}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-3 mt-auto">
                <span className="inline-flex items-center gap-1">
                  <Library className="size-3" /> {c.lessons} lessons
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3" /> {c.minutes} min
                </span>
              </p>
              <Button variant="outline" size="sm" className="w-full mt-1">
                <PlayCircle className="size-4 mr-1.5" /> Open course
              </Button>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-full py-8 text-center">
            No courses match &ldquo;{query}&rdquo;.
          </p>
        )}
      </div>
    </div>
  );
}
