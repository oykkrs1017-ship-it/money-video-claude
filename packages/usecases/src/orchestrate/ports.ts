/**
 * AutonomousLoopUseCase のポート定義
 */

// ─── ドメイン型 ───────────────────────────────────────────────────────────────

export interface DirectiveConfig {
  isAutoLoopEnabled: boolean;
  maxDailyCostUsd: number;
  maxEpisodesPerLoop: number;
  currentHypothesisId: string | null;
  currentHypothesisSeed?: string | null;
}

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

// ─── ポート ───────────────────────────────────────────────────────────────────

/** directive.yaml を読み込む */
export interface DirectiveReader {
  read(): DirectiveConfig;
  getDirectiveHash(): string;
}

/** brain/results.tsv の本日分コストを集計する */
export interface DailyCostReader {
  getTodayTotalUsd(): number;
}

/** 次のエピソード ID を採番する */
export interface EpisodeIdGenerator {
  next(): string;
}

/** 台本生成を実行する */
export interface ScriptRunner {
  run(topic: string, epId: string, dryRun: boolean): Promise<{ success: boolean; output: string }>;
}

/** 音声合成を実行する */
export interface VoiceRunner {
  run(epId: string, dryRun: boolean): Promise<{ success: boolean; output: string }>;
}

/** エピソードのスコアカードを保存する */
export interface LoopScorecardWriter {
  save(record: LoopEpisodeRecord): void;
}

/** brain/results.tsv に行を追記する */
export interface TsvAppender {
  append(line: string): void;
}

// ─── UseCase 入出力 ──────────────────────────────────────────────────────────

export interface AutonomousLoopInput {
  topics: string[];
  maxEpisodesOverride?: number;
  dryRun?: boolean;
  /** directive の auto_loop_enabled チェックをスキップ */
  force?: boolean;
}

export interface AutonomousLoopResult {
  totalEpisodes: number;
  successCount: number;
  totalCostUsd: number;
}

export interface AutonomousLoopDeps {
  directiveReader: DirectiveReader;
  dailyCostReader: DailyCostReader;
  episodeIdGenerator: EpisodeIdGenerator;
  scriptRunner: ScriptRunner;
  voiceRunner: VoiceRunner;
  scorecardWriter: LoopScorecardWriter;
  tsvAppender: TsvAppender;
}
