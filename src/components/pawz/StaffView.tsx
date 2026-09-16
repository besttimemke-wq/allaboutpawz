'use client';

import React, { useState } from 'react';
import { StaffScheduleItem } from '@/lib/types';
import { Clock, DollarSign, Phone, Plus, Search, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StaffViewProps {
  staffList: StaffScheduleItem[];
}

type RoleFilter = 'all' | 'Groomer' | 'Front Desk' | 'Manager';

const ROLE_OPTIONS: { value: RoleFilter; label: string }[] = [
  { value: 'all', label: 'All Roles' },
  { value: 'Groomer', label: 'Groomers' },
  { value: 'Front Desk', label: 'Front Desk' },
  { value: 'Manager', label: 'Managers' },
];

export const StaffView: React.FC<StaffViewProps> = ({ staffList }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');

  const filteredStaff = staffList.filter((staff) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || staff.name.toLowerCase().includes(q) || (staff.role || '').toLowerCase().includes(q);
    const matchesRole = roleFilter === 'all' || (staff.role || '').toLowerCase().includes(roleFilter.toLowerCase());
    return matchesSearch && matchesRole;
  });

  const totalAppointments = staffList.reduce((sum, s) => sum + s.appointmentsCount, 0);
  const groomerCount = staffList.filter((s) => (s.role || '').toLowerCase().includes('groomer')).length;

  return (
    <div className="flex flex-col w-full bg-background text-foreground min-h-full">
      {/* STATUS STRIP */}
      <div className="w-full bg-muted/60 border-b border-border px-4 py-2 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-success animate-pulse shrink-0"></span>
          <span className="font-medium text-[11px] text-muted-foreground">Staff & Groomer Management</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="font-medium">
            Team: <span className="text-foreground font-semibold">{staffList.length}</span>
          </span>
          <span className="font-medium">
            Groomers: <span className="text-foreground font-semibold">{groomerCount}</span>
          </span>
          <span className="font-medium">
            Today&apos;s Appts: <span className="text-primary font-semibold">{totalAppointments}</span>
          </span>
        </div>
      </div>

      {/* PAGE HEADER */}
      <div className="p-6 border-b border-border bg-background flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              Staff &amp; Groomer Management
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground border border-border">
              {staffList.length} Members
            </span>
          </div>
          <p className="text-[13px] text-muted-foreground mt-1 max-w-2xl leading-relaxed">
            Shift capacity, appointment distribution, commission tiers, and contact information for your team.
          </p>
        </div>
        <button
          className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3.5 text-[13px] font-medium shadow-card transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Plus className="size-4" />
          Add Team Member
        </button>
      </div>

      {/* CONTENT */}
      <div className="p-6 space-y-6">
        {/* FILTERS ROW */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-border rounded-xl shadow-card p-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12px] font-semibold text-muted-foreground flex items-center gap-1.5 mr-1">
              <Search className="size-3.5" />
              Search:
            </span>
            <div className="relative">
              <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or role..."
                className="bg-background border border-input rounded-md pl-8 pr-3 h-8 text-[12px] text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring transition-colors w-64 max-w-full"
              />
            </div>
            <div className="relative inline-flex">
              <select
                aria-label="Filter by role"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
                className="appearance-none bg-background border border-input hover:border-primary/40 rounded-md pl-3 pr-8 h-8 text-[12px] font-medium text-foreground cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <svg
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.06l3.71-3.83a.75.75 0 1 1 1.08 1.04l-4.25 4.39a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
          <span className="text-[12px] font-medium text-muted-foreground">
            {filteredStaff.length} of {staffList.length} members
          </span>
        </div>

        {/* STAFF GRID */}
        {filteredStaff.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Users className="size-6 text-muted-foreground" />
            </div>
            <p className="text-[14px] font-medium text-foreground">No team members found</p>
            <p className="text-[12px] text-muted-foreground mt-1">
              Try adjusting your search or role filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in-up">
            {filteredStaff.map((staff) => {
              const bookedCount = staff.slots.filter((s) => s === 'booked').length;
              const totalCount = staff.slots.length;
              const utilization = totalCount > 0 ? Math.round((bookedCount / totalCount) * 100) : 0;
              return (
                <div
                  key={staff.id}
                  className="bg-card border border-border rounded-xl shadow-card p-5 space-y-4 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-card-md hover:border-primary/30"
                >
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-semibold text-[11px] shadow-card">
                        {staff.initials}
                      </div>
                      <div>
                        <h3 className="font-display font-semibold text-foreground text-[15px]">{staff.name}</h3>
                        <p className="text-[11px] text-muted-foreground font-medium">{staff.role}</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-primary border border-primary/20 text-[10px] font-semibold">
                      {staff.appointmentsCount} Appts
                    </span>
                  </div>

                  <div className="border border-border rounded-md p-3 space-y-2 text-[12px] bg-muted/30">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="size-3.5" /> Shift
                      </span>
                      <span className="font-medium text-foreground tabular-nums">9:00 AM – 5:00 PM</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <DollarSign className="size-3.5" /> Commission
                      </span>
                      <span className="font-semibold text-foreground tabular-nums">{staff.commissionRate || 50}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Phone className="size-3.5" /> Phone
                      </span>
                      <span className="font-medium text-foreground tabular-nums">{staff.phone}</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Today&apos;s Capacity
                      </p>
                      <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">
                        {utilization}% booked
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {staff.slots.map((s, idx) => (
                        <span
                          key={idx}
                          title={`Slot ${idx + 1}: ${s}`}
                          className={cn(
                            'flex-1 h-2.5 rounded-sm transition-colors',
                            s === 'booked'
                              ? 'bg-primary'
                              : s === 'break'
                              ? 'bg-warning/60'
                              : s === 'blocked'
                              ? 'bg-muted-foreground/40'
                              : 'bg-muted',
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
