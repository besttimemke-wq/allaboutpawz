# Task ID: ecom-C — Subagent C (full-stack-developer)

## Scope
Storefront Mega Menu + Customer Portal wiring + Catalog pricing field reconciliation (base_price/sale_price/compare_at_price).

## Files touched
- src/lib/shop/catalog.ts (modified — pricing field reconciliation)
- src/lib/shop/types.ts (modified — new price fields on ShopProduct)
- src/components/site/shop/product-card.tsx (modified — sale badge + strikethrough)
- src/app/(site)/products/[slug]/page.tsx (modified — PDP pricing)
- src/components/site/mega-menu.tsx (CREATED — hover mega menu)
- src/components/site/site-chrome.tsx (modified — integrate mega menu + mobile accordion)
- src/app/(portals)/customer/dashboard/page.tsx (modified — real /api/customer/orders data)

## Notes for downstream agents
- The catalog server still emits `price` (= displayPrice) and `priceCents` (= displayPriceCents) for backward compat. Existing consumers (cart-store, bag-client, product-detail island) keep working.
- The mega menu reads `/api/shop/categories` (existing endpoint) — no new API.
- The customer dashboard fetches `/api/customer/orders` directly. 401 → friendly sign-in CTA.
- All new UI uses the existing storefront palette (cream/ink/gold-deep). NO indigo/blue.
