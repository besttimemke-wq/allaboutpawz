'use client';
import { useAppStore } from '@/lib/store';
import { SettingsView } from '@/components/pawz/SettingsView';
export default function SettingsPage() {
  const { locations, selectedLocation, setSelectedLocation, addLocation, deleteLocation, setActiveModal } = useAppStore();
  return (
    <SettingsView
      locations={locations}
      selectedLocation={selectedLocation}
      onSelectLocation={setSelectedLocation}
      onAddLocation={addLocation}
      onDeleteLocation={deleteLocation}
      onOpenQuickAction={(action) => setActiveModal(action)}
    />
  );
}
