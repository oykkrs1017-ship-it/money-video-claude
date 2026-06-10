/**
 * ScorecardManager
 *
 * brain/scorecards/ 配下のスコアカード JSON を読み書きする。
 * ScorecardRepository ポートを実装。
 */

import * as fs from 'fs';
import * as path from 'path';
import { createLogger } from '@money-video/shared-ts';

const logger = createLogger({ name: 'ScorecardManager', level: 'info' });

// ─── 型定義（usecases/analyzePerformance/ports と shape 互換）────────────────

export interface VideoEngagementMetrics {
  collectedAt: string;
  views7d: number;
  likes7d: number;
  comments7d: number;
  avgViewDurationSec: number;
  retentionRate: number;
  ctr: number;
}

export interface EpisodeScorecardRef {
  episodeId: string;
  videoId: string | undefined;
  verdict: string;
}

export interface ScorecardRepository {
  findPendingWithVideoId(): EpisodeScorecardRef[];
  load(episodeId: string): EpisodeScorecardRef | null;
  updateEngagement(episodeId: string, metrics: VideoEngagementMetrics): void;
}

// ─── ローカル型（JSON の実際の形） ────────────────────────────────────────────

interface ScorecardJson {
  episodeId: string;
  verdict: string;
  videoId?: string;
  engagement?: unknown;
  [key: string]: unknown;
}

// ─── 実装 ─────────────────────────────────────────────────────────────────────

export class ScorecardManager implements ScorecardRepository {
  private readonly scorecardsDir: string;

  constructor(rootDir: string) {
    this.scorecardsDir = path.join(rootDir, 'brain', 'scorecards');
  }

  findPendingWithVideoId(): EpisodeScorecardRef[] {
    if (!fs.existsSync(this.scorecardsDir)) return [];

    return fs
      .readdirSync(this.scorecardsDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => {
        const episodeId = f.replace('.json', '');
        return this.load(episodeId);
      })
      .filter((ref): ref is EpisodeScorecardRef => {
        return ref !== null && ref.verdict === 'PENDING' && !!ref.videoId;
      });
  }

  load(episodeId: string): EpisodeScorecardRef | null {
    const filePath = path.join(this.scorecardsDir, `${episodeId}.json`);
    if (!fs.existsSync(filePath)) return null;

    try {
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as ScorecardJson;
      return {
        episodeId: raw.episodeId,
        videoId: raw.videoId,
        verdict: raw.verdict,
      };
    } catch (err) {
      logger.warn({ episodeId, err: (err as Error).message }, 'スコアカード読み込み失敗');
      return null;
    }
  }

  updateEngagement(episodeId: string, metrics: VideoEngagementMetrics): void {
    const filePath = path.join(this.scorecardsDir, `${episodeId}.json`);
    if (!fs.existsSync(filePath)) {
      logger.warn({ episodeId }, 'スコアカードが存在しません');
      return;
    }

    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as ScorecardJson;
    const updated: ScorecardJson = { ...raw, engagement: metrics };
    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf8');
    logger.info({ episodeId }, 'スコアカード engagement を更新しました');
  }
}
