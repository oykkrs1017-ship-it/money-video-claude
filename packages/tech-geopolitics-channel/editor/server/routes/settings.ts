import { Router, Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { getSettings, updateSettings } from '../services/settingsService.js';

const execAsync = promisify(exec);
const ROOT_DIR = path.resolve(process.cwd(), '..');

export const settingsRouter = Router();

// GET /api/settings - Get video settings
settingsRouter.get('/', (_req: Request, res: Response) => {
  try {
    const settings = getSettings();
    res.json(settings);
  } catch (error) {
    console.error('Error getting settings:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// PUT /api/settings - Update video settings and run sync-settings
settingsRouter.put('/', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const updated = updateSettings(data);

    // Run sync-settings to regenerate settings.generated.ts
    try {
      await execAsync('npm run sync-settings', { cwd: ROOT_DIR });
      console.log('sync-settings completed');
    } catch (syncError) {
      console.error('Error running sync-settings:', syncError);
      // Don't fail the request, settings were saved
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});
