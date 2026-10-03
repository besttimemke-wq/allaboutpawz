'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Ticket,
  Percent,
  Loader2,
  Copy,
  Check,
} from 'lucide-react';

// ============================================================================
// Admin → Promotions
//
// Manages commerce_promotions + commerce_coupons via the admin-gated REST
// endpoints in /api/admin/promotions and /api/admin/coupons. Matches the
// visual style of the existing admin pages: bg-ink text-white primary
// buttons, border-border / bg-muted surfaces, text-2xl font-semibold
// tracking-tight page title. NO indigo or blue.
// ============================================================================

type Promotion = {
  id: string;
  code: string;
  name: string;
  promotionType: string;
  value: number | null;
  minimumSubtotal: number | null;
  maximumDiscount: number | null;
  startAt: string | null;
  endAt: string | null;
  usageLimit: number | null;
  usageCount: number;
  active: boolean;
  couponCount: number;
};

type Coupon = {
  id: string;
  promotionId: string | null;
  code: string;
  usageLimit: number | null;
  usageCount: number;
  status: string;
  validFrom: string | null;
  validTo: string | null;
  promotion: {
    id: string;
    name: string;
    code: string;
    promotionType: string;
    value: number | null;
  } | null;
};

type PromoFormState = {
  code: string;
  name: string;
  promotion_type: string;
  value: string;
  minimum_subtotal: string;
  maximum_discount: string;
  start_at: string;
  end_at: string;
  usage_limit: string;
  active: boolean;
};

const EMPTY_PROMO_FORM: PromoFormState = {
  code: '',
  name: '',
  promotion_type: 'percent_off',
  value: '',
  minimum_subtotal: '',
  maximum_discount: '',
  start_at: '',
  end_at: '',
  usage_limit: '',
  active: true,
};

type CouponFormState = {
  code: string;
  promotion_id: string;
  usage_limit: string;
  valid_from: string;
  valid_to: string;
  status: string;
};

const EMPTY_COUPON_FORM: CouponFormState = {
  code: '',
  promotion_id: '',
  usage_limit: '',
  valid_from: '',
  valid_to: '',
  status: 'active',
};

const PROMO_TYPES: { value: string; label: string }[] = [
  { value: 'percent_off', label: 'Percent Off' },
  { value: 'amount_off', label: 'Amount Off' },
  { value: 'bogo', label: 'Buy One Get One' },
];

const COUPON_STATUSES = ['active', 'disabled', 'expired'];

function fmtValue(promo: Promotion): string {
  if (promo.value == null) return '—';
  if (promo.promotionType === 'percent_off') return `${promo.value}%`;
  if (promo.promotionType === 'amount_off') return `$${Number(promo.value).toFixed(2)}`;
  if (promo.promotionType === 'bogo') return 'BOGO';
  return String(promo.value);
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

function toDateInput(iso: string | null): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    // YYYY-MM-DD for <input type="date">
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return '';
  }
}

