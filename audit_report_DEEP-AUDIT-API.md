# Pawx Branch — API Route Alive/Dead Inventory (Task DEEP-AUDIT-API)

Audit performed by reading `origin/Pawx` branch. All 161 API route files inventoried file-by-file. No files modified, no servers run.

## Summary

- **Total API routes:** 161
- **ALIVE (called by frontend):** 124
- **DEAD (zero callers in frontend):** 35
- **EXTERNAL (called by Stripe/Supabase webhook, not frontend):** 2 (`/api/stripe/webhook`, `/api/revalidate`)
- **Routes using `supabase` (PostgREST):** 28
- **Routes using `pgQuery`/`pgExec` (raw pg, no transaction):** 41
- **Routes using `withPg` (raw pg w/ transaction, from `@/lib/crm/enterprise`):** 40
- **Routes mixing `withPg` + `pgQuery` + `pgExec`:** several (admin/invoices, admin/refunds, etc.)
- **Routes WITHOUT admin gate:** 75 — most are legitimately public (auth, customer portal, shop, webhooks, LMS classroom AI), but **14 admin-prefixed routes lack `requireAdminApi`** and are a security risk (see below).
- **Routes querying DROPPED tables:** 3 (`/api/admin/route.ts`, `/api/instructor/route.ts`, `/api/instructor/review/route.ts`) — all reference the legacy LMS demo tables `course`, `courseEnrollment`, `learningDay`, `knowledgeChunk`, `humanNeedQueue`, `learningAttempt`. None of these tables are in any current migration. All three routes are also DEAD.
- **Routes querying tables NOT in any `CREATE TABLE` migration:** `/api/stripe/webhook` (`payment_transactions`, `commerce_orders`) and ~30 routes that query `commerce_orders`/`commerce_order_items` — these tables have `ALTER TABLE` statements (migration 0013) and indexes but no `CREATE TABLE` in the repo (likely created via Supabase dashboard). They exist on the live DB.
- **Routes querying tables in the wrong schema:** `/api/admin/users` queries `public.role_definitions` but the schema defines `lms.role_definitions`. The route catches the error silently.

## Status Legend
- **ALIVE** — at least one fetch caller in `src/` (excluding `src/app/api/`)
- **DEAD** — zero fetch/nav callers anywhere in `src/`
- **EXTERNAL** — called by an external system (Stripe, Supabase webhook, OAuth provider) — not by frontend code

## Gate Legend
- `requireAdminApi` — uses `@/lib/admin/gate` admin gate
- `auth.users` lookup — does its own Supabase session check
- `REVALIDATE_SECRET` — bearer-token webhook auth
- `Stripe signature` — Stripe webhook signature verification
- `none` — no auth; runs on any caller
- `getVisitor` — uses a demo visitor cookie (NOT a real auth gate)

---

## Section A — `/api/admin/*` routes (103 routes)

