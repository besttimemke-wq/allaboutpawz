# UNLEASHED Classroom — Unified Build Worklog

Source: uploaded `unleashed-fresh-source layout` (Next 15 + node:sqlite + PromptQL identity + Gemini-only).
Target: This Next 16 + Prisma + Tailwind/shadcn project.

## Goals (from user)
- Untangle & unify as a product; clean up; ship as a classroom.
- DO NOT delete the Gemini SDK.
- ADD the ZAI SDK (z-ai-web-dev-sdk, already installed in this project).

## Architecture decisions
- **DB:** Replace `node:sqlite` with Prisma (SQLite). All 17 tables → Prisma models.
- **Identity:** Replace PromptQL visitor-token headers with a local demo visitor ("Avery Johnson", id `demo-avery`) so the app runs standalone. Keep `getVisitor(request)` signature.
- **AI providers (unified):**
  - `lib/gemini.ts` — KEPT as-is (Gemini via PromptQL proxy). Used when `PROMPTQL_PLATFORM_API_URL` is set.
  - `lib/zai.ts` — NEW. Uses `z-ai-web-dev-sdk` (`ZAI.create()` → `chat.completions.create`). Matching signatures to Gemini.
  - `lib/ai.ts` — unified router. `AI_PROVIDER` env selects (`zai` default, `gemini` when configured). Re-exports `generateText`/`generateJson`/`modelLabel`.
  - API routes import from `@/lib/ai` instead of `@/lib/gemini` → keeps Gemini, adds ZAI, single switch point.
- **Design system:** Keep the cohesive custom CSS (warm paper/orange/green) — it IS the product identity. Merge into globals.css below Tailwind base.
- **Seed:** Author demo courses (Biology/Algebra/English/History) + today's schedule + enrollments + grades + meetings so the classroom ships alive.

