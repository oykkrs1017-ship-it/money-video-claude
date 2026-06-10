/**
 * packages/shared/src/trace-recorder.ts
 * 制作トレースの記録・集計・保存を担うクラス
 *
 * 使い方:
 *   const tr = new TraceRecorder('ep005', 'tech-geopolitics', rootDir);
 *   tr.startStep('script-writer', { topic });
 *   ... 処理 ...
 *   tr.endStep('script-writer', { lines: 60 }, { apiCalls: 1, tokensInput: 2000, tokensOutput: 8000, usdEstimate: 0.05 });
 *   const trace = tr.finalize(directiveHash, hypothesisId);
 *   tr.save();
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type { EpisodeTrace, TraceStep, TraceArtifact, AgentName, StepCost } from './trace';

interface PendingStep {
  agent: AgentName;
  startedAt: string;
  startMs: number;
  input: Record<string, unknown>;
}

export class TraceRecorder {
  private episodeId: string;
  private channel: 'tech-geopolitics' | 'ai-money-shorts';
  private rootDir: string;
  private startedAt: string;
  private startMs: number;
  private steps: TraceStep[] = [];
  private artifacts: TraceArtifact[] = [];
  private pending: Map<AgentName, PendingStep> = new Map();
  private trace: EpisodeTrace | null = null;

  constructor(
    episodeId: string,
    channel: 'tech-geopolitics' | 'ai-money-shorts',
    rootDir: string,
  ) {
    this.episodeId = episodeId;
    this.channel = channel;
    this.rootDir = rootDir;
    this.startedAt = new Date().toISOString();
    this.startMs = Date.now();
  }

  /** ステップ開始を記録する */
  startStep(agent: AgentName, input: Record<string, unknown> = {}): void {
    this.pending.set(agent, {
      agent,
      startedAt: new Date().toISOString(),
      startMs: Date.now(),
      input,
    });
  }

  /** ステップ完了を記録する */
  endStep(
    agent: AgentName,
    output: Record<string, unknown> = {},
    cost: StepCost = { apiCalls: 0, usdEstimate: 0 },
    error?: string,
  ): void {
    const pending = this.pending.get(agent);
    if (!pending) {
      // startStep なしで endStep が呼ばれた場合は自動補完
      this.startStep(agent, {});
      return this.endStep(agent, output, cost, error);
    }

    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - pending.startMs;

    this.steps.push({
      agent,
      startedAt: pending.startedAt,
      completedAt,
      durationMs,
      status: error ? 'FAILED' : 'SUCCESS',
      input: pending.input,
      output,
      ...(error ? { error } : {}),
      cost,
    });

    this.pending.delete(agent);
  }

  /** ステップ失敗を記録する */
  failStep(agent: AgentName, error: string): void {
    this.endStep(agent, {}, { apiCalls: 0, usdEstimate: 0 }, error);
  }

  /** アーティファクト（生成ファイル）を追跡する */
  addArtifact(filePath: string, type: TraceArtifact['type']): void {
    if (!fs.existsSync(filePath)) return;
    const stat = fs.statSync(filePath);
    const buf = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);
    this.artifacts.push({ type, path: filePath, sizeBytes: stat.size, hash });
  }

  /** 総コスト (USD) を返す */
  totalCostUsd(): number {
    return this.steps.reduce((sum, s) => sum + (s.cost.usdEstimate ?? 0), 0);
  }

  /** EpisodeTrace を確定して返す */
  finalize(directiveHash: string, hypothesisId: string | null): EpisodeTrace {
    const completedAt = new Date().toISOString();
    const failedSteps = this.steps.filter(s => s.status === 'FAILED').map(s => s.agent);

    this.trace = {
      schema: 'EPTF-v1.0',
      episodeId: this.episodeId,
      channel: this.channel,
      startedAt: this.startedAt,
      completedAt,
      directiveHash,
      hypothesisId,
      steps: this.steps,
      artifacts: this.artifacts,
      summary: {
        totalDurationMs: Date.now() - this.startMs,
        totalCostUsd: this.totalCostUsd(),
        totalApiCalls: this.steps.reduce((sum, s) => sum + s.cost.apiCalls, 0),
        failedSteps,
      },
    };

    return this.trace;
  }

  /** brain/traces/{episodeId}.json に保存する */
  save(): void {
    if (!this.trace) throw new Error('finalize() を先に呼んでください');
    const outPath = path.join(this.rootDir, 'brain', 'traces', `${this.episodeId}.json`);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(this.trace, null, 2), 'utf8');
    console.log(`📊 トレース保存: ${outPath}`);
  }

  /**
   * スコアカードの production セクションに変換する
   * （TraceRecorder だけで ProductionMetrics を作れるように）
   */
  toProductionMetrics(opts: {
    scriptReviewLoops: number;
    reviewIssueCount: number;
    voiceSynthSuccessRate: number;
    renderDurationSec: number;
    scenesRegenerated?: number;
  }) {
    return {
      ...opts,
      costUsdEstimate: this.totalCostUsd(),
    };
  }
}