```
ALIVE     | GET              | /api/admin/analytics/operations        | requireAdminApi    | crm_staff, commerce_catalog_items, erp_inventory_movements           | analyticsService.ts                                              | Staff workload + inventory KPIs for operations dashboard
ALIVE     | GET              | /api/admin/analytics/overview          | requireAdminApi    | crm_appointments, crm_customers, commerce_payments, crm_staff, erp_inventory_movements, commerce_orders | analyticsService.ts                                              | Top-line counts for dashboard tiles
ALIVE     | GET              | /api/admin/analytics/revenue           | requireAdminApi    | commerce_orders, commerce_payments, crm_customers                     | analyticsService.ts                                              | Revenue-over-time + payment-method breakdown
ALIVE     | GET              | /api/admin/audit-logs                 | requireAdminApi    | lms.platform_audit_log                                               | SystemHealthTelemetryScreen.tsx                                 | Read audit log entries
ALIVE     | GET              | /api/admin/books                      | requireAdminApi    | acct_books, acct_chart_of_accounts                                    | financeService.ts                                                | List accounting books + chart-of-accounts
ALIVE     | GET,POST         | /api/admin/brands                     | requireAdminApi    | commerce_products (PostgREST), cms-media storage                      | brands/page.tsx, products/page.tsx                               | List + create product brands (with logo upload)
ALIVE     | PATCH,DELETE     | /api/admin/brands/[id]                | requireAdminApi    | commerce_products (PostgREST)                                          | brands/page.tsx, products/page.tsx                               | Update / delete brand
ALIVE     | GET,POST         | /api/admin/categories                 | requireAdminApi    | pet_product_categories (PostgREST)                                    | categories/page.tsx, products/page.tsx                           | List + create pet-product categories
ALIVE     | PATCH,DELETE     | /api/admin/categories/[id]            | requireAdminApi    | pet_product_categories, commerce_products (PostgREST)                  | categories/page.tsx, products/page.tsx                           | Update / delete category (with parent/product guard)
ALIVE     | POST             | /api/admin/commerce/actions            | requireAdminApi    | erp_inventory_movements, commerce_orders                              | quickActionService.ts                                            | Quick-action dispatcher (restock / set-fulfillment-status / create-order)
ALIVE     | GET,POST         | /api/admin/coupons                    | requireAdminApi    | commerce_coupons (via enterprise withPg)                               | promotions/page.tsx                                              | List + create coupons
ALIVE     | PATCH,DELETE     | /api/admin/coupons/[id]               | requireAdminApi    | commerce_coupons (via enterprise withPg)                               | promotions/page.tsx                                              | Update / delete coupon
DEAD      | POST             | /api/admin/course-architect           | NONE (no gate!)    | (no DB tables; calls AI/rag libs)                                     | ZERO callers                                                     | AI lesson authoring draft generator
ALIVE     | POST             | /api/admin/crm/actions                | requireAdminApi    | crm_customers, crm_pets, crm_messages, crm_notes                      | quickActionService.ts                                            | Quick-action dispatcher (create customer / pet / send message / add note)
ALIVE     | GET,POST,PATCH   | /api/admin/crm/appointments            | requireAdminApi    | crm_appointments, crm_appointment_pets, crm_appointment_services, crm_appointment_status_history | bookingService.ts, crmService.ts, quickActionService.ts          | List, update, status-update appointments (w/ pet+service joins)
ALIVE     | POST             | /api/admin/crm/appointments/actions   | requireAdminApi    | crm_appointments, crm_appointment_status_history, crm_waitlist         | quickActionService.ts                                            | Appt quick actions: mark-no-show, send-reminder, add-to-waitlist
ALIVE     | GET,POST         | /api/admin/crm/customers              | requireAdminApi    | crm_customers, crm_customer_pets, crm_pets, crm_tags, crm_customer_tags | CustomerDetailsView.tsx, QuickActionModals.tsx, crmService.ts   | List/search/create customers with pets+tags eager-loaded
ALIVE     | GET,POST         | /api/admin/crm/documents             | requireAdminApi    | crm_documents                                                          | CustomerDetailsView.tsx, CustomerQuickActionsViews.tsx, crmService.ts | List + upload customer compliance documents
ALIVE     | PATCH            | /api/admin/crm/documents/[id]          | requireAdminApi    | crm_documents, lms.platform_audit_log                                  | CustomerDetailsView.tsx, CustomerQuickActionsViews.tsx, crmService.ts | Approve / reject a document
DEAD      | GET              | /api/admin/crm/funnel_events          | requireAdminApi    | crm_funnel_events                                                      | ZERO callers                                                     | Read funnel events (no UI consumes)
ALIVE     | GET              | /api/admin/crm/grooming-records       | requireAdminApi    | crm_grooming_records, crm_grooming_record_services, crm_appointments, crm_customers | dashboard/page.tsx, grooming-records/page.tsx, CustomerDetailsView.tsx | List grooming records
ALIVE     | PATCH            | /api/admin/crm/grooming-records/[id]   | requireAdminApi    | crm_grooming_records                                                   | dashboard/page.tsx, grooming-records/page.tsx, CustomerDetailsView.tsx | Edit grooming record notes + status
ALIVE     | GET              | /api/admin/crm/locations              | requireAdminApi    | crm_locations                                                          | useLocations.ts, crmService.ts                                  | List locations
DEAD      | GET              | /api/admin/crm/message_templates      | requireAdminApi    | crm_message_templates                                                 | ZERO callers                                                     | List message templates (no UI consumes)
ALIVE     | GET,POST         | /api/admin/crm/messages               | requireAdminApi    | crm_messages                                                           | AppointmentTaskModals.tsx, CustomerDetailsView.tsx, CustomerQuickActionsViews.tsx, crmService.ts | List + send outbound customer messages
ALIVE     | GET,POST         | /api/admin/crm/notes                  | requireAdminApi    | crm_notes                                                              | AppointmentTaskModals.tsx, CustomerDetailsView.tsx, CustomerQuickActionsViews.tsx, crmService.ts | List + create customer notes
DEAD      | GET              | /api/admin/crm/permanent_alerts       | requireAdminApi    | crm_permanent_alerts                                                   | ZERO callers                                                     | List permanent customer/pet alerts (no UI)
ALIVE     | GET,POST         | /api/admin/crm/pets                   | requireAdminApi    | crm_pets, crm_customers, crm_customer_pets                             | pets/page.tsx, CustomerDetailsView.tsx, QuickActionModals.tsx, CustomerQuickActionsViews.tsx, crmService.ts | List/search/create pets with customer-join
ALIVE     | PATCH            | /api/admin/crm/pets/[id]              | requireAdminApi    | crm_pets, crm_customer_pets                                            | pets/page.tsx, CustomerDetailsView.tsx, QuickActionModals.tsx, CustomerQuickActionsViews.tsx, crmService.ts | Update pet + manage primary pet link
ALIVE     | GET,POST         | /api/admin/crm/pets/[id]/vaccinations | requireAdminApi    | crm_pet_vaccinations, crm_vaccine_types, crm_pets                      | pets/page.tsx, CustomerDetailsView.tsx, QuickActionModals.tsx, CustomerQuickActionsViews.tsx, crmService.ts | List + record pet vaccinations
ALIVE     | GET              | /api/admin/crm/services               | requireAdminApi    | crm_services                                                           | ServicesView.tsx, crmService.ts                                  | List CRM services
DEAD      | GET              | /api/admin/crm/shift_templates        | requireAdminApi    | crm_shift_templates                                                    | ZERO callers                                                     | List shift templates (no UI)
ALIVE     | GET              | /api/admin/crm/staff                  | requireAdminApi    | crm_staff, crm_appointments                                            | dashboard/page.tsx, crmService.ts, staffService.ts               | List staff with today's appointment count
DEAD      | GET              | /api/admin/crm/staff_availability     | requireAdminApi    | crm_staff_availability                                                 | ZERO callers                                                     | List staff availability (no UI)
DEAD      | GET              | /api/admin/crm/tags                   | requireAdminApi    | crm_tags                                                               | ZERO callers                                                     | List customer tags (no UI)
ALIVE     | GET,POST         | /api/admin/crm/waitlist               | requireAdminApi    | crm_waitlist                                                           | CustomerDetailsView.tsx                                          | List + add to waitlist
ALIVE     | GET              | /api/admin/deposits                   | requireAdminApi    | commerce_deposits, commerce_payments                                    | DepositsView.tsx, financeService.ts                             | Deposit & escrow ledger
ALIVE     | GET,POST         | /api/admin/filters                    | requireAdminApi    | pet_product_filters, pet_product_filter_values, pet_product_categories, pet_category_filters (PostgREST) | filters/page.tsx                                                | List + create filters
ALIVE     | POST             | /api/admin/filters/[id]/map           | requireAdminApi    | pet_category_filters (PostgREST)                                       | filters/page.tsx                                                 | Map filter to category
ALIVE     | DELETE           | /api/admin/filters/[id]/map/appingId] | requireAdminApi   | pet_category_filters (PostgREST)                                       | filters/page.tsx                                                 | Remove filter-category mapping (filename has typo "appingId]")
ALIVE     | PATCH,DELETE     | /api/admin/filters/[id]               | requireAdminApi    | pet_product_filters, pet_product_filter_values, pet_category_filters, commerce_products (PostgREST) | filters/page.tsx                                                | Update / delete filter
ALIVE     | POST             | /api/admin/filters/[id]/values        | requireAdminApi    | pet_product_filter_values (PostgREST)                                  | filters/page.tsx                                                 | Add value to filter
ALIVE     | DELETE           | /api/admin/filters/values/[valueId]   | requireAdminApi    | pet_product_filter_values (PostgREST)                                  | filters/page.tsx                                                 | Delete a filter value
ALIVE     | POST             | /api/admin/finance/actions            | requireAdminApi    | acct_ar_invoices, commerce_orders, commerce_gift_cards                  | quickActionService.ts                                            | Quick actions: mark-invoice-paid, void-invoice, refund-order, issue-gift-card, redeem-gift-card
ALIVE     | GET              | /api/admin/financial-settings         | requireAdminApi    | acct_entities, acct_fiscal_years, acct_periods, acct_currencies, acct_books | financeService.ts                                                | Accounting settings: entities, fiscal years, periods, currencies, books
ALIVE     | GET,PATCH        | /api/admin/fulfillment                | requireAdminApi    | commerce_orders                                                        | commerceActionService.ts                                         | List orders + bulk-update fulfillment_status
ALIVE     | GET              | /api/admin/gift-cards                 | requireAdminApi    | commerce_gift_cards                                                    | financeService.ts                                                | List gift cards
ALIVE     | GET,POST         | /api/admin/inventory                  | requireAdminApi    | commerce_catalog_items, erp_inventory_movements                         | commerceActionService.ts, inventoryService.ts                   | List inventory + movement history
ALIVE     | POST             | /api/admin/inventory/restock          | requireAdminApi    | commerce_catalog_items, erp_inventory_movements                        | commerceActionService.ts                                         | Restock SKU (creates receipt movement + updates bin_location)
ALIVE     | GET,POST         | /api/admin/invoices                   | requireAdminApi    | invoices, invoice_items, bookings, customers (camelCase legacy)        | QuickActionModals.tsx, InvoicesView.tsx, financeService.ts       | List + create invoices (creates customer record if missing)
ALIVE     | POST             | /api/admin/invoices/[id]/payments    | requireAdminApi    | invoices, invoice_items, commerce_payments, crm_customers             | QuickActionModals.tsx, InvoicesView.tsx, financeService.ts       | Record invoice payment
DEAD      | GET              | /api/admin/lms                        | NONE (no gate!)    | information_schema.tables, information_schema.columns                 | ZERO callers                                                     | LMS schema introspection (table/column browser) — admin route WITHOUT admin gate
ALIVE     | GET              | /api/admin/lms-ai-instructor         | NONE (no gate!)    | lms.ai_instructor_personas, lms.ai_prompt_templates                    | useAiInstructor.ts                                               | AI instructor personas + prompt templates
ALIVE     | GET              | /api/admin/lms-ai-teaching            | NONE (no gate!)    | lms.ai_teaching_sessions                                               | useAiTeachingSessions.ts                                        | AI teaching sessions
ALIVE     | GET              | /api/admin/lms-assessment             | NONE (no gate!)    | lms.artifact_submissions, lms.grade_book, lms.quiz_attempts           | useAssessments.ts                                                | LMS assessment dashboard (submissions, grade book, quiz attempts)
ALIVE     | GET              | /api/admin/lms-bridge                 | NONE (no gate!)    | lms.platform_bridge_sync_log, lms.commerce_sync_queue                  | useBridge.ts                                                     | LMS<->Commerce bridge sync status
ALIVE     | GET              | /api/admin/lms-communication          | NONE (no gate!)    | lms.announcements, lms.notification_queue                             | useCommunications.ts                                             | LMS announcements + notification queue
ALIVE     | GET              | /api/admin/lms-compliance             | NONE (no gate!)    | lms.compliance_documents, lms.platform_audit_log                      | useCompliance.ts                                                 | LMS compliance documents + audit log
ALIVE     | GET              | /api/admin/lms-curriculum             | NONE (no gate!)    | lms.courses                                                            | useCourses.ts                                                    | LMS courses list
ALIVE     | GET              | /api/admin/lms-dashboard              | NONE (no gate!)    | lms.courses, lms.enrollments, lms.ai_teaching_sessions, lms.pathways, lms.ai_tutor_messages, lms.ai_rag_chunks | useLmsDashboard.ts                                              | LMS dashboard counts
ALIVE     | GET              | /api/admin/lms-enrollment             | NONE (no gate!)    | lms.enrollments                                                        | useEnrollments.ts                                                | LMS enrollments list
ALIVE     | GET              | /api/admin/lms-media                  | NONE (no gate!)    | lms.media_assets                                                      | useMedia.ts                                                      | LMS media library list
ALIVE     | GET              | /api/admin/lms-progress               | NONE (no gate!)    | lms.lesson_progress, lms.module_progress                             | useLearnerProgress.ts                                            | LMS learner progress
ALIVE     | GET              | /api/admin/lms-skills                 | NONE (no gate!)    | lms.skills, lms.skill_signoffs, lms.credentials, lms.badges            | useSkills.ts                                                     | LMS skills + signoffs + credentials + badges
ALIVE     | GET              | /api/admin/lms-support                 | NONE (no gate!)    | lms.human_escalation_routing, lms.navigator_caseloads                 | useSupport.ts                                                    | LMS human-escalation + navigator caseloads
ALIVE     | GET              | /api/admin/marketing/automations      | requireAdminApi    | crm_automation_workflows, crm_automation_enrollments, crm_automation_runs | marketingService.ts                                              | Marketing automation workflows + enrollments + runs
ALIVE     | GET              | /api/admin/marketing/campaigns         | requireAdminApi    | crm_campaigns, crm_campaign_members, crm_message_templates, crm_segments, crm_segment_memberships | marketingService.ts                                              | Marketing campaigns + templates + segments
ALIVE     | POST             | /api/admin/media                       | requireAdminApi    | cms-media storage (Supabase Storage)                                    | brands/page.tsx, categories/page.tsx                            | Upload media to cms-media bucket, returns public URL
ALIVE     | POST             | /api/admin/orders/[id]/actions/packing-slip | requireAdminApi | (uses lib/receipt, queries orders)                                     | multiple OrderDetailsView.tsx, OrdersView.tsx, useOrders.ts, commerceActionService.ts | Generate packing slip PDF
ALIVE     | POST             | /api/admin/orders/[id]/actions/resend-alert | requireAdminApi | crm_funnel_events                                                      | multiple OrderDetailsView.tsx, OrdersView.tsx, useOrders.ts, commerceActionService.ts | Re-fire order alert (writes funnel_event)
ALIVE     | GET              | /api/admin/orders/export              | requireAdminApi    | commerce_orders, commerce_order_items                                  | ReportsView.tsx                                                  | CSV export of orders
ALIVE     | GET,PATCH        | /api/admin/orders                     | requireAdminApi    | commerce_orders, commerce_order_items                                  | dashboard/page.tsx, vendors/page.tsx, DashboardView.tsx, OrderDetailsView.tsx, OrdersView.tsx, PurchaseOrdersView.tsx, ReportsView.tsx, ReturnsView.tsx, ShippingStationView.tsx, useOrders.ts | List + bulk-update orders
ALIVE     | GET              | /api/admin/payments                   | requireAdminApi    | commerce_payments, commerce_payment_methods                            | BooksView.tsx, PaymentsView.tsx, crmService.ts, financeService.ts | Payments ledger
ALIVE     | GET              | /api/admin/payroll                    | requireAdminApi    | crm_staff, crm_appointments, commerce_payments                        | PayrollView.tsx, financeService.ts                              | Staff payroll (appts + tips last N days)
ALIVE     | GET,POST         | /api/admin/permissions                | requireAdminApi    | auth.users, crm_staff, platform_module_permissions                    | UsersStaffRolesScreen.tsx                                       | List + assign module permissions
ALIVE     | GET,POST         | /api/admin/pos                        | requireAdminApi    | (uses lib/enterprise pos helpers — eventually commerce_*)              | subscriptions/page.tsx, InventoryView.tsx, CustomerQuickActionsViews.tsx, ReturnsView.tsx, usePOS.ts | POS catalog + checkout
DEAD      | GET,POST         | /api/admin/pos/receipt                | requireAdminApi    | commerce_sales, commerce_sale_lines, commerce_payments, commerce_payment_methods, commerce_receipts, customers | ZERO callers                                                     | Receipt PDF generator + email (no UI consumes)
ALIVE     | GET              | /api/admin/products                   | requireAdminApi    | erp_products, erp_inventory_movements                                 | pos/page.tsx, products/page.tsx, InventoryView.tsx, OrderDetailsView.tsx | List products (canonical ERP)
ALIVE     | PATCH,DELETE     | /api/admin/products/[id]              | requireAdminApi    | erp_products (likely)                                                 | pos/page.tsx, products/page.tsx, InventoryView.tsx, OrderDetailsView.tsx | Update / delete product
ALIVE     | GET,POST         | /api/admin/promotions                 | requireAdminApi    | commerce_promotions (via enterprise withPg)                            | promotions/page.tsx                                             | List + create promotions
ALIVE     | PATCH,DELETE     | /api/admin/promotions/[id]            | requireAdminApi    | commerce_promotions (via enterprise withPg)                            | promotions/page.tsx                                             | Update / delete promotion
ALIVE     | GET              | /api/admin/purchase-orders           | requireAdminApi    | erp_purchase_orders, erp_vendors                                      | inventoryService.ts                                             | List purchase orders + vendors
ALIVE     | GET,POST         | /api/admin/refunds                    | requireAdminApi    | commerce_refunds, commerce_disputes, commerce_refund_lines, commerce_payments | CustomerDetailsView.tsx, CustomerQuickActionsViews.tsx, RefundsView.tsx, financeService.ts | List refunds + create refund payment
ALIVE     | GET              | /api/admin/reports                    | requireAdminApi    | commerce_payments, commerce_payment_methods                            | ReportsView.tsx, financeService.ts                             | Financial reports (revenue + by-method)
ALIVE     | POST             | /api/admin/returns/[id]/refund        | requireAdminApi    | commerce_orders, crm_funnel_events                                     | commerceActionService.ts                                        | Refund a return (marks order refunded + logs funnel event)
DEAD      | GET              | /api/admin/returns                    | requireAdminApi    | commerce_orders                                                        | ZERO callers                                                     | List returns (ReturnsView.tsx fetches orders instead, NOT this endpoint)
DEAD      | GET              | /api/admin/route                      | NONE (no gate!)    | course, courseEnrollment, learningDay, knowledgeChunk, humanNeedQueue  | ZERO callers                                                     | **BROKEN**: queries 5 dropped LMS demo tables via PostgREST; never called
ALIVE     | GET,POST         | /api/admin/settings                   | requireAdminApi    | cms_global_content, lms.platform_audit_log                            | OrgMultiLocationScreen.tsx, SettingsOverviewDashboardScreen.tsx, useSettings.ts | Read + upsert global CMS content (key/value settings)
ALIVE     | GET,POST         | /api/admin/shipping                   | requireAdminApi    | commerce_orders, commerce_order_items, commerce_fulfillment_events, commerce_shipping_labels | ShippingStationView.tsx                                         | List shippable orders + create shipping label (USPS via EasyPost)
DEAD      | POST             | /api/admin/shipping/usps              | requireAdminApi    | (calls USPS/EasyPost APIs, no DB)                                     | ZERO callers                                                     | Get USPS rates for a parcel (no UI consumes)
DEAD      | POST             | /api/admin/shipping/usps/poll         | requireAdminApi    | (calls USPS/EasyPost APIs, no DB)                                     | ZERO callers                                                     | Poll USPS tracking (no UI consumes)
ALIVE     | GET              | /api/admin/staff/schedules           | requireAdminApi    | crm_staff_shifts, crm_shift_templates, crm_staff_time_clock_entries   | staffService.ts                                                  | Staff schedules + shift templates + time-clock entries
ALIVE     | GET              | /api/admin/stripe-connections        | requireAdminApi    | commerce_payment_methods                                              | financeService.ts                                                | List connected Stripe payment methods
ALIVE     | POST             | /api/admin/system/actions             | requireAdminApi    | crm_locations, crm_operating_hours, crm_staff_time_clock_entries, crm_staff_incident_reports | quickActionService.ts                                            | Quick actions: add-location, toggle-online-booking, clock-in/out, file-incident
ALIVE     | GET              | /api/admin/system/global-search       | requireAdminApi    | crm_customers, crm_pets, crm_appointments, commerce_orders            | quickActionService.ts                                            | Global search across customers/pets/appointments/orders
ALIVE     | GET              | /api/admin/taxes                      | requireAdminApi    | acct_tax_codes, acct_tax_jurisdictions                                | financeService.ts                                                | List tax codes + jurisdictions
ALIVE     | GET,POST,PATCH   | /api/admin/users                      | requireAdminApi    | auth.users, tenant_memberships, portal_customer_accounts, customers, commerce_orders, role_definitions (wrong-schema!), staff | UsersAccessTab.tsx, SettingsOverviewDashboardScreen.tsx, UsersStaffRolesScreen.tsx | List + invite + update users (broken on role_definitions query — silently swallowed)
ALIVE     | POST             | /api/admin/users/unlink               | requireAdminApi    | portal_customer_accounts, customers                                    | UsersStaffRolesScreen.tsx                                        | Unlink a Supabase auth user from a customer record
```

