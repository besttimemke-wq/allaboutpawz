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
    fetch(`/api/admin/crm/pets${qs}`).then((r) => r.ok ? r.json() : null).then((data) => {
      if (!data?.pets) return;
      setPets(data.pets.map((p: any) => {
        const species = String(p.species||'dog').toLowerCase();
        return { id: p.id, name: p.name, breed: p.breed||(p.mixedBreed?'Mixed':'—'), age: p.approximateAgeYears?`${Math.floor(p.approximateAgeYears)}yr`:'—', weight: p.weight?`${p.weight} ${p.weightUnit||'lb'}`:'—', emoji: species==='cat'?'🐱':'🐶', ownerName:'—', vaccinationStatus:'Up to date', lastGroomDate:'—', specialNotes: p.handlingNotes||p.medicalNotes||'No notes' } as PetRecord;
      }));
    }).catch(() => {});
  }, [search]);
  return (<><div className="px-6 pt-4 flex items-center gap-2"><input type="text" value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search pets…" className="bg-background border border-input rounded-md px-3 h-9 text-[13px] flex-1 max-w-md" /></div><PetsView pets={pets} onAddPet={()=>setActiveModal('pet')} /></>);
}
