# LIVE SURVEY — 2026-10-05 (post booking-hotfix)

Ground truth taken DIRECTLY from the production Supabase (pg pooler, service credentials in local .env — never committed). Working papers for the CRM ship audit. LMS excluded per owner.

---

## 0. Production incident — CLOSED

- `trigger_crm_sync` on `crm_customers` (migration 0013) — **DROPPED**. Was inserting salon TEXT id into uuid `acct_customer_id` → 42804.
- `trigger_sync_customer_identities` on `customers` (live-only, not in any migration) — **DROPPED**. Same disease; this was the PRIMARY wizard CONTACT-step killer (PostgREST path, exact error the owner saw). Fired only when the email matched an existing `crm_customers` row → returning customers failed, new emails passed.
- Proof: probe INSERTs on both tables SUCCESS; **E2E through the live API: POST /api/customers → 201** (CRM row pre-seeded = returning-customer conditions), Stripe customer created + deleted, zero residue.
- Full-database write-trigger sweep: **0 remaining** write-triggers on public tables (only benign `touch_updated_at` remain).
- Code guards shipped earlier (3915dc7) keep the golden path alive even if a future trigger regresses.

## 1. Database scale (live)

- **403** public base tables (+32 views) — local migration files describe only ~323; live is ahead.
- **347** public functions; code calls exactly **4** RPCs (`rpc_get_profit_and_loss`, `rpc_get_balance_sheet`, `rpc_get_trial_balance`, `rpc_get_general_ledger` — all verified working, double-entry balanced).
- Prefix census: `commerce` 75 · `crm` 79 · `acct` 81 · `erp` 51 · `platform` 14 · `cms` 9 · `payroll` 5 · `pet` 4 · `portal` 3.
- Row counts (dev/test + real): crm_customers 15, crm_appointments 10, crm_pets 12, commerce_orders 11, commerce_payments 25, commerce_products 8, acct_journal_entries 13 / lines 37 (balanced), erp_products 13, erp_inventory_movements 21, customers 8, bookings 7, **dogs 0**, platform_admins 1, **platform_module_permissions 0 (RBAC matrix EMPTY)**.

## 2. Quick actions — the three registries

| Registry | Count | Status |
|---|---|---|
| `platform_quick_action_registry` (live DB — the SPEC) | **237** | by module: accounting 55, analytics 20, customer_portal 20, appointment 18, cms 17, settings 17, system 17, employee_portal 17, customer 19, orders 13, crm 10, fulfillment 6, purchasing 4, staff 4 |
| `quickActionRegistry.ts` (code — the PALETTE) | **184** | 166 mutations + 16 route-nav + 2 other |
| Handler cases across the 7 actions routes | **208** | finance 64 · system 46 · commerce 36 · analytics 35 · crm 19 · cms 16 · appointments 5 |

**Wiring matrix (code registry → handler): 140/166 mutations WIRED. 26 broken** — coded + visible in the palette, clicking them falls through to "Unknown action":

- Appointment status pipeline (7): `check_in` `in_service` `complete` `cancel` `no_show` `hold` `confirm` — **logic already exists** as PATCH /api/admin/crm/appointments status-update; needs 7 thin cases.
- Gift-card lifecycle (8): `reactivate_gc` `expire_gc` `transfer_gc` `edit_gc` `replace_gc` `void_gc` `send_gc_receipt` `reissue_gc`.
- Register slips (6): `print_receipts` `refunds` `credits` `discounts` `gift_card` (+ `reg-*` naming vs live `accts_register_*`).
- Financial report aliases (6): `pnl` `balance_sheet` `trial_balance` `general_ledger` `revenue` `commission` — **RPCs exist & verified**; routes already have `run_pnl`/`run_profit_loss` cases — pure alias mismatch.

**Live-spec gap: 133 live actions have no same-named code entry.** Name drift inflates this (e.g. live `cms_edit_gateway` vs code `cms-edit-gateway-settings`; live `apt_add_waitlist` vs code `apt-add-to-waitlist`): a meaningful fraction are semantic duplicates. The genuinely NEW module families (no code counterpart at all):

