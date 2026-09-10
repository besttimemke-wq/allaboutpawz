# Leashed.io — Digital Learning University · Worklog

## Project status
The app is a real Course Builder MVP built on the Leashed Learning Framework.
Backend is complete and seeded; UI is the active work.

---
Task ID: 1
Agent: main (Z.ai Code)
Task: Build the full backend — Prisma schema, framework-aware seed, API routes, live LeashGuide AI tutor, AI course builder.

Work Log:
- Read existing framework (`src/lib/framework/types.ts` + `builder.ts`) — the canonical Leashed Learning Framework model.
- Re-themed `globals.css` to Leashed.io brand (emerald primary + amber accent, dark mode, custom scrollbars, hero grid, prose styles).
- Rewrote `prisma/schema.prisma`: `Course` (holds full Pathway JSON on `data`), `Enrollment`, `ChatSession`, `ChatMessage`, `QuizAttempt`.
- Wrote `src/lib/zai.ts` — backend-only Z.AI singleton.
- Wrote `src/lib/course-gen.ts` — the uniform generator that expands any catalog (4 levels × 5 modules × 9 classes) into a framework-valid 120h / 12 CEU Pathway. Both LSH and AI-generated courses funnel through it.
- Wrote `src/lib/seed-data.ts` — LSH (Life Skills & Personal Readiness) catalog; `buildLSHPathway()` returns the full exemplar.
- Wrote `src/lib/course-api.ts` — `serializeCourse`, `createCourse`, `duplicateCourse` (deep-clone + retag module codes), `savePathway` (validates shape), `getCourseByCode`, `listCourses`, `blankPathway`.
- Wrote `scripts/seed.ts` — idempotent seed; ran `db:push` + seed. LSH validated: 4 levels, 20 modules, 120h, 12 CEU.
- API routes (all under `src/app/api/`):
  - `courses/route.ts` — GET list (published or all), POST create.
  - `courses/[code]/route.ts` — GET, PATCH (save pathway / status), DELETE.
  - `courses/[code]/duplicate/route.ts` — POST duplicate.
  - `enrollments/route.ts` — GET (by course/learner), POST enroll.
  - `enrollments/[id]/route.ts` — GET, PATCH progress.
  - `quiz/route.ts` — POST submit (80% pass threshold).
  - `ai/tutor/route.ts` — GET history, POST live LeashGuide chat via Z.AI (builds system prompt from base persona + class aiTutorPrompt + module context; persists messages).
  - `ai/build-course/route.ts` — POST: Z.AI generates a 4×5 module catalog as strict JSON → expanded through `buildPathwayFromCatalog` → saved as `aiGenerated` draft course.
- Lint: 0 errors.

Stage Summary:
- DB-backed course system live. LSH is the first seeded, framework-valid course.
- Live AI tutor (LeashGuide) wired to Z.AI backend; persists conversation per session.
- AI Course Builder can generate new uniform courses from a code/title/domain.
- Deliverables so far: course data model (TS + Prisma), seed exemplar (LSH), quiz bank shape, LeashGuide prompt pack (per-class prompts in DB), AI builder API.
- Next: single-page UI on `/` (home/catalog/course/learner/admin) with live AI tutor chat + admin forms.

---

Task ID: 2
Agent: main (Z.ai Code)
Task: Build the single-page UI (home/catalog/course/learner/admin) with live LeashGuide AI tutor + admin builder, then self-verify end-to-end with agent-browser.

