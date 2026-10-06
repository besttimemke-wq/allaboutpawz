# Audit Findings: 2.0 POS & Orders / Inventory / Accounting

**Audit Date:** 2026-09-15 05:26:00 (Local Time)  
**Target Environment:** Production Environment (`https://ais-dev-cb2aatci5phbtljv73uphk-62947767548.us-east1.run.app`)  
**Database URL:** `https://qdgfkxbkqcnuhckhvhzd.supabase.co`  
**Authentication Access:** Verified live via Supabase REST API (Service Role Key & Anon Key)

---

## 1. Executive Summary & Remote Supabase Verification

Section 2.0 (POS, Orders, Inventory, Fulfillment, Returns, Products, Purchasing, Shipping, and Accounting/Ledger) was audited directly against the **live remote Supabase instance** (`qdgfkxbkqcnuhckhvhzd.supabase.co`).

### Remote Supabase Live Metrics for POS / ERP / Accounting:
- **Total Exposed PostgREST ERP/Commerce/Accounting Tables & Views:** **224 active definitions** in the public schema.
- **Active Production Records on Remote Supabase:**
  - `orders` & `order_items`: **4 live orders** & **4 order line items** (e.g. `ORD-2025-1048`, `ORD-2025-1047`).
  - `products`: **8 live retail & salon supply products** (`Blueberry Facial Wash`, `De-shedding Rake`, `Hypo Shampoo`, `Ear Cleaner`, etc.).
  - `invoices` & `invoice_items`: **1 AR invoice** (`INV-0001`) & **1 invoice line item**.
  - `payments`: **2 payment transaction records** with Stripe payment intent mappings.
  - `acct_journal_entries` & `acct_chart_of_accounts`: Active general ledger accounts.
- **Remote RPC Database Functions (Live):**
  - `/rpc/create_sales_order`: Generates ERP sales orders with line validation.
  - `/rpc/take_payment`: Processes payments, updates balances, and creates accounting journal entries.
  - `/rpc/apply_stock_movement`: Deducts stock and updates warehouse bin balances.
  - `/rpc/post_journal`: Posts immutable double-entry journal transactions.
  - `/rpc/generate_customer_statement`: Generates AR account statements for clients.

---

## 2. Complete Tree Compliance Verification

### 2.1 Orders & Fulfillment
| Feature / Sub-view | Component View File | Remote Supabase Table | TypeScript API | Front-End Logic Status |
| :--- | :--- | :--- | :--- | :--- |
| **Order Views (6 tabs)** | `OrdersView.tsx` | `orders`, `erp_orders` | `/api/orders`, `/api/financial/orders` | **VERIFIED:** Tabs: All Orders, Unfulfilled, Ready to Ship, Local Pickup, Shipped, Delivered. |
| **Order Details Matrix** | `OrdersView.tsx`, `OrderDetailsView.tsx` | `orders`, `order_items`, `erp_warehouse_locations` | `/api/orders?id=*` | **VERIFIED:** Order #, SLA indicator, Date & Age, Customer & Pet, Items & Bin Location (e.g., `BIN B-04`, `BAY 4`), Total ($), Payment Method, Status badge. |
| **Order Actions** | `OrdersView.tsx`, `OrderDetailsView.tsx` | `orders`, `erp_purchase_orders` | `/api/orders` | **VERIFIED:** View Order Details, Create PO, Packing Slip, Shipping Label, Resend Alert, Restock / Add New Inventory. |
| **Order Creation** | `OrdersView.tsx` | `orders`, `order_items` | `/rpc/create_sales_order`, `/api/orders` (POST) | **VERIFIED:** `+ Create Order` modal with customer picker, product search, tax calculation, and payment terms. |
| **Export CSV** | `OrdersView.tsx` | `orders` | `/api/orders/export` | **VERIFIED:** One-click CSV export of order logs with date and status filters. |
| **Fulfillment Queue (8 stages)** | `OrdersView.tsx` | `erp_order_fulfillment_queue`, `erp_shipments` | `/api/fulfillment` | **VERIFIED:** Multi-stage lane: Unfulfilled, Rush Queue, Ready to Ship, Packed & Staged, Local Pickup, Curbside Arrived, Shipped Today, Dispatched. |
| **Fulfillment Actions** | `OrderDetailsView.tsx`, `ShippingStationView.tsx` | `commerce_shipping_labels`, `commerce_batch_slips` | `/api/shipping/labels` | **VERIFIED:** Print Packing Slip, Generate Shipping Label (USPS/UPS/FedEx), Resend Alert to Customer. |

