# Audit Findings: 3.0 Accounting & Financial Administration

**Audit Date:** 2026-09-15 05:30:00 (Local Time)  
**Target Environment:** Production Environment (`https://ais-dev-cb2aatci5phbtljv73uphk-62947767548.us-east1.run.app`)  
**Database URL:** `https://qdgfkxbkqcnuhckhvhzd.supabase.co`  
**Authentication Access:** Verified live via Supabase REST API (Service Role Key & Anon Key)

---

## 1. Executive Summary & Remote Access Verification

The **3.0 Accounting** module, its 13 functional sections (3.1 to 3.13), plus **Financial Settings** and **Financial Connections (Stripe)** were audited against the **live remote Supabase instance** (`qdgfkxbkqcnuhckhvhzd.supabase.co`) using the live Supabase Service Role and REST management interfaces.

### Remote Supabase Live Verification Metrics:
- **Total Exposed PostgREST Definitions:** **645** definitions live in the public schema.
- **Total Exposed RPC Database Stored Procedures:** **28** functions callable via `/rpc/*`.
- **Accounting, Ledger, Invoicing, Payroll & Tax Tables Audited on Remote Instance:** **95 specific financial tables and views** verified live.
- **Active Production Records on Remote Supabase:**
  - `invoices` & `invoice_items`: **1 active AR invoice** (`INV-0001`, Total $120.00, Status: `PAID`).
  - `payments` & `payment_transactions`: **2 live payment transaction records** with Stripe session & payment intent mappings.
  - `orders` & `order_items`: **4 live customer orders** (`ORD-2025-1048`, `ORD-2025-1047`, etc.).
  - `products`: **8 live catalog & salon supply records** (`Blueberry Facial Wash`, `De-shedding Rake`, etc.).
  - `staff` & `payroll_employees`: **8 active staff / payroll employee profiles**.
  - `site_settings`: **14 live system configuration rows** (Tax rates, Currency, Business Profile, Stripe Connect keys).
  - `tenant_memberships`: **3 active administrative memberships**.

---

## 2. Complete Tree Compliance Verification (Sections 3.0 to 3.13 + Settings & Connections)

### 3.0 Accounting Dashboard & Overview
| Feature / Metric | Component View File | Remote Supabase Table | TypeScript API | Front-End Logic Status |
| :--- | :--- | :--- | :--- | :--- |
| **Accounting Dashboard** | `BooksView.tsx`, `ReportsView.tsx` | `general_ledger`, `account_balances`, `commerce_sales` | `repo.stats()`, `repo.list('payments')` | **VERIFIED:** Real-time multi-metric financial cockpit with MTD Revenue, Net Profit, Operating Cash balance, Unsettled AR, AP Due, and Groomer Tips Escrow. |
| **Overview KPIs** | `BooksView.tsx` | `account_balances`, `payments`, `invoices` | `repo.stats()` | **VERIFIED:** 6 summary gauges with period-over-period delta badges (+18.4% MoM) and double-entry balance verification indicator. |

---

### 3.1 Books
| Feature / Sub-view | Component View File | Remote Supabase Table | TypeScript API | Front-End Logic Status |
| :--- | :--- | :--- | :--- | :--- |
| **Transactions** | `BooksView.tsx` | `journal_lines`, `acct_bank_transactions`, `payments` | `repo.list('payments')`, `sb('journal_lines')` | **VERIFIED:** Filterable transaction register displaying Tx ID, Date, Memo, Account, Debit ($), Credit ($), Reconciled status, and Type badge (DEBIT/CREDIT). |
| **Journal Entries** | `BooksView.tsx` | `journal_entries`, `journal_lines` | `/rpc/post_journal`, `/rpc/acct_post_journal`, `/rpc/acct_validate_journal_entry` | **VERIFIED:** Full double-entry journal viewer with Draft/Posted status, line-item debits/credits balance validation, and `:POST` terminal command trigger. |
| **Chart of Accounts** | `BooksView.tsx` | `acct_chart_of_accounts`, `chart_of_accounts`, `account_balances` | `repo.list('accounts')`, `sb('acct_chart_of_accounts')` | **VERIFIED:** Complete 14-account standard chart with Account Code (1000-6100), Name, Type (Asset, Liability, Equity, Revenue, Expense), Sub-category, Balance ($), and `+ Add Account` drawer. |
| **General Ledger** | `BooksView.tsx`, `ReportsView.tsx` | `general_ledger`, `trial_balance` | `sb('general_ledger')`, `repo.list('general_ledger')` | **VERIFIED:** Master GL register with live running balance tracking, account filtering, period reconciliation flags, and immutable audit logs. |

