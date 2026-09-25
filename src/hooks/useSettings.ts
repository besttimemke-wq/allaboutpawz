import { useState, useEffect, useCallback } from 'react';
import type { SystemSettings } from '@/lib/settings-types';
import { DEFAULT_SETTINGS } from '@/lib/settings-types';

export function useSettings() {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const response = await fetch('/api/admin/settings');
        if (!response.ok) {
          if (response.status === 401) throw new Error('Admin sign-in required.');
          throw new Error('Failed to fetch settings');
        }
        const data = await response.json();
        setSettings(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const updateSettings = useCallback(async (updates: Partial<SystemSettings>) => {
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to save settings');
      // Merge the updates into local state
      setSettings((prev) => ({ ...prev, ...updates }));
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, []);

  return { settings, isLoading, error, updateSettings };
}
