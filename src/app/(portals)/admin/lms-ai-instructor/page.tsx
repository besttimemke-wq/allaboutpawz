'use client';

import React, { useState } from 'react';
import {
  useAiInstructor,
  type AiInstructorPersonaRow,
  type AiPromptTemplateRow,
} from '@/hooks/useAiInstructor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Bot, Search, Loader2, AlertCircle } from 'lucide-react';

export default function LmsAiInstructorPage() {
  const { personas, promptTemplates, isLoading, error } = useAiInstructor();
  const [personaSearch, setPersonaSearch] = useState('');
  const [templateSearch, setTemplateSearch] = useState('');

  const filteredPersonas = personas.filter((r: AiInstructorPersonaRow) => {
    if (!personaSearch.trim()) return true;
    const q = personaSearch.toLowerCase();
    return (
      (r.name?.toLowerCase().includes(q)) ||
      (r.display_name?.toLowerCase().includes(q)) ||
      (r.voice_profile?.toLowerCase().includes(q)) ||
      (r.tone_default?.toLowerCase().includes(q)) ||
      (r.course_title?.toLowerCase().includes(q))
    );
  });

  const filteredTemplates = promptTemplates.filter((r: AiPromptTemplateRow) => {
    if (!templateSearch.trim()) return true;
    const q = templateSearch.toLowerCase();
    return (
      (r.template_name?.toLowerCase().includes(q)) ||
      (r.template_category?.toLowerCase().includes(q)) ||
      (r.system_prompt?.toLowerCase().includes(q))
    );
  });

  const activePersonas = personas.filter(p => p.is_active).length;
  const coInstructors = personas.filter(p => p.is_co_instructor).length;
  const activeTemplates = promptTemplates.filter(t => t.is_active).length;

  return (
    <div className="flex flex-col w-full h-full p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">AI Instructor Config</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Personas, voice profiles, and prompt templates that power AI-guided instruction.</p>
        </div>
        <Badge variant="secondary" className="gap-1.5">
          <Bot className="size-3" />
          {personas.length + promptTemplates.length} configs
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Personas', value: personas.length },
          { label: 'Active Personas', value: activePersonas },
          { label: 'Co-Instructors', value: coInstructors },
          { label: 'Prompt Templates', value: promptTemplates.length, sub: `${activeTemplates} active` },
        ].map(card => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{card.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground tabular-nums">{card.value}</p>
              {card.sub && <p className="text-[11px] text-muted-foreground mt-1">{card.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Error banner */}
      {error && !isLoading && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-2 text-destructive">
            <AlertCircle className="size-4" />
            <span className="text-sm">System Error: {error}</span>
          </CardContent>
        </Card>
      )}

      {/* Personas Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold tracking-tight text-foreground">Instructor Personas</h2>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search personas…"
              value={personaSearch}
              onChange={(e) => setPersonaSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                <span className="text-sm">Loading personas…</span>
              </div>
            ) : filteredPersonas.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <span className="text-sm">No instructor personas configured yet.</span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Display</TableHead>
                    <TableHead>Voice</TableHead>
                    <TableHead>Tone</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPersonas.map((r: AiInstructorPersonaRow) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-[13px] text-muted-foreground">{r.display_name}</TableCell>
                      <TableCell>
                        {r.voice_profile ? <Badge variant="outline" className="text-[10px] capitalize">{r.voice_profile}</Badge> : <span className="text-muted-foreground text-[11px]">—</span>}
                      </TableCell>
                      <TableCell className="text-[13px] text-muted-foreground capitalize">{r.tone_default || '—'}</TableCell>
                      <TableCell className="text-[13px] text-muted-foreground">{r.course_title || 'Global'}</TableCell>
                      <TableCell>
                        {r.is_co_instructor ? (
                          <Badge variant="secondary" className="text-[10px]">Co-Instructor</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">Primary</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {r.is_active ? (
                          <Badge variant="default" className="text-[10px]">Active</Badge>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">Inactive</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Prompt Templates Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold tracking-tight text-foreground">Prompt Templates</h2>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search templates…"
              value={templateSearch}
              onChange={(e) => setTemplateSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                <span className="text-sm">Loading prompt templates…</span>
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <span className="text-sm">No prompt templates defined yet.</span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>System Prompt</TableHead>
                    <TableHead>Model Config</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.map((r: AiPromptTemplateRow) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.template_name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px] capitalize">{r.template_category}</Badge></TableCell>
                      <TableCell className="text-[12px] text-muted-foreground truncate max-w-[280px]" title={r.system_prompt}>
                        {r.system_prompt || '—'}
                      </TableCell>
                      <TableCell className="font-mono text-[12px] text-muted-foreground">
                        {r.model_config_id ? r.model_config_id.slice(0, 12) : '—'}
                      </TableCell>
                      <TableCell>
                        {r.is_active ? (
                          <Badge variant="default" className="text-[10px]">Active</Badge>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">Inactive</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-[13px]">
                        {r.created_at ? new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
