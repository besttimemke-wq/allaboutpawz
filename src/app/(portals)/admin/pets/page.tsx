'use client';
import { useAppStore } from '@/lib/store';
import { PetsView } from '@/components/pawz/PetsView';
export default function PetsPage() {
  const { pets, setActiveModal } = useAppStore();
  return <PetsView pets={pets} onAddPet={() => setActiveModal('pet')} />;
}
