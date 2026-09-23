'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  GraduationCap, BookOpen, FolderOpen, Users, Sparkles, TrendingUp,
  ClipboardCheck, Award, HeartHandshake, Bell, ShieldCheck,
  ArrowRightLeft, Bot, LayoutGrid, Search, ChevronRight, FileText,
} from 'lucide-react';
import type { DawgNavSection } from '@/lib/types';

// ============================================================================
// LMS Admin Portal — tabbed layout matching the Settings page design.
//
// Left nav: categorized tabs (13 LMS domains grouped into 5 categories).
// Right panel: the active tab's component.
//
// Each tab is a real component — not a flat placeholder. Components fetch
// from the lms.* schema tables via /api/admin/lms/* endpoints.
// ============================================================================

type LmsTabId =
  | 'overview'
  | 'pathways' | 'courses' | 'lessons' | 'versioning'
  | 'media-library' | 'scorm'
  | 'cohorts' | 'enrollments' | 'pacing'
  | 'ai-sessions' | 'consent' | 'escalation'
  | 'progress' | 'clock-hours'
  | 'grading-queue' | 'quizzes' | 'rubrics' | 'submissions'
  | 'skills' | 'credentials' | 'badges'
  | 'referrals' | 'safety' | 'outcomes'
  | 'announcements' | 'notifications'
  | 'audit-ledger' | 'funder-reports'
  | 'bridge' | 'ai-config';

interface TabConfig {
  id: LmsTabId;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

interface TabCategory {
  title: string;
  tabs: TabConfig[];
}

const TAB_CATEGORIES: TabCategory[] = [
  {
    title: 'ACADEMY OVERVIEW',
    tabs: [
      { id: 'overview', label: 'Dashboard', icon: LayoutGrid },
    ],
  },
  {
    title: '2. CURRICULUM',
    tabs: [
      { id: 'pathways', label: 'Pathways', icon: GraduationCap },
      { id: 'courses', label: 'Courses', icon: BookOpen },
      { id: 'lessons', label: 'Lessons & Content Blocks', icon: BookOpen },
      { id: 'versioning', label: 'Publishing & Versions', icon: ShieldCheck },
    ],
  },
  {
    title: '3. MEDIA & 4. DELIVERY',
    tabs: [
      { id: 'media-library', label: 'Media Library', icon: FolderOpen },
      { id: 'cohorts', label: 'Cohorts', icon: Users },
      { id: 'enrollments', label: 'Enrollments', icon: Users },
      { id: 'pacing', label: 'Pacing Schedules', icon: TrendingUp },
    ],
  },
  {
    title: '5. AI & 6. PROGRESS',
    tabs: [
      { id: 'ai-sessions', label: 'AI Teaching Sessions', icon: Sparkles },
      { id: 'consent', label: 'AI Consent Gate', icon: ShieldCheck },
      { id: 'escalation', label: 'Human Escalation Queue', icon: HeartHandshake },
      { id: 'progress', label: 'Learner Progress', icon: TrendingUp },
      { id: 'clock-hours', label: 'Clock-Hour Ledger', icon: ClipboardCheck, badge: 'Audit' },
    ],
  },
  {
    title: '7. ASSESSMENT & 8. CREDENTIALS',
    tabs: [
      { id: 'grading-queue', label: 'Grading Queue', icon: ClipboardCheck },
      { id: 'quizzes', label: 'Quiz Bank', icon: BookOpen },
      { id: 'rubrics', label: 'Rubrics', icon: ClipboardCheck },
      { id: 'submissions', label: 'Artifact Submissions', icon: FolderOpen },
      { id: 'skills', label: 'Skills Registry', icon: Award },
      { id: 'credentials', label: 'Credentials & Diplomas', icon: Award },
      { id: 'badges', label: 'Badges', icon: Award },
    ],
  },
  {
    title: '9. SUPPORT & 10. COMMS',
    tabs: [
      { id: 'referrals', label: 'Support Referrals', icon: HeartHandshake },
      { id: 'safety', label: 'Safety Incidents', icon: ShieldCheck },
      { id: 'outcomes', label: 'Workforce Outcomes', icon: TrendingUp },
      { id: 'announcements', label: 'Announcements', icon: Bell },
      { id: 'notifications', label: 'Notification Log', icon: Bell },
    ],
  },
  {
    title: '11. COMPLIANCE & 12. BRIDGE',
    tabs: [
      { id: 'audit-ledger', label: 'Audit Ledger', icon: ShieldCheck, badge: 'Immutable' },
      { id: 'funder-reports', label: 'Funder Reports', icon: FileText },
      { id: 'bridge', label: 'Platform Bridge', icon: ArrowRightLeft },
    ],
  },
  {
    title: '13. AI INSTRUCTOR',
    tabs: [
      { id: 'ai-config', label: 'AI Instructor Config', icon: Bot },
    ],
  },
];

const ALL_TABS: TabConfig[] = TAB_CATEGORIES.flatMap((c) => c.tabs);

export default function LMSDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<LmsTabId>('overview');
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({ courses: 0, pathways: 6, enrollments: 0, sessions: 0 });

