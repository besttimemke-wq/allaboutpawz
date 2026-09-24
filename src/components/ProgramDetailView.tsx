'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  BookOpen,
  Award,
  ArrowRight,
  CheckCircle2,
  Check,
  ChevronDown,
  Shield,
  AlertTriangle,
  GraduationCap,
  Users,
  Building,
  HelpCircle,
  Briefcase,
} from 'lucide-react';
import { DynamicIcon } from '@/components/DynamicIcon';
import { ProgramDetails } from '@/lib/courses-data';
import { ALL_PROGRAM_SYLLABI, ProgramInstitutionalData } from '@/lib/syllabi-data';
import { ALL_CATALOG_MODULES, CatalogModule } from '@/lib/catalog-modules';
import type { CourseRecord } from '@/lib/types';

interface ProgramDetailViewProps {
  program: ProgramDetails;
  dbCourse?: CourseRecord | null;
}

export function ProgramDetailView({ program, dbCourse }: ProgramDetailViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'curriculum' | 'outcomes' | 'requirements' | 'faq'>('overview');
  const [curriculumViewMode, setCurriculumViewMode] = useState<'terms' | 'weekly' | 'catalog'>('terms');
  const [openTermIndex, setOpenTermIndex] = useState<number | null>(0);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // The real DB course id (from lms.courses via /api/courses?catalog=true).
  // Used to construct the live-classroom deep link so the learner can launch
  // the AI Professor directly from the pathway detail page.
  const liveCourseId = dbCourse?.id ?? null;

  // Retrieve matching program syllabus
  const syllabus: ProgramInstitutionalData | undefined =
    ALL_PROGRAM_SYLLABI[program.code.toUpperCase()] || ALL_PROGRAM_SYLLABI[program.id.toLowerCase()];

  // Retrieve track-specific catalog modules
  const programCatalogModules = React.useMemo(() => {
    return ALL_CATALOG_MODULES.filter((m) => m.trackCode === program.code.toUpperCase());
  }, [program.code]);

  // SVG Donut Calculations
  const donutTotal = program.donutData.technical + program.donutData.businessPersonal + program.donutData.applied;
  const techRatio = program.donutData.technical / (donutTotal || 1);
  const bizRatio = program.donutData.businessPersonal / (donutTotal || 1);
  const appRatio = program.donutData.applied / (donutTotal || 1);

  const circ = 238.76;
  const strokeTech = techRatio * circ;
  const strokeBiz = bizRatio * circ;
  const strokeApp = appRatio * circ;

  return (
    <div className="min-h-screen flex flex-col bg-cream text-ink">
      {/* Hero Header Banner — split grid: marble cream left, photo right */}
      <section className="grid grid-cols-1 lg:grid-cols-[1fr_1.25fr]">
        {/* Left Content Column — marble on cream */}
        <div className="marble bg-cream px-6 sm:px-10 lg:px-14 py-10 lg:py-14 flex flex-col justify-center">
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-ink leading-[1.12]">
            {program.fullTitle}
          </h1>

          <p className="text-ink-soft text-sm sm:text-base leading-relaxed max-w-2xl font-normal mt-4">
            {program.subtitle}
          </p>

          {/* 4 Hero Key Metrics Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-gold/25">
            <div className="p-3 rounded-xl bg-cream-deep border border-gold/25">
              <div className="flex items-center gap-2 text-gold mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-[0.7rem] uppercase tracking-wider font-semibold text-ink-soft">Duration</span>
              </div>
              <div className="text-sm font-bold text-ink">{program.stats.weeks}</div>
              <div className="text-[0.7rem] text-ink-soft mt-0.5">{program.partTimeWeeksFormatted}</div>
            </div>

            <div className="p-3 rounded-xl bg-cream-deep border border-gold/25">
              <div className="flex items-center gap-2 text-gold mb-1">
                <BookOpen className="w-4 h-4" />
                <span className="text-[0.7rem] uppercase tracking-wider font-semibold text-ink-soft">Modules</span>
              </div>
              <div className="text-sm font-bold text-ink">{program.stats.modules}</div>
              <div className="text-[0.7rem] text-ink-soft mt-0.5">Accredited Units</div>
            </div>

            <div className="p-3 rounded-xl bg-cream-deep border border-gold/25">
              <div className="flex items-center gap-2 text-gold mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-[0.7rem] uppercase tracking-wider font-semibold text-ink-soft">Hours</span>
              </div>
              <div className="text-sm font-bold text-ink">{program.stats.hours}</div>
              <div className="text-[0.7rem] text-ink-soft mt-0.5">Hands-on Hours</div>
            </div>

            <div className="p-3 rounded-xl bg-cream-deep border border-gold/25">
              <div className="flex items-center gap-2 text-gold mb-1">
                <Award className="w-4 h-4" />
                <span className="text-[0.7rem] uppercase tracking-wider font-semibold text-ink-soft">Award</span>
              </div>
              <div className="text-xs font-bold text-ink leading-tight">{program.credential}</div>
              <div className="text-[0.7rem] text-ink-soft mt-0.5">Credential</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-6">
            <Link
              href="/learn/enroll"
              className="btn-gold"
            >
              <span>Enroll in this Pathway</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            {liveCourseId !== null && (
              <Link
                href={`/learn?course=${liveCourseId}`}
                className="btn-gold-outline"
              >
                <span>Launch Live Classroom</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
          {dbCourse && (
            <p className="text-[0.7rem] text-ink-soft mt-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              Backed by live course record #{dbCourse.id} in the All About Pawz database
              {dbCourse.companion?.sections?.length
                ? ` · ${dbCourse.companion.sections.length} lessons authored`
                : ''}
            </p>
          )}
        </div>

        {/* Right Photo Column */}
        <div className="relative bg-cream-deep overflow-hidden">
          <img
            src={program.heroImage}
            alt={program.title}
            className="w-full h-full object-cover object-center min-h-[320px] lg:min-h-[480px] max-h-[600px]"
          />
        </div>
      </section>

      {/* Main Container — full-bleed */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-10 flex-1">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
          
          {/* Main Left Content Area */}
          <main className="w-full lg:flex-1 min-w-0">
            {/* Top Navigation Tabs */}
            <div className="border-b border-gold/25 mb-8 overflow-x-auto scrollbar-none">
              <nav className="flex space-x-8 min-w-max" aria-label="Program sections">
                {[
                  { id: 'overview', label: 'Program' },
                  { id: 'curriculum', label: 'Curriculum' },
                  { id: 'outcomes', label: 'Career Outcomes' },
                  { id: 'requirements', label: 'Admissions' },
                  { id: 'faq', label: 'FAQ' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`py-4 px-1 text-sm font-semibold border-b-2 transition-colors duration-150 flex items-center gap-2 ${
                      activeTab === tab.id
                        ? 'border-ink text-ink'
                        : 'border-transparent text-[#5a6b5f] hover:text-ink hover:border-[#cbd5e1]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-10">
                {/* Program Description & Core Competencies */}
                <section className="bg-cream p-6 sm:p-8 border-t border-gold/25">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink mb-3">
                    <GraduationCap className="w-4 h-4 text-gold" /> What You'll Learn
                  </div>
                  <h2 className="font-display text-2xl font-bold text-ink mb-4">
                    About the {program.title}
                  </h2>
                  <div className="text-[#5a6b5f] leading-relaxed space-y-4 text-sm sm:text-base mb-6">
                    {program.overviewParagraphs.map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>

                  {/* Core Competencies Badges */}
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#5a6b5f] mb-4">
                    What You Will Master
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {program.coreCompetencies.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-3.5 rounded-lg bg-cream border border-gold/25 text-ink text-xs sm:text-sm font-medium"
                      >
                        <DynamicIcon name={item.icon} className="w-4 h-4 text-ink shrink-0" />
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* How Your Time Is Spent - Donut Breakdown */}
                <section className="bg-cream p-6 sm:p-8 border-t border-gold/25">
                  <h2 className="font-display text-2xl font-bold text-ink mb-2">
                    How Your Time Is Spent
                  </h2>
                  <p className="text-xs sm:text-sm text-[#5a6b5f] mb-6">
                    All hours are hands-on training time.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                    {/* SVG Donut Chart */}
                    <div className="md:col-span-4 flex flex-col items-center justify-center p-4 bg-cream rounded-xl border border-gold/25">
                      <div className="relative w-44 h-44">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                          {/* Background Circle */}
                          <circle cx="50" cy="50" r="38" fill="none" stroke="#e4dfd4" strokeWidth="12" />
                          {/* Technical Segment */}
                          <circle
                            cx="50"
                            cy="50"
                            r="38"
                            fill="none"
                            stroke="var(--ink)"
                            strokeWidth="12"
                            strokeDasharray={`${strokeTech} ${circ}`}
                            strokeDashoffset={0}
                          />
                          {/* Business & Personal Segment */}
                          <circle
                            cx="50"
                            cy="50"
                            r="38"
                            fill="none"
                            stroke="color-mix(in oklab, var(--ink) 55%, var(--cream))"
                            strokeWidth="12"
                            strokeDasharray={`${strokeBiz} ${circ}`}
                            strokeDashoffset={-strokeTech}
                          />
                          {/* Applied Segment */}
                          {program.donutData.applied > 0 && (
                            <circle
                              cx="50"
                              cy="50"
                              r="38"
                              fill="none"
                              stroke="color-mix(in oklab, var(--ink) 30%, var(--cream))"
                              strokeWidth="12"
                              strokeDasharray={`${strokeApp} ${circ}`}
                              strokeDashoffset={-(strokeTech + strokeBiz)}
                            />
                          )}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                          <span className="text-xl font-bold font-display text-ink">
                            {program.totalClockHours}
                          </span>
                          <span className="text-[10px] font-semibold text-[#5a6b5f] uppercase tracking-wider">
                            Total Hours
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Breakdown items */}
                    <div className="md:col-span-8 space-y-4">
                      {program.breakdown.map((item, idx) => (
                        <div key={idx} className="p-4 rounded-lg bg-cream border border-gold/25">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-3 h-3 rounded-full ${
                                  idx === 0 ? 'bg-ink' : idx === 1 ? 'bg-ink/55' : 'bg-ink/30'
                                }`}
                              />
                              <span className="text-sm font-bold text-ink">{item.type}</span>
                            </div>
                            <span className="text-xs font-mono font-bold text-ink bg-cream px-2 py-0.5 rounded border border-gold/25">
                              {item.hours} Hours ({item.percent})
                            </span>
                          </div>
                          {item.description && (
                            <p className="text-xs text-[#5a6b5f] leading-relaxed pl-5">
                              {item.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Weekly Schedule */}
                <section className="bg-cream p-6 sm:p-8 border-t border-gold/25">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="font-display text-xl sm:text-2xl font-bold text-ink">
                        Weekly Schedule
                      </h2>
                      <p className="text-xs sm:text-sm text-[#5a6b5f]">
                        30 hours per week · Monday through Friday
                      </p>
                    </div>
                    <span className="text-xs font-mono px-3 py-1 bg-gold-deep/10 text-gold-deep rounded-full font-semibold">
                      Mon – Fri | 08:00 – 15:30
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="p-4 border border-gold/25">
                      <div className="text-xs font-mono font-bold text-gold-deep uppercase mb-1">
                        08:00 – 12:00
                      </div>
                      <div className="text-sm font-bold text-ink mb-1">Hands-On Practice</div>
                      <p className="text-xs text-[#5a6b5f]">
                        Salon floor, grooming stations, training ring, and real animal handling.
                      </p>
                    </div>

                    <div className="p-4 border border-gold/25">
                      <div className="text-xs font-mono font-bold text-gold-deep uppercase mb-1">
                        12:30 – 14:30
                      </div>
                      <div className="text-sm font-bold text-ink mb-1">Business & Life Skills</div>
                      <p className="text-xs text-[#5a6b5f]">
                        Business operations, marketing, finance, legal, and personal readiness.
                      </p>
                    </div>

                    <div className="p-4 border border-gold/25">
                      <div className="text-xs font-mono font-bold text-gold-deep uppercase mb-1">
                        14:30 – 15:30
                      </div>
                      <div className="text-sm font-bold text-ink mb-1">Daily Review</div>
                      <p className="text-xs text-[#5a6b5f]">
                        Quick checks, portfolio uploads, and daily progress.
                      </p>
                    </div>
                  </div>

                </section>

              </div>
            )}

            {/* TAB 2: CURRICULUM & SCHEDULE */}
            {activeTab === 'curriculum' && (
              <div className="space-y-8">
                {/* View Mode Switcher */}
                <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-cream rounded-xl border border-gold/25">
                  <div>
                    <h2 className="font-display text-xl font-bold text-ink">Curriculum Delivery & Master Schedule</h2>
                    <p className="text-xs text-[#5a6b5f]">Select a view mode to inspect terms, the week-by-week master schedule, or granular course modules.</p>
                  </div>

                  <div className="inline-flex rounded-lg bg-cream p-1 border border-gold/25">
                    <button
                      onClick={() => setCurriculumViewMode('terms')}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                        curriculumViewMode === 'terms'
                          ? 'bg-ink text-on-dark shadow-sm'
                          : 'text-[#5a6b5f] hover:text-ink'
                      }`}
                    >
                      Term Overview
                    </button>
                    <button
                      onClick={() => setCurriculumViewMode('weekly')}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                        curriculumViewMode === 'weekly'
                          ? 'bg-ink text-on-dark shadow-sm'
                          : 'text-[#5a6b5f] hover:text-ink'
                      }`}
                    >
                      Week-by-Week Master Schedule ({program.totalWeeks} Wks)
                    </button>
                    <button
                      onClick={() => setCurriculumViewMode('catalog')}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                        curriculumViewMode === 'catalog'
                          ? 'bg-ink text-on-dark shadow-sm'
                          : 'text-[#5a6b5f] hover:text-ink'
                      }`}
                    >
                      Full Course Catalog ({programCatalogModules.length} Modules)
                    </button>
                  </div>
                </div>

                {/* VIEW 1: TERM OVERVIEW */}
                {curriculumViewMode === 'terms' && (
                  <div className="space-y-6">
                    {program.terms.map((term, index) => {
                      const isOpen = openTermIndex === index;
                      return (
                        <div
                          key={term.termNumber}
                          className="bg-cream rounded-xl border border-gold/25 overflow-hidden shadow-sm transition-all"
                        >
                          <button
                            onClick={() => setOpenTermIndex(isOpen ? null : index)}
                            className="w-full text-left p-6 flex items-start sm:items-center justify-between gap-4 hover:bg-cream transition-colors"
                          >
                            <div className="flex items-start sm:items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-ink/10 border border-ink/20 flex flex-col items-center justify-center shrink-0">
                                <span className="text-[10px] font-bold text-ink uppercase">TERM</span>
                                <span className="text-base font-bold font-display text-ink">{term.termNumber}</span>
                              </div>
                              <div>
                                <h3 className="font-display text-lg font-bold text-ink">{term.name}</h3>
                                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-[#5a6b5f]">
                                  <span>{term.durationWeeks}</span>
                                  <span>•</span>
                                  <span>{term.clockHours} Hours</span>
                                  <span>•</span>
                                  <span>{term.modulesCount} Modules</span>
                                </div>
                              </div>
                            </div>

                            <ChevronDown
                              className={`w-5 h-5 text-[#5a6b5f] transition-transform duration-200 shrink-0 ${
                                isOpen ? 'rotate-180' : ''
                              }`}
                            />
                          </button>

                          {isOpen && (
                            <div className="p-6 pt-0 border-t border-gold/25 bg-cream/50 space-y-6">
                              <p className="text-sm text-[#5a6b5f] leading-relaxed pt-4">{term.description}</p>

                              {/* Time Breakdown */}
                              <div className="grid grid-cols-3 gap-3 p-4 border border-gold/25">
                                <div>
                                  <div className="text-xs text-[#5a6b5f]">Technical Hours</div>
                                  <div className="text-base font-bold text-gold-deep">
                                    {term.modulesSummary?.technicalHours || term.techHours || 0} hrs
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-[#5a6b5f]">Business & Personal Hours</div>
                                  <div className="text-base font-bold text-gold-deep">
                                    {term.modulesSummary?.businessHours || term.businessHours || 0} hrs
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-[#5a6b5f]">Applied Hours</div>
                                  <div className="text-base font-bold text-gold-deep">
                                    {term.modulesSummary?.appliedHours || term.appliedHours || 0} hrs
                                  </div>
                                </div>
                              </div>

                              {/* Modules in this Term — with names and hours */}
                              <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-[#5a6b5f] mb-3">
                                  Term {term.termNumber} Modules ({term.courseHighlights.length})
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {term.courseHighlights.map((mod) => (
                                    <div key={mod.code} className="p-4 border border-gold/25 bg-cream">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-semibold text-ink">{mod.title}</span>
                                        <span className="text-xs text-[#5a6b5f]">{mod.hours} hrs</span>
                                      </div>
                                      <span className="text-[10px] text-[#5a6b5f]">{mod.code}</span>
                                      {program.safetyGates.includes(mod.code) && (
                                        <span className="block text-[10px] text-gold-deep mt-1">Key Skills Check</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* VIEW 2: WEEK-BY-WEEK MASTER DELIVERY SCHEDULE */}
                {curriculumViewMode === 'weekly' && (
                  <div className="bg-cream rounded-xl border border-gold/25 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-display text-xl font-bold text-ink">
                          Week-by-Week Delivery Schedule (Part B Syllabi)
                        </h3>
                        <p className="text-xs text-[#5a6b5f]">
                          Exact pacing of technical modules, business/personal spine modules, hours, and weekly assessments.
                        </p>
                      </div>
                      <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-ink/10 text-ink">
                        Total {syllabus?.weeklySchedule.length || program.totalWeeks} Weeks Scheduled
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border border-gold/25">
                        <thead className="bg-cream text-ink font-bold border-b border-gold/25">
                          <tr>
                            <th className="p-3 w-16">Week</th>
                            <th className="p-3 w-28">Term</th>
                            <th className="p-3">Technical Track Modules (08:00–12:00)</th>
                            <th className="p-3">Business / Personal Spine (12:30–14:30)</th>
                            <th className="p-3 w-24">Hrs (Tech / Biz)</th>
                            <th className="p-3">Assessments, Quizzes & Gates</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e4dfd4] text-[#5a6b5f]">
                          {syllabus?.weeklySchedule.map((entry) => (
                            <tr key={entry.week} className="hover:bg-cream">
                              <td className="p-3 font-mono font-bold text-ink">Wk {entry.week}</td>
                              <td className="p-3 font-medium text-ink">{entry.term}</td>
                              <td className="p-3 font-mono text-ink font-semibold">{entry.technicalModules}</td>
                              <td className="p-3 font-mono text-ink">{entry.businessModules}</td>
                              <td className="p-3 font-mono font-bold bg-cream">{entry.hoursFormatted}</td>
                              <td className="p-3 text-xs">
                                {entry.assessments.includes('Safety Gate') ? (
                                  <span className="text-gold-deep font-semibold flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3 shrink-0" /> {entry.assessments}
                                  </span>
                                ) : entry.assessments.includes('Defense') || entry.assessments.includes('Checkpoint') ? (
                                  <span className="text-ink font-semibold flex items-center gap-1">
                                    <Award className="w-3 h-3 shrink-0" /> {entry.assessments}
                                  </span>
                                ) : (
                                  <span className="text-[#4b5563]">{entry.assessments}</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* VIEW 3: FULL COURSE MODULE CATALOG */}
                {curriculumViewMode === 'catalog' && (
                  <div className="space-y-4">
                    <div className="bg-cream p-4 rounded-xl border border-gold/25 flex items-center justify-between">
                      <span className="text-xs font-semibold text-ink">
                        Displaying {programCatalogModules.length} accredited course descriptions for {program.code}
                      </span>
                      <Link
                        href="/learn/courses"
                        className="text-xs font-bold text-ink hover:underline flex items-center gap-1"
                      >
                        Open Global Catalog <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {programCatalogModules.map((m) => (
                        <div key={m.code} className="p-5 rounded-xl bg-cream border border-gold/25 shadow-sm flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-ink/10 text-ink">
                                {m.code}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-medium text-[#5a6b5f]">{m.hours} Hrs</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cream font-semibold text-[#5a6b5f]">
                                  {m.level}
                                </span>
                              </div>
                            </div>
                            <h4 className="font-semibold text-sm text-ink mb-1.5">{m.title}</h4>
                            <p className="text-xs text-[#5a6b5f] leading-relaxed mb-3">{m.description}</p>
                          </div>

                          {m.safetyGate && (
                            <div className="pt-2 border-t border-gold-deep/20 text-[11px] font-semibold text-gold-deep flex items-center gap-1.5">
                              <Shield className="w-3.5 h-3.5" /> Key Skills Check
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: CAREER OUTCOMES */}
            {activeTab === 'outcomes' && (
              <div className="space-y-8">
                {/* Career Pathways & Wage Ladder */}
                <section className="bg-cream p-6 sm:p-8 border-t border-gold/25">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink mb-2">
                    <Briefcase className="w-4 h-4 text-gold" /> Professional Pathways & Economic Mobility
                  </div>
                  <h2 className="font-display text-2xl font-bold text-ink mb-2">
                    Career Pathways & Graduate Compensation
                  </h2>
                  <p className="text-xs sm:text-sm text-[#5a6b5f] mb-6">
                    75%+ of graduates are working or running their own business within 6 months.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {syllabus?.careerOutcomes.map((outcome, idx) => (
                      <div key={idx} className="p-5 rounded-xl bg-cream border border-gold/25 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-ink/10 text-ink uppercase tracking-wider block w-fit mb-2">
                            {outcome.employmentType}
                          </span>
                          <h3 className="font-semibold text-base text-ink mb-1">{outcome.title}</h3>
                          <p className="text-xs text-[#5a6b5f] leading-relaxed mb-4">{outcome.roleDescription}</p>
                        </div>
                        <div className="pt-3 border-t border-gold/25">
                          <div className="text-[10px] uppercase font-bold text-[#5a6b5f]">Typical Compensation</div>
                          <div className="text-sm font-mono font-bold text-ink">{outcome.typicalComp}</div>
                          <div className="text-[11px] text-gold-deep font-medium mt-0.5">Market Demand: {outcome.marketDemand}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Skills You'll Master */}
                <section className="bg-cream p-6 sm:p-8 border-t border-gold/25">
                  <h2 className="font-display text-2xl font-bold text-ink mb-2">
                    Skills You'll Master
                  </h2>
                  <p className="text-xs sm:text-sm text-[#5a6b5f] mb-6">
                    To graduate, you'll demonstrate every skill on your checklist with your instructor.
                  </p>

                  <div className="space-y-4">
                    {syllabus?.rubricDomains.map((r, idx) => (
                      <div key={idx} className="p-4 rounded-xl border border-gold/25 bg-cream">
                        <div className="font-display font-bold text-sm text-ink mb-1">{r.domain}</div>
                        <div className="text-xs text-[#5a6b5f] mb-3">
                          <strong className="text-ink">Core Skills Evaluated:</strong> {r.coreSkills}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div className="p-3 rounded bg-cream border border-gold/25">
                            <span className="font-bold text-ink block mb-1">Competent Benchmark (Graduation Standard):</span>
                            <span className="text-[#5a6b5f]">{r.competentBenchmark}</span>
                          </div>
                          <div className="p-3 rounded bg-cream border border-gold/25">
                            <span className="font-bold text-ink block mb-1">Mastery / Honors Benchmark:</span>
                            <span className="text-[#5a6b5f]">{r.masteryThreshold}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {/* TAB 4: ADMISSIONS */}
            {activeTab === 'requirements' && (
              <div className="space-y-8">
                {/* Key Skills You'll Demonstrate */}
                <section className="bg-cream p-6 sm:p-8 rounded-xl border border-gold-deep/30 shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gold-deep mb-2">
                    <Shield className="w-4 h-4" /> Key Skills You'll Demonstrate
                  </div>
                  <h2 className="font-display text-2xl font-bold text-ink mb-2">
                    Key Skills You'll Demonstrate
                  </h2>
                  <p className="text-xs sm:text-sm text-[#5a6b5f] mb-6">
                    Safety skills you must demonstrate before working with live animals. You'll practice these skills with your instructor before working with real animals.
                  </p>

                  <div className="space-y-3">
                    {syllabus?.safetyGates.map((gate) => (
                      <div key={gate.code} className="p-4 rounded-lg bg-gold-deep/5 border border-gold-deep/20 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-gold-deep shrink-0 mt-0.5" />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs font-bold text-gold-deep">{gate.code}</span>
                            <span className="font-semibold text-sm text-ink">{gate.title}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-gold-deep/10 text-gold-deep font-bold">
                              {gate.stage}
                            </span>
                          </div>
                          <p className="text-xs text-ink-soft leading-relaxed">{gate.requirement}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Admission Requirements & Attendance Policy */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <section className="bg-cream p-6 rounded-xl border border-gold/25 shadow-sm">
                    <h3 className="font-display text-lg font-bold text-ink mb-3">
                      What You Need to Enroll
                    </h3>
                    <ul className="space-y-2.5 text-xs text-[#5a6b5f]">
                      {syllabus?.admissionRequirements.map((req, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-ink shrink-0 mt-0.5" />
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section className="bg-cream p-6 rounded-xl border border-gold/25 shadow-sm">
                    <h3 className="font-display text-lg font-bold text-ink mb-3">
                      Attendance Policy
                    </h3>
                    <p className="text-xs text-[#5a6b5f] leading-relaxed mb-4">
                      {syllabus?.attendancePolicy}
                    </p>
                    <div className="p-3 rounded-lg bg-cream text-xs font-mono text-ink font-semibold">
                      Friday 08:00–12:00: Open Laboratory Makeup Block
                    </div>
                  </section>
                </div>
              </div>
            )}

            {/* TAB 5: ACCREDITATION FAQ */}
            {activeTab === 'faq' && (
              <section className="bg-cream p-6 sm:p-8 border-t border-gold/25 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink mb-2">
                  <HelpCircle className="w-4 h-4 text-gold" /> Compliance & Operations FAQ
                </div>
                <h2 className="font-display text-2xl font-bold text-ink mb-2">
                  Frequently Asked Questions
                </h2>
                <p className="text-xs sm:text-sm text-[#5a6b5f] mb-6">
                  Guidance on attendance, safety, and building your credentials.
                </p>

                <div className="space-y-3">
                  {syllabus?.faqs.map((faq, idx) => {
                    const isOpen = openFaqIndex === idx;
                    return (
                      <div key={idx} className="border border-gold/25 rounded-lg overflow-hidden">
                        <button
                          onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                          className="w-full text-left p-4 bg-cream flex items-center justify-between gap-4 font-semibold text-sm text-ink hover:bg-cream transition-colors"
                        >
                          <span>{faq.question}</span>
                          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isOpen && (
                          <div className="p-4 bg-cream text-xs sm:text-sm text-[#5a6b5f] leading-relaxed border-t border-gold/25">
                            {faq.answer}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </main>

          {/* Right Sidebar: Program Card & Action Pane */}
          <aside className="w-full lg:w-80 shrink-0 space-y-6">
            <div className="bg-cream rounded-xl border border-gold/25 p-6 shadow-sm">
              <span className="text-[10px] font-bold tracking-widest text-ink uppercase block mb-1">
                Official Credential
              </span>
              <h3 className="font-display text-lg font-bold text-ink mb-3">
                {program.credential}
              </h3>
              
              <div className="space-y-3 text-xs text-[#5a6b5f] mb-6 pt-3 border-t border-gold/25">
                <div className="flex justify-between">
                  <span className="text-[#5a6b5f]">Total Hours:</span>
                  <span className="font-mono font-bold text-ink">{program.totalClockHours} hrs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5a6b5f]">Full-Time Duration:</span>
                  <span className="font-bold text-ink">{program.totalWeeks} Weeks</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5a6b5f]">Part-Time Duration:</span>
                  <span className="text-ink">{program.partTimeWeeksFormatted}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5a6b5f]">Delivery Format:</span>
                  <span className="text-ink">Hybrid Salon Lab</span>
                </div>
              </div>

              <Link
                href="/learn/enroll"
                className="btn-gold w-full mb-3"
              >
                Enroll in Program <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Stacking Ladder Card */}
            {syllabus && (
              <div className="bg-cream border border-gold/25 p-6">
                <span className="text-[10px] font-bold tracking-widest text-gold-deep uppercase block mb-1">
                  Build on Your Credentials
                </span>
                <h4 className="font-display text-base font-bold text-ink mb-2">Build on Your Credentials</h4>
                <p className="text-xs text-ink-soft leading-relaxed mb-4">
                  {syllabus.stacksInto}
                </p>
                <div className="text-[11px] text-ink-soft">
                  Your completed hours transfer into advanced programs.
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

    </div>
  );
}
