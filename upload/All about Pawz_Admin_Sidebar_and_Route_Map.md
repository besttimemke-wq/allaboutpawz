# All About Pawz Academy — Admin Management Sidebar & Route Map

## 1. Purpose

This document translates the approved **All About Pawz Academy management dashboard design** into a build specification for the application router and sidebar.

The target is the **admin / instructor / curriculum-management application**, not the public Academy site and not the learner-facing application.

The implementation should preserve the visual hierarchy of the approved dashboard:

- Fixed left sidebar
- Section labels
- Compact icon + label navigation
- Active route highlighted
- Main content area with dashboard cards and management views
- Consistent page header, description, filters, tables, drawers/modals, and primary actions
- No unnecessary portal/sidebar duplication inside public-facing Academy pages

The source feature tree defines the management capabilities. This route map turns those capabilities into navigable application views.

---

# 2. Application Root

Base application:

`/academy`

Recommended application shell:

```text
/academy
├── Dashboard
├── Learning
├── Delivery
├── Learners
├── Assessment
├── Credentials
├── AI
├── Communication
├── Media
├── Reporting
└── Platform
```

The `/academy` shell owns:

- sidebar
- top header
- tenant / organization context
- user profile menu
- notifications
- global search
- breadcrumbs
- page title / description
- responsive navigation
- permission-aware menu visibility

---

# 3. COMPLETE SIDEBAR TREE

```text
All About Pawz Academy
│
├── OVERVIEW
│   └── Dashboard
│
├── LEARNING
│   ├── Curriculum
│   ├── Pathways
│   ├── Programs / Courses
│   ├── Modules
│   ├── Lessons
│   ├── Content Library
│   └── Learning Paths
│
├── DELIVERY
│   ├── Enrollments
│   ├── Cohorts
│   ├── Live Sessions
│   └── Calendar
│
├── LEARNERS
│   ├── Learners
│   ├── Roster
│   ├── Progress
│   ├── At-Risk Learners
│   └── Support Referrals
│
├── ASSESSMENT
│   ├── Assessments
│   ├── Question Bank
│   ├── Rubrics
│   ├── Grading Queue
│   └── Submissions
│
├── CREDENTIALS
│   ├── Skills Registry
│   ├── Credentials
│   ├── Badges
│   └── Verification
│
├── AI
│   ├── AI Instructor
│   ├── AI Teaching Sessions
│   ├── Personalization
│   └── AI Draft Review
│
├── COMMUNICATION
│   ├── Announcements
│   ├── Messages
│   └── Notifications
│
├── MEDIA
│   ├── Media Library
│   ├── Files
│   └── SCORM / xAPI
│
├── REPORTING
│   ├── Analytics
│   ├── Compliance
│   ├── Audit Ledger
│   └── Funder Reports
│
└── PLATFORM
    ├── Integrations
    ├── Data Migration
    ├── Import / Export
    ├── Platform Bridge / Conversion
    └── Settings
```

---

# 4. ROUTE CONVENTIONS

Use resource-oriented nested routes.

```text
/academy/<section>/<resource>
/academy/<section>/<resource>/new
/academy/<section>/<resource>/<id>
/academy/<section>/<resource>/<id>/edit
```

For actions that operate on a specific resource:

```text
/academy/<section>/<resource>/<id>/...
```

Do not create separate top-level routes for every button. Buttons should normally open:

- a child route
- a detail page
- an edit page
- a drawer
- a modal
- or a workflow route

depending on the operation.

---

# 5. OVERVIEW

## `/academy`

### Dashboard

Purpose:

The central Academy management dashboard shown in the approved mockup.

Primary dashboard areas:

1. KPI summary
   - Active Enrollments
   - Pathways
   - Courses
   - Learners
   - Credentials Issued
   - Pending Reviews

2. Curriculum Management
   - Pathways
   - Courses
   - Modules
   - Lessons
   - Content Blocks
   - Curriculum Versions / Publishing

