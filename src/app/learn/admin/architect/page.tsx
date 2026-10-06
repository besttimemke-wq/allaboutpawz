'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Wrench, Loader2, CheckCircle2 } from 'lucide-react';

const OPERATIONS = [
  { id: 'strengthen_lesson', label: 'Strengthen Lesson' },
  { id: 'generate_practice', label: 'Generate Practice' },
  { id: 'assessment_alignment', label: 'Assessment Alignment' },
  { id: 'accessibility_pass', label: 'Accessibility Pass' },
  { id: 'draft_module', label: 'Draft New Module' },
];
const PATHWAYS = ['VET', 'VTE', 'VST', 'VPM', 'VTN', 'PVM', 'VPT', 'EQN', 'GRO', 'FEL', 'ZKA', 'PRT', 'ABT', 'ACA', 'GSP'];

export default function AdminArchitectPage() {
  const [pathway, setPathway] = useState('VET');
  const [operation, setOperation] = useState('strengthen_lesson');
  const [brief, setBrief] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const run = async () => {
    setLoading(true); setResult(null);
    try {
      const res = await fetch('/api/admin/course-architect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pathwayCode: pathway, operation, brief }) });
      setResult(await res.json());
    } catch { setResult({ error: 'Request failed' }); }
    finally { setLoading(false); }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1000px] mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><Wrench className="size-6" /> Course Architect</h1>
        <p className="text-sm text-muted-foreground mt-1">AI-assisted lesson authoring with RAG-grounded curriculum context.</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Draft New Content</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium mb-1.5 block">Pathway</label><select value={pathway} onChange={e => setPathway(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">{PATHWAYS.map(p => <option key={p}>{p}</option>)}</select></div>
            <div><label className="text-sm font-medium mb-1.5 block">Operation</label><select value={operation} onChange={e => setOperation(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">{OPERATIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}</select></div>
          </div>
          <div><label className="text-sm font-medium mb-1.5 block">Brief</label><Textarea value={brief} onChange={e => setBrief(e.target.value)} placeholder="Describe what you want the AI to draft…" className="min-h-[100px]" /></div>
          <Button onClick={run} disabled={loading || !brief.trim()}>{loading ? <><Loader2 className="size-4 mr-2 animate-spin" /> Drafting…</> : 'Generate Draft'}</Button>
        </CardContent>
      </Card>
      {result && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><CheckCircle2 className="size-5 text-green-600" /> Draft Result</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {result.error ? <p className="text-sm text-destructive">{result.error}</p> : (
              <>
                <div className="flex items-center gap-2"><Badge variant="secondary">{result.status || 'draft'}</Badge>{result.guardrails && <span className="text-xs text-muted-foreground">{result.guardrails.length} guardrails</span>}</div>
                {result.content && <div className="space-y-2 text-sm">{result.content.title && <p className="font-semibold text-base">{result.content.title}</p>}{result.content.summary && <p className="text-muted-foreground">{result.content.summary}</p>}{result.content.objectives && <div><p className="font-medium mt-2">Objectives:</p><ul className="list-disc pl-5 space-y-0.5">{result.content.objectives.map((o: string, i: number) => <li key={i}>{o}</li>)}</ul></div>}</div>}
                {result.guardrails && result.guardrails.length > 0 && <div className="rounded-md bg-muted p-3 space-y-1"><p className="text-xs font-semibold uppercase text-muted-foreground">Human Accountability Checklist</p>{result.guardrails.map((g: string, i: number) => <p key={i} className="text-xs text-muted-foreground">• {g}</p>)}</div>}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
