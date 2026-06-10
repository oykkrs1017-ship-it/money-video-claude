/**
 * AnalyzePerformanceUseCase
 *
 * YouTube Analytics でエピソードのエンゲージメント指標を収集し、
 * スコアカードと results.tsv を更新する。
 *
 * フロー（1エピソードあたり）:
 *   1. スコアカードを読み込む
 *   2. videoId が記録されているか確認（なければスキップ）
 *   3. Data API + Analytics API から指標を並列取得
 *   4. スコアカードの engagement を更新して保存
 *   5. results.tsv の該当行を更新
 */

import type {
  AnalyzePerformanceDeps,
  AnalyzePerformanceInput,
  AnalyzePerformanceResult,
  VideoEngagementMetrics,
} from './ports';

export class AnalyzePerformanceUseCase {
  private readonly deps: AnalyzePerformanceDeps;

  constructor(deps: AnalyzePerformanceDeps) {
    this.deps = deps;
  }

  async execute(input: AnalyzePerformanceInput): Promise<AnalyzePerformanceResult> {
    const { episodeId, allPending = false } = input;
    const { scorecardRepository } = this.deps;

    // ─── 処理対象を決定 ───────────────────────────────────────────────────────
    let targets: string[];

    if (episodeId) {
      targets = [episodeId];
    } else if (allPending) {
      targets = scorecardRepository
        .findPendingWithVideoId()
        .map((ref) => ref.episodeId);
    } else {
      throw new Error(
        '--ep <episodeId> または --all のどちらかを指定してください',
      );
    }

    let processedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const epId of targets) {
      const outcome = await this.collectForEpisode(epId);
      if (outcome === 'processed') processedCount++;
      else if (outcome === 'skipped') skippedCount++;
      else errorCount++;
    }

    return { processedCount, skippedCount, errorCount };
  }

  // ─── プライベート: 1エピソード処理 ──────────────────────────────────────────

  private async collectForEpisode(
    episodeId: string,
  ): Promise<'processed' | 'skipped' | 'error'> {
    const { scorecardRepository, analyticsClient, tsvUpdater } = this.deps;

    const ref = scorecardRepository.load(episodeId);
    if (!ref) return 'skipped';
    if (!ref.videoId) return 'skipped';

    try {
      const [stats, retention, ctr] = await Promise.all([
        analyticsClient.fetchVideoStats(ref.videoId),
        analyticsClient.fetchRetentionMetrics(ref.videoId),
        analyticsClient.fetchCtr(ref.videoId),
      ]);

      const metrics: VideoEngagementMetrics = {
        collectedAt: new Date().toISOString(),
        views7d: stats.views,
        likes7d: stats.likes,
        comments7d: stats.comments,
        avgViewDurationSec: retention.avgViewDurationSec,
        retentionRate: retention.retentionRate,
        ctr,
      };

      scorecardRepository.updateEngagement(episodeId, metrics);
      tsvUpdater.updateRow(episodeId, metrics);

      return 'processed';
    } catch {
      return 'error';
    }
  }
}
