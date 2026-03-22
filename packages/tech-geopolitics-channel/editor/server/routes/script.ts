import { Router, Request, Response } from 'express';
import {
  getScript,
  getScriptLine,
  updateScriptLine,
  createScriptLine,
  deleteScriptLine,
  reorderScript,
} from '../services/scriptService.js';

export const scriptRouter = Router();

// GET /api/script - Get all script lines
scriptRouter.get('/', (_req: Request, res: Response) => {
  try {
    const script = getScript();
    res.json(script);
  } catch (error) {
    console.error('Error getting script:', error);
    res.status(500).json({ error: 'Failed to get script' });
  }
});

// GET /api/script/:id - Get a specific script line
scriptRouter.get('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const line = getScriptLine(id);
    if (!line) {
      res.status(404).json({ error: 'Script line not found' });
      return;
    }
    res.json(line);
  } catch (error) {
    console.error('Error getting script line:', error);
    res.status(500).json({ error: 'Failed to get script line' });
  }
});

// PUT /api/script/:id - Update a script line
scriptRouter.put('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = req.body;
    const updated = updateScriptLine(id, data);
    res.json(updated);
  } catch (error) {
    console.error('Error updating script line:', error);
    res.status(500).json({ error: 'Failed to update script line' });
  }
});

// POST /api/script - Create a new script line
scriptRouter.post('/', (req: Request, res: Response) => {
  try {
    const data = req.body;
    const created = createScriptLine(data);
    res.status(201).json(created);
  } catch (error) {
    console.error('Error creating script line:', error);
    res.status(500).json({ error: 'Failed to create script line' });
  }
});

// DELETE /api/script/:id - Delete a script line
scriptRouter.delete('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    deleteScriptLine(id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting script line:', error);
    res.status(500).json({ error: 'Failed to delete script line' });
  }
});

// PUT /api/script/reorder - Reorder script lines
scriptRouter.put('/reorder', (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      res.status(400).json({ error: 'ids must be an array' });
      return;
    }
    const reordered = reorderScript(ids);
    res.json(reordered);
  } catch (error) {
    console.error('Error reordering script:', error);
    res.status(500).json({ error: 'Failed to reorder script' });
  }
});
