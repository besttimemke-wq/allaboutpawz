'use client';
import React, { useState } from 'react';
import { useCampaigns } from '@/hooks/useMarketingData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Mail, Search, Loader2, AlertCircle, Plus, Users, Send, Tag } from 'lucide-react';

export default function CampaignsPage() {
  const { data, isLoading, isError, error } = useCampaigns();
  const campaigns = data?.campaigns ?? [];
  const templates = data?.templates ?? [];
  const segments = data?.segments ?? [];
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'campaigns' | 'templates' | 'segments'>('campaigns');

  const filtered = campaigns.filter((c: any) => !search.trim() || c.name?.toLowerCase().includes(search.toLowerCase()));
  const statusVariant = (s: string) => s === 'active' || s === 'completed' ? 'default' : 'outline';

  return (
    <div className="flex flex-col w-full h-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold tracking-tight text-foreground">Campaigns</h1><p className="text-[13px] text-muted-foreground mt-1">Marketing campaigns, message templates, and customer segments.</p></div>
        <Button className="gap-1.5"><Plus className="size-4" /> New Campaign</Button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[{label:'Campaigns',value:campaigns.length,icon:Mail},{label:'Templates',value:templates.length,icon:Send},{label:'Segments',value:segments.length,icon:Users}].map(c => (
          <Card key={c.label}><CardContent className="pt-4 pb-4"><div className="flex items-center gap-2 mb-1"><c.icon className="size-3.5 text-muted-foreground" /><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{c.label}</p></div><p className="text-xl font-bold">{c.value}</p></CardContent></Card>
        ))}
      </div>
      <div className="flex gap-2">
        {(['campaigns','templates','segments'] as const).map(t => <Button key={t} variant={tab===t?'default':'outline'} size="sm" onClick={()=>setTab(t)} className="capitalize">{t}</Button>)}
      </div>
      {tab === 'campaigns' && (
        <Card><CardContent className="p-0">
          {isLoading ? <LoadingSpinner /> : isError ? <ErrorDisplay error={error} /> : filtered.length === 0 ? <EmptyState icon={Mail} label="campaigns" /> :
          <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Channel</TableHead><TableHead>Status</TableHead><TableHead>Members</TableHead><TableHead>Scheduled</TableHead></TableRow></TableHeader><TableBody>
            {filtered.map((c: any) => (<TableRow key={c.id}><TableCell className="font-medium">{c.name}</TableCell><TableCell className="text-[13px]">{c.campaign_type}</TableCell><TableCell><Badge variant="outline" className="text-[10px]">{c.channel}</Badge></TableCell><TableCell><Badge variant={statusVariant(c.status)}>{c.status}</Badge></TableCell><TableCell className="tabular-nums">{c.member_count ?? 0}</TableCell><TableCell className="text-[13px] text-muted-foreground">{c.scheduled_at ? new Date(c.scheduled_at).toLocaleDateString() : '—'}</TableCell></TableRow>))}
          </TableBody></Table>}
        </CardContent></Card>
      )}
      {tab === 'templates' && (
        <Card><CardContent className="p-0">
          {isLoading ? <LoadingSpinner /> : templates.length === 0 ? <EmptyState icon={Send} label="templates" /> :
          <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Channel</TableHead><TableHead>Subject</TableHead><TableHead>Category</TableHead><TableHead>System</TableHead><TableHead>Active</TableHead></TableRow></TableHeader><TableBody>
            {templates.map((t: any) => (<TableRow key={t.id}><TableCell className="font-medium">{t.name}</TableCell><TableCell><Badge variant="outline" className="text-[10px]">{t.channel}</Badge></TableCell><TableCell className="text-[13px] text-muted-foreground truncate max-w-[200px]">{t.subject || '—'}</TableCell><TableCell className="text-[13px]">{t.category || '—'}</TableCell><TableCell>{t.is_system ? <Badge variant="secondary">Yes</Badge> : 'No'}</TableCell><TableCell>{t.is_active ? <Badge variant="default">Active</Badge> : <Badge variant="outline">Inactive</Badge>}</TableCell></TableRow>))}
          </TableBody></Table>}
        </CardContent></Card>
      )}
      {tab === 'segments' && (
        <Card><CardContent className="p-0">
          {isLoading ? <LoadingSpinner /> : segments.length === 0 ? <EmptyState icon={Users} label="segments" /> :
          <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Entity</TableHead><TableHead>Type</TableHead><TableHead>Members</TableHead><TableHead>Active</TableHead></TableRow></TableHeader><TableBody>
            {segments.map((s: any) => (<TableRow key={s.id}><TableCell className="font-medium">{s.name}</TableCell><TableCell className="text-[13px]">{s.entity_type}</TableCell><TableCell className="text-[13px]">{s.segment_type}</TableCell><TableCell className="tabular-nums">{s.member_count ?? 0}</TableCell><TableCell>{s.is_active ? <Badge variant="default">Active</Badge> : <Badge variant="outline">Inactive</Badge>}</TableCell></TableRow>))}
          </TableBody></Table>}
        </CardContent></Card>
      )}
    </div>
  );
}

function LoadingSpinner() { return <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" /><span className="text-sm">Loading…</span></div>; }
function ErrorDisplay({ error }: { error: any }) { return <div className="flex items-center justify-center py-16 gap-2 text-destructive"><AlertCircle className="size-4" /><span className="text-sm">Error: {(error as Error)?.message}</span></div>; }
function EmptyState({ icon: Icon, label }: { icon: any; label: string }) { return <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground"><Icon className="size-8 opacity-40" /><span className="text-sm">No {label} yet.</span></div>; }
