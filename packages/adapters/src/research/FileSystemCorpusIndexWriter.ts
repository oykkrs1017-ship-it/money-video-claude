/**
 * FileSystemCorpusIndexWriter
 *
 * コーパスインデックス（index.json）をファイルシステムに書き込む。
 */

import * as fs from 'fs';
import * as path from 'path';
import { AdapterError } from '@money-video/shared-ts';
import type { CompetitorChannel, CorpusVideoMeta } from './types';

/** CorpusIndexWriter port との shape 互換を保つ */
export interface CorpusIndexWriter {
  write(
    corpusDir: string,
    channels: CompetitorChannel[],
    metadata: CorpusVideoMeta[],
    totalNew: number,
    dryRun: boolean,
  ): void;
}

export class FileSystemCorpusIndexWriter implements CorpusIndexWriter {
  write(
    corpusDir: string,
    channels: CompetitorChannel[],
    metadata: CorpusVideoMeta[],
    totalNew: number,
    dryRun: boolean,
  ): void {
    if (dryRun) return;

    const indexPath = path.join(corpusDir, 'index.json');
    const index = {
      updatedAt: new Date().toISOString(),
      totalVideos: metadata.length,
      newThisRun: totalNew,
      channels: channels.map((c) => c.name),
      videos: metadata.map((m) => ({
        id: m.id,
        channel: m.channel,
        channelHandle: m.channelHandle,
        title: m.title,
        views: m.views,
        published: m.published,
        url: m.url,
      })),
    };

    try {
      fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');
    } catch (err) {
      throw new AdapterError(
        `コーパスインデックスの保存に失敗しました: ${(err as Error).message}`,
        'research',
        err,
      );
    }
  }
}
