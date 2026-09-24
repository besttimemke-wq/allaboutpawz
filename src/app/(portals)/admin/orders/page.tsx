'use client';
/* eslint-disable */
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseKey && !supabaseUrl.startsWith('your-'))
  ? createClient(supabaseUrl, supabaseKey) : null;

type Order = {
  id: string; customer_email: string; total_amount: string; status: string;
  fulfillment_status: string; fulfillment_method: string | null;
  tracking_number: string | null; carrier: string | null;
  shipping_address: string | null; created_at: string;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ fulfillment_status: '', tracking_number: '', carrier: '' });

  useEffect(() => { loadOrders(); }, []);

  async function loadOrders() {
    if (!supabase) { setLoading(false); return; }
    const { data } = await supabase.from('commerce_orders').select('*').order('created_at', { ascending: false });
    if (data) setOrders(data);
    setLoading(false);
  }

  async function updateOrder(id: string) {
    if (!supabase) return;
    await supabase.from('commerce_orders').update({
      fulfillment_status: editForm.fulfillment_status,
      tracking_number: editForm.tracking_number,
      carrier: editForm.carrier,
    }).eq('id', id);
    setEditingId(null);
    loadOrders();
  }

  if (loading) return <div className="p-6">Loading orders...</div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
        <p className="text-sm text-muted-foreground mt-1">{orders.length} orders from commerce_orders</p>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-3 text-left">Order ID</th>
              <th className="p-3 text-left">Customer</th>
              <th className="p-3 text-left">Total</th>
              <th className="p-3 text-left">Payment</th>
              <th className="p-3 text-left">Fulfillment</th>
              <th className="p-3 text-left">Tracking</th>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id} className="border-t border-border hover:bg-muted/50">
                <td className="p-3 font-mono text-xs">{o.id.slice(0, 8)}</td>
                <td className="p-3">{o.customer_email || '—'}</td>
                <td className="p-3 font-semibold">{o.total_amount}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${o.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {o.status}
                  </span>
                </td>
                <td className="p-3">
                  {editingId === o.id ? (
                    <select value={editForm.fulfillment_status} onChange={e => setEditForm({ ...editForm, fulfillment_status: e.target.value })} className="border border-border rounded p-1 text-xs">
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  ) : (
                    <span className={`px-2 py-1 rounded text-xs ${o.fulfillment_status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-muted'}`}>
                      {o.fulfillment_status}
                    </span>
                  )}
                </td>
                <td className="p-3">
                  {editingId === o.id ? (
                    <div className="flex gap-1">
                      <input value={editForm.carrier} onChange={e => setEditForm({ ...editForm, carrier: e.target.value })} placeholder="UPS" className="border border-border rounded p-1 text-xs w-16" />
                      <input value={editForm.tracking_number} onChange={e => setEditForm({ ...editForm, tracking_number: e.target.value })} placeholder="1Z..." className="border border-border rounded p-1 text-xs w-32" />
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">{o.carrier ? `${o.carrier}: ${o.tracking_number}` : '—'}</span>
                  )}
                </td>
                <td className="p-3 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
                <td className="p-3">
                  {editingId === o.id ? (
                    <div className="flex gap-2">
                      <button onClick={() => updateOrder(o.id)} className="text-green-600 hover:underline text-xs">Save</button>
                      <button onClick={() => setEditingId(null)} className="text-muted-foreground text-xs">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditingId(o.id); setEditForm({ fulfillment_status: o.fulfillment_status || 'pending', tracking_number: o.tracking_number || '', carrier: o.carrier || '' }); }} className="text-blue-600 hover:underline text-xs">Edit</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