3. Learner & Delivery
   - Enrollment activity
   - Cohorts
   - Upcoming live sessions
   - Pacing
   - Delivery modes

4. Assessment & Grading
   - Pending reviews
   - Submissions awaiting review
   - Quiz attempts
   - Competency assessments

5. AI Instructor
   - Active AI sessions
   - Draft content awaiting approval
   - Personalization sessions
   - Escalations

6. Skills & Credentials
   - Skill signoffs
   - Credentials issued
   - Badges
   - Verification requests

7. Compliance & Reporting
   - Audited clock hours
   - Audit status
   - Funder reports
   - State-board / compliance records

8. Management Tools
   - Media & Content Assets
   - Communication
   - Whole-Human Support
   - Analytics & Reporting
   - Integrations
   - Data Migration
   - Import / Export
   - Platform Bridge / Conversion

Dashboard buttons should deep-link into the corresponding management route.

---

# 6. LEARNING

## 6.1 `/academy/curriculum`

### Curriculum Management

Purpose:

Central curriculum authoring and publishing workspace.

Owns:

- Pathways
- Programs / Courses
- Modules
- Lessons
- Content Blocks
- Prerequisites
- Curriculum versions
- Publishing state

Primary actions:

- Create course
- Create pathway
- Create module
- Create lesson
- Edit curriculum
- Reorder curriculum
- Manage prerequisites
- Create version
- Compare versions
- Submit for review
- Publish version
- Archive version

Suggested tabs:

```text
Overview
Structure
Content
Prerequisites
Versions
Publishing
```

---

## 6.2 `/academy/pathways`

### Pathways

Purpose:

Manage the top-level learning pathways.

Views:

```text
/academy/pathways
/academy/pathways/new
/academy/pathways/:pathwayId
/academy/pathways/:pathwayId/edit
/academy/pathways/:pathwayId/courses
/academy/pathways/:pathwayId/versions
```

Pathway detail should show:

- pathway identity
- description
- courses
- sequence
- required / optional courses
- prerequisites
- delivery modes
- status
- version
- publishing state

---

## 6.3 `/academy/courses`

### Programs / Courses

Purpose:

Manage individual programs and courses.

Views:

```text
/academy/courses
/academy/courses/new
/academy/courses/:courseId
/academy/courses/:courseId/edit
/academy/courses/:courseId/structure
/academy/courses/:courseId/modules
/academy/courses/:courseId/lessons
/academy/courses/:courseId/assessments
/academy/courses/:courseId/prerequisites
/academy/courses/:courseId/skills
/academy/courses/:courseId/versions
/academy/courses/:courseId/publish
```

Course creation must support:

- intuitive course creation
- drag-and-drop organization
- text editing
- learning-path assignment
- delivery mode
- content organization
- assessments
- certification
- publishing

Delivery modes represented by the source:

- AI Instructor-Led
- Self-Paced
- Blended
- Entirely Online

---

## 6.4 `/academy/modules`

### Modules

Purpose:

Manage course modules.

Views:

```text
/academy/modules
/academy/modules/new
/academy/modules/:moduleId
/academy/modules/:moduleId/edit
/academy/modules/:moduleId/lessons
/academy/modules/:moduleId/content
/academy/modules/:moduleId/assessments
```

Module management supports:

- ordering
- lessons
- content blocks
- activities
- assessments
- prerequisites
- estimated time
- completion requirements

---

## 6.5 `/academy/lessons`

### Lessons

Purpose:

Author and manage lesson-level instructional content.

Views:

```text
/academy/lessons
/academy/lessons/new
/academy/lessons/:lessonId
/academy/lessons/:lessonId/edit
/academy/lessons/:lessonId/preview
/academy/lessons/:lessonId/media
/academy/lessons/:lessonId/assessments
```

Lesson authoring supports the source-defined content phases:

```text
Connect
Learn
See It
Do It
Check
```

Content may include:

- text
- structured steps
- video
- audio
- documents
- interactive material
- assessments
- supplementary resources
- accessibility variants

---

