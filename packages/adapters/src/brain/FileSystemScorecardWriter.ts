/**
 * FileSystemScorecardWriter
 *
 * brain/scorecards/{episodeId}.json にスコアカードを書き込む。
 * LoopScorecardWriter ポートを実装。
 */

import * as fs from 'fs';
import * as path from 'path';
import { createLogger } from '@money-video/shared-ts';

const logger = createLogger({ name: 'FileSystemScorecardWriter', level: 'info' });

/** LoopEpisodeRecord と shape 互換のローカル定義 */
export interface EpisodeScorecardProduction {
  scriptReviewLoops: number;
  reviewIssueCount: number;
  voiceSynthSuccessRate: number;
  renderDurationSec: number;
  costUsdEstimate: number;
}

export interface LoopEpisodeRecord {
  episodeId: string;
  channel: string;
  recordedAt: string;
  directiveHash: string;
  hypothesisId: string | null;
  seed?: string | null;
  production: EpisodeScorecardProduction;
  verdict: 'PENDING' | 'KEEP' | 'DISCARD' | 'TENTATIVE';
  lessonIds: string[];
}

export interface LoopScorecardWriter {
  save(record: LoopEpisodeRecord): void;
}

export class FileSystemScorecardWriter implements LoopScorecardWriter {
  private readonly scorecardsDir: string;

  constructor(rootDir: string) {
    this.scorecardsDir = path.join(rootDir, 'brain', 'scorecards');
  }

  save(record: LoopEpisodeRecord): void {
    fs.mkdirSync(this.scorecardsDir, { recursive: true });
    const filePath = path.join(this.scorecardsDir, `${record.episodeId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(record, null, 2), 'utf8');
    logger.info({ episodeId: record.episodeId, filePath }, 'スコアカード保存完了');
  }
}