## Section B — `/api/analytics/*` (2 routes)

```
ALIVE     | GET,POST         | /api/analytics/events                | requireAdminApi (GET), open (POST) | analytics_events                | AnalyticsReportingScreen.tsx, lib/analytics.ts                  | POST: public event ingest (no auth). GET: admin-only list.
DEAD      | GET              | /api/analytics/revenue               | requireAdminApi    | commerce_payments                                                       | ZERO callers                                                     | Revenue aggregate (duplicate of /api/admin/analytics/revenue; no UI uses this version)
```

## Section C — `/api/atlas` (1 route)

```
ALIVE     | GET              | /api/atlas                           | NONE (uses getVisitor cookie) | (no DB)                                                            | course-builder.tsx                                               | Atlas pathway map for the course-builder UI
```

## Section D — `/api/auth/*` (13 routes)

```
DEAD      | GET              | /api/auth/admin/session              | NONE (cookie-based portal scope) | (no DB, reads session)                                  | ZERO callers                                                     | Admin-portal-scoped session check (no frontend uses)
DEAD      | GET              | /api/auth/customer/session           | NONE (portal scope) | (no DB)                                                              | ZERO callers                                                     | Customer-portal-scoped session check (no frontend uses)
DEAD      | POST             | /api/auth/email-link                 | NONE (cookie)      | auth.users, customers, staff                                          | ZERO callers (the /auth/callback page uses its OWN logic, not this) | Email magic-link sign-in completer
DEAD      | GET              | /api/auth/frontdesk/session          | NONE (portal scope) | (no DB)                                                              | ZERO callers                                                     | Frontdesk-portal-scoped session check (no frontend uses)
EXTERNAL  | GET              | /api/auth/google/callback            | NONE (OAuth state) | auth.users, staff, customers                                          | pawz-auth.ts (referenced in comment, not fetch)                 | Google OAuth callback landing — resolves role + redirects to portal
ALIVE     | GET              | /api/auth/google                     | NONE (cookie)      | (no DB, builds OAuth URL)                                              | GoogleButton.tsx                                                 | Start Google OAuth (redirects to accounts.google.com)
DEAD      | GET              | /api/auth/google/start               | NONE               | (no DB; re-exports GET from ../route)                                 | ZERO callers (only referenced in comments)                      | Alias of /api/auth/google (OAuth initiator)
DEAD      | GET              | /api/auth/groomer/session            | NONE (portal scope) | (no DB)                                                              | ZERO callers                                                     | Groomer-portal-scoped session check (no frontend uses)
ALIVE     | POST             | /api/auth/invite                     | NONE               | auth.users (Supabase admin), customers, staff (PostgREST)             | CustomerDetailsView.tsx                                          | Invite customer by email (creates auth user + customer/staff record)
DEAD      | GET              | /api/auth/lms/session                | NONE (portal scope) | (no DB)                                                              | ZERO callers                                                     | LMS-portal-scoped session check (no frontend uses)
ALIVE     | POST             | /api/auth/login                      | NONE (cookie)      | auth.users (Supabase signInWithPassword), customers, staff             | EmailPasswordForm.tsx                                            | Email/password sign-in (resolves role from salon records)
ALIVE     | POST             | /api/auth/logout                     | NONE (cookie)      | (no DB, supabase.auth.signOut)                                         | admin/customer/frontdesk/groomer layout.tsx                     | Sign out + clear portal session cookie
ALIVE     | GET              | /api/auth/portal-session             | NONE (cookie)      | auth.users, customers, staff                                          | useSessionQuery.ts                                               | Returns current portal-scoped session user
ALIVE     | GET,POST         | /api/auth/route                      | NONE               | auth.users, lms.learner_profiles, staff, lms.lms_roles                 | lms-design-system Navbar.tsx, SignInView.tsx, OnboardingFlow.tsx | LMS learner sign-in/sign-up (Google or password)
DEAD      | GET              | /api/auth/session                    | NONE (bearer)      | auth.users, customers, staff (PostgREST)                               | ZERO callers (frontend uses /api/auth/portal-session instead)   | Legacy bearer-token session resolver
```