## 6.6 `/academy/content`

### Content Library

Purpose:

Central reusable content and asset organization.

Views:

```text
/academy/content
/academy/content/new
/academy/content/:contentId
/academy/content/:contentId/edit
/academy/content/:contentId/versions
```

Supports:

- ready-to-use content
- reusable content
- customization
- personalization
- certification-related content
- content blocks
- lesson resources
- attachments

---

## 6.7 `/academy/learning-paths`

### Learning Paths

Purpose:

Create and manage custom learning paths.

Views:

```text
/academy/learning-paths
/academy/learning-paths/new
/academy/learning-paths/:pathId
/academy/learning-paths/:pathId/edit
/academy/learning-paths/:pathId/courses
/academy/learning-paths/:pathId/publish
```

Supports:

- direct learning paths
- course sequencing
- prerequisites
- delivery-mode configuration
- custom progression

---

# 7. DELIVERY

## 7.1 `/academy/enrollments`

### Enrollments

Purpose:

Manage learner enrollment into programs and courses.

Views:

```text
/academy/enrollments
/academy/enrollments/new
/academy/enrollments/:enrollmentId
/academy/enrollments/:enrollmentId/edit
```

Manage:

- learner
- program / course
- cohort
- delivery mode
- enrollment state
- pacing
- curriculum version
- start date
- completion state

The implementation should preserve the curriculum version associated with an enrollment when the final data model establishes that rule.

---

## 7.2 `/academy/cohorts`

### Cohorts

Purpose:

Create and manage organization-level or platform-managed learner groups.

Views:

```text
/academy/cohorts
/academy/cohorts/new
/academy/cohorts/:cohortId
/academy/cohorts/:cohortId/edit
/academy/cohorts/:cohortId/roster
/academy/cohorts/:cohortId/progress
/academy/cohorts/:cohortId/calendar
/academy/cohorts/:cohortId/announcements
```

Supports:

- roster
- pacing
- group course assignment
- differentiated activities
- teamwork
- live sessions
- announcements
- aggregate progress

---

## 7.3 `/academy/live-sessions`

### Live Sessions

Purpose:

Schedule and manage hands-on labs and live instructional sessions.

Views:

```text
/academy/live-sessions
/academy/live-sessions/new
/academy/live-sessions/:sessionId
/academy/live-sessions/:sessionId/edit
```

Supports:

- date / time
- course
- module
- cohort
- instructor
- meeting link
- reminders
- attendance
- session status

---

## 7.4 `/academy/calendar`

### Calendar

Purpose:

Unified Academy scheduling view.

Views:

```text
/academy/calendar
```

Modes:

```text
Month
Week
Day
Agenda
```

Events include:

- live sessions
- quizzes
- assignments
- study groups
- readings
- office hours
- deadlines

---

# 8. LEARNERS

## 8.1 `/academy/learners`

### Learners

Purpose:

Central learner directory.

Views:

```text
/academy/learners
/academy/learners/:learnerId
/academy/learners/:learnerId/edit
/academy/learners/:learnerId/enrollments
/academy/learners/:learnerId/progress
/academy/learners/:learnerId/assessments
/academy/learners/:learnerId/credentials
/academy/learners/:learnerId/support
/academy/learners/:learnerId/activity
```

Learner detail should consolidate:

- identity
- role
- enrollments
- progress
- clock hours
- assessments
- credentials
- AI sessions
- support referrals
- workforce outcomes
- communication history

Access must respect tenant and role permissions.

---

## 8.2 `/academy/roster`

### Roster

Purpose:

Organization/cohort roster management.

Actions:

- invite
- assign role
- suspend
- remove
- assign course
- assign cohort
- bulk actions

Individual tenants do not receive organization roster-management capabilities.

---

## 8.3 `/academy/progress`

### Progress

Purpose:

Aggregate learner progress and course completion.

Views:

```text
/academy/progress
/academy/progress/course/:courseId
/academy/progress/cohort/:cohortId
/academy/progress/learner/:learnerId
```

