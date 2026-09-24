'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { SettingsView } from '@/components/pawz/SettingsView';

export default function SettingsPage() {
  const { selectedLocation, setSelectedLocation, setActiveModal } = useAppStore();
  const [locations, setLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLocations = useCallback(() => {
    fetch('/api/admin/crm/locations')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.locations) {
          setLocations(data.locations.map((l: any) => l.name || l.code || 'Unknown'));
        }
      })
      .catch((err) => console.error('[settings] failed to fetch locations', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const handleAddLocation = useCallback(async () => {
    // Locations are managed via the Supabase dashboard or a dedicated
    // locations admin page. For now, trigger a refetch to pick up any
    // changes made externally.
    fetchLocations();
  }, [fetchLocations]);

  const handleDeleteLocation = useCallback(async () => {
    fetchLocations();
  }, [fetchLocations]);

  if (loading) return <div className="p-6 text-[13px] text-muted-foreground">Loading settings…</div>;

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
