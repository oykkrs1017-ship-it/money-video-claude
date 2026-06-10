/**
 * FileSystemTsvAppender
 *
 * brain/results.tsv に行を追記する。
 * TsvAppender ポートを実装。
 */

import * as fs from 'fs';
import * as path from 'path';
import { createLogger } from '@money-video/shared-ts';

const logger = createLogger({ name: 'FileSystemTsvAppender', level: 'info' });

export interface TsvAppender {
  append(line: string): void;
}

export class FileSystemTsvAppender implements TsvAppender {
  private readonly tsvPath: string;

  constructor(rootDir: string) {
    this.tsvPath = path.join(rootDir, 'brain', 'results.tsv');
  }

  append(line: string): void {
    // brain/ ディレクトリが存在しない場合は作成
    fs.mkdirSync(path.dirname(this.tsvPath), { recursive: true });

    // ヘッダーがなければ追加
    if (!fs.existsSync(this.tsvPath)) {
      const header = [
        'episodeId', 'date', 'channel', 'hypothesisId', 'seed',
        'videoId', 'scriptReviewLoops', 'costUsd',
        'views24h', 'views7d', 'retentionRate', 'verdict',
      ].join('\t');
      fs.writeFileSync(this.tsvPath, header + '\n', 'utf8');
    }

    fs.appendFileSync(this.tsvPath, line + '\n', 'utf8');
    logger.info({ tsvPath: this.tsvPath }, 'TSV 行を追記しました');
  }
}
