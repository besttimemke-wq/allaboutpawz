'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Pencil, Trash2, Package } from 'lucide-react';
import type { DawgNavSection } from '@/lib/types';

type Vendor = {
  id: string;
  name: string;
  code: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  contactName: string | null;
  paymentTerms: string | null;
  active: boolean;
};

export default function VendorsPage() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [form, setForm] = useState({ name: '', code: '', email: '', phone: '', website: '', contactName: '', paymentTerms: 'NET 30' });

  const navigate = (s: DawgNavSection) => router.push(`/admin/${s === 'dashboard' ? 'dashboard' : s}`);

  useEffect(() => {
    // Fetch vendors from the DB via the admin products API (which has withPg)
    // For now, use a direct fetch to a simple endpoint
    fetch('/api/admin/orders')
      .then(() => {
        // Vendors don't have their own API yet — show empty state with the form
        setVendors([]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = vendors.filter(v => !search || v.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Package className="size-6" /> Vendors
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1">Manage supplier contacts and purchase order terms.</p>
        </div>
        <button onClick={() => { setEditing(null); setForm({ name: '', code: '', email: '', phone: '', website: '', contactName: '', paymentTerms: 'NET 30' }); setShowForm(true); }}
          className="px-4 py-2 bg-ink text-white rounded-lg text-[13px] font-semibold flex items-center gap-2 cursor-pointer">
          <Plus className="size-4" /> Add Vendor
        </button>
      </div>

      {loading ? (
        <div className="text-muted-foreground text-[13px]">Loading…</div>
      ) : vendors.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Package className="size-10 mx-auto text-muted-foreground/40" />
          <p className="text-[14px] font-medium text-foreground mt-3">No vendors yet</p>
          <p className="text-[13px] text-muted-foreground mt-1">Add a supplier to start creating purchase orders.</p>
          <button onClick={() => setShowForm(true)}
            className="mt-4 px-4 py-2 bg-ink text-white rounded-lg text-[13px] font-semibold cursor-pointer">
            Add Your First Vendor
          </button>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Name</th>
                <th className="p-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Contact</th>
                <th className="p-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Terms</th>
                <th className="p-3 text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(v => (
                <tr key={v.id} className="border-t border-border hover:bg-muted/50">
                  <td className="p-3 font-medium">{v.name}</td>
                  <td className="p-3 text-muted-foreground">{v.email || v.phone || '—'}</td>
                  <td className="p-3 text-muted-foreground">{v.paymentTerms || '—'}</td>
                  <td className="p-3 text-right">
                    <button onClick={() => { setEditing(v); setShowForm(true); }} className="text-primary hover:underline text-[11px] cursor-pointer">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/90 p-4">
          <div className="w-full max-w-md bg-card rounded-2xl border border-border p-6 space-y-4">
            <h3 className="text-[16px] font-semibold">{editing ? 'Edit Vendor' : 'Add Vendor'}</h3>
            <div className="space-y-3">
              <input type="text" placeholder="Vendor name" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                className="w-full border border-border rounded-lg px-3 py-2 text-[13px]" />
              <input type="text" placeholder="Code (e.g. PAWZBOT)" value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase()})}
                className="w-full border border-border rounded-lg px-3 py-2 text-[13px]" />
              <input type="email" placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                className="w-full border border-border rounded-lg px-3 py-2 text-[13px]" />
              <input type="text" placeholder="Phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                className="w-full border border-border rounded-lg px-3 py-2 text-[13px]" />
              <input type="text" placeholder="Contact name" value={form.contactName} onChange={e => setForm({...form, contactName: e.target.value})}
                className="w-full border border-border rounded-lg px-3 py-2 text-[13px]" />
              <select value={form.paymentTerms} onChange={e => setForm({...form, paymentTerms: e.target.value})}
                className="w-full border border-border rounded-lg px-3 py-2 text-[13px]">
                <option>NET 15</option><option>NET 30</option><option>NET 45</option><option>NET 60</option><option>PAID</option><option>COD</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-border rounded-lg text-[13px] font-semibold hover:bg-muted cursor-pointer">Cancel</button>
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 bg-ink text-white rounded-lg text-[13px] font-semibold cursor-pointer">Save Vendor</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
