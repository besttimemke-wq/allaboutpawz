'use client';
/* eslint-disable */
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseKey && !supabaseUrl.startsWith('your-'))
  ? createClient(supabaseUrl, supabaseKey) : null;

type Category = { id: string; parent_id: string | null; name: string; slug: string; source_url: string | null };

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', parent_id: '' });

  useEffect(() => { loadCategories(); /* eslint-disable-next-line */ }, []);

  async function loadCategories() {
    if (!supabase) { setLoading(false); return; }
    const { data } = await supabase.from('pet_product_categories').select('*').order('name');
    if (data) setCategories(data);
    setLoading(false);
  }

  async function saveCategory() {
    if (!supabase) return;
    const payload = { name: form.name, slug: form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), parent_id: form.parent_id || null };
    if (editCat) {
      await supabase.from('pet_product_categories').update(payload).eq('id', editCat.id);
    } else {
      await supabase.from('pet_product_categories').insert({ id: crypto.randomUUID(), ...payload });
    }
    setShowForm(false); setEditCat(null); setForm({ name: '', slug: '', parent_id: '' });
    loadCategories();
  }

  async function deleteCategory(c: Category) {
    if (!supabase || !confirm(`Delete ${c.name}?`)) return;
    await supabase.from('pet_product_categories').delete().eq('id', c.id);
    loadCategories();
  }

  // Build tree
  const roots = categories.filter(c => !c.parent_id);
  const childrenOf = (id: string) => categories.filter(c => c.parent_id === id);

  function renderTree(cats: Category[], depth: number = 0): React.ReactNode {
    return cats.map(c => (
      <div key={c.id}>
        <div className="flex items-center gap-3 py-2" style={{ paddingLeft: depth * 20 }}>
          <span className="text-sm font-medium">{c.name}</span>
          <span className="text-xs text-muted-foreground">/{c.slug}</span>
          <button onClick={() => { setEditCat(c); setForm({ name: c.name, slug: c.slug, parent_id: c.parent_id || '' }); setShowForm(true); }} className="text-blue-600 text-xs hover:underline">Edit</button>
          <button onClick={() => deleteCategory(c)} className="text-red-600 text-xs hover:underline">Delete</button>
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
          <p className="text-sm text-muted-foreground mt-1">{categories.length} categories in pet_product_categories</p>
        </div>
        <button onClick={() => { setEditCat(null); setForm({ name: '', slug: '', parent_id: '' }); setShowForm(true); }} className="px-4 py-2 bg-ink text-white rounded-lg text-sm font-semibold">+ Add Category</button>
      </div>

      <div className="border border-border rounded-lg p-4">
        {renderTree(roots)}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">{editCat ? 'Edit Category' : 'New Category'}</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground">✕</button>
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-muted-foreground">Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border border-border rounded-lg p-2 mt-1" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-muted-foreground">Slug</label>
              <input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} className="w-full border border-border rounded-lg p-2 mt-1" placeholder="auto-generated" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-muted-foreground">Parent Category</label>
              <select value={form.parent_id} onChange={e => setForm({ ...form, parent_id: e.target.value })} className="w-full border border-border rounded-lg p-2 mt-1">
                <option value="">None (Top Level)</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-4 border-t">
              <button onClick={saveCategory} className="px-6 py-2 bg-ink text-white rounded-lg text-sm font-semibold">{editCat ? 'Save' : 'Create'}</button>
              <button onClick={() => setShowForm(false)} className="px-6 py-2 border border-border rounded-lg text-sm font-semibold">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
