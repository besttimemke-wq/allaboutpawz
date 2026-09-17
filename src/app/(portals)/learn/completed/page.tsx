'use client';

import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, RotateCcw, Award } from 'lucide-react';

// ============================================================================
// Learning Center — Completed. Finished courses with completion dates and
// the certificate they earned (when the course issues one).
// ============================================================================

interface CompletedCourse {
  id: string;
  title: string;
  track: string;
  completedOn: string;
  certificate: boolean;
}

const COMPLETED: CompletedCourse[] = [
  { id: 'cp1', title: 'Bathing & Drying Fundamentals', track: 'Grooming', completedOn: 'Apr 28, 2025', certificate: true },
  { id: 'cp2', title: 'Safe Handling & Bite Prevention', track: 'Safety', completedOn: 'Apr 22, 2025', certificate: true },
  { id: 'cp3', title: 'Booking & Deposits Walkthrough', track: 'Salon Ops', completedOn: 'Mar 30, 2025', certificate: false },
];

export default function CompletedPage() {
  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Completed</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {COMPLETED.length} courses finished. Nice work.
        </p>
      </div>

      {COMPLETED.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No completed courses yet — your finished courses will appear here.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5 max-w-3xl">
          {COMPLETED.map((c) => (
            <Card key={c.id} className="border-border/60">
              <CardContent className="p-4 flex flex-wrap items-center gap-3">
                <CheckCircle2 className="size-5 text-emerald-500 shrink-0" />
                <div className="min-w-[180px] flex-1">
                  <p className="text-[13px] font-medium">{c.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Completed {c.completedOn} · {c.track}
                  </p>
                </div>
                {c.certificate ? (
                  <Badge className="bg-amber-100 text-amber-800 border-0">
                    <Award className="size-3 mr-1" /> Certificate earned
                  </Badge>
                ) : (
                  <Badge variant="secondary">No certificate</Badge>
                )}
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <RotateCcw className="size-3.5 mr-1" /> Review
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