Work Log:
- Built client foundation: `src/lib/api-client.ts` (typed fetch helpers for all routes), `src/lib/store.ts` (Zustand + persist for view/selectedCourse/learnerName/target).
- Refactored the uniform generator out of seed-data into `src/lib/course-gen.ts` so BOTH the LSH seed AND the AI Course Builder expand through the same engine (`buildPathwayFromCatalog`).
- Added AI Course Builder route `src/app/api/ai/build-course/route.ts`: Z.ai produces a strict-JSON 4x5 module catalog -> expanded through `buildPathwayFromCatalog` -> saved as an `aiGenerated` draft. Byte-identical structure to LSH.
- UI components (all under `src/components/app/`):
  - `header.tsx` (sticky nav: Pathway/Catalog/Learn/Builder + Enroll CTA, mobile nav).
  - `footer.tsx` (sticky via `mt-auto`, accreditation badges COE/ACCSC/IACET/ICG/SCORM).
  - `markdown.tsx` (react-markdown with `.prose-leash` styling).
  - `home-view.tsx` (hero + 6-month pathway overview with credential ladder + featured LSH course).
  - `catalog-view.tsx` (searchable grid; each course shows what it does / hours / what it connects to / outcome / enroll).
  - `course-view.tsx` (Overview/Syllabus/Enroll tabs; full syllabus accordion; enrollment form).
  - `learner-view.tsx` (3-column shell: module nav + lesson panel with 5-part flow tabs/teachable content/knowledge check + live LeashGuide chat; module quiz; progress tracking + persistence).
  - `leashguide-chat.tsx` (live AI tutor: real-time Z.ai replies, session persistence, starter prompts).
  - `module-quiz.tsx` (8-question quiz from per-class knowledge checks, 80% pass, retake).
  - `admin-view.tsx` (course table with publish/unpublish/duplicate/delete; blank-course form; AI Builder form; full editor with framework-compliance validation banner).
- `src/app/page.tsx`: single-page shell rendering the active view; `LearnerView` keyed by courseCode for clean remounts.
- Re-themed `globals.css` to the Leashed.io brand (emerald primary + amber accent, dark mode, custom scrollbars, hero grid, prose styles).

Bugs found & fixed during agent-browser verification:
- `courses/route.ts` was never created after an initial mkdir failure -> 404. Recreated it.
- `course-api.ts` imported `validatePathwayShape` / `DEFAULT_FRAMEWORK_SPEC` from `./framework/builder` but they live in `./framework/types` -> 500. Fixed imports.
- `api-client.ts` `json()` helper took a `Response` but the API methods passed a URL string (no `fetch()`) -> silent fetch failure, empty catalog. Rewrote `json()` to call `fetch()` internally.
- `react-hooks/set-state-in-effect` errors: removed synchronous `setState` in effects (derive `current` via useMemo with fallback; remount LearnerView via `key`).
- Learner quiz bug: when `current` was the fallback (no explicit selection), `selModule` was null, so the quiz branch `current && showQuiz && selModule` rendered nothing AND the lesson branch was gated off -> empty main. Fixed `current` to fall back to the selected module's first class, and dropped the redundant `selModule` check from the quiz branch.

Verification (agent-browser end-to-end):
- Home renders hero + 6-month pathway + featured LSH (fetched from DB). 0 runtime errors.
- Catalog shows LSH card (what/120h/connections/outcome + "View & enroll").
- Course detail: Overview/Syllabus/Enroll tabs; syllabus accordion shows 4 levels x 5 modules.
- Enrollment: filled name -> enrolled -> learner view mounts.
- Learner view: module nav (LSH-101..105 etc.), lesson panel with Connect/Learn/See It/Do It/Check tabs, teachable content, knowledge check, "Complete & continue".
- Live LeashGuide AI tutor: sent "Help me start the Connect step." -> received real, contextual Z.ai reply ("Welcome to our self-awareness journey! Let's start by connecting with what you already know..."). POST /api/ai/tutor 200.
- Module quiz: 8 questions, 24 radio options, submit + back buttons render. Quiz API (curl) scores correctly at 80% threshold.
- Admin Builder: course table shows LSH (published); "Edit" opens editor (Framework-compliant banner + Course overview + Enrollment copy + Levels & modules); created blank "TST" course (toast + editor opened).
- AI Course Builder: generated "WDY" (Workplace Dynamics) via Z.ai in 14.2s -> POST /api/ai/build-course 200 -> editor opened. Verified in DB: 4 levels, 20 modules, 120h, 12 CEU, aiGenerated=true, all 5 accreditation bodies, sample module WDY-101 has 9 classes / 6 objectives / 80% quiz pass. STRUCTURE IDENTICAL TO LSH (uniform generation proved).
- Footer: flex `mt-auto` layout -> sticky on short pages, pushed down naturally on long pages.
- Lint: 0 errors (757 warnings, all from uploaded perplexity HTML assets, not project code).

