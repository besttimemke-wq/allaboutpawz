'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Clock } from 'lucide-react';

export default function InstructorSessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch('/api/instructor').then(r => r.json()).then(d => setSessions(d.sessions || [])).finally(() => setLoading(false)); }, []);
  if (loading) return <div className="p-6 text-muted-foreground">Loading sessions…</div>;
  return (
    <div className="p-6 space-y-6 max-w-[1200px] mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><Users className="size-6" /> Live Sessions</h1>
        <p className="text-sm text-muted-foreground mt-1">Active and recent learning sessions.</p>
      </div>
      {sessions.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No active sessions.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {sessions.map(s => (
            <Card key={s.id}><CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1"><p className="text-sm font-medium">{s.courseTitle || `Course ${s.courseId}`}</p><p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="size-3" />Opened {new Date(s.openedAt).toLocaleString()}</p></div>
              <div className="flex items-center gap-2"><Badge variant={s.state === 'BREAK_LOCKED' ? 'secondary' : s.state === 'CLOSED' ? 'outline' : 'default'}>{s.state.replace(/_/g, ' ').toLowerCase()}</Badge></div>
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}
