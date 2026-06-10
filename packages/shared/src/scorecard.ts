/**
 * packages/shared/src/scorecard.ts
 * エピソードスコアカード — 制作時スコア + エンゲージメントを一元管理
 */

export type Verdict = 'KEEP' | 'DISCARD' | 'PENDING' | 'TENTATIVE';
export type Channel = 'tech-geopolitics' | 'ai-money-shorts';

export interface ProductionMetrics {
  /** script-reviewer feedback_loop.py の実行回数 */
  scriptReviewLoops: number;
  /** レビュー総指摘数 */
  reviewIssueCount: number;
  /** WAV 生成成功率 (0-1) */
  voiceSynthSuccessRate: number;
  /** Remotion レンダリング所要秒数 */
  renderDurationSec: number;
  /** API 推定費用 (USD) */
  costUsdEstimate: number;
  /** QC 再生成シーン数 */
  scenesRegenerated?: number;
}

export interface EngagementMetrics {
  collectedAt: string;           // ISO 8601
  views24h?: number;
  views7d?: number;
  likes7d?: number;
  comments7d?: number;
  avgViewDurationSec?: number;   // 平均視聴時間
  retentionRate?: number;        // 0-100: 平均視聴維持率
  ctr?: number;                  // 0-100: クリック率
  subscriberDelta7d?: number;
}

export interface EpisodeScorecard {
  episodeId: string;             // "ep005" | "short_014"
  channel: Channel;
  recordedAt: string;            // ISO 8601
  videoId?: string;              // YouTube 動画 ID（アップロード後に付与）

  /** directive.yaml の sha256 ハッシュ（どの方針で作ったか追跡） */
  directiveHash: string;

  /** 実験パラメータ */
  hypothesisId: string | null;
  seed?: number;
  templateType?: string;         // ai-money-shorts のみ

  /** 制作時スコア（即時取得可能） */
  production: ProductionMetrics;

  /** エンゲージメント（遅延収集: 24h / 7d 後） */
  engagement?: EngagementMetrics;

  /** 判定 */
  verdict: Verdict;
  /** 抽出した教訓 ID */
  lessonIds: string[];
}

/** スコアカードを brain/scorecards/{episodeId}.json に保存するパスを返す */
export function scorecardPath(rootDir: string, episodeId: string): string {
  const path = require('path');
  return path.join(rootDir, 'brain', 'scorecards', `${episodeId}.json`);
}

/** スコアカードを読み込む（存在しなければ null） */
export function loadScorecard(rootDir: string, episodeId: string): EpisodeScorecard | null {
  const fs = require('fs');
  const p = scorecardPath(rootDir, episodeId);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8')) as EpisodeScorecard;
}

/** スコアカードを保存する */
export function saveScorecard(rootDir: string, card: EpisodeScorecard): void {
  const fs = require('fs');
  const p = scorecardPath(rootDir, card.episodeId);
  fs.mkdirSync(require('path').dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(card, null, 2), 'utf8');
}