Stage Summary:
- Real Course Builder MVP is live and browser-verified end-to-end.
- LSH seeded as the first course (4 levels, 20 modules, 180 lessons, 120h, 12 CEU).
- Public pathway/catalog + enrollment flow works.
- Learner shell with a LIVE LeashGuide AI tutor (real Z.ai, persisted sessions) works.
- Admin builder: create blank / duplicate / AI-generate / edit with framework validation -- all work.
- AI-generated courses are structurally identical to hand-authored LSH (the "uniform way" goal is met).
- Next-phase opportunities (for the recurring review agent): per-lesson editability in the builder (lesson flow/teachable content/AI prompt editing), SCORM package export, learner roster + progress analytics dashboard, real auth (NextAuth) replacing name-only identity, deeper quiz bank (scenario authoring per module), certificate generation on level completion.

---

Task ID: 3
Agent: webDevReview (cron round 1)
Task: QA the existing app with agent-browser, fix bugs, and add new features + styling polish.

## Current project status (assessment)
- The MVP from Task 2 is stable and functional: home/catalog/course/learner/admin views all render, live LeashGuide AI tutor works, AI course builder works, LSH is seeded, 0 lint errors.
- Dev server healthy; all APIs returning 200.
- Two real UX bugs found during QA (see below); otherwise the app is solid.

## Bugs found & fixed
1. **Overview "Enroll & start learning" button failed silently** when learnerName was empty — the Overview tab has no name input, so clicking enroll just set an error state that was never shown on that tab. FIX: made the course Tabs controlled (`value={tab}`/`onValueChange={setTab}`), and the enroll() function now switches to the "enroll" tab + sets the error when name is empty, so the learner sees the name field + the error message. Verified end-to-end with agent-browser.
2. **RosterPanel crashed on render** (client-side "Application error") because Radix `Select` does not accept an empty-string value — the "All courses" option had `value=""`. FIX: changed the sentinel to `"__all__"` and updated the load logic to translate it back to `undefined`. Verified the panel renders with the 2 existing enrollments.

## New features added

### 1. Per-lesson editor in the Admin Builder
- New `ModuleEditorCard` component: each module is an expandable card with editors for title, capstone artifact, description, objectives (6), rubric criteria (8), critical items (3–4), self-reflection prompt, and the module quiz sample item (question/answer/rationale).
- New `LessonEditor` component: each of the 9 classes per module is an expandable row with editors for the 5-part flow (Connect/Learn/See It/Do It/Check), teachable content (Markdown), and the LeashGuide AI tutor prompt.
- Module cards are collapsible (`expandedModule` state) so the admin can drill Level → Module → Lesson without leaving the page. This completes the "no-code builder" promise — every field a course author would need is now editable.
- Verified: expanded LSH-101 → saw "Capstone artifact", "Rubric criteria", and expanding class M1C1 revealed "Teachable content", "LeashGuide AI tutor prompt", and the 5-part flow editors.

### 2. Learner Dashboard (new view + API)
- New `/api/learner?name=...` route: returns all of a learner's enrollments with computed progress (total/completed classes, passed quizzes, overall %), next-up module+class, and credentials earned (a level credential is earned when ALL its modules' quizzes are passed AND all classes complete).
- New `DashboardView` component: name lookup → summary stats (pathways enrolled, lessons completed, quizzes passed, CEUs earned) → per-enrollment cards with progress bar, mini-stats, the 4-level credential ladder (earned vs locked), and a "Next up" callout that jumps straight into the learner view at the right module+class.
- Added "Dashboard" to the header nav and the store's View union. Verified: looked up "QA Tester" → saw their LSH enrollment, the credential ladder (all locked since no progress), and the "Next up" → LSH-101 / M1C1 callout.

