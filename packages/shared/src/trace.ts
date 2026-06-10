/**
 * packages/shared/src/trace.ts
 * EPTF (Episode Production Trace Format) v1.0
 * 各エピソード制作の全ステップを構造化ログとして記録する
 */

export type AgentName =
  | 'script-writer'
  | 'script-reviewer'
  | 'voice-producer'
  | 'video-engineer'
  | 'publisher'
  | 'knowledge-keeper'
  | 'collect-analytics';

export type StepStatus = 'SUCCESS' | 'FAILED' | 'RETRIED' | 'SKIPPED';

export interface StepCost {
  apiCalls: number;
  tokensInput?: number;
  tokensOutput?: number;
  usdEstimate: number;
}

export interface TraceStep {
  agent: AgentName;
  startedAt: string;          // ISO 8601
  completedAt: string;
  durationMs: number;
  status: StepStatus;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  error?: string;
  cost: StepCost;
}

export interface TraceArtifact {
  type: 'yaml' | 'json' | 'wav' | 'mp4' | 'png' | 'tsv';
  path: string;
  sizeBytes: number;
  hash: string;
}

export interface EpisodeTrace {
  schema: 'EPTF-v1.0';
  episodeId: string;
  channel: 'tech-geopolitics' | 'ai-money-shorts';
  startedAt: string;
  completedAt: string;

  /** directive.yaml の sha256 */
  directiveHash: string;
  /** 今回試した仮説 ID */
  hypothesisId: string | null;

  steps: TraceStep[];
  artifacts: TraceArtifact[];

  /** 集計 */
  summary: {
    totalDurationMs: number;
    totalCostUsd: number;
    totalApiCalls: number;
    failedSteps: string[];
  };
}

/** トレースを brain/traces/{episodeId}.json に保存するパスを返す */
export function tracePath(rootDir: string, episodeId: string): string {
  const path = require('path');
  return path.join(rootDir, 'brain', 'traces', `${episodeId}.json`);
}
