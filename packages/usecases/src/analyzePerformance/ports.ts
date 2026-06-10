/**
 * AnalyzePerformanceUseCase のポート定義
 */

// ─── ドメイン型 ───────────────────────────────────────────────────────────────

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

// ─── ポート ───────────────────────────────────────────────────────────────────

/** スコアカードの読み書き */
export interface ScorecardRepository {
  /** PENDING かつ videoId が記録済みのエピソードを列挙 */
  findPendingWithVideoId(): EpisodeScorecardRef[];
  /** episodeId でスコアカード参照を返す */
  load(episodeId: string): EpisodeScorecardRef | null;
  /** engagement メトリクスを更新して保存 */
  updateEngagement(episodeId: string, metrics: VideoEngagementMetrics): void;
}

/** YouTube Data / Analytics API クライアント */
export interface VideoAnalyticsClient {
  /** 基本統計: 再生数・いいね・コメント */
  fetchVideoStats(
    videoId: string,
  ): Promise<{ views: number; likes: number; comments: number }>;
  /** 視聴維持率・平均視聴時間 */
  fetchRetentionMetrics(
    videoId: string,
  ): Promise<{ avgViewDurationSec: number; retentionRate: number }>;
  /** インプレッション CTR (0–100 の%) */
  fetchCtr(videoId: string): Promise<number>;
}

/** brain/results.tsv の行を更新する */
export interface ResultsTsvUpdater {
  updateRow(episodeId: string, metrics: VideoEngagementMetrics): void;
}

// ─── UseCase 入出力 ──────────────────────────────────────────────────────────

export interface AnalyzePerformanceInput {
  /** 単一エピソードを指定（allPending と排他） */
  episodeId?: string;
  /** PENDING 全件を処理 */
  allPending?: boolean;
}

export interface AnalyzePerformanceResult {
  processedCount: number;
  skippedCount: number;
  errorCount: number;
}

export interface AnalyzePerformanceDeps {
  scorecardRepository: ScorecardRepository;
  analyticsClient: VideoAnalyticsClient;
  tsvUpdater: ResultsTsvUpdater;
}