- `cp_*` customer portal (~17): cancel/reschedule/schedule, edit contact+prefs+payment methods, magic link, track order, view documents/messages/photos/rewards/status
- `emp_*` employee portal (~14): check-in, update status, release to front desk, groomer notes, recommend products, upload images, view today/tomorrow/week/month, documents, training
- `sys_search_*` (8): search customers/appointments/invoices/payments/messages/documents/pets
- `sys_run_*` automations (8): appt reminders, birthday msgs, payment reminders, vaccine reminders, unsigned docs, winback, duplicate detection
- `rpt_run_*`/`rpt_view_*` analytics family (~20)
- `org_*` settings family (~16): hours, blackouts, locations, users/roles/2FA, deposit/cancel policies, branding, backup, health

## 3. Tables not wired (219/403 never referenced in src)

| Module | Unwired | Notable gaps |
|---|---|---|
| acct | 67 | full AP/AR document lines, allocations, assets, consolidation, FX, intercompany, leases, budgets, workflows, timesheets |
| crm | 45 | leads, campaigns, segments, automation workflows, commissions, households, duplicate candidates, search index, saved views, funnels |
| erp | 37 | pick tasks/waves, shipments/packages, returns/inspections, replenishment, lots/serials, reservations, cost layers, count sessions |
| commerce | 36 | subscriptions family (8), loyalty (2), store credit (2), price lists, barcodes, carts, disputes, outbox/webhook events |
| platform | 10 | vendor identity links, backups, reserved slugs, workflow validation |
| misc | 24 | legacy salon duplicates (bills/invoices/receipts/sales_orders families), recurring invoices, payroll, bank |

Triage: most `acct`/`erp` depth is spec-ahead-of-need for a single-salon ship. The tables the 237 actions actually touch are a much smaller set — wire those; document the rest as backlog.

## 4. Client-side data layer

- TanStack: **24 query hooks** (`useQueries.ts`) + `useQuickActions` mutation engine (auto cache-invalidation map). Admin pages (50+) mix hooks + direct service calls.
- Portal pages exist: groomer/frontdesk/customer under `src/app/(portals)/` — the `emp_*`/`cp_*` actions above are their unwired surface.
- RBAC: `platform_module_permissions` write-side UI exists, **enforcement = zero** (0 rows; no reader) + 14 admin routes lack `requireAdminApi` (see audit_report_DEEP-AUDIT-API.md). Single-admin salon ships fine; multi-user is a stretch goal.

## 5. Ship-readiness math (owner's 70% claim, verified)

237 spec actions → 140 wired + ~18 route-nav working ≈ **158/237 = 67%** (matches owner's 70% estimate).
- Fix the 26 broken (thin cases + aliases, mostly reuse of existing logic) → 184/237 = **78%**
- Name-reconcile + absorb semantic duplicates from the 133 → est. ~70 genuinely-new actions → 2-day target.

## 6. Execution plan (2 days, handlers-first, no stubs, no subagents)

**Phase 0 (first 2h) — Registry reconciliation:** merge the 237-action live spec into `quickActionRegistry.ts` as the single source of truth (canonical ids, payload fields from the spec's display names); regenerate the DB registry from code. Kills the drift class permanently.

**Phase 1 (day 1) — Cross-cutting spine (shared by CRM/appointments/orders/accounting/portals):**
1. Appointment status pipeline: 7 cases delegating to the existing PATCH status logic + status history + audit.
2. Gift-card lifecycle: 8 cases on `commerce_gift_cards`/`_transactions` (states + balances, idempotent).
3. Financial report aliases: 6 case aliases → existing verified RPCs.
4. `sys_search_*`: one parameterized search handler × 8 entities.
5. `sys_run_*` automations: 8 cases over crm tables (reminders via existing email lib; winback/dup-detection as real queries).

**Phase 2 (day 1 late → day 2) — Portals:**
6. Employee portal `emp_*`: groomer day views (today/tomorrow/week/month via crm_staff_shifts + appointments), check-in/status/release via the Phase-1 pipeline, notes/products/images via existing grooming-record + media APIs.
7. Customer portal `cp_*`: self-service profile/prefs (portal_customer_accounts + crm_customer_preferences), reschedule/cancel via pipeline, track order (commerce_orders), documents/messages/photos reads.
8. `org_*` settings: hours/blackouts/locations/users/policies via existing admin settings + crm_* tables.

**Phase 3 (day 2 stretch) — Ship hardening:** RBAC enforcement reader (module_permissions gate in requireAdminApi) + the 14 ungated routes; unwired-table triage document.

**Verification bar per handler (non-negotiable):** real DB write against live Supabase, audit-log row, TanStack cache invalidation, palette E2E click-through. Same bar the Module 7/9 work met (16/16).