function promoTypeLabel(t: string): string {
  return PROMO_TYPES.find((p) => p.value === t)?.label || t;
}

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPromoId, setSelectedPromoId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Promo form
  const [showPromoForm, setShowPromoForm] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [promoForm, setPromoForm] = useState<PromoFormState>(EMPTY_PROMO_FORM);

  // Coupon form
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [couponForm, setCouponForm] = useState<CouponFormState>(EMPTY_COUPON_FORM);

  const loadPromotions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/promotions', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        const list: Promotion[] = Array.isArray(json.promotions) ? json.promotions : [];
        setPromotions(list);
        // Auto-select the first promotion if none selected.
        if (list.length > 0 && !selectedPromoId) {
          setSelectedPromoId(list[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to load promotions', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCoupons = useCallback(async () => {
    try {
      const url = selectedPromoId
        ? `/api/admin/coupons?promotionId=${encodeURIComponent(selectedPromoId)}`
        : '/api/admin/coupons';
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setCoupons(Array.isArray(json.coupons) ? json.coupons : []);
      } else {
        setCoupons([]);
      }
    } catch (e) {
      console.error('Failed to load coupons', e);
      setCoupons([]);
    }
  }, [selectedPromoId]);

  useEffect(() => {
    loadPromotions();
  }, [loadPromotions]);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  // ---- Promotion handlers ----------------------------------------------

  function openNewPromo() {
    setEditingPromo(null);
    setPromoForm(EMPTY_PROMO_FORM);
    setShowPromoForm(true);
  }

  function openEditPromo(p: Promotion) {
    setEditingPromo(p);
    setPromoForm({
      code: p.code || '',
      name: p.name || '',
      promotion_type: p.promotionType || 'percent_off',
      value: p.value != null ? String(p.value) : '',
      minimum_subtotal: p.minimumSubtotal != null ? String(p.minimumSubtotal) : '',
      maximum_discount: p.maximumDiscount != null ? String(p.maximumDiscount) : '',
      start_at: toDateInput(p.startAt),
      end_at: toDateInput(p.endAt),
      usage_limit: p.usageLimit != null ? String(p.usageLimit) : '',
      active: p.active !== false,
    });
    setShowPromoForm(true);
  }

  async function savePromo() {
    if (!promoForm.code.trim() || !promoForm.name.trim()) {
      flash('Code and name are required.');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        code: promoForm.code.trim(),
        name: promoForm.name.trim(),
        promotion_type: promoForm.promotion_type,
        value: promoForm.value === '' ? null : Number(promoForm.value),
        minimum_subtotal:
          promoForm.minimum_subtotal === '' ? null : Number(promoForm.minimum_subtotal),
        maximum_discount:
          promoForm.maximum_discount === '' ? null : Number(promoForm.maximum_discount),
        start_at: promoForm.start_at || null,
        end_at: promoForm.end_at || null,
        usage_limit: promoForm.usage_limit === '' ? null : Number(promoForm.usage_limit),
        active: promoForm.active,
      };

      if (editingPromo) {
        const res = await fetch(`/api/admin/promotions/${editingPromo.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          flash(`Save failed: ${e.error || res.statusText}`);
          return;
        }
        flash('Promotion saved');
      } else {
        const res = await fetch('/api/admin/promotions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          flash(`Create failed: ${e.error || res.statusText}`);
          return;
        }
        flash('Promotion created');
      }
      setShowPromoForm(false);
      setEditingPromo(null);
      setPromoForm(EMPTY_PROMO_FORM);
      await loadPromotions();
    } finally {
      setBusy(false);
    }
  }

  async function togglePromoActive(p: Promotion) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/promotions/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !p.active }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        flash(`Update failed: ${e.error || res.statusText}`);
        return;
      }
      setPromotions((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, active: !x.active } : x)),
      );
    } finally {
      setBusy(false);
    }
  }

  async function deletePromo(p: Promotion) {
    if (!confirm(`Delete promotion "${p.name}"? Its coupons will be detached.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/promotions/${p.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        flash(`Delete failed: ${e.error || res.statusText}`);
        return;
      }
      flash('Promotion deleted');
      if (selectedPromoId === p.id) setSelectedPromoId(null);
      await loadPromotions();
    } finally {
      setBusy(false);
    }
  }

  // ---- Coupon handlers -------------------------------------------------

  function openNewCoupon() {
    setEditingCoupon(null);
    setCouponForm({
      ...EMPTY_COUPON_FORM,
      promotion_id: selectedPromoId || '',
    });
    setShowCouponForm(true);
  }

  function openEditCoupon(c: Coupon) {
    setEditingCoupon(c);
    setCouponForm({
      code: c.code || '',
      promotion_id: c.promotionId || '',
      usage_limit: c.usageLimit != null ? String(c.usageLimit) : '',
      valid_from: toDateInput(c.validFrom),
      valid_to: toDateInput(c.validTo),
      status: c.status || 'active',
    });
    setShowCouponForm(true);
  }

  async function saveCoupon() {
    if (!couponForm.code.trim()) {
      flash('Coupon code is required.');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        code: couponForm.code.trim(),
        promotion_id: couponForm.promotion_id || null,
        usage_limit: couponForm.usage_limit === '' ? null : Number(couponForm.usage_limit),
        valid_from: couponForm.valid_from || null,
        valid_to: couponForm.valid_to || null,
        status: couponForm.status,
      };

      if (editingCoupon) {
        const res = await fetch(`/api/admin/coupons/${editingCoupon.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          flash(`Save failed: ${e.error || res.statusText}`);
          return;
        }
        flash('Coupon saved');
      } else {
        const res = await fetch('/api/admin/coupons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          flash(`Create failed: ${e.error || res.statusText}`);
          return;
        }
        flash('Coupon created');
      }
      setShowCouponForm(false);
      setEditingCoupon(null);
      setCouponForm(EMPTY_COUPON_FORM);
      await Promise.all([loadPromotions(), loadCoupons()]);
    } finally {
      setBusy(false);
    }
  }

  async function deleteCoupon(c: Coupon) {
    if (!confirm(`Delete coupon ${c.code}?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/coupons/${c.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        flash(`Delete failed: ${e.error || res.statusText}`);
        return;
      }
      flash('Coupon deleted');
      await Promise.all([loadPromotions(), loadCoupons()]);
    } finally {
      setBusy(false);
    }
  }

  // ----------------------------------------------------------------------

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading promotions...
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Promotions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {promotions.length} promotions · {coupons.length} coupons in current view
          </p>
        </div>
        <button
          onClick={openNewPromo}
          className="inline-flex items-center gap-2 px-4 py-2 bg-ink text-white rounded-lg text-sm font-semibold hover:bg-ink/90 transition-colors"
        >
          <Plus className="size-4" />
          Add Promotion
        </button>
      </div>

      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-ink text-white px-4 py-2 rounded-lg shadow-lg text-sm">
          {toast}
        </div>
      )}

      {/* Promotions Table */}
      <div className="border border-border rounded-lg overflow-hidden overflow-x-auto bg-white">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="p-3 text-left font-semibold">Code</th>
              <th className="p-3 text-left font-semibold">Name</th>
              <th className="p-3 text-left font-semibold">Type</th>
              <th className="p-3 text-left font-semibold">Value</th>
              <th className="p-3 text-left font-semibold">Active</th>
              <th className="p-3 text-left font-semibold">Usage</th>
              <th className="p-3 text-left font-semibold">Date Range</th>
              <th className="p-3 text-left font-semibold">Coupons</th>
              <th className="p-3 text-left font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {promotions.map((p) => (
              <tr
                key={p.id}
                className={`border-t border-border hover:bg-muted/50 ${
                  selectedPromoId === p.id ? 'bg-muted/40' : ''
                }`}
              >
                <td className="p-3">
                  <button
                    onClick={() => setSelectedPromoId(p.id)}
                    className="font-mono font-semibold text-foreground hover:underline"
                  >
                    {p.code}
                  </button>
                </td>
                <td className="p-3 font-medium">{p.name}</td>
                <td className="p-3">
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {p.promotionType === 'percent_off' && <Percent className="size-3" />}
                    {p.promotionType === 'bogo' && <Ticket className="size-3" />}
                    {promoTypeLabel(p.promotionType)}
                  </span>
                </td>
                <td className="p-3 text-muted-foreground">{fmtValue(p)}</td>
                <td className="p-3">
                  <button
                    onClick={() => togglePromoActive(p)}
                    disabled={busy}
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      p.active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {p.active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="p-3 text-muted-foreground">
                  {p.usageCount}
                  {p.usageLimit != null ? ` / ${p.usageLimit}` : ''}
                </td>
                <td className="p-3 text-muted-foreground whitespace-nowrap">
                  {fmtDate(p.startAt)} → {fmtDate(p.endAt)}
                </td>
                <td className="p-3">
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Ticket className="size-3" />
                    {p.couponCount}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditPromo(p)}
                      disabled={busy}
                      className="text-foreground hover:underline text-xs inline-flex items-center gap-1"
                    >
                      <Pencil className="size-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => deletePromo(p)}
                      disabled={busy}
                      className="text-red-600 hover:underline text-xs inline-flex items-center gap-1"
                    >
                      <Trash2 className="size-3" />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {promotions.length === 0 && (
              <tr>
                <td colSpan={9} className="p-6 text-center text-muted-foreground">
                  No promotions yet. Click <span className="font-semibold">+ Add Promotion</span>{' '}
                  to create your first.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Coupons Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
              <Ticket className="size-4 text-muted-foreground" />
              Coupons
              {selectedPromoId && (
                <span className="text-xs text-muted-foreground font-normal">
                  · filtered by{' '}
                  <span className="font-mono font-semibold">
                    {promotions.find((p) => p.id === selectedPromoId)?.code || '—'}
                  </span>
                </span>
              )}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedPromoId
                ? 'Click a promotion code above to filter, or “All Coupons” to clear.'
                : 'Showing all coupons across every promotion.'}
            </p>
          </div>
          <div className="flex gap-2">
            {selectedPromoId && (
              <button
                onClick={() => setSelectedPromoId(null)}
                className="px-3 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
              >
                All Coupons
              </button>
            )}
            <button
              onClick={openNewCoupon}
              className="inline-flex items-center gap-2 px-4 py-2 bg-ink text-white rounded-lg text-sm font-semibold hover:bg-ink/90 transition-colors"
            >
              <Plus className="size-4" />
              Add Coupon
            </button>
          </div>
        </div>

        <div className="border border-border rounded-lg overflow-hidden overflow-x-auto bg-white">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="p-3 text-left font-semibold">Code</th>
                <th className="p-3 text-left font-semibold">Promotion</th>
                <th className="p-3 text-left font-semibold">Status</th>
                <th className="p-3 text-left font-semibold">Usage</th>
                <th className="p-3 text-left font-semibold">Valid</th>
                <th className="p-3 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-muted/50">
                  <td className="p-3 font-mono font-semibold">{c.code}</td>
                  <td className="p-3 text-muted-foreground">
                    {c.promotion ? (
                      <span>
                        <span className="font-mono text-foreground">{c.promotion.code}</span>
                        <span className="ml-1 text-xs">({c.promotion.name})</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground/60">— stand-alone —</span>
                    )}
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${
                        c.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {c.usageCount}
                    {c.usageLimit != null ? ` / ${c.usageLimit}` : ''}
                  </td>
                  <td className="p-3 text-muted-foreground whitespace-nowrap">
                    {fmtDate(c.validFrom)} → {fmtDate(c.validTo)}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditCoupon(c)}
                        disabled={busy}
                        className="text-foreground hover:underline text-xs inline-flex items-center gap-1"
                      >
                        <Pencil className="size-3" />
                        Edit
                      </button>
                      <button
                        onClick={() => deleteCoupon(c)}
                        disabled={busy}
                        className="text-red-600 hover:underline text-xs inline-flex items-center gap-1"
                      >
                        <Trash2 className="size-3" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {coupons.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    No coupons yet. Click <span className="font-semibold">+ Add Coupon</span> to
                    create your first.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Promotion Form Modal */}
      {showPromoForm && (
        <PromotionForm
          form={promoForm}
          setForm={setPromoForm}
          editing={editingPromo}
          busy={busy}
          onSave={savePromo}
          onClose={() => {
            setShowPromoForm(false);
            setEditingPromo(null);
            setPromoForm(EMPTY_PROMO_FORM);
          }}
        />
      )}

      {/* Coupon Form Modal */}
      {showCouponForm && (
        <CouponForm
          form={couponForm}
          setForm={setCouponForm}
          editing={editingCoupon}
          promotions={promotions}
          busy={busy}
          onSave={saveCoupon}
          onClose={() => {
            setShowCouponForm(false);
            setEditingCoupon(null);
            setCouponForm(EMPTY_COUPON_FORM);
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// PromotionForm — modal form for create/edit
// ============================================================================

function PromotionForm({
  form,
  setForm,
  editing,
  busy,
  onSave,
  onClose,
}: {
  form: PromoFormState;
  setForm: (f: PromoFormState) => void;
  editing: Promotion | null;
  busy: boolean;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {editing ? 'Edit Promotion' : 'New Promotion'}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground">Code</label>
            <input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              className="w-full border border-border rounded-lg p-2 mt-1 font-mono"
              placeholder="SUMMER25"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-border rounded-lg p-2 mt-1"
              placeholder="Summer 25% Off"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground">Type</label>
            <select
              value={form.promotion_type}
              onChange={(e) => setForm({ ...form, promotion_type: e.target.value })}
              className="w-full border border-border rounded-lg p-2 mt-1 bg-white"
            >
              {PROMO_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground">
              Value {form.promotion_type === 'percent_off' ? '(%)' : '($)'}
            </label>
            <input
              type="number"
              step="0.01"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              className="w-full border border-border rounded-lg p-2 mt-1"
              placeholder={form.promotion_type === 'percent_off' ? '25' : '10.00'}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground">
              Minimum Subtotal ($)
            </label>
            <input
              type="number"
              step="0.01"
              value={form.minimum_subtotal}
              onChange={(e) => setForm({ ...form, minimum_subtotal: e.target.value })}
              className="w-full border border-border rounded-lg p-2 mt-1"
              placeholder="optional"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground">
              Maximum Discount ($)
            </label>
            <input
              type="number"
              step="0.01"
              value={form.maximum_discount}
              onChange={(e) => setForm({ ...form, maximum_discount: e.target.value })}
              className="w-full border border-border rounded-lg p-2 mt-1"
              placeholder="optional"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground">
              Start Date
            </label>
            <input
              type="date"
              value={form.start_at}
              onChange={(e) => setForm({ ...form, start_at: e.target.value })}
              className="w-full border border-border rounded-lg p-2 mt-1 bg-white"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground">
              End Date
            </label>
            <input
              type="date"
              value={form.end_at}
              onChange={(e) => setForm({ ...form, end_at: e.target.value })}
              className="w-full border border-border rounded-lg p-2 mt-1 bg-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground">
              Usage Limit
            </label>
            <input
              type="number"
              value={form.usage_limit}
              onChange={(e) => setForm({ ...form, usage_limit: e.target.value })}
              className="w-full border border-border rounded-lg p-2 mt-1"
              placeholder="optional"
            />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              Active
            </label>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-border">
          <button
            onClick={onSave}
            disabled={busy}
            className="px-6 py-2 bg-ink text-white rounded-lg text-sm font-semibold hover:bg-ink/90 disabled:opacity-50"
          >
            {editing ? 'Save Changes' : 'Create Promotion'}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 border border-border rounded-lg text-sm font-semibold hover:bg-muted"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CouponForm — modal form for create/edit
// ============================================================================

function CouponForm({
  form,
  setForm,
  editing,
  promotions,
  busy,
  onSave,
  onClose,
}: {
  form: CouponFormState;
  setForm: (f: CouponFormState) => void;
  editing: Coupon | null;
  promotions: Promotion[];
  busy: boolean;
  onSave: () => void;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function generateCode() {
    const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
    const code = `PAWZ-${rand}`;
    setForm({ ...form, code });
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">{editing ? 'Edit Coupon' : 'New Coupon'}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            ✕
          </button>
        </div>

        <div>
          <label className="text-xs font-bold uppercase text-muted-foreground">Code</label>
          <div className="flex gap-2 mt-1">
            <input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              className="flex-1 border border-border rounded-lg p-2 font-mono"
              placeholder="SUMMER25"
            />
            <button
              type="button"
              onClick={generateCode}
              className="px-3 py-2 border border-border rounded-lg text-xs font-semibold hover:bg-muted inline-flex items-center gap-1"
            >
              {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
              Generate
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold uppercase text-muted-foreground">
            Promotion (optional)
          </label>
          <select
            value={form.promotion_id}
            onChange={(e) => setForm({ ...form, promotion_id: e.target.value })}
            className="w-full border border-border rounded-lg p-2 mt-1 bg-white"
          >
            <option value="">— Stand-alone coupon —</option>
            {promotions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} — {p.name}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-muted-foreground mt-1">
            A coupon without a promotion is valid but applies no automatic discount.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground">
              Valid From
            </label>
            <input
              type="date"
              value={form.valid_from}
              onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
              className="w-full border border-border rounded-lg p-2 mt-1 bg-white"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground">Valid To</label>
            <input
              type="date"
              value={form.valid_to}
              onChange={(e) => setForm({ ...form, valid_to: e.target.value })}
              className="w-full border border-border rounded-lg p-2 mt-1 bg-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground">
              Usage Limit
            </label>
            <input
              type="number"
              value={form.usage_limit}
              onChange={(e) => setForm({ ...form, usage_limit: e.target.value })}
              className="w-full border border-border rounded-lg p-2 mt-1"
              placeholder="optional"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full border border-border rounded-lg p-2 mt-1 bg-white"
            >
              {COUPON_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-border">
          <button
            onClick={onSave}
            disabled={busy}
            className="px-6 py-2 bg-ink text-white rounded-lg text-sm font-semibold hover:bg-ink/90 disabled:opacity-50"
          >
            {editing ? 'Save Changes' : 'Create Coupon'}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 border border-border rounded-lg text-sm font-semibold hover:bg-muted"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