### 3. Admin Learner Roster + analytics (new tab + API)
- New `/api/admin/roster?courseId=...` route: returns all enrollments (optionally filtered by course) with per-learner progress + a summary (total enrollments, unique learners, avg progress, quizzes passed).
- New `RosterPanel` component in the Admin view ("Learners" tab): summary stat cards + a course filter (`Select`) + a roster table with learner name, course, progress bar, lessons done, quizzes passed, and enrollment date. Empty state handled.
- Verified: shows the 2 real enrollments (Jordan Avery, QA Tester) with the summary "2 enrollments · 2 unique learners · 0% avg · 0 quizzes passed".

### 4. Styling polish (Home)
- Rebuilt the hero with framer-motion: staggered fade-up animations on badge, headline, subhead, CTAs, and stat cards.
- Added two blurred glow blobs (emerald + amber) behind the hero for depth.
- Stat cards now count up from 0 to their value (900ms easeOut cubic) with `tabular-nums` for stable layout.
- Added a new "How it works" section (4 cards: Uniform framework, Live AI tutoring, Builder + learner, Accreditation-ready) with hover lift + icon scaling.
- Level cards and how-it-works cards now have `hover:shadow-md hover:-translate-y-0.5` transitions.
- Verified: home renders with all new sections, count-up animation, and glow — 0 console errors.

## Verification (agent-browser end-to-end)
- Home: "How it works" section present, 4 count-up stats, 2 hero glow blobs. 0 errors.
- Course Overview enroll bug: clicking "Enroll & start learning" with empty name → switches to Enroll tab, shows "Enter your name to enroll." error, name input visible. FIXED.
- Dashboard: looked up "QA Tester" → LSH enrollment renders with progress bar, mini-stats, credential ladder (Foundation/Core/Advanced/Capstone, all locked), "Next up: LSH-101 · class M1C1".
- Admin Learners tab: summary cards (2 enrollments, 2 unique, 0% avg, 0 quizzes) + roster table with both learners. FIXED the Select crash.
- Admin Editor: expanded Level 100 → LSH-101 module card → saw Capstone artifact, Rubric criteria, Critical items editors; expanded lesson M1C1 → saw 5-part flow, Teachable content (Markdown), LeashGuide AI tutor prompt editors.
- Lint: 0 errors (758 warnings, all from uploaded perplexity HTML assets).

## Unresolved issues / risks + next-phase priorities
- **Quiz radio selection via automation**: Radix radios need real pointer events; agent-browser couldn't select answers programmatically (the quiz UI itself is fine — verified last session via curl). Not a real bug, just a tooling limitation.
- **Knowledge check editing in LessonEditor**: the per-class `knowledgeCheck` items aren't yet editable in the admin UI (only the flow/teachable/AI prompt). A future round could add a repeatable-field editor for the 3 knowledge-check items per class.
- **Certificate generation**: credentials are computed/displayed but there's no downloadable certificate PDF yet. Next-phase candidate.
- **SCORM export**: no SCORM package download yet — the data model is SCORM-ready but export is not implemented.
- **Real auth**: identity is still name-only. NextAuth integration remains a roadmap item.
- **Roster per-learner drill-down**: clicking a roster row could deep-link to that learner's dashboard.
- Recommend next cron round focus on: (a) certificate PDF generation on level completion, (b) SCORM package export, or (c) knowledge-check item editor in the lesson editor.

---

Task ID: 4
Agent: webDevReview (cron round 2)
Task: QA the app, then add the top-priority roadmap features: certificate generation, SCORM export, knowledge-check editor, and roster deep-link + styling polish.