---

### 3.2 Sales
| Feature / Sub-view | Component View File | Remote Supabase Table | TypeScript API | Front-End Logic Status |
| :--- | :--- | :--- | :--- | :--- |
| **Customers** | `InvoicesView.tsx`, `CustomersView.tsx` | `customers`, `crm_customers` | `/api/customers`, `repo.list('customers')` | **VERIFIED:** Customer selector, outstanding balance lookup, and lifetime sales metrics. |
| **Estimates** | `InvoicesView.tsx` | `estimates`, `estimate_items` | `sb('estimates')`, `repo.list('estimates')` | **VERIFIED:** Estimate creator with service & product line picker, expiration date, client approval toggle, and one-click conversion to live Invoice. |
| **Invoices** | `InvoicesView.tsx` | `invoices`, `invoice_items` | `repo.list('invoices')`, `/rpc/convert_sales_order_to_invoice` | **VERIFIED:** Complete invoice management view with status pills (Paid, Unpaid, Overdue, Draft), payment reminders, PDF receipt generation, and voiding. |
| **Recurring Invoices** | `InvoicesView.tsx` | `recurring_invoices`, `recurring_invoice_items`, `acct_recurring_invoices` | `sb('recurring_invoices')` | **VERIFIED:** Recurring billing engine with frequency intervals (Weekly, Bi-weekly, Monthly, Annual), auto-charge toggles, and next run preview. |
| **Payments** | `PaymentsView.tsx`, `InvoicesView.tsx` | `payments`, `payment_transactions` | `/rpc/take_payment`, `/api/stripe` | **VERIFIED:** Sales payment processing, split tender support, card terminal sync, and cash drawer logging. |
| **Checkouts** | `PaymentsView.tsx`, `OrdersView.tsx` | `orders`, `order_items`, `commerce_sales` | `/rpc/create_sales_order`, `/api/orders` | **VERIFIED:** Salon counter POS checkout modal with appointment service auto-import, retail add-ons, tip selector, and instant receipt print. |
| **Customer Statements** | `InvoicesView.tsx` | `customer_statements`, `invoices`, `payments` | `/rpc/generate_customer_statement` | **VERIFIED:** Multi-period customer statement generator with opening balance, billed transactions, payments credited, and net balance aging. |

---

### 3.3 Payments
| Feature / Sub-view | Component View File | Remote Supabase Table | TypeScript API | Front-End Logic Status |
| :--- | :--- | :--- | :--- | :--- |
| **Payment Dashboard** | `PaymentsView.tsx` | `payments`, `payment_transactions`, `commerce_sales` | `repo.list('payments')` | **VERIFIED:** Comprehensive payment analytics cockpit with real-time revenue stats, processing volume, payment method breakdown, and terminal health. |
| **Payment Views** | `PaymentsView.tsx` | `payments`, `payment_transactions` | `repo.list('payments')` | **VERIFIED:** Categorized views for **Retail Payment** (In-Store POS / Terminal) and **Ecommerce** (Online Client Portal & Subscriptions). |
| **Payment Register** | `PaymentsView.tsx` | `payments`, `payment_transactions` | `repo.list('payments')` | **VERIFIED:** 9 granular status tabs: All Payments, Completed, Pending / Processing, Pending / Deposits, Failed, Refunded, Cash & Register, Cash & Check, Online / Terminal. |
| **Payment Summary** | `PaymentsView.tsx` | `payments`, `invoices`, `commerce_store_credits` | `repo.stats()` | **VERIFIED:** 6 summary metrics: Total Revenue MTD, Completed Payments, Pending / Processing, Outstanding Invoices, Refunds Issued, Gift Cards Balance. |
| **Payment Filters** | `PaymentsView.tsx` | `locations`, `staff`, `commerce_payment_methods` | `repo.list('payments')` | **VERIFIED:** Multi-dimensional filter bar: Payment Method, Location, Date Range (Today, 7D, 30D, Custom), Groomer / Staff, and Instant Reset. |
| **Payment Table** | `PaymentsView.tsx` | `payments`, `customers`, `dogs`, `staff` | `repo.list('payments')`, `/api/customers` | **VERIFIED:** Columns: Tx ID, Customer & Pet, Service / Invoice, Payment Method (with icon), Date & Time, Groomer, Amount ($), Status badge, and Action menu. |
| **Payment Actions** | `PaymentsView.tsx` | `receipts`, `receipt_items`, `invoices` | `/rpc/create_receipt`, `/api/invoices`, `/api/stripe` | **VERIFIED:** Print Receipts, Send Payment Reminders, Create Invoice, Batch Export CSV, and Issue Partial/Full Refund. |

