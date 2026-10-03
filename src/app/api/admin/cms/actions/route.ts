// ---------------------------------------------------------------------------
// /api/admin/cms/actions/route.ts
//
// CMS & Website Operations — 10 handlers for the CMS module (Section 9 of
// the tree). Each handler writes to (or reads from) the live CMS tables:
//   cms_pages, cms_page_revisions, cms_banners, cms_galleries,
//   cms_gallery_items, cms_navigation, cms_global_content, cms_seo.
// Plus crm_surcharges (pricing rules), crm_services (catalog), and
// commerce_payment_methods (gateway settings).
//
// All invocations are audit-logged via the shared auditAction() helper.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/gate";
import { pgExec, pgQuery } from "@/lib/pg";
import { TENANT_ID } from "@/lib/crm/enterprise";
import { auditAction, getActorIdFromRequest } from "@/lib/quick-actions/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const gate = await requireAdminApi();
  if (gate) return gate;

  let action = "";
  let payload: Record<string, unknown> = {};
  let actorId: string | null = null;
  let ip: string | null = null;

  try {
    const body = await req.json();
    action = String(body.action || "");
    payload = body.payload ?? body;
    delete (payload as Record<string, unknown>).action;
    actorId = await getActorIdFromRequest(req);
    ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  } catch (e) {
    return NextResponse.json({ error: `Invalid request body: ${e instanceof Error ? e.message : "unknown"}` }, { status: 400 });
  }

  const shortAction = action.replace(/^[a-z]+_/, "");

  try {
    switch (shortAction) {
      // ───────────────────────────────────────────────────────────────────
      // PRICING RULES
      // ───────────────────────────────────────────────────────────────────

      case "edit_pricing_rules":
      case "pricing_rules": {
        // cms_edit_pricing_rules → edit_pricing_rules
        // Batch update surcharge rules: enable/disable, adjust amounts,
        // toggle auto-apply. Accepts an array of rule updates.
        const rules = (payload.rules as Array<{
          surcharge_id?: string; amount?: number; percent?: number;
          auto_apply?: boolean; is_active?: boolean;
        }>) || [];
        let updated = 0;
        for (const r of rules) {
          if (!r.surcharge_id) continue;
          updated += await pgExec(
            `UPDATE public.crm_surcharges
                SET amount = COALESCE($1, amount),
                    percent = COALESCE($2, percent),
                    auto_apply = COALESCE($3, auto_apply),
                    is_active = COALESCE($4, is_active),
                    updated_at = now()
              WHERE id = $5::uuid AND tenant_id = $6`,
            [r.amount !== undefined ? r.amount : null, r.percent !== undefined ? r.percent : null,
             r.auto_apply !== undefined ? r.auto_apply : null,
             r.is_active !== undefined ? r.is_active : null,
             r.surcharge_id, TENANT_ID()],
          );
        }
        await auditAction({ action, domain: "crm", tableName: "crm_surcharges", recordId: null, afterData: { rulesUpdated: updated, totalRules: rules.length }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, rulesUpdated: updated, totalRules: rules.length, message: `${updated} pricing rules updated` });
      }

      // ───────────────────────────────────────────────────────────────────
      // PAGE EDITOR
      // ───────────────────────────────────────────────────────────────────

      case "update_page": {
        // cms_update_page → update_page
        // Update a CMS page's title, body, blocks, excerpt, and featured
        // image. Also creates a page revision for version history.
        const pageId = String(payload.page_id || "");
        const title = payload.title ? String(payload.title) : null;
        const body = payload.body !== undefined ? String(payload.body) : null;
        const blocks = payload.blocks ? JSON.stringify(payload.blocks) : null;
        const excerpt = payload.excerpt ? String(payload.excerpt) : null;
        const featuredImageUrl = payload.featured_image_url ? String(payload.featured_image_url) : null;
        const changeNote = payload.change_note ? String(payload.change_note) : null;
        // Update the page
        const updated = await pgExec(
          `UPDATE public.cms_pages
              SET title = COALESCE($1, title),
                  body = COALESCE($2, body),
                  blocks = COALESCE($3::jsonb, blocks),
                  excerpt = COALESCE($4, excerpt),
                  featured_image_url = COALESCE($5, featured_image_url),
                  updated_at = now()
            WHERE id = $6::uuid AND tenant_id = $7`,
          [title, body, blocks, excerpt, featuredImageUrl, pageId, TENANT_ID()],
        );
        if (!updated) {
          return NextResponse.json({ ok: false, error: "Page not found" }, { status: 404 });
        }
        // Insert a revision for version history
        const revRows = await pgQuery<{ id: string; version: number }>(
          `INSERT INTO public.cms_page_revisions
             (id, tenant_id, page_id, version, title, body, blocks, change_note, created_by, created_at, updated_at)
           SELECT gen_random_uuid(), $1, $2::uuid,
                  COALESCE(MAX(version), 0) + 1,
                  COALESCE($3, (SELECT title FROM public.cms_pages WHERE id = $2::uuid)),
                  COALESCE($4, (SELECT body FROM public.cms_pages WHERE id = $2::uuid)),
                  COALESCE($5::jsonb, (SELECT blocks FROM public.cms_pages WHERE id = $2::uuid)),
                  $6, $7::uuid, now(), now()
             FROM public.cms_page_revisions WHERE page_id = $2::uuid
           RETURNING id, version`,
          [TENANT_ID(), pageId, title, body, blocks, changeNote, actorId],
        );
        const revisionId = revRows[0]?.id ?? null;
        const version = revRows[0]?.version ?? null;
        await auditAction({ action, domain: "crm", tableName: "cms_pages", recordId: pageId, afterData: { title, revisionId, version }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, pageId, revisionId, version, message: "Page updated" });
      }

      // ───────────────────────────────────────────────────────────────────
      // BANNERS
      // ───────────────────────────────────────────────────────────────────

      case "add_banner": {
        // cms_add_banner → add_banner
        // Create a promotional banner with headline, CTA, placement, and
        // scheduling (starts_at/ends_at).
        // CHECK: banner_type IN ('hero','promo_bar','popup','inline','footer','alert')
        // CHECK: placement IN ('home','all_pages','services','booking','portal','custom')
        const VALID_BANNER_TYPES = new Set(["hero", "promo_bar", "popup", "inline", "footer", "alert"]);
        const VALID_PLACEMENTS = new Set(["home", "all_pages", "services", "booking", "portal", "custom"]);
        const name = String(payload.name || "Banner");
        let bannerType = String(payload.banner_type || "promo_bar");
        if (!VALID_BANNER_TYPES.has(bannerType)) bannerType = "promo_bar";
        const headline = payload.headline ? String(payload.headline) : null;
        const subheadline = payload.subheadline ? String(payload.subheadline) : null;
        const body = payload.body ? String(payload.body) : null;
        const imageUrl = payload.image_url ? String(payload.image_url) : null;
        const ctaLabel = payload.cta_label ? String(payload.cta_label) : null;
        const ctaUrl = payload.cta_url ? String(payload.cta_url) : null;
        let placement = String(payload.placement || "home");
        if (!VALID_PLACEMENTS.has(placement)) placement = "home";
        const startsAt = payload.starts_at ? String(payload.starts_at) : null;
        const endsAt = payload.ends_at ? String(payload.ends_at) : null;
        const dismissible = payload.dismissible !== undefined ? Boolean(payload.dismissible) : true;
        const rows = await pgQuery<{ id: string }>(
          `INSERT INTO public.cms_banners
             (id, tenant_id, name, banner_type, headline, subheadline, body,
              image_url, cta_label, cta_url, placement, sort_order, is_active,
              starts_at, ends_at, dismissible, metadata, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                   0, true, $11, $12, $13, '{}'::jsonb, now(), now())
           RETURNING id`,
          [TENANT_ID(), name, bannerType, headline, subheadline, body, imageUrl, ctaLabel, ctaUrl, placement, startsAt, endsAt, dismissible],
        );
        const bannerId = rows[0]?.id ?? null;
        await auditAction({ action, domain: "crm", tableName: "cms_banners", recordId: bannerId, afterData: { name, headline, placement, bannerType }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, bannerId, name, placement, bannerType, message: "Banner created" });
      }

      // ───────────────────────────────────────────────────────────────────
      // GALLERY
      // ───────────────────────────────────────────────────────────────────

      case "update_gallery": {
        // cms_update_gallery → update_gallery
        // Add a gallery item (image upload with caption, alt text, pet/staff
        // links, consent flag). Looks up the gallery by slug or ID.
        const gallerySlug = payload.gallery_slug ? String(payload.gallery_slug) : null;
        const galleryId = payload.gallery_id ? String(payload.gallery_id) : null;
        const imageUrl = String(payload.image_url || "");
        const beforeImageUrl = payload.before_image_url ? String(payload.before_image_url) : null;
        const caption = payload.caption ? String(payload.caption) : null;
        const altText = payload.alt_text ? String(payload.alt_text) : null;
        const petId = payload.pet_id ? String(payload.pet_id) : null;
        const staffId = payload.staff_id ? String(payload.staff_id) : null;
        const serviceId = payload.service_id ? String(payload.service_id) : null;
        const consentOnFile = Boolean(payload.consent_on_file ?? false);
        // Resolve gallery_id from slug if needed; create if missing
        let resolvedGalleryId = galleryId;
        if (!resolvedGalleryId && gallerySlug) {
          const gRows = await pgQuery<{ id: string }>(`SELECT id FROM public.cms_galleries WHERE slug = $1 AND tenant_id = $2`, [gallerySlug, TENANT_ID()]);
          resolvedGalleryId = gRows[0]?.id ?? null;
          if (!resolvedGalleryId) {
            // Auto-create the gallery
            const newGal = await pgQuery<{ id: string }>(
              `INSERT INTO public.cms_galleries
                 (id, tenant_id, name, slug, gallery_type, is_published, sort_order, metadata, created_at, updated_at)
               VALUES (gen_random_uuid(), $1, $2, $3, 'before_after', true, 0, '{}'::jsonb, now(), now())
               RETURNING id`,
              [TENANT_ID(), gallerySlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), gallerySlug],
            );
            resolvedGalleryId = newGal[0]?.id ?? null;
          }
        }
        const rows = await pgQuery<{ id: string }>(
          `INSERT INTO public.cms_gallery_items
             (id, tenant_id, gallery_id, image_url, before_image_url, caption,
              alt_text, pet_id, staff_id, service_id, consent_on_file,
              sort_order, is_published, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2::uuid, $3, $4, $5, $6, $7::uuid,
                   $8::uuid, $9::uuid, $10, 0, true, now(), now())
           RETURNING id`,
          [TENANT_ID(), resolvedGalleryId, imageUrl, beforeImageUrl, caption, altText, petId, staffId, serviceId, consentOnFile],
        );
        const galleryItemId = rows[0]?.id ?? null;
        await auditAction({ action, domain: "crm", tableName: "cms_gallery_items", recordId: galleryItemId, afterData: { galleryId: resolvedGalleryId, imageUrl, caption }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, galleryItemId, galleryId: resolvedGalleryId, imageUrl, message: "Gallery item added" });
      }

      // ───────────────────────────────────────────────────────────────────
      // NAVIGATION
      // ───────────────────────────────────────────────────────────────────

      case "edit_navigation": {
        // cms_edit_navigation → edit_navigation
        // Add or update a navigation link.
        // CHECK: menu_key IN ('primary','footer','mobile','utility','portal')
        // CHECK: (url IS NOT NULL) OR (page_id IS NOT NULL) — at least one required
        const VALID_MENU_KEYS = new Set(["primary", "footer", "mobile", "utility", "portal"]);
        const navId = payload.nav_id ? String(payload.nav_id) : null;
        let menuKey = String(payload.menu_key || "primary");
        if (!VALID_MENU_KEYS.has(menuKey)) menuKey = "primary";
        const label = payload.label ? String(payload.label) : null;
        const url = payload.url ? String(payload.url) : null;
        const pageId = payload.page_id ? String(payload.page_id) : null;
        if (!url && !pageId) {
          return NextResponse.json({ ok: false, error: "Either url or page_id is required (CHECK constraint)" }, { status: 400 });
        }
        const parentId = payload.parent_id ? String(payload.parent_id) : null;
        const sortOrder = payload.sort_order !== undefined ? Number(payload.sort_order) : 0;
        const opensNewTab = Boolean(payload.opens_new_tab ?? false);
        const icon = payload.icon ? String(payload.icon) : null;
        const isActive = payload.is_active !== undefined ? Boolean(payload.is_active) : true;
        if (navId) {
          const updated = await pgExec(
            `UPDATE public.cms_navigation
                SET label = COALESCE($1, label), url = COALESCE($2, url),
                    page_id = COALESCE($3::uuid, page_id), parent_id = $4::uuid,
                    sort_order = COALESCE($5, sort_order), opens_new_tab = $6,
                    icon = COALESCE($7, icon), is_active = $8, updated_at = now()
              WHERE id = $9::uuid AND tenant_id = $10`,
            [label, url, pageId, parentId, sortOrder, opensNewTab, icon, isActive, navId, TENANT_ID()],
          );
          await auditAction({ action, domain: "crm", tableName: "cms_navigation", recordId: navId, afterData: { label, url, menuKey, updated }, actorUserId: actorId, ipAddress: ip });
          return NextResponse.json({ ok: true, navId, updated, message: "Navigation link updated" });
        } else {
          const rows = await pgQuery<{ id: string }>(
            `INSERT INTO public.cms_navigation
               (id, tenant_id, menu_key, label, url, page_id, parent_id,
                sort_order, opens_new_tab, icon, visibility, is_active,
                created_at, updated_at)
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5::uuid, $6::uuid,
                     $7, $8, $9, 'public', $10, now(), now())
             RETURNING id`,
            [TENANT_ID(), menuKey, label, url, pageId, parentId, sortOrder, opensNewTab, icon, isActive],
          );
          const newNavId = rows[0]?.id ?? null;
          await auditAction({ action, domain: "crm", tableName: "cms_navigation", recordId: newNavId, afterData: { label, url, menuKey }, actorUserId: actorId, ipAddress: ip });
          return NextResponse.json({ ok: true, navId: newNavId, menuKey, label, message: "Navigation link created" });
        }
      }

      // ───────────────────────────────────────────────────────────────────
      // GLOBAL CONTENT
      // ───────────────────────────────────────────────────────────────────

      case "edit_global_content": {
        // cms_edit_global_content → edit_global_content
        // Upsert a global content variable (key-value pair). If the key
        // already exists, update the value; otherwise insert.
        const contentKey = String(payload.content_key || "");
        const label = payload.label ? String(payload.label) : contentKey;
        const valueText = payload.value_text !== undefined ? String(payload.value_text) : null;
        const valueJson = payload.value_json ? JSON.stringify(payload.value_json) : null;
        const contentGroup = String(payload.content_group || "general");
        const locale = String(payload.locale || "en");
        if (!contentKey) {
          return NextResponse.json({ ok: false, error: "content_key is required" }, { status: 400 });
        }
        // Upsert by (tenant_id, content_key, locale)
        const rows = await pgQuery<{ id: string }>(
          `INSERT INTO public.cms_global_content
             (id, tenant_id, content_key, label, value_text, value_json,
              content_group, locale, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5::jsonb, $6, $7, now(), now())
           ON CONFLICT (tenant_id, content_key, locale)
           DO UPDATE SET label = EXCLUDED.label, value_text = EXCLUDED.value_text,
                         value_json = EXCLUDED.value_json, content_group = EXCLUDED.content_group,
                         updated_at = now()
           RETURNING id`,
          [TENANT_ID(), contentKey, label, valueText, valueJson, contentGroup, locale],
        );
        const contentId = rows[0]?.id ?? null;
        await auditAction({ action, domain: "crm", tableName: "cms_global_content", recordId: contentId, afterData: { contentKey, label, contentGroup, locale }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, contentId, contentKey, label, message: "Global content updated" });
      }

      // ───────────────────────────────────────────────────────────────────
      // SEO
      // ───────────────────────────────────────────────────────────────────

      case "update_seo": {
        // cms_update_seo → update_seo
        // Upsert SEO metadata for a page (or for a global scope). If
        // page_id is provided, the scope is 'page'; otherwise scope is
        // 'global'. The unique index is on (tenant_id, page_id) — so we
        // can only ON CONFLICT when page_id is provided.
        const pageId = payload.page_id ? String(payload.page_id) : null;
        // CHECK: scope IN ('page','site_default'). When page_id is provided,
        // scope MUST be 'page'. When no page_id, scope MUST be 'site_default'
        // AND page_id must be NULL.
        const scope = pageId ? "page" : "site_default";
        const metaTitle = payload.meta_title ? String(payload.meta_title) : null;
        const metaDescription = payload.meta_description ? String(payload.meta_description) : null;
        const canonicalUrl = payload.canonical_url ? String(payload.canonical_url) : null;
        const ogTitle = payload.og_title ? String(payload.og_title) : null;
        const ogDescription = payload.og_description ? String(payload.og_description) : null;
        const ogImageUrl = payload.og_image_url ? String(payload.og_image_url) : null;
        const twitterCard = payload.twitter_card ? String(payload.twitter_card) : null;
        // When page_id is provided, use ON CONFLICT (tenant_id, page_id)
        // for upsert. When no page_id (global scope), just INSERT (can't
        // ON CONFLICT on a NULL column).
        let rows;
        if (pageId) {
          rows = await pgQuery<{ id: string }>(
            `INSERT INTO public.cms_seo
               (id, tenant_id, page_id, scope, meta_title, meta_description,
                canonical_url, og_title, og_description, og_image_url,
                twitter_card, created_at, updated_at)
             VALUES (gen_random_uuid(), $1, $2::uuid, $3, $4, $5, $6, $7, $8, $9,
                     $10, now(), now())
             ON CONFLICT (tenant_id, page_id)
             DO UPDATE SET meta_title = EXCLUDED.meta_title,
                           meta_description = EXCLUDED.meta_description,
                           canonical_url = EXCLUDED.canonical_url,
                           og_title = EXCLUDED.og_title,
                           og_description = EXCLUDED.og_description,
                           og_image_url = EXCLUDED.og_image_url,
                           twitter_card = EXCLUDED.twitter_card,
                           updated_at = now()
             RETURNING id`,
            [TENANT_ID(), pageId, scope, metaTitle, metaDescription, canonicalUrl, ogTitle, ogDescription, ogImageUrl, twitterCard],
          );
        } else {
          // Global scope — just INSERT (no conflict target for NULL page_id)
          rows = await pgQuery<{ id: string }>(
            `INSERT INTO public.cms_seo
               (id, tenant_id, page_id, scope, meta_title, meta_description,
                canonical_url, og_title, og_description, og_image_url,
                twitter_card, created_at, updated_at)
             VALUES (gen_random_uuid(), $1, NULL, $2, $3, $4, $5, $6, $7, $8,
                     $9, now(), now())
             RETURNING id`,
            [TENANT_ID(), scope, metaTitle, metaDescription, canonicalUrl, ogTitle, ogDescription, ogImageUrl, twitterCard],
          );
        }
        const seoId = rows[0]?.id ?? null;
        await auditAction({ action, domain: "crm", tableName: "cms_seo", recordId: seoId, afterData: { pageId, scope, metaTitle }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, seoId, pageId, scope, message: "SEO metadata updated" });
      }

      // ───────────────────────────────────────────────────────────────────
      // LEGAL WAIVERS
      // ───────────────────────────────────────────────────────────────────

      case "edit_legal_waivers": {
        // cms_edit_legal_waivers → edit_legal_waivers
        // Create or update a legal waiver page (liability terms, intake
        // waivers, etc.). Stored as a cms_pages row with page_type='policy'.
        // CHECK: page_type IN ('standard','home','services','about','contact',
        //   'policy','landing','blog_post','faq','gallery','custom')
        // CHECK: status IN ('draft','in_review','scheduled','published','archived')
        // CHECK: version >= 1 (NOT NULL)
        const slug = String(payload.slug || "legal-waivers");
        const title = String(payload.title || "Legal Waivers & Liability Release");
        const body = payload.body !== undefined ? String(payload.body) : null;
        const locale = String(payload.locale || "en");
        // Upsert by (tenant_id, slug, locale) — the unique index.
        const rows = await pgQuery<{ id: string }>(
          `INSERT INTO public.cms_pages
             (id, tenant_id, slug, title, page_type, body, body_format, blocks,
              sort_order, status, version, locale, metadata, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, 'policy', $4, 'markdown',
                   '{}'::jsonb, 0, 'published', 1, $5, '{}'::jsonb, now(), now())
           ON CONFLICT (tenant_id, slug, locale)
           DO UPDATE SET title = EXCLUDED.title,
                         body = COALESCE(EXCLUDED.body, cms_pages.body),
                         updated_at = now()
           RETURNING id`,
          [TENANT_ID(), slug, title, body, locale],
        );
        const pageId = rows[0]?.id ?? null;
        await auditAction({ action, domain: "crm", tableName: "cms_pages", recordId: pageId, afterData: { slug, title, pageType: "policy" }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, pageId, slug, title, message: "Legal waiver page updated" });
      }

      // ───────────────────────────────────────────────────────────────────
      // GATEWAY SETTINGS
      // ───────────────────────────────────────────────────────────────────

      case "edit_gateway_settings": {
        // cms_edit_gateway_settings → edit_gateway_settings
        // Toggle or configure a payment gateway (Stripe, Square, etc.).
        // Updates the commerce_payment_methods row for the given method
        // code (e.g. 'stripe_card').
        const methodCode = String(payload.method_code || payload.code || "stripe_card");
        const active = payload.active !== undefined ? Boolean(payload.active) : null;
        const configuration = payload.configuration ? JSON.stringify(payload.configuration) : null;
        // If method_id is provided, use it; otherwise look up by code
        const methodId = payload.method_id ? String(payload.method_id) : null;
        let resolvedMethodId = methodId;
        if (!resolvedMethodId) {
          const mRows = await pgQuery<{ id: string }>(`SELECT id FROM public.commerce_payment_methods WHERE tenant_id = $1 AND code = $2 LIMIT 1`, [TENANT_ID(), methodCode]);
          resolvedMethodId = mRows[0]?.id ?? null;
        }
        if (!resolvedMethodId) {
          return NextResponse.json({ ok: false, error: `Payment method '${methodCode}' not found` }, { status: 404 });
        }
        const updated = await pgExec(
          `UPDATE public.commerce_payment_methods
              SET active = COALESCE($1, active),
                  configuration = COALESCE($2::jsonb, configuration)
            WHERE id = $3::uuid AND tenant_id = $4`,
          [active, configuration, resolvedMethodId, TENANT_ID()],
        );
        await auditAction({ action, domain: "commerce", tableName: "commerce_payment_methods", recordId: resolvedMethodId, afterData: { methodCode, active, updated }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, methodId: resolvedMethodId, methodCode, active, updated, message: "Gateway settings updated" });
      }

      // ───────────────────────────────────────────────────────────────────
      // SERVICES CATALOG VIEW
      // ───────────────────────────────────────────────────────────────────

      case "services_catalog_view":
      case "catalog_view": {
        // cms_services_catalog_view → services_catalog_view
        // Read-only: list all active services from crm_services with their
        // default_price, duration, and category. Returns a structured array.
        const rows = await pgQuery<{
          id: string; name: string; code: string | null; description: string | null;
          category: string | null; default_price: string; default_duration_minutes: string;
          is_active: boolean; bookable_online: boolean;
        }>(
          `SELECT id, name, code, description, category,
                  default_price::text, default_duration_minutes::text,
                  is_active, bookable_online
             FROM public.crm_services
            WHERE tenant_id = $1 AND is_active = true
            ORDER BY category, name`,
          [TENANT_ID()],
        );
        const services = rows.map(r => ({
          id: r.id, name: r.name, code: r.code, description: r.description,
          category: r.category, defaultPrice: Number(r.default_price),
          defaultDurationMinutes: Number(r.default_duration_minutes),
          isActive: r.is_active, bookableOnline: r.bookable_online,
        }));
        const result = {
          services,
          totals: {
            totalServices: services.length,
            categories: [...new Set(services.map(s => s.category).filter(Boolean))].length,
            avgPrice: services.length > 0 ? services.reduce((s, r) => s + r.defaultPrice, 0) / services.length : 0,
          },
        };
        await auditAction({ action, domain: "crm", tableName: "crm_services", recordId: null, afterData: { totals: result.totals }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, catalog: result });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action} (short: ${shortAction})` }, { status: 400 });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[cms/actions] ${action} failed:`, msg);
    return NextResponse.json({ error: msg, action }, { status: 500 });
  }
}
