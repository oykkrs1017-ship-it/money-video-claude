/**
 * AutonomousLoopUseCase
 *
 * directive.yaml の設定に従い、トピックリストを順次処理して
 * 台本生成 → 音声合成 → スコアカード記録 を自動実行する。
 *
 * 人間確認が必要な作業（still確認・YouTube公開）は実行しない。
 *
 * フロー:
 *   1. directive の auto_loop_enabled を確認（force なら無視）
 *   2. 日次費用上限チェック
 *   3. トピックごとに:
 *      a. 費用再チェック
 *      b. 次エピソード ID 採番
 *      c. 台本生成
 *      d. 音声合成
 *      e. スコアカード保存
 *      f. results.tsv 追記
 *      g. エピソード間 30 秒待機
 *   4. 集計結果を返す
 */

import type {
  AutonomousLoopDeps,
  AutonomousLoopInput,
  AutonomousLoopResult,
  LoopEpisodeRecord,
} from './ports';

/** エピソード間インターバル (ms) */
const EPISODE_INTERVAL_MS = 30_000;

/** 台本生成の推定コスト (USD) */
const ESTIMATED_SCRIPT_COST_USD = 0.06;

export class AutonomousLoopUseCase {
  private readonly deps: AutonomousLoopDeps;

  constructor(deps: AutonomousLoopDeps) {
    this.deps = deps;
  }

  async execute(input: AutonomousLoopInput): Promise<AutonomousLoopResult> {
    const {
      topics,
      maxEpisodesOverride,
      dryRun = false,
      force = false,
    } = input;

    const {
      directiveReader,
      dailyCostReader,
      episodeIdGenerator,
      scriptRunner,
      voiceRunner,
      scorecardWriter,
      tsvAppender,
    } = this.deps;

    // ─── 1. auto_loop_enabled チェック ──────────────────────────────────────────
    const directive = directiveReader.read();
    if (!force && !directive.isAutoLoopEnabled) {
      throw new Error(
        'directive.yaml の global.auto_loop_enabled が false です。' +
          '有効にするか --force フラグを使用してください。',
      );
    }

    // ─── 2. 上限トピック数を決定 ─────────────────────────────────────────────────
    const maxEpisodes = maxEpisodesOverride ?? directive.maxEpisodesPerLoop;
    const limitedTopics = topics.slice(0, maxEpisodes);

    const directiveHash = directiveReader.getDirectiveHash();

    let totalEpisodes = 0;
    let successCount = 0;
    let totalCostUsd = 0;

    // ─── 3. エピソードループ ─────────────────────────────────────────────────────
    for (let i = 0; i < limitedTopics.length; i++) {
      const topic = limitedTopics[i]!;

      // 費用チェック（ループ毎に再計算）
      const todayCost = dailyCostReader.getTodayTotalUsd();
      if (todayCost >= directive.maxDailyCostUsd) {
        break;
      }

      const epId = episodeIdGenerator.next();

      const result = await this.processEpisode({
        topic,
        epId,
        hypothesisId: directive.currentHypothesisId,
        hypothesisSeed: directive.currentHypothesisSeed,
        directiveHash,
        dryRun,
      });

      totalEpisodes++;
      if (result.success) successCount++;
      totalCostUsd += result.costUsd;

      // エピソード間インターバル（最後は不要）
      if (!dryRun && i < limitedTopics.length - 1) {
        await sleep(EPISODE_INTERVAL_MS);
      }
    }

    return { totalEpisodes, successCount, totalCostUsd };
  }

  // ─── プライベート: 1エピソード処理 ──────────────────────────────────────────

  private async processEpisode(params: {
    topic: string;
    epId: string;
    hypothesisId: string | null;
    hypothesisSeed?: string | null;
    directiveHash: string;
    dryRun: boolean;
  }): Promise<{ success: boolean; costUsd: number }> {
    const {
      topic,
      epId,
      hypothesisId,
      hypothesisSeed,
      directiveHash,
      dryRun,
    } = params;

    const { scriptRunner, voiceRunner, scorecardWriter, tsvAppender } = this.deps;

    let totalCost = 0;

    // ─── 台本生成 ────────────────────────────────────────────────────────────
    const scriptResult = await scriptRunner.run(topic, epId, dryRun);
    totalCost += ESTIMATED_SCRIPT_COST_USD;

    if (!scriptResult.success) {
      // 失敗でもスコアカードに PENDING として残す
      this.recordEpisode({
        epId,
        hypothesisId,
        hypothesisSeed,
        directiveHash,
        voiceSuccessRate: 0,
        costUsd: totalCost,
        scorecardWriter,
        tsvAppender,
      });
      return { success: false, costUsd: totalCost };
    }

    // ─── 音声合成 ────────────────────────────────────────────────────────────
    const voiceResult = await voiceRunner.run(epId, dryRun);

    this.recordEpisode({
      epId,
      hypothesisId,
      hypothesisSeed,
      directiveHash,
      voiceSuccessRate: voiceResult.success ? 1 : 0,
      costUsd: totalCost,
      scorecardWriter,
      tsvAppender,
    });

    return { success: voiceResult.success, costUsd: totalCost };
  }

  // ─── プライベート: スコアカード + TSV 記録 ───────────────────────────────────

  private recordEpisode(params: {
    epId: string;
    hypothesisId: string | null;
    hypothesisSeed?: string | null;
    directiveHash: string;
    voiceSuccessRate: number;
    costUsd: number;
    scorecardWriter: AutonomousLoopDeps['scorecardWriter'];
    tsvAppender: AutonomousLoopDeps['tsvAppender'];
  }): void {
    const {
      epId,
      hypothesisId,
      hypothesisSeed,
      directiveHash,
      voiceSuccessRate,
      costUsd,
      scorecardWriter,
      tsvAppender,
    } = params;

    const recordedAt = new Date().toISOString();

    const record: LoopEpisodeRecord = {
      episodeId: epId,
      channel: 'tech-geopolitics',
      recordedAt,
      directiveHash,
      hypothesisId,
      seed: hypothesisSeed,
      production: {
        scriptReviewLoops: 0,
        reviewIssueCount: 0,
        voiceSynthSuccessRate: voiceSuccessRate,
        renderDurationSec: 0,
        costUsdEstimate: costUsd,
      },
      verdict: 'PENDING',
      lessonIds: [],
    };

    scorecardWriter.save(record);

    const tsvLine = [
      epId,
      recordedAt.slice(0, 10),
      'tech-geopolitics',
      hypothesisId ?? 'null',
      hypothesisSeed ?? 'null',
      '-',
      '0',
      costUsd.toFixed(2),
      'PENDING', 'PENDING', 'PENDING', 'PENDING',
    ].join('\t');

    tsvAppender.append(tsvLine);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