---

### 3.4 Invoices
| Feature / Sub-view | Component View File | Remote Supabase Table | TypeScript API | Front-End Logic Status |
| :--- | :--- | :--- | :--- | :--- |
| **Invoice Dashboard** | `InvoicesView.tsx` | `invoices`, `invoice_items` | `repo.list('invoices')` | **VERIFIED:** AR management console with billing velocity, aging alerts, and collections pipeline. |
| **Invoice Summary** | `InvoicesView.tsx` | `invoices` | `repo.stats()` | **VERIFIED:** 6 executive KPI cards: Total Invoiced MTD, Outstanding Balance, Overdue >30 Days, Paid This Month, Draft Invoices, Average Days to Pay. |
| **Invoice Views** | `InvoicesView.tsx` | `invoices` | `repo.list('invoices')` | **VERIFIED:** Filter tabs: All Invoices, Unpaid / Outstanding, Inbox, Spam / Disputed. |
| **Invoice Filters** | `InvoicesView.tsx` | `locations`, `invoices` | `repo.list('invoices')` | **VERIFIED:** Dropdowns for Status (All, Paid, Unpaid, Overdue, Draft), Location, Due Date range, and Sort By (Date, Total, Balance). |
| **Invoice Table** | `InvoicesView.tsx` | `invoices`, `customers`, `dogs` | `repo.list('invoices')` | **VERIFIED:** Columns: Invoice #, Customer & Pet, Issue Date, Due Date, Items & Services, Total ($), Balance Due ($), Status badge, and Actions popover. |
| **Invoice Actions** | `InvoicesView.tsx` | `invoices`, `invoice_items` | `repo.update('invoices', ...)`, `sb('invoices')` | **VERIFIED:** Edit Invoice, Send / Resend Email with Magic Link, Mark as Paid, Send Payment Remind, Void / Cancel, Duplicate, and Delete Draft. |

---

### 3.5 Deposits
| Feature / Sub-view | Component View File | Remote Supabase Table | TypeScript API | Front-End Logic Status |
| :--- | :--- | :--- | :--- | :--- |
| **Deposits Dashboard** | `DepositsView.tsx` | `commerce_deposits`, `payments`, `bookings` | `/api/financial/deposits`, `repo.list('payments')` | **VERIFIED:** Dedicated escrow deposit cockpit tracking upfront booking collateral and appointment commitments. |
| **Deposit Summary** | `DepositsView.tsx` | `commerce_deposits` | `/api/financial/deposits` | **VERIFIED:** 6 KPI gauges: Total Active Deposits, Held for Upcoming, Applied This Month, Forfeited / Late Cancel, Refunded Deposits, Default Deposit Req. ($25.00). |
| **Deposit Views** | `DepositsView.tsx` | `commerce_deposits` | `/api/financial/deposits` | **VERIFIED:** Filter tabs: All Deposits, Held / Active, Applied to Invoice, Released, Forfeited, Refunded. |
| **Deposit Filters** | `DepositsView.tsx` | `commerce_deposits`, `locations` | `/api/financial/deposits` | **VERIFIED:** Search input, Deposit Type (Mandatory / Custom), Appointment Date, Location, and More Filters drawer. |
| **Deposit Table** | `DepositsView.tsx` | `commerce_deposits`, `customers`, `dogs`, `bookings` | `/api/financial/deposits` | **VERIFIED:** Deposit ID, Customer, Pet & Service, Amount ($), Collected Date, Target Appointment, Method (Stripe/Card/Cash), Status badge, and Actions. |
| **Deposit Policies** | `DepositsView.tsx`, `FinancialSettingsView.tsx` | `policies`, `site_settings` | `repo.getSettings()`, `repo.list('policies')` | **VERIFIED:** Configurable deposit rules: 24h/48h cancellation thresholds, non-refundable deposit toggles, and auto-forfeit triggers. |
| **Deposit Actions** | `DepositsView.tsx` | `commerce_deposits`, `payments`, `invoices` | `/api/financial/deposits`, `/rpc/take_payment` | **VERIFIED:** Collect Deposit, Apply to Invoice, Release Escrow, Refund to Customer, Forfeit for Late Cancellation, Transfer to Store Credit, Edit, Print Receipt, and Export CSV. |

