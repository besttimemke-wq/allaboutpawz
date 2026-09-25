'use client';
import React, { useState } from 'react';
import { useStaffRoster, useStaffSchedules } from '@/hooks/useStaffData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Search, Loader2, AlertCircle, Clock, CalendarDays, Award } from 'lucide-react';

export default function StaffPage() {
  const { data: staff = [], isLoading, isError, error } = useStaffRoster();
  const { data: scheduleData } = useStaffSchedules();
  const [search, setSearch] = useState('');

  const filtered = staff.filter((s: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return s.display_name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q) || s.role?.toLowerCase().includes(q) || (s.service_specialties || []).some((sp: string) => sp.toLowerCase().includes(q));
  });

  const roleColors: Record<string, string> = { super_admin: 'default', salon_manager: 'secondary', groomer: 'outline', front_desk: 'outline' };
  const fmtDate = (s: string) => s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  const shifts = scheduleData?.shifts ?? [];
  const clockEntries = scheduleData?.clockEntries ?? [];

  return (
    <div className="flex flex-col w-full h-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold tracking-tight text-foreground">Staff & Groomers</h1><p className="text-[13px] text-muted-foreground mt-1">Manage team roles, specialties, and scheduling access.</p></div>
        <Badge variant="secondary" className="gap-1.5"><Users className="size-3" />{staff.length} members</Badge>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{label:'Total Staff',value:staff.length},{label:'Active',value:staff.filter(s=>s.is_active).length},{label:'Groomers',value:staff.filter(s=>s.is_groomer).length},{label:'On Website',value:staff.filter(s=>s.show_on_website).length}].map(c => (
          <Card key={c.label}><CardContent className="pt-4 pb-4"><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{c.label}</p><p className="text-xl font-bold mt-1">{c.value}</p></CardContent></Card>
        ))}
      </div>
      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" /><Input placeholder="Search by name, email, role, or specialty…" value={search} onChange={e=>setSearch(e.target.value)} className="pl-9" /></div>
      <Card><CardContent className="p-0">
        {isLoading ? <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" /><span className="text-sm">Loading staff…</span></div>
        : isError ? <div className="flex items-center justify-center py-16 gap-2 text-destructive"><AlertCircle className="size-4" /><span className="text-sm">Error: {(error as Error).message}</span></div>
        : filtered.length === 0 ? <div className="flex items-center justify-center py-16 text-muted-foreground"><span className="text-sm">No staff found.</span></div>
        : <div className="max-h-96 overflow-y-auto"><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Role</TableHead><TableHead>Contact</TableHead><TableHead>Specialties</TableHead><TableHead>Certs</TableHead><TableHead>Location</TableHead><TableHead>Hired</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>
          {filtered.map((s: any) => (
            <TableRow key={s.id}>
              <TableCell><div className="flex items-center gap-2">{s.image_url ? <img src={s.image_url} alt={s.display_name} className="size-8 rounded-full object-cover" /> : <div className="size-8 rounded-full bg-muted flex items-center justify-center text-[11px] font-bold text-muted-foreground">{s.display_name?.[0]?.toUpperCase() || '?'}</div>}<div><p className="font-medium text-[13px]">{s.display_name}</p>{s.bio && <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{s.bio}</p>}</div></div></TableCell>
              <TableCell><Badge variant={roleColors[s.role] || 'outline'}>{s.role.replace(/_/g, ' ')}</Badge>{s.is_groomer && <Badge variant="secondary" className="ml-1 text-[9px]">Groomer</Badge>}</TableCell>
              <TableCell><p className="text-[12px]">{s.email || '—'}</p><p className="text-[11px] text-muted-foreground">{s.phone || ''}</p></TableCell>
              <TableCell><div className="flex flex-wrap gap-1">{(s.service_specialties || []).slice(0, 3).map((sp: string, i: number) => <Badge key={i} variant="outline" className="text-[9px]">{sp}</Badge>)}{(s.service_specialties || []).length > 3 && <span className="text-[10px] text-muted-foreground">+{(s.service_specialties || []).length - 3}</span>}</div></TableCell>
              <TableCell><div className="flex flex-wrap gap-1">{(s.certifications || []).slice(0, 2).map((c: string, i: number) => <Badge key={i} variant="secondary" className="text-[9px] gap-1"><Award className="size-2" />{c}</Badge>)}{(s.certifications || []).length > 2 && <span className="text-[10px] text-muted-foreground">+{(s.certifications || []).length - 2}</span>}</div></TableCell>
              <TableCell className="text-[12px] text-muted-foreground">{s.location_name || '—'}</TableCell>
              <TableCell className="text-[12px] text-muted-foreground">{fmtDate(s.hire_date)}</TableCell>
              <TableCell><Badge variant={s.is_active ? 'default' : 'outline'}>{s.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody></Table></div>}
      </CardContent></Card>
      {(shifts.length > 0 || clockEntries.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {shifts.length > 0 && (
            <Card><CardContent className="p-0"><div className="p-3 border-b border-border"><h3 className="text-[13px] font-semibold flex items-center gap-2"><CalendarDays className="size-4" /> Recent Shifts</h3></div><div className="max-h-48 overflow-y-auto"><Table><TableBody>{shifts.slice(0, 8).map((sh: any) => (<TableRow key={sh.id}><TableCell className="text-[12px]">{sh.staff_name}</TableCell><TableCell className="text-[12px] text-muted-foreground">{new Date(sh.shift_date).toLocaleDateString('en-US', {month:'short',day:'numeric'})}</TableCell><TableCell className="text-[12px]">{new Date(sh.starts_at).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}—{new Date(sh.ends_at).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}</TableCell><TableCell><Badge variant="outline" className="text-[9px]">{sh.status}</Badge></TableCell></TableRow>))}</TableBody></Table></div></CardContent></Card>
          )}
          {clockEntries.length > 0 && (
            <Card><CardContent className="p-0"><div className="p-3 border-b border-border"><h3 className="text-[13px] font-semibold flex items-center gap-2"><Clock className="size-4" /> Recent Clock Entries</h3></div><div className="max-h-48 overflow-y-auto"><Table><TableBody>{clockEntries.slice(0, 8).map((ce: any) => (<TableRow key={ce.id}><TableCell className="text-[12px]">{ce.staff_name}</TableCell><TableCell className="text-[12px] text-muted-foreground">{new Date(ce.clock_in).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</TableCell><TableCell className="text-[12px]">{ce.clock_out ? new Date(ce.clock_out).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}) : 'Active'}</TableCell></TableRow>))}</TableBody></Table></div></CardContent></Card>
          )}
        </div>
      )}
    </div>
  );
}