## Current project status (assessment)
- App is stable after round 1: home/catalog/course/learner/admin/dashboard all render, live LeashGuide AI tutor works, LSH seeded, 0 lint errors, dev server healthy.
- Quick QA confirmed no regressions (home, dashboard, admin roster all render with 0 console errors).
- This round tackled 3 of the top 4 roadmap items from the round-1 worklog: certificate PDF, SCORM export, and knowledge-check editor.

## New features added

### 1. Certificate generation (PDF-ready HTML)
- New `/api/certificate?learnerName=...&courseCode=...&level=100` route (GET): returns a fully-styled, print-ready certificate as standalone HTML (297×210mm landscape, Cormorant Garamond + Inter fonts, emerald/amber brand palette, decorative double border + amber corners, gradient seal, signatures, credential ID strip, accreditation banner).
- **Entitlement check**: the route verifies the learner is enrolled AND has passed all the level's module quizzes AND completed all lesson blocks before issuing — returns 403 otherwise.
- The certificate opens in a new tab (print-to-PDF via browser), so the user gets a vector PDF with selectable text.
- **Dashboard integration**: each earned credential card in the learner dashboard now has a "View certificate" link that opens the certificate.
- Verified: simulated Level 100 completion for "QA Tester" (5 modules × 9 classes + quiz passed) → certificate returns 200 with correct content ("Life Skills Foundation Badge", "QA Tester", "30 contact hours", "IACET CEUs"); before completion it correctly returns 403.

### 2. SCORM package export
- New `/api/scorm?courseCode=...` route (GET): returns a valid SCORM 1.2 `imsmanifest.xml` for the course with the full hierarchy: organization → 4 levels → 20 modules → 180 class items, each module as a `scormtype="sco"` resource and each class as a `scormtype="asset"` resource, plus a syllabus asset. Proper `xmlns` namespaces (imscp_rootv1p1p2 + adlcp_rootv1p2) and `Content-Disposition: attachment` so it downloads.
- **Dashboard integration**: each enrollment card now has a "SCORM package export" row with a download button.
- Verified: `curl /api/scorm?courseCode=LSH` → 200 with valid XML manifest.

### 3. Knowledge-check editor in the LessonEditor
- New `KnowledgeCheckEditor` component in admin-view: each class's `knowledgeCheck` items are now fully editable — add/remove items, change question type (multiple-choice / true-false / scenario / short-answer) via a Select, edit question text, edit/add/remove options (click the radio dot to mark the correct answer), and edit the rationale.
- Empty state handled ("No knowledge check items. Click Add item to create one.").
- Verified: expanded LSH-101 → M1C1 → saw Q1/Q2/Q3, the "Multiple choice" type selector, "Add item" button, and "Rationale" fields.

### 4. Roster → Dashboard deep-link
- Each roster row now has a "Dashboard" action button that sets the learner name + switches to the dashboard view, showing that learner's progress + credentials. Completes the "click a roster row → deep-link to that learner's dashboard" roadmap item.
- Verified: clicked the first roster row's Dashboard action → landed on the Learner dashboard with QA Tester's data loaded.

### 5. Styling polish
- Credential ladder cards in the dashboard now show a "View certificate" button on earned credentials with hover shadow.
- Added a dedicated "SCORM package export" row in each enrollment card with an icon + description + download button.
- Roster table gained an "Actions" column with a ghost "Dashboard" button per row.
- All new UI uses the existing emerald/amber brand tokens for consistency.

## Verification (agent-browser end-to-end)
- Certificate: opened `/api/certificate?learnerName=QA%20Tester&courseCode=LSH&level=100` → renders full certificate (title "Life Skills Foundation Badge — QA Tester", body with "QA Tester", "30 contact hours", "IACET CEUs", signatures, credential ID). Screenshot confirmed.
- Dashboard with earned credential: summary stats present, "View certificate" link present, "SCORM package export" present, credential ladder shows "Foundation" with "CEU earned".
- Roster deep-link: clicked roster row "Dashboard" action → navigated to Learner dashboard with QA Tester's data.
- Knowledge-check editor: expanded LSH-101 module card → M1C1 lesson → saw "Knowledge check" section with Q1/Q2/Q3, type selectors, "Add item" button, and "Rationale" inputs.
- Console: 0 errors / 0 warnings across all flows.
- Lint: 0 errors (758 warnings, all from uploaded perplexity HTML assets).

