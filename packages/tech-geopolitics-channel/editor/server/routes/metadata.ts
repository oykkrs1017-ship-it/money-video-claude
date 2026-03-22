import { Router, Request, Response } from 'express';
import {
  getCharacters,
  getEmotions,
  getAnimations,
  getAllMetadata,
} from '../services/metadataService.js';

export const metadataRouter = Router();

// GET /api/metadata/all - Get all metadata (for Claude Code)
metadataRouter.get('/all', (_req: Request, res: Response) => {
  try {
    const metadata = getAllMetadata();
    res.json(metadata);
  } catch (error) {
    console.error('Error getting metadata:', error);
    res.status(500).json({ error: 'Failed to get metadata' });
  }
});

// GET /api/metadata/characters - Get available characters
metadataRouter.get('/characters', (_req: Request, res: Response) => {
  try {
    const characters = getCharacters();
    res.json(characters);
  } catch (error) {
    console.error('Error getting characters:', error);
    res.status(500).json({ error: 'Failed to get characters' });
  }
});

// GET /api/metadata/emotions/:characterId - Get emotions for a character
metadataRouter.get('/emotions/:characterId', (req: Request, res: Response) => {
  try {
    const { characterId } = req.params;
    const emotions = getEmotions(characterId);
    res.json(emotions);
  } catch (error) {
    console.error('Error getting emotions:', error);
    res.status(500).json({ error: 'Failed to get emotions' });
  }
});

// GET /api/metadata/animations - Get available animations
metadataRouter.get('/animations', (_req: Request, res: Response) => {
  try {
    const animations = getAnimations();
    res.json(animations);
  } catch (error) {
    console.error('Error getting animations:', error);
    res.status(500).json({ error: 'Failed to get animations' });
  }
});
