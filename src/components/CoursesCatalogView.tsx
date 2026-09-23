'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Search,
  BookOpen,
  Award,
  Clock,
  ArrowRight,
  PawPrint,
  SlidersHorizontal,
  X,
  Shield,
  Layers,
  
  GraduationCap,
} from 'lucide-react';
import { COURSES_PROGRAMS, ProgramDetails } from '@/lib/courses-data';
import { ALL_CATALOG_MODULES, CatalogModule } from '@/lib/catalog-modules';

// Track code mapping to program id (15 pathways from the Leashed Course Catalog)
const TRACK_CODE_TO_PROGRAM_ID: Record<string, string> = {
  VET: 'vet',
  VTE: 'vte',
  VST: 'vst',
  VPM: 'vpm',
  VTN: 'vtn',
  PVM: 'pvm',
  VPT: 'vpt',
  EQN: 'eqn',
  GRO: 'gro',
  FEL: 'fel',
  ZKA: 'zka',
  PRT: 'prt',
  ABT: 'abt',
  ACA: 'aca',
  GSP: 'gsp',
};

// Pathway category groupings for the filter dropdown
const PATHWAY_CATEGORIES: Record<string, string[]> = {
  veterinary: ['VET', 'VTE', 'VST', 'VTN', 'PVM', 'VPT'], // clinical veterinary tracks
  practice_mgmt: ['VPM', 'GSP'],                          // business/operations tracks
  behavior_training: ['PRT', 'ABT'],                      // training & behavior
  grooming: ['GRO', 'FEL'],                               // grooming tracks
  animal_care: ['ACA', 'ZKA', 'EQN'],                     // entry-level & specialty animal care
};

