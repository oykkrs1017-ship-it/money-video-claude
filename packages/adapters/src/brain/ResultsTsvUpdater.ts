/**
 * ResultsTsvUpdater
 *
 * brain/results.tsv の該当エピソード行を更新する。
 * ResultsTsvUpdater ポートを実装。
 */

import * as fs from 'fs';
import * as path from 'path';
import { createLogger } from '@money-video/shared-ts';

const logger = createLogger({ name: 'ResultsTsvUpdater', level: 'info' });

export interface VideoEngagementMetrics {
  retentionRate: number;
  ctr: number;
  views7d: number;
}

export interface ResultsTsvUpdaterPort {
  updateRow(episodeId: string, metrics: VideoEngagementMetrics): void;
}

export class ResultsTsvUpdater implements ResultsTsvUpdaterPort {
  private readonly tsvPath: string;

  constructor(rootDir: string) {
    this.tsvPath = path.join(rootDir, 'brain', 'results.tsv');
  }

  updateRow(episodeId: string, metrics: VideoEngagementMetrics): void {
    if (!fs.existsSync(this.tsvPath)) {
      logger.warn({ tsvPath: this.tsvPath }, 'results.tsv が存在しません');
      return;
    }

    const lines = fs.readFileSync(this.tsvPath, 'utf8').split('\n');
    const updated = lines.map((line) => {
      if (!line.startsWith(episodeId + '\t')) return line;
      const cols = line.split('\t');
      // 列順: ep_id date channel hyp seed videoId loops cost retention ctr views verdict
      cols[8] = metrics.retentionRate.toFixed(1);
      cols[9] = metrics.ctr.toFixed(1);
      cols[10] = String(metrics.views7d);
      return cols.join('\t');
    });

    fs.writeFileSync(this.tsvPath, updated.join('\n'), 'utf8');
    logger.info({ episodeId }, 'results.tsv 行を更新しました');
  }
}
