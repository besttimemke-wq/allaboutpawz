'use client';

import React, { useState } from 'react';
import { useMedia, type MediaAssetRow } from '@/hooks/useMedia';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { FolderOpen, Search, Loader2, AlertCircle, FileText, Video, Music, Image as ImageIcon } from 'lucide-react';

function MediaIcon({ type }: { type: string }) {
  if (type === 'video') return <Video className="size-3.5" />;
  if (type === 'audio') return <Music className="size-3.5" />;
  if (type === 'image') return <ImageIcon className="size-3.5" />;
  return <FileText className="size-3.5" />;
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default function LmsMediaPage() {
  const { media, isLoading, error } = useMedia();
  const [search, setSearch] = useState('');

  const filtered = media.filter((r: MediaAssetRow) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (r.title?.toLowerCase().includes(q)) ||
      (r.media_type?.toLowerCase().includes(q)) ||
      (r.file_name?.toLowerCase().includes(q)) ||
      (r.mime_type?.toLowerCase().includes(q))
    );
  });

  const videos = media.filter(m => m.media_type === 'video').length;
  const audio = media.filter(m => m.media_type === 'audio').length;
  const published = media.filter(m => m.is_published).length;

  return (
    <div className="flex flex-col w-full h-full p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Media Library</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Video, audio, image, and document assets for lessons and content blocks.</p>
        </div>
        <Badge variant="secondary" className="gap-1.5">
          <FolderOpen className="size-3" />
          {media.length} assets
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Assets', value: media.length },
          { label: 'Videos', value: videos },
          { label: 'Audio Files', value: audio },
          { label: 'Published', value: published },
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search by title, file name, or type…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              <span className="text-sm">Loading media library…</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-16 gap-2 text-destructive">
              <AlertCircle className="size-4" />
              <span className="text-sm">System Error: {error}</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <span className="text-sm">No media assets uploaded yet.</span>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>File</TableHead>
                    <TableHead className="text-right">Size</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                    <TableHead>Accessible</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r: MediaAssetRow) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center size-6 rounded-md bg-muted text-muted-foreground">
                            <MediaIcon type={r.media_type} />
                          </div>
                          <span>{r.title}</span>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px] capitalize">{r.media_type}</Badge></TableCell>
                      <TableCell className="font-mono text-[12px] text-muted-foreground truncate max-w-[180px]" title={r.file_name}>
                        {r.file_name}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-[13px]">{formatBytes(r.file_size_bytes)}</TableCell>
                      <TableCell className="text-right tabular-nums text-[13px]">
                        {r.duration_seconds ? `${Math.round(Number(r.duration_seconds))}s` : '—'}
                      </TableCell>
                      <TableCell>
                        {r.is_accessible ? (
                          <Badge variant="secondary" className="text-[10px]">A11y</Badge>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {r.is_published ? (
                          <Badge variant="default" className="text-[10px]">Published</Badge>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">Draft</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-[13px]">
                        {r.created_at ? new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
