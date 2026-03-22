import { useState, useEffect, useCallback } from 'react';
import type { ScriptLine } from '../types';
import { scriptApi } from '../api/client';

export function useScript() {
  const [script, setScript] = useState<ScriptLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScript = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await scriptApi.getAll();
      setScript(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScript();
  }, [fetchScript]);

  const updateLine = useCallback(async (id: number, data: Partial<ScriptLine>) => {
    try {
      const updated = await scriptApi.update(id, data);
      setScript(prev => prev.map(line => line.id === id ? updated : line));
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  }, []);

  const createLine = useCallback(async (data: Omit<ScriptLine, 'id'>) => {
    try {
      const created = await scriptApi.create(data);
      setScript(prev => [...prev, created]);
      return created;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  }, []);

  const deleteLine = useCallback(async (id: number) => {
    try {
      await scriptApi.delete(id);
      setScript(prev => prev.filter(line => line.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  }, []);

  const reorder = useCallback(async (ids: number[]) => {
    try {
      const reordered = await scriptApi.reorder(ids);
      setScript(reordered);
      return reordered;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  }, []);

  return {
    script,
    loading,
    error,
    refresh: fetchScript,
    updateLine,
    createLine,
    deleteLine,
    reorder,
  };
}