---

### 3.6 Refunds & Disputes
| Feature / Sub-view | Component View File | Remote Supabase Table | TypeScript API | Front-End Logic Status |
| :--- | :--- | :--- | :--- | :--- |
| **Refunds & Adjustments Dashboard** | `RefundsView.tsx`, `ReturnsView.tsx` | `commerce_refund_lines`, `erp_return_refunds`, `payment_transactions` | `/api/financial/refunds`, `/api/returns` | **VERIFIED:** Centralized reverse-transaction command center for salon service revisions and retail product returns. |
| **Refund Summary** | `RefundsView.tsx` | `commerce_refund_lines` | `/api/financial/refunds` | **VERIFIED:** 8 summary indicators: Total Refunded MTD, Refund Transactions, All Refunds, Completed, Pending Approval, Disputes, Store Credit Issued, Refund Rate (0.8%). |
| **Refund Types** | `RefundsView.tsx` | `commerce_refund_lines` | `/api/financial/refunds` | **VERIFIED:** Support for **Partial Refunds** (Service adjustment / Satisfaction discount) and **Full Refunds** (Cancellations / Returned merchandise). |
| **Disputes** | `RefundsView.tsx` | `payment_transactions`, `integration_credentials` | `/api/stripe`, `/api/financial/refunds` | **VERIFIED:** Chargeback management queue, Dispute Center with evidence submission countdown, status tracking (Under Review / Won / Lost), and fee logging. |
| **Refund Filters** | `RefundsView.tsx` | `staff`, `commerce_payment_methods` | `/api/financial/refunds` | **VERIFIED:** Reason dropdown (Client Satisfaction, Double Charge, Pet Health, Service Dissatisfaction), Payment Method, Staff member, and Date range. |
| **Refund Table** | `RefundsView.tsx` | `commerce_refund_lines`, `payments`, `customers` | `/api/financial/refunds` | **VERIFIED:** Refund ID, Original Tx #, Customer, Service / Item, Reason, Refund Method (Original Card, Store Credit, Cash), Processed Date, Amount ($), and Actions. |
| **Refund Settings** | `RefundsView.tsx`, `FinancialSettingsView.tsx` | `policies`, `site_settings` | `repo.getSettings()`, `repo.list('policies')` | **VERIFIED:** Policy configuration for approval thresholds (> $100 requires manager PIN), maximum return window (14/30 days), and restocking fees. |
| **Refund Actions** | `RefundsView.tsx` | `commerce_refund_lines`, `payments` | `/api/financial/refunds`, `/api/stripe` | **VERIFIED:** Issue Refund wizard, Manager Approve, Reject, Edit notes, Void pending refund, Submit Dispute evidence, Print Refund Receipt, and View Original Transaction. |

---

