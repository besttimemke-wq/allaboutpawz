'use client';

import React, { useState, useEffect } from 'react';
import { Clock, DollarSign, Plus, Search, Tag, Scissors } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ServicesView: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/crm/services?limit=200')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.services) setServices(data.services); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const categories = ['all', ...Array.from(new Set(services.map((s) => s.category || s.serviceCategory || 'other').filter(Boolean)))];

  const filtered = services.filter((srv) => {
    const matchesCategory = selectedCategory === 'all' || srv.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || srv.name.toLowerCase().includes(q) || srv.description.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  const avgPrice =
    services.length > 0
      ? (services.reduce((sum, s) => sum + (s.defaultPrice || 0), 0) / services.length).toFixed(2)
      : '0.00';
  const avgDuration =
    services.length > 0
      ? Math.round(services.reduce((sum, s) => sum + (s.defaultDurationMinutes || 0), 0) / services.length)
      : 0;

  return (
    <div className="flex flex-col w-full bg-background text-foreground min-h-full">
      {/* STATUS STRIP */}
      <div className="w-full bg-muted/60 border-b border-border px-4 py-2 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-success animate-pulse shrink-0"></span>
          <span className="font-medium text-[11px] text-muted-foreground">Services & Pricing Menu</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="font-medium">
            Catalog: <span className="text-foreground font-semibold">{services.length}</span>
          </span>
          <span className="font-medium">
            Avg Price: <span className="text-primary font-semibold tabular-nums">${avgPrice}</span>
          </span>
          <span className="font-medium">
            Avg Duration: <span className="text-foreground font-semibold tabular-nums">{avgDuration} min</span>
          </span>
        </div>
      </div>

      {/* PAGE HEADER */}
      <div className="p-6 border-b border-border bg-background flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              Services &amp; Pricing Menu
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground border border-border">
              {services.length} Services
            </span>
          </div>
          <p className="text-[13px] text-muted-foreground mt-1 max-w-2xl leading-relaxed">
            Grooming packages, bath options, breed-size pricing tiers, and spa add-ons.
          </p>
        </div>
        <button
          className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3.5 text-[13px] font-medium shadow-card transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Plus className="size-4" />
          Add New Service
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
                placeholder="Search by name or description..."
                className="bg-background border border-input rounded-md pl-8 pr-3 h-8 text-[12px] text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring transition-colors w-64 max-w-full"
              />
            </div>
          </div>
          <span className="text-[12px] font-medium text-muted-foreground">
            {filtered.length} of {services.length} services
          </span>
        </div>

        {/* CATEGORY FILTER PILLS */}
        <div className="flex items-center gap-2 flex-wrap">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-[12px] font-medium border cursor-pointer transition-colors duration-150 capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary shadow-card'
                    : 'bg-background border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:border-primary/30',
                )}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* SERVICES GRID */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Scissors className="size-6 text-muted-foreground" />
            </div>
            <p className="text-[14px] font-medium text-foreground">No services found</p>
            <p className="text-[12px] text-muted-foreground mt-1">
              Try adjusting your search or category filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in-up">
            {filtered.map((srv) => (
              <div
                key={srv.id}
                className="bg-card border border-border rounded-xl shadow-card p-5 flex flex-col justify-between space-y-4 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-card-md hover:border-primary/30"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2 border-b border-border pb-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider text-primary border border-primary/20">
                      <Tag className="size-3" />
                      {srv.category || srv.serviceCategory || 'Service'}
                    </span>
                    <span className="text-xl font-display font-semibold tabular-nums text-foreground">
                      ${(srv.defaultPrice || 0).toFixed(2)}
                    </span>
                  </div>
                  <h3 className="font-display font-semibold text-foreground text-[15px] tracking-tight">{srv.name}</h3>
                  <p className="text-[12px] text-muted-foreground leading-relaxed">{srv.description}</p>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between text-[12px]">
                  <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
                    <Clock className="size-3.5" />
                    <span className="tabular-nums">{srv.defaultDurationMinutes || 0} min</span>
                  </span>
                  <button className="inline-flex items-center gap-1 px-2.5 h-7 rounded-md border border-border bg-background hover:bg-accent hover:text-accent-foreground text-foreground text-[11px] font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <DollarSign className="size-3.5" />
                    Edit Pricing
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