## Section E — `/api/availability` & `/api/bookings/*` (3 routes)

```
ALIVE     | GET              | /api/availability                     | NONE              | (no DB; reads in-memory? unclear)                                      | booking-wizard-v2.tsx, booking-wizard.tsx                       | Compute available time slots for a service+date
ALIVE     | POST             | /api/bookings                         | NONE              | bookings, auth.users (legacy Supabase camelCase)                       | dashboard/page.tsx, AppointmentTaskModals.tsx, AppointmentsView.tsx, CustomerDetailsView.tsx, GroomerPortalView.tsx, QuickActionModals.tsx, CustomerQuickActionsViews.tsx, InvoicesView.tsx | Public booking submission (writes to bookings table)
ALIVE     | POST             | /api/bookings/checkout                | NONE              | commerce_orders, commerce_payments, crm_appointments, crm_customers (via syncCrmAppointment) | booking-wizard-v2.tsx, booking-wizard.tsx                       | Stripe checkout for a booking + persist appointment-specific grooming request
```

## Section F — `/api/checkout`, `/api/classroom`, `/api/cms/*` (4 routes)

```
DEAD      | POST             | /api/checkout                         | NONE              | (uses repo/Supabase)                                                   | ZERO callers (frontend uses /api/bookings/checkout + /api/shop/checkout) | Stripe checkout for shop products (older endpoint; replaced by /api/shop/checkout)
ALIVE     | GET,POST         | /api/classroom                        | NONE (uses getVisitor) | (uses repo/Supabase — consults courses etc.)                       | classroom.tsx                                                   | LMS classroom — load today's day + post day interactions
ALIVE     | DELETE,GET,POST,PUT | /api/cms/[...slug]                 | requireAdminApi on POST/PUT/DELETE; GET is open | (uses repo/CMS tables — services, settings, etc.)         | account/page.tsx, booking-form.tsx, booking-wizard-v2.tsx, consultation-form.tsx, contact-form.tsx, newsletter-form.tsx, use-cms.ts, site-chrome.tsx, cms-api.ts | CMS read (public) + write (admin) for arbitrary content slugs
ALIVE     | GET,POST         | /api/cms/newsletter                   | NONE              | newsletter                                                             | newsletter-form.tsx                                             | Public newsletter signup
```

