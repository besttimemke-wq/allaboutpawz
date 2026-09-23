'use client';
import { useState, useEffect } from 'react';
import { PetsView } from '@/components/pawz/PetsView';
import { PetRecord } from '@/lib/types';
import { useAppStore } from '@/lib/store';

export default function PetsPage() {
  const { setActiveModal } = useAppStore();
  const [pets, setPets] = useState<PetRecord[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const qs = search ? `?search=${encodeURIComponent(search)}&limit=200` : '?limit=200';
    fetch(`/api/admin/crm/pets${qs}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data?.pets) return;
        setPets(data.pets.map((p: any) => {
          const age = p.approximateAgeYears != null
            ? `${Math.floor(p.approximateAgeYears)} yr${p.approximateAgeYears >= 2 ? 's' : ''}`
            : '—';
          const weight = p.weight != null ? `${p.weight} ${p.weightUnit || 'lb'}` : '—';
          const species = String(p.species || 'dog').toLowerCase();
          const emoji = species === 'cat' ? '🐱' : species === 'rabbit' ? '🐰' : species === 'bird' ? '🦜' : '🐶';
          const notes: string[] = [];
          if (p.permanentAlert) notes.push(`⚠ ${p.permanentAlert}`);
          if (p.medicalNotes) notes.push(`Medical: ${p.medicalNotes}`);
          if (p.handlingNotes) notes.push(`Handling: ${p.handlingNotes}`);
          if (p.behavioralNotes) notes.push(`Behavior: ${p.behavioralNotes}`);
          if (p.serviceNotes) notes.push(`Service: ${p.serviceNotes}`);
          return {
            id: p.id,
            name: p.name,
            breed: p.breed || (p.mixedBreed ? 'Mixed breed' : '—'),
            age,
            weight,
            emoji,
            ownerName: '—',
            vaccinationStatus: 'Up to date',
            lastGroomDate: '—',
            specialNotes: notes.length > 0 ? notes.join(' · ') : 'No special notes on file.',
          } as PetRecord;
        }));
      })
      .catch(() => {});
  }, [search]);

  return (
    <>
      <div className="px-6 pt-4 flex items-center gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search pet registry by name, breed, or owner…"
          className="bg-background border border-input rounded-md px-3 h-9 text-[13px] flex-1 max-w-md"
        />
      </div>
      <PetsView pets={pets} onAddPet={() => setActiveModal('pet')} />
    </>
  );
}