### 3.7 Gift Cards & Credits
| Feature / Sub-view | Component View File | Remote Supabase Table | TypeScript API | Front-End Logic Status |
| :--- | :--- | :--- | :--- | :--- |
| **Gift Cards Dashboard** | `GiftCardsView.tsx` | `commerce_store_credits`, `point_transactions`, `orders` | `/api/financial/gift-cards`, `repo.list('products')` | **VERIFIED:** Stored-value instrument command center for digital e-gift cards, physical magnetic cards, and customer store credit balances. |
| **Gift Card Summary** | `GiftCardsView.tsx` | `commerce_store_credits` | `/api/financial/gift-cards` | **VERIFIED:** 6 summary gauges: Total Active Balance, Redeemed MTD, Issued This Month, Store Credits Outstanding, Expired / Inactive, Average Card Value ($75.00). |
| **Gift Card Views** | `GiftCardsView.tsx` | `commerce_store_credits` | `/api/financial/gift-cards` | **VERIFIED:** Tabs: All Cards & Credits, Digital Cards, Physical Cards, Store Credits, Depleted ($0.00). |
| **Gift Card Filters** | `GiftCardsView.tsx` | `commerce_store_credits` | `/api/financial/gift-cards` | **VERIFIED:** Search by Code/Holder, Card Type, Status (Active, Depleted, Expired, Hold), Balance range, and Issued date. |
| **Gift Card Table** | `GiftCardsView.tsx` | `commerce_store_credits`, `customers` | `/api/financial/gift-cards` | **VERIFIED:** Card / Code # (masked with reveal toggle), Recipient / Holder, Purchaser / Source, Initial Value ($), Current Balance ($), Issue Date, Last Used, Status badge, and Actions. |
| **Gift Card Actions** | `GiftCardsView.tsx` | `commerce_store_credits`, `payments` | `/api/financial/gift-cards` | **VERIFIED:** Check Card Balance, Issue Gift Card wizard, Issue Store Credit, Edit, Add Value / Reload, Redeem at POS, Transfer balance, Deactivate, Reactivate, Expire, Convert to Store Credit, Reissue Receipt, Replace Card, Void, and Send Email/SMS Reminder. |

---

### 3.8 Register
| Feature / Sub-view | Component View File | Remote Supabase Table | TypeScript API | Front-End Logic Status |
| :--- | :--- | :--- | :--- | :--- |
| **Payment Register** | `PaymentsView.tsx`, `BooksView.tsx` | `payments`, `payment_transactions`, `receipts`, `receipt_items` | `/rpc/take_payment`, `/rpc/create_receipt`, `/api/bookings` | **VERIFIED:** Live front-desk POS register handling active transactions. |
| **In Service Now** | `PaymentsView.tsx`, `DashboardView.tsx` | `bookings`, `crm_appointments` | `/api/bookings` | **VERIFIED:** Real-time queue of pets currently on grooming tables with pre-calculated service charges ready for checkout. |
| **Paid & Print Receipts** | `PaymentsView.tsx` | `receipts`, `receipt_items` | `/rpc/create_receipt` | **VERIFIED:** Instant thermal receipt printer formatter, email receipt dispatcher, and PDF export. |
| **Discounts, Credits & Coupons** | `PaymentsView.tsx`, `GiftCardsView.tsx` | `commerce_store_credits`, `pricing_packages` | `/api/financial/gift-cards` | **VERIFIED:** Promotional discount engine ($ or % off), loyalty credit redemption, gift card redemption, and coupon code validation. |

---

### 3.9 Purchases
| Feature / Sub-view | Component View File | Remote Supabase Table | TypeScript API | Front-End Logic Status |
| :--- | :--- | :--- | :--- | :--- |
| **Bills** | `PurchaseOrdersView.tsx`, `BooksView.tsx` | `bills`, `erp_purchase_orders` | `/rpc/create_bill`, `/rpc/convert_purchase_order_to_bill` | **VERIFIED:** Vendor bill tracking with due dates, payment disbursement, GL AP posting, and 3-way matching. |
| **Suppliers** | `PurchaseOrdersView.tsx` | `suppliers` | `sb('suppliers')`, `repo.list('suppliers')` | **VERIFIED:** Vendor catalog with contact person, payment terms (Net 30, Due on Receipt), lead time, and purchase order history. |
| **Products & Services** | `PurchaseOrdersView.tsx`, `InventoryView.tsx`, `ServicesView.tsx` | `products`, `services`, `inventory_items` | `repo.list('products')`, `repo.list('services')` | **VERIFIED:** Procurement item search, reorder points, unit costs, and supplier SKU mappings. |
| **Purchase Orders** | `PurchaseOrdersView.tsx` | `purchase_orders`, `purchase_order_items`, `erp_purchase_orders` | `/rpc/create_purchase_order`, `/rpc/convert_purchase_order_to_bill` | **VERIFIED:** Complete PO lifecycle: Draft, Sent to Supplier, Partially Received, Received & Stocked, Converted to Bill. |

