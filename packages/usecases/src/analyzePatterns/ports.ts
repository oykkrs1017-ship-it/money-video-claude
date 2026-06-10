/**
 * AnalyzePatternsUseCase のポート定義
 */

// ─── ドメイン型（analyze-winning-patterns.ts の型定義を移設）────────────────

export interface VideoMetaForAnalysis {
  id: string;
  title: string;
  channel: string;
  channelHandle: string;
  views: number | null;
  published: string | null;
  duration: number | null;
  url: string;
  description: string;
  tags: string[];
}

export type TitlePatternType =
  | 'question'
  | 'number'
  | 'negative'
  | 'proper_noun'
  | 'urgency'
  | 'other';

export interface TitlePattern {
  type: TitlePatternType;
  label: string;
  examples: string[];
  frequency: number;
  avgViews: number;
}

export interface HookPattern {
  type: string;
  label: string;
  description: string;
  examples: string[];
  frequency: number;
}

export interface ThumbnailPattern {
  colorScheme: string;
  textDensity: string;
  composition: string;
  facesPresent: boolean;
  numberHighlight: boolean;
  commonElements: string[];
  avoidElements: string[];
}

export interface WinningPatterns {
  analyzedAt: string;
  totalVideosAnalyzed: number;
  topViewsThreshold: number;
  titlePatterns: TitlePattern[];
  hookPatterns: HookPattern[];
  thumbnailPatterns: ThumbnailPattern;
  structureInsights: string[];
  recommendedHooks: string[];
  avoidPatterns: string[];
  rawAnalysis: {
    titleAnalysis: string;
    hookAnalysis: string;
    thumbnailAnalysis: string;
  };
}

// ─── ポート ───────────────────────────────────────────────────────────────────

/**
 * コーパスディレクトリから動画メタデータを読み込む
 */
export interface CorpusReader {
  loadAll(corpusDir: string): VideoMetaForAnalysis[];
}

/**
 * タイトル・フック・サムネイルを LLM で分析する
 */
export interface PatternAnalyzer {
  analyzeTitles(
    topVideos: VideoMetaForAnalysis[],
    dryRun: boolean,
  ): Promise<string>;
  analyzeHooks(
    topVideos: VideoMetaForAnalysis[],
    corpusDir: string,
    dryRun: boolean,
  ): Promise<string>;
  analyzeThumbnails(
    topVideos: VideoMetaForAnalysis[],
    corpusDir: string,
    dryRun: boolean,
  ): Promise<string>;
  synthesizeInsights(
    titleAnalysis: string,
    hookAnalysis: string,
    thumbnailAnalysis: string,
    topVideos: VideoMetaForAnalysis[],
    dryRun: boolean,
  ): Promise<{
    structureInsights: string[];
    recommendedHooks: string[];
    avoidPatterns: string[];
  }>;
}

/**
 * 勝ちパターンを永続化する
 */
export interface PatternStore {
  save(outputPath: string, patterns: WinningPatterns): void;
}

// ─── UseCase 入出力 ──────────────────────────────────────────────────────────

export interface AnalyzePatternsInput {
  corpusDir: string;
  outputPath: string;
  topN?: number;
  dryRun?: boolean;
}

export interface AnalyzePatternsResult {
  totalVideosAnalyzed: number;
  outputPath: string;
}

export interface AnalyzePatternsDeps {
  corpusReader: CorpusReader;
  patternAnalyzer: PatternAnalyzer;
  patternStore: PatternStore;
}