## Unresolved issues / risks + next-phase priorities
- **SCORM is XML-only**: the manifest downloads but the referenced `modules/*.html` SCO files are not yet generated/packaged into a zip. A future round could generate the per-module HTML stubs and zip everything for a turnkey LMS import.
- **Certificate is print-to-PDF, not server-rendered**: works reliably but a future round could use the PDF skill's Playwright pipeline to server-render a downloadable PDF directly.
- **Real auth**: identity is still name-only. NextAuth integration remains the biggest roadmap item.
- **Knowledge-check items feed the quiz**: the learner module quiz pulls from per-class knowledge checks; now that those are editable, admins can author real quiz banks. A future round could add a "quiz preview" in the admin.
- Recommend next cron round focus on: (a) SCORM zip packaging (manifest + per-module HTML), (b) server-rendered certificate PDF via Playwright, or (c) NextAuth real authentication.

---

Task ID: 5
Agent: webDevReview (cron round 3)
Task: QA the app, then add server-rendered certificate PDF, catalog search/filter/bookmarks, and course comparison.

## Current project status (assessment)
- App is stable after round 2: all views render, live LeashGuide AI tutor works, LSH seeded, certificate HTML + SCORM XML + knowledge-check editor all functional, 0 lint errors, dev server healthy.
- Quick QA confirmed no regressions (home + certificate both render with 0 console errors).
- This round tackled the remaining top roadmap items: server-rendered certificate PDF, plus new catalog features (filter, bookmarks, comparison).

## New features added

### 1. Server-rendered certificate PDF download
- New `/api/certificate-pdf?learnerName=...&courseCode=...&level=100` route (GET): generates the certificate HTML, writes it to a temp file, renders it to a vector PDF via the PDF skill's `html2poster.js` (Playwright), and streams the PDF back as a download (`Content-Type: application/pdf`, `Content-Disposition: attachment`).
- Same entitlement check as the HTML certificate (enrolled + all level modules passed + all classes complete → 200; otherwise 403).
- Verified: `curl /api/certificate-pdf?learnerName=QA%20Tester&courseCode=LSH&level=100` → HTTP 200, 143KB, valid PDF document (1 page). Before completion it correctly returns 403.
- **Dashboard integration**: each earned credential now has TWO buttons — "View" (opens the HTML certificate in a new tab) and "PDF" (downloads the server-rendered PDF).

### 2. Catalog search & filter enhancements
- **Accreditation filter chips**: 5 toggle chips (COE/ACCSC/IACET/ICG/SCORM) above the course grid — clicking filters to courses with that accreditation body. Multiple can be active (AND logic). Active chips show a check icon and use the primary color.
- **Result count**: shows "N courses" live as filters/search change.
- **Clear filters**: one-click clear button appears when any filter or search is active.
- **Empty state**: dedicated card with "No courses match your filters" + a Clear filters button.
- Verified: accreditation chips render, course count updates, clear button works.

### 3. Course bookmarks / wishlist
- Each catalog card now has a bookmark toggle button (top-right overlay). Bookmarks persist to `localStorage` (`leashed-bookmarks`).
- A "Bookmarked" section appears at the top of the catalog when the learner has saved courses, showing compact chips with code/title/hours/CEU + a remove button.
- Verified: clicked bookmark on LSH → bookmarked section appeared with LSH chip; persists across reloads.

