'use client';

import { useEffect, useState, useCallback } from 'react';

// ============================================================================
// Admin → Products
//
// Refactored to use the admin-gated REST endpoints in /api/admin/products
// (no direct browser Supabase calls — the anon key is never touched).
// Auto-revalidates the storefront server-side after every save/delete.
//
// Adds: brand selector, sale_price, visible toggle, category_id, stock.
// ============================================================================

type Brand = { id: string; name: string; slug: string };

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  short_description: string | null;
  base_price: string;
  sale_price: string | null;
  compare_at_price: string | null;
  image: string | null;
  alt: string | null;
  badge: string | null;
  category: string | null;
  category_id: number | null;
  brand_id: string | null;
  brand_name: string | null;
  brand_slug: string | null;
  featured: boolean;
  is_hidden: boolean;
  visible: boolean;
  inventory_count: number;
  stock: number | null;
  specs: string | null;
  materials: string | null;
  ingredients: string | null;
  directions: string | null;
  warranty: string | null;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  sort_order: number;
};

type Category = {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/products', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setProducts(Array.isArray(json.products) ? json.products : []);
      }
    } catch (e) {
      console.error('Failed to load products', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBrands = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/brands', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setBrands(Array.isArray(json.brands) ? json.brands : []);
      }
    } catch (e) {
      console.error('Failed to load brands', e);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/categories', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setCategories(Array.isArray(json.categories) ? json.categories : []);
      }
    } catch (e) {
      console.error('Failed to load categories', e);
    }
  }, []);

  useEffect(() => {
    loadProducts();
    loadBrands();
    loadCategories();
  }, [loadProducts, loadBrands, loadCategories]);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function patchProduct(p: Product, patch: Partial<Product>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/products/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        flash(`Update failed: ${e.error || res.statusText}`);
        return;
      }
      setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, ...patch } : x)));
    } finally {
      setBusy(false);
    }
  }

  async function toggleHidden(p: Product) {
    await patchProduct(p, { is_hidden: !p.is_hidden });
  }

  async function toggleVisible(p: Product) {
    await patchProduct(p, { visible: !p.visible });
  }

  async function toggleFeatured(p: Product) {
    await patchProduct(p, { featured: !p.featured });
  }

  async function deleteProduct(p: Product) {
    if (!confirm(`Delete ${p.name}?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/products/${p.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        flash(`Delete failed: ${e.error || res.statusText}`);
        return;
      }
      setProducts((prev) => prev.filter((x) => x.id !== p.id));
      flash('Product deleted');
    } finally {
      setBusy(false);
    }
  }

  async function saveProduct(data: Partial<Product>, imageFile: File | null) {
    setBusy(true);
    try {
      let imageUrl = data.image ?? null;
      if (imageFile) {
        const fd = new FormData();
        fd.append('file', imageFile);
        const upRes = await fetch('/api/admin/products?upload=image', { method: 'POST', body: fd });
        if (!upRes.ok) {
          const e = await upRes.json().catch(() => ({}));
          flash(`Image upload failed: ${e.error || upRes.statusText}`);
          return;
        }
        const upJson = await upRes.json();
        imageUrl = upJson.url;
      }

      const payload: Partial<Product> = { ...data, image: imageUrl };
      delete (payload as any).brand_name;
      delete (payload as any).brand_slug;
      delete (payload as any).id;
      delete (payload as any).created_at;

      if (editing) {
        const res = await fetch(`/api/admin/products/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          flash(`Save failed: ${e.error || res.statusText}`);
          return;
        }
        flash('Product saved');
      } else {
        const res = await fetch('/api/admin/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          flash(`Create failed: ${e.error || res.statusText}`);
          return;
        }
        flash('Product created');
      }
      setShowForm(false);
      setEditing(null);
      await loadProducts();
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="p-6">Loading products...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {products.length} products · {brands.length} brands · {categories.length} categories
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="px-4 py-2 bg-ink text-white rounded-lg text-sm font-semibold"
        >
          + Add Product
        </button>
      </div>

      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-ink text-white px-4 py-2 rounded-lg shadow-lg text-sm">
          {toast}
        </div>
      )}

      <div className="border border-border rounded-lg overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-3 text-left">Image</th>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Brand</th>
              <th className="p-3 text-left">Price</th>
              <th className="p-3 text-left">Stock</th>
              <th className="p-3 text-left">Category</th>
              <th className="p-3 text-left">Visible</th>
              <th className="p-3 text-left">Featured</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-border hover:bg-muted/50">
                <td className="p-3">
                  {p.image ? (
                    <img
                      src={p.image}
                      alt={p.alt || p.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-muted rounded" />
                  )}
                </td>
                <td className="p-3 font-medium">{p.name}</td>
                <td className="p-3 text-muted-foreground">{p.brand_name || '—'}</td>
                <td className="p-3">
                  {p.sale_price || p.base_price}
                  {p.compare_at_price ? (
                    <span className="text-muted-foreground line-through ml-1">
                      {p.compare_at_price}
                    </span>
                  ) : null}
                </td>
                <td className="p-3">{p.stock ?? p.inventory_count ?? 0}</td>
                <td className="p-3">{p.category || '—'}</td>
                <td className="p-3">
                  <button
                    onClick={() => toggleVisible(p)}
                    disabled={busy}
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      p.visible
                        ? 'bg-green-100 text-green-700'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {p.visible ? 'Visible' : 'Hidden'}
                  </button>
                </td>
                <td className="p-3">
                  <button
                    onClick={() => toggleFeatured(p)}
                    disabled={busy}
                    className={`px-2 py-1 rounded text-xs ${
                      p.featured ? 'bg-amber-100 text-amber-700' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {p.featured ? '★' : '☆'}
                  </button>
                </td>
                <td className="p-3 flex gap-2">
                  <button
                    onClick={() => {
                      setEditing(p);
                      setShowForm(true);
                    }}
                    className="text-blue-600 hover:underline text-xs"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteProduct(p)}
                    disabled={busy}
                    className="text-red-600 hover:underline text-xs"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={9} className="p-6 text-center text-muted-foreground">
                  No products yet. Click “+ Add Product” to create your first.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <ProductForm
          product={editing}
          brands={brands}
          categories={categories}
          onSave={saveProduct}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function ProductForm({
  product,
  brands,
  categories,
  onSave,
  onClose,
}: {
  product: Product | null;
  brands: Brand[];
  categories: Category[];
  onSave: (data: any, imageFile: File | null) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: product?.name || '',
    slug: product?.slug || '',
    description: product?.description || '',
    short_description: product?.short_description || '',
    base_price: product?.base_price || '$0.00',
    sale_price: product?.sale_price || '',
    compare_at_price: product?.compare_at_price || '',
    badge: product?.badge || '',
    category: product?.category || '',
    category_id: product?.category_id ?? '',
    brand_id: product?.brand_id || '',
    inventory_count: product?.inventory_count ?? 0,
    stock: product?.stock ?? '',
    specs: product?.specs || '',
    materials: product?.materials || '',
    ingredients: product?.ingredients || '',
    directions: product?.directions || '',
    warranty: product?.warranty || '',
    stripe_product_id: product?.stripe_product_id || '',
    stripe_price_id: product?.stripe_price_id || '',
    sort_order: product?.sort_order ?? 0,
    featured: product?.featured ?? false,
    is_hidden: product?.is_hidden ?? false,
    visible: product?.visible ?? true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">{product ? 'Edit Product' : 'New Product'}</h2>
          <button onClick={onClose} className="text-muted-foreground">
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
            Short Description
          </label>
          <input
            value={form.short_description}
            onChange={(e) => setForm({ ...form, short_description: e.target.value })}
            className="w-full border border-border rounded-lg p-2 mt-1"
          />
        </div>

        <div>
          <label className="text-xs font-bold uppercase text-muted-foreground">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full border border-border rounded-lg p-2 mt-1"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground">
              Base Price
            </label>
            <input
              value={form.base_price}
              onChange={(e) => setForm({ ...form, base_price: e.target.value })}
              className="w-full border border-border rounded-lg p-2 mt-1"
              placeholder="$26.00"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground">
              Sale Price
            </label>
            <input
              value={form.sale_price}
              onChange={(e) => setForm({ ...form, sale_price: e.target.value })}
              className="w-full border border-border rounded-lg p-2 mt-1"
              placeholder="$22.00"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground">
              Compare At
            </label>
            <input
              value={form.compare_at_price}
              onChange={(e) => setForm({ ...form, compare_at_price: e.target.value })}
              className="w-full border border-border rounded-lg p-2 mt-1"
              placeholder="$32.00"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground">Brand</label>
            <select
              value={form.brand_id}
              onChange={(e) => setForm({ ...form, brand_id: e.target.value })}
              className="w-full border border-border rounded-lg p-2 mt-1 bg-white"
            >
              <option value="">— No brand —</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground">Category</label>
            <input
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full border border-border rounded-lg p-2 mt-1"
              placeholder="Grooming / Treats / …"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground">
              Category (link)
            </label>
            <select
              value={form.category_id}
              onChange={(e) =>
                setForm({ ...form, category_id: e.target.value ? Number(e.target.value) : '' })
              }
              className="w-full border border-border rounded-lg p-2 mt-1 bg-white"
            >
              <option value="">— None —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground">Badge</label>
            <input
              value={form.badge}
              onChange={(e) => setForm({ ...form, badge: e.target.value })}
              className="w-full border border-border rounded-lg p-2 mt-1"
              placeholder="New / Sale"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground">
              Inventory Count
            </label>
            <input
              type="number"
              value={form.inventory_count}
              onChange={(e) =>
                setForm({ ...form, inventory_count: Number(e.target.value) })
              }
              className="w-full border border-border rounded-lg p-2 mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground">Stock</label>
            <input
              type="number"
              value={form.stock}
              onChange={(e) =>
                setForm({ ...form, stock: e.target.value ? Number(e.target.value) : '' })
              }
              className="w-full border border-border rounded-lg p-2 mt-1"
              placeholder="optional"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold uppercase text-muted-foreground">Image</label>
          {product?.image && (
            <img
              src={product.image}
              alt=""
              className="w-20 h-20 object-cover rounded mt-1 mb-2"
            />
          )}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            className="w-full border border-border rounded-lg p-2 mt-1"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground">Specs</label>
            <textarea
              value={form.specs}
              onChange={(e) => setForm({ ...form, specs: e.target.value })}
              rows={2}
              className="w-full border border-border rounded-lg p-2 mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground">Materials</label>
            <textarea
              value={form.materials}
              onChange={(e) => setForm({ ...form, materials: e.target.value })}
              rows={2}
              className="w-full border border-border rounded-lg p-2 mt-1"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground">
              Ingredients
            </label>
            <textarea
              value={form.ingredients}
              onChange={(e) => setForm({ ...form, ingredients: e.target.value })}
              rows={2}
              className="w-full border border-border rounded-lg p-2 mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground">Directions</label>
            <textarea
              value={form.directions}
              onChange={(e) => setForm({ ...form, directions: e.target.value })}
              rows={2}
              className="w-full border border-border rounded-lg p-2 mt-1"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground">Warranty</label>
            <input
              value={form.warranty}
              onChange={(e) => setForm({ ...form, warranty: e.target.value })}
              className="w-full border border-border rounded-lg p-2 mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground">
              Stripe Product ID
            </label>
            <input
              value={form.stripe_product_id}
              onChange={(e) => setForm({ ...form, stripe_product_id: e.target.value })}
              className="w-full border border-border rounded-lg p-2 mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground">
              Stripe Price ID
            </label>
            <input
              value={form.stripe_price_id}
              onChange={(e) => setForm({ ...form, stripe_price_id: e.target.value })}
              className="w-full border border-border rounded-lg p-2 mt-1"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground">Sort Order</label>
            <input
              type="number"
              value={form.sort_order}
              onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
              className="w-full border border-border rounded-lg p-2 mt-1"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => setForm({ ...form, featured: e.target.checked })}
            />
            Featured
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.visible}
              onChange={(e) => setForm({ ...form, visible: e.target.checked })}
            />
            Visible
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_hidden}
              onChange={(e) => setForm({ ...form, is_hidden: e.target.checked })}
            />
            Hidden (legacy)
          </label>
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <button
            onClick={() => onSave(form, imageFile)}
            className="px-6 py-2 bg-ink text-white rounded-lg text-sm font-semibold"
          >
            {product ? 'Save Changes' : 'Create Product'}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 border border-border rounded-lg text-sm font-semibold"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
