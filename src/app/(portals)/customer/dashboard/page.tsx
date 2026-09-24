'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  PawPrint,
  CreditCard,
  Clock,
  ShoppingBag,
  Package,
  Truck,
  CircleDollarSign,
  ArrowRight,
  AlertCircle,
  MapPin,
  User,
  Pencil,
  Trash2,
  Plus,
  CheckCircle2,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// ============================================================================
// Customer Dashboard — wired to /api/customer/orders + /api/customer/account
// + /api/customer/addresses.
//
// KPIs are computed from the real order history (Total Spent across paid
// orders, Order count, In-transit count, Latest order status). The Appointments
// and Pets sections still read the persisted mock store (out of scope for this
// wiring — those APIs land separately). A friendly empty state shows when no
// orders exist yet; a 401 surfaces a "Sign in" CTA back to /access-customer.
//
// Below the existing tiles, the Account Overview card shows the signed-in
// customer's crm_customers profile + commerce_customer_accounts row (tax
// status, credit limit). The Saved Addresses card lists commerce_customer_addresses
// with add / edit / delete actions (the customer must always keep at least one).
// ============================================================================

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: string;
}

interface CustomerOrder {
  id: string;
  status: string;
  paymentStatus: string;
  subtotal: string;
  totalAmount?: string | null;
  fulfillmentStatus?: string | null;
  deliveryMethod: string;
  shippingAddress: string;
  trackingNumber: string;
  carrier: string;
  trackingStatus?: string;
  notes: string;
  placedAt: string | null;
  items: OrderItem[];
}

interface CustomerProfile {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  mobilePhone: string | null;
}

interface CustomerAccount {
  id: string;
  customerId: string;
  taxExempt: boolean;
  taxExemptionNumber: string | null;
  creditLimit: string;
  active: boolean;
}

interface CustomerAddress {
  id: string;
  addressType: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postalCode: string | null;
  countryCode: string;
  phone: string | null;
  isDefault: boolean;
}

type AddressForm = {
  addressType: string;
  firstName: string;
  lastName: string;
  company: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
  phone: string;
  isDefault: boolean;
};

const EMPTY_ADDRESS_FORM: AddressForm = {
  addressType: 'shipping',
  firstName: '',
  lastName: '',
  company: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  countryCode: 'US',
  phone: '',
  isDefault: false,
};