### 4. Course comparison (side-by-side)
- Each catalog card has a "compare" toggle button (top-right overlay, next to bookmark). Up to 3 courses can be added to comparison.
- A **sticky comparison bar** appears at the bottom of the screen when courses are selected, showing the selected course codes as badges (removable) + a "Compare (N)" button that opens a side sheet.
- The **comparison sheet** renders a full side-by-side table: Code, Title, Hours, CEUs, Levels, Modules, Accreditation, Who it's for, First credential, Time commitment, Prerequisites, AI-built — each course as a column. Clicking a course title in the table opens its detail page.
- Verified: added LSH to comparison → sticky bar appeared → opened sheet → full table rendered with all attributes.

### 5. Styling polish
- Catalog cards now show accreditation badges inline + have overlay action buttons (bookmark + compare) with backdrop blur.
- Comparison bar uses a floating card with shadow + backdrop blur for a modern feel.
- Filter chips use the primary color when active with check icons.
- Bookmarked section uses a subtle primary-tinted background.
- All new UI uses the existing emerald/amber brand tokens for consistency.

## Verification (agent-browser end-to-end)
- Certificate PDF: `curl` → HTTP 200, 143KB, valid PDF (1 page). Entitlement check returns 403 when not earned.
- Dashboard: earned credential shows both "View" and "PDF" buttons; "CEU earned" + "Pathways enrolled" present.
- Catalog: accreditation filter chips render, "1 course" count, bookmark + compare overlay buttons present.
- Bookmarks: clicked bookmark → bookmarked section appears with LSH chip.
- Comparison: added to comparison → sticky bar appears → opened sheet → full comparison table with Hours, Accreditation, etc.
- Console: 0 errors / 0 warnings across all flows.
- Lint: 0 errors (758 warnings, all from uploaded perplexity HTML assets).

## Unresolved issues / risks + next-phase priorities
- **Comparison needs 2+ courses to be meaningful**: with only LSH published, comparison is a single-column demo. Once more courses are AI-generated/published, comparison becomes genuinely useful.
- **SCORM is still XML-only**: the manifest downloads but referenced `modules/*.html` SCO files aren't packaged into a zip. A future round could generate per-module HTML stubs + zip everything.
- **Real auth**: identity is still name-only. NextAuth integration remains the biggest roadmap item.
- **Bookmarks are local-only**: bookmarks persist to localStorage per-browser; a future round could persist them server-side per learner account (requires auth).
- **Quiz preview in admin**: now that knowledge-check items are editable, a "quiz preview" in the admin would let authors test their quiz banks.
- Recommend next cron round focus on: (a) SCORM zip packaging (manifest + per-module HTML), (b) NextAuth real authentication, or (c) quiz preview in admin + more seed courses to make comparison meaningful.

---

Task ID: 6
Agent: webDevReview (cron round 4)
Task: QA the app, seed more courses, add quiz preview in admin, add course syllabus export, polish styling.

## Current project status (assessment)
- App is stable after round 3: all views render, live LeashGuide AI tutor works, certificate HTML+PDF, SCORM XML, catalog filters/bookmarks/comparison all functional, 0 lint errors, dev server healthy.
- Quick QA confirmed no regressions (home, catalog, admin all render with 0 console errors).
- This round tackled the round-3 roadmap items: seed more courses, quiz preview in admin, and syllabus export.

## New features added

### 1. Two more published courses seeded (WDC + FIN)
- Used the existing AI Course Builder API to generate two new 120-hour pathways:
  - **WDC** — Workplace Digital Communication (domain: professional digital communication, email etiquette, virtual collaboration; audience: early-career professionals in remote/hybrid teams).
  - **FIN** — Personal Financial Literacy (domain: budgeting, saving, credit, debt management, financial goal-setting; audience: young adults building their first financial foundation).
- Both generated with 20 modules each, then published via PATCH `/api/courses/{code}` status=published.
- Catalog now shows 3 published courses (LSH, WDC, FIN) — comparison and accreditation filters are now genuinely useful.
- Verified: catalog renders "3 courses" with all three titles visible; comparison sheet shows a 3-column side-by-side table.

