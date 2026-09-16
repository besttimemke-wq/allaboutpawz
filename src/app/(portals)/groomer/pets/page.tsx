'use client';
import { useAppStore } from '@/lib/store';
import { PetsView } from '@/components/pawz/PetsView';
export default function GroomerPetsPage() {
  const { pets, setActiveModal } = useAppStore();
  return <PetsView pets={pets} onAddPet={() => setActiveModal('pet')} />;
}