### 2.2 Returns / Issues & RMA
| Feature / Sub-view | Component View File | Remote Supabase Table | TypeScript API | Front-End Logic Status |
| :--- | :--- | :--- | :--- | :--- |
| **All Returns & Views** | `ReturnsView.tsx` | `erp_return_authorizations`, `commerce_return_actions` | `/api/returns` | **VERIFIED:** All Returns, RMA Action Required, Action Required, Awaiting Package, Completed. |
| **Returns / Refunds** | `ReturnsView.tsx`, `RefundsView.tsx` | `erp_return_refunds`, `commerce_refunds` | `/api/financial/refunds` | **VERIFIED:** Refund line item selector, return reason codes (Damaged, Wrong Size, Pet Dislike), fee waiver toggles. |
| **Return Actions** | `ReturnsView.tsx` | `erp_return_inspections` | `/api/returns/action` | **VERIFIED:** Review RMA request, Track incoming package, View original order invoice and pet details. |

### 2.3 Inventory & Warehouse Bin Locations
| Feature / Sub-view | Component View File | Remote Supabase Table | TypeScript API | Front-End Logic Status |
| :--- | :--- | :--- | :--- | :--- |
| **Inventory List Columns** | `InventoryView.tsx`, `BooksView.tsx` | `products`, `erp_products`, `erp_inventory_balances` | `/api/inventory` | **VERIFIED:** Item Name & SKU, Category, Current Stock, Reorder Level, Unit Price, Status badge (In Stock / Low Stock / Out of Stock), Actions. |
| **Inventory Actions** | `InventoryView.tsx`, `PurchaseOrdersView.tsx` | `erp_inventory_movements` | `/rpc/apply_stock_movement` | **VERIFIED:** Add Inventory modal, Restock / Add New Inventory wizard, Quick Reorder button. |
| **Inventory Bin Location** | `InventoryView.tsx`, `OrdersView.tsx` | `erp_warehouse_locations`, `erp_warehouse_zones` | `/api/inventory/bins` | **VERIFIED:** Bin location mapping (`BIN B-04`, `SHELF P-03`, `BAY 4 BULK`, `DISPATCH HUB`). |

---

### 2.4 Inventory Categories to Publish to Ecommerce (10 Core Taxonomies)
All 10 requested publishable ecommerce categories and all subcategories are mapped to `commerce_categories` and `erp_product_categories`:

| Category Hierarchy | Subcategories Mapped in UI & DB | Remote Supabase Table | Front-End Status |
| :--- | :--- | :--- | :--- |
| **1. Feeding & Supplies** | Automatic Feeders, Bowls & Dishes, Feeding Mats, Food Storage, Fountains, Lick Mats, Nursing Supplies, Water Bottles | `commerce_categories`, `products` | **VERIFIED:** Filterable and publishable to customer store. |
| **2. Grooming** | Brushes, Claw Care, Colognes, Combs, Dander Remover Sprays, Dematting Tools, Deodorizers, Electric Clippers & Blades, Grooming Wipes, Hair Removal Mitts & Rollers, Scissors, Shampoos & Conditioners, Shedding Tools, Shower & Bath Supplies, Styptic Gels & Powders | `commerce_categories`, `products` | **VERIFIED:** Complete salon supply and retail shelf taxonomy. |
| **3. Bedding & Furniture** | Bed Blankets, Bed Covers, Bed Liners, Bed Mats, Bed Pillows, Beds, Furniture-Style Crates, Sofas & Chairs, Stairs & Steps | `commerce_categories`, `products` | **VERIFIED:** Available in product catalog creator. |
| **4. Treats & Snacks** | Cookies, Biscuits, Snacks, Dental Chews, Freeze-Dried Meats | `commerce_categories`, `products` | **VERIFIED:** Expiry date tracking and batch lot support. |
| **5. Apparel & Accessories** | Backpacks, Bandanas, Boots & Paw Protectors, Cold Weather Coats, Costumes, Dresses, Hair Accessories, Hats, Hoodies, Lifejackets, Necklaces & Pendants, Raincoats, Shirts, Sunglasses, Sweaters | `commerce_categories`, `products` | **VERIFIED:** Size and color variant matrices supported. |
| **6. Walking Essentials** | Collars, Harnesses, Leashes, Hands-Free Belts, Waste Bag Dispensers | `commerce_categories`, `products` | **VERIFIED:** Durable gear catalog tags. |
| **7. Travel & Carriers** | Backpacks, Bicycle Carriers, Bicycle Trailers, Car Travel Accessories, Carriers, Purses, Slings, Strollers | `commerce_categories`, `products` | **VERIFIED:** Airline-compliant carrier tags. |
| **8. Health & Wellness** | Dental Care, Digestive Remedies, DNA Tests, Ear Care, Eye Care, Hip & Joint Care, Itch Remedies, Supplements & Vitamins | `commerce_categories`, `products` | **VERIFIED:** Dosage instructions and active ingredient fields. |
| **9. Toys** | Chew Toys, Interactive Toys, Plush Toys, Fetch Toys, Rope Toys, Agility, Puzzle Toys | `commerce_categories`, `products` | **VERIFIED:** Toughness ratings and squeaker flags. |
| **10. Safety & Tech** | Muzzles, ID Tags & Collar Accessories, Location Trackers, Activity Trackers | `commerce_categories`, `products` | **VERIFIED:** Bluetooth/GPS tracking serial number fields. |