## Section G — `/api/consultations/*` (1 route)

```
DEAD      | POST             | /api/consultations/convert            | NONE              | consultations, customers, dogs (legacy Supabase)                       | ZERO callers                                                     | Convert a consultation record into a customer+dog+booking (no UI consumes)
```

## Section H — `/api/courses` (1 route)

```
ALIVE     | GET              | /api/courses                          | NONE (getVisitor) | (uses repo/Supabase — likely 'course' table via repo abstraction)      | CoursesCatalogView.tsx, ProgramDetailView.tsx, classroom.tsx, lib/db.ts | LMS course catalog (NOTE: route.ts file uses repo abstraction; underlying table is the dropped 'course' if repo goes to Supabase — POTENTIALLY BROKEN)
```

## Section I — `/api/customer/*` (5 routes)

```
ALIVE     | GET,PATCH        | /api/customer/account                 | NONE (session cookie) | customers (camelCase)                                              | customer/dashboard/page.tsx                                     | Get + update customer account (name, phone, etc.)
ALIVE     | GET,POST        | /api/customer/addresses               | NONE              | commerce_customer_addresses, customers (camelCase)                    | customer/dashboard/page.tsx                                     | List + create customer shipping addresses
ALIVE     | PATCH,DELETE    | /api/customer/addresses/[id]          | NONE              | commerce_customer_addresses                                          | customer/dashboard/page.tsx                                     | Update / delete a customer address
ALIVE     | GET,POST        | /api/customer/notifications          | NONE              | user_notifications (likely lms.user_notifications or portal)           | customer/messages/page.tsx                                      | List + dismiss customer notifications
ALIVE     | GET             | /api/customer/orders                  | NONE              | customers, commerce_orders                                           | customer/dashboard/page.tsx, customer/orders/page.tsx          | List customer's orders
```

## Section J — `/api/customers*` (2 routes)

```
DEAD      | POST             | /api/customers/pay                    | NONE              | customers, commerce_payments                                          | ZERO callers                                                     | Customer-initiated payment (no UI consumes — admin/invoices path used instead)
ALIVE     | GET,POST         | /api/customers                        | NONE              | commerce_payments, customers                                          | CustomersView.tsx, booking-wizard-v2.tsx                       | List customers w/ paid-payments total + create customer
```

## Section K — `/api/day`, `/api/dogs/*` (3 routes)

```
ALIVE     | GET,POST         | /api/day                              | NONE (getVisitor) | (no DB; AI/LLM call)                                                 | classroom.tsx                                                   | LMS "day" session — fetch today's lesson + post chat/teach interaction
ALIVE     | GET,POST        | /api/dogs                             | NONE              | dogs (PostgREST view aliasing public.pets)                             | CustomersView.tsx                                               | List/create dogs (via repo abstraction)
ALIVE     | GET,PATCH,POST  | /api/dogs/[id]/photo                  | NONE              | dogs (PostgREST), cms-media storage                                    | CustomersView.tsx, booking-wizard-v2.tsx, pet-card.tsx         | Upload/fetch/update dog photo
```

## Section L — `/api/enroll`, `/api/generate`, `/api/identity`, `/api/instructor*`, `/api/knowledge`, `/api/learner-professor`, `/api/notify/enrollment`, `/api/professor` (9 routes — mostly DEAD)