Display:

- lesson progress
- module progress
- course completion
- clock hours
- pacing
- completion status
- assessment signals

---

## 8.4 `/academy/at-risk`

### At-Risk Learners

Purpose:

Identify learners requiring attention based on available progress, completion, communication, or escalation signals.

Actions:

- review learner
- contact learner
- raise support referral
- review AI escalation
- inspect progress
- inspect missed work

Do not expose private support information beyond authorized roles.

---

## 8.5 `/academy/support`

### Support Referrals

Purpose:

Private workforce and behavioral support management.

Supports:

- housing referrals
- transportation
- benefits
- legal support
- childcare
- workforce outcomes
- benefits-cliff coaching
- safety incidents
- navigator caseload

Views:

```text
/academy/support
/academy/support/referrals
/academy/support/referrals/:referralId
/academy/support/caseload
/academy/support/incidents
/academy/support/outcomes
```

This area requires strict role and tenant access controls.

---

# 9. ASSESSMENT

## 9.1 `/academy/assessments`

### Assessments

Purpose:

Create and manage assessments attached to curriculum.

Views:

```text
/academy/assessments
/academy/assessments/new
/academy/assessments/:assessmentId
/academy/assessments/:assessmentId/edit
/academy/assessments/:assessmentId/questions
/academy/assessments/:assessmentId/rubric
/academy/assessments/:assessmentId/settings
```

Supports:

- quizzes
- assignments
- competency assessments
- retakes
- grading rules
- rubrics
- AI-assisted assessment generation with human verification

---

## 9.2 `/academy/question-bank`

### Question Bank

Purpose:

Reusable assessment question repository.

Views:

```text
/academy/question-bank
/academy/question-bank/new
/academy/question-bank/:questionId
/academy/question-bank/:questionId/edit
```

---

## 9.3 `/academy/rubrics`

### Rubrics

Purpose:

Create and manage grading rubrics.

Views:

```text
/academy/rubrics
/academy/rubrics/new
/academy/rubrics/:rubricId
/academy/rubrics/:rubricId/edit
```

Supports competency-based and artifact grading.

---

## 9.4 `/academy/grading`

### Grading Queue

Purpose:

Instructor review and grading workspace.

Views:

```text
/academy/grading
/academy/grading/:submissionId
```

Supports:

- assignment review
- inline marking
- file annotation
- multiple markers
- grade moderation
- release control
- learner feedback
- AI-assisted competency assessment with mandatory human verification

---

## 9.5 `/academy/submissions`

### Submissions

Purpose:

Central artifact and assignment submission repository.

Views:

```text
/academy/submissions
/academy/submissions/:submissionId
```

Filter by:

- course
- module
- learner
- status
- instructor
- date
- assessment

---

# 10. CREDENTIALS

## 10.1 `/academy/skills`

### Skills Registry

Purpose:

Manage reusable skill definitions and competency mapping.

Views:

```text
/academy/skills
/academy/skills/domains
/academy/skills/new
/academy/skills/:skillId
/academy/skills/:skillId/edit
/academy/skills/signoffs
```

Supports:

- skill domains
- reusable atomic skills
- course skill targets
- introduced / practiced / mastered levels
- skill signoffs

---

## 10.2 `/academy/credentials`

### Credentials

Purpose:

Manage diplomas, credentials, certificates, and issuance.

Views:

```text
/academy/credentials
/academy/credentials/new
/academy/credentials/:credentialId
/academy/credentials/:credentialId/edit
/academy/credentials/issued
```

---

## 10.3 `/academy/badges`

### Badges

Purpose:

Manage achievement badges and badge issuance.

Views:

```text
/academy/badges
/academy/badges/new
/academy/badges/:badgeId
/academy/badges/:badgeId/edit
/academy/badges/issued
```

Where implemented, support Mozilla Open Badges compatibility.

---

## 10.4 `/academy/verification`

### Verification

Purpose:

Credential and skill verification.

Views:

