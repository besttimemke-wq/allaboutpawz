'use client';

import React, { useState } from 'react';
import {
  useCommunications,
  type AnnouncementRow,
  type NotificationQueueRow,
} from '@/hooks/useCommunications';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Bell, Search, Loader2, AlertCircle } from 'lucide-react';

export default function LmsCommunicationPage() {
  const { announcements, notifications, isLoading, error } = useCommunications();
  const [annSearch, setAnnSearch] = useState('');
  const [notifSearch, setNotifSearch] = useState('');

  const filteredAnn = announcements.filter((r: AnnouncementRow) => {
    if (!annSearch.trim()) return true;
    const q = annSearch.toLowerCase();
    return (
      (r.title?.toLowerCase().includes(q)) ||
      (r.author_type?.toLowerCase().includes(q)) ||
      (r.audience_scope?.toLowerCase().includes(q)) ||
      (r.course_title?.toLowerCase().includes(q))
    );
  });

  const filteredNotifs = notifications.filter((r: NotificationQueueRow) => {
    if (!notifSearch.trim()) return true;
    const q = notifSearch.toLowerCase();
    return (
      (r.recipient_name?.toLowerCase().includes(q)) ||
      (r.notification_type?.toLowerCase().includes(q)) ||
      (r.channel?.toLowerCase().includes(q)) ||
      (r.status?.toLowerCase().includes(q)) ||
      (r.subject?.toLowerCase().includes(q))
    );
  });

  const publishedAnn = announcements.filter(a => a.is_published).length;
  const sentNotifs = notifications.filter(n => n.status === 'sent').length;
  const pendingNotifs = notifications.filter(n => n.status === 'pending' || n.status === 'queued').length;

  return (
    <div className="flex flex-col w-full h-full p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Communications</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Announcements and the notification delivery queue.</p>
        </div>
        <Badge variant="secondary" className="gap-1.5">
          <Bell className="size-3" />
          {announcements.length + notifications.length} records
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Announcements', value: announcements.length },
          { label: 'Published', value: publishedAnn },
          { label: 'Notifications Sent', value: sentNotifs },
          { label: 'Pending Send', value: pendingNotifs },
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

      {/* Announcements Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold tracking-tight text-foreground">Announcements</h2>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search announcements…"
              value={annSearch}
              onChange={(e) => setAnnSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                <span className="text-sm">Loading announcements…</span>
              </div>
            ) : filteredAnn.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <span className="text-sm">No announcements posted yet.</span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Audience</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Published</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAnn.map((r: AnnouncementRow) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.title}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px] capitalize">{r.author_type}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px] capitalize">{r.audience_scope}</Badge></TableCell>
                      <TableCell className="text-[13px] text-muted-foreground">{r.course_title || '—'}</TableCell>
                      <TableCell>
                        {r.is_published ? (
                          <Badge variant="secondary" className="text-[10px]">Published</Badge>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">Draft</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-[13px]">
                        {r.published_at ? new Date(r.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notifications Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold tracking-tight text-foreground">Notification Queue</h2>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search notifications…"
              value={notifSearch}
              onChange={(e) => setNotifSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                <span className="text-sm">Loading notification queue…</span>
              </div>
            ) : filteredNotifs.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <span className="text-sm">No notifications queued yet.</span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Retries</TableHead>
                    <TableHead>Sent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredNotifs.map((r: NotificationQueueRow) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        {r.recipient_name || <span className="text-muted-foreground">{r.user_id.slice(0, 8)}…</span>}
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{r.notification_type}</Badge></TableCell>
                      <TableCell className="text-[13px] text-muted-foreground capitalize">{r.channel}</TableCell>
                      <TableCell className="text-[13px] truncate max-w-[200px]" title={r.subject || ''}>{r.subject || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={
                          r.priority === 'urgent' || r.priority === 'high' ? 'destructive' :
                          r.priority === 'medium' ? 'default' :
                          'outline'
                        } className="text-[10px] capitalize">
                          {r.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          r.status === 'sent' ? 'secondary' :
                          r.status === 'failed' ? 'destructive' :
                          r.status === 'pending' || r.status === 'queued' ? 'default' :
                          'outline'
                        } className="capitalize">
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-[13px]">{r.retry_count ?? 0}</TableCell>
                      <TableCell className="text-muted-foreground text-[13px]">
                        {r.sent_at ? new Date(r.sent_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'}
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
