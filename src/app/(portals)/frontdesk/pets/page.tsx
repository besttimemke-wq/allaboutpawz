'use client';

import { useMemo, useState } from 'react';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, PawPrint } from 'lucide-react';

// ============================================================================
// Front Desk — Pets & Patients. Quick reference for the desk: who is on the
// floor today, vaccination status (gating check-in), and handling notes.
// Medical/grooming detail lives in the groomer station and the admin OS.
// ============================================================================

interface DeskPet {
  id: string;
  name: string;
  breed: string;
  owner: string;
  vaccinationStatus: string;
  notes: string;
}

const PETS: DeskPet[] = [
  { id: 'p1', name: 'Coco', breed: 'Poodle', owner: 'Maria Lopez', vaccinationStatus: 'Up to date', notes: 'Sensitive paws — muzzle-free handling.' },
  { id: 'p2', name: 'Biscuit', breed: 'Shih Tzu', owner: 'James Whitfield', vaccinationStatus: 'Up to date', notes: 'Left ear history of infection — dry thoroughly.' },
  { id: 'p3', name: 'Rocky', breed: 'Beagle', owner: 'Priya Kaur', vaccinationStatus: 'Up to date', notes: 'Pulls on the table — use the loop Short.' },
  { id: 'p4', name: 'Luna', breed: 'Husky', owner: 'Tom Herrera', vaccinationStatus: 'Due — rabies', notes: 'Heavy undercoat; de-shed add-on booked.' },
  { id: 'p5', name: 'Mochi', breed: 'Pomeranian', owner: 'Ava Park', vaccinationStatus: 'Up to date', notes: 'First visit — nervous, go slow.' },
];

export default function FrontDeskPetsPage() {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PETS;
    return PETS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.breed.toLowerCase().includes(q) ||
        p.owner.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pets &amp; Patients</h1>
          <p className="text-sm text-muted-foreground mt-1">Quick reference for today&apos;s floor.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pet, breed, owner…"
            className="pl-8"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => (
          <Card key={p.id} className="border-border/60">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13px] font-semibold flex items-center gap-2">
                  <PawPrint className="size-3.5 text-muted-foreground" /> {p.name}
                </p>
                <Badge
                  className={
                    p.vaccinationStatus === 'Up to date'
                      ? 'bg-emerald-100 text-emerald-800 border-0 text-[10px]'
                      : 'bg-amber-100 text-amber-800 border-0 text-[10px]'
                  }
                >
                  {p.vaccinationStatus}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {p.breed} · Owner: {p.owner}
              </p>
              {p.notes && (
                <p className="text-xs text-muted-foreground border-l-2 border-border pl-2 italic">
                  {p.notes}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-full py-8 text-center">
            No pets match &ldquo;{query}&rdquo;.
          </p>
        )}
      </div>
    </div>
  );
}