const USD = (s: string | null | undefined): number => {
  if (!s) return 0;
  const n = parseFloat(String(s).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

const fmtUSD = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const fmtDate = (iso: string | null) => {
  if (!iso) return 'Date pending';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Date pending';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// Carrier-aware tracking URL. USPS gets the canonical TrackConfirm deep link;
// UPS/FedEx get their public tracking pages; unknown carriers fall back to
// null (the UI shows the number as plain text).
function trackingUrl(carrier: string, num: string): string | null {
  if (!num) return null;
  const c = (carrier || '').trim().toLowerCase();
  if (c === 'usps' || c.includes('postal')) {
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(num)}`;
  }
  if (c === 'ups') return `https://www.ups.com/track?tracknum=${encodeURIComponent(num)}`;
  if (c === 'fedex' || c === 'federal express') {
    return `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(num)}`;
  }
  if (c === 'dhl') return `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${encodeURIComponent(num)}`;
  return null;
}

const statusTone = (s: string | null | undefined) => {
  if (!s) return 'bg-muted text-muted-foreground border-border';
  const v = s.toLowerCase();
  if (v === 'shipped' || v === 'in_transit' || v === 'in-transit') {
    return 'bg-success/10 text-success border-success/20';
  }
  if (v === 'delivered') return 'bg-success/10 text-success border-success/20';
  if (v === 'pending' || v === 'processing' || v === 'pre_transit') {
    return 'bg-warning/10 text-warning border-warning/20';
  }
  if (v === 'cancelled' || v === 'returned') {
    return 'bg-destructive/10 text-destructive border-destructive/20';
  }
  return 'bg-muted text-muted-foreground border-border';
};

const titleCase = (s: string | null | undefined) => {
  if (!s) return '—';
  return s
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

export default function CustomerDashboardPage() {
  const { appointments, pets, currentUser } = useAppStore();

  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/customer/orders')
      .then(async (r) => {
        if (r.status === 401) {
          if (alive) {
            setUnauthorized(true);
            setLoading(false);
          }
          return null;
        }
        if (!r.ok) {
          if (alive) {
            setError('Could not load your orders right now.');
            setLoading(false);
          }
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (!alive || !d) return;
        setOrders(Array.isArray(d.orders) ? d.orders : []);
        setLoading(false);
      })
      .catch(() => {
        if (alive) {
          setError('Could not load your orders right now.');
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  // ---- Account + Addresses (commerce_customer_accounts / commerce_customer_addresses) ----
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [account, setAccount] = useState<CustomerAccount | null>(null);
  const [accountLoading, setAccountLoading] = useState(true);

  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [addressError, setAddressError] = useState<string | null>(null);

  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    mobilePhone: '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState<AddressForm>(EMPTY_ADDRESS_FORM);
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressFormError, setAddressFormError] = useState<string | null>(null);

  const loadAccount = () => {
    fetch('/api/customer/account')
      .then(async (r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((d) => {
        if (!d) {
          setAccountLoading(false);
          return;
        }
        setProfile(d.profile || null);
        setAccount(d.account || null);
        setAccountLoading(false);
      })
      .catch(() => setAccountLoading(false));
  };

  const loadAddresses = () => {
    fetch('/api/customer/addresses')
      .then(async (r) => {
        if (!r.ok) {
          if (r.status === 401) return { addresses: [] };
          const j = await r.json().catch(() => ({}));
          throw new Error(j.error || 'Could not load addresses.');
        }
        return r.json();
      })
      .then((d) => {
        setAddresses(Array.isArray(d.addresses) ? d.addresses : []);
        setAddressesLoading(false);
        setAddressError(null);
      })
      .catch((e) => {
        setAddressError(e.message || 'Could not load addresses.');
        setAddressesLoading(false);
      });
  };

  useEffect(() => {
    loadAccount();
    loadAddresses();
  }, []);

  // ---- Profile modal handlers ----
  const openEditProfile = () => {
    setProfileForm({
      firstName: profile?.firstName || '',
      lastName: profile?.lastName || '',
      phone: profile?.phone || '',
      mobilePhone: profile?.mobilePhone || '',
    });
    setProfileError(null);
    setProfileDialogOpen(true);
  };

  const submitProfile = async () => {
    setProfileSaving(true);
    setProfileError(null);
    try {
      const res = await fetch('/api/customer/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: profileForm.firstName.trim(),
          lastName: profileForm.lastName.trim(),
          phone: profileForm.phone.trim(),
          mobilePhone: profileForm.mobilePhone.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Could not save profile.');
      }
      setProfile(data.profile || null);
      setAccount(data.account || account);
      setProfileDialogOpen(false);
    } catch (e: any) {
      setProfileError(e.message || 'Could not save profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  // ---- Address modal handlers ----
  const openAddAddress = () => {
    setEditingAddressId(null);
    setAddressForm({
      ...EMPTY_ADDRESS_FORM,
      isDefault: addresses.length === 0, // first address defaults to default
    });
    setAddressFormError(null);
    setAddressDialogOpen(true);
  };

  const openEditAddress = (a: CustomerAddress) => {
    setEditingAddressId(a.id);
    setAddressForm({
      addressType: a.addressType || 'shipping',
      firstName: a.firstName || '',
      lastName: a.lastName || '',
      company: a.company || '',
      line1: a.line1 || '',
      line2: a.line2 || '',
      city: a.city || '',
      state: a.state || '',
      postalCode: a.postalCode || '',
      countryCode: a.countryCode || 'US',
      phone: a.phone || '',
      isDefault: !!a.isDefault,
    });
    setAddressFormError(null);
    setAddressDialogOpen(true);
  };

  const submitAddress = async () => {
    if (!addressForm.line1.trim() || !addressForm.city.trim()) {
      setAddressFormError('Street address and city are required.');
      return;
    }
    setAddressSaving(true);
    setAddressFormError(null);
    try {
      const url = editingAddressId
        ? `/api/customer/addresses/${editingAddressId}`
        : '/api/customer/addresses';
      const method = editingAddressId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addressForm),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Could not save address.');
      }
      setAddressDialogOpen(false);
      loadAddresses();
    } catch (e: any) {
      setAddressFormError(e.message || 'Could not save address.');
    } finally {
      setAddressSaving(false);
    }
  };

  const removeAddress = async (a: CustomerAddress) => {
    if (!confirm('Delete this address? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/customer/addresses/${a.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || 'Could not delete address.');
        return;
      }
      loadAddresses();
    } catch {
      alert('Could not delete address.');
    }
  };

  const fullName =
    [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim() ||
    currentUser?.name ||
    'pet parent';

  const fmtCredit = (s: string | null | undefined) => {
    const n = Number(s);
    if (!Number.isFinite(n)) return '$0.00';
    return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  };

  const addressSummary = (a: CustomerAddress) => {
    const nameLine = [a.firstName, a.lastName].filter(Boolean).join(' ');
    const lines: string[] = [];
    if (nameLine) lines.push(nameLine);
    if (a.company) lines.push(a.company);
    lines.push(a.line1);
    if (a.line2) lines.push(a.line2);
    const cityLine = [a.city, a.state, a.postalCode].filter(Boolean).join(' ');
    if (cityLine) lines.push(cityLine);
    if (a.countryCode && a.countryCode !== 'US') lines.push(a.countryCode);
    if (a.phone) lines.push(a.phone);
    return lines;
  };

  // ---- Real KPIs from the orders API ----
  const paidOrders = orders.filter((o) => (o.paymentStatus || '').toUpperCase() === 'PAID');
  const totalSpent = paidOrders.reduce((acc, o) => acc + USD(o.subtotal), 0);
  const orderCount = orders.length;
  const latest = orders[0]; // API sorts createdAt DESC, so [0] is the most recent
  const latestStatus = latest?.fulfillmentStatus || latest?.status || null;
  const inTransit = orders.filter((o) => {
    const v = (o.fulfillmentStatus || '').toLowerCase();
    return v === 'shipped' || v === 'in_transit' || v === 'in-transit';
  }).length;
  const recent = orders.slice(0, 3);

  const myAppts = appointments.slice(0, 3);
  const myPets = pets.slice(0, 3);

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 bg-background p-6 md:p-8">
      <div>
        <h1 className="font-bar text-2xl font-semibold tracking-tight text-foreground">
          Welcome, {currentUser?.name || 'pet parent'}
        </h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          Manage your pets, appointments, and orders.
        </p>
      </div>

      {unauthorized ? (
        // 401 — the layout normally redirects, but if the session expired
        // mid-session we surface a friendly CTA instead of a blank screen.
        <div className="bg-card border border-border rounded-xl shadow-card p-8 text-center">
          <AlertCircle className="size-8 mx-auto text-muted-foreground/60" />
          <p className="text-[14px] font-medium text-foreground mt-3">
            Sign in to view your orders
          </p>
          <p className="text-[13px] text-muted-foreground mt-1 max-w-md mx-auto">
            Your session has expired. Sign in again to see your order history,
            tracking, and recent purchases.
          </p>
          <Link
            href="/access-customer"
            className="mt-4 inline-flex items-center gap-2 bg-ink text-white px-4 py-2 rounded-lg text-[12px] font-semibold hover:opacity-90 transition-opacity"
          >
            Sign in
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      ) : (
        <>
          {/* KPI tiles — wired to real order data */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: 'Total Spent',
                value: loading ? '…' : fmtUSD(totalSpent),
                icon: CircleDollarSign,
                sub: `${paidOrders.length} paid order${paidOrders.length === 1 ? '' : 's'}`,
              },
              {
                label: 'Total Orders',
                value: loading ? '…' : String(orderCount),
                icon: ShoppingBag,
                sub: orderCount === 0 ? 'No orders yet' : 'Lifetime',
              },
              {
                label: 'In Transit',
                value: loading ? '…' : String(inTransit),
                icon: Truck,
                sub: inTransit === 0 ? 'None shipping now' : 'On the way',
              },
              {
                label: 'Latest Order',
                value: loading ? '…' : titleCase(latestStatus),
                icon: Package,
                sub: latest ? fmtDate(latest.placedAt) : '—',
              },
            ].map((kpi) => {
              const Icon = kpi.icon;
              return (
                <div
                  key={kpi.label}
                  className="bg-card border border-border rounded-xl p-4 shadow-card"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {kpi.label}
                    </span>
                    <Icon className="size-4 text-primary" />
                  </div>
                  <div className="text-2xl font-bar font-semibold tabular-nums text-foreground mt-2">
                    {kpi.value}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{kpi.sub}</div>
                </div>
              );
            })}
          </div>

          {/* Recent Orders — last 3 orders with tracking deep links */}
          <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
            <div className="bg-muted/40 border-b border-border px-4 py-2.5 flex items-center justify-between">
              <span className="text-[13px] font-medium text-foreground">Recent Orders</span>
              <Link
                href="/customer/orders"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground hover:underline"
              >
                View all
                <ArrowRight className="size-3" />
              </Link>
            </div>
            <div className="divide-y divide-border">
              {loading ? (
                <div className="p-6 text-[13px] text-muted-foreground">Loading your orders…</div>
              ) : recent.length === 0 ? (
                <div className="p-8 text-center">
                  <ShoppingBag className="size-7 mx-auto text-muted-foreground/50" />
                  <p className="text-[14px] font-medium text-foreground mt-3">No orders yet</p>
                  <p className="text-[13px] text-muted-foreground mt-1 max-w-md mx-auto">
                    Orders you place in the shop appear here automatically — sign in with this same email at checkout.
                  </p>
                  <Link
                    href="/shop"
                    className="mt-4 inline-flex items-center gap-2 bg-ink text-white px-4 py-2 rounded-lg text-[12px] font-semibold hover:opacity-90 transition-opacity"
                  >
                    Browse the shop
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              ) : (
                recent.map((order) => {
                  const trackUrl = trackingUrl(order.carrier, order.trackingNumber);
                  return (
                    <div
                      key={order.id}
                      className="flex flex-wrap items-center gap-4 p-4 hover:bg-accent/50 transition-colors"
                    >
                      <div className="size-10 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
                        <Package className="size-5" />
                      </div>
                      <div className="flex-1 min-w-[180px]">
                        <p className="text-[13px] font-medium text-foreground tabular-nums">
                          Order #{order.id.slice(0, 8).toUpperCase()}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {fmtDate(order.placedAt)}
                          {order.deliveryMethod === 'pickup' ? ' · Store pickup' : ' · Shipping'}
                        </p>
                      </div>
                      {trackUrl ? (
                        <a
                          href={trackUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-foreground hover:text-primary"
                        >
                          <Truck className="size-3.5" />
                          Track {order.trackingNumber}
                        </a>
                      ) : order.trackingNumber ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Truck className="size-3.5" />
                          {order.trackingNumber}
                          {order.carrier ? ` (${order.carrier})` : ''}
                        </span>
                      ) : null}
                      <span
                        className={cn(
                          'inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase',
                          statusTone(order.fulfillmentStatus || order.status),
                        )}
                      >
                        {titleCase(order.fulfillmentStatus || order.status)}
                      </span>
                      <p className="font-bar text-[14px] font-semibold text-foreground tabular-nums w-[90px] text-right">
                        {order.subtotal}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {error && (
            <div className="text-[12px] text-muted-foreground">{error}</div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upcoming Appointments — mock store (out of scope to rewire) */}
            <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
              <div className="bg-muted/40 border-b border-border px-4 py-2.5 flex items-center justify-between">
                <span className="text-[13px] font-medium text-foreground">Upcoming Appointments</span>
              </div>
              <div className="divide-y divide-border">
                {myAppts.length === 0 ? (
                  <div className="p-6 text-[12px] text-muted-foreground">No upcoming appointments.</div>
                ) : (
                  myAppts.map((appt) => (
                    <div
                      key={appt.id}
                      className="flex items-center gap-4 p-4 hover:bg-accent/50 transition-colors"
                    >
                      <div className="size-10 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-lg">
                        <PawPrint className="size-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-foreground">
                          {appt.petName} — {appt.serviceName}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {appt.date} · {appt.time}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase',
                          appt.status === 'Completed'
                            ? 'bg-success/10 text-success border-success/20'
                            : 'bg-muted text-muted-foreground border-border',
                        )}
                      >
                        {appt.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* My Pets — mock store (out of scope to rewire) */}
            <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
              <div className="bg-muted/40 border-b border-border px-4 py-2.5 flex items-center justify-between">
                <span className="text-[13px] font-medium text-foreground">My Pets</span>
              </div>
              <div className="divide-y divide-border">
                {myPets.length === 0 ? (
                  <div className="p-6 text-[12px] text-muted-foreground">No pets registered yet.</div>
                ) : (
                  myPets.map((pet) => (
                    <div
                      key={pet.id}
                      className="flex items-center gap-4 p-4 hover:bg-accent/50 transition-colors"
                    >
                      <div className="size-10 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-lg">
                        {pet.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-foreground">{pet.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {pet.breed} · {pet.age}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                          pet.vaccinationStatus === 'Up to date'
                            ? 'bg-success/10 text-success border-success/20'
                            : 'bg-warning/10 text-warning border-warning/20',
                        )}
                      >
                        {pet.vaccinationStatus}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* ===== Account Overview — wired to /api/customer/account ===== */}
          <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
            <div className="bg-muted/40 border-b border-border px-4 py-2.5 flex items-center justify-between">
              <span className="text-[13px] font-medium text-foreground flex items-center gap-2">
                <User className="size-3.5 text-primary" />
                Account Overview
              </span>
              <button
                type="button"
                onClick={openEditProfile}
                disabled={!profile || accountLoading}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-foreground hover:text-primary disabled:opacity-50"
              >
                <Pencil className="size-3" />
                Edit Profile
              </button>
            </div>
            <div className="p-4">
              {accountLoading ? (
                <div className="text-[13px] text-muted-foreground">Loading your account…</div>
              ) : !profile ? (
                <div className="text-[13px] text-muted-foreground">
                  Your account profile isn’t provisioned yet. Please contact support.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  {/* Left column — identity */}
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Name
                      </p>
                      <p className="text-[13px] font-medium text-foreground mt-0.5">
                        {fullName}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Email
                      </p>
                      <p className="text-[13px] text-foreground mt-0.5 break-words">
                        {profile.email || '—'}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Phone
                        </p>
                        <p className="text-[13px] text-foreground mt-0.5">
                          {profile.phone || '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Mobile
                        </p>
                        <p className="text-[13px] text-foreground mt-0.5">
                          {profile.mobilePhone || '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                  {/* Right column — account / tax status */}
                  <div className="space-y-3 md:border-l md:border-border md:pl-8">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Tax Status
                        </p>
                        <p className="text-[13px] font-medium text-foreground mt-0.5">
                          {account?.taxExempt ? 'Tax Exempt' : 'Taxable'}
                        </p>
                        {account?.taxExemptionNumber ? (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Exemption #{account.taxExemptionNumber}
                          </p>
                        ) : null}
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          account?.taxExempt
                            ? 'bg-success/10 text-success border-success/20'
                            : 'bg-muted text-muted-foreground border-border'
                        }
                      >
                        {account?.taxExempt ? (
                          <CheckCircle2 className="size-3" />
                        ) : (
                          <CreditCard className="size-3" />
                        )}
                        {account?.taxExempt ? 'Exempt' : 'Standard'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Credit Limit
                      </p>
                      <p className="text-[13px] font-medium text-foreground mt-0.5 tabular-nums">
                        {fmtCredit(account?.creditLimit)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Account Status
                      </p>
                      <Badge
                        variant="outline"
                        className={
                          account?.active
                            ? 'bg-success/10 text-success border-success/20'
                            : 'bg-destructive/10 text-destructive border-destructive/20'
                        }
                      >
                        {account?.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ===== Saved Addresses — wired to /api/customer/addresses ===== */}
          <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
            <div className="bg-muted/40 border-b border-border px-4 py-2.5 flex items-center justify-between">
              <span className="text-[13px] font-medium text-foreground flex items-center gap-2">
                <MapPin className="size-3.5 text-primary" />
                Saved Addresses
              </span>
              <button
                type="button"
                onClick={openAddAddress}
                disabled={addressesLoading}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-foreground hover:text-primary disabled:opacity-50"
              >
                <Plus className="size-3" />
                Add Address
              </button>
            </div>
            <div className="divide-y divide-border max-h-96 overflow-y-auto custom-scrollbar">
              {addressesLoading ? (
                <div className="p-6 text-[13px] text-muted-foreground">
                  Loading your saved addresses…
                </div>
              ) : addressError ? (
                <div className="p-6 text-[13px] text-destructive">{addressError}</div>
              ) : addresses.length === 0 ? (
                <div className="p-8 text-center">
                  <MapPin className="size-7 mx-auto text-muted-foreground/50" />
                  <p className="text-[14px] font-medium text-foreground mt-3">No saved addresses</p>
                  <p className="text-[13px] text-muted-foreground mt-1 max-w-md mx-auto">
                    Add a shipping or billing address and it’ll be ready at checkout next time.
                  </p>
                  <button
                    type="button"
                    onClick={openAddAddress}
                    className="mt-4 inline-flex items-center gap-2 bg-ink text-white px-4 py-2 rounded-lg text-[12px] font-semibold hover:opacity-90 transition-opacity"
                  >
                    <Plus className="size-3.5" />
                    Add your first address
                  </button>
                </div>
              ) : (
                addresses.map((a) => {
                  const lines = addressSummary(a);
                  return (
                    <div
                      key={a.id}
                      className="flex flex-wrap items-start gap-4 p-4 hover:bg-accent/50 transition-colors"
                    >
                      <div className="size-10 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                        <MapPin className="size-5" />
                      </div>
                      <div className="flex-1 min-w-[200px]">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge
                            variant="outline"
                            className="bg-muted text-muted-foreground border-border uppercase"
                          >
                            {a.addressType || 'shipping'}
                          </Badge>
                          {a.isDefault ? (
                            <Badge
                              variant="outline"
                              className="bg-success/10 text-success border-success/20"
                            >
                              Default
                            </Badge>
                          ) : null}
                        </div>
                        <div className="text-[13px] text-foreground leading-relaxed">
                          {lines.map((line, idx) => (
                            <div key={idx} className={idx === 0 ? 'font-medium' : ''}>
                              {line}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditAddress(a)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground hover:text-primary px-2 py-1 rounded-md hover:bg-accent transition-colors"
                          aria-label="Edit address"
                        >
                          <Pencil className="size-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => removeAddress(a)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground hover:text-destructive px-2 py-1 rounded-md hover:bg-accent transition-colors"
                          aria-label="Delete address"
                        >
                          <Trash2 className="size-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* ===== Edit Profile dialog ===== */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your contact details. Email is managed by support.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pf-first" className="text-[12px] text-muted-foreground">
                  First name
                </Label>
                <Input
                  id="pf-first"
                  value={profileForm.firstName}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, firstName: e.target.value })
                  }
                  className="text-[13px]"
                  autoComplete="given-name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pf-last" className="text-[12px] text-muted-foreground">
                  Last name
                </Label>
                <Input
                  id="pf-last"
                  value={profileForm.lastName}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, lastName: e.target.value })
                  }
                  className="text-[13px]"
                  autoComplete="family-name"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pf-phone" className="text-[12px] text-muted-foreground">
                Phone
              </Label>
              <Input
                id="pf-phone"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                className="text-[13px]"
                autoComplete="tel"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pf-mobile" className="text-[12px] text-muted-foreground">
                Mobile
              </Label>
              <Input
                id="pf-mobile"
                value={profileForm.mobilePhone}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, mobilePhone: e.target.value })
                }
                className="text-[13px]"
                autoComplete="tel-national"
              />
            </div>
            {profileError ? (
              <p className="text-[12px] text-destructive">{profileError}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setProfileDialogOpen(false)}
              disabled={profileSaving}
              className="text-[12px]"
            >
              Cancel
            </Button>
            <Button
              onClick={submitProfile}
              disabled={profileSaving}
              className="bg-ink text-white hover:bg-ink/90 text-[12px]"
            >
              {profileSaving ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Add / Edit Address dialog ===== */}
      <Dialog open={addressDialogOpen} onOpenChange={setAddressDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAddressId ? 'Edit Address' : 'Add Address'}</DialogTitle>
            <DialogDescription>
              {editingAddressId
                ? 'Update the details for this saved address.'
                : 'Save a shipping or billing address for faster checkout.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="af-first" className="text-[12px] text-muted-foreground">
                  First name
                </Label>
                <Input
                  id="af-first"
                  value={addressForm.firstName}
                  onChange={(e) =>
                    setAddressForm({ ...addressForm, firstName: e.target.value })
                  }
                  className="text-[13px]"
                  autoComplete="given-name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="af-last" className="text-[12px] text-muted-foreground">
                  Last name
                </Label>
                <Input
                  id="af-last"
                  value={addressForm.lastName}
                  onChange={(e) =>
                    setAddressForm({ ...addressForm, lastName: e.target.value })
                  }
                  className="text-[13px]"
                  autoComplete="family-name"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="af-company" className="text-[12px] text-muted-foreground">
                Company (optional)
              </Label>
              <Input
                id="af-company"
                value={addressForm.company}
                onChange={(e) => setAddressForm({ ...addressForm, company: e.target.value })}
                className="text-[13px]"
                autoComplete="organization"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="af-line1" className="text-[12px] text-muted-foreground">
                Street address
              </Label>
              <Input
                id="af-line1"
                value={addressForm.line1}
                onChange={(e) => setAddressForm({ ...addressForm, line1: e.target.value })}
                className="text-[13px]"
                autoComplete="address-line1"
                placeholder="123 Main St"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="af-line2" className="text-[12px] text-muted-foreground">
                Apt / Suite (optional)
              </Label>
              <Input
                id="af-line2"
                value={addressForm.line2}
                onChange={(e) => setAddressForm({ ...addressForm, line2: e.target.value })}
                className="text-[13px]"
                autoComplete="address-line2"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="af-city" className="text-[12px] text-muted-foreground">
                  City
                </Label>
                <Input
                  id="af-city"
                  value={addressForm.city}
                  onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                  className="text-[13px]"
                  autoComplete="address-level2"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="af-state" className="text-[12px] text-muted-foreground">
                  State / Region
                </Label>
                <Input
                  id="af-state"
                  value={addressForm.state}
                  onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                  className="text-[13px]"
                  autoComplete="address-level1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="af-postal" className="text-[12px] text-muted-foreground">
                  Postal code
                </Label>
                <Input
                  id="af-postal"
                  value={addressForm.postalCode}
                  onChange={(e) =>
                    setAddressForm({ ...addressForm, postalCode: e.target.value })
                  }
                  className="text-[13px]"
                  autoComplete="postal-code"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="af-country" className="text-[12px] text-muted-foreground">
                  Country code
                </Label>
                <Input
                  id="af-country"
                  value={addressForm.countryCode}
                  onChange={(e) =>
                    setAddressForm({ ...addressForm, countryCode: e.target.value.toUpperCase() })
                  }
                  className="text-[13px]"
                  autoComplete="country"
                  maxLength={3}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="af-phone" className="text-[12px] text-muted-foreground">
                Phone (optional)
              </Label>
              <Input
                id="af-phone"
                value={addressForm.phone}
                onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                className="text-[13px]"
                autoComplete="tel"
              />
            </div>
            <label
              htmlFor="af-default"
              className="flex items-center gap-2 text-[13px] text-foreground cursor-pointer select-none"
            >
              <Checkbox
                id="af-default"
                checked={addressForm.isDefault}
                onCheckedChange={(c) => setAddressForm({ ...addressForm, isDefault: !!c })}
              />
              Set as default address
            </label>
            {addressFormError ? (
              <p className="text-[12px] text-destructive">{addressFormError}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddressDialogOpen(false)}
              disabled={addressSaving}
              className="text-[12px]"
            >
              Cancel
            </Button>
            <Button
              onClick={submitAddress}
              disabled={addressSaving}
              className="bg-ink text-white hover:bg-ink/90 text-[12px]"
            >
              {addressSaving
                ? 'Saving…'
                : editingAddressId
                  ? 'Save changes'
                  : 'Add address'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
