/**
 * FileSystemResearchStore
 *
 * TopicResearch を JSON ファイルとして保存する。
 */

import * as fs from 'fs';
import * as path from 'path';
import { AdapterError } from '@money-video/shared-ts';
import type { TopicResearch } from './types';

/** ResearchStore port との shape 互換を保つ */
export interface ResearchStore {
  save(outputPath: string, research: TopicResearch): void;
}

export class FileSystemResearchStore implements ResearchStore {
  save(outputPath: string, research: TopicResearch): void {
    try {
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(outputPath, JSON.stringify(research, null, 2), 'utf8');
    } catch (err) {
      throw new AdapterError(
        `topic-research.json の保存に失敗しました: ${(err as Error).message}`,
        'research',
        err,
      );
    }
  }
}
