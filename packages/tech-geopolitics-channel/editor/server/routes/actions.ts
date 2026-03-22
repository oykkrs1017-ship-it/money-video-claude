import { Router, Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);
const ROOT_DIR = path.resolve(process.cwd(), '..');

export const actionsRouter = Router();

// POST /api/actions/generate-voices - Generate voice files
actionsRouter.post('/generate-voices', async (_req: Request, res: Response) => {
  try {
    console.log('Starting voice generation...');
    const { stdout, stderr } = await execAsync('npm run voices', { cwd: ROOT_DIR });
    console.log('Voice generation output:', stdout);
    if (stderr) console.error('Voice generation stderr:', stderr);

    res.json({
      success: true,
      message: 'Voice generation completed',
      output: stdout,
    });
  } catch (error) {
    console.error('Error generating voices:', error);
    res.status(500).json({
      error: 'Failed to generate voices',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/actions/build-video - Build video
actionsRouter.post('/build-video', async (_req: Request, res: Response) => {
  try {
    console.log('Starting video build...');

    // Start the build in the background
    exec('npm run build', { cwd: ROOT_DIR }, (error, stdout, stderr) => {
      if (error) {
        console.error('Video build error:', error);
      } else {
        console.log('Video build output:', stdout);
        if (stderr) console.error('Video build stderr:', stderr);
      }
    });

    res.json({
      success: true,
      message: 'Video build started. Check terminal for progress.',
    });
  } catch (error) {
    console.error('Error starting video build:', error);
    res.status(500).json({
      error: 'Failed to start video build',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/actions/sync-settings - Run sync-settings
actionsRouter.post('/sync-settings', async (_req: Request, res: Response) => {
  try {
    console.log('Running sync-settings...');
    const { stdout, stderr } = await execAsync('npm run sync-settings', { cwd: ROOT_DIR });
    console.log('sync-settings output:', stdout);
    if (stderr) console.error('sync-settings stderr:', stderr);

    res.json({
      success: true,
      message: 'Settings synced successfully',
      output: stdout,
    });
  } catch (error) {
    console.error('Error running sync-settings:', error);
    res.status(500).json({
      error: 'Failed to sync settings',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
