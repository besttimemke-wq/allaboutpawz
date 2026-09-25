'use client';
import React from 'react';
import { useCampaigns, useAutomations } from '@/hooks/useMarketingData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, Workflow, Users, Send, Loader2, Plus, ArrowRight, Zap, Target } from 'lucide-react';
import Link from 'next/link';

export default function MarketingPage() {
  const { data: campData, isLoading: campLoading } = useCampaigns();
  const { data: autoData, isLoading: autoLoading } = useAutomations();
  const campaigns = campData?.campaigns ?? [];
  const templates = campData?.templates ?? [];
  const segments = campData?.segments ?? [];
  const workflows = autoData?.workflows ?? [];
  const enrollments = autoData?.enrollments ?? [];

  const stats = [
    { label: 'Campaigns', value: campaigns.length, icon: Mail, color: '#547590' },
    { label: 'Templates', value: templates.length, icon: Send, color: '#187b65' },
    { label: 'Segments', value: segments.length, icon: Users, color: '#956e29' },
    { label: 'Automations', value: workflows.length, icon: Workflow, color: '#7761a6' },
  ];

  return (
    <div className="flex flex-col w-full h-full p-6 space-y-6">
      <div><h1 className="text-2xl font-semibold tracking-tight text-foreground">Marketing & Automation</h1><p className="text-[13px] text-muted-foreground mt-1">Campaign management, automated lifecycle flows, and customer segments.</p></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(s => (
          <Card key={s.label}><CardContent className="pt-4 pb-4"><div className="flex items-center justify-between mb-1"><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{s.label}</p><s.icon className="size-3.5" style={{ color: s.color }} /></div><p className="text-xl font-bold">{campLoading && autoLoading ? '…' : s.value}</p></CardContent></Card>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card><CardHeader><div className="flex items-center justify-between"><CardTitle className="text-[15px] flex items-center gap-2"><Mail className="size-4" /> Campaigns</CardTitle><Button asChild variant="ghost" size="sm"><Link href="/admin/marketing/campaigns">View All <ArrowRight className="size-3" /></Link></Button></div></CardHeader><CardContent>{campLoading ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : campaigns.length === 0 ? <p className="text-[13px] text-muted-foreground py-4">No campaigns yet. Create one to start reaching customers.</p> : <div className="space-y-2">{campaigns.slice(0, 3).map((c: any) => <div key={c.id} className="flex items-center justify-between text-[13px]"><span className="font-medium">{c.name}</span><Badge variant="outline">{c.status}</Badge></div>)}</div>}</CardContent></Card>
        <Card><CardHeader><div className="flex items-center justify-between"><CardTitle className="text-[15px] flex items-center gap-2"><Zap className="size-4" /> Automations</CardTitle><Button asChild variant="ghost" size="sm"><Link href="/admin/marketing/automations">View All <ArrowRight className="size-3" /></Link></Button></div></CardHeader><CardContent>{autoLoading ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : workflows.length === 0 ? <p className="text-[13px] text-muted-foreground py-4">No automation workflows yet. Set up triggers to automate customer journeys.</p> : <div className="space-y-2">{workflows.slice(0, 3).map((w: any) => <div key={w.id} className="flex items-center justify-between text-[13px]"><span className="font-medium">{w.name}</span><Badge variant="outline">{w.status}</Badge></div>)}</div>}</CardContent></Card>
      </div>
      {enrollments.length > 0 && (
        <Card><CardHeader><CardTitle className="text-[15px] flex items-center gap-2"><Target className="size-4" /> Recent Enrollment Activity</CardTitle></CardHeader><CardContent><div className="space-y-2">{enrollments.slice(0, 5).map((e: any) => <div key={e.id} className="flex items-center justify-between text-[13px]"><span>Step {e.current_step} — {e.status}</span><span className="text-muted-foreground">{new Date(e.created_at).toLocaleDateString()}</span></div>)}</div></CardContent></Card>
      )}
    </div>
  );
}
