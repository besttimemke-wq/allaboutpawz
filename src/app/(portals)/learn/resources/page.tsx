'use client';

import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FolderOpen, FileText, Video, Link2 } from 'lucide-react';

// ============================================================================
// Learning Center — Resources. Downloadable reference material that
// accompanies the courses: handling charts, sanitation checklists,
// client-facing handouts.
// ============================================================================

interface Resource {
  id: string;
  title: string;
  kind: 'PDF' | 'Video' | 'Link';
  track: string;
}

const RESOURCES: Resource[] = [
  { id: 'r1', title: 'Sanitation Daily Checklist', kind: 'PDF', track: 'Safety' },
  { id: 'r2', title: 'Handling Stress Signals Chart', kind: 'PDF', track: 'Safety' },
  { id: 'r3', title: 'Drying Temperature Reference', kind: 'PDF', track: 'Grooming' },
  { id: 'r4', title: 'Grooming Loop Safety Demo', kind: 'Video', track: 'Safety' },
  { id: 'r5', title: 'Supplies Ordering Guide', kind: 'Link', track: 'Salon Ops' },
];

const KIND_ICON = {
  PDF: FileText,
  Video: Video,
  Link: Link2,
};

export default function ResourcesPage() {
  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Resources</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Reference material that accompanies your courses.
        </p>
      </div>

      {RESOURCES.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Resources will appear here as courses publish them.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5 max-w-3xl">
          {RESOURCES.map((r) => {
            const Icon = KIND_ICON[r.kind];
            return (
              <Card key={r.id} className="border-border/60">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex items-center justify-center size-9 rounded-lg bg-muted">
                    <Icon className="size-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-[160px] flex-1">
                    <p className="text-[13px] font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {r.kind} · {r.track}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 text-xs">
                    <FolderOpen className="size-3.5 mr-1" /> Open
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
