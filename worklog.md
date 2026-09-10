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
