'use client';

import { useEffect, useState, useCallback } from 'react';

// ============================================================================
// Admin → Categories
//
// Refactored to use /api/admin/categories. Adds the new mega-menu fields
// (hero_image, promo_blurb, sort_order, featured_in_mega_menu, seo_title,
// seo_description, is_active). Renders the tree with indentation by
// parent_id (3 levels max).
// ============================================================================

type Category = {
  id: number;
  parent_id: number | null;
  name: string;
  slug: string;
  source_url?: string | null;
  hero_image?: string | null;
  promo_blurb?: string | null;
  sort_order?: number;
  featured_in_mega_menu?: boolean;
  seo_title?: string | null;
  seo_description?: string | null;
  is_active?: boolean;
};

type FormState = {
  name: string;
  slug: string;
  parent_id: string;
  hero_image: string;
  promo_blurb: string;
  sort_order: number;
  featured_in_mega_menu: boolean;
  seo_title: string;
  seo_description: string;
  is_active: boolean;
};

const EMPTY_FORM: FormState = {
  name: '',
  slug: '',
  parent_id: '',
  hero_image: '',
  promo_blurb: '',
  sort_order: 0,
  featured_in_mega_menu: false,
  seo_title: '',
  seo_description: '',
  is_active: true,
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [heroFile, setHeroFile] = useState<File | null>(null);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/categories', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setCategories(Array.isArray(json.categories) ? json.categories : []);
      }
    } catch (e) {
      console.error('Failed to load categories', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function openNew() {
    setEditCat(null);
    setForm(EMPTY_FORM);
    setHeroFile(null);
    setShowForm(true);
  }

  function openEdit(c: Category) {
    setEditCat(c);
    setForm({
      name: c.name || '',
      slug: c.slug || '',
      parent_id: c.parent_id ? String(c.parent_id) : '',
      hero_image: c.hero_image || '',
      promo_blurb: c.promo_blurb || '',
      sort_order: Number(c.sort_order ?? 0),
      featured_in_mega_menu: !!c.featured_in_mega_menu,
      seo_title: c.seo_title || '',
      seo_description: c.seo_description || '',
      is_active: c.is_active !== false,
    });
    setHeroFile(null);
    setShowForm(true);
  }

  async function uploadHero(): Promise<string | null> {
    if (!heroFile) return null;
    const fd = new FormData();
    fd.append('file', heroFile);
    fd.append('path', 'categories');
    const res = await fetch('/api/admin/media', { method: 'POST', body: fd });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.error || res.statusText);
    }
    const json = await res.json();
    return json.url as string;
  }

  async function saveCategory() {
    if (!form.name.trim()) {
      flash('Name is required');
      return;
    }
    setBusy(true);
    try {
      let heroUrl = form.hero_image;
      if (heroFile) {
        const uploaded = await uploadHero();
        if (uploaded) heroUrl = uploaded;
      }

      const payload: any = {
        name: form.name,
        slug: form.slug || undefined,
        parent_id: form.parent_id || null,
        hero_image: heroUrl || null,
        promo_blurb: form.promo_blurb || null,
        sort_order: Number(form.sort_order ?? 0),
        featured_in_mega_menu: !!form.featured_in_mega_menu,
        seo_title: form.seo_title || null,
        seo_description: form.seo_description || null,
        is_active: form.is_active !== false,
      };

      const res = editCat
        ? await fetch(`/api/admin/categories/${editCat.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/admin/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        flash(`Save failed: ${e.error || res.statusText}`);
        return;
      }
      flash(editCat ? 'Category saved' : 'Category created');
      setShowForm(false);
      setEditCat(null);
      setForm(EMPTY_FORM);
      setHeroFile(null);
      await loadCategories();
    } catch (e) {
      flash(`Save failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function deleteCategory(c: Category) {
    if (!confirm(`Delete ${c.name}?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/categories/${c.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        flash(`Delete failed: ${e.error || res.statusText}`);
        return;
      }
      flash('Category deleted');
      await loadCategories();
    } finally {
      setBusy(false);
    }
  }

  const roots = categories.filter((c) => !c.parent_id);
  const childrenOf = (id: number) => categories.filter((c) => c.parent_id === id);

  function renderTree(cats: Category[], depth: number = 0): React.ReactNode {
    if (depth > 2) return null; // 3 levels max
    return cats.map((c) => (
      <div key={c.id}>
        <div
          className="flex items-center gap-3 py-2 border-b border-border last:border-0"
          style={{ paddingLeft: depth * 20 }}
        >
          <span className={`text-sm font-medium ${c.is_active === false ? 'text-muted-foreground line-through' : ''}`}>
            {c.name}
          </span>
          <span className="text-xs text-muted-foreground">/{c.slug}</span>
          {c.featured_in_mega_menu && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-semibold">
              MEGA
            </span>
          )}
          {typeof c.sort_order === 'number' && (
            <span className="text-[10px] text-muted-foreground">#{c.sort_order}</span>
          )}
          <button
            onClick={() => openEdit(c)}
            disabled={busy}
            className="text-blue-600 text-xs hover:underline ml-auto"
          >
            Edit
          </button>
          <button
            onClick={() => deleteCategory(c)}
            disabled={busy}
            className="text-red-600 text-xs hover:underline"
          >
            Delete
          </button>
        </div>
        {childrenOf(c.id).length > 0 && renderTree(childrenOf(c.id), depth + 1)}
      </div>
    ));
  }

  if (loading) return <div className="p-6">Loading categories...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {categories.length} categories in pet_product_categories
          </p>
        </div>
        <button
          onClick={openNew}
          className="px-4 py-2 bg-ink text-white rounded-lg text-sm font-semibold"
        >
          + Add Category
        </button>
      </div>

      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-ink text-white px-4 py-2 rounded-lg shadow-lg text-sm">
          {toast}
        </div>
      )}

      <div className="border border-border rounded-lg p-4">{renderTree(roots)}</div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">{editCat ? 'Edit Category' : 'New Category'}</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-muted-foreground"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-border rounded-lg p-2 mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground">Slug</label>
                <input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className="w-full border border-border rounded-lg p-2 mt-1"
                  placeholder="auto-generated"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-muted-foreground">
                Parent Category
              </label>
              <select
                value={form.parent_id}
                onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
                className="w-full border border-border rounded-lg p-2 mt-1 bg-white"
              >
                <option value="">None (Top Level)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground">
                  Sort Order
                </label>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) =>
                    setForm({ ...form, sort_order: Number(e.target.value) })
                  }
                  className="w-full border border-border rounded-lg p-2 mt-1"
                />
              </div>
              <div className="flex items-end gap-4 pb-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.featured_in_mega_menu}
                    onChange={(e) =>
                      setForm({ ...form, featured_in_mega_menu: e.target.checked })
                    }
                  />
                  Mega Menu
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  />
                  Active
                </label>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-muted-foreground">
                Hero Image
              </label>
              {form.hero_image && (
                <img
                  src={form.hero_image}
                  alt=""
                  className="w-20 h-20 object-cover rounded mt-1 mb-2"
                />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setHeroFile(e.target.files?.[0] || null)}
                className="w-full border border-border rounded-lg p-2 mt-1"
              />
              <input
                value={form.hero_image}
                onChange={(e) => setForm({ ...form, hero_image: e.target.value })}
                className="w-full border border-border rounded-lg p-2 mt-1 text-xs"
                placeholder="…or paste a URL"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-muted-foreground">
                Promo Blurb
              </label>
              <textarea
                value={form.promo_blurb}
                onChange={(e) => setForm({ ...form, promo_blurb: e.target.value })}
                rows={2}
                className="w-full border border-border rounded-lg p-2 mt-1"
                placeholder="Short marketing line shown in the mega menu."
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground">
                  SEO Title
                </label>
                <input
                  value={form.seo_title}
                  onChange={(e) => setForm({ ...form, seo_title: e.target.value })}
                  className="w-full border border-border rounded-lg p-2 mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground">
                  SEO Description
                </label>
                <textarea
                  value={form.seo_description}
                  onChange={(e) => setForm({ ...form, seo_description: e.target.value })}
                  rows={2}
                  className="w-full border border-border rounded-lg p-2 mt-1"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <button
                onClick={saveCategory}
                disabled={busy}
                className="px-6 py-2 bg-ink text-white rounded-lg text-sm font-semibold disabled:opacity-50"
              >
                {editCat ? 'Save' : 'Create'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-6 py-2 border border-border rounded-lg text-sm font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
