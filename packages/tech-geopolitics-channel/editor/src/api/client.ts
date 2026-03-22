import type { ScriptLine, VideoSettings, Metadata } from '../types';

const API_BASE = '/api';

// Script API
export const scriptApi = {
  async getAll(): Promise<ScriptLine[]> {
    const res = await fetch(`${API_BASE}/script`);
    if (!res.ok) throw new Error('Failed to fetch script');
    return res.json();
  },

  async get(id: number): Promise<ScriptLine> {
    const res = await fetch(`${API_BASE}/script/${id}`);
    if (!res.ok) throw new Error('Failed to fetch script line');
    return res.json();
  },

  async update(id: number, data: Partial<ScriptLine>): Promise<ScriptLine> {
    const res = await fetch(`${API_BASE}/script/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update script line');
    return res.json();
  },

  async create(data: Omit<ScriptLine, 'id'>): Promise<ScriptLine> {
    const res = await fetch(`${API_BASE}/script`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create script line');
    return res.json();
  },

  async delete(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/script/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete script line');
  },

  async reorder(ids: number[]): Promise<ScriptLine[]> {
    const res = await fetch(`${API_BASE}/script/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) throw new Error('Failed to reorder script');
    return res.json();
  },
};

// Settings API
export const settingsApi = {
  async get(): Promise<VideoSettings> {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  async update(data: VideoSettings): Promise<VideoSettings> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  },
};

// Metadata API
export const metadataApi = {
  async getAll(): Promise<Metadata> {
    const res = await fetch(`${API_BASE}/metadata/all`);
    if (!res.ok) throw new Error('Failed to fetch metadata');
    return res.json();
  },

  async getCharacters(): Promise<Metadata['characters']> {
    const res = await fetch(`${API_BASE}/metadata/characters`);
    if (!res.ok) throw new Error('Failed to fetch characters');
    return res.json();
  },

  async getEmotions(characterId: string): Promise<string[]> {
    const res = await fetch(`${API_BASE}/metadata/emotions/${characterId}`);
    if (!res.ok) throw new Error('Failed to fetch emotions');
    return res.json();
  },

  async getAnimations(): Promise<string[]> {
    const res = await fetch(`${API_BASE}/metadata/animations`);
    if (!res.ok) throw new Error('Failed to fetch animations');
    return res.json();
  },
};
