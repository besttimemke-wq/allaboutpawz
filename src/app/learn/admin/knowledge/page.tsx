'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Database, Trash2, Plus, Loader2 } from 'lucide-react';

interface Chunk { id: string; sourceId: string; pathwayCode: string; moduleCode: string; text: string; safetyFlag: boolean; createdAt: string; }
const PATHWAYS = ['VET', 'VTE', 'VST', 'VPM', 'VTN', 'PVM', 'VPT', 'EQN', 'GRO', 'FEL', 'ZKA', 'PRT', 'ABT', 'ACA', 'GSP'];

export default function AdminKnowledgePage() {
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [newChunk, setNewChunk] = useState({ sourceId: '', pathwayCode: 'VET', moduleCode: '', text: '', safetyFlag: false });

  const load = () => { fetch(`/api/knowledge${filter ? `?pathwayCode=${filter}` : ''}`).then(r => r.json()).then(d => setChunks(d.chunks || [])).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, [filter]);

  const add = async () => {
    await fetch('/api/knowledge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newChunk) });
    setNewChunk({ sourceId: '', pathwayCode: 'VET', moduleCode: '', text: '', safetyFlag: false });
    setShowForm(false); load();
  };
  const remove = async (id: string) => { await fetch(`/api/knowledge?id=${id}`, { method: 'DELETE' }); load(); };

  return (
    <div className="p-6 space-y-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><Database className="size-6" /> Knowledge Base</h1><p className="text-sm text-muted-foreground mt-1">RAG chunks that ground the AI Professor.</p></div>
        <Button onClick={() => setShowForm(!showForm)}><Plus className="size-4 mr-1" /> Add Chunk</Button>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Filter:</span>
        <select value={filter} onChange={e => setFilter(e.target.value)} className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"><option value="">All Pathways</option>{PATHWAYS.map(p => <option key={p}>{p}</option>)}</select>
        <span className="text-xs text-muted-foreground ml-2">{chunks.length} chunks</span>
      </div>
      {showForm && (
        <Card><CardHeader><CardTitle className="text-base">New Knowledge Chunk</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <Input placeholder="Source ID" value={newChunk.sourceId} onChange={e => setNewChunk({ ...newChunk, sourceId: e.target.value })} />
              <select value={newChunk.pathwayCode} onChange={e => setNewChunk({ ...newChunk, pathwayCode: e.target.value })} className="rounded-md border border-input bg-background px-3 py-2 text-sm">{PATHWAYS.map(p => <option key={p}>{p}</option>)}</select>
              <Input placeholder="Module Code" value={newChunk.moduleCode} onChange={e => setNewChunk({ ...newChunk, moduleCode: e.target.value })} />
            </div>
            <Textarea placeholder="Paste curriculum text…" value={newChunk.text} onChange={e => setNewChunk({ ...newChunk, text: e.target.value })} className="min-h-[120px]" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={newChunk.safetyFlag} onChange={e => setNewChunk({ ...newChunk, safetyFlag: e.target.checked })} />Safety-flagged (requires instructor verification)</label>
            <Button onClick={add} disabled={!newChunk.text.trim() || !newChunk.sourceId.trim()}>Ingest Chunk</Button>
          </CardContent>
        </Card>
      )}
      {loading ? <div className="text-center py-8"><Loader2 className="size-6 animate-spin mx-auto" /></div> :
       chunks.length === 0 ? <Card><CardContent className="py-12 text-center text-muted-foreground">No knowledge chunks yet.</CardContent></Card> :
       <div className="space-y-2">{chunks.map(c => (
         <Card key={c.id}><CardContent className="p-4">
           <div className="flex items-start justify-between gap-3">
             <div className="flex-1 min-w-0">
               <div className="flex items-center gap-2 mb-1"><Badge variant="secondary" className="text-[10px] font-mono">{c.pathwayCode}</Badge><Badge variant="outline" className="text-[10px]">{c.moduleCode}</Badge>{c.safetyFlag && <Badge variant="destructive" className="text-[10px]">SAFETY</Badge>}<span className="text-[10px] text-muted-foreground">{c.sourceId}</span></div>
               <p className="text-sm text-muted-foreground line-clamp-2">{c.text}</p>
             </div>
             <Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="size-4 text-muted-foreground" /></Button>
           </div>
         </CardContent></Card>
       ))}</div>
      }
    </div>
  );
}
