'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ClipboardCheck, Clock, AlertCircle } from 'lucide-react';

interface ReviewItem { id: number; reason: string; status: string; context: { item?: string; lessonTitle?: string; workKind?: string; state?: string; }; createdAt: string; }

export default function InstructorReviewPage() {
  const [queue, setQueue] = useState<ReviewItem[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolution, setResolution] = useState<Record<number, string>>({});

  useEffect(() => {
    fetch('/api/instructor').then(r => r.json()).then(d => { setQueue(d.reviewQueue || []); setAssessments(d.assessments || []); }).finally(() => setLoading(false));
  }, []);

  const resolve = async (id: number, decision: string) => {
    await fetch('/api/instructor/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ queueId: id, decision, note: resolution[id] || '' }) });
    setQueue(q => q.filter(i => i.id !== id));
    setResolution(r => ({ ...r, [id]: '' }));
  };

  if (loading) return <div className="p-6 text-muted-foreground">Loading review queue…</div>;

  return (
    <div className="p-6 space-y-6 max-w-[1200px] mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><ClipboardCheck className="size-6" /> Review Queue</h1>
        <p className="text-sm text-muted-foreground mt-1">Learner hand-raise requests and assessments requiring instructor review.</p>
      </div>
      {queue.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><AlertCircle className="size-8 mx-auto mb-2 opacity-50" />No items in the review queue.</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {queue.map(item => (
            <Card key={item.id}>
              <CardHeader><div className="flex items-center justify-between"><CardTitle className="text-base">{item.context?.lessonTitle || item.context?.item || 'Review Request'}</CardTitle><Badge variant={item.status === 'OPEN' ? 'destructive' : 'secondary'}>{item.status}</Badge></div></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{item.reason}</p>
                {item.context?.item && <p className="text-xs text-muted-foreground border-l-2 pl-3">{item.context.item}</p>}
                <div className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="size-3" />{new Date(item.createdAt).toLocaleString()}</div>
                <Textarea placeholder="Resolution note…" value={resolution[item.id] || ''} onChange={e => setResolution(r => ({ ...r, [item.id]: e.target.value }))} className="text-sm" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => resolve(item.id, 'passed')}>Resolve & Return to Professor</Button>
                  <Button size="sm" variant="outline" onClick={() => resolve(item.id, 'revision_required')}>Needs Revision</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {assessments.length > 0 && (
        <>
          <h2 className="text-lg font-semibold pt-4">Recent Assessment Attempts</h2>
          <div className="grid gap-3">
            {assessments.slice(0, 10).map((a, i) => (
              <Card key={i}><CardContent className="p-4 flex items-center justify-between">
                <div><p className="text-sm font-medium">{a.item}</p><p className="text-xs text-muted-foreground">{a.workKind} · {a.stage} · Attempt {a.attemptNo}</p></div>
                <div className="flex items-center gap-2"><Badge variant={a.passed ? 'default' : 'destructive'}>{a.passed ? 'Accepted' : 'Needs Work'}</Badge><span className="text-xs text-muted-foreground">{Math.round(a.score * 100)}%</span></div>
              </CardContent></Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