```text
/academy/verification
/academy/verification/requests
/academy/verification/:verificationId
```

Supports:

- verification requests
- verification codes
- issued credential validation
- public verification destination

---

# 11. AI

## 11.1 `/academy/ai`

### AI Instructor

Purpose:

Administrative control center for the LeashGuide AI Instructor.

Views:

```text
/academy/ai
/academy/ai/sessions
/academy/ai/personalization
/academy/ai/escalations
/academy/ai/drafts
```

---

## 11.2 `/academy/ai/sessions`

### AI Teaching Sessions

Purpose:

Review AI-guided learning sessions and pedagogy signals.

Supports:

- session history
- learner
- course
- duration
- mode
- escalation state
- pedagogy signals

Do not expose unnecessary private conversation content outside authorized roles.

---

## 11.3 `/academy/ai/personalization`

### Personalization

Purpose:

Manage or inspect learning personalization state.

Supported dimensions:

- pace
- tone
- difficulty
- delivery preferences

---

## 11.4 `/academy/ai/drafts`

### AI Draft Review

Purpose:

Human approval queue for AI-generated instructional material.

Supports:

- AI-generated lecture drafts
- course descriptions
- assignments
- practice tests
- quiz items
- explanations
- supplementary resources
- roleplay scenarios
- accessibility variants

AI-generated content must not publish without the required human approval gate.

---

# 12. COMMUNICATION

## 12.1 `/academy/announcements`

### Announcements

Purpose:

Course, cohort, and learner communication.

Views:

```text
/academy/announcements
/academy/announcements/new
/academy/announcements/:announcementId
/academy/announcements/:announcementId/edit
```

Supports:

- course announcements
- cohort announcements
- instructor broadcasts
- scheduled announcements
- attachments

---

## 12.2 `/academy/messages`

### Messages

Purpose:

Administrative/instructor communication workspace.

Views:

```text
/academy/messages
/academy/messages/:conversationId
/academy/messages/new
```

Supports:

- direct messages
- learner communication
- staff communication
- attachments
- message search
- conversation history

---

## 12.3 `/academy/notifications`

### Notifications

Purpose:

Notification administration and delivery monitoring.

Views:

```text
/academy/notifications
/academy/notifications/preferences
/academy/notifications/delivery
```

Channels:

- email
- SMS
- push

Triggers include:

- announcements
- cohort milestones
- live-session reminders
- clock-hour deadlines
- at-risk nudges
- support follow-up
- credential issuance

---

# 13. MEDIA

## 13.1 `/academy/media`

### Media Library

Purpose:

Central video, audio, image, and instructional media repository.

Views:

```text
/academy/media
/academy/media/new
/academy/media/:mediaId
/academy/media/:mediaId/edit
```

Supports:

- video
- audio
- images
- playlists
- captions
- transcripts
- accessibility variants
- media metadata

---

## 13.2 `/academy/files`

### Files

Purpose:

Document and attachment management.

Views:

```text
/academy/files
/academy/files/new
/academy/files/:fileId
```

Supports:

- upload
- drag and drop
- folders
- external cloud storage
- document resources
- shared files
- attachments

---

## 13.3 `/academy/scorm`

### SCORM / xAPI

Purpose:

Manage standards-based external learning content and tracking.

Views:

```text
/academy/scorm
/academy/scorm/new
/academy/scorm/:packageId
/academy/scorm/:packageId/edit
/academy/scorm/activity
```

Supports:

- SCORM packages
- xAPI-compatible content
- launch configuration
- tracking
- reporting
- content integration

---

# 14. REPORTING

## 14.1 `/academy/analytics`

### Analytics

Purpose:

User-friendly operational analytics.

Views:

```text
/academy/analytics
/academy/analytics/learners
/academy/analytics/courses
/academy/analytics/cohorts
/academy/analytics/assessments
/academy/analytics/credentials
```

Supports:

- real-time data insights
- learner analytics
- course analytics
- cohort analytics
- assessment reporting
- completion reporting
- custom report generation