```
ALIVE     | POST             | /api/enroll                           | NONE              | (uses repo/Supabase — likely lms.enrollments)                          | OnboardingFlow.tsx                                              | LMS onboarding enrollment
ALIVE     | POST             | /api/generate                         | NONE (getVisitor) | (no DB; AI/LLM)                                                       | course-builder.tsx                                              | AI generation for course architect (pathway lesson drafting)
ALIVE     | GET              | /api/identity                         | NONE (getVisitor) | (no DB)                                                                | classroom.tsx                                                   | Resolve visitor identity for the classroom
DEAD      | GET              | /api/instructor                       | NONE (getVisitor) | course, courseEnrollment, learningDay, learningAttempt, humanNeedQueue (PostgREST — all DROPPED) | ZERO callers                                                     | **BROKEN**: instructor dashboard — queries 5 dropped demo tables
DEAD      | POST             | /api/instructor/review                | NONE (getVisitor) | learningAttempt (PostgREST — DROPPED)                                  | ZERO callers                                                     | **BROKEN**: instructor review of learner attempts — queries dropped table
ALIVE     | DELETE,GET,POST  | /api/knowledge                         | NONE (getVisitor) | (uses repo/Supabase — likely 'knowledgeChunk' table — POTENTIALLY BROKEN) | classroom.tsx                                                   | RAG knowledge chunks CRUD (NOTE: 'knowledgeChunk' is in the dropped list per /api/admin/route.ts)
DEAD      | GET,POST         | /api/learner-professor                | NONE              | (no DB; AI/LLM)                                                       | ZERO callers                                                     | Older learner-facing AI professor (replaced by /api/day)
DEAD      | POST             | /api/notify/enrollment                | NONE              | (no DB; calls email lib)                                              | ZERO callers                                                     | Send enrollment notification email (no caller)
DEAD      | GET,POST         | /api/professor                        | NONE (getVisitor) | (no DB; AI/LLM)                                                       | ZERO callers                                                     | Older AI professor (replaced by /api/day)
```

## Section M — `/api/revalidate*`, `/api/route.ts`, `/api/school`, `/api/send-email` (5 routes)

```
DEAD      | POST             | /api/revalidate-shop                  | requireAdminApi   | (no DB; calls revalidatePath)                                         | ZERO callers                                                     | Revalidate shop pages (admin revalidation helper)
EXTERNAL  | POST             | /api/revalidate                       | REVALIDATE_SECRET (bearer) | (no DB; calls revalidatePath)                                | ZERO callers in src/ — called by Supabase webhook               | Supabase webhook target for CMS content revalidation
ALIVE     | GET              | /api/route                            | NONE              | (no DB)                                                                | robots.ts, consent-boot.ts, portal-paths.ts                    | Health check / portal manifest
ALIVE     | GET,POST         | /api/school                           | NONE (getVisitor) | (uses repo/Supabase — likely 'course' table — POTENTIALLY BROKEN)     | classroom.tsx                                                    | LMS school dashboard + create course
ALIVE     | POST             | /api/send-email                       | NONE (no gate!)   | (no DB; calls Resend)                                                 | OrderDetailsView.tsx                                            | **SECURITY RISK**: Manually send an arbitrary email — NO auth, anyone can spam
```

## Section N — `/api/shop/*` (7 routes)

```
DEAD      | POST             | /api/shop/cart                        | NONE              | commerce_carts, commerce_cart_lines                                    | ZERO callers                                                     | Server-side cart calc (no UI consumes — frontend uses client cart state)
ALIVE     | GET              | /api/shop/categories                  | NONE              | pet_product_categories, pet_product_filters (PostgREST)               | shop-departments.ts                                             | List shop categories for nav
ALIVE     | POST             | /api/shop/checkout                    | NONE              | commerce_catalog_items, erp_products, erp_product_skus, commerce_orders, commerce_order_items, commerce_payments, commerce_coupons, commerce_checkout_sessions | checkout-island.tsx                                            | Stripe checkout session creation for shop cart (creates order, returns client_secret)
DEAD      | GET              | /api/shop/nav                         | NONE              | (uses repo/Supabase)                                                  | ZERO callers                                                     | Shop nav data (replaced by /api/shop/categories)
DEAD      | POST             | /api/shop/products/sync               | NONE              | (syncs shop catalog from somewhere — calls Supabase)                  | ZERO callers                                                     | Sync products from admin catalog into shop (no UI)
ALIVE     | GET,POST         | /api/shop/reviews                     | NONE              | product_reviews (PostgREST)                                           | product-detail.tsx                                             | List + submit product reviews (POST auto-hides pending moderation)
ALIVE     | GET              | /api/shop/verify                       | NONE              | (verifies checkout session)                                            | checkout-island.tsx                                            | Verify Stripe checkout session completed
```

## Section O — `/api/stripe/*` (2 routes)

```
ALIVE     | POST             | /api/stripe/customer-portal           | NONE (cookie)     | customers (camelCase, for stripeCustomerId)                            | account/page.tsx, CustomerDetailsView.tsx                      | Create Stripe customer-portal session
EXTERNAL  | POST             | /api/stripe/webhook                   | Stripe signature  | payment_transactions (NO CREATE TABLE — BROKEN), commerce_orders (no CREATE TABLE — works on live DB), commerce_fulfillment_events, customers, acct_chart_of_accounts, acct_entities, acct_books, acct_periods, acct_journal_batches, acct_journal_entries, acct_journal_lines | ZERO callers in src/ — called by Stripe | Stripe webhook handler (checkout, payment_intent, charge.refunded, invoice.paid, customer.updated). payment_transactions upserts will fail silently.
```

## Section P — `/api/wizard/data`, `/api/workspace*` (3 routes)

```
ALIVE     | GET              | /api/wizard/data                      | NONE              | (uses repo/Supabase)                                                  | wizard-loader.tsx                                               | Booking wizard data bootstrap
ALIVE     | GET              | /api/workspace/files/[id]             | NONE (getVisitor) | (uses repo/Supabase)                                                  | classroom.tsx                                                   | Read workspace file by ID
ALIVE     | GET,POST         | /api/workspace                        | NONE (getVisitor) | (uses repo/Supabase)                                                  | classroom.tsx                                                   | LMS workspace list + create
```

---

## Dead Routes Summary (35 routes with ZERO callers)