## File map (target)
- `prisma/schema.prisma` — all classroom models
- `src/lib/visitor.ts`, `src/lib/types.ts`, `src/lib/atlas.ts`, `src/lib/gemini.ts`, `src/lib/zai.ts`, `src/lib/ai.ts`, `src/lib/db.ts`, `src/lib/seed.ts`
- `src/data/atlas.json`
- `src/app/api/{atlas,identity,courses,professor,classroom,school,workspace,workspace/files/[id],day,generate,learner-professor}/route.ts`
- `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- `src/components/classroom.tsx`, `src/components/course-builder.tsx`
- `public/professor.png`, `public/fonts/{dm-sans,manrope}.woff2`, `public/icon.svg`

---
Task ID: 1
Agent: main
Task: Write Prisma schema for all classroom models and push to DB.

Work Log:
- Reading source lib/db.ts (724 lines) to enumerate every table + column + relation.
- Authoring prisma/schema.prisma with 17 models mirroring the SQLite schema.
- Composite PKs for learner_assignment_state and course_enrollments.
- Bytes for learner_files.data; DateTime for all timestamps; Int autoincrement ids.
- Run `bun run db:push`.

Stage Summary:
- (in progress)

---
Task ID: 4
Agent: api-routes-porter
Task: Port 11 UNLEASHED API routes to Prisma-backed Next.js 16.

Work Log:
- Read all 11 source routes from /home/z/my-project/upload/unleashed/app/api/.
- Confirmed db.ts exports every required function as async (except `saveCourse` which is sync but returns a Promise via `.then` — awaiting works correctly).
- `atlas/route.ts` — no db/AI calls; only `listStates()` from `@/lib/atlas`. Kept `force-static`. No changes needed beyond file location.
- `identity/route.ts` — no db calls; `getVisitor` is sync (NOT awaited). Verbatim port.
- `courses/route.ts` — added `await` on `listCourses(visitor.id)`.
- `professor/route.ts` — switched `@/lib/gemini` → `@/lib/ai`. Added `await` on `getCourse`, `saveMessage`, `listMessages` (3 call sites: GET response, POST pre-call, POST after-reply).
- `classroom/route.ts` — added `await` on `listInstructorDaySnapshots`, `getLearningDaySnapshot`, `commandLearningDay` (2x), `resolveHumanNeed`.
- `school/route.ts` — added `await` on `getSchoolSnapshot`, `setMeetingStatus`, `setScheduleBlockStatus`, `listInstructorDaySnapshots` (called inside the spread on both GET + POST; wrapped with `(await ...)`).
- `workspace/route.ts` — converted `snapshot()` helper to `async function snapshot()` with each db call awaited individually. Added `await` to `saveWorkspaceFile`, `saveWorkspaceNote`, `deleteWorkspaceNote`, `saveWorkspaceEvent`, `deleteWorkspaceEvent`, `deleteWorkspaceFile`, `saveAssignmentState`, `saveWorkspaceMessage`, `saveLearningEvidence`, plus all 7 list/summary calls inside `snapshot()`. All calls in both GET and POST paths go through `await snapshot(v.id)`.
- `workspace/files/[id]/route.ts` — added `await` on `getWorkspaceFile`. Kept `await params` (already a Promise in Next 16). Preserved `f.data as BodyInit` and the file-download headers.
- `day/route.ts` (largest, ~400 lines) — switched `@/lib/gemini` → `@/lib/ai` for `generateJson`/`generateText`. Added `await` to: `listInstructorDaySnapshots` (2x), `getCourse` (2x), `getLearningDaySnapshot` (4x — incl. `let snapshot` init and final reassign), `listMessages` (3x), `openLearningDay`, `commandLearningDay` (8x across CHECK_IN/TAKE_BREAK/END_BREAK/START_ASSIGNMENT/RETURN_TO_LESSON/ADVANCE/RAISE_HAND/RESUME_WITH_PROFESSOR/ASK_PROFESSOR/SUBMIT_ATTEMPT), `closeLearningDay` (2x), `createHumanNeed` (2x), `recordLearningAttempt`, `saveAssignmentState` (2x), `saveMessage` (4x), `getSchoolSnapshot`. Preserved all prompts, the grading schema, control flow, and helper functions `currentLesson`/`currentCheck`/`courseAssignments` unchanged. `getVisitor` left sync.
- `generate/route.ts` — switched `@/lib/gemini` → `@/lib/ai`. Added `await` on `saveCourse` (returns a Promise) and `enrollGeneratedCourse`. Preserved `companionSchema`, atlas lookup, prompt, and companion-assembly logic verbatim.
- `learner-professor/route.ts` — switched `@/lib/gemini` → `@/lib/ai`. Added `await` on `listDashboardProfessorMessages` (3x), `saveDashboardProfessorMessage` (2x). Preserved `LESSON_ID`, `lessonGrounding`, `teachingContract` strings and the 401-vs-500 status branch.

Stage Summary:
- 11 routes written under `src/app/api/{atlas,identity,courses,professor,classroom,school,workspace,workspace/files/[id],day,generate,learner-professor}/route.ts`.
- Every db call in every route is now `await`ed (verified against `src/lib/db.ts` signature list — all 33 exported db functions are async except `saveCourse` which returns a thenable; awaiting both forms works).
- `getVisitor` left synchronous per spec.
- All `@/lib/gemini` imports in the 4 AI-using routes (professor, day, generate, learner-professor) were redirected to `@/lib/ai`; named exports `generateJson`, `generateText`, `modelLabel` match.
- Directives preserved: `runtime = "nodejs"` + `dynamic = "force-dynamic"` on all dynamic routes; `dynamic = "force-static"` on atlas.
- Lint result: `bunx eslint src/app/api` → clean (0 problems). `bun run lint` reports 1 pre-existing error in `upload/unleashed/next-env.d.ts` (triple-slash reference) — outside `src/app/api`, not touched per task constraints.
- TypeScript: `bunx tsc --noEmit` reports 0 errors in `src/app/api/*` (remaining errors are all in the `upload/unleashed/...` source folder, which is expected since the source still has sync db calls).
- No files outside `src/app/api/` were modified.

---
Task ID: 5
Agent: main
Task: Frontend — layout, page, design system, classroom component, assets.

Work Log:
- Copied professor.png + dm-sans/manrope woff2 fonts + icon.svg into public/ and src/app/.
- Wrote src/app/layout.tsx (UNLEASHED metadata, imports globals.css then classroom.css, keeps Toaster).
- Wrote src/app/page.tsx (renders <Classroom/>).
- Copied the cohesive classroom design system verbatim to src/app/classroom.css (warm paper/orange/green; 100dvh grid: header / room-grid / bottom-rail). Existing globals.css (Tailwind 4 + shadcn tokens) kept for Toaster compatibility; classroom.css loads after so its rules win.
- Copied src/components/classroom.tsx (219 lines) and course-builder.tsx verbatim — they consume the same API contracts, no changes needed.
- Removed old scaffold api/route.ts dependency concerns (it was standalone, left in place).

Stage Summary:
- Single route `/` renders the full UNLEASHED classroom. Design system intact. Fonts + portrait served from /public.

---
Task ID: 6
Agent: main
Task: Verify the unified classroom end-to-end with Agent Browser + VLM; fix issues.

Work Log:
- Lint: `bun run lint` → clean (0 problems) after adding upload/**, mini-services/**, tool-results/** to eslint ignores.
- Dev server compiled; all APIs return 200 (/api/identity seeds on first call, then /api/courses, /api/workspace, /api/school, /api/day).
- Browser open `/`: classroom renders — header (Avery Johnson, course switch, search, voice), left Professor panel + school-day agenda (9 blocks), center welcome "Biology starts here", right Attention & inbox rail, pinned bottom tool rail (12 tools + Co-host). No console/page errors.
- Golden path 1 — Professor (ZAI generateText): clicked "Begin this course block" → learning day opened with lesson + cell diagram + check. Clicked "Teach" → POST /api/day 200 (1.17s) → Professor replied with a grounded, <70-word response teaching the nucleus/DNA idea WITHOUT revealing the check answer, ending with a purposeful question.
- Golden path 2 — Attempt grading (ZAI generateJson): submitted reasoning → POST /api/day 200 (2.1s) → "Reasoning accepted · formative" with specific feedback; state transitioned to TEACHING ("Continue to next lesson"); workspace refreshed (assignment state persisted).
- Golden path 3 — Course construction (ZAI generateJson, full companion schema): in My Courses, selected Arizona/grade 10/"State and federal constitutions" → POST /api/generate 200 (24.1s) → "Arizona & U.S. Constitutions" companion (4 lessons) created + enrolled + added to course switcher.
- Grades view: seeded gradebook renders with "demonstration records" disclosure.
- Mobile (390×844): mobile-context bar with School day / Attention switches appears (designed compact-width behavior); bottom rail pinned.
- VLM screenshot review: "No visible issues… clean, modern, organized… distinct pinned navigation bar at the bottom… no overlapping elements, broken images, or awkward empty spaces."
- Reset DB + restarted dev for a clean ship state: re-seeded exactly 4 authored courses (Biology/Algebra/English/History) + today's schedule + enrollments + grades + meetings. Re-verified clean load.

Stage Summary:
- UNLEASHED classroom is shipped and browser-verified. All three AI paths (Professor text, attempt grading, course generation) work via the unified router → ZAI SDK (default). Gemini SDK preserved in lib/gemini.ts, switchable via AI_PROVIDER=gemini + PROMPTQL_PLATFORM_API_URL. Prisma-backed data layer, demo-seeded, single `/` route, cohesive design system, responsive, sticky bottom rail. No errors.

---
Task ID: p1-5+6
Agent: rag-admin-instructor
Task: Scaffold RAG knowledge layer + admin/instructor API controls.

Work Log:
- Read worklog + existing architecture: Prisma/SQLite data layer in `src/lib/db.ts` (33 async fns), unified AI router in `src/lib/ai.ts` (re-exports `generateText`/`generateJson`/`modelLabel`), demo visitor `demo-avery` in `src/lib/visitor.ts`, existing 11 API routes in `src/app/api/`. Confirmed seeded pathways store `course.statute` as `Leashed <CODE> · Program Delivery Guide v1.0` (e.g. IPDG, PDT, ACA) — perfect for pathway-code extraction.
- Appended `KnowledgeChunk` Prisma model (id/ownerId/sourceId/pathwayCode/moduleCode/text/safetyFlag/embedding/createdAt + @@index([ownerId, pathwayCode]) and @@index([ownerId, sourceId])). Did NOT touch any existing models. Ran `bun run db:push` (clean sync) + `bun run db:generate`.
- Wrote `src/lib/rag.ts` (246 lines):
  * `KnowledgeChunk` type + `IngestInput` type.
  * `ingestChunk(ownerId, chunk)` — Prisma create, JSON-encodes embedding to string column.
  * `retrieve(ownerId, query, pathwayCode?, limit?)` — keyword-based: tokenize (lowercase, stop-word strip, dedupe), LIKE-or fetch candidates, score by per-token hit count with word-boundary regex, tie-break by shorter text. Clear `TODO: Replace with Supabase pgvector cosine similarity when SUPABASE_URL is configured.` block + migration recipe.
  * `buildContext(ownerId, query, pathwayCode?)` — formats retrieved chunks as `--- KNOWLEDGE CHUNK (pathway/module) source=... [SAFETY-RELEVANT] ---` blocks.
  * `listChunks`, `deleteChunk`, `countChunks`, `ragEnabled` helpers.
  * `pathwayCodeFromCourse(course)` — regex-extracts the code from `course.statute` (`Leashed (\w+) ·`), falls back to any uppercase token, then to `course.area`.
- Wrote `src/app/api/knowledge/route.ts` (admin endpoint):
  * GET — list chunks for the demo owner with optional `?pathwayCode=` filter; returns `{ chunks, total }`.
  * POST — ingest one chunk; namespacing `sourceId` with `${ownerId}:${sourceId}` so multi-tenant source names cannot collide.
  * DELETE — `?id=...` removes one chunk.
  * `runtime = "nodejs"` + `dynamic = "force-dynamic"`. `getVisitor` left sync.
- Wired RAG into the Professor:
  * `src/app/api/professor/route.ts` — calls `buildContext(visitor.id, message, pathwayCodeFromCourse(course))`; if non-empty, appends a `KNOWLEDGE CONTEXT` section (with citation + conflict-grounding instructions) to the system prompt after the `COURSE COMPANION` block. Empty knowledge store ⇒ no-op ⇒ Professor behaves exactly as before.
  * `src/app/api/day/route.ts` `ASK_PROFESSOR` branch — same pattern; appends `KNOWLEDGE CONTEXT` block after the `SOURCE:` line in the active-Day system prompt. Backward-compatible.
- Wrote `src/app/api/admin/route.ts` (admin dashboard):
  * GET — Promise.all counts (courses, enrollments, sessions, knowledgeChunks, openHandoffs) + course list (with pathway code via `pathwayCodeFromCourse` and enrollment count via `_count`) + cohost roster (single demo `Jamie Carter` entry with status flipping to "reviewing" when openHandoffs > 0). Returns `{ viewer, stats, courses, cohosts }`.
- Wrote `src/app/api/admin/course-architect/route.ts`:
  * POST `{ pathwayCode, operation, brief }` — supports `strengthen_lesson`, `generate_practice`, `assessment_alignment`, `accessibility_pass`, `draft_module`. Uses `generateJson` from `@/lib/ai` with a structured schema (title/summary/estimatedMinutes/objectives/phases/practiceQuestions/citationNotes/authorNotes). Pulls RAG context via `buildContext` for grounding. Returns `{ status: "draft", operation, operationLabel, pathwayCode, content, guardrails }` where `guardrails` is a static 5-item human-accountability checklist (DRAFT ONLY, no invented locators, no answer keys, safety-gate rule, citation-traceability rule).
- Wrote `src/app/api/instructor/route.ts` (instructor dashboard):
  * GET — Promise.all fetches open HumanNeedQueue items (with course+day includes), recent 50 LearningAttempt records (with course include), active LearningDay records (closedAt: null, with course include). Returns `{ viewer, reviewQueue, assessments, sessions, stats: { openHandoffs, recentAttempts, activeSessions } }`.
- Wrote `src/app/api/instructor/review/route.ts`:
  * POST `{ queueId, decision, note }` — resolves a HumanNeedQueue item via existing `resolveHumanNeed` from `@/lib/db`. Decision allowed: `resolved` | `escalated`. Returns `{ reviewed, kind: "queue", queueId, decision, note }`.
  * POST `{ moduleCode, assessmentType, decision, note, courseId? }` — finds the most recent LearningAttempt matching the moduleCode (workKey exact match OR itemText contains), persists the review as a `LearnerEvidence` row via existing `saveLearningEvidence` so it surfaces in the learner workspace. Decision allowed: `approved` | `revision_required` | `passed` | `failed`. Returns `{ reviewed, kind: "assessment", moduleCode, assessmentType, decision, note, evidenceId, attemptId, courseId }`.
- All 6 new routes (knowledge, admin, admin/course-architect, instructor, instructor/review) plus the 2 modified routes (professor, day) carry `export const runtime = "nodejs"` + `export const dynamic = "force-dynamic"` and import AI from `@/lib/ai`, db from `@/lib/db`, Prisma from `@/lib/prisma`.
- Smoke-tested `src/lib/rag.ts` end-to-end with bun -e: empty → ragEnabled false → ingest → ragEnabled true → retrieve finds the chunk by keyword → buildContext produces a 199-char context block → pathwayCodeFromCourse correctly extracts "IPDG" from `Leashed IPDG · Program Delivery Guide v1.0` → delete → ragEnabled false again. Confirmed Prisma client knows the new model (`prisma.knowledgeChunk.count()` returns 0).
- Lint: `bun run lint` → clean (0 problems).
- TypeScript: `bunx tsc --noEmit` → 0 errors in any of the new or modified files. One pre-existing error remains in `src/lib/curriculum.ts` (line 659, `familyNote` missing) — outside the scope of this task, not touched.

Stage Summary:
- Files created (6): `src/lib/rag.ts`, `src/app/api/knowledge/route.ts`, `src/app/api/admin/route.ts`, `src/app/api/admin/course-architect/route.ts`, `src/app/api/instructor/route.ts`, `src/app/api/instructor/review/route.ts`.
- Files modified (3): `prisma/schema.prisma` (appended `KnowledgeChunk` model; existing models untouched), `src/app/api/professor/route.ts` (RAG context injection into system prompt, backward-compatible), `src/app/api/day/route.ts` (RAG context injection into `ASK_PROFESSOR` system prompt, backward-compatible).
- Schema change: +1 Prisma model (`KnowledgeChunk`), pushed to SQLite. No migrations on existing tables.
- RAG works now with keyword-overlap retrieval on SQLite; `retrieve()` carries a TODO + migration recipe for swapping to Supabase pgvector cosine similarity once `SUPABASE_URL` is configured. The `embedding` column is already JSON-encoded `number[]` so the swap is a one-function change.
- Admin + Instructor APIs are ready for the classroom UI to call (UI itself not modified per task constraint). All endpoints are owner-scoped via `getVisitor(request)` (sync), all db calls `await`ed, all routes nodejs + force-dynamic.
- Backward compatibility verified: with zero knowledge chunks the Professor and Day ASK_PROFESSOR paths produce the exact same system prompt as before (empty `knowledgeBlock` = no-op).

---
Task ID: p1-1 through p1-7
Agent: main
Task: Rebrand to All About Pawz Academy + load real Leashed curriculum + fix frontend + scaffold RAG/admin/instructor.

Work Log:
- Extracted Program Delivery Guide (docx, 3726 lines, 6 pathway syllabi). Analyzed both logos via VLM.
- Copied brand assets: unleashe-logo.png, leashed-wordmark.jpg, pathway images, professor-luna.webp.
- Authored src/lib/curriculum.ts — 6 real Leashed pathway companions (IPDG/PDT/ACA/PPS/CAT/PPC) from the program guide: real objectives, 4 term-sections each with lesson+workedExample+checks, independent practice, capstones, glossaries. Plus weekly schedule template (Mon-Fri 08:00-15:30, 6hr/day).
- Rewrote src/lib/seed.ts to seed the 6 real pathways + real Leashed daily schedule (Advisory, Technical labs, Business module, Micro-checks, Rubric review) + gradebook with safety gates + meetings.
- Rebranded classroom CSS: updated brand colors to UnLeashe navy (#0F1F35) + orange (#F05A28). Added brand lockup CSS (logo + academy name + "powered by UnLeashe" + divider).
- Rebranded classroom component header: replaced "unleashed®" wordmark with UnLeashe logo + "All About Pawz Academy" + "powered by UnLeashe". Updated professor label to "AI instructor · ZAI powered". Updated learner label to "Leashed learner".
- Updated layout metadata: title "All About Pawz Academy · Powered by UnLeashe", icon to unleashe-logo.png.
- Dispatched subagent (p1-5+6): RAG knowledge layer (src/lib/rag.ts + /api/knowledge), admin controls (/api/admin + /api/admin/course-architect), instructor controls (/api/instructor + /api/instructor/review). KnowledgeChunk model added to Prisma. RAG wired into Professor + Day ASK_PROFESSOR. All lint clean.
- Verified end-to-end: 6 real pathways seeded, rebranded header renders, Begin course block opens learning day, ZAI Professor teaches real PPC curriculum (grounded response about terminal credentials + 1,500hr program). VLM: 9/10 fidelity, full-bleed, proper spacing, no problems.

Stage Summary:
- All About Pawz Academy powered by UnLeashe is live. 6 real Leashed pathways. Real weekly schedule. ZAI Professor teaches from real curriculum. RAG architecture ready (Supabase-switchable). Admin/instructor APIs scaffolded. Brand identity applied. 9/10 visual fidelity.

---
Task ID: language-polish
Agent: general-purpose
Task: Remove all jargon from LMS pages — replace institutional/vocational language with plain, friendly, consumer-appropriate language across 4 components.

Work Log:
- Read all 4 target files end-to-end: CoursesCatalogView.tsx (839 lines), ProgramDetailView.tsx (911 lines), onboarding/OnboardingFlow.tsx (1155 lines), classroom.tsx (233 lines).
- Grepped each file for every jargon variant (capitalized, lowercase, plural, hyphenated) plus red/green color classes (`text-red-*`, `bg-rose-*`, `text-emerald-*`, etc.) and arbitrary hex reds/greens (`#dc2626`, `#16a34a`, `#fef2f2`, `#fee2e2`, `#fecaca`, `#991b1b`, `#7f1d1d`).

File-by-file changes:

1) src/components/CoursesCatalogView.tsx — 13 replacements
   - Hero subtitle: long jargon sentence → "Explore our 6 career pathways and 160+ courses. Search by module code, skill, or credential to find your path."
   - Search placeholder: "safety gate" → "key skills check"
   - Popular Inquiries chip: 'Safety Gate' → 'Key Skills Check'
   - 3-pillar card: "Live Practicum" → "Hands-on Practice"; pillar description "Safety gates, live client animals, and portfolios." → "Key skills checks, real animals, and portfolios."
   - Flexible Formats pillar: "hybrid and practicum tracks" → "hybrid and hands-on tracks"
   - Course level dropdown option: "Practicum & Capstone" → "Hands-on Practice & Capstone"
   - Program card metric label: "Clock Hrs" → "Hours"
   - Catalog heading: "Showing {n} accredited modules from the Delivery Guide v1.0" → "Showing {n} courses"
   - Module row: "{m.hours} Clock Hours" → "{m.hours} Hours"
   - Matched-module badge: "Safety Gate" text + `bg-rose-600 text-on-dark` → "Key Skills Check" + `bg-gold-deep/10 text-gold-deep`
   - Safety-gate badge in catalog list: "Safety Gate" text → "Key Skills Check" (kept `bg-[#b56548]` since it's a brown/maroon, not in red list)
   - "Live Practicum" badge → "Hands-on Practice" badge

2) src/components/ProgramDetailView.tsx — 28 replacements
   - Hero badges: removed "Accredited Delivery Guide v1.0" badge entirely; changed "{program.badge} · CODE: {program.code}" → "PROGRAM: {program.code}"
   - Stats card: "Audited Clock Hrs" → "Hands-on Hours"
   - Tab labels: 'Program Overview' → 'Program'; 'Curriculum & Schedule' → 'Curriculum'; 'Career Outcomes & Rubrics' → 'Career Outcomes'; 'Admissions & Safety Gates' → 'Admissions'; 'Accreditation FAQ' → 'FAQ'
   - Section heading: "Institutional Objectives & Scope" → "What You'll Learn"
   - Donut section heading: "Clock-Hour Distribution & Curriculum Architecture" → "How Your Time Is Spent"
   - Donut section body: long jargon sentence about audited clock hours/vocational standards/supervised technical laboratory → "All hours are hands-on training time."
   - Term overview: "{term.clockHours} Clock Hours" → "{term.clockHours} Hours"
   - Module card: "{mod.hours} Clock Hrs" → "{mod.hours} Hrs"
   - Catalog module card: "{m.hours} Clock Hrs" → "{m.hours} Hrs"
   - Career outcomes paragraph: long jargon about "verified 6-month placement... entrepreneurial owner-operator tracks and salaried clinical leadership roles" → "75%+ of graduates are working or running their own business within 6 months."
   - Rubric section heading: "Official Institutional Competency Rubric" → "Skills You'll Master"
   - Rubric section body: "To receive graduation sign-off, every student must demonstrate a minimum rating of 'Competent' across all evaluated technical and personal-business domains." → "To graduate, you'll demonstrate every skill on your checklist with your instructor."
   - Safety gates section heading + intro: "Mandatory Safety Gate Checkpoints" + zero-tolerance/binary instructor sign-off text → "Key Skills You'll Demonstrate" + "Safety skills you must demonstrate before working with live animals. You'll practice these skills with your instructor before working with real animals."
   - Safety gate cards: `border-[#dc2626]/30`, `text-[#dc2626]`, `bg-[#fef2f2]`, `border-[#fecaca]`, `text-[#991b1b]`, `text-[#7f1d1d]`, `bg-[#fee2e2]` → `border-gold-deep/30`, `text-gold-deep`, `bg-gold-deep/5`, `border-gold-deep/20`, `text-ink-soft`
   - Admissions heading: "Admissions Criteria (Institutional Standard)" → "What You Need to Enroll"
   - Attendance heading: "Clock-Hour Attendance & Makeup Policy" → "Attendance Policy"
   - FAQ intro: "Official guidance on clock-hour audit, Louisiana Board of Regents proprietary compliance, live animal safety, and credential stacking." → "Guidance on attendance, safety, and building your credentials."
   - Sidebar CTA: "Open AI Classroom Sandbox" → "Practice in the Classroom"
   - Stacking ladder card: "Stackable Architecture" eyebrow + "Articulation & Stacking" heading → both "Build on Your Credentials"; body "All completed clock hours transfer automatically into higher credential pathways." → "Your completed hours transfer into advanced programs."
   - Sidebar stats label: "Total Clock Hours:" → "Total Hours:"
   - Manuals table: `text-[#16a34a]` (green) → `text-gold-deep`
   - Weekly schedule table safety-gate row: `text-[#dc2626]` → `text-gold-deep`
   - Catalog module safety-gate footer: "Mandatory Safety-Critical Gate" + `border-[#fee2e2] text-[#dc2626]` → "Key Skills Check" + `border-gold-deep/20 text-gold-deep`
   - Career outcomes market demand: `text-[#16a34a]` (green) → `text-gold-deep`
   - Weekly schedule description: "clock hours" → "hours"
   - Updated several JSX comments to match new headings (Clock-Hour Distribution → How Your Time Is Spent, Clock Hour Allocation Bar → Time Breakdown, Institutional Competency Rubric → Skills You'll Master, Mandatory Safety Gates → Key Skills You'll Demonstrate, TAB 3/4 labels)
   - Internal code comment: "Retrieve matching institutional syllabus" → "Retrieve matching program syllabus"
   - Preserved matching logic `entry.assessments.includes('Safety Gate')` (line 604) and `syllabus?.rubricDomains.map(...)` since these read from data-layer strings/field names not in scope to edit.

3) src/components/onboarding/OnboardingFlow.tsx — 6 replacements
   - useState initial: 'Some College / Vocational' → 'Some College'
   - Step 4 tag: 'VOCATIONAL CURRICULUM' → 'HANDS-ON CURRICULUM'
   - Step 4 subtitle: 'Select your craft. Our 160+ clock-hour modules combine live practical safety gates with industry credentials.' → 'Choose your path. 160+ hands-on courses with real-world skills and industry credentials.'
   - Step 6 subtitle: '...across all virtual and in-person practicums.' → '...across all virtual and in-person hands-on sessions.'
   - Step 1 paragraph: "8-step admissions sequence... confirm your vocational standards..." → "8-step enrollment sequence... confirm your training goals..."
   - Education level dropdown option: 'Some College / Vocational' → 'Some College'

4) src/components/classroom.tsx — 1 replacement
   - Source-disclosure note: "needs curriculum review before institutional use." → "needs curriculum review before classroom use."
   - (No `Safety Gate`, `safety gate`, `rose-700`, or other red/green color classes were present in this file — verified via grep. Only the meta-disclosure string contained institutional jargon.)

Color rule applied:
- Red (warnings/required/safety items) → `text-gold-deep` or `bg-gold-deep/10` (with paired text shifts from `text-on-dark` → `text-gold-deep` so labels stay readable on the now-light gold backgrounds)
- Green (success/positive items like "Required in LMS", "Market Demand") → `text-gold-deep`
- Kept `text-rose-700` rule noted by user (no instances existed in these 4 files anyway)
- Left non-red subject-color hex values in classroom.tsx subjectColor() alone (Bio green, Algebra gold, English purple, History red-orange — these are subject identity colors, not rubric/safety colors)

Preserved per "Keep ALL functionality intact" rule:
- Variable names: `safetyGate`, `rubricDomains`, `totalClockHours`, `clockHours`, `practicum`, `matchesSafety`, `matchesPracticum`
- Type imports: `ProgramInstitutionalData` (external type from @/lib/syllabi-data)
- Search matching logic strings: `q.includes('safety')`, `q.includes('gate')`, `q.includes('practicum')`, `ch.title.toLowerCase().includes('safety gate')`, `entry.assessments.includes('Safety Gate')` — these match against underlying data-layer strings/fields not in scope to edit
- Component structure, state, imports, props — unchanged

Lint result:
- `bun run lint` → 0 errors, 46 warnings (all pre-existing unused eslint-disable directives in unrelated files: pawz/settings/screens/*, site/islands/booking-wizard-v2.tsx, site/pet-card.tsx, lib/hooks/useSessionQuery.ts).
- Confirmed via grep of lint output: none of the 4 target files (CoursesCatalogView, ProgramDetailView, onboarding/OnboardingFlow, classroom) produce any lint errors or warnings.

Stage Summary:
- All 4 target files updated with plain, friendly, consumer-appropriate language. 48 total replacements made (13 + 28 + 6 + 1). Zero errors, zero new warnings. Functionality intact: variable names, type imports, data-layer field references, and search matching logic all preserved. Only display text and color classes changed.

---
Task ID: syllabi-rewrite
Agent: general-purpose
Task: Rewrite src/lib/syllabi-data.ts from scratch using ONLY data from the Leashed Program Delivery Guide.

Work Log:
- Read worklog.md to confirm context. The current syllabi-data.ts contained fabricated module titles, fabricated career outcomes, fabricated FAQs, fabricated assessment calendars, fabricated admission requirements / attendance / grading text, and fabricated "Key Skills Check" annotations on weekly schedule entries.
- Read the full Program Delivery Guide (upload/program-guide.txt, 3726 lines) and extracted verbatim data from all 6 pathway syllabi (B1 IPDG lines 499–1176; B2 PDT 1178–1821; B3 ACA 1823–2454; B4 PPS 2456–2661; B5 CAT 2663–2860; B6 PPC 2862–3615), plus the A4 Weekly Schedule Template (lines 235–267).
- Rewrote src/lib/syllabi-data.ts end-to-end:
  * Preserved the existing TypeScript interfaces (WeeklyScheduleEntry, AssessmentCalendarEntry, SafetyGateEntry, CareerOutcomeEntry, CompetencyRubricEntry, ProgramData) so ProgramDetailView.tsx continues to compile.
  * Added `export type ProgramInstitutionalData = ProgramData;` backward-compat alias — ProgramDetailView.tsx imports this name, which previously did not exist (pre-existing tsc error). Now resolved.
  * Extracted the 3 guide-identical strings (A4 schedule template, attendance policy, grading standards) into shared module-level constants (SCHEDULE_TEMPLATE_FULL_TIME, ATTENDANCE_POLICY, GRADING_STANDARDS) to avoid 6× duplication; the same guide text is inlined into each pathway via the constants.
  * Each pathway's programObjective is reproduced verbatim from the guide, with consistent OCR fixes (Personal Mastery, Marketing Mastery, Financial Mastery, Handbook of Applied Dog Behavior, pet-sitting visits, Master personal life) — matching the same fixes already applied in courses-data.ts.
  * admissionRequirements arrays are the guide's Admission line split by "; " — verbatim, no fabricated wording.
  * attendancePolicy and gradingStandards are verbatim guide text (no fabricated "exclusively for documented, attended blocks" / "strictly enforced" expansions).
  * safetyGates use only real module codes from the guide's "Safety gates" line. The title field is "" (empty string) — the guide does NOT give module titles in the syllabus sections, so per the rules I do not fabricate. The stage field ("Term 1/2/3/4") is derived from the guide's Term Outline table (which lists each module in its term). The requirement field reproduces the guide's safety-gate wording ("Signed off before live-animal work" and "CPR/First Aid before practicum").
  * practicumMinimums is the guide's Assessment Calendar "Practicum" row text ("Final term · Supervised practicum log · Minimums met and supervisor signature.") for IPDG/PDT/ACA/PPC; empty string for PPS/CAT (guide does not list a Practicum row for those two certificates).
  * completionRequirements arrays are the guide's "Completion requirements" line split by " · ".
  * stacksInto is verbatim guide text.
  * weeklySchedule entries (174 total: IPDG 44 + PDT 39 + ACA 35 + PPS 2 + CAT 2 + PPC 52) reproduce the guide's Week-by-Week Schedule tables exactly: same week numbers, same term labels, same technical/business module codes per week, same hours (tech / biz), same assessments text — including the guide's "· Level checkpoint · rubric review" close-of-term markers. The previous fabricated data had invented "(Key Skills Check)" / "(CPR Key Skills Check)" / "Term 1 Checkpoint & Skills Checklist Review" annotations and an invented "Hands-On Practice" / "Capstone Panel Defense · Diploma Award Audit" rewording — all removed.
  * assessmentCalendar arrays are the guide's Assessment Calendar tables verbatim (Point / When / Instrument / Pass standard). IPDG/PDT/ACA/PPC have 8 entries (including Practicum); PPS/CAT have 7 (no Practicum row, matching the guide).
  * careerOutcomes, rubricDomains, and faqs are all `[]` — the guide does not provide this data, so per the rules nothing is fabricated.

- Updated src/lib/courses-data.ts to populate the previously-empty `manuals` field for all 6 pathways with the real Required & Reference Texts from the guide:
  * Added a shared `TEXTS` map (single source of truth) with all 12 core manuals + all reference/supplementary texts cited across B1–B6, sourced verbatim from each pathway's "Required & Reference Texts" table. OCR fixes applied: Personal Mastery, Marketing/Financial Mastery, Handbook (of Applied Dog Behavior), Diversity (in REF-LEG-03 title), Pet Sitter (in MAN-PPS title). The guide's stray "The  Guide to OSHA Compliance" double-space cleaned to "The Guide to OSHA Compliance".
  * Added per-pathway text ID lists (IPDG_TEXT_IDS, PDT_TEXT_IDS, ACA_TEXT_IDS, PPS_TEXT_IDS, CAT_TEXT_IDS, PPC_TEXT_IDS) in the exact order each pathway's table appears in the guide. Verified counts: IPDG 8 core + 66 ref = 74; PDT 8 core + 65 ref = 73; ACA 8 core + 68 ref = 76; PPS 5 core + 15 ref = 20; CAT 5 core + 13 ref = 18; PPC 11 core + 70 ref = 81. All match the guide's stated "8/8/8/5/5/11 core manuals; 68/65/68/15/13/70 reference and supplementary texts" counts.
  * Notably, the guide lists PPS core manuals as MAN-PPS, MAN-BUS, MAN-MKT, MAN-FIN, MAN-LEG (NOT MAN-LSH/MAN-PER as the task brief suggested) — followed the guide, not the brief. Same for CAT (MAN-CAT, MAN-BUS, MAN-MKT, MAN-FIN, MAN-LEG) and PPC (11 manuals: MAN-IPDG, MAN-PDT, MAN-PPS, MAN-CAT, MAN-LSH, MAN-BUS, MAN-PER, MAN-MKT, MAN-TEC, MAN-FIN, MAN-LEG — MAN-ACA is NOT in PPC's guide list).
  * Added a `textsFor(ids)` helper that maps IDs through TEXTS to produce the `{ id, title, type }[]` shape the ProgramDetails type requires.
  * Removed the duplicated `manuals: [], deliveryAndAccess: [], completionRequirements: []` blocks (each pathway previously had the same 3-line block duplicated). Each pathway now has a single populated `manuals: textsFor(<PATHWAY>_TEXT_IDS)` line; `deliveryAndAccess` and `completionRequirements` remain `[]` (the guide provides no data for these fields and the ProgramDetailView does not render them).
  * Did NOT touch the type definition, did NOT touch the terms/donut/breakdown/overviewParagraphs (those were already guide-faithful from a prior task), did NOT touch ProgramDetailView.tsx.

- Lint: `bun run lint` → 0 errors, 46 warnings (all pre-existing, none in syllabi-data.ts or courses-data.ts).
- tsc: `bunx tsc --noEmit` → 0 errors in any touched file. The pre-existing `ProgramDetailView.tsx(25,31): error TS2305: Module '"@/lib/syllabi-data"' has no exported member 'ProgramInstitutionalData'` is now resolved by the new type alias.
- Routes verified: dev server started, all 6 course routes return HTTP 200 — professional-dog-groomer, professional-dog-trainer, animal-care-assistant, professional-pet-sitter, professional-cat-groomer, pet-care-business-ownership.
- Spot-checked rendered HTML for IPDG (MAN-IPDG, REF-GRM-01, IPDG-103/302/402 safety gates, GRM-BIZ capstone, "Professional Dog Groomer Diploma" credential all present) and PPC (all 11 core manuals including MAN-IPDG/PDT/PPS/CAT, all 6 safety gates PPC-105/201/306/403/405/410, PPC-BIZ capstone present).

Stage Summary:
- Files modified (2): src/lib/syllabi-data.ts (full rewrite — 6 pathway syllabi, 174 weekly entries, 45 assessment entries, 13 safety gates, all guide-verbatim), src/lib/courses-data.ts (added TEXTS map + 6 pathway text ID lists + textsFor helper; populated manuals for all 6 pathways with 74/73/76/20/18/81 real textbooks).
- Every populated field is sourced verbatim from the Program Delivery Guide. careerOutcomes, rubricDomains, faqs, deliveryAndAccess, completionRequirements (on courses-data.ts) are all empty arrays — the guide does not provide this data, so nothing is fabricated.
- Pre-existing tsc error in ProgramDetailView.tsx (missing ProgramInstitutionalData export) resolved via type alias without modifying the component.
- All 6 course detail routes return HTTP 200 with guide-verified data rendered.

---
Task ID: polish-fixes
Agent: general-purpose
Task: Polish pass — black buttons (not brown), restore classroom orange, remove acronyms, redesign onboarding steps.

Work Log:
1) src/app/learn/classroom.css — Restored the original orange/cream palette in the :root token block:
   - --orange: #a87432 → #e96436
   - --warm: #faf6ee → #f6f2e8
   - --paper: #fffaf0 → #fffdf8
   - --green: #5a6b3f → #227665 (original)
   - --brand-orange: #f05a28 → #e96436
   - --ink kept at #0f1f35 (navy ink for classroom canvas)
   All 16 `var(--orange)` references throughout the file now resolve to the original warm orange. Visual identity of the classroom canvas restored.

2) src/components/ProgramDetailView.tsx — Brown/gold → ink replacement (24 changes):
   - Tab switcher: `border-[#8a6d2b] text-[#8a6d2b]` → `border-ink text-ink`
   - All section eyebrows, dynamic icons, code badges, "Wk N" cells, technical/business module cells, competency benchmark labels, admission checkmarks, manual text, sidebar credential eyebrow: `text-[#8a6d2b]` / `text-[#8c6527]` → `text-ink`
   - Term number circle: `bg-[#8a6d2b]/10 border border-[#8a6d2b]/20` → `bg-ink/10 border border-ink/20`; TERM label and term number text → `text-ink`
   - Curriculum view-mode tab buttons (3): `bg-[#8a6d2b] text-on-dark` → `bg-ink text-on-dark`
   - Code badges (`bg-[#8a6d2b]/10 text-[#8a6d2b]`): → `bg-ink/10 text-ink`
   - Donut chart SVG strokes: `#8a6d2b` → `var(--ink)`, `#d9b589` → `color-mix(in oklab, var(--ink) 55%, var(--cream))`, `#0d9488` → `color-mix(in oklab, var(--ink) 30%, var(--cream))` (teal removed entirely; segments remain visually distinct via ink shades)
   - Breakdown dots: `bg-[#8a6d2b]` / `bg-[#d9b589]` / `bg-[#0d9488]` → `bg-ink` / `bg-ink/55` / `bg-ink/30`
   - "Open Global Catalog" hover link + "Total N Weeks Scheduled" badge + outcome cards: text/bgs converted to ink
   - btn-gold buttons kept as-is (per exception rule); bg-gold-deep/text-gold-deep kept as-is

3) src/components/CoursesCatalogView.tsx — 2 changes:
   - Removed the program.code badge entirely from the course card image (the `<div className="absolute top-3 left-3">...{program.code}</div>` block). Card image is now clean — no acronym overlay.
   - "Hands-on Practice" module badge: `bg-[#8a6d2b] text-on-dark` → `bg-ink text-on-dark`
   - btn-gold, bg-gold-deep, text-gold-deep all kept as-is per exception rule.

4) src/components/classroom.tsx — 1 change:
   - `short(c)` function simplified from `c?.title?.split(":")[0]?.replace("Understanding Mental Wellness","Mental Wellness")||"Course"` to `c?.title||"Course"`. The colon-split truncation (legacy from a generic LMS template) is removed, so the course-switcher dropdown (`<select>` in `.course-switch`) now shows full course titles like "Professional Dog Groomer" rather than truncating at any colon. subjectColor() still works because pet-care course titles ("Professional Dog Groomer", "Animal Care Assistant", etc.) don't match the Bio/Algebra/English/History patterns and fall through to the default `#547590`.

5) src/components/onboarding/OnboardingFlow.tsx — Substantial restructuring (Fixes #1, #4, #5, #6, #7, #8, #9):
   - State: removed `isUnder18`, `guardianEmail`, `guardianPhone` (Guardian step deleted). Added `isGoogleLoading` for the Google button. Changed `selectedGoals` default from 3 pre-selected items to `[]` (Fix #6).
   - nextStep(): changed `if (currentStep < 8)` → `if (currentStep < 7)`; updated comment from "Step 8 complete" → "Step 7 complete" (Fix #7).
   - Added `handleGoogleSignIn()` async helper that mirrors SignInView's pattern (POST /api/auth with provider:'google') and then calls `nextStep()` to continue the onboarding flow.
   - stepConfig: removed the Guardian step (was step 6 — "SAFETY & COMPLIANCE"). Old step 7 (Review) renumbered to 6, old step 8 (Complete) renumbered to 7 (Fix #7).
   - Cursive signature check: `currentStep === 8` → `currentStep === 7`.
   - Progress bar: `{currentStep} of 8` → `{currentStep} of 7`; width calc `currentStep / 8` → `currentStep / 7` (Fix #7).
   - Step 1: badge colors `bg-[#e8efe9] text-[#8a6d2b] border-[#d1e0d3]` → `bg-ink/10 text-ink border border-ink/20`; PawPrint icon `text-[#8a6d2b]` → `text-ink`; "8-step enrollment sequence" → "7-step enrollment sequence"; "Step 1 of 8" → "Step 1 of 7". 4 left-column pillar icons `bg-[#e8efe9] text-[#8a6d2b]` → `bg-ink/10 text-ink`.
   - Step 2 (Fix #4): Added "Continue with Google" button above the email/password form, mirroring SignInView's Google button (white background, ink text, official 4-color Google G SVG icon). Added a "or" divider below the Google button. Also fixed all step-2 input focus states `focus:border-[#8a6d2b] focus:ring-[#8a6d2b]` → `focus:border-ink focus:ring-ink`; Terms checkbox + Terms of Service/Privacy Policy links + "Sign In" link all converted from `text-[#8a6d2b]` → `text-ink`.
   - Step 3 (Fix #5): Replaced the 6-role-card grid with a single Learner card that's auto-selected (selectedRole already defaults to 'learner'). Card uses `border-2 border-ink` (BLACK border, per requirement). Card has a User icon, "Learner" title, description, and an ink check badge in the top-right. Heading changed from "What best describes you?" to "You're enrolling as a Learner". Continue button (btn-gold) kept.
   - Step 4: Goal card selected state `border-[#8a6d2b] bg-[#f2f7f3]` → `border-ink bg-cream`; icon `bg-[#e8efe9] text-[#8a6d2b]` → `bg-ink/10 text-ink`; checkbox selected state `bg-gold-deep text-on-dark` → `bg-ink text-on-dark`.
   - Step 5: All 4 input/select focus states `focus:border-[#8a6d2b]` → `focus:border-ink`.
   - Step 6 (Fix #9 — Review, redesigned): Removed the old review card with brown borders (`border border-[#dcd2c1]`, `bg-[#f0eee6] text-[#0f1f35]` icons, `text-[#8a6d2b]` Edit links). Replaced with a clean card layout: `rounded-2xl border-2 border-ink bg-cream overflow-hidden`, each row uses `border-b border-ink/10` divider, ink-tinted icon backgrounds (`bg-ink/10 text-ink`), uppercase tracking-wider labels, and `text-ink hover:underline` Edit links (no brown, no green hovers). All 6 fields (Name, Email, Role, Learning Goals, Date of Birth, Phone) preserved with their goToStep() targets intact.
   - Step 7 (Fix #8 — Complete, redesigned): Removed the old basic complete step (gold-deep paw badge, 3 green-bordered status boxes with `text-[#8a6d2b]` checkmarks, gold-light Next Step box, btn-gold "Go to Classroom"). Replaced with a polished centered celebration layout:
     * Centered ink paw badge (`bg-ink text-on-dark`) at top
     * "You're Enrolled!" headline + subhead
     * Pathway card (`border-2 border-ink bg-cream`) showing the derived pathway name based on the user's selectedGoals (e.g., "Become a professional pet groomer" → "Professional Dog Groomer"). Includes 3 ink-tinted status pills (Learner, Account Ready, Classroom Unlocked).
     * Centered next-step hint text
     * Black "Go to Classroom" button: `bg-ink hover:bg-ink/90 text-on-dark` (NOT btn-gold — explicitly black per Fix #8 requirement)
   - Imports cleaned: removed `Building`, `ShieldCheck`, `CheckCircle2` (no longer used after step 3 simplification and step 7 redesign).

Lint result:
- `bun run lint` → 0 errors, 46 warnings (all pre-existing unused eslint-disable directives in unrelated files: pawz/settings/screens/*, site/islands/booking-wizard-v2.tsx, site/pet-card.tsx, lib/hooks/useSessionQuery.ts). None of the 4 target files produce any lint errors or warnings.
- `bunx tsc --noEmit` → 0 errors in any of the modified files (OnboardingFlow, ProgramDetailView, CoursesCatalogView, classroom.tsx, classroom.css). The pre-existing `CoursesCatalogView.tsx(126,53)` error about `t.topics` (line 126, untouched by this task) is the only catalog error and was already present before this work.

Routes verified (all return HTTP 200):
- /learn/enroll (onboarding flow entry) ✓
- /learn/learner-enroll-onboarding-steps ✓
- /learn/courses (catalog) ✓
- /learn/courses/professional-dog-groomer ✓
- /learn/courses/professional-dog-trainer ✓
- /learn/courses/animal-care-assistant ✓
- /learn/courses/professional-pet-sitter ✓
- /learn/courses/professional-cat-groomer ✓
- /learn/courses/pet-care-business-ownership ✓
- /learn/classroom ✓
- /learn/sign-in, /learn/signin, /learn/login ✓
- /learn ✓

Spot-checked rendered HTML:
- /learn/courses: no `font-mono font-bold ... backdrop-blur-md shadow-xs border border-gold/25` code badge overlay present on the card image (confirming the badge is removed). Program titles render in full.
- /learn/courses/professional-dog-groomer: `var(--ink)`, `color-mix(in oklab, var(--ink)`, `bg-ink/10`, `bg-ink/55`, `bg-ink/30`, `border-ink text-ink` all present in rendered HTML (confirming the donut chart, dots, eyebrows, badges all use ink now).
- /learn/enroll: "7-step enrollment sequence" and "of 7" both render in step 1 (confirming step count update).

Stage Summary:
- Files modified (5): src/app/learn/classroom.css, src/components/ProgramDetailView.tsx, src/components/CoursesCatalogView.tsx, src/components/classroom.tsx, src/components/onboarding/OnboardingFlow.tsx.
- Brown/gold/teal colors fully replaced with ink (black) across all LMS components per the rule. btn-gold and bg-gold-deep/text-gold-deep kept as-is per the exception rule.
- Classroom canvas palette restored to original orange/cream/green tokens.
- Course catalog card image no longer shows acronym badge. Classroom switcher shows full course titles.
- OnboardingFlow reduced from 8 steps to 7 (Guardian step removed; Review renumbered 7→6; Complete renumbered 8→7).
- OnboardingFlow step 2 has a "Continue with Google" button above the email/password form (mirrors SignInView's pattern).
- OnboardingFlow step 3 simplified to a single auto-selected Learner card with a BLACK border.
- OnboardingFlow step 4 starts with no pre-selected goals.
- OnboardingFlow step 6 (Review) redesigned with clean card layout, ink borders, no brown/green hovers.
- OnboardingFlow step 7 (Complete) redesigned with polished centered celebration layout, derived pathway name, and a BLACK "Go to Classroom" button.
- 0 lint errors. 0 tsc errors in modified files. All LMS routes return HTTP 200.

---
Task ID: ecom-migration
Agent: main
Task: SQL migration — commerce tracking fields + commerce_brands + mega-menu cols + CRM identity sync trigger.

Work Log:
- Read existing live schema (commerce_orders had 17 cols, commerce_products had 27 cols, commerce_brands did not exist).
- Wrote supabase/migrations/0013_commerce_tracking_brands_and_crm_trigger.sql with idempotent ALTER ADD COLUMN IF NOT EXISTS statements.
- Applied via direct PG connection (SUPABASE_SESSION_POOLER, IPv4-first DNS).
- commerce_orders now has tracking_status, coupon_id, payment_status, email, subtotal (tracking_number + carrier already existed).
- commerce_brands created with id, tenant_id, name, slug UNIQUE, logo_url, description, is_active, sort_order, timestamps.
- commerce_products gained brand_id (uuid), visible (bool), stock (int).
- pet_product_categories gained hero_image, promo_blurb, sort_order, featured_in_mega_menu, seo_title, seo_description, is_active.
- handle_crm_to_auth_sync() function + trigger_crm_sync on crm_customers — uses REAL column names (crm_customer_id, acct_customer_id) on platform_customer_identity_links (NOT the spec's non-existent shop_customer_id).
- Seeded one default brand: PawLuxury (slug=pawluxury).

Stage Summary:
- Migration is live. commerce_orders, commerce_order_items, commerce_brands, commerce_products, pet_product_categories, and the CRM trigger are all in place. Subagents can now build admin CRUD + checkout/fulfillment + storefront on top of this schema.

---
Task ID: enterprise-catalog
Agent: main
Task: Wire the storefront + admin + checkout to the REAL normalized enterprise schema (erp_products + erp_product_skus + commerce_catalog_items + commerce_prices + commerce_product_media + erp_inventory_movements).

Work Log:
- Audited the live schema: confirmed erp_products (27 cols), erp_product_skus (18), erp_product_variants (8), commerce_prices (10), commerce_product_media (8), commerce_carts (16), commerce_cart_lines (12), commerce_checkout_sessions (11), commerce_fulfillment_events (9), commerce_shipping_labels (11), commerce_customer_accounts (11), commerce_customer_addresses (16), commerce_promotions (15), commerce_coupons (10), commerce_catalog_items (21), commerce_categories (12), erp_inventory_movements (20) all exist. The flat commerce_products (30 cols) was the ONLY table with data (8 rows); every normalized table was empty.
- Wrote scripts/seed-enterprise-catalog.mjs — seeds commerce_price_lists (RETAIL), erp_warehouses (MAIN), commerce_order_channels (WEB), then migrates all 8 commerce_products into the normalized schema: erp_products (base info + metadata) → erp_product_skus (sku + unit_price) → commerce_catalog_items (ecommerce_enabled=true) → commerce_prices (price + compare_at_price on the RETAIL price list) → commerce_product_media (is_primary image) → erp_inventory_movements (opening stock). Ran it: 8/8 products migrated, all 6 normalized tables now have 8 rows each.
- Wrote src/lib/enterprise/catalog.ts — the read/write layer:
  * listCatalogProducts() — single SQL query with JOINs across commerce_catalog_items + erp_products + erp_product_skus + commerce_prices + commerce_product_media + erp_inventory_movements (stock rollup). Returns a unified CatalogProduct shape.
  * getCatalogProductBySlug(slug) / getCatalogProductById(id) — single-product lookups.
  * createCatalogProduct(input) — transactional write across all 6 tables (erp_products + sku + catalog_item + price + media + opening stock movement).
  * updateCatalogProduct(id, patch) — updates the right subset of tables.
  * deleteCatalogProduct(id) — cascading delete across all tables.
  * adjustInventory(skuId, delta, movementType) — the ONLY way stock changes (writes erp_inventory_movements).
  * decrementInventoryForCartItems(cartItems, sourceId) — called by the Stripe webhook to decrement stock via 'sale' movements (NOT flat column updates).
- Refactored src/lib/shop/catalog.ts (storefront) — getProducts() now calls listCatalogProducts() instead of repo.list("commerce_products"). Maps CatalogProduct → ShopProduct (same shape the PLP/PDP/cart already consume). Pricing flows from commerce_prices (priceCents + compareAtPriceCents + isOnSale).
- Refactored src/app/(site)/products/[slug]/page.tsx (PDP) — loadProduct() now calls getCatalogProductBySlug(). Related products + pricing all read from the enterprise layer.
- Refactored src/app/(site)/shop/bag/page.tsx — reads from listCatalogProducts() instead of the flat table.
- Refactored /api/admin/products (route.ts + [id]/route.ts) — POST/PATCH/DELETE now use createCatalogProduct / updateCatalogProduct / deleteCatalogProduct (writes across all 6 normalized tables). GET returns the unified CatalogProduct shape with brand_name/brand_slug joined.
- Refactored /api/shop/checkout/route.ts — server-side price verification now reads from listCatalogProducts() (enterprise catalog) instead of repo.list("commerce_products"). The cart_items metadata carries the commerce_catalog_items.id (uuid) as productId.
- Refactored /api/shop/cart/route.ts — coupon verifier now reads from listCatalogProducts() for line-item pricing.
- Refactored /api/stripe/webhook/route.ts — inventory decrement now calls decrementInventoryForCartItems() (writes erp_inventory_movements with movement_type='sale', negative quantity) instead of updating flat commerce_products columns. Also INSERTs a commerce_fulfillment_events row (event_type='order_placed', old_status=null, new_status='pending') so the order lifecycle is logged chronologically.
- Upgraded src/lib/shipping/usps.ts — applyUspsTrackingToOrder() now ALSO: (a) loads the current order to record old_status, (b) UPDATEs commerce_orders, (c) INSERTs a commerce_fulfillment_events row (event_type='tracking_updated' or 'delivered', old_status → new_status, payload with carrier/tracking/summary), (d) UPSERTs a commerce_shipping_labels row (carrier='USPS', tracking_number), (e) revalidates /admin/orders + /customer/orders. This satisfies the owner's requirement: "Status history must be logged chronologically in commerce_fulfillment_events" + "Store generated label data in commerce_shipping_labels" + "Upon USPS delivery confirmation, the system must automatically update the fulfillment event status."
- Fixed src/lib/types.ts — added the missing DawgNavSection union type (33 nav section ids) that every admin page + pawz component imports. This unblocked all admin page compilation.
- Fixed src/lib/shop/catalog.ts — sort references changed from `sort_order` (flat-table field) to `order` (ShopProduct field).

Stage Summary:
- Files created: scripts/seed-enterprise-catalog.mjs, src/lib/enterprise/catalog.ts.
- Files modified: src/lib/shop/catalog.ts, src/app/(site)/products/[slug]/page.tsx, src/app/(site)/shop/bag/page.tsx, src/app/api/admin/products/route.ts, src/app/api/admin/products/[id]/route.ts, src/app/api/shop/checkout/route.ts, src/app/api/shop/cart/route.ts, src/app/api/stripe/webhook/route.ts, src/lib/shipping/usps.ts, src/lib/types.ts.
- The storefront PLP (/shop), PDP (/products/[slug]), and bag (/shop/bag) now read exclusively from the normalized enterprise schema. The flat commerce_products table is no longer the source of truth.
- The admin products API writes across all 6 normalized tables on create/update/delete.
- The Stripe webhook decrements inventory via erp_inventory_movements (movement_type='sale') and logs commerce_fulfillment_events.
- The USPS tracking helper logs fulfillment events + upserts shipping labels on every lookup.
- Lint: 0 errors. All routes return 200. The 8 migrated products render on the storefront with correct pricing, stock, and media from the real schema.

---
Task ID: ecom-promotions
Agent: full-stack-developer
Task: Promotions & coupons admin (commerce_promotions + commerce_coupons CRUD)

Work Log:
- Read worklog.md (latest entries: enterprise-catalog, ecom-migration) to confirm the normalized enterprise schema is live and the storefront + admin products API now read/write the real normalized tables.
- Read src/lib/enterprise/catalog.ts to learn the withPg + TENANT_ID() pattern + revalidateShopPaths() helper. Read src/lib/admin/gate.ts to confirm requireAdminApi() gates every admin route. Read src/app/api/admin/products/route.ts + [id]/route.ts to learn the admin CRUD route pattern (runtime="nodejs", dynamic="force-dynamic", gate-first, JSON body parse, revalidateShop() after mutations).
- Inspected the live commerce_promotions + commerce_coupons schema via direct PG connection (information_schema.columns). Discovered that the task brief's "15 cols including created_at, updated_at" was inaccurate — the live tables have NO created_at / updated_at columns:
  * commerce_promotions (15 cols): id, tenant_id, code, name, promotion_type, value, minimum_subtotal, maximum_discount, start_at, end_at, usage_limit, usage_count, active, rules, actions
  * commerce_coupons (10 cols): id, tenant_id, promotion_id, code, customer_id, usage_limit, usage_count, status, valid_from, valid_to
- Also confirmed via pg_constraint that commerce_coupons.promotion_id → commerce_promotions is ON DELETE NO ACTION (NOT cascade). So deletePromotion() must UPDATE commerce_coupons SET promotion_id = NULL before DELETE — otherwise the FK constraint blocks the delete.
- Created src/lib/enterprise/promotions.ts — the data layer:
  * Exports types: Promotion, Coupon, PromotionInput, CouponInput, CouponValidation, PromotionType.
  * listPromotions() — SELECT with LEFT JOIN on commerce_coupons for coupon_count, ordered by start_at DESC NULLS LAST, name ASC, code ASC (no created_at available).
  * getPromotion(id) — single promotion by id.
  * createPromotion(input) — INSERT with RETURNING id, then re-fetch via getPromotion for the full row.
  * updatePromotion(id, patch) — UPDATE with COALESCE/CASE per column (handles NULLs vs SET). No updated_at reference (column doesn't exist).
  * deletePromotion(id) — BEGIN/COMMIT transaction: UPDATE commerce_coupons SET promotion_id = NULL WHERE promotion_id = $id (preserves coupon history), then DELETE FROM commerce_promotions. ROLLBACK on error.
  * listCoupons(promotionId?) — SELECT with LEFT JOIN LATERAL on commerce_promotions for the embedded promotion object, filtered by tenant + optional promotion_id. Ordered by valid_from DESC NULLS LAST, code ASC.
  * getCoupon(id) — single coupon by id.
  * createCoupon(input) — INSERT with RETURNING id, then re-fetch via getCoupon.
  * updateCoupon(id, patch) — UPDATE with COALESCE/CASE per column. No updated_at reference.
  * deleteCoupon(id) — simple DELETE.
  * validateCoupon(code, subtotal) — the CANONICAL coupon validator. Looks up commerce_coupons by UPPER(code) + tenant_id. Validates: status==='active' AND valid_from (null|<=now) AND valid_to (null|>=now) AND usage_limit (null|usage_count<limit). Then loads the full commerce_promotions row and validates: active===true AND start_at (null|<=now) AND end_at (null|>=now) AND usage_limit (null|usage_count<limit) AND minimum_subtotal (subtotal >= minimum). Then computes discount: percent_off → subtotal*(value/100); amount_off → min(value, subtotal); bogo → returns valid=true with discount=0 (cart layer handles the BOGO math). Caps discount to maximum_discount if set. Returns { valid, discount, message?, promotion, coupon }.
  * rowToPromotion / rowToCoupon normalizers + safeJson() helper for jsonb columns.
  * revalidateShopPaths() — revalidates /shop, /shop/[...slug], /shop/bag, /products/[slug], / after every mutation.
  * Default tenant_id is 00000000-0000-0000-0000-000000000001 via TENANT_ID().
- Created src/app/api/admin/promotions/route.ts — admin-gated GET (listPromotions) + POST (createPromotion). Validates code + name + promotion_type (must be one of percent_off/amount_off/bogo). Coerces $-prefixed dollar strings → numbers, ISO date strings → ISO timestamps. Calls revalidateShop() after create.
- Created src/app/api/admin/promotions/[id]/route.ts — admin-gated PATCH (updatePromotion) + DELETE (deletePromotion). PATCH only sets fields present in the body; DELETE returns 404 if not found. Both call revalidateShop().
- Created src/app/api/admin/coupons/route.ts — admin-gated GET (listCoupons, optional ?promotionId= filter) + POST (createCoupon).
- Created src/app/api/admin/coupons/[id]/route.ts — admin-gated PATCH (updateCoupon) + DELETE (deleteCoupon).
- Created src/app/(portals)/admin/promotions/page.tsx — client component:
  * Loads promotions on mount via /api/admin/promotions; auto-selects the first promotion so the Coupons section filters to it.
  * Re-loads coupons whenever selectedPromoId changes (via useCallback + useEffect dep).
  * Promotions table: code (clickable → selects that promotion's coupons), name, type (percent_off/amount_off/bogo badge with Percent or Ticket icon), value (smart-formatted: % for percent_off, $ for amount_off, "BOGO" for bogo), active toggle, usage (count/limit), date range (start_at → end_at), coupon count, edit/delete actions.
  * Coupons table: code (mono font), promotion (linked code + name), status badge, usage (count/limit), valid date range, edit/delete actions.
  * "Add Promotion" button opens a modal form: code, name, promotion_type dropdown (Percent Off / Amount Off / Buy One Get One), value (with contextual $ or % label), minimum_subtotal, maximum_discount, start_at (date), end_at (date), usage_limit, active checkbox.
  * "Add Coupon" button opens a modal form: code (with "Generate" button that creates a PAWZ-XXXXXX random code), promotion_id dropdown (lists all promotions or "stand-alone coupon"), valid_from, valid_to, usage_limit, status dropdown.
  * Visual style matches the existing admin pages: bg-ink text-white primary buttons, border-border/bg-muted surfaces, text-2xl font-semibold tracking-tight page title, green/red badges for active/inactive, lucide-react icons (Plus, Pencil, Trash2, Ticket, Percent, Loader2, Copy, Check). NO indigo or blue.
- Wired the new 'promotions' nav item into the admin chrome:
  * src/components/pawz/Sidebar.tsx — added Percent to the lucide-react import; added { id: 'promotions', label: 'Promotions', icon: Percent } to the CATALOG group (next to Products/Categories/Brands/Filters).
  * src/components/pawz/Header.tsx — added 'promotions' to getPillarFromSection()'s CATALOG case + { id: 'promotions', label: 'Promotions' } to subRoutesByPillar.CATALOG.
  * src/components/pawz/_shared/ModuleNav.tsx — added Percent to the lucide-react import; added { id: 'promotions', label: 'Promotions', icon: Percent } to the CATALOG module group.
  * src/lib/types.ts already had 'promotions' in the DawgNavSection union (per the task brief). No type change needed.
- Did NOT touch /api/shop/cart/route.ts (per the task brief: the existing inline coupon verifier stays).
- Ran `bun run lint` — 0 errors, 46 warnings (all pre-existing unused eslint-disable directives in unrelated files: pawz/settings/screens/*, site/islands/booking-wizard-v2.tsx, site/pet-card.tsx, lib/hooks/useSessionQuery.ts). NONE of my new files produce any lint errors or warnings.
- Ran `bunx tsc --noEmit` (with NODE_OPTIONS="--max-old-space-size=1024" to avoid OOM) — 0 errors in any of my new deliverable files (lib/enterprise/promotions.ts, the 4 API routes, the admin page). Pre-existing tsc errors in pawz/Sidebar.tsx and pawz/Header.tsx (missing 'AuthUser' / 'LocationItem' exports from @/lib/types, and frontdesk/lms nav ids like 'check-in', 'phone-messages', 'my-learning' not in DawgNavSection) are NOT mine to fix — confirmed via git stash that they exist on the unmodified main branch.
- Verified HTTP routes end-to-end:
  * GET /api/admin/promotions → 401 (admin auth required, no session in curl) — route compiles cleanly.
  * GET /api/admin/coupons → 401 — route compiles cleanly.
  * GET /admin/promotions → 200 — admin page renders successfully.
- Ran a direct-PG smoke test (test-promo-full.mjs) against the live DB that exercised every SQL query my data layer uses:
  * INSERT promotion ✓
  * INSERT coupon (FK to promotion) ✓
  * listPromotions SQL (with coupon count LEFT JOIN + new ORDER BY) ✓
  * UPDATE promotion (no updated_at reference) ✓
  * UPDATE coupon (no updated_at reference) ✓
  * DELETE promotion (clears coupon FK first because ON DELETE NO ACTION) ✓
  * DELETE coupon ✓
  * listCoupons SQL (LATERAL JOIN + new ORDER BY) ✓
  * validateCoupon SQL pattern (UPPER(code) lookup + LATERAL JOIN to promotion) ✓
  All 9 queries passed; cleaned up smoke-test rows afterward.

Stage Summary:
- Files created (6):
  * src/lib/enterprise/promotions.ts — data layer (Promotion + Coupon types, listPromotions/getPromotion/createPromotion/updatePromotion/deletePromotion, listCoupons/getCoupon/createCoupon/updateCoupon/deleteCoupon, validateCoupon canonical validator).
  * src/app/api/admin/promotions/route.ts — admin-gated GET (list) + POST (create).
  * src/app/api/admin/promotions/[id]/route.ts — admin-gated PATCH (update) + DELETE.
  * src/app/api/admin/coupons/route.ts — admin-gated GET (list, optional ?promotionId= filter) + POST (create).
  * src/app/api/admin/coupons/[id]/route.ts — admin-gated PATCH (update) + DELETE.
  * src/app/(portals)/admin/promotions/page.tsx — client component with promotions table + coupons table + modal forms for create/edit on both.

- Files modified (3):
  * src/components/pawz/Sidebar.tsx — added Percent import + 'promotions' item in the CATALOG group.
  * src/components/pawz/Header.tsx — added 'promotions' to the CATALOG pillar's getPillarFromSection case + subRoutes list.
  * src/components/pawz/_shared/ModuleNav.tsx — added Percent import + 'promotions' item in the CATALOG module group.

- Verification:
  * Lint: 0 errors, 46 warnings (all pre-existing in unrelated files; none in any of my deliverable files).
  * tsc: 0 errors in any new deliverable file. Pre-existing tsc errors in Sidebar.tsx/Header.tsx (missing AuthUser/LocationItem exports, frontdesk/lms nav ids not in DawgNavSection) confirmed present on unmodified main branch — not mine to fix.
  * HTTP smoke: /api/admin/promotions → 401 (correct gate), /api/admin/coupons → 401 (correct gate), /admin/promotions → 200 (page renders).
  * SQL smoke: 9/9 queries pass against the live DB.
  * Schema note: discovered during smoke testing that commerce_promotions + commerce_coupons have NO created_at/updated_at columns (task brief was inaccurate). Removed all references to those columns from the data layer + types. Promotions now ordered by start_at DESC NULLS LAST, name ASC, code ASC; coupons ordered by valid_from DESC NULLS LAST, code ASC.
  * FK note: commerce_coupons.promotion_id → commerce_promotions is ON DELETE NO ACTION (NOT cascade). deletePromotion() runs UPDATE commerce_coupons SET promotion_id = NULL WHERE promotion_id = $id before DELETE so the FK constraint doesn't block — preserves coupon history for analytics.

---
Task ID: ecom-customer-accounts
Agent: main
Task: Customer account management (commerce_customer_accounts + commerce_customer_addresses + crm_customers)

Work Log:
- Wrote src/lib/enterprise/customer.ts — the data layer using withPg + TENANT_ID pattern:
  * getCustomerByEmail(email) — looks up crm_customers by lower(email).
  * getCustomerAccount(customerId) / ensureCustomerAccount(customerId) — find-or-create on commerce_customer_accounts.
  * updateCustomerProfile(customerId, patch) — updates first_name/last_name/phone/mobile_phone on crm_customers.
  * updateCustomerAccount(customerId, patch) — updates tax_exempt/tax_exemption_number/credit_limit on commerce_customer_accounts.
  * listCustomerAddresses(customerId) — lists addresses sorted by is_default DESC, created_at DESC.
  * createCustomerAddress(customerId, input) — INSERT with transactional is_default handling (unsets other defaults first).
  * updateCustomerAddress(addressId, customerId, patch) — UPDATE with ownership check + is_default handling.
  * deleteCustomerAddress(addressId, customerId) — DELETE with last-address protection (returns 409 if it's the only address).
  * getCustomerStats(email) — returns { totalSpent, orderCount, inTransit, latestStatus } from commerce_orders.
- Wrote /api/customer/account/route.ts — GET returns { profile, account }; PATCH updates profile + account fields. Uses the same pawz_session cookie auth pattern as /api/customer/orders.
- Wrote /api/customer/addresses/route.ts — GET lists; POST creates.
- Wrote /api/customer/addresses/[id]/route.ts — PATCH updates; DELETE removes (with last-address protection).
- The customer dashboard (src/app/(portals)/customer/dashboard/page.tsx) was extended (by the subagent before it timed out) to add an Account Overview card (fetches /api/customer/account, shows profile + tax status + edit modal) and a Saved Addresses card (fetches /api/customer/addresses, lists with is_default badge, add/edit/delete actions).

Stage Summary:
- Files created: src/lib/enterprise/customer.ts, src/app/api/customer/account/route.ts, src/app/api/customer/addresses/route.ts, src/app/api/customer/addresses/[id]/route.ts.
- Files modified: src/app/(portals)/customer/dashboard/page.tsx (added Account Overview + Saved Addresses sections).
- All routes return correct status codes (401 without session, 200 with). Lint clean. 0 tsc errors in enterprise files.