---

## 14.2 `/academy/compliance`

### Compliance

Purpose:

Central compliance and audit-readiness workspace.

Views:

```text
/academy/compliance
/academy/compliance/reports
/academy/compliance/consent
/academy/compliance/audit-log
```

Supports:

- clock-hour audit
- funder reporting
- state-board compliance
- minor-consent guardrails
- platform audit log
- report exports

---

## 14.3 `/academy/audit-ledger`

### Audit Ledger

Purpose:

Audit-grade clock-hour and activity ledger.

Views:

```text
/academy/audit-ledger
/academy/audit-ledger/:learnerId
/academy/audit-ledger/:learnerId/entries
```

The source requires grooming clock hours to be:

- immutable
- computed
- human-verified
- audit-grade

The ledger is the compliance source of truth for clock hours.

---

## 14.4 `/academy/funder-reports`

### Funder Reports

Purpose:

Generate and manage funder/grant reporting.

Views:

```text
/academy/funder-reports
/academy/funder-reports/new
/academy/funder-reports/:reportId
/academy/funder-reports/:reportId/export
```

Supports:

- grant outcome reports
- workforce outcomes
- enrollment
- completion
- clock hours
- credentials
- relevant support/outcome measures

---

# 15. PLATFORM

## 15.1 `/academy/integrations`

### Integrations

Purpose:

Manage connections between Academy and external/platform services.

Potential integration areas supported by the source:

- shared identity
- platform bridge
- content systems
- cloud storage
- communication channels
- external learning standards

---

## 15.2 `/academy/migration`

### Data Migration

Purpose:

Move existing learning data into All About Pawz Academy.

Views:

```text
/academy/migration
/academy/migration/new
/academy/migration/:migrationId
/academy/migration/:migrationId/review
```

Supports:

- migration jobs
- validation
- import mapping
- migration review
- migration status
- error reporting

---

## 15.3 `/academy/import-export`

### Import / Export

Purpose:

Administrative data movement.

Views:

```text
/academy/import-export
/academy/import-export/import
/academy/import-export/export
/academy/import-export/history
```

Supports the source-defined:

- bulk course upload
- backup large courses
- restore large courses
- IMS-LTI import/export where applicable
- system integration workflows

---

## 15.4 `/academy/platform-bridge`

### Platform Bridge / Conversion

Purpose:

Connect Academy outcomes to the All About Pawz software platform.

Views:

```text
/academy/platform-bridge
/academy/platform-bridge/eligible
/academy/platform-bridge/conversions
/academy/platform-bridge/:conversionId
```

Supports:

- credential eligibility
- explicit learner opt-in
- free post-graduation software license grant
- salon conversion record
- software-platform handoff

The source specifically describes this as a real FK-backed conversion rather than a loose reference.

---

## 15.5 `/academy/settings`

### Settings

Purpose:

Academy administration and preferences.

Recommended subsections:

```text
/academy/settings
/academy/settings/profile
/academy/settings/organization
/academy/settings/roles
/academy/settings/permissions
/academy/settings/notifications
/academy/settings/accessibility
```

Identity and tenant data remain based on the shared identity layer described by the source rather than creating a second independent identity system.

---

# 16. CURRICULUM AUTHORING WORKFLOW

The authoring experience should be routable as a hierarchy rather than a collection of disconnected pages.

```text
Pathway
  ↓
Program / Course
  ↓
Module
  ↓
Lesson
  ↓
Content Blocks
  ↓
Assessment / Practice
  ↓
Skills Target
  ↓
Version
  ↓
Review
  ↓
Publish
```

Example:

```text
/academy/pathways/:pathwayId
    /courses/:courseId
        /modules/:moduleId
            /lessons/:lessonId
                /edit
```

The course authoring screen should provide navigation between these layers without forcing the user to repeatedly return to the dashboard.

---

# 17. DASHBOARD → ROUTE MAPPING

The dashboard's management cards should map directly to these routes.

