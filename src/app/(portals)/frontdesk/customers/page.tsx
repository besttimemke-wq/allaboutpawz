'use client';

import { useMemo, useState } from 'react';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Users, Mail, Phone } from 'lucide-react';

// ============================================================================
// Front Desk — Customers. The desk's client directory: search by name,
// email or phone, see status and pets. Full customer management (CRM
// records, history, invoicing) belongs to the admin OS — this is the
// phone-side quick lookup.
// ============================================================================

interface DeskCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  pets: string[];
  status: string;
}

const FALLBACK: DeskCustomer[] = [
  { id: 'c1', name: 'Maria Lopez', email: 'maria@example.com', phone: '(214) 555-0118', pets: ['Coco'], status: 'Active' },
  { id: 'c2', name: 'James Whitfield', email: 'james.w@example.com', phone: '(469) 555-2231', pets: ['Biscuit'], status: 'Active' },
  { id: 'c3', name: 'Priya Kaur', email: 'priya.k@example.com', phone: '(972) 555-8890', pets: ['Rocky'], status: 'Active' },
  { id: 'c4', name: 'Tom Herrera', email: 'tom.h@example.com', phone: '(214) 555-4417', pets: ['Luna'], status: 'Active' },
  { id: 'c5', name: 'Ava Park', email: 'ava.p@example.com', phone: '(469) 555-0122', pets: ['Mochi'], status: 'New' },
];

export default function FrontDeskCustomersPage() {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FALLBACK;
    return FALLBACK.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.replace(/\D/g, '').includes(q.replace(/\D/g, '')) ||
        c.pets.some((p) => p.toLowerCase().includes(q)),
    );
  }, [query]);

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground mt-1">Client lookup for the desk.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, phone, pet…"
            className="pl-8"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c) => (
          <Card key={c.id} className="border-border/60">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13px] font-semibold flex items-center gap-2">
                  <Users className="size-3.5 text-muted-foreground" /> {c.name}
                </p>
                <Badge variant="secondary" className="text-[10px]">
                  {c.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Mail className="size-3" /> {c.email}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Phone className="size-3" /> {c.phone}
              </p>
              <p className="text-xs text-muted-foreground">Pets: {c.pets.join(', ') || '—'}</p>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-full py-8 text-center">
            No clients match &ldquo;{query}&rdquo;.
          </p>
        )}
      </div>
    </div>
  );
}
