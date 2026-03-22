import { useState, useEffect, useCallback } from 'react';
import type { Metadata } from '../types';
import { metadataApi } from '../api/client';

export function useMetadata() {
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetadata = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await metadataApi.getAll();
      setMetadata(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  return {
    metadata,
    loading,
    error,
    refresh: fetchMetadata,
  };
}
