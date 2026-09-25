'use client';
import { useAppStore } from '@/lib/store';
import { SettingsView } from '@/components/pawz/SettingsView';
import { useLocations } from '@/hooks/useLocations';

export default function SettingsPage() {
  const { selectedLocation, setSelectedLocation, setActiveModal } = useAppStore();
  const { locations, isLoading } = useLocations();

  const handleAddLocation = useCallback(async () => {
    // Locations are managed via the Supabase dashboard or a dedicated
    // locations admin page. Trigger a refetch to pick up any changes.
  }, []);

  const handleDeleteLocation = useCallback(async () => {
  }, []);

  if (isLoading) return <div className="p-6 text-[13px] text-muted-foreground">Loading settings…</div>;

  return (
    <SettingsView
      locations={locations}
      selectedLocation={selectedLocation}
      onSelectLocation={setSelectedLocation}
      onAddLocation={handleAddLocation}
      onDeleteLocation={handleDeleteLocation}
      onOpenQuickAction={(action) => setActiveModal(action)}
    />
  );
}