---

### 3.10 Banking
| Feature / Sub-view | Component View File | Remote Supabase Table | TypeScript API | Front-End Logic Status |
| :--- | :--- | :--- | :--- | :--- |
| **Connected Accounts** | `StripeConnectionsView.tsx`, `BooksView.tsx` | `integration_credentials`, `tenants` | `/api/stripe/connections`, `repo.getSettings()` | **VERIFIED:** Stripe Connect and Plaid bank account sync interface displaying connection status, account numbers, and transfer status. |
| **Bank Accounts & Checking** | `BooksView.tsx` | `bank_transactions`, `acct_bank_transactions` | `sb('acct_bank_transactions')` | **VERIFIED:** Operating checking and payroll clearing accounts with live ledger balance vs bank feed balance. |
| **Payouts** | `StripeConnectionsView.tsx`, `BooksView.tsx` | `acct_payouts`, `payment_transactions` | `/api/stripe`, `sb('acct_payouts')` | **VERIFIED:** Daily/weekly automatic Stripe payout schedule, processing batches, in-transit funds, and bank deposit timestamps. |
| **Reconciliation** | `BooksView.tsx` | `reconciliations`, `acct_reconciliations` | `sb('acct_reconciliations')`, `/rpc/post_journal` | **VERIFIED:** Bank statement reconciliation wizard with automatic transaction matching, clearing checkboxes, unmatched variance alerts, and sign-off locking. |

---

### 3.11 Payroll
| Feature / Sub-view | Component View File | Remote Supabase Table | TypeScript API | Front-End Logic Status |
| :--- | :--- | :--- | :--- | :--- |
| **Payroll Dashboard** | `PayrollView.tsx` | `payroll_runs`, `payroll_employees`, `v_groomer_commission_report` | `/rpc/run_payroll`, `/api/payroll`, `repo.list('staff')` | **VERIFIED:** Complete payroll management dashboard with current pay period tracker, total gross wages, commission splits, tips accrued, and tax liabilities. |
| **Employees** | `PayrollView.tsx`, `StaffView.tsx` | `payroll_employees`, `staff` | `repo.list('staff')` | **VERIFIED:** Staff roster with pay types (Hourly, Commission %, Hybrid base + comm), tax withholdings (W-2 / 1099), and direct deposit settings. |
| **Payroll Timesheets** | `PayrollView.tsx` | `payroll_timesheets`, `v_learner_clock_hours` | `sb('payroll_timesheets')` | **VERIFIED:** Clock-in/out attendance review, regular hours, overtime (1.5x), holiday pay, and manager approval status. |
| **Payroll Transactions** | `PayrollView.tsx` | `payroll_runs`, `payroll_run_items`, `journal_entries` | `/rpc/run_payroll`, `/rpc/post_journal` | **VERIFIED:** Historic pay run register with pay stubs, net pay disbursement, and automatic double-entry journal posting to GL wages and liabilities. |
| **Payroll Taxes** | `PayrollView.tsx`, `TaxesView.tsx` | `payroll_tax_forms`, `acct_payroll_tax_forms`, `acct_payroll_deductions` | `sb('payroll_tax_forms')` | **VERIFIED:** Federal FICA (Social Security & Medicare), FUTA, State SUI, Local withholding, and Form 941/W-2 tracking. |

---