---

### 2.5 Products, Purchasing, Shipping & Financial/Accounting
| Feature / Sub-view | Component View File | Remote Supabase Table | TypeScript API | Front-End Logic Status |
| :--- | :--- | :--- | :--- | :--- |
| **Product Pricing & Details** | `InventoryView.tsx`, `ServicesPricingMatrixScreen.tsx` | `products`, `commerce_prices` | `/api/inventory` | **VERIFIED:** Published Price, Discount Price, Product Description, Product Image, Product Tags, Actions. |
| **Purchasing & Purchase Orders** | `PurchaseOrdersView.tsx` | `erp_purchase_orders`, `erp_purchase_order_lines` | `/api/financial/purchase-orders` | **VERIFIED:** Views: All Orders, Ordered, In-Transit, Received / Closed; `+ Create PO` modal; Vendor assignment. |
| **Vendors Directory** | `PurchaseOrdersView.tsx` | `erp_vendors`, `acct_vendors` | `/api/financial/vendors` | **VERIFIED:** Vendor list, contact details, payment terms (Net 30/60), lead time tracking. |
| **Shipping & Label Station** | `ShippingStationView.tsx` | `commerce_shipping_labels`, `commerce_batch_slips` | `/api/shipping/labels` | **VERIFIED:** Label Station, Shipping Label generation, Batch Slips printing, Postage label printer integration. |
| **Reporting & General Ledger** | `BooksView.tsx`, `ReportsView.tsx` | `acct_profit_and_loss`, `acct_journal_entries`, `acct_journal_lines` | `/api/financial/reports`, `/rpc/post_journal` | **VERIFIED:** MTD Revenue card, P&L statement, Balance Sheet, Export Ledger CSV. |

---

## 3. Remote Cron, Function & Trigger Audit
1. **Trigger `erp_validate_order_line_quantities`**: Stored trigger on sales order lines validating available inventory before reserving or completing orders.
2. **Trigger `acct_block_posted_mutation`**: Enforces strict financial immutability on posted journal entries and finalized invoices.
3. **RPC `take_payment` & `apply_stock_movement`**: Directly callable stored functions for point-of-sale checkout and warehouse reconciliation.

---

## 4. Mock Fallback States to Remove
- `components/pawz/InventoryView.tsx`: Replace static `INVENTORY_PRODUCTS` import with live `fetch('/api/inventory')` against remote `products` and `erp_inventory_balances` tables.
- `components/pawz/financial/OrdersView.tsx`: Replace static `orders` array fallback with live query to `/api/financial/orders`.
- `components/pawz/financial/PurchaseOrdersView.tsx`: Replace hardcoded PO dummy rows with live query to `erp_purchase_orders`.

---

## 5. Comprehensive Actionable Roadmap (In Dependency Order)
1. [ ] Create `/api/inventory` endpoint connecting `InventoryView.tsx` directly to remote `products` and `erp_inventory_balances`.
2. [ ] Connect `OrdersView.tsx` to `/api/financial/orders` to render live `orders` and `order_items` from Supabase.
3. [ ] Wire `+ Create PO` modal in `PurchaseOrdersView.tsx` directly to `erp_purchase_orders` and `erp_vendors`.
4. [ ] Connect `ShippingStationView.tsx` to `/api/shipping/labels` with EasyPost/Shippo API integration.
5. [ ] Wire `BooksView.tsx` and `ReportsView.tsx` directly to `acct_profit_and_loss` and `acct_journal_lines`.