export function CoursesCatalogView() {
  const [selectedPathway, setSelectedPathway] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedDuration, setSelectedDuration] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('featured');
  const [viewMode, setViewMode] = useState<'programs' | 'modules'>('programs');
  const [activeCourseModal, setActiveCourseModal] = useState<ProgramDetails | null>(null);


  // 1. Filtered Modules from ALL_CATALOG_MODULES
  const filteredModules = useMemo(() => {
    return ALL_CATALOG_MODULES.filter((m) => {
      // Pathway filter (modules view)
      if (selectedPathway !== 'all') {
        const allowed = PATHWAY_CATEGORIES[selectedPathway];
        if (allowed && !allowed.includes(m.trackCode)) return false;
      }

      // Course Level filter
      if (selectedLevel !== 'all') {
        if (m.level !== selectedLevel) return false;
      }

      // Search Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesCode = m.code.toLowerCase().includes(q);
        const matchesTitle = m.title.toLowerCase().includes(q);
        const matchesDesc = m.description.toLowerCase().includes(q);
        const matchesTrack = m.trackTitle.toLowerCase().includes(q) || m.trackCode.toLowerCase().includes(q);
        const matchesCategory = m.category.toLowerCase().includes(q);
        const matchesSafety = (q.includes('safety') || q.includes('gate')) && !!m.safetyGate;
        const matchesPracticum = q.includes('practicum') && !!m.practicum;

        if (!matchesCode && !matchesTitle && !matchesDesc && !matchesTrack && !matchesCategory && !matchesSafety && !matchesPracticum) {
          return false;
        }
      }

      return true;
    });
  }, [selectedPathway, selectedLevel, searchQuery]);

  // 2. Map of matching modules grouped by program id for rich search previews
  const programMatchingModulesMap = useMemo(() => {
    const map: Record<string, CatalogModule[]> = {};
    if (!searchQuery.trim() && selectedLevel === 'all') return map;

    for (const m of filteredModules) {
      const progId = TRACK_CODE_TO_PROGRAM_ID[m.trackCode];
      if (progId) {
        if (!map[progId]) map[progId] = [];
        map[progId].push(m);
      }
    }
    return map;
  }, [filteredModules, searchQuery, selectedLevel]);

  // 3. Filtered & Sorted Programs
  const filteredPrograms = useMemo(() => {
    const list = COURSES_PROGRAMS.filter((p) => {
      // Pathway filter (programs view)
      if (selectedPathway !== 'all') {
        const allowed = PATHWAY_CATEGORIES[selectedPathway]?.map((c) => c.toLowerCase());
        if (allowed && !allowed.includes(p.id)) return false;
      }

      // Duration filter
      if (selectedDuration === 'short' && p.totalWeeks > 16) return false;
      if (selectedDuration === 'long' && p.totalWeeks <= 16) return false;

      // Course Level filter
      if (selectedLevel !== 'all') {
        const hasLevelModule = ALL_CATALOG_MODULES.some(
          (m) => TRACK_CODE_TO_PROGRAM_ID[m.trackCode] === p.id && m.level === selectedLevel
        );
        if (!hasLevelModule) return false;
      }

      // Search Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = p.title.toLowerCase().includes(q);
        const matchesCode = p.code.toLowerCase().includes(q);
        const matchesSubtitle = p.subtitle.toLowerCase().includes(q);
        const matchesOverview = p.overviewParagraphs.some((para) => para.toLowerCase().includes(q));
        const matchesHighlights = p.terms.some((t) =>
          t.courseHighlights.some(
            (ch) =>
              ch.code.toLowerCase().includes(q) ||
              ch.title.toLowerCase().includes(q) ||
              ch.description.toLowerCase().includes(q)
          )
        );
        const hasMatchedModules = (programMatchingModulesMap[p.id]?.length ?? 0) > 0;
        const matchesSafetyQuery = (q.includes('safety') || q.includes('gate')) && p.terms.some((t) =>
          t.courseHighlights.some((ch) => ch.title.toLowerCase().includes('safety gate'))
        );

        if (
          !matchesTitle &&
          !matchesCode &&
          !matchesSubtitle &&
          !matchesOverview &&
          !matchesHighlights &&
          !hasMatchedModules &&
          !matchesSafetyQuery
        ) {
          return false;
        }
      }

      return true;
    });

    // Sorting
    return [...list].sort((a, b) => {
      if (sortBy === 'hours') return b.totalClockHours - a.totalClockHours;
      if (sortBy === 'weeks') return b.totalWeeks - a.totalWeeks;
      if (sortBy === 'name') return a.title.localeCompare(b.title);
      return 0; // 'featured' keeps original curriculum order
    });
  }, [selectedPathway, selectedDuration, selectedLevel, searchQuery, sortBy, programMatchingModulesMap]);

  const hasActiveFilters =
    selectedPathway !== 'all' ||
    selectedLevel !== 'all' ||
    selectedDuration !== 'all' ||
    searchQuery.trim() !== '';

  const handleResetFilters = () => {
    setSelectedPathway('all');
    setSelectedLevel('all');
    setSelectedDuration('all');
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen flex flex-col bg-cream text-ink">
      {/* Hero Header Banner — split grid: marble/cream left, image right */}
      <section className="grid grid-cols-1 lg:grid-cols-[1fr_1.25fr]">
        <div className="marble flex flex-col justify-center bg-cream px-8 py-16 lg:px-12">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-gold-deep" strokeWidth={1.5} />
            <p className="eyebrow">ACADEMY CURRICULUM &amp; SYLLABUS</p>
          </div>

          <h1 className="mt-3 font-display text-[34px] leading-[1.15] text-ink">
            View All Academy Courses
          </h1>
          <p className="mt-4 max-w-[460px] text-[13px] leading-[1.8] text-ink-soft">
            Explore our 15 career pathways and 147 courses. Search by module code, skill, or credential to find your path.
          </p>

          {/* Quick Route Shortcut to Enroll */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/learn/enroll" className="btn-gold">
              GET STARTED / ENROLL NOW
            </Link>
            <Link href="/learn/classroom" className="btn-ghost">
              INTERACTIVE AI CLASSROOM
            </Link>
          </div>

          {/* 3 Pillars */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-gold/25 pt-6">
            <div>
              <div className="flex items-center gap-2 text-gold-deep mb-1">
                <Award className="w-4 h-4" strokeWidth={1.5} />
                <span className="text-[0.7rem] uppercase tracking-wider font-semibold text-ink-soft">15 Pathways</span>
              </div>
              <p className="text-[0.75rem] text-ink-soft leading-relaxed">
                Grooming, training, veterinary, behavior, practice management.
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 text-gold-deep mb-1">
                <Clock className="w-4 h-4" strokeWidth={1.5} />
                <span className="text-[0.7rem] uppercase tracking-wider font-semibold text-ink-soft">Flexible Formats</span>
              </div>
              <p className="text-[0.75rem] text-ink-soft leading-relaxed">
                2 to 104 weeks with term-based and hands-on tracks.
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 text-gold-deep mb-1">
                <BookOpen className="w-4 h-4" strokeWidth={1.5} />
                <span className="text-[0.7rem] uppercase tracking-wider font-semibold text-ink-soft">Hands-on Practice</span>
              </div>
              <p className="text-[0.75rem] text-ink-soft leading-relaxed">
                Key skills checks, real animals, and portfolios.
              </p>
            </div>
          </div>
        </div>

        {/* Right Photo Column — bright, no dark overlay */}
        <div className="relative min-h-[300px]">
          <img
            src="/images/pets_caregiver.jpg"
            alt="LEASHED Academy Students"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      </section>

      {/* Main Catalog View: full-width to align with hero edges */}
      <main className="flex-1 w-full px-0 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
          {/* Left Sidebar Filters */}
          <aside className="lg:col-span-4 xl:col-span-3 space-y-6 px-8 lg:px-12">
            <div className="bg-cream rounded-2xl p-6 border border-gold/25 shadow-sm sticky top-24">
              {/* Academy Nav Header */}
              <div className="flex items-center justify-between pb-4 border-b border-gold/25">
                <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-ink uppercase">
                  <BookOpen className="w-4 h-4 text-gold-deep" />
                  <span>CURRICULUM TRACKS</span>
                </div>
                {hasActiveFilters && (
                  <button
                    onClick={handleResetFilters}
                    className="text-[0.7rem] font-bold text-[#b56548] hover:underline"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Direct Pathway Quick Links to Syllabus Pages */}
              <div className="py-4 border-b border-gold/25 space-y-1 text-xs">
                {COURSES_PROGRAMS.map((prog) => (
                  <Link
                    key={prog.id}
                    href={`/learn/courses/${prog.slug}`}
                    className="flex items-center justify-between py-1.5 px-2 rounded-lg text-ink-soft hover:bg-cream-deep hover:text-ink font-medium transition-colors"
                  >
                    <span className="truncate">{prog.title}</span>
                    <span className="font-mono text-[0.68rem] text-[#5a6b5f] bg-cream-deep px-1.5 py-0.5 rounded">
                      {prog.code}
                    </span>
                  </Link>
                ))}
              </div>

              {/* Filter Controls */}
              <div className="pt-4 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-2">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-gold-deep" />
                  <span>Filter Catalog</span>
                </h3>

                {/* Search Input with Clear Button */}
                <div>
                  <label className="block text-[0.72rem] font-bold text-ink-soft uppercase mb-1">
                    Search Course or Skill
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="e.g. VET-101, anatomy, surgical nursing, lion cut..."
                      className="w-full bg-cream border border-gold/30 rounded-lg pl-3 pr-8 py-2 text-xs text-ink focus:outline-none focus:border-gold-deep"
                    />
                    {searchQuery ? (
                      <button
                        onClick={() => setSearchQuery('')}
                        aria-label="Clear search"
                        className="absolute right-2.5 top-2.5 text-[#5a6b5f] hover:text-ink"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-[#5a6b5f]" />
                    )}
                  </div>
                </div>

                {/* Pathway Dropdown */}
                <div>
                  <label className="block text-[0.72rem] font-bold text-ink-soft uppercase mb-1">
                    Pathway
                  </label>
                  <select
                    value={selectedPathway}
                    onChange={(e) => setSelectedPathway(e.target.value)}
                    className="w-full bg-cream border border-gold/30 rounded-lg px-3 py-2 text-xs text-ink font-medium focus:outline-none focus:border-gold-deep"
                  >
                    <option value="all">All Pathways</option>
                    <option value="veterinary">Veterinary Clinical (VET, VTE, VST, VTN, PVM, VPT)</option>
                    <option value="practice_mgmt">Practice Management (VPM, GSP)</option>
                    <option value="behavior_training">Training &amp; Behavior (PRT, ABT)</option>
                    <option value="grooming">Grooming (GRO, FEL)</option>
                    <option value="animal_care">Animal Care (ACA, ZKA, EQN)</option>
                  </select>
                </div>

                {/* Course Level Dropdown */}
                <div>
                  <label className="block text-[0.72rem] font-bold text-ink-soft uppercase mb-1">
                    Course Level
                  </label>
                  <select
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(e.target.value)}
                    className="w-full bg-cream border border-gold/30 rounded-lg px-3 py-2 text-xs text-ink font-medium focus:outline-none focus:border-gold-deep"
                  >
                    <option value="all">All Levels (100–400)</option>
                    <option value="100">100 Level – Foundation &amp; Safety</option>
                    <option value="200">200 Level – Core Skills</option>
                    <option value="300">300 Level – Advanced Skills</option>
                    <option value="400">400 Level – Hands-on Practice &amp; Capstone</option>
                  </select>
                </div>

                {/* Duration Filter */}
                <div>
                  <label className="block text-[0.72rem] font-bold text-ink-soft uppercase mb-1">
                    Duration
                  </label>
                  <select
                    value={selectedDuration}
                    onChange={(e) => setSelectedDuration(e.target.value)}
                    className="w-full bg-cream border border-gold/30 rounded-lg px-3 py-2 text-xs text-ink font-medium focus:outline-none focus:border-gold-deep"
                  >
                    <option value="all">All Durations</option>
                    <option value="short">Short Courses (≤ 16 Weeks)</option>
                    <option value="long">Comprehensive Programs (&gt; 16 Weeks)</option>
                  </select>
                </div>

                {/* Suggested Quick Search Chips */}
                <div className="pt-2">
                  <div className="text-[0.68rem] font-bold uppercase tracking-wider text-[#5a6b5f] mb-1.5">
                    Popular Inquiries
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {['Anatomy', 'VET-101', 'PRT-104', 'Surgical Nursing', 'Bathing', 'Obedience'].map((term) => (
                      <button
                        key={term}
                        onClick={() => setSearchQuery(term)}
                        className={`text-[0.68rem] px-2 py-0.5 rounded-md border transition-colors ${
                          searchQuery.toLowerCase() === term.toLowerCase()
                            ? 'bg-gold-deep text-on-dark border-gold-deep'
                            : 'bg-cream-deep text-[#5a6b5f] border-[#e4dfd4] hover:bg-gold-light'
                        }`}
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Advisor Callout Card */}
              <div className="mt-6 p-4 rounded-xl bg-ink text-on-dark">
                <div className="w-8 h-8 rounded-full bg-gold-light text-ink flex items-center justify-center mb-2.5">
                  <PawPrint className="w-4 h-4" />
                </div>
                <h4 className="font-display text-sm font-bold mb-1">
                  Need Help Choosing?
                </h4>
                <p className="text-[0.75rem] text-[#e4dfd4] leading-relaxed mb-3">
                  Talk to an admissions advisor to map your background to the best pathway.
                </p>
                <Link
                  href="/learn/enroll"
                  className="block text-center py-1.5 px-3 rounded-lg bg-cream/10 hover:bg-cream/20 text-gold-light text-xs font-bold transition-colors border border-white/15"
                >
                  Start Enrollment &amp; Advising
                </Link>
              </div>
            </div>
          </aside>

          {/* Right Main Catalog Content */}
          <section className="lg:col-span-8 xl:col-span-9 space-y-6 px-8 lg:px-12">
            {/* Top Toolbar: View Switcher + Count + Sort */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-gold/20">
              {/* Tabs: Programs vs Modules */}
              <div className="flex items-center gap-1.5 bg-cream-deep p-1 rounded-xl">
                <button
                  onClick={() => setViewMode('programs')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    viewMode === 'programs'
                      ? 'bg-cream text-ink shadow-sm'
                      : 'text-ink-soft hover:text-ink'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 text-gold-deep" />
                  <span>Programs &amp; Tracks</span>
                  <span className="text-[0.68rem] px-1.5 py-0.2 rounded-full bg-gold-light text-ink">
                    {filteredPrograms.length}
                  </span>
                </button>

                <button
                  onClick={() => setViewMode('modules')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    viewMode === 'modules'
                      ? 'bg-cream text-ink shadow-sm'
                      : 'text-ink-soft hover:text-ink'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-gold-deep" />
                  <span>Course Modules Catalog</span>
                  <span className="text-[0.68rem] px-1.5 py-0.2 rounded-full bg-gold-light text-ink">
                    {filteredModules.length}
                  </span>
                </button>
              </div>

              {/* Sort By Dropdown */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <span className="text-xs text-ink-soft">Sort by</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-cream border border-gold/30 rounded-lg px-2.5 py-1 text-xs text-ink font-medium focus:outline-none"
                >
                  <option value="featured">Featured (Curriculum Order)</option>
                  <option value="hours">Hours (High to Low)</option>
                  <option value="weeks">Duration (Weeks)</option>
                  <option value="name">Title (A-Z)</option>
                </select>
              </div>
            </div>

            {/* Active search summary notice */}
            {searchQuery && (
              <div className="p-3 bg-cream-deep rounded-xl border border-gold/25 flex items-center justify-between text-xs text-ink-soft">
                <div>
                  Showing results for &ldquo;<strong>{searchQuery}</strong>&rdquo; across{' '}
                  <strong>{filteredPrograms.length}</strong> programs and{' '}
                  <strong>{filteredModules.length}</strong> course modules.
                </div>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs font-bold text-[#b56548] hover:underline"
                >
                  Clear search
                </button>
              </div>
            )}

            {/* VIEW MODE 1: PROGRAMS & TRACKS */}
            {viewMode === 'programs' && (
              <>
                {filteredPrograms.length === 0 ? (
                  <div className="bg-cream rounded-2xl p-12 text-center border border-gold/25 space-y-4">
                    <div className="w-12 h-12 rounded-full bg-cream-deep text-gold-deep flex items-center justify-center mx-auto">
                      <Search className="w-6 h-6" />
                    </div>
                    <h3 className="font-display text-lg font-bold text-ink">No programs found</h3>
                    <p className="text-xs text-ink-soft max-w-md mx-auto">
                      We couldn&rsquo;t find any programs matching your current search or filter combination.
                    </p>
                    <button
                      onClick={handleResetFilters}
                      className="px-4 py-2 rounded-full bg-gold-deep text-on-dark font-bold text-xs hover:bg-ink transition-colors"
                    >
                      Reset All Filters
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredPrograms.map((program) => {
                      const matchedModules = programMatchingModulesMap[program.id] || [];
                      return (
                        <div
                          key={program.id}
                          className="bg-cream rounded-2xl border border-gold/25 overflow-hidden shadow-xs hover:shadow-md hover:border-gold/25 transition-all flex flex-col justify-between"
                        >
                          <div>
                            {/* Top Image Banner with Badges - Crisp & Bright */}
                            <div className="relative w-full aspect-[16/9] bg-cream-deep overflow-hidden">
                              <Image
                                src={program.heroImage}
                                alt={program.title}
                                fill
                                sizes="(max-width: 768px) 100vw, 50vw"
                                className="object-cover object-center brightness-100 contrast-[1.01] transition-transform duration-500 hover:scale-105"
                                referrerPolicy="no-referrer"
                              />
                            </div>

                            {/* Card Body */}
                            <div className="p-5">
                              <h3 className="font-display text-lg font-bold text-ink leading-snug mb-1.5 line-clamp-1">
                                {program.title}
                              </h3>
                              <p className="text-xs text-ink-soft leading-relaxed mb-4 line-clamp-2">
                                {program.subtitle}
                              </p>

                              {/* 3 Metric Pills */}
                              <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-cream border border-gold/25 text-center mb-4">
                                <div>
                                  <div className="text-[0.68rem] text-ink-soft font-semibold uppercase">Duration</div>
                                  <div className="text-xs font-bold text-ink">{program.totalWeeks} Wks</div>
                                </div>
                                <div className="border-x border-gold/25">
                                  <div className="text-[0.68rem] text-ink-soft font-semibold uppercase">Modules</div>
                                  <div className="text-xs font-bold text-ink">{program.totalModules}</div>
                                </div>
                                <div>
                                  <div className="text-[0.68rem] text-ink-soft font-semibold uppercase">Hours</div>
                                  <div className="text-xs font-bold text-ink">{program.totalClockHours}</div>
                                </div>
                              </div>

                              {/* Matched Modules Indicator (when user searches) */}
                              {matchedModules.length > 0 && searchQuery && (
                                <div className="mb-4 p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/60 text-xs">
                                  <div className="text-[0.68rem] font-bold text-amber-900 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                    
                                    <span>Matched Courses in this Track ({matchedModules.length})</span>
                                  </div>
                                  <div className="space-y-1">
                                    {matchedModules.slice(0, 2).map((m) => (
                                      <div key={m.code} className="flex items-center gap-1.5 text-[0.72rem] text-ink">
                                        <span className="font-mono font-bold text-gold-deep">{m.code}:</span>
                                        <span className="truncate">{m.title}</span>
                                        {m.safetyGate && (
                                          <span className="shrink-0 text-[0.62rem] px-1 rounded bg-gold-deep/10 text-gold-deep font-bold">
                                            Key Skills Check
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                    {matchedModules.length > 2 && (
                                      <button
                                        onClick={() => setViewMode('modules')}
                                        className="text-[0.68rem] font-bold text-gold-deep hover:underline block pt-1"
                                      >
                                        + {matchedModules.length - 2} more matching modules in catalog →
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* 4 Term Breadcrumb Pills */}
                              <div className="space-y-1.5 mb-4">
                                <div className="text-[0.68rem] font-bold uppercase tracking-wider text-ink-soft">
                                  4-Term Integrated Curriculum:
                                </div>
                                <div className="grid grid-cols-2 gap-1.5 text-[0.72rem] text-ink-soft">
                                  {program.terms.map((t) => (
                                    <div
                                      key={t.termNumber}
                                      className="px-2 py-1 rounded-lg bg-cream-deep border border-gold/25 truncate font-medium flex items-center gap-1"
                                    >
                                      <span className="font-bold text-gold-deep">T{t.termNumber}:</span>
                                      <span className="truncate">{t.name}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Card Actions Footer */}
                          <div className="p-5 pt-0 flex items-center justify-between gap-3 border-t border-gold/25 mt-2">
                            {/* Basic Info Quick Modal Button */}
                            <button
                              onClick={() => setActiveCourseModal(program)}
                              className="text-xs font-semibold text-ink-soft hover:text-ink underline underline-offset-2"
                            >
                              Quick Overview
                            </button>

                            {/* See More Button Routing to Dedicated Course Page & Syllabus */}
                            <Link
                              href={`/learn/courses/${program.slug}`}
                              className="btn-gold"
                            >
                              <span>Full Syllabus &amp; Schedule</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* VIEW MODE 2: COURSE MODULES CATALOG (ALL 147 MODULES) */}
            {viewMode === 'modules' && (
              <div className="space-y-4">
                <div className="bg-cream rounded-2xl p-5 border border-gold/25 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gold/25">
                    <div>
                      <h2 className="font-display text-lg font-bold text-ink">
                        Academic Course Modules Catalog
                      </h2>
                      <p className="text-xs text-[#5a6b5f]">
                        Showing {filteredModules.length} courses
                      </p>
                    </div>
                    {hasActiveFilters && (
                      <button
                        onClick={handleResetFilters}
                        className="text-xs font-bold text-[#b56548] hover:underline self-start sm:self-auto"
                      >
                        Reset All Filters
                      </button>
                    )}
                  </div>

                  {filteredModules.length === 0 ? (
                    <div className="py-12 text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-cream-deep text-gold-deep flex items-center justify-center mx-auto">
                        <Search className="w-6 h-6" />
                      </div>
                      <h3 className="font-display text-base font-bold text-ink">No matching course modules found</h3>
                      <p className="text-xs text-ink-soft max-w-md mx-auto">
                        Try clearing or modifying your search terms to explore modules across all 6 pathways.
                      </p>
                      <button
                        onClick={handleResetFilters}
                        className="px-4 py-2 rounded-full bg-gold-deep text-on-dark font-bold text-xs hover:bg-ink transition-colors"
                      >
                        Clear Filters
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-gold/25 mt-2">
                      {filteredModules.map((m) => (
                        <div
                          key={m.code}
                          className="py-4 hover:bg-[#faf6ee] px-3 -mx-3 rounded-xl transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                        >
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-gold-light text-ink">
                                {m.code}
                              </span>
                              <span className="text-[0.68rem] font-bold uppercase tracking-wider text-gold-deep bg-[#faf6ee] px-2 py-0.5 rounded">
                                {m.trackTitle}
                              </span>
                              <span className="text-[0.68rem] text-[#5a6b5f] bg-cream-deep px-2 py-0.5 rounded">
                                Term {m.term} • Level {m.level}
                              </span>
                              {m.safetyGate && (
                                <span className="inline-flex items-center gap-1 text-[0.68rem] font-bold px-2 py-0.5 rounded bg-[#b56548] text-on-dark">
                                  <Shield className="w-3 h-3" />
                                  <span>Key Skills Check</span>
                                </span>
                              )}
                              {m.practicum && (
                                <span className="inline-flex items-center gap-1 text-[0.68rem] font-bold px-2 py-0.5 rounded bg-ink text-on-dark">
                                  <span>Hands-on Practice</span>
                                </span>
                              )}
                            </div>

                            <h3 className="font-display text-base font-bold text-ink">
                              {m.title}
                            </h3>

                            <p className="text-xs text-[#5a6b5f] leading-relaxed">
                              {m.description}
                            </p>
                          </div>

                          <div className="sm:text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between gap-2">
                            <div className="text-xs font-bold text-ink bg-cream-deep sm:bg-transparent px-2.5 py-1 sm:p-0 rounded-md">
                              {m.hours} Hours
                            </div>
                            <Link
                              href={`/learn/courses/${m.slug}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-gold-deep hover:bg-ink text-on-dark font-bold text-[0.72rem] transition-colors"
                            >
                              <span>View Track &amp; Syllabus</span>
                              <ArrowRight className="w-3 h-3" />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bottom Promo Banner */}
            <div className="mt-12 rounded-2xl bg-ink text-on-dark p-8 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
              <div className="max-w-xl z-10">
                <span className="text-[0.7rem] uppercase tracking-widest text-gold font-bold block mb-1">
                  CAREER OPPORTUNITY
                </span>
                <h3 className="font-display text-2xl font-bold mb-2">
                  More Than a School — It’s a Future in Pet Care.
                </h3>
                <p className="text-xs text-[#e4dfd4] leading-relaxed">
                  Build your hands-on skills, earn your credentials, and launch or advance the pet care business you want.
                </p>
              </div>

              <div className="z-10 shrink-0 flex flex-wrap gap-3">
                <Link
                  href="/learn/enroll"
                  className="px-6 py-3 rounded-full bg-gold-light hover:bg-[#c9a96e] text-ink font-bold text-xs transition-colors shadow-sm inline-flex items-center gap-2"
                >
                  <span>Get Started / Enroll</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Quick Info Modal */}
      {activeCourseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-cream rounded-2xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-[#c9a96e] relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setActiveCourseModal(null)}
              aria-label="Close dialog"
              className="absolute top-4 right-4 text-[#5a6b5f] hover:text-ink text-xl font-bold w-8 h-8 rounded-full bg-cream-deep flex items-center justify-center"
            >
              ×
            </button>

            <span className="text-[0.7rem] font-bold text-gold-deep uppercase tracking-widest block mb-1">
              {activeCourseModal.code} • {activeCourseModal.credential}
            </span>
            <h3 className="font-display text-2xl font-bold text-ink mb-2">
              {activeCourseModal.title}
            </h3>
            <p className="text-xs text-[#5a6b5f] leading-relaxed mb-6">
              {activeCourseModal.subtitle}
            </p>

            <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-cream border border-gold/25 text-center mb-6">
              <div>
                <div className="text-[0.68rem] text-[#5a6b5f] uppercase font-bold">Total Duration</div>
                <div className="text-sm font-bold text-ink">{activeCourseModal.totalWeeksFormatted}</div>
              </div>
              <div className="border-x border-gold/25">
                <div className="text-[0.68rem] text-[#5a6b5f] uppercase font-bold">Modules</div>
                <div className="text-sm font-bold text-ink">{activeCourseModal.totalModules}</div>
              </div>
              <div>
                <div className="text-[0.68rem] text-[#5a6b5f] uppercase font-bold">Instruction</div>
                <div className="text-sm font-bold text-ink">{activeCourseModal.totalClockHours} Hours</div>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <h4 className="font-display text-sm font-bold text-ink">
                4-Term Progression Outline:
              </h4>
              {activeCourseModal.terms.map((t) => (
                <div key={t.termNumber} className="p-2.5 rounded-lg bg-[#faf6ee] border border-gold/25 text-xs">
                  <div className="font-bold text-ink flex items-center justify-between">
                    <span>Term {t.termNumber}: {t.name}</span>
                    <span className="text-[#5a6b5f] font-normal">{t.clockHours} hrs • {t.durationWeeks}</span>
                  </div>
                  <p className="text-[0.72rem] text-ink-soft mt-0.5">{t.description}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#faf6ee]">
              <Link
                href="/learn/enroll"
                onClick={() => setActiveCourseModal(null)}
                className="px-4 py-2 rounded-full bg-gold-light text-ink font-bold text-xs hover:bg-[#c9a96e] transition-colors"
              >
                Enroll Now
              </Link>

              <Link
                href={`/learn/courses/${activeCourseModal.slug}`}
                className="px-5 py-2 rounded-full bg-gold-deep hover:bg-ink text-on-dark font-bold text-xs transition-colors flex items-center gap-1.5"
              >
                <span>Full Syllabus &amp; Catalog</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