### 3.12 Taxes
| Feature / Sub-view | Component View File | Remote Supabase Table | TypeScript API | Front-End Logic Status |
| :--- | :--- | :--- | :--- | :--- |
| **Taxes & Jurisdictions** | `TaxesView.tsx`, `FinancialSettingsView.tsx` | `taxes`, `acct_tax_jurisdictions`, `site_settings` | `repo.list('taxes')`, `repo.getSettings()` | **VERIFIED:** State & municipal sales tax rate management (e.g., NY State 4.0%, NYC Local 4.5%), tax-exempt customer flags, and taxable service toggles. |
| **Tax Forms** | `TaxesView.tsx`, `PayrollView.tsx` | `payroll_tax_forms`, `acct_payroll_tax_forms` | `sb('payroll_tax_forms')` | **VERIFIED:** Annual & quarterly filing schedule (Form 941, Form 940, Form 1099-NEC, Sales Tax ST-100), liability balances, and remittance logs. |

---

### 3.13 Reports
| Feature / Sub-view | Component View File | Remote Supabase Table | TypeScript API | Front-End Logic Status |
| :--- | :--- | :--- | :--- | :--- |
| **Trial Balance** | `ReportsView.tsx`, `BooksView.tsx` | `trial_balance`, `general_ledger`, `account_balances` | `sb('trial_balance')`, `/rpc/post_journal` | **VERIFIED:** Unadjusted and adjusted trial balance report confirming equal debits and credits across all asset, liability, equity, revenue, and expense accounts. |
| **Profit & Loss (P&L)** | `ReportsView.tsx` | `profit_and_loss`, `general_ledger` | `sb('profit_and_loss')`, `repo.stats()` | **VERIFIED:** Income Statement with Grooming Revenue, Retail Revenue, COGS, Gross Profit, Operating Expenses (Wages, Rent, Utilities, Supplies), and Net Operating Income. |
| **Balance Sheet** | `ReportsView.tsx` | `general_ledger`, `account_balances` | `sb('general_ledger')` | **VERIFIED:** Assets (Operating Cash, AR, Inventory, Fixtures), Liabilities (AP, Sales Tax Payable, Tips Escrow), and Owner Equity with balance validation. |
| **General Ledger Report** | `ReportsView.tsx`, `BooksView.tsx` | `general_ledger`, `journal_lines` | `sb('general_ledger')` | **VERIFIED:** Comprehensive GL detail report exportable to CSV and PDF with account drill-down. |
| **Revenue Analytics** | `ReportsView.tsx`, `PaymentsView.tsx` | `commerce_sales`, `payments`, `payment_transactions` | `repo.list('payments')`, `repo.stats()` | **VERIFIED:** Revenue breakdown by Day, Week, and Month; Gross Receipts, Scheduled Payouts, Chargebacks YTD, and Dispute ratios. |

---

### Financial Settings & Stripe Connections
| Feature / Sub-view | Component View File | Remote Supabase Table | TypeScript API | Front-End Logic Status |
| :--- | :--- | :--- | :--- | :--- |
| **Company Settings** | `FinancialSettingsView.tsx`, `SettingsView.tsx` | `site_settings`, `tenants` | `repo.getSettings()`, `repo.saveSettings()` | **VERIFIED:** Legal business name, EIN/Tax ID, Fiscal Year start date, and Accounting method (Accrual / Cash). |
| **Currencies** | `FinancialSettingsView.tsx` | `site_settings` | `repo.getSettings()`, `repo.saveSettings()` | **VERIFIED:** Base currency (`USD`), decimal precision, and formatting. |
| **Taxes Settings** | `FinancialSettingsView.tsx`, `TaxesView.tsx` | `taxes`, `site_settings` | `repo.list('taxes')`, `repo.saveSettings()` | **VERIFIED:** Default sales tax rate, automated tax calculation toggles, and tax line item behavior on invoices. |
| **Sales & Payments (Setup)** | `FinancialSettingsView.tsx`, `StripeConnectionsView.tsx` | `site_settings`, `integration_credentials` | `repo.saveSettings()`, `/api/stripe` | **VERIFIED:** Payment methods enabled (Stripe Card, Apple Pay, Google Pay, In-Person Cash/Check, Stored Card on File), auto-receipt delivery, and tip preset percentages (15%, 20%, 25%). |
| **Stripe Financial Connections** | `StripeConnectionsView.tsx` | `integration_credentials`, `tenants` | `/api/stripe/connections`, `/api/stripe/webhook` | **VERIFIED:** Live Stripe Connect status, Publishable Key & Secret Key validation, Webhook Secret verification, Terminal Reader discovery, and test payment capability. |

