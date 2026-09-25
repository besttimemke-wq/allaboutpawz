'use client';

import React, { useState } from 'react';
import {
  useCompliance,
  type ComplianceDocumentRow,
  type AuditLogRow,
} from '@/hooks/useCompliance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ShieldCheck, Search, Loader2, AlertCircle } from 'lucide-react';

export default function LmsCompliancePage() {
  const { documents, auditLog, isLoading, error } = useCompliance();
  const [docSearch, setDocSearch] = useState('');
  const [logSearch, setLogSearch] = useState('');

  const filteredDocs = documents.filter((r: ComplianceDocumentRow) => {
    if (!docSearch.trim()) return true;
    const q = docSearch.toLowerCase();
    return (
      (r.document_name?.toLowerCase().includes(q)) ||
      (r.document_type?.toLowerCase().includes(q)) ||
      (r.issued_by?.toLowerCase().includes(q)) ||
      (r.status?.toLowerCase().includes(q))
    );
  });

  const filteredLog = auditLog.filter((r: AuditLogRow) => {
    if (!logSearch.trim()) return true;
    const q = logSearch.toLowerCase();
    return (
      (r.action?.toLowerCase().includes(q)) ||
      (r.actor_role?.toLowerCase().includes(q)) ||
      (r.target_entity_type?.toLowerCase().includes(q)) ||
      (r.actor_user_id?.toLowerCase().includes(q))
    );
  });

  const activeDocs = documents.filter(d => d.status === 'active' || d.status === 'current').length;
  const expiredDocs = documents.filter(d => d.status === 'expired').length;

  return (
    <div className="flex flex-col w-full h-full p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Compliance</h1>
          <p className="text-[13px] text-muted-foreground mt-1">State board compliance documents and the immutable audit log.</p>
        </div>
        <Badge variant="secondary" className="gap-1.5">
          <ShieldCheck className="size-3" />
          {documents.length + auditLog.length} records
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Documents', value: documents.length },
          { label: 'Active', value: activeDocs },
          { label: 'Expired', value: expiredDocs },
          { label: 'Audit Log Entries', value: auditLog.length },
        ].map(card => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{card.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground tabular-nums">{card.value}</p>
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

      {/* Compliance Documents Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold tracking-tight text-foreground">Compliance Documents</h2>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search documents…"
              value={docSearch}
              onChange={(e) => setDocSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                <span className="text-sm">Loading compliance documents…</span>
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <span className="text-sm">No compliance documents on file.</span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Issued By</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocs.map((r: ComplianceDocumentRow) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.document_name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{r.document_type}</Badge></TableCell>
                      <TableCell className="text-[13px] text-muted-foreground">{r.issued_by || '—'}</TableCell>
                      <TableCell className="text-muted-foreground text-[13px]">
                        {r.issued_date ? new Date(r.issued_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-[13px]">
                        {r.expiry_date ? new Date(r.expiry_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          r.status === 'active' || r.status === 'current' ? 'secondary' :
                          r.status === 'expired' ? 'destructive' :
                          'outline'
                        } className="capitalize">
                          {r.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Audit Log Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold tracking-tight text-foreground">Audit Log</h2>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search audit log…"
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                <span className="text-sm">Loading audit log…</span>
              </div>
            ) : filteredLog.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <span className="text-sm">No audit log entries yet.</span>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto custom-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>IP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLog.map((r: AuditLogRow) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-muted-foreground text-[13px] whitespace-nowrap">
                          {r.created_at ? new Date(r.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'}
                        </TableCell>
                        <TableCell className="font-medium text-[13px]">{r.action}</TableCell>
                        <TableCell className="font-mono text-[12px] text-muted-foreground">
                          {r.actor_user_id ? `${r.actor_user_id.slice(0, 8)}…` : '—'}
                        </TableCell>
                        <TableCell>
                          {r.actor_role ? <Badge variant="outline" className="text-[10px] capitalize">{r.actor_role}</Badge> : <span className="text-muted-foreground text-[11px]">—</span>}
                        </TableCell>
                        <TableCell className="text-[13px]">
                          <span className="text-muted-foreground">{r.target_entity_type}</span>
                          {r.target_entity_id && (
                            <span className="font-mono text-[11px] text-muted-foreground ml-2">{r.target_entity_id.slice(0, 12)}…</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-[12px] text-muted-foreground">{r.ip_address || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
