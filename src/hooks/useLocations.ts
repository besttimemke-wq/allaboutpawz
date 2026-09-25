import { useState, useEffect, useCallback } from 'react';

export function useLocations() {
  const [locations, setLocations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/crm/locations');
      if (!response.ok) {
        if (response.status === 401) throw new Error('Admin sign-in required.');
        return;
      }
      const data = await response.json();
      if (data?.locations) {
        setLocations(data.locations.map((l: any) => l.name || l.code || 'Unknown'));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { locations, isLoading, error, reload: load };
}
