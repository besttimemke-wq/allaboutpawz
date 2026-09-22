'use client';
/* eslint-disable */
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseKey && !supabaseUrl.startsWith('your-')) 
  ? createClient(supabaseUrl, supabaseKey) : null;

type Product = {
  id: string; name: string; slug: string; description: string;
  short_description: string | null; base_price: string; sale_price: string | null;
  compare_at_price: string | null; image: string | null; alt: string | null;
  badge: string | null; category: string | null; featured: boolean;
  is_hidden: boolean; inventory_count: number; specs: string | null;
  materials: string | null; ingredients: string | null; directions: string | null;
  warranty: string | null; stripe_price_id: string | null; stripe_product_id: string | null;
  sort_order: number;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function loadProducts() {
    if (!supabase) { setLoading(false); return; }
    const { data, error } = await supabase
      .from('commerce_products')
      .select('*')
      .order('sort_order', { ascending: true });
    if (!error && data) setProducts(data);
    setLoading(false);
  }

  useEffect(() => {
    loadProducts();
  }, []);


  async function toggleHidden(p: Product) {
    if (!supabase) return;
    await supabase.from('commerce_products').update({ is_hidden: !p.is_hidden }).eq('id', p.id);
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, is_hidden: !x.is_hidden } : x));
  }

  async function toggleFeatured(p: Product) {
    if (!supabase) return;
    await supabase.from('commerce_products').update({ featured: !p.featured }).eq('id', p.id);
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, featured: !x.featured } : x));
  }

  async function deleteProduct(p: Product) {
    if (!supabase || !confirm(`Delete ${p.name}?`)) return;
    await supabase.from('commerce_products').delete().eq('id', p.id);
    setProducts(prev => prev.filter(x => x.id !== p.id));
  }

  async function uploadImage(file: File): Promise<string | null> {
    if (!supabase) return null;
    const fileName = `products/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('cms-media').upload(fileName, file);
    if (error) { console.error('Upload error:', error.message); return null; }
    return `${supabaseUrl}/storage/v1/object/public/cms-media/${fileName}`;
  }

  async function saveProduct(data: Partial<Product>, imageFile: File | null) {
    if (!supabase) return;
    let imageUrl = data.image;
    if (imageFile) {
      imageUrl = await uploadImage(imageFile);
    }
    const payload = { ...data, image: imageUrl };
    if (editing) {
      await supabase.from('commerce_products').update(payload).eq('id', editing.id);
    } else {
      payload.id = crypto.randomUUID();
      payload.slug = payload.slug || (payload.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      await supabase.from('commerce_products').insert(payload);
    }
    setShowForm(false);
    setEditing(null);
    loadProducts();
  }

  if (loading) return <div className="p-6">Loading products...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground mt-1">{products.length} products in commerce_products</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="px-4 py-2 bg-ink text-white rounded-lg text-sm font-semibold"
        >
          + Add Product
        </button>
      </div>

      {/* Product table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-3 text-left">Image</th>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Price</th>
              <th className="p-3 text-left">Stock</th>
              <th className="p-3 text-left">Category</th>
              <th className="p-3 text-left">Visible</th>
              <th className="p-3 text-left">Featured</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id} className="border-t border-border hover:bg-muted/50">
                <td className="p-3">
                  {p.image ? <img src={p.image} alt={p.alt || p.name} className="w-12 h-12 object-cover rounded" /> : <div className="w-12 h-12 bg-muted rounded" />}
                </td>
                <td className="p-3 font-medium">{p.name}</td>
                <td className="p-3">{p.base_price}{p.compare_at_price ? <span className="text-muted-foreground line-through ml-1">{p.compare_at_price}</span> : null}</td>
                <td className="p-3">{p.inventory_count}</td>
                <td className="p-3">{p.category || '—'}</td>
                <td className="p-3">
                  <button onClick={() => toggleHidden(p)} className={`px-2 py-1 rounded text-xs font-semibold ${p.is_hidden ? 'bg-muted text-muted-foreground' : 'bg-green-100 text-green-700'}`}>
                    {p.is_hidden ? 'Hidden' : 'Visible'}
                  </button>
                </td>
                <td className="p-3">
                  <button onClick={() => toggleFeatured(p)} className={`px-2 py-1 rounded text-xs ${p.featured ? 'bg-amber-100 text-amber-700' : 'bg-muted text-muted-foreground'}`}>
                    {p.featured ? '★' : '☆'}
                  </button>
                </td>
                <td className="p-3 flex gap-2">
                  <button onClick={() => { setEditing(p); setShowForm(true); }} className="text-blue-600 hover:underline text-xs">Edit</button>
                  <button onClick={() => deleteProduct(p)} className="text-red-600 hover:underline text-xs">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Product form */}
      {showForm && (
        <ProductForm
          product={editing}
          onSave={saveProduct}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

function ProductForm({ product, onSave, onClose }: { product: Product | null; onSave: (data: any, imageFile: File | null) => void; onClose: () => void }) {
  const [form, setForm] = useState({
    name: product?.name || '',
    slug: product?.slug || '',
    description: product?.description || '',
    short_description: product?.short_description || '',
    base_price: product?.base_price || '$0.00',
    compare_at_price: product?.compare_at_price || '',
    badge: product?.badge || '',
    category: product?.category || '',
    inventory_count: product?.inventory_count ?? 0,
    specs: product?.specs || '',
    materials: product?.materials || '',
    ingredients: product?.ingredients || '',
    directions: product?.directions || '',
    warranty: product?.warranty || '',
    stripe_price_id: product?.stripe_price_id || '',
    stripe_product_id: product?.stripe_product_id || '',
    sort_order: product?.sort_order ?? 0,
    featured: product?.featured ?? false,
    is_hidden: product?.is_hidden ?? false,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">{product ? 'Edit Product' : 'New Product'}</h2>
          <button onClick={onClose} className="text-muted-foreground">✕</button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground">Name</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border border-border rounded-lg p-2 mt-1" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground">Slug</label>
            <input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} className="w-full border border-border rounded-lg p-2 mt-1" placeholder="auto-generated" />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold uppercase text-muted-foreground">Short Description</label>
          <input value={form.short_description} onChange={e => setForm({ ...form, short_description: e.target.value })} className="w-full border border-border rounded-lg p-2 mt-1" />
        </div>

        <div>
          <label className="text-xs font-bold uppercase text-muted-foreground">Description</label>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="w-full border border-border rounded-lg p-2 mt-1" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground">Price</label>
            <input value={form.base_price} onChange={e => setForm({ ...form, base_price: e.target.value })} className="w-full border border-border rounded-lg p-2 mt-1" placeholder="$26.00" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground">Compare At (Sale)</label>
            <input value={form.compare_at_price} onChange={e => setForm({ ...form, compare_at_price: e.target.value })} className="w-full border border-border rounded-lg p-2 mt-1" placeholder="$32.00" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground">Stock</label>
            <input type="number" value={form.inventory_count} onChange={e => setForm({ ...form, inventory_count: Number(e.target.value) })} className="w-full border border-border rounded-lg p-2 mt-1" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground">Category</label>
            <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full border border-border rounded-lg p-2 mt-1" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground">Badge</label>
            <input value={form.badge} onChange={e => setForm({ ...form, badge: e.target.value })} className="w-full border border-border rounded-lg p-2 mt-1" placeholder="New / Sale" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground">Sort Order</label>
            <input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })} className="w-full border border-border rounded-lg p-2 mt-1" />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold uppercase text-muted-foreground">Image</label>
          {product?.image && <img src={product.image} alt="" className="w-20 h-20 object-cover rounded mt-1 mb-2" />}
          <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} className="w-full border border-border rounded-lg p-2 mt-1" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground">Specs</label>
            <textarea value={form.specs} onChange={e => setForm({ ...form, specs: e.target.value })} rows={2} className="w-full border border-border rounded-lg p-2 mt-1" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground">Materials</label>
            <textarea value={form.materials} onChange={e => setForm({ ...form, materials: e.target.value })} rows={2} className="w-full border border-border rounded-lg p-2 mt-1" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground">Ingredients</label>
            <textarea value={form.ingredients} onChange={e => setForm({ ...form, ingredients: e.target.value })} rows={2} className="w-full border border-border rounded-lg p-2 mt-1" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground">Directions</label>
            <textarea value={form.directions} onChange={e => setForm({ ...form, directions: e.target.value })} rows={2} className="w-full border border-border rounded-lg p-2 mt-1" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground">Warranty</label>
            <input value={form.warranty} onChange={e => setForm({ ...form, warranty: e.target.value })} className="w-full border border-border rounded-lg p-2 mt-1" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground">Stripe Price ID</label>
            <input value={form.stripe_price_id} onChange={e => setForm({ ...form, stripe_price_id: e.target.value })} className="w-full border border-border rounded-lg p-2 mt-1" />
          </div>
        </div>

        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.featured} onChange={e => setForm({ ...form, featured: e.target.checked })} />
            Featured
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_hidden} onChange={e => setForm({ ...form, is_hidden: e.target.checked })} />
            Hidden
          </label>
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <button onClick={() => onSave(form, imageFile)} className="px-6 py-2 bg-ink text-white rounded-lg text-sm font-semibold">
            {product ? 'Save Changes' : 'Create Product'}
          </button>
          <button onClick={onClose} className="px-6 py-2 border border-border rounded-lg text-sm font-semibold">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
