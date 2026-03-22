import { useState, useEffect, useCallback } from 'react';
import type { VideoSettings } from '../types';
import { settingsApi } from '../api/client';

export function useSettings() {
  const [settings, setSettings] = useState<VideoSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await settingsApi.get();
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback(async (data: VideoSettings) => {
    try {
      const updated = await settingsApi.update(data);
      setSettings(updated);
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  }, []);

  return {
    settings,
    loading,
    error,
    refresh: fetchSettings,
    updateSettings,
  };
}