### 2. Quiz preview in the Admin Builder
- New `QuizPreviewDialog` component: each module editor now has a "Preview quiz" button next to the quiz sample item.
- Opens a Dialog showing the full quiz bank for that module — questions pulled from every class's knowledge-check items, exactly like the learner quiz builds them. Shows: total questions available, pass threshold (80%), learner sees 8 random, question mix (3 MC / 2 T-F / 2 scenario / 1 short-answer).
- Each question has a "Reveal answer" toggle that highlights the correct option (primary color + check icon), shows the answer + rationale, and offers a "Hide answer" toggle.
- Empty state handled ("No quiz questions yet. Add knowledge-check items…").
- Fixed an a11y warning by adding `DialogDescription` to the dialog.
- Verified: opened LSH-101 → "Preview quiz" button → dialog opens with "questions available", "Pass threshold", "Reveal answer" buttons; revealing shows Answer + Rationale + "Hide answer".

### 3. Course syllabus export (printable Markdown)
- New `/api/syllabus?courseCode=...` route (GET): returns a complete, printable Markdown syllabus for the course — header (code, hours, CEUs, SCORM ID, accreditation, framework), overview + mission, enrollment copy (headline, who-for, what-you'll-achieve, what-you'll-earn, time, prereqs), then per-level → per-module → per-sub-module → per-class detail (5-part flow, AI tutor prompt, knowledge check with correct answers marked), and a final shipping-checklist table (Structure, Hours, Quiz, Rubric, Capstone, Credential ladder, SCORM, AI tutoring) with accreditation bodies.
- Downloads as `syllabus-{CODE}.md` via `Content-Disposition: attachment`.
- **Course detail integration**: added a "Download syllabus" button in the course header stats row (right-aligned, outline variant).
- Verified: `curl /api/syllabus?courseCode=LSH` → HTTP 200, 609KB, `text/markdown`; LSH + WDC both generate full syllabi.

### 4. Styling polish
- Course detail header now includes a "Download syllabus" button (outline, FileDown icon) right-aligned in the stats row.
- Quiz preview dialog uses numbered circular badges for questions, primary-tinted correct-answer highlighting, and a clean info bar (questions available / pass threshold / learner sees / question mix).
- Comparison sheet now meaningfully shows 3 columns with all attributes side-by-side.
- All new UI uses the existing emerald/amber brand tokens for consistency.

## Verification (agent-browser end-to-end)
- Catalog: "3 courses" — Life Skills, Workplace Digital Communication, Financial Literacy all render.
- Comparison: added all 3 → sticky bar → opened sheet → 3-column table with Hours, Accreditation, etc.
- Course detail: "Download syllabus" button present on LSH course page.
- Syllabus API: `curl` → HTTP 200, 609KB Markdown for LSH; 644KB for WDC.
- Quiz preview: opened LSH-101 editor → "Preview quiz" → dialog with "questions available", "Pass threshold", "Reveal answer"; revealing shows Answer + Rationale.
- Console: 0 errors (the DialogDescription a11y warning is now fixed).
- Lint: 0 errors (758 warnings, all from uploaded perplexity HTML assets).

## Unresolved issues / risks + next-phase priorities
- **SCORM is still XML-only**: the manifest downloads but referenced `modules/*.html` SCO files aren't packaged into a zip. A future round could generate per-module HTML stubs + zip everything for turnkey LMS import.
- **Real auth**: identity is still name-only. NextAuth integration remains the biggest roadmap item.
- **Bookmarks are local-only**: persist to localStorage; a future round could persist server-side per learner (requires auth).
- **Quiz preview vs learner quiz divergence**: the preview shows ALL questions while the learner quiz randomly samples 8. A future round could add a "Simulate learner quiz" mode in the preview that shows exactly 8 random questions with scoring.
- **Syllabus is Markdown-only**: a future round could render the syllabus to PDF (via the PDF skill) for a polished printable version.
- Recommend next cron round focus on: (a) SCORM zip packaging (manifest + per-module HTML), (b) NextAuth real authentication, or (c) syllabus PDF rendering + simulated quiz mode in the preview.
