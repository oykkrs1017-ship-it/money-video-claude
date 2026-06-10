/**
 * FileSystemPatternStore
 *
 * WinningPatterns を JSON ファイルとして保存する。
 */

import * as fs from 'fs';
import * as path from 'path';
import { AdapterError } from '@money-video/shared-ts';
import type { WinningPatterns } from './types';

/** PatternStore port との shape 互換を保つ */
export interface PatternStore {
  save(outputPath: string, patterns: WinningPatterns): void;
}

export class FileSystemPatternStore implements PatternStore {
  save(outputPath: string, patterns: WinningPatterns): void {
    try {
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(outputPath, JSON.stringify(patterns, null, 2), 'utf8');
    } catch (err) {
      throw new AdapterError(
        `winning-patterns.json の保存に失敗しました: ${(err as Error).message}`,
        'research',
        err,
      );
    }
  }
}