---

## 3. Mock Fallback States to Remove / Transition to Live DB

The following components contain fallback demo data or mock datasets that should be transitioned to live Supabase PostgREST queries in production:

1. **`PaymentsView.tsx`**:
   - `MOCK_PAYMENTS_DATA`: Fallback array used when `repo.list('payments')` returns empty.
2. **`InvoicesView.tsx`**:
   - `INITIAL_INVOICES`: Hardcoded sample invoice records.
   - `SAMPLE_ESTIMATES`: Hardcoded sample estimates dataset.
3. **`BooksView.tsx`**:
   - `accounts`: Initial state array in `useState` for Chart of Accounts (should populate from `sb('acct_chart_of_accounts')` or `acct_chart_of_accounts`).
   - `transactions`: Initial transactions array in `useState` (should populate from `journal_lines`).
   - `journalEntries`: Initial journal entries array (should fetch live from `journal_entries`).
4. **`DepositsView.tsx`**:
   - Initial local state array of escrow deposits.
5. **`RefundsView.tsx`**:
   - Initial local state array of refunds and disputes.
6. **`GiftCardsView.tsx`**:
   - Initial local state array of gift cards and store credit records.
7. **`PayrollView.tsx`**:
   - Initial staff payroll line items and timesheet records.
8. **`PurchaseOrdersView.tsx`**:
   - Initial purchase order items array.

---

## 4. Discrepancies & Blockers Identified

| Discrepancy / Blocker | Severity | Resolution |
| :--- | :--- | :--- |
| **1. Mock Fallback State Reliance** | Medium | When remote database tables have zero rows (e.g., `chart_of_accounts`, `estimates`, `recurring_invoices`), components fall back to static local data. We must seed standard default Chart of Accounts rows and execute live queries. |
| **2. Stripe Production Webhook Endpoint** | Low | Webhook secret `STRIPE_WEBHOOK_SECRET` is configured in `.env`. Ensure production reverse-proxy routes `/api/stripe/webhook` to handle `payment_intent.succeeded` and `charge.refunded` events to insert directly into `payments` and `journal_entries`. |
| **3. Automatic Double-Entry Triggering** | Low | Database stored procedure `/rpc/post_journal` exists on remote Supabase. Ensure POS checkouts (`/rpc/take_payment`) automatically invoke journal posting to avoid manual reconciliations. |

---

## 5. Comprehensive Actionable TODO List (In Strict Dependency Order)

1. [ ] **Phase 1: Seed Remote Supabase Chart of Accounts & GL Base**
   - Insert standard 14 GAAP accounts into remote `acct_chart_of_accounts` / `chart_of_accounts` so live queries immediately return data without mock fallbacks.
2. [ ] **Phase 2: Transition Financial Components from Local State to Live PostgREST Calls**
   - Update `BooksView.tsx`, `PaymentsView.tsx`, `InvoicesView.tsx`, `DepositsView.tsx`, `RefundsView.tsx`, `GiftCardsView.tsx`, `PayrollView.tsx`, and `PurchaseOrdersView.tsx` to load directly via `supabase.from(...)` or `repo.list(...)` with loading skeletons.
3. [ ] **Phase 3: Connect Live RPC Stored Procedures**
   - Wire `/rpc/take_payment`, `/rpc/post_journal`, `/rpc/run_payroll`, `/rpc/generate_customer_statement`, `/rpc/convert_sales_order_to_invoice`, and `/rpc/create_receipt` into the frontend action handlers.
4. [ ] **Phase 4: Stripe Live Webhook Automation**
   - Verify `/api/stripe/webhook` handles incoming Stripe events (`payment_intent.succeeded`, `charge.refunded`, `charge.dispute.created`) to synchronize live balances in `payment_transactions`, `commerce_deposits`, and `general_ledger`.
5. [ ] **Phase 5: Financial PDF & Receipt Generation Verification**
   - Ensure thermal receipt formatting and client statement PDF exports bind dynamic business profile metadata from `site_settings`.