```
1.  DEAD    /api/admin/course-architect        — AI lesson authoring prototype (no gate!)
2.  DEAD    /api/admin/crm/funnel_events       — funnel_events list (no UI)
3.  DEAD    /api/admin/crm/message_templates   — message templates list (no UI)
4.  DEAD    /api/admin/crm/permanent_alerts    — permanent alerts list (no UI)
5.  DEAD    /api/admin/crm/shift_templates     — shift templates list (no UI)
6.  DEAD    /api/admin/crm/staff_availability  — staff availability (no UI)
7.  DEAD    /api/admin/crm/tags                — customer tags (no UI)
8.  DEAD    /api/admin/lms                     — schema introspection (no gate!)
9.  DEAD    /api/admin/pos/receipt             — receipt PDF generator (no UI)
10. DEAD    /api/admin/returns                — list returns (ReturnsView.tsx fetches orders instead)
11. DEAD    /api/admin/route                   — **BROKEN**: queries 5 dropped LMS demo tables; no gate!
12. DEAD    /api/admin/shipping/usps           — USPS rate lookup (no UI)
13. DEAD    /api/admin/shipping/usps/poll      — USPS tracking poll (no UI)
14. DEAD    /api/analytics/revenue             — duplicate of /api/admin/analytics/revenue
15. DEAD    /api/auth/admin/session            — admin-portal session check (unused)
16. DEAD    /api/auth/customer/session         — customer-portal session check (unused)
17. DEAD    /api/auth/email-link               — magic-link completer (page uses own logic)
18. DEAD    /api/auth/frontdesk/session         — frontdesk-portal session check (unused)
19. DEAD    /api/auth/google/start             — alias of /api/auth/google (only in comments)
20. DEAD    /api/auth/groomer/session           — groomer-portal session check (unused)
21. DEAD    /api/auth/lms/session              — lms-portal session check (unused)
22. DEAD    /api/auth/session                  — legacy bearer session (replaced by /api/auth/portal-session)
23. DEAD    /api/checkout                      — old Stripe checkout (replaced by /api/bookings/checkout + /api/shop/checkout)
24. DEAD    /api/consultations/convert         — consultation->customer/dog converter (no UI)
25. DEAD    /api/customers/pay                  — customer-initiated payment (no UI)
26. DEAD    /api/instructor                    — **BROKEN**: instructor dashboard on dropped demo tables
27. DEAD    /api/instructor/review             — **BROKEN**: instructor review on dropped learningAttempt
28. DEAD    /api/learner-professor             — old AI professor (replaced by /api/day)
29. DEAD    /api/notify/enrollment              — enrollment email notification (no caller)
30. DEAD    /api/professor                     — old AI professor (replaced by /api/day)
31. DEAD    /api/revalidate-shop               — shop revalidation (no caller)
32. DEAD    /api/shop/cart                     — server-side cart (frontend uses client state)
33. DEAD    /api/shop/nav                      — shop nav (replaced by /api/shop/categories)
34. DEAD    /api/shop/products/sync            — product sync (no UI)
```

(35 total — counted from the strict grep `CALLERS=$` matches in route_callers2.txt; matches the 35 above; the 36th "DEAD" was /api/stripe/webhook which is reclassified as EXTERNAL.)

## Routes Querying DROPPED Tables (3 routes — all DEAD)

These routes query tables that are NOT in any current migration. They will fail when called.

```
1. /api/admin/route.ts          — GET — supabase.from("course"), .from("courseEnrollment"), .from("learningDay"), .from("knowledgeChunk"), .from("humanNeedQueue")
2. /api/instructor/route.ts     — GET — supabase.from("humanNeedQueue"), .from("learningAttempt"), .from("learningDay"), .from("course")
3. /api/instructor/review/route.ts — POST — supabase.from("learningAttempt")
```

All six legacy table names (`course`, `courseEnrollment`, `learningDay`, `knowledgeChunk`, `humanNeedQueue`, `learningAttempt`) have **zero `CREATE TABLE` statements** across all migrations in `supabase/migrations/`. They were the original demo schema and have been replaced by `lms.courses`, `lms.enrollments`, `lms.lessons`, `lms.ai_rag_chunks`, `lms.human_escalation_routing`, `lms.quiz_attempts` respectively.

## Additional Schema-Broken Findings (NOT the dropped-demo-tables case, but worth flagging)

- **`/api/admin/users`** queries `public.role_definitions` — the schema defines `lms.role_definitions` (NOT `public.role_definitions`). The route wraps it in try/catch and silently degrades — no roles shown, but route still returns 200.
- **`/api/stripe/webhook`** upserts into `payment_transactions` (Supabase PostgREST). The `payment_transactions` table has zero `CREATE TABLE` in any migration — table doesn't exist in schema. Upserts will silently fail (wrapped in `await ... .catch(...)` patterns or just erroring). The webhook also updates `commerce_orders` — that table also has no `CREATE TABLE` in migrations (only `ALTER TABLE` + indexes in migration `0013_commerce_tracking_brands_and_crm_trigger.sql`). Both tables likely exist on the live Supabase instance (created via Dashboard), but the schema isn't captured in repo migrations — fragile.

## Routes WITHOUT Admin Gate (security-relevant only)

Of the 75 routes without `requireAdminApi`, the vast majority are legitimately public (auth, customer portal, shop, LMS classroom AI, webhooks). The security-relevant findings:

### Admin-prefixed routes with NO admin gate (14 routes — should all be gated)
```
/api/admin/course-architect       — POST — writes AI draft (uses getVisitor demo cookie — NOT real admin auth)
/api/admin/lms                    — GET — schema introspection (no auth at all!)
/api/admin/lms-ai-instructor      — GET — exposes AI instructor personas
/api/admin/lms-ai-teaching        — GET — exposes AI teaching sessions
/api/admin/lms-assessment         — GET — exposes submissions, grade_book, quiz_attempts
/api/admin/lms-bridge             — GET — exposes bridge sync log
/api/admin/lms-communication      — GET — exposes announcements + notification queue
/api/admin/lms-compliance         — GET — exposes compliance documents
/api/admin/lms-curriculum         — GET — exposes courses
/api/admin/lms-dashboard          — GET — exposes counts of courses/enrollments/sessions/pathways/messages/rag
/api/admin/lms-enrollment         — GET — exposes enrollments
/api/admin/lms-media              — GET — exposes media assets
/api/admin/lms-progress           — GET — exposes learner progress
/api/admin/lms-skills             — GET — exposes skills, signoffs, credentials, badges
/api/admin/lms-support            — GET — exposes human-escalation routing + navigator caseloads
/api/admin/route.ts               — GET — broken (see above)
```

These 14 admin-prefixed routes expose potentially-sensitive tenant data with no `requireAdminApi` gate. The 13 `/api/admin/lms-*` routes all use `pgQuery` directly from `@/lib/pg` with no auth check before querying `lms.*` schema tables — any caller can read tenant data.

### Other open-to-the-world routes worth flagging
```
/api/send-email                   — POST — NO auth. Anyone can POST { to, subject, html } and the server will email it via Resend. **HIGH ABUSE RISK**.
/api/bookings                     — POST — Public booking submission (legitimate but no rate limiting visible)
/api/bookings/checkout            — POST — Stripe checkout (legitimately public; protected by Stripe)
/api/shop/checkout                — POST — Stripe checkout (legitimately public; protected by Stripe)
/api/checkout                     — POST — DEAD but if revived, no auth.
/api/cms/newsletter               — POST — Public newsletter signup (legitimate)
/api/customers                    — POST — Creates customer without auth (legitimate for booking flow)
/api/dogs                         — GET,POST — Public dog list/create (potentially sensitive)
/api/dogs/[id]/photo              — POST,PATCH — Upload/update dog photo without auth
/api/instructor                   — GET — DEAD but no auth
/api/instructor/review            — POST — DEAD but no auth
/api/professor                    — GET,POST — DEAD but no auth
/api/learner-professor            — GET,POST — DEAD but no auth
```

## Routes grouped by data-access mechanism