| Dashboard Area | Primary Route |
|---|---|
| Curriculum Management | `/academy/curriculum` |
| Pathways | `/academy/pathways` |
| Courses | `/academy/courses` |
| Modules | `/academy/modules` |
| Lessons | `/academy/lessons` |
| Content Blocks / Content Library | `/academy/content` |
| Learner & Delivery | `/academy/enrollments` |
| Cohorts | `/academy/cohorts` |
| Live Sessions | `/academy/live-sessions` |
| Calendar | `/academy/calendar` |
| Assessment & Grading | `/academy/grading` |
| Assessments | `/academy/assessments` |
| Question Bank | `/academy/question-bank` |
| Submissions | `/academy/submissions` |
| AI Instructor | `/academy/ai` |
| AI Sessions | `/academy/ai/sessions` |
| AI Draft Review | `/academy/ai/drafts` |
| Skills & Credentials | `/academy/skills` |
| Credentials | `/academy/credentials` |
| Badges | `/academy/badges` |
| Verification | `/academy/verification` |
| Compliance & Reporting | `/academy/compliance` |
| Analytics | `/academy/analytics` |
| Audit Ledger | `/academy/audit-ledger` |
| Funder Reports | `/academy/funder-reports` |
| Media & Content Assets | `/academy/media` |
| Communication | `/academy/messages` |
| Whole-Human Support | `/academy/support` |
| Integrations | `/academy/integrations` |
| Data Migration | `/academy/migration` |
| Import / Export | `/academy/import-export` |
| Platform Bridge / Conversion | `/academy/platform-bridge` |
| Settings | `/academy/settings` |

---

# 18. MANAGEMENT TOOL RELATIONSHIPS

The management UI should make these relationships visible.

```text
IDENTITY
  │
  ├── Learners
  ├── Instructors
  ├── Organization Admins
  └── Platform Admins
        │
        ▼
CURRICULUM
  Pathways
      ↓
  Programs / Courses
      ↓
  Modules
      ↓
  Lessons
      ↓
  Content Blocks
      │
      ├── Media
      ├── AI Instructor
      └── Skills
        │
        ▼
DELIVERY
  Enrollments
      ↓
  Cohorts
      ↓
  Pacing / Delivery Mode
      ↓
  Live Sessions
        │
        ▼
PROGRESS
  Lesson Progress
      ↓
  Module Progress
      ↓
  Course Completion
      ↓
  Clock-Hour Ledger
        │
        ├── Assessment
        ├── AI Teaching
        └── Compliance
        │
        ▼
ASSESSMENT
  Questions
  Rubrics
  Assignments
  Submissions
  Grading
        │
        ▼
SKILLS / CREDENTIALS
  Skills
  Signoffs
  Credentials
  Badges
  Verification
        │
        ├── Platform Bridge
        └── Public Verification
```

---

# 19. WHOLE-HUMAN SUPPORT RELATIONSHIP

Whole-Human Support should not be treated as a generic help page.

It is a management domain connected to:

```text
Learner
   │
   ├── Support Referral
   ├── Safety Incident
   ├── Navigator Caseload
   ├── Benefits-Cliff Coaching
   └── Workforce Outcome
```

The administrative route is:

```text
/academy/support
```

with:

```text
/academy/support/referrals
/academy/support/incidents
/academy/support/caseload
/academy/support/outcomes
```

Access must remain private and role-controlled.

---

# 20. AI MANAGEMENT RELATIONSHIP

The AI area has two distinct responsibilities and should not be collapsed into one generic chatbot screen.

```text
AI INSTRUCTOR
│
├── Teaching Sessions
│   └── /academy/ai/sessions
│
├── Personalization
│   └── /academy/ai/personalization
│
├── Human Escalations
│   └── /academy/ai/escalations
│
└── Draft Review
    └── /academy/ai/drafts
```

AI authoring assistance includes:

- lecture drafting
- course descriptions
- quizzes
- assignments
- practice tests
- practice-test explanations
- coding test cases
- roleplay scenarios
- supplementary resources
- captions / accessibility variants

