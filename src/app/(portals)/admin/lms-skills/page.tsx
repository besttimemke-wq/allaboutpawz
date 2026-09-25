'use client';

import React, { useState } from 'react';
import {
  useSkills,
  type SkillRow,
  type SkillSignoffRow,
  type CredentialRow,
  type BadgeRow,
} from '@/hooks/useSkills';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Award, Search, Loader2, AlertCircle } from 'lucide-react';

export default function LmsSkillsPage() {
  const { skills, skillSignoffs, credentials, badges, isLoading, error } = useSkills();
  const [skillSearch, setSkillSearch] = useState('');
  const [signoffSearch, setSignoffSearch] = useState('');
  const [credSearch, setCredSearch] = useState('');
  const [badgeSearch, setBadgeSearch] = useState('');

  const filteredSkills = skills.filter((r: SkillRow) => {
    if (!skillSearch.trim()) return true;
    const q = skillSearch.toLowerCase();
    return (r.name?.toLowerCase().includes(q)) || (r.slug?.toLowerCase().includes(q));
  });

  const filteredSignoffs = skillSignoffs.filter((r: SkillSignoffRow) => {
    if (!signoffSearch.trim()) return true;
    const q = signoffSearch.toLowerCase();
    return (
      (r.learner_name?.toLowerCase().includes(q)) ||
      (r.skill_name?.toLowerCase().includes(q)) ||
      (r.signoff_level?.toLowerCase().includes(q)) ||
      (r.signoff_method?.toLowerCase().includes(q))
    );
  });

  const filteredCreds = credentials.filter((r: CredentialRow) => {
    if (!credSearch.trim()) return true;
    const q = credSearch.toLowerCase();
    return (
      (r.learner_name?.toLowerCase().includes(q)) ||
      (r.title?.toLowerCase().includes(q)) ||
      (r.credential_type?.toLowerCase().includes(q)) ||
      (r.issuer_name?.toLowerCase().includes(q))
    );
  });

  const filteredBadges = badges.filter((r: BadgeRow) => {
    if (!badgeSearch.trim()) return true;
    const q = badgeSearch.toLowerCase();
    return (
      (r.name?.toLowerCase().includes(q)) ||
      (r.badge_type?.toLowerCase().includes(q)) ||
      (r.slug?.toLowerCase().includes(q))
    );
  });

  const coreSkills = skills.filter(s => s.is_core).length;
  const activeBadges = badges.filter(b => b.is_active).length;
  const revokedCreds = credentials.filter(c => c.revoked_at).length;

  return (
    <div className="flex flex-col w-full h-full p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Skills & Credentials</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Skills registry, signoffs, credentials, and digital badges.</p>
        </div>
        <Badge variant="secondary" className="gap-1.5">
          <Award className="size-3" />
          {skills.length + skillSignoffs.length + credentials.length + badges.length} records
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Skills', value: skills.length, sub: `${coreSkills} core` },
          { label: 'Skill Signoffs', value: skillSignoffs.length, sub: 'Verified competencies' },
          { label: 'Credentials', value: credentials.length, sub: revokedCreds ? `${revokedCreds} revoked` : 'All valid' },
          { label: 'Badges', value: badges.length, sub: `${activeBadges} active` },
        ].map(card => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{card.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground tabular-nums">{card.value}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{card.sub}</p>
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

      {/* Tabs */}
      <Tabs defaultValue="skills">
        <TabsList>
          <TabsTrigger value="skills">Skills ({skills.length})</TabsTrigger>
          <TabsTrigger value="signoffs">Signoffs ({skillSignoffs.length})</TabsTrigger>
          <TabsTrigger value="credentials">Credentials ({credentials.length})</TabsTrigger>
          <TabsTrigger value="badges">Badges ({badges.length})</TabsTrigger>
        </TabsList>

        {/* Skills tab */}
        <TabsContent value="skills">
          <div className="space-y-3">
            <SearchInput placeholder="Search skills…" value={skillSearch} onChange={setSkillSearch} />
            <Card>
              <CardContent className="p-0">
                {isLoading ? <LoadingBlock label="Loading skills…" /> :
                  filteredSkills.length === 0 ? <EmptyBlock label="No skills defined yet." /> : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Slug</TableHead>
                          <TableHead>Domain</TableHead>
                          <TableHead>Core</TableHead>
                          <TableHead>Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSkills.map((r: SkillRow) => (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium">{r.name}</TableCell>
                            <TableCell><Badge variant="outline" className="font-mono text-[10px]">{r.slug}</Badge></TableCell>
                            <TableCell className="font-mono text-[12px] text-muted-foreground">{r.skill_domain_id?.slice(0, 12)}…</TableCell>
                            <TableCell>
                              {r.is_core ? <Badge variant="default" className="text-[10px]">Core</Badge> : <span className="text-muted-foreground text-[11px]">—</span>}
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
        </TabsContent>

        {/* Signoffs tab */}
        <TabsContent value="signoffs">
          <div className="space-y-3">
            <SearchInput placeholder="Search signoffs…" value={signoffSearch} onChange={setSignoffSearch} />
            <Card>
              <CardContent className="p-0">
                {isLoading ? <LoadingBlock label="Loading signoffs…" /> :
                  filteredSignoffs.length === 0 ? <EmptyBlock label="No skill signoffs yet." /> : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Learner</TableHead>
                          <TableHead>Skill</TableHead>
                          <TableHead>Level</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Verified</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSignoffs.map((r: SkillSignoffRow) => (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium">
                              {r.learner_name || <span className="text-muted-foreground">{r.learner_user_id.slice(0, 8)}…</span>}
                            </TableCell>
                            <TableCell>{r.skill_name || '—'}</TableCell>
                            <TableCell><Badge variant="outline" className="text-[10px]">{r.signoff_level}</Badge></TableCell>
                            <TableCell className="text-[13px] text-muted-foreground">{r.signoff_method}</TableCell>
                            <TableCell className="text-muted-foreground text-[13px]">
                              {r.verified_at ? new Date(r.verified_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                            </TableCell>
                            <TableCell className="text-[12px] text-muted-foreground truncate max-w-[200px]" title={r.notes || ''}>
                              {r.notes || '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Credentials tab */}
        <TabsContent value="credentials">
          <div className="space-y-3">
            <SearchInput placeholder="Search credentials…" value={credSearch} onChange={setCredSearch} />
            <Card>
              <CardContent className="p-0">
                {isLoading ? <LoadingBlock label="Loading credentials…" /> :
                  filteredCreds.length === 0 ? <EmptyBlock label="No credentials issued yet." /> : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Learner</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Issuer</TableHead>
                          <TableHead>Issued</TableHead>
                          <TableHead>Expires</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCreds.map((r: CredentialRow) => (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium">
                              {r.learner_name || <span className="text-muted-foreground">{r.learner_user_id.slice(0, 8)}…</span>}
                            </TableCell>
                            <TableCell>{r.title}</TableCell>
                            <TableCell><Badge variant="outline" className="text-[10px]">{r.credential_type}</Badge></TableCell>
                            <TableCell className="text-[13px] text-muted-foreground">{r.issuer_name || '—'}</TableCell>
                            <TableCell className="text-muted-foreground text-[13px]">
                              {r.issue_date ? new Date(r.issue_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-[13px]">
                              {r.expiry_date ? new Date(r.expiry_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                            </TableCell>
                            <TableCell>
                              {r.revoked_at ? (
                                <Badge variant="destructive" className="text-[10px]">Revoked</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px]">Valid</Badge>
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
        </TabsContent>

        {/* Badges tab */}
        <TabsContent value="badges">
          <div className="space-y-3">
            <SearchInput placeholder="Search badges…" value={badgeSearch} onChange={setBadgeSearch} />
            <Card>
              <CardContent className="p-0">
                {isLoading ? <LoadingBlock label="Loading badges…" /> :
                  filteredBadges.length === 0 ? <EmptyBlock label="No badges defined yet." /> : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Slug</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Points</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredBadges.map((r: BadgeRow) => (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium">{r.name}</TableCell>
                            <TableCell><Badge variant="outline" className="font-mono text-[10px]">{r.slug}</Badge></TableCell>
                            <TableCell><Badge variant="outline" className="text-[10px]">{r.badge_type}</Badge></TableCell>
                            <TableCell className="text-right tabular-nums text-[13px]">{r.points_value ?? '—'}</TableCell>
                            <TableCell>
                              {r.is_active ? <Badge variant="secondary" className="text-[10px]">Active</Badge> : <span className="text-muted-foreground text-[11px]">Inactive</span>}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SearchInput({ placeholder, value, onChange }: { placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative w-full max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9"
      />
    </div>
  );
}

function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

function EmptyBlock({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-16 text-muted-foreground">
      <span className="text-sm">{label}</span>
    </div>
  );
}