### Uses `supabase` (PostgREST client) — 28 routes
```
/api/admin/route, /api/admin/brands, /api/admin/brands/[id], /api/admin/categories, /api/admin/categories/[id],
/api/admin/filters, /api/admin/filters/[id], /api/admin/filters/[id]/map, /api/admin/filters/[id]/map/appingId], /api/admin/filters/[id]/values, /api/admin/filters/values/[valueId],
/api/admin/media, /api/admin/users,
/api/auth/google/callback, /api/auth/invite, /api/auth/login, /api/auth/logout, /api/auth/portal-session, /api/auth/route, /api/auth/session,
/api/checkout,
/api/dogs, /api/dogs/[id]/photo,
/api/instructor, /api/instructor/review,
/api/shop/cart, /api/shop/categories, /api/shop/checkout, /api/shop/nav, /api/shop/products/sync, /api/shop/reviews, /api/shop/verify,
/api/stripe/webhook
```

### Uses `pgQuery` (raw pg, no transaction) — 41 routes
```
/api/admin/analytics/operations, /api/admin/analytics/overview, /api/admin/analytics/revenue, /api/admin/audit-logs, /api/admin/books,
/api/admin/commerce/actions, /api/admin/crm/actions, /api/admin/crm/appointments/actions, /api/admin/deposits, /api/admin/financial-settings, /api/admin/fulfillment, /api/admin/gift-cards, /api/admin/inventory, /api/admin/inventory/restock, /api/admin/lms-ai-instructor, /api/admin/lms-ai-teaching, /api/admin/lms-assessment, /api/admin/lms-bridge, /api/admin/lms-communication, /api/admin/lms-compliance, /api/admin/lms-curriculum, /api/admin/lms-dashboard, /api/admin/lms-enrollment, /api/admin/lms-media, /api/admin/lms-progress, /api/admin/lms-skills, /api/admin/lms-support, /api/admin/lms, /api/admin/marketing/automations, /api/admin/marketing/campaigns, /api/admin/purchase-orders, /api/admin/returns, /api/admin/settings, /api/admin/staff/schedules, /api/admin/stripe-connections, /api/admin/system/actions, /api/admin/system/global-search, /api/admin/taxes,
/api/analytics/events (partial — uses both pgQuery and withPg),
/api/admin/finance/actions (uses pgExec — counted in pgExec group below)
```

### Uses `pgExec` (raw pg, write, no transaction wrapper) — 9 routes (subset of pgQuery group)
```
/api/admin/commerce/actions, /api/admin/crm/actions, /api/admin/crm/appointments/actions, /api/admin/finance/actions, /api/admin/inventory/restock, /api/admin/returns/[id]/refund, /api/admin/system/actions, /api/admin/orders/[id]/actions/resend-alert
```

### Uses `withPg` (raw pg with transaction, from `@/lib/crm/enterprise`) — 40 routes
```
/api/admin/coupons, /api/admin/coupons/[id], /api/admin/crm/appointments, /api/admin/crm/customers, /api/admin/crm/documents, /api/admin/crm/documents/[id], /api/admin/crm/funnel_events, /api/admin/crm/grooming-records, /api/admin/crm/grooming-records/[id], /api/admin/crm/locations, /api/admin/crm/message_templates, /api/admin/crm/messages, /api/admin/crm/notes, /api/admin/crm/permanent_alerts, /api/admin/crm/pets, /api/admin/crm/pets/[id], /api/admin/crm/pets/[id]/vaccinations, /api/admin/crm/services, /api/admin/crm/shift_templates, /api/admin/crm/staff, /api/admin/crm/staff_availability, /api/admin/crm/tags, /api/admin/crm/waitlist, /api/admin/invoices, /api/admin/invoices/[id]/payments, /api/admin/orders, /api/admin/orders/[id]/actions/packing-slip, /api/admin/orders/export, /api/admin/payments, /api/admin/payroll, /api/admin/permissions, /api/admin/pos, /api/admin/pos/receipt, /api/admin/products, /api/admin/promotions, /api/admin/promotions/[id], /api/admin/refunds, /api/admin/reports, /api/admin/shipping, /api/admin/users/unlink,
/api/analytics/revenue, /api/analytics/events (partial), /api/bookings/checkout, /api/customers/pay
```

### Uses `repo` (lib/repo.ts abstraction that resolves to Supabase PostgREST when configured) — 7 routes
```
/api/admin/brands (mixed: repo for list, fetch for storage), /api/admin/categories (mixed), /api/admin/filters/* (mixed), /api/checkout, /api/courses, /api/dogs (via repo.list/update), /api/school, /api/wizard/data, /api/workspace, /api/workspace/files/[id]
```

### Routes with no DB at all (pure logic / AI / external API)
```
/api/admin/course-architect, /api/atlas, /api/auth/admin/session, /api/auth/customer/session, /api/auth/email-link, /api/auth/frontdesk/session, /api/auth/google, /api/auth/google/start, /api/auth/groomer/session, /api/auth/lms/session, /api/auth/logout, /api/day, /api/generate, /api/identity, /api/learner-professor, /api/notify/enrollment, /api/professor, /api/revalidate, /api/revalidate-shop, /api/route, /api/send-email
```

---

## Methodology Notes

1. **Route enumeration**: `git ls-tree -r origin/Pawx --name-only | grep "^src/app/api/" | grep "route.ts$"` → 161 routes.
2. **Per-route content extraction**: `git show origin/Pawx:<path>` per route, grepped for `export async function`, `requireAdminApi`, `pgQuery`, `pgExec`, `withPg`, `supabase`, and SQL table refs (`FROM`, `JOIN`, `INSERT INTO`, `UPDATE`, `DELETE FROM`).
3. **Frontend caller detection**: For each route, computed the URL prefix (static path or prefix-up-to-`[` for dynamic routes) and ran `git grep -lE "<url>(boundary)" origin/Pawx -- "src/**/*.ts" "src/**/*.tsx"` excluding `src/app/api/` — strict boundary regex `(['"\`?]|$)` for static paths and `(\/|['"\`?]|$)` for dynamic. Captured both single/double/backtick quotes plus `?` query string.
4. **Schema table set**: Aggregated all `CREATE TABLE` (and `CREATE VIEW`) statements across every file in `supabase/migrations/` (handling em-dash filenames via `git ls-tree -z`), then cross-referenced each route's table refs.
5. **Status assignment**: ALIVE = ≥1 frontend fetch/nav caller. DEAD = 0 callers anywhere in `src/` (excluding `src/app/api/`). EXTERNAL = 0 frontend callers but called by an external system (Stripe, Supabase webhook, OAuth provider).

## Caveats

- Some routes may be reached via middleware that I haven't fully traced (no `middleware.ts` file exists in the branch, so this is minimal).
- Some auth routes (/api/auth/admin/session, etc.) appear to be intended as browser-navigation endpoints (the comment in `src/lib/pawz-auth.ts` references them as part of the "five doors" spec). I marked them DEAD because no frontend code fetches them — but they could be hit by direct browser navigation.
- The `commerce_orders` / `commerce_order_items` "missing CREATE TABLE" finding is most likely a Supabase-dashboard-created table situation; the routes work against the live DB. I flagged it as fragile, not as broken.
- I did NOT execute any code or modify files.