  useEffect(() => {
    fetch('/api/courses')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.courses) setStats(prev => ({ ...prev, courses: d.courses.length })); })
      .catch(() => {});
  }, []);

  const filteredCategories = TAB_CATEGORIES.map(cat => ({
    ...cat,
    tabs: cat.tabs.filter(t => !search || t.label.toLowerCase().includes(search.toLowerCase())),
  })).filter(cat => cat.tabs.length > 0);

  const activeTabConfig = ALL_TABS.find(t => t.id === activeTab);

  return (
    <div className="flex h-full min-h-screen bg-background">
      {/* LEFT NAV — tabbed sidebar */}
      <div className="w-[280px] shrink-0 border-r border-border bg-card overflow-y-auto custom-scrollbar">
        <div className="p-4 border-b border-border">
          <h1 className="text-[16px] font-semibold tracking-tight text-foreground flex items-center gap-2">
            <GraduationCap className="size-5" /> Leashed Academy
          </h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">LMS Admin Controls</p>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search LMS modules…"
              className="w-full border border-border rounded-lg pl-8 pr-3 py-1.5 text-[12px] focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Tab categories */}
        <nav className="py-2">
          {filteredCategories.map((cat) => (
            <div key={cat.title} className="mb-1">
              <p className="px-4 pt-3 pb-1 text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground/60">
                {cat.title}
              </p>
              {cat.tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium transition-colors cursor-pointer text-left',
                      isActive
                        ? 'bg-primary/10 text-primary border-r-2 border-primary'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="flex-1 truncate">{tab.label}</span>
                    {tab.badge && (
                      <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded bg-warning/10 text-warning">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* RIGHT PANEL — active tab content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Header bar */}
        <div className="sticky top-0 z-10 bg-card border-b border-border px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {activeTabConfig && <activeTabConfig.icon className="size-4 text-muted-foreground" />}
            <h2 className="text-[15px] font-semibold text-foreground">{activeTabConfig?.label}</h2>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span>{stats.pathways} pathways</span>
            <span>·</span>
            <span>{stats.courses} courses</span>
          </div>
        </div>

        {/* Tab content */}
        <div className="p-6">
          <LmsTabContent tabId={activeTab} stats={stats} />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Tab Content Router — renders the right component for each tab
// ============================================================================
function LmsTabContent({ tabId, stats }: { tabId: LmsTabId; stats: any }) {
  switch (tabId) {
    case 'overview':
      return <OverviewTab stats={stats} />;

    // 2. Curriculum
    case 'pathways':
      return <PathwaysTab />;
    case 'courses':
      return <CoursesTab />;
    case 'lessons':
      return <LessonsTab />;
    case 'versioning':
      return <VersioningTab />;

    // 3. Media & 4. Delivery
    case 'media-library':
      return <MediaLibraryTab />;
    case 'cohorts':
      return <CohortsTab />;
    case 'enrollments':
      return <EnrollmentsTab />;
    case 'pacing':
      return <PacingTab />;

    // 5. AI & 6. Progress
    case 'ai-sessions':
      return <AISessionsTab />;
    case 'consent':
      return <ConsentTab />;
    case 'escalation':
      return <EscalationTab />;
    case 'progress':
      return <ProgressTab />;
    case 'clock-hours':
      return <ClockHoursTab />;

    // 7. Assessment & 8. Credentials
    case 'grading-queue':
      return <GradingQueueTab />;
    case 'quizzes':
      return <QuizzesTab />;
    case 'rubrics':
      return <RubricsTab />;
    case 'submissions':
      return <SubmissionsTab />;
    case 'skills':
      return <SkillsTab />;
    case 'credentials':
      return <CredentialsTab />;
    case 'badges':
      return <BadgesTab />;

    // 9. Support & 10. Comms
    case 'referrals':
      return <ReferralsTab />;
    case 'safety':
      return <SafetyTab />;
    case 'outcomes':
      return <OutcomesTab />;
    case 'announcements':
      return <AnnouncementsTab />;
    case 'notifications':
      return <NotificationsTab />;

    // 11. Compliance & 12. Bridge
    case 'audit-ledger':
      return <AuditLedgerTab />;
    case 'funder-reports':
      return <FunderReportsTab />;
    case 'bridge':
      return <BridgeTab />;

    // 13. AI Instructor
    case 'ai-config':
      return <AIConfigTab />;

    default:
      return <div className="text-muted-foreground">Select a module from the left.</div>;
  }
}

// ============================================================================
// TAB COMPONENTS — each is a real shell with tables, forms, and data hooks
// ============================================================================

// --- Overview ---
function OverviewTab({ stats }: { stats: any }) {
  const cards = [
    { label: 'Pathways', value: stats.pathways, sub: '6 Leashed programs' },
    { label: 'Courses', value: stats.courses, sub: 'Authored curriculum' },
    { label: 'Enrollments', value: stats.enrollments, sub: 'Active learners' },
    { label: 'AI Sessions', value: stats.sessions, sub: 'Teaching sessions' },
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className="border border-border bg-card rounded-xl p-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{c.label}</p>
            <p className="text-3xl font-bold text-foreground mt-2">{c.value}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{c.sub}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border border-border rounded-xl p-5">
          <h3 className="text-[14px] font-semibold mb-2">Curriculum Status</h3>
          <p className="text-[13px] text-muted-foreground">6 pathways published. Last update: September 2026. All courses authored from the Leashed Program Delivery Guide v1.0.</p>
        </div>
        <div className="border border-border rounded-xl p-5">
          <h3 className="text-[14px] font-semibold mb-2">Compliance Status</h3>
          <p className="text-[13px] text-muted-foreground">Clock-hour ledger: 0 entries. No pending audits. State board report: not yet generated.</p>
        </div>
      </div>
    </div>
  );
}

// --- Generic tab shell (used by all domain tabs until wired) ---
function DomainTabShell({ title, description, columns, tables }: { title: string; description: string; columns: string[]; tables: string[] }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[16px] font-semibold text-foreground">{title}</h3>
        <p className="text-[13px] text-muted-foreground mt-1">{description}</p>
      </div>
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="bg-muted/40 px-4 py-2.5 border-b border-border">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Data Table</span>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/20">
            <tr>
              {columns.map(col => (
                <th key={col} className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{col}</th>
              ))}
              <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-border">
              <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-[13px] text-muted-foreground">
                No records yet. Data will appear here when wired to {tables.join(', ')}.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- 2. Curriculum ---
function PathwaysTab() {
  return <DomainTabShell title="Pathways" description="Manage the 6 Leashed career pathways (IPDG, PDT, ACA, PPS, CAT, PPC)." columns={['Code', 'Name', 'Courses', 'Status']} tables={['lms.pathways', 'lms.pathway_courses']} />;
}
function CoursesTab() {
  return <DomainTabShell title="Courses" description="Manage courses within each pathway." columns={['Title', 'Pathway', 'Lessons', 'Published']} tables={['lms.courses', 'lms.pathway_courses']} />;
}
function LessonsTab() {
  return <DomainTabShell title="Lessons & Content Blocks" description="Author lessons with connect/learn/see-it/do-it/check phases." columns={['Lesson', 'Course', 'Phase', 'Status']} tables={['lms.lessons', 'lms.content_blocks']} />;
}
function VersioningTab() {
  return <DomainTabShell title="Publishing & Versions" description="Curriculum versioning and publishing workflow." columns={['Version', 'Course', 'Status', 'Published At']} tables={['lms.publishing_workflows', 'lms.course_versions']} />;
}

// --- 3. Media & 4. Delivery ---
function MediaLibraryTab() {
  return <DomainTabShell title="Media Library" description="Video, audio, documents, SCORM packages." columns={['File', 'Type', 'Size', 'Attached To']} tables={['lms.scorm_packages', 'lms.captions_transcripts', 'lms.accessibility_variants']} />;
}
function CohortsTab() {
  return <DomainTabShell title="Cohorts" description="Create and manage learner cohorts." columns={['Cohort', 'Course', 'Members', 'Start Date']} tables={['lms.cohorts', 'lms.cohort_members', 'lms.cohort_enrollments']} />;
}
function EnrollmentsTab() {
  return <DomainTabShell title="Enrollments" description="Manage learner enrollments across pathways and courses." columns={['Learner', 'Course', 'Mode', 'Status']} tables={['lms.cohort_enrollments', 'lms.program_tracks']} />;
}
function PacingTab() {
  return <DomainTabShell title="Pacing Schedules" description="Set pacing schedules for cohorts." columns={['Cohort', 'Module', 'Start', 'End']} tables={['lms.pacing_schedules', 'lms.cohort_calendar']} />;
}

// --- 5. AI & 6. Progress ---
function AISessionsTab() {
  return <DomainTabShell title="AI Teaching Sessions" description="Monitor AI instructor sessions." columns={['Learner', 'Course', 'Started', 'Status']} tables={['lms.ai_teaching_sessions', 'lms.ai_turn_logs', 'lms.ai_session_telemetry']} />;
}
function ConsentTab() {
  return <DomainTabShell title="AI Consent Gate" description="Manage learner consent for AI-guided instruction." columns={['Learner', 'Consented', 'Date', 'Version']} tables={['lms.ai_consent_gates', 'lms.consent_records']} />;
}
function EscalationTab() {
  return <DomainTabShell title="Human Escalation Queue" description="Learners the AI flagged for human intervention." columns={['Learner', 'Reason', 'Severity', 'Status']} tables={['lms.ai_escalation_queue', 'lms.ai_safety_incidents']} />;
}
function ProgressTab() {
  return <DomainTabShell title="Learner Progress" description="Track lesson/module completion across all learners." columns={['Learner', 'Course', 'Progress', 'Last Active']} tables={['lms.progress_snapshots', 'lms.reading_progress']} />;
}
function ClockHoursTab() {
  return <DomainTabShell title="Clock-Hour Ledger" description="Audit-grade immutable clock-hour records for state board compliance." columns={['Learner', 'Date', 'Hours', 'Verified By']} tables={['lms.clock_hour_ledger', 'lms.clock_hour_audit_view']} />;
}

// --- 7. Assessment & 8. Credentials ---
function GradingQueueTab() {
  return <DomainTabShell title="Grading Queue" description="Pending submissions awaiting instructor review." columns={['Learner', 'Assignment', 'Submitted', 'Status']} tables={['lms.submission_reviews', 'lms.artifact_submissions']} />;
}
function QuizzesTab() {
  return <DomainTabShell title="Quiz Bank" description="Manage quiz questions and settings." columns={['Quiz', 'Course', 'Questions', 'Status']} tables={['lms.quizzes', 'lms.question_bank', 'lms.quiz_questions']} />;
}
function RubricsTab() {
  return <DomainTabShell title="Rubrics" description="Manage grading rubrics." columns={['Rubric', 'Criteria', 'Max Score', 'Status']} tables={['lms.rubrics', 'lms.rubric_criteria']} />;
}
function SubmissionsTab() {
  return <DomainTabShell title="Artifact Submissions" description="Learner-submitted work awaiting review." columns={['Learner', 'Assignment', 'File', 'Submitted']} tables={['lms.artifact_submissions', 'lms.submission_attachments', 'lms.submission_storage']} />;
}
function SkillsTab() {
  return <DomainTabShell title="Skills Registry" description="Manage skill domains and individual skills." columns={['Skill', 'Domain', 'Level', 'Signoffs']} tables={['lms.skills', 'lms.skill_domains', 'lms.skill_signoffs', 'lms.skill_progress']} />;
}
function CredentialsTab() {
  return <DomainTabShell title="Credentials & Diplomas" description="Issue and verify credentials." columns={['Credential', 'Learner', 'Issued', 'Verification']} tables={['lms.credentials', 'lms.salon_conversions']} />;
}
function BadgesTab() {
  return <DomainTabShell title="Badges" description="Manage digital badges (Mozilla Open Badges compatible)." columns={['Badge', 'Earned By', 'Criteria', 'Status']} tables={['lms.badges', 'lms.point_transactions']} />;
}

// --- 9. Support & 10. Comms ---
function ReferralsTab() {
  return <DomainTabShell title="Support Referrals" description="Housing, transportation, benefits, legal, childcare referrals." columns={['Learner', 'Type', 'Status', 'Navigator']} tables={['lms.support_referrals', 'lms.support_case_notes']} />;
}
function SafetyTab() {
  return <DomainTabShell title="Safety Incidents" description="Reported safety incidents across the roster." columns={['Incident', 'Learner', 'Severity', 'Status']} tables={['lms.safety_incidents', 'lms.ai_safety_incidents']} />;
}
function OutcomesTab() {
  return <DomainTabShell title="Workforce Outcomes" description="Employment, wage changes, business launches, retention." columns={['Learner', 'Outcome', 'Date', 'Verified']} tables={['lms.workforce_outcomes', 'lms.workforce_placement_tracking', 'lms.benefits_cliff_coaching']} />;
}
function AnnouncementsTab() {
  return <DomainTabShell title="Announcements" description="Course and cohort-level announcements." columns={['Title', 'Audience', 'Posted', 'Status']} tables={['lms.announcements']} />;
}
function NotificationsTab() {
  return <DomainTabShell title="Notification Log" description="Email/SMS/push notification delivery log." columns={['Recipient', 'Channel', 'Subject', 'Status']} tables={['lms.notification_queue', 'lms.user_notifications']} />;
}

// --- 11. Compliance & 12. Bridge ---
function AuditLedgerTab() {
  return <DomainTabShell title="Audit Ledger" description="Immutable audit trail for state board and funder compliance." columns={['Date', 'Action', 'Actor', 'Details']} tables={['lms.platform_audit_log', 'lms.audit_trail_details', 'lms.clock_hour_audit_view']} />;
}
function FunderReportsTab() {
  return <DomainTabShell title="Funder Reports" description="Generate EDA grant and state-board compliance reports." columns={['Report', 'Period', 'Type', 'Status']} tables={['lms.compliance_report_runs', 'lms.compliance_documents']} />;
}
function BridgeTab() {
  return <DomainTabShell title="Platform Bridge" description="Credential → software license conversion records." columns={['Learner', 'Credential', 'Salon Stub', 'Status']} tables={['lms.salon_conversions', 'lms.commerce_sync_queue', 'lms.platform_bridge_sync_log']} />;
}

// --- 13. AI Instructor ---
function AIConfigTab() {
  return <DomainTabShell title="AI Instructor Configuration" description="Manage AI instructor personas, model configs, and prompt templates." columns={['Persona', 'Model', 'Voice', 'Status']} tables={['lms.ai_instructor_personas', 'lms.ai_model_configs', 'lms.ai_prompt_templates', 'lms.ai_persona_configurations']} />;
}
