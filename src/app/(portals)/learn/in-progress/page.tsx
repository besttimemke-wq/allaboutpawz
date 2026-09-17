'use client';

import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { PlayCircle, Clock } from 'lucide-react';

// ============================================================================
// Learning Center — In Progress. Courses this account has started but not
// finished, with resume points. Progress lives with the account, so a
// customer and a groomer each see their own.
// ============================================================================

interface InProgressCourse {
  id: string;
  title: string;
  track: string;
  lesson: string;
  percent: number;
  minutesLeft: number;
}

const IN_PROGRESS: InProgressCourse[] = [
  { id: 'ip1', title: 'Poodle Trim Patterns 101', track: 'Grooming', lesson: 'Lesson 4 · Continental pattern boundaries', percent: 50, minutesLeft: 22 },
  { id: 'ip2', title: 'Preparing Your Dog for a Groom', track: 'Pet Parent', lesson: 'Lesson 2 · Carrier positive-association', percent: 25, minutesLeft: 11 },
];

export default function InProgressPage() {
  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">In Progress</h1>
        <p className="text-sm text-muted-foreground mt-1">Pick up where you left off.</p>
      </div>

      {IN_PROGRESS.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nothing in progress — browse the catalog to start a course.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {IN_PROGRESS.map((c) => (
            <Card key={c.id} className="border-border/60">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13px] font-semibold leading-snug">{c.title}</p>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide shrink-0">
                    {c.track}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{c.lesson}</p>
                <Progress value={c.percent} className="h-1.5" />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                    <Clock className="size-3" /> {c.minutesLeft} min left
                  </span>
                  <Button size="sm" className="h-8 text-xs">
                    <PlayCircle className="size-4 mr-1" /> Resume
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