Human approval remains the publishing gate for AI-generated curriculum content.

---

# 21. PERMISSION-AWARE SIDEBAR

The sidebar should not assume every tenant has every management function.

### Individual tenant

Can have:

- personal dashboard
- own enrollments
- own progress
- own credentials
- own AI sessions
- own support view

Does not own:

- organization roster
- cohort creation
- aggregate learner dashboards
- funder rollups
- organization-wide grading queues

### Organization tenant

Can have:

- roster management
- cohorts
- grading/review queue
- aggregate progress
- at-risk dashboards
- funder/compliance reporting
- partnership metadata
- support visibility subject to RLS

### Platform administration

Can have:

- cross-tenant staff views
- platform-level curriculum management
- platform compliance
- platform audit
- conversion / bridge management

The frontend should hide unauthorized sections, but authorization must also be enforced server-side.

---

# 22. ROUTER STRUCTURE

Recommended conceptual router tree:

```text
app/
└── academy/
    ├── layout
    ├── page
    │
    ├── curriculum/
    ├── pathways/
    ├── courses/
    ├── modules/
    ├── lessons/
    ├── content/
    ├── learning-paths/
    │
    ├── enrollments/
    ├── cohorts/
    ├── live-sessions/
    ├── calendar/
    │
    ├── learners/
    ├── roster/
    ├── progress/
    ├── at-risk/
    ├── support/
    │
    ├── assessments/
    ├── question-bank/
    ├── rubrics/
    ├── grading/
    ├── submissions/
    │
    ├── skills/
    ├── credentials/
    ├── badges/
    ├── verification/
    │
    ├── ai/
    │   ├── sessions/
    │   ├── personalization/
    │   ├── escalations/
    │   └── drafts/
    │
    ├── announcements/
    ├── messages/
    ├── notifications/
    │
    ├── media/
    ├── files/
    ├── scorm/
    │
    ├── analytics/
    ├── compliance/
    ├── audit-ledger/
    ├── funder-reports/
    │
    ├── integrations/
    ├── migration/
    ├── import-export/
    ├── platform-bridge/
    └── settings/
```

---

# 23. GLOBAL UI ACTIONS

These are global actions rather than sidebar destinations.

## Header

```text
Global Search
Notifications
Tenant / Organization Context
User Profile
Settings
```

## Quick Create

A global create action may expose:

```text
New Pathway
New Course
New Module
New Lesson
New Enrollment
New Cohort
New Live Session
New Assessment
New Announcement
Upload Media
Upload File
```

The action should route to the appropriate `/new` route rather than duplicate creation logic.

---

# 24. REQUIRED PAGE STATES

Every management list/detail route should account for:

```text
Loading
Empty
Populated
Error
Unauthorized
Not Found
Unsaved Changes
Success
Validation Error
```

For management tables:

```text
Search
Filter
Sort
Pagination
Bulk Selection
Bulk Actions
Column/field visibility where appropriate
```

For authoring:

```text
Draft
Saved
Unsaved Changes
In Review
Approved
Published
Archived
```

---

# 25. IMPLEMENTATION PRINCIPLE

This is the administrative operating system for All About Pawz Academy.

The sidebar is not intended to be a collection of disconnected CRUD pages.

The primary navigation represents the Academy's management domains:

```text
LEARNING
→ DELIVERY
→ LEARNERS
→ ASSESSMENT
→ CREDENTIALS
→ AI
→ COMMUNICATION
→ MEDIA
→ REPORTING
→ PLATFORM
```

Each domain must have:

1. A list/overview view
2. A detail view where applicable
3. Creation/edit workflow where applicable
4. Search/filter where applicable
5. Role-aware access
6. Links to related domains
7. Dashboard deep links
8. Consistent breadcrumbs and page headers

The dashboard is the entry point.

The sidebar is the persistent management map.

The resource routes are the actual workspaces.

The route hierarchy should mirror the Academy domain model rather than creating arbitrary screens.
